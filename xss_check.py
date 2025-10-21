#!/usr/bin/env python3
# coding: utf-8
"""
Active reflected-XSS scanner — tuned to only hit a single base domain.
Features:
 - Enforces same-origin (or optional subdomain allowance) and prevents absolute URLs in target paths
 - Redirect policy: none | same-origin | all
 - Save response bodies to disk for evidence
 - Collect security-related headers (CSP, X-Frame-Options, etc.)
 - Optional headless DOM check using Playwright (if installed)
 - Keeps original CLI interface with extra flags
"""

from __future__ import annotations

import argparse
import html
import hashlib
import json
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from requests import Response

# ---------------------------
# Defaults
# ---------------------------


DEFAULT_BASE_URL = "http://localhost:3000"

DEFAULT_TARGETS = [
    {"name": "Home page", "path": "/", "method": "GET"},
    {"name": "Search query", "path": "/search", "method": "GET", "params": {"q": "{payload}"}},
    {"name": "Account reviews", "path": "/account/reviews", "method": "GET"},
    {"name": "Admin query", "path": "/admin", "method": "GET", "params": {"query": "{payload}"}},
]

DEFAULT_PAYLOADS = [
    "<script>alert('xss')</script>",
    "'\"><img src=x onerror=alert('xss')>",
    "<svg/onload=alert('xss')>",
    "<body onload=alert('xss')>",
    "<iframe srcdoc=\"<script>alert('xss')</script>\">",
    "\"><svg><script>alert`xss`</script>",
    "javascript:alert('xss')",
]

DEFAULT_HEADERS = {
    "User-Agent": "XSS-Test-Script/2.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

thread_local = threading.local()

# ---------------------------
# Data classes
# ---------------------------


@dataclass
class Target:
    name: str
    path: str
    method: str = "GET"
    params: Dict[str, str] = field(default_factory=dict)
    json_body: Dict[str, str] = field(default_factory=dict)
    data: Dict[str, str] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    cookies: Dict[str, str] = field(default_factory=dict)
    timeout: Optional[float] = None

    def build_request(self, base_url: str, payload: str, default_timeout: float) -> Tuple[str, Dict[str, Any]]:
        substitutions = {"payload": payload}
        # do not allow absolute URLs in target.path
        if "://" in self.path:
            # caller should handle this as error
            url = self.path
        else:
            url = urljoin(base_url, self.path.format(**substitutions))
        request_kwargs: Dict[str, Any] = {
            "headers": {k: v.format(**substitutions) for k, v in self.headers.items()},
            "cookies": {k: v.format(**substitutions) for k, v in self.cookies.items()},
            "params": {k: v.format(**substitutions) for k, v in self.params.items()},
            "timeout": self.timeout or default_timeout,
        }
        if self.json_body:
            request_kwargs["json"] = {k: v.format(**substitutions) for k, v in self.json_body.items()}
        if self.data:
            request_kwargs["data"] = {k: v.format(**substitutions) for k, v in self.data.items()}
        return url, request_kwargs


@dataclass(frozen=True)
class ScannerConfig:
    base_url: str
    headers: Dict[str, str]
    cookies: Dict[str, str]
    timeout: float
    basic_auth: Optional[Tuple[str, str]]
    redirects: str = "same-origin"  # none | same-origin | all
    max_redirects: int = 5
    allow_subdomains: bool = False
    save_responses: Optional[Path] = None
    allow_stateful: bool = False
    dom_check: bool = False


# ---------------------------
# Helpers
# ---------------------------


def get_session(config: ScannerConfig) -> requests.Session:
    session: Optional[requests.Session] = getattr(thread_local, "session", None)
    if session is None:
        session = requests.Session()
        session.headers.update(config.headers)
        if config.cookies:
            session.cookies.update(config.cookies)
        if config.basic_auth:
            session.auth = config.basic_auth
        setattr(thread_local, "session", session)
    return session


def load_targets(path: Optional[str]) -> List[Target]:
    if not path:
        return [Target(**item) for item in DEFAULT_TARGETS]
    target_path = Path(path).expanduser()
    if not target_path.exists():
        raise FileNotFoundError(f"Targets file not found: {target_path}")
    data = json.loads(target_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Targets file must contain a list of target definitions")
    return [Target(**item) for item in data]


def load_payloads(path: Optional[str]) -> List[str]:
    if not path:
        return list(DEFAULT_PAYLOADS)
    payload_path = Path(path).expanduser()
    if not payload_path.exists():
        raise FileNotFoundError(f"Payloads file not found: {payload_path}")
    payloads: List[str] = []
    for line in payload_path.read_text(encoding="utf-8").splitlines():
        candidate = line.strip()
        if candidate and not candidate.startswith("#"):
            payloads.append(candidate)
    if not payloads:
        raise ValueError("Payloads file does not contain any payloads")
    return payloads


def reflect_status(resp: Response, payload: str) -> Dict[str, Any]:
    try:
        text = resp.text
    except Exception:
        text = ""
    escaped_payload = html.escape(payload)
    encoded_payload = quote_plus(payload)
    reflected_unescaped = payload in text
    reflected_escaped = escaped_payload in text and escaped_payload != payload
    reflected_encoded = encoded_payload in text and encoded_payload != payload
    header_reflection = [name for name, value in resp.headers.items() if payload in value]
    url_reflection = payload in resp.url
    snippet = build_snippet(text, payload) if reflected_unescaped else ""
    return {
        "status_code": resp.status_code,
        "reflected_unescaped": reflected_unescaped,
        "reflected_escaped": reflected_escaped,
        "reflected_url_encoded": reflected_encoded,
        "reflected_in_headers": header_reflection,
        "reflected_in_url": url_reflection,
        "snippet": snippet,
    }


def build_snippet(text: str, payload: str, radius: int = 60) -> str:
    idx = text.find(payload)
    if idx == -1:
        return ""
    start = max(idx - radius, 0)
    end = min(idx + len(payload) + radius, len(text))
    snippet = text[start:end].replace("\n", " ")
    return snippet.strip()


# ---------------------------
# Origin & redirect policy
# ---------------------------


def _host_matches(host_a: Optional[str], host_b: Optional[str], allow_subdomains: bool) -> bool:
    if not host_a or not host_b:
        return False
    if host_a == host_b:
        return True
    return allow_subdomains and host_a.endswith("." + host_b)


def _same_origin(url: str, base_url: str, allow_subdomains: bool) -> bool:
    a, b = urlparse(url), urlparse(base_url)
    return _host_matches(a.hostname, b.hostname, allow_subdomains) and a.scheme == b.scheme


def _ensure_same_origin(url: str, base_url: str, allow_subdomains: bool) -> None:
    if not _same_origin(url, base_url, allow_subdomains):
        raise ValueError(f"Cross-origin URL is not allowed: {url}")


def _request_with_policy(session: requests.Session, method: str, url: str, config: ScannerConfig, **kwargs) -> Response:
    # NB: we perform manual redirect following to enforce policy
    resp = session.request(method, url, allow_redirects=False, **kwargs)
    history = []
    tries = 0
    while 300 <= resp.status_code < 400 and tries < config.max_redirects:
        tries += 1
        loc = resp.headers.get("Location")
        if not loc:
            break
        next_url = urljoin(resp.url, loc)
        if config.redirects == "none":
            break
        if config.redirects == "same-origin":
            if not _same_origin(next_url, config.base_url, config.allow_subdomains):
                # stop following
                break
        # if redirects == "all", we allow cross origin (but this script is meant for single domain scanning,
        # so consider leaving same-origin default)
        history.append(resp)
        resp = session.request(method, next_url, allow_redirects=False, **kwargs)
    # attach history for debugging
    try:
        resp.history = history[:]  # type: ignore[attr-defined]
    except Exception:
        pass
    return resp


# ---------------------------
# Security headers + saving responses
# ---------------------------


def _extract_security_headers(resp: Response) -> Dict[str, Optional[str]]:
    h = resp.headers
    return {
        "content_type": h.get("Content-Type"),
        "csp": h.get("Content-Security-Policy"),
        "x_frame_options": h.get("X-Frame-Options"),
        "referrer_policy": h.get("Referrer-Policy"),
        "permissions_policy": h.get("Permissions-Policy"),
        "x_content_type_options": h.get("X-Content-Type-Options"),
    }


def _save_response(resp: Response, base_dir: Path, target_name: str, payload: str) -> str:
    token = hashlib.sha1(f"{resp.url}|{payload}|{resp.status_code}".encode("utf-8")).hexdigest()[:12]
    ct = (resp.headers.get("Content-Type") or "").lower()
    ext = "html" if "html" in ct else "txt"
    safe_name = re.sub(r"[^\w.-]+", "_", target_name)[:60]
    fname = f"{safe_name}_{resp.status_code}_{token}.{ext}"
    out = base_dir / fname
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(resp.content)
    return str(out)


# ---------------------------
# DOM check (Playwright) - optional
# ---------------------------


def _dom_check_url(url: str, payload: str, timeout: float = 5.0) -> Tuple[bool, Optional[str]]:
    """
    Try to open the URL in a headless browser and detect dialogs (alert).
    Returns (executed_alert, error_reason_or_none)
    """
    try:
        # Import lazily so script works without Playwright installed
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeoutError
    except Exception as exc:
        return False, f"playwright-not-installed: {exc}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            dialog_seen = {"ok": False, "message": None}

            def on_dialog(dialog):
                dialog_seen["ok"] = True
                dialog_seen["message"] = dialog.message
                try:
                    dialog.dismiss()
                except Exception:
                    pass

            page.on("dialog", on_dialog)
            page.goto(url, timeout=int(timeout * 1000))
            # wait a tiny bit for onload / JS execution; conservative
            try:
                page.wait_for_timeout(500)
            except Exception:
                pass
            browser.close()
            return dialog_seen["ok"], dialog_seen["message"]
    except Exception as exc:
        return False, f"playwright-error: {exc}"


# ---------------------------
# Main evaluation flow
# ---------------------------


def evaluate_with_config(target: Target, payload: str, config: ScannerConfig) -> Dict[str, Any]:
    # prevent absolute paths in target definitions
    if "://" in target.path:
        return {
            "target": target.name,
            "url": target.path,
            "payload": payload,
            "method": target.method,
            "error": "Absolute URLs in target.path are not allowed. Use relative paths only.",
        }

    url, kwargs = target.build_request(config.base_url, payload, config.timeout)

    # ensure same origin before sending
    try:
        _ensure_same_origin(url, config.base_url, config.allow_subdomains)
    except ValueError as exc:
        return {
            "target": target.name,
            "url": url,
            "payload": payload,
            "method": target.method,
            "error": str(exc),
        }

    # Prevent accidental state changes unless allowed
    if not config.allow_stateful and target.method.upper() not in {"GET", "HEAD"}:
        return {
            "target": target.name,
            "url": url,
            "payload": payload,
            "method": target.method,
            "error": "Stateful methods are disabled. Use --allow-stateful to permit POST/PUT/DELETE.",
        }

    session = get_session(config)
    try:
        started = perf_counter()
        response = _request_with_policy(session, target.method.upper(), url, config, **kwargs)
        elapsed_ms = (perf_counter() - started) * 1000
    except requests.RequestException as exc:
        return {
            "target": target.name,
            "url": url,
            "payload": payload,
            "method": target.method,
            "error": str(exc),
        }

    analysis = reflect_status(response, payload)
    analysis["elapsed_ms"] = elapsed_ms
    analysis["security_headers"] = _extract_security_headers(response)
    content_type = (analysis["security_headers"].get("content_type") or "").lower()
    analysis["html_like"] = "html" in content_type or response.text and ("<html" in response.text.lower() or "<body" in response.text.lower())

    if config.save_responses:
        try:
            saved_to = _save_response(response, config.save_responses, target.name, payload)
            analysis["saved_to"] = saved_to
        except Exception as exc:
            analysis["save_error"] = str(exc)

    # decide vulnerability — reflected unescaped OR reflected in headers OR url
    is_vulnerable = analysis["reflected_unescaped"] or bool(analysis["reflected_in_headers"]) or analysis["reflected_in_url"]

    result: Dict[str, Any] = {
        "target": target.name,
        "url": url,
        "payload": payload,
        "method": target.method,
        "analysis": analysis,
        "vulnerable": bool(is_vulnerable),
    }

    # optional dom check
    if config.dom_check and is_vulnerable and target.method.upper() in {"GET", "HEAD"}:
        executed, reason = _dom_check_url(url, payload, timeout=config.timeout)
        result["analysis"]["dom_check"] = {"executed_alert": executed, "reason": reason}

    return result


# ---------------------------
# Reporting & CLI helpers
# ---------------------------


def build_report(findings: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    results = list(findings)
    summary = {
        "total_checks": len(results),
        "vulnerable": sum(1 for item in results if item.get("vulnerable")),
        "errors": sum(1 for item in results if "error" in item),
    }
    latencies = [item["analysis"]["elapsed_ms"] for item in results if item.get("analysis") and "elapsed_ms" in item["analysis"]]
    if latencies:
        summary["avg_response_ms"] = sum(latencies) / len(latencies)
        summary["max_response_ms"] = max(latencies)
    return {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "summary": summary,
        "results": results,
    }


def save_report(report: Dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Active scanner for reflected XSS vectors (single-domain).")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Application base URL (default: %(default)s).")
    parser.add_argument("--targets-file", help="Path to JSON file with target definitions.")
    parser.add_argument("--payloads-file", help="Path to text file with payloads (one per line).")
    parser.add_argument("--report", help="Write JSON report to this path.")
    parser.add_argument("--only-vulnerable", action="store_true", help="Print only findings where reflection detected.")
    parser.add_argument("--fail-on-vulnerable", action="store_true", help="Exit with status 1 if any vulnerability detected.")
    parser.add_argument("--header", action="append", default=[], metavar="NAME:VALUE", help="Add header to every request (can be used multiple times).")
    parser.add_argument("--cookie", action="append", default=[], metavar="NAME=VALUE", help="Add cookie to every request (can be used multiple times).")
    parser.add_argument("--basic-auth", metavar="USER:PASS", help="Send HTTP Basic Auth credentials with every request.")
    parser.add_argument("--timeout", type=float, default=10.0, help="Default request timeout in seconds (default: %(default)s).")
    parser.add_argument("--workers", type=int, default=4, help="Number of concurrent workers (default: %(default)s).")
    parser.add_argument("--redirects", choices=["none", "same-origin", "all"], default="same-origin", help="Redirect following policy (default: %(default)s).")
    parser.add_argument("--max-redirects", type=int, default=5, help="Maximum redirects to follow (default: %(default)s).")
    parser.add_argument("--allow-subdomains", action="store_true", help="Treat subdomains of base host as same-origin.")
    parser.add_argument("--save-responses", metavar="DIR", help="Save response bodies to DIR for evidence.")
    parser.add_argument("--allow-stateful", action="store_true", help="Allow targets that may modify state (POST/PUT/DELETE).")
    parser.add_argument("--dom-check", action="store_true", help="Attempt a headless DOM check (Playwright) for confirmed reflections.")
    return parser.parse_args()


def render_finding_line(finding: Dict[str, Any], status: str) -> str:
    analysis = finding.get("analysis") or {}
    extra_bits: List[str] = []
    if analysis.get("reflected_in_headers"):
        extra_bits.append(f"headers={analysis['reflected_in_headers']}")
    if analysis.get("reflected_in_url"):
        extra_bits.append("url=true")
    if analysis.get("reflected_escaped") and not finding.get("vulnerable"):
        extra_bits.append("escaped")
    if "elapsed_ms" in analysis:
        extra_bits.append(f"{analysis['elapsed_ms']:.1f}ms")
    sh = analysis.get("security_headers") or {}
    ct = sh.get("content_type")
    if ct:
        extra_bits.append(f"ct={ct.split(';', 1)[0]}")
    if sh.get("csp"):
        extra_bits.append("csp")
    if analysis.get("saved_to"):
        extra_bits.append("saved")
    joined = "; ".join(extra_bits)
    parts = [
        f"{status:11}",
        str(analysis.get("status_code", "??")),
        f"{finding.get('method', 'GET').upper()} {finding['url']}",
        f"payload={finding['payload']}",
    ]
    if joined:
        parts.append(joined)
    return " | ".join(parts)


def print_summary(summary: Dict[str, Any]) -> None:
    total = summary["total_checks"]
    vulnerable = summary["vulnerable"]
    errors = summary["errors"]
    print("\nSummary:")
    print(f"- checks      : {total}")
    print(f"- vulnerable  : {vulnerable}")
    print(f"- errors      : {errors}")
    if "avg_response_ms" in summary:
        print(f"- latency avg : {summary['avg_response_ms']:.1f} ms")
        print(f"- latency max : {summary['max_response_ms']:.1f} ms")
    print()


def print_vulnerable_overview(findings: Iterable[Dict[str, Any]]) -> None:
    vulnerable = [item for item in findings if item.get("vulnerable")]
    if not vulnerable:
        return
    print("Vulnerable targets:")
    for item in vulnerable:
        analysis = item.get("analysis") or {}
        status = analysis.get("status_code", "??")
        latency = f", {analysis['elapsed_ms']:.1f} ms" if "elapsed_ms" in analysis else ""
        dom = ""
        if analysis.get("dom_check"):
            domc = analysis["dom_check"]
            dom = f", dom_alert={domc.get('executed_alert')} reason={domc.get('reason')}"
        print(f"- {item.get('method', 'GET').upper()} {item['url']} (status={status}, payload={item['payload']}{latency}{dom})")
    print()


def prepare_headers(entries: List[str]) -> Dict[str, str]:
    headers = dict(DEFAULT_HEADERS)
    for raw in entries:
        if ":" not in raw:
            raise ValueError(f"Invalid header format (expected NAME:VALUE): {raw}")
        name, value = raw.split(":", 1)
        headers[name.strip()] = value.strip()
    return headers


def prepare_cookies(entries: List[str]) -> Dict[str, str]:
    cookies: Dict[str, str] = {}
    for raw in entries:
        if "=" not in raw:
            raise ValueError(f"Invalid cookie format (expected NAME=VALUE): {raw}")
        name, value = raw.split("=", 1)
        cookies[name.strip()] = value.strip()
    return cookies


def parse_basic_auth(raw: Optional[str]) -> Optional[Tuple[str, str]]:
    if not raw:
        return None
    if ":" not in raw:
        raise ValueError("Basic auth credentials must be in USER:PASS format")
    user, password = raw.split(":", 1)
    return user, password


def run_scanner(targets: List[Target], payloads: List[str], config: ScannerConfig, workers: int) -> List[Dict[str, Any]]:
    jobs: List[Tuple[int, Target, str]] = []
    idx = 0
    for target in targets:
        for payload in payloads:
            jobs.append((idx, target, payload))
            idx += 1
    results: List[Optional[Dict[str, Any]]] = [None] * len(jobs)
    if workers <= 1:
        for job_idx, target, payload in jobs:
            results[job_idx] = evaluate_with_config(target, payload, config)
    else:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {executor.submit(evaluate_with_config, target, payload, config): job_idx for job_idx, target, payload in jobs}
            for future in as_completed(future_map):
                job_idx = future_map[future]
                try:
                    results[job_idx] = future.result()
                except Exception as exc:  # pragma: no cover
                    target, payload = jobs[job_idx][1], jobs[job_idx][2]
                    try:
                        target_url = urljoin(config.base_url, target.path.format(payload=payload))
                    except Exception:
                        target_url = urljoin(config.base_url, target.path)
                    results[job_idx] = {
                        "target": target.name,
                        "url": target_url,
                        "payload": payload,
                        "method": target.method,
                        "error": f"Unhandled exception: {exc}",
                    }
    return [item for item in results if item is not None]


# ---------------------------
# Entrypoint
# ---------------------------


def main() -> None:
    args = parse_args()

    try:
        targets = load_targets(args.targets_file)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"Error loading targets: {exc}", file=sys.stderr)
        return

    try:
        payloads = load_payloads(args.payloads_file)
    except (FileNotFoundError, ValueError) as exc:
        print(f"Error loading payloads: {exc}", file=sys.stderr)
        return

    try:
        headers = prepare_headers(args.header)
        cookies = prepare_cookies(args.cookie)
        basic_auth = parse_basic_auth(args.basic_auth)
    except ValueError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return

    save_dir = Path(args.save_responses).expanduser().resolve() if args.save_responses else None

    config = ScannerConfig(
        base_url=args.base_url,
        headers=headers,
        cookies=cookies,
        timeout=max(args.timeout, 0.1),
        basic_auth=basic_auth,
        redirects=args.redirects,
        max_redirects=max(args.max_redirects, 0),
        allow_subdomains=bool(args.allow_subdomains),
        save_responses=save_dir,
        allow_stateful=bool(args.allow_stateful),
        dom_check=bool(args.dom_check),
    )

    # skip stateful targets early if not allowed
    if not config.allow_stateful:
        filtered = []
        for t in targets:
            if t.method.upper() not in {"GET", "HEAD"}:
                print(f"Skipping stateful target without --allow-stateful: {t.name}", file=sys.stderr)
            else:
                filtered.append(t)
        targets = filtered

    findings = run_scanner(targets, payloads, config, max(args.workers, 1))

    for finding in findings:
        status = "VULNERABLE" if finding.get("vulnerable") else "ok"
        if "error" in finding:
            status = "error"
        if args.only_vulnerable and status != "VULNERABLE":
            continue
        print(render_finding_line(finding, status))
        if status == "VULNERABLE" and finding.get("analysis", {}).get("snippet"):
            print(f"    snippet: {finding['analysis']['snippet']}")
        if "error" in finding:
            print(f"    error: {finding['error']}")
        if finding.get("analysis", {}).get("saved_to"):
            print(f"    saved_to: {finding['analysis']['saved_to']}")

    report = build_report(findings)
    print_summary(report["summary"])
    print_vulnerable_overview(findings)

    if args.report:
        save_report(report, Path(args.report))

    if args.fail_on_vulnerable and report["summary"]["vulnerable"]:
        sys.exit(1)


if __name__ == "__main__":
    main()