#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Supabase PG helper (pooler failover + tooling) — Python edition.

Фичи:
- .env (опционально, USE_DOTENV=1)
- Логи с ротацией (текст + опционально JSONL)
- Failover по пулеру с fallback на direct
- Экспоненциальные ретраи с джиттером
- Параллельный опрос IP пулера
- Кэш последнего успешного IP
- Prometheus textfile метрика supabase_pooler_up
- Утилиты: health, миграции (status/up), последние логины, smoke, show-env, tls, diag, sql

Требования:
- psql в PATH (или укажи PSQL_BIN)
- (опционально) supabase CLI в PATH (или укажи SUPABASE_BIN)
- Python 3.8+
"""

from __future__ import annotations
import argparse
import datetime as dt
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import random
import re
import socket
import subprocess
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ================== КОНФИГ/ЛОГИ ==================

def load_dotenv(path: Path) -> None:
    if not path or not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        m = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$", line)
        if not m:
            continue
        k, v = m.group(1), m.group(2).strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        else:
            hash_pos = v.find(" #")
            if hash_pos >= 0:
                v = v[:hash_pos].strip()
        if v == "":
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

ROOT = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()

# Включение .env
if os.environ.get("USE_DOTENV", "0").lower() in ("1", "true"):
    load_dotenv(Path(os.environ.get("DOTENV_PATH", ROOT / ".env")))

# Базовый конфиг
CFG = {
    "DB_USER":        os.environ.get("DB_USER",        "postgres.wsqhgnxmotswjantxopb"),
    # Разные пользователи для pooler (6543) и direct (5432)
    "DB_USER_POOLER": os.environ.get("DB_USER_POOLER", os.environ.get("DB_USER", "postgres.wsqhgnxmotswjantxopb")),
    "DB_USER_DIRECT": os.environ.get("DB_USER_DIRECT", os.environ.get("DB_USER_DIRECT") or "postgres"),
    "DB_PASSWORD":    os.environ.get("DB_PASSWORD",    "e7TRclAGt7Yd3KEL"),
    "DB_NAME":        os.environ.get("DB_NAME",        "postgres"),
    "POOLER_FQDN":    os.environ.get("POOLER_FQDN",    "aws-1-eu-central-1.pooler.supabase.com"),
    "PORT_POOLER":    int(os.environ.get("PORT_POOLER", "6543")),
    "DIRECT_HOST":    os.environ.get("DIRECT_HOST",    "db.wsqhgnxmotswjantxopb.supabase.co"),
    "PORT_DIRECT":    int(os.environ.get("PORT_DIRECT","5432")),
    "TCP_TIMEOUT":    float(os.environ.get("TCP_TIMEOUT","1.2")),
    "PSQL_CONNSEC":   int(os.environ.get("PSQL_CONNSEC","3")),
    "MAX_TRIES":      int(os.environ.get("MAX_TRIES",  "3")),
    "LOG_DIR":        os.environ.get("LOG_DIR",        str(ROOT / "logs")),
    "JSON_LOG":       os.environ.get("JSON_LOG",       "1").lower() in ("1","true"),
    "EXTRA_IPS":      [ "3.65.151.229", "3.71.225.44" ],
    "PSQL_BIN":       os.environ.get("PSQL_BIN",       "psql"),
    "SUPABASE_BIN":   os.environ.get("SUPABASE_BIN",   "supabase"),
    "PROM_FILE":      os.environ.get("PROM_FILE",      str((ROOT / "logs" / "supabase_helper.prom"))),
    "DNS_RESOLVER":   os.environ.get("DNS_RESOLVER",   os.environ.get("SUPA_DNS_RESOLVER", "https")),
    "FORCE_POOLER_ONLY": os.environ.get("FORCE_POOLER_ONLY", "0").lower() in ("1","true","yes"),
    "MIG_VIA":        os.environ.get("MIG_VIA",        "auto"),  # auto|pooler|direct
}

LOG_DIR = Path(CFG["LOG_DIR"])
LOG_DIR.mkdir(parents=True, exist_ok=True)
logdate = dt.datetime.now().strftime("%Y%m%d")
LOG_TXT = LOG_DIR / f"supabase_auto_{logdate}.log"
LOG_JSON = LOG_DIR / f"supabase_auto_{logdate}.jsonl"

logger = logging.getLogger("supabase_helper")
logger.setLevel(logging.DEBUG)
_text = RotatingFileHandler(LOG_TXT, maxBytes=5*1024*1024, backupCount=5, encoding="utf-8")
_text.setFormatter(logging.Formatter("[%(asctime)s][%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S"))
_text.setLevel(logging.DEBUG)
logger.addHandler(_text)
_console = logging.StreamHandler(sys.stdout)
_console.setFormatter(logging.Formatter("[%(asctime)s][%(levelname)s] %(message)s", "%H:%M:%S"))
_console.setLevel(logging.INFO)
logger.addHandler(_console)

def log_json(level: str, message: str, meta: dict | None = None) -> None:
    if not CFG["JSON_LOG"]:
        return
    obj = {"ts": dt.datetime.now().isoformat(timespec="milliseconds"), "level": level, "msg": message}
    if meta:
        obj["meta"] = meta
    with LOG_JSON.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def log(level: str, message: str, meta: dict | None = None) -> None:
    getattr(logger, level.lower(), logger.info)(message)
    log_json(level.upper(), message, meta)

# ================== УТИЛИТЫ ==================

def c(s: str, col: str) -> str:
    return f"\033[{col}m{s}\033[0m"

def mask_url(url: str | None) -> str | None:
    if not url:
        return url
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", url)

def resolve_a_records(fqdn: str) -> list[str]:
    ips: set[str] = set()
    try:
        for fam, _, _, _, sockaddr in socket.getaddrinfo(fqdn, None, proto=socket.IPPROTO_TCP):
            if fam == socket.AF_INET:
                ips.add(sockaddr[0])
    except Exception:
        pass
    return list(ips)

def resolve_aaaa_records(fqdn: str) -> list[str]:
    ips: set[str] = set()
    try:
        for fam, _, _, _, sockaddr in socket.getaddrinfo(fqdn, None, proto=socket.IPPROTO_TCP):
            if fam == socket.AF_INET6:
                ips.add(sockaddr[0])
    except Exception:
        pass
    return list(ips)

def resolve_a_records_doh(fqdn: str, timeout: float = 3.0) -> list[str]:
    # DNS-over-HTTPS fallback (Cloudflare, then Google)
    import urllib.request
    ips: list[str] = []
    endpoints = [
        f"https://cloudflare-dns.com/dns-query?name={fqdn}&type=A",
        f"https://dns.google/resolve?name={fqdn}&type=A",
    ]
    for url in endpoints:
        try:
            req = urllib.request.Request(url, headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = json.loads(r.read().decode("utf-8"))
            ans = data.get("Answer") or []
            for a in ans:
                if a.get("type") == 1 and isinstance(a.get("data"), str):
                    ips.append(a.get("data"))
            if ips:
                break
        except Exception:
            continue
    # Уникальные
    seen = set(); uniq: list[str] = []
    for ip in ips:
        if ip not in seen:
            uniq.append(ip); seen.add(ip)
    return uniq

def test_tcp(host: str, port: int, timeout: float) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False

def direct_available() -> tuple[bool, str | None]:
    host = CFG["DIRECT_HOST"]
    a = resolve_a_records(host)
    aaaa = resolve_aaaa_records(host)
    if a:
        return True, None
    if aaaa:
        # нет IPv4; проверим IPv6 TCP
        for ip6 in aaaa[:3]:
            if test_tcp(ip6, CFG["PORT_DIRECT"], CFG["TCP_TIMEOUT"]):
                return True, None
        return False, "IPv6 not available"
    return False, "No DNS A/AAAA"

def build_url(host: str, port: int, user: str | None = None) -> str:
    from urllib.parse import quote
    esc_pass = quote(CFG["DB_PASSWORD"])
    u = user or CFG['DB_USER']
    # Use "postgresql://" scheme for better tool compatibility
    h = host
    if ":" in h and not h.startswith("["):
        h = f"[{h}]"  # bracket IPv6 literal for URIs
    return f"postgresql://{u}:{esc_pass}@{h}:{port}/{CFG['DB_NAME']}?sslmode=require&connect_timeout={CFG['PSQL_CONNSEC']}"

def run_cmd(args: list[str], timeout: float = 120, extra_env: dict | None = None) -> tuple[int, str]:
    # подмена бинарников по конфигу
    if args and args[0] == "psql":     args[0] = CFG["PSQL_BIN"]
    if args and args[0] == "supabase": args[0] = CFG["SUPABASE_BIN"]
    env = os.environ.copy()
    env["PGSSLMODE"] = "require"
    if extra_env:
        env.update(extra_env)
    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=env)
        out = (proc.stdout or "") + (("\n" + proc.stderr) if proc.stderr else "")
        return proc.returncode, out.strip()
    except subprocess.TimeoutExpired as e:
        out = ((e.stdout or "") + ("\n" + (e.stderr or ""))).strip()
        return 124, f"timeout after {timeout}s: {out}"

def try_login(url: str) -> bool:
    code, _ = run_cmd(["psql", url, "-v", "ON_ERROR_STOP=1", "-tAc", "select 1"])
    return code == 0

def backoff(attempt: int) -> None:
    base = 0.2 * (2 ** max(0, attempt - 1))
    jitter = random.uniform(0, 0.15)
    time.sleep(min(base + jitter, 3.0))

def pick_working_url_fast(hosts: list[str], port: int) -> str | None:
    def probe(h):
        if not test_tcp(h, port, CFG["TCP_TIMEOUT"]):
            return h, None
        url = build_url(h, port)
        return h, url if try_login(url) else None

    with ThreadPoolExecutor(max_workers=min(8, len(hosts))) as ex:
        futs = {ex.submit(probe, h): h for h in hosts}
        for fut in as_completed(futs):
            h, url = fut.result()
            print(f"Пробую {h}:{port} ... {'✔' if url else '✖'}")
            if url:
                for f in futs:
                    f.cancel()
                return url
    return None

# Prometheus
PROM_PATH = Path(CFG["PROM_FILE"])
def write_metrics(pooler_ok: bool):
    try:
        PROM_PATH.parent.mkdir(parents=True, exist_ok=True)
        ts = int(time.time())
        text = (
            "# HELP supabase_pooler_up Pooler availability\n"
            "# TYPE supabase_pooler_up gauge\n"
            f"supabase_pooler_up {1 if pooler_ok else 0} {ts}\n"
        )
        PROM_PATH.write_text(text, encoding="utf-8")
    except Exception:
        pass

# Кэш IP
CACHE = ROOT / ".supabase_cache.json"
def cache_save(host: str):
    try:
        CACHE.write_text(json.dumps({"last_host": host}), encoding="utf-8")
    except Exception:
        pass

def cache_load() -> str | None:
    try:
        return json.loads(CACHE.read_text(encoding="utf-8")).get("last_host")
    except Exception:
        return None

# ================== ЯДРО ==================

def choose_env(use_direct: bool = False, force_pooler: bool = False) -> tuple[str | None, str]:
    if use_direct:
        direct = build_url(CFG["DIRECT_HOST"], CFG["PORT_DIRECT"], CFG["DB_USER_DIRECT"])
        os.environ["SUPABASE_DB_POOLER"] = ""
        os.environ["SUPABASE_DB_DIRECT"] = direct
        print(f"\nDirect режим. SUPABASE_DB_DIRECT = {mask_url(direct)}")
        write_metrics(pooler_ok=False)
        return None, direct

    candidates: list[str] = []
    last = cache_load()
    if last:
        candidates.append(last)
    prev = os.environ.get("SUPABASE_DB_POOLER")
    if prev:
        try:
            m = re.search(r"@([^:/]+):\d+/", prev)
            if m:
                candidates.append(m.group(1))
        except Exception:
            pass
    candidates.append(CFG["POOLER_FQDN"])
    candidates += resolve_a_records(CFG["POOLER_FQDN"])
    candidates += CFG["EXTRA_IPS"]

    # unique preserving order
    seen = set()
    uniq = []
    for x in candidates:
        if x and x not in seen:
            uniq.append(x); seen.add(x)

    print("\nКандидаты пулера:")
    for cnd in uniq:
        print(f"  - {cnd}")

    # для pooler используем pooler-пользователя
    if CFG.get("DB_USER_POOLER") and CFG["DB_USER_POOLER"] == "postgres":
        log("warning", "DB_USER_POOLER выглядит как 'postgres' — для пулера обычно требуется 'postgres.<project_ref>'")
    _old_user = CFG["DB_USER"]
    CFG["DB_USER"] = CFG["DB_USER_POOLER"]
    try:
        pooler_url = pick_working_url_fast(uniq, CFG["PORT_POOLER"])
    finally:
        CFG["DB_USER"] = _old_user
    if not pooler_url:
        if force_pooler:
            raise RuntimeError("Пулер обязателен (--force-pooler), но недоступен.")
        msg = f"Не удалось подключиться к пулеру {CFG['POOLER_FQDN']}:{CFG['PORT_POOLER']}. Перехожу на direct {CFG['DIRECT_HOST']}:{CFG['PORT_DIRECT']}"
        log("warning", msg)
        direct = build_url(CFG["DIRECT_HOST"], CFG["PORT_DIRECT"], CFG["DB_USER_DIRECT"])
        os.environ["SUPABASE_DB_POOLER"] = ""
        os.environ["SUPABASE_DB_DIRECT"] = direct
        write_metrics(pooler_ok=False)
        return None, direct

    os.environ["SUPABASE_DB_POOLER"] = pooler_url
    # direct control
    skip_direct_env = os.environ.get("SUPABASE_SKIP_DIRECT", "0").lower() in ("1","true","yes")
    direct_ok, reason = direct_available()
    if skip_direct_env or not direct_ok:
        os.environ["SUPABASE_DB_DIRECT"] = ""
        if skip_direct_env:
            log("warning", "Direct disabled: SUPABASE_SKIP_DIRECT=1")
        else:
            log("warning", f"Direct disabled: {reason}")
        direct_url = ""
    else:
        direct_url = build_url(CFG["DIRECT_HOST"], CFG["PORT_DIRECT"], CFG["DB_USER_DIRECT"])
        os.environ["SUPABASE_DB_DIRECT"] = direct_url

    print("")
    print(f"SUPABASE_DB_POOLER = {mask_url(pooler_url)}")
    print(f"SUPABASE_DB_DIRECT = {mask_url(direct_url) if direct_url else ''}")

    # сохранить кэш IP
    m = re.search(r"@([^:/]+):\d+/", pooler_url)
    if m:
        cache_save(m.group(1))
    write_metrics(pooler_ok=True)
    return pooler_url, direct_url

def psql_failover(sql: str) -> bool:
    tries = CFG["MAX_TRIES"]
    for i in range(1, tries + 1):
        url = os.environ.get("SUPABASE_DB_POOLER")
        if not url:
            choose_env()
            url = os.environ.get("SUPABASE_DB_POOLER")

        if not url:
            # fallback direct только если разрешён и доступен
            skip_direct_env = os.environ.get("SUPABASE_SKIP_DIRECT", "0").lower() in ("1","true","yes")
            ok, _ = direct_available()
            if skip_direct_env or not ok:
                print("Direct отключён — пропускаю попытку через direct.")
                return False
            direct = os.environ.get("SUPABASE_DB_DIRECT") or build_url(CFG["DIRECT_HOST"], CFG["PORT_DIRECT"], CFG["DB_USER_DIRECT"])
            code, out = run_cmd(["psql", direct, "-v", "ON_ERROR_STOP=1", "-c", sql])
            print(out)
            return code == 0

        log("debug", f"SQL попытка {i}/{tries}: {sql}")
        code, out = run_cmd(["psql", url, "-v", "ON_ERROR_STOP=1", "-c", sql])
        print(out)
        if code == 0:
            return True
        print(c(f"psql не прошёл (попытка {i}/{tries}) — переизбираю хост...", "33"))
        os.environ["SUPABASE_DB_POOLER"] = ""
        backoff(i)
    raise RuntimeError("Все попытки выполнить SQL исчерпаны.")

# ================== КОМАНДЫ ==================

def cmd_show_env(_args) -> None:
    print("\n=== Текущие переменные Supabase ===")
    print("SUPABASE_DB_POOLER =", mask_url(os.environ.get("SUPABASE_DB_POOLER")))
    print("SUPABASE_DB_DIRECT =", mask_url(os.environ.get("SUPABASE_DB_DIRECT")))

def cmd_health(args) -> None:
    print("\n=== Health check ===")
    psql_failover("select version(), now();")
    if args.tls:
        cmd_tls(args)

def _ensure_supabase_cli():
    code, out = run_cmd(["supabase", "--version"])
    if code != 0:
        log("error", f"supabase CLI не найден. Установи его и добавь в PATH. Вывод: {out}")
        print(c("supabase CLI не найден (нужен для миграций)", "31"))
        sys.exit(1)

def _direct_url() -> str:
    # Используем уже установленный URL, если есть
    existing = os.environ.get("SUPABASE_DB_DIRECT")
    if existing:
        return existing
    host = CFG["DIRECT_HOST"]
    # Сначала системный DNS
    ips = resolve_a_records(host)
    if not ips:
        # Fallback: DoH
        ips = resolve_a_records_doh(host)
    # direct обычно использует пользователя "postgres"
    url = build_url(ips[0] if ips else host, CFG["PORT_DIRECT"], CFG["DB_USER_DIRECT"])
    os.environ["SUPABASE_DB_DIRECT"] = url
    return url

def _pick_migration_url() -> str:
    via = (CFG.get("MIG_VIA") or "auto").lower()
    if via == "direct":
        return _direct_url()
    # prefer pooler if available or forced
    pooler_url, direct_url = choose_env(use_direct=False, force_pooler=CFG["FORCE_POOLER_ONLY"])
    if via == "pooler":
        if not pooler_url:
            raise RuntimeError("Требуется пулер для миграций (MIG_VIA=pooler), но он недоступен")
        return pooler_url
    # auto: prefer pooler, fallback direct
    return pooler_url or direct_url

def _read_token_from_env() -> str | None:
    for k in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_TOKEN", "SUPABASE_PAT"):
        v = os.environ.get(k)
        if v and v.strip():
            return v.strip()
    return None

def _is_logged_in() -> bool:
    code, _ = run_cmd(["supabase", "projects", "list", "--output", "json"])
    return code == 0

def ensure_login_noninteractive(token: str | None = None) -> bool:
    _ensure_supabase_cli()
    if _is_logged_in():
        return True
    tok = token or _read_token_from_env()
    if not tok:
        log("warning", "Нет токена SUPABASE_ACCESS_TOKEN — пропускаю авто-логин.")
        return False
    code, out = run_cmd(["supabase", "login", "--no-browser", "--token", tok])
    if code != 0:
        log("error", f"Не удалось выполнить supabase login: {out}")
        return False
    return True

def ensure_link(project_ref: str | None = None, db_password: str | None = None) -> bool:
    _ensure_supabase_cli()
    ref = project_ref or os.environ.get("SUPABASE_PROJECT_REF") or os.environ.get("PROJECT_REF")
    if not ref:
        log("warning", "SUPABASE_PROJECT_REF не задан — пропускаю supabase link.")
        return False
    # Пробуем линк без пароля (избегаем возможной ошибки SSL при проверке пароля внутри CLI)
    code, out = run_cmd([
        "supabase", "--dns-resolver", CFG["DNS_RESOLVER"], "--workdir", str(ROOT),
        "link", "--project-ref", ref, "--yes",
    ])
    if code != 0:
        log("error", f"Не удалось выполнить supabase link: {out}")
        return False
    return True

def cmd_mig_status(_args) -> None:
    print("\n=== Статус миграций ===")
    _ensure_supabase_cli()
    # Для статуса допустим пулер
    pooler = os.environ.get("SUPABASE_DB_POOLER") or choose_env()[0]
    if not pooler:
        print("Пулер недоступен.")
        return
    print(f"DB URL (pooler): {mask_url(pooler)}")
    code, out = run_cmd(["supabase", "--dns-resolver", CFG["DNS_RESOLVER"], "migration", "list", "--db-url", pooler])
    print(out)

def cmd_mig_up(_args) -> None:
    print("\n=== Применение миграций (только пулер) ===")
    _ensure_supabase_cli()
    pooler = os.environ.get("SUPABASE_DB_POOLER") or choose_env()[0]
    if not pooler:
        print("Пулер недоступен, direct отключён — миграции пропущены.")
        sys.exit(1)
    print(f"DB URL (pooler): {mask_url(pooler)}")
    # Пытаемся db push — если не поддерживается через пулер, останавливаемся
    code, out = run_cmd(["supabase", "--dns-resolver", CFG["DNS_RESOLVER"], "db", "push", "--db-url", pooler, "--yes"])
    print(out)
    if code != 0:
        log("error", "db push через пулер не поддерживается или завершился ошибкой")
        sys.exit(1)

def cmd_mig_push(_args) -> None:
    print("\n=== Push миграций (только пулер) ===")
    _ensure_supabase_cli()
    ensure_login_noninteractive()
    pooler = os.environ.get("SUPABASE_DB_POOLER") or choose_env()[0]
    if not pooler:
        print("Пулер недоступен, direct отключён — миграции пропущены.")
        sys.exit(1)
    print(f"DB URL (pooler): {mask_url(pooler)}")
    code, out = run_cmd([
        "supabase", "--dns-resolver", CFG["DNS_RESOLVER"], "--workdir", str(ROOT),
        "db", "push", "--db-url", pooler, "--yes",
    ])
    print(out)
    if code != 0:
        log("error", "db push через пулер не поддерживается или завершился ошибкой")
        sys.exit(1)

def cmd_last_logins(_args) -> None:
    print("\n=== Последние логины в базу ===")
    psql_failover("select usename, client_addr, backend_start from pg_stat_activity order by backend_start desc limit 5;")

def cmd_smoke(_args) -> None:
    print("\n=== Smoke: схема и таблицы ===")
    psql_failover("select current_database(), current_user, current_schema;")
    psql_failover("select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where relkind='r' order by 1,2 limit 10;")


def cmd_run(args) -> None:
    print("\n=== Выбор рабочего хоста Supabase (пулер) ===")
    choose_env(use_direct=args.use_direct, force_pooler=args.force_pooler)
    log("debug", f"POOLER USED: {mask_url(os.environ.get('SUPABASE_DB_POOLER'))}")
    log("debug", f"DIRECT  USED: {mask_url(os.environ.get('SUPABASE_DB_DIRECT'))}")

    print("\n=== Быстрый тест ===")
    psql_failover("select version();")

    pooler_shown = mask_url(os.environ.get("SUPABASE_DB_POOLER"))
    print("\nГотово. Можно пользоваться:")
    if pooler_shown:
        print(f'  psql "{pooler_shown}" -c "select now();"')
        print(f'  supabase --dns-resolver native migration status --db-url "{pooler_shown}"')
    else:
        direct = mask_url(os.environ.get("SUPABASE_DB_DIRECT"))
        print(f'  psql "{direct}" -c "select now();"  # direct')

def cmd_sql(args):
    sql = args.sql
    if args.file:
        sql = Path(args.file).read_text(encoding="utf-8")
    if not sql or not sql.strip():
        print("Пустой SQL"); return
    psql_failover(sql)

def cmd_tls(_args):
    print("\n=== TLS check ===")
    # Используем pg_stat_ssl вместо ssl_is_used() (расширение sslinfo может быть недоступно)
    sql = (
        "select "
        " current_setting('ssl') as ssl_cfg,"
        " (select ssl from pg_stat_ssl where pid=pg_backend_pid()) as ssl_used,"
        " (select version from pg_stat_ssl where pid=pg_backend_pid()) as ssl_ver,"
        " (select cipher from pg_stat_ssl where pid=pg_backend_pid()) as ssl_cipher;"
    )
    psql_failover(sql)

def cmd_diag(_):
    print("\n=== Диагностика ===")
    print("psql:", run_cmd(["psql","--version"])[1])
    print("supabase:", run_cmd(["supabase","--version"])[1])
    pa = resolve_a_records(CFG["POOLER_FQDN"]) ; paaaa = resolve_aaaa_records(CFG["POOLER_FQDN"]) ; padoh = resolve_a_records_doh(CFG["POOLER_FQDN"]) 
    da = resolve_a_records(CFG["DIRECT_HOST"]) ; daaaa = resolve_aaaa_records(CFG["DIRECT_HOST"]) ; dadoh = resolve_a_records_doh(CFG["DIRECT_HOST"]) 
    print("DNS A (pooler):", pa)
    print("DNS AAAA (pooler):", paaaa)
    print("DNS A (pooler/doh):", padoh)
    print("DNS A (direct):", da)
    print("DNS AAAA (direct):", daaaa)
    print("DNS A (direct/doh):", dadoh)
    for h in [*pa, *CFG["EXTRA_IPS"]]:
        ok = test_tcp(h, CFG["PORT_POOLER"], CFG["TCP_TIMEOUT"])
        print(f"TCP {h}:{CFG['PORT_POOLER']} -> {'OK' if ok else 'FAIL'}")
    for h in da:
        ok = test_tcp(h, CFG["PORT_DIRECT"], CFG["TCP_TIMEOUT"])
        print(f"TCP {h}:{CFG['PORT_DIRECT']} -> {'OK' if ok else 'FAIL'}")
    for h in daaaa[:2]:
        ok = test_tcp(h, CFG["PORT_DIRECT"], CFG["TCP_TIMEOUT"])
        print(f"TCP [{h}]:{CFG['PORT_DIRECT']} (v6) -> {'OK' if ok else 'FAIL'}")
    avail, reason = direct_available()
    if not avail:
        print(f"Direct disabled: {reason}")
    else:
        print("Direct available: True")
    # Попробуем реальный логин в пулер (psql)
    pooler_ips = [*pa, *CFG["EXTRA_IPS"]]
    if pooler_ips:
        print("\nLogin check (pooler):")
        for ip in pooler_ips:
            url = build_url(ip, CFG["PORT_POOLER"], CFG["DB_USER_POOLER"])
            q = "select current_user, coalesce((select ssl from pg_stat_ssl where pid=pg_backend_pid()), false) as ssl_used"
            code, out = run_cmd(["psql", url, "-v", "ON_ERROR_STOP=1", "-tAc", q], timeout=20)
            mark = "✔" if code == 0 else "✖"
            print(f"  {ip}:{CFG['PORT_POOLER']} as {CFG['DB_USER_POOLER']} -> {mark}")
            if code != 0:
                tail = out.splitlines()[-1] if out else ""
                if tail:
                    print(f"    err: {tail}")

# ================== CLI/MAIN ==================



def ensure_tool(name: str) -> None:
    code, out = run_cmd([name, "--version"])
    if code != 0:
        log("error", f"Не найдено или не запускается: {name}. Добавь в PATH. Вывод: {out}")
        sys.exit(1)

def main():
    ap = argparse.ArgumentParser(description="Supabase helper (Python)")
    # глобальные опции
    ap.add_argument("--use-direct", action="store_true", help="Игнорировать пулер и использовать direct")
    ap.add_argument("--force-pooler", action="store_true", help="Падать, если пулер недоступен")
    ap.add_argument("--tcp-timeout", type=float, default=None, help="Таймаут TCP (сек)")
    ap.add_argument("--max-tries", type=int, default=None, help="Макс. попыток psql_failover")
    ap.add_argument("--psql-bin", default=None, help="Путь/имя бинарника psql")
    ap.add_argument("--supabase-bin", default=None, help="Путь/имя бинарника supabase")
    ap.add_argument("--log-level", choices=["DEBUG","INFO","WARN","ERROR"], default=None, help="Уровень логов на консоль")
    ap.add_argument("--dns-resolver", choices=["native","https"], default=None, help="DNS резолвер для Supabase CLI")
    ap.add_argument("--migrations-via", choices=["auto","pooler","direct"], default=None, help="Куда направлять миграции")
    ap.add_argument("--no-direct", action="store_true", help="Полностью отключить direct (SUPABASE_SKIP_DIRECT=1)")
    ap.add_argument("--allow-direct-fallback", action="store_true", help="Разрешить fallback на direct (по умолчанию выключен)")

    sub = ap.add_subparsers(dest="cmd")

    sub.add_parser("run", help="Выбор хоста и быстрый тест (по умолчанию)").set_defaults(func=cmd_run)
    ph = sub.add_parser("health", help="Проверка версии и времени (+TLS по --tls)")
    ph.add_argument("--tls", action="store_true")
    ph.set_defaults(func=cmd_health)
    sub.add_parser("show-env", help="Показать текущие переменные").set_defaults(func=cmd_show_env)
    sub.add_parser("migrations-list", help="Статус миграций (pooler)").set_defaults(func=cmd_mig_status)
    sub.add_parser("migrations-up", help="Применить миграции (pooler)").set_defaults(func=cmd_mig_up)
    sub.add_parser("migrations-push", help="Push миграций (pooler)").set_defaults(func=cmd_mig_push)
    # auth/link/db push
    pa = sub.add_parser("auth-login", help="Supabase CLI автологин (SUPABASE_ACCESS_TOKEN)")
    pa.add_argument("--token", help="Токен Supabase (если не задан, берётся из окружения)")
    pa.set_defaults(func=lambda a: print("OK" if ensure_login_noninteractive(a.token) else "FAIL"))

    pl = sub.add_parser("link", help="supabase link (SUPABASE_PROJECT_REF + пароль БД)")
    pl.add_argument("--project-ref", help="REF проекта Supabase (иначе SUPABASE_PROJECT_REF)")
    pl.add_argument("--password", help="Пароль БД (иначе DB_PASSWORD из конфига)")
    pl.set_defaults(func=lambda a: print("OK" if ensure_link(a.project_ref, a.password) else "FAIL"))

    sub.add_parser("db-push", help="supabase db push (авто login/link)").set_defaults(func=cmd_mig_push)
    sub.add_parser("last-logins", help="Последние логины").set_defaults(func=cmd_last_logins)
    sub.add_parser("smoke", help="Смоук-тест схем/таблиц").set_defaults(func=cmd_smoke)
    ps = sub.add_parser("sql", help="Выполнить SQL")
    ps.add_argument("--sql", help="SQL строкой")
    ps.add_argument("--file", help="Путь к .sql файлу")
    ps.set_defaults(func=cmd_sql)
    sub.add_parser("tls", help="Проверка SSL/TLS").set_defaults(func=cmd_tls)
    sub.add_parser("diag", help="Собрать диагностику").set_defaults(func=cmd_diag)

    args = ap.parse_args()

    # применяем глобальные опции
    if args.psql_bin:     CFG["PSQL_BIN"]     = args.psql_bin
    if args.supabase_bin: CFG["SUPABASE_BIN"] = args.supabase_bin
    if args.tcp_timeout:  CFG["TCP_TIMEOUT"]  = args.tcp_timeout
    if args.max_tries:    CFG["MAX_TRIES"]    = args.max_tries
    if args.dns_resolver: CFG["DNS_RESOLVER"] = args.dns_resolver
    if args.migrations_via: CFG["MIG_VIA"] = args.migrations_via
    if args.no_direct: os.environ["SUPABASE_SKIP_DIRECT"] = "1"
    CFG["ALLOW_DIRECT_FALLBACK"] = bool(args.allow_direct_fallback)
    if args.log_level:
        _console.setLevel(getattr(logging, args.log_level))

    # инструменты
    ensure_tool("psql")
    scode, _ = run_cmd(["supabase", "--version"])
    if scode != 0:
        log("warning", "supabase CLI не найден. Команды миграций работать не будут.")

    # по умолчанию = run
    if not args.cmd:
        args = ap.parse_args(["run", *(["--use-direct"] if args.use_direct else []), *(["--force-pooler"] if args.force_pooler else [])])

    try:
        args.func(args)
    except Exception as e:
        log("error", f"Фатальная ошибка: {e}")
        print(c(f"Ошибка: {e}", "31"))
        sys.exit(1)

if __name__ == "__main__":
    main()

    


