#!/usr/bin/env python3
"""
Compare working tree files vs a git ref (commit/tag), ignoring junk.
Usage:
  python compare_clean.py [REF]
Example:
  python compare_clean.py                  # compares against 'stable-2025-10-05'
  python compare_clean.py main             # compares against 'main'
  python compare_clean.py abc1234          # compares against commit sha
"""

import subprocess as sp
import sys
import re
from pathlib import Path

DEFAULT_REF = "stable-2025-10-05"

# Directories and extensions to ignore even if .gitignore is sloppy
IGNORE_DIRS = (
    ".git", "node_modules", ".pnpm", "pnpm-store", ".next",
    "dist", "build", ".turbo", "coverage", "logs", "log", "cache", ".cache",
)
IGNORE_EXTS = (".log", ".map", ".tmp", ".bak", ".lock")

# Compile a single regex to skip junk anywhere in the path
_dir_pat = "|".join(re.escape(d) for d in IGNORE_DIRS)
_ext_pat = "|".join(re.escape(e) for e in IGNORE_EXTS)
JUNK_RE = re.compile(
    rf"(?:^|[\\/])(?:{_dir_pat})(?:[\\/]|$)|(?:{_ext_pat})$",
    re.IGNORECASE,
)

def run_git(args: list[str]) -> list[str]:
    try:
        out = sp.check_output(["git", *args], stderr=sp.STDOUT)
    except sp.CalledProcessError as e:
        sys.stderr.write(e.output.decode("utf-8", errors="replace"))
        sys.exit(e.returncode or 1)
    return out.decode("utf-8", errors="replace").splitlines()

def clean_filter(paths: list[str]) -> list[str]:
    # Normalize to forward slashes and drop junk
    out = []
    for p in paths:
        p = p.strip()
        if not p:
            continue
        p = p.replace("\\", "/")
        if JUNK_RE.search(p):
            continue
        out.append(p)
    return sorted(set(out))

def main() -> None:
    ref = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_REF

    # 1) Files from the ref (tracked only)
    commit_files = run_git(["ls-tree", "-r", "--name-only", ref])
    commit_files = clean_filter(commit_files)

    # 2) Files in working tree = tracked + untracked (not ignored by .gitignore)
    tracked = run_git(["ls-files"])
    untracked = run_git(["ls-files", "--others", "--exclude-standard"])
    working_files = clean_filter(tracked + untracked)

    commit_set = set(commit_files)
    working_set = set(working_files)

    missing_now = sorted(commit_set - working_set)  # were in ref, gone now
    new_now     = sorted(working_set - commit_set)  # new now, absent in ref

    print(f"Ref: {ref}")
    print()

    print("Files missing now (existed in ref):")
    if missing_now:
        for p in missing_now:
            print(p)
    else:
        print("(none)")
    print()

    print("New files now (not in ref):")
    if new_now:
        for p in new_now:
            print(p)
    else:
        print("(none)")

if __name__ == "__main__":
    # quick sanity: ensure we're inside a git repo
    try:
        sp.check_call(["git", "rev-parse", "--is-inside-work-tree"],
                      stdout=sp.DEVNULL, stderr=sp.DEVNULL)
    except sp.CalledProcessError:
        sys.stderr.write("Not a git repository (or any of the parent directories).\n")
        sys.exit(1)
    main()