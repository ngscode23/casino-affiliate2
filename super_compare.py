# super_compare.py
import os, sys, argparse, hashlib
from collections import defaultdict

IGNORE_DIRS = {"node_modules",".pnpm","pnpm-store",".git",".next","dist","build",".turbo",
               "coverage","logs","log","cache",".cache","__pycache__","tmp","temp"}
IGNORE_EXTS = {".log",".map",".tmp",".bak",".lock",".ds_store"}
BUF = 1024 * 1024

def walk_files(root, only_exts):
    root = os.path.abspath(root)
    res = {}
    stack = [root]
    seen = set()
    while stack:
        d = stack.pop()
        try:
            real = os.path.realpath(d)
            if real in seen: 
                continue
            seen.add(real)
            names = os.listdir(d)
        except OSError:
            continue
        for name in names:
            p = os.path.join(d, name)
            rel = os.path.relpath(p, root).replace("\\","/")
            try:
                is_dir = os.path.isdir(p)
            except OSError:
                continue
            # игнор каталоги
            parts = [x for x in rel.split("/") if x]
            if any(part.lower() in IGNORE_DIRS for part in parts):
                continue
            if is_dir:
                # пропускаем симлинк-дир
                if os.path.islink(p):
                    continue
                stack.append(p)
            else:
                ext = os.path.splitext(rel)[1].lower()
                if ext in IGNORE_EXTS:
                    continue
                if only_exts and ext.lstrip(".") not in only_exts:
                    continue
                res[rel] = p
    return res

def sha1(path):
    h = hashlib.sha1()
    try:
        with open(path, "rb") as f:
            while True:
                chunk = f.read(BUF)
                if not chunk: break
                h.update(chunk)
    except OSError:
        return ""
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser(description="Compare two trees; write diff_report.txt into RIGHT root.")
    ap.add_argument("left")
    ap.add_argument("right")
    ap.add_argument("--loose", action="store_true", help="match moves/renames by content hash")
    ap.add_argument("--ext", default="", help="whitelist extensions: ts,tsx,js,json,css (no dots, comma-separated)")
    args = ap.parse_args()

    left = os.path.abspath(args.left)
    right = os.path.abspath(args.right)
    report_path = os.path.join(right, "diff_report.txt")

    only_exts = None
    if args.ext.strip():
        only_exts = {x.strip().lower() for x in args.ext.split(",") if x.strip()}

    print(f"Comparing:\n  LEFT : {left}\n  RIGHT: {right}\n")

    L = walk_files(left, only_exts)
    R = walk_files(right, only_exts)

    left_only  = sorted(set(L) - set(R))
    right_only = sorted(set(R) - set(L))
    common     = sorted(set(L) & set(R))

    modified = []
    for rel in common:
        try:
            sL = os.path.getsize(L[rel])
            sR = os.path.getsize(R[rel])
        except OSError:
            # если файл исчез в процессе — считаем модифицированным
            modified.append((rel, "io"))
            continue
        if sL != sR:
            modified.append((rel, "size"))
        else:
            if sha1(L[rel]) != sha1(R[rel]):
                modified.append((rel, "hash"))

    moved = []
    if args.loose and (left_only or right_only):
        # индекс по хешу для right_only
        hash_right = defaultdict(list)
        for rel in right_only:
            h = sha1(R[rel])
            if h:
                hash_right[h].append(rel)
        matchedL = set()
        matchedR = set()
        for rel in left_only:
            h = sha1(L[rel])
            if h and h in hash_right:
                # первая неприсвоенная пара
                tgt = None
                for cand in hash_right[h]:
                    if cand not in matchedR:
                        tgt = cand
                        break
                if tgt:
                    moved.append((rel, tgt))
                    matchedL.add(rel)
                    matchedR.add(tgt)
        # выкидываем перемещённые из списков removed/added
        if matchedL or matchedR:
            left_only  = [x for x in left_only  if x not in matchedL]
            right_only = [x for x in right_only if x not in matchedR]

    # запись отчёта В КОРЕНЬ RIGHT
    with open(report_path, "w", encoding="utf-8") as out:
        out.write(f"Comparing:\n  LEFT : {left}\n  RIGHT: {right}\n\n")
        out.write(f"Summary:\n")
        out.write(f"  Common:   {len(common)}\n")
        out.write(f"  Modified: {len(modified)}\n")
        out.write(f"  Added:    {len(right_only)}\n")
        out.write(f"  Removed:  {len(left_only)}\n")
        out.write(f"  Moved:    {len(moved)}\n")

        if moved:
            out.write("\n=== MOVED (content-based) ===\n")
            for a,b in moved:
                out.write(f"{a} -> {b}\n")

        if left_only:
            out.write("\n=== REMOVED (in LEFT, missing in RIGHT) ===\n")
            for rel in left_only:
                out.write(rel + "\n")

        if right_only:
            out.write("\n=== ADDED (in RIGHT, not in LEFT) ===\n")
            for rel in right_only:
                out.write(rel + "\n")

        if modified:
            out.write("\n=== MODIFIED (same path, different content) ===\n")
            for rel, why in modified:
                out.write(f"{rel} ({why})\n")

    print(f"OK: report written -> {report_path}")

if __name__ == "__main__":
    sys.exit(main())