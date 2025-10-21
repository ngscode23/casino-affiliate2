#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="_audit"
mkdir -p "$OUT_DIR"

SKIP_DIRS=(
  "$OUT_DIR"
  ".git"
  "node_modules"
  ".pnpm-store"
  ".yarn"
  "dist"
  "build"
  ".next"
  ".turbo"
  ".vercel"
  "coverage"
  "playwright-report"
  "test-results"
  ".cache"
)

FD_EXCLUDES=()
for dir in "${SKIP_DIRS[@]}"; do
  FD_EXCLUDES+=(--exclude "$dir")
  FD_EXCLUDES+=(--exclude "$dir/*")
  FD_EXCLUDES+=(--exclude "$dir/**")
  FD_EXCLUDES+=(--exclude "*/$dir")
  FD_EXCLUDES+=(--exclude "*/$dir/*")
  FD_EXCLUDES+=(--exclude "*/$dir/**")
done

echo "[1/4] Scanning directories (depth <=3)..."
if command -v fd >/dev/null; then
  fd --type d --max-depth 3 --hidden "${FD_EXCLUDES[@]}" --regex '.' > "$OUT_DIR/_dirs.txt"
else
  echo "fd not found; skipping directory scan." > "$OUT_DIR/_dirs.txt"
fi
awk -F/ '{for(i=1;i<NF;i++)printf "  "; print "- "$NF}' "$OUT_DIR/_dirs.txt" > "$OUT_DIR/_tree.txt"

echo "[2/4] Finding top 50 largest files..."
if command -v fd >/dev/null; then
  fd --type f --hidden "${FD_EXCLUDES[@]}" --regex '.' \
    | xargs -r du -ah 2>/dev/null \
    | sort -h | tail -n 50 > "$OUT_DIR/_size_top50.txt"
else
  echo "fd not found; skipping size report." > "$OUT_DIR/_size_top50.txt"
fi

echo "[3/4] Calculating top 50 files by LOC..."
LANG_EXTS=(js jsx ts tsx py go php rs java kt dart)
EXT_ARGS=()
for ext in "${LANG_EXTS[@]}"; do
  EXT_ARGS+=(-e "$ext")
done
if command -v fd >/dev/null; then
  fd --type f --hidden "${FD_EXCLUDES[@]}" "${EXT_ARGS[@]}" \
    | xargs -r wc -l 2>/dev/null \
    | sort -nr | head -n 50 > "$OUT_DIR/_largest_files.txt"
else
  echo "fd not found; skipping LOC report." > "$OUT_DIR/_largest_files.txt"
fi

echo "[4/4] Searching for TODO/FIXME/BUG..."
if command -v rg >/dev/null; then
  RG_ARGS=(--ignore-case --hidden)
  for dir in "${SKIP_DIRS[@]}"; do
    RG_ARGS+=(--glob "!$dir/**")
  done
  rg "TODO|FIXME|BUG" "${RG_ARGS[@]}" > "$OUT_DIR/_todo_fixme.txt" || true
else
  echo "rg not found; skipping TODO/FIXME/BUG search." > "$OUT_DIR/_todo_fixme.txt"
fi

if [ -f "package.json" ]; then
  if command -v jq >/dev/null; then
    jq -r '.dependencies,.devDependencies | keys[]' package.json 2>/dev/null | sort > "$OUT_DIR/_npm_deps.txt" || \
      echo "(failed to parse package.json)" > "$OUT_DIR/_npm_deps.txt"
  else
    echo "jq not found" > "$OUT_DIR/_npm_deps.txt"
  fi
else
  echo "(package.json not found)" > "$OUT_DIR/_npm_deps.txt"
fi

echo
echo "Audit complete. Reports saved under $OUT_DIR:"
ls -1 "$OUT_DIR"
