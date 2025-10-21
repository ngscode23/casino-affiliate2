#!/usr/bin/env bash
# ultra_audit.sh — аккуратный аудит проекта.
# Bash 4+, уважает .gitignore/.rgignore/.ignore, имеет fallback без fd/rg.
# Делает: дерево, размеры, LOC, TODOs, секреты, зависимости, граф импортов, git-метрики, Markdown-дашборд.

set -Eeuo pipefail

# ----------------------------- UX: цветные логи -----------------------------
if [ -t 1 ]; then
  RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; CYA=$'\033[36m'; BLD=$'\033[1m'; RST=$'\033[0m'
else
  RED=""; GRN=""; YLW=""; CYA=""; BLD=""; RST=""
fi
log()  { echo "${BLD}${CYA}[$(date +%H:%M:%S)]${RST} $*"; }
ok()   { echo "${GRN}✔${RST} $*"; }
warn() { echo "${YLW}⚠${RST} $*"; }
err()  { echo "${RED}✖${RST} $*" 1>&2; }

# ----------------------------- конфиг/папки --------------------------------
TS=$(date +%Y%m%d_%H%M%S)
OUT_ROOT="_audit"
OUT_DIR="${OUT_ROOT}/run_${TS}"
GRAPH_DIR="${OUT_DIR}/graph"
mkdir -p "$OUT_DIR" "$GRAPH_DIR"

have() { command -v "$1" >/dev/null 2>&1; }

# Игнор-файлы (для справки и частичного fallback)
IGN_FILES=()
for f in .rgignore .gitignore .ignore; do
  [ -f "$f" ] && IGN_FILES+=("$f")
done

# Каталоги, которые точно исключаем
SKIP_DIRS=( "$OUT_ROOT" ".git" "node_modules" ".pnpm-store" ".yarn" "dist" "build" ".next" ".turbo" ".vercel" "coverage" "playwright-report" "test-results" ".cache" ".idea" ".vscode" )

# Параметры для find/grep fallback
FIND_PRUNE=()
GREP_EXCL_DIR=()
for d in "${SKIP_DIRS[@]}"; do
  FIND_PRUNE+=( -path "./$d" -prune -o )
  GREP_EXCL_DIR+=( --exclude-dir="$d" )
done

# ----------------------------- утилиты выбора -------------------------------
ls_dirs_depth() {
  local depth="$1"
  if have fd; then
    fd --type d --max-depth "$depth" --hidden --strip-cwd-prefix --follow \
       $(printf ' --exclude %q' "${SKIP_DIRS[@]}") .
  else
    # shellcheck disable=SC2016
    find . $(printf ' %s' "${FIND_PRUNE[@]}") -type d -maxdepth "$depth" -print \
      | sed 's|^\./||' | sort
  fi
}

ls_files_by_ext() {
  # usage: ls_files_by_ext js jsx ts tsx py go php rs java kt dart mjs cjs
  if have fd; then
    fd --type f --hidden --strip-cwd-prefix --follow \
       $(printf ' --exclude %q' "${SKIP_DIRS[@]}") \
       $(printf ' -e %q' "$@") .
  else
    local expr=()
    for e in "$@"; do expr+=( -name "*.${e}" -o ); done
    expr=( "${expr[@]:0:${#expr[@]}-1}" )
    # shellcheck disable=SC2016
    find . $(printf ' %s' "${FIND_PRUNE[@]}") -type f \( "${expr[@]}" \) -print | sed 's|^\./||'
  fi
}

grep_todos() {
  if have rg; then
    local g=(--ignore-case --hidden --line-number)
    for d in "${SKIP_DIRS[@]}"; do g+=( --glob "!${d}/**" ); done
    rg 'TODO|FIXME|BUG' "${g[@]}" || true
  else
    grep -RInE 'TODO|FIXME|BUG' . "${GREP_EXCL_DIR[@]}" || true
  fi
}

# ----------------------------- 1) дерево/размеры ---------------------------
log "[1/9] Дерево проекта и размеры"
ls_dirs_depth 3 > "${OUT_DIR}/dirs.txt"

{
  echo "."
  awk -F'/' '{
    indent="";
    for(i=1;i<NF;i++) indent=indent "│  ";
    print indent "├── " $NF
  }' "${OUT_DIR}/dirs.txt"
} > "${OUT_DIR}/tree.txt"
ok "Дерево: ${OUT_DIR}/tree.txt"

# Топ-50 по размеру
if have du; then
  if have fd; then
    fd --type f --hidden --strip-cwd-prefix --follow \
       $(printf ' --exclude %q' "${SKIP_DIRS[@]}") . \
       | xargs -r du -ah 2>/dev/null | sort -h | tail -n 50 > "${OUT_DIR}/size_top50.txt"
  else
    find . $(printf ' %s' "${FIND_PRUNE[@]}") -type f -print \
      | sed 's|^\./||' \
      | xargs -r du -ah 2>/dev/null | sort -h | tail -n 50 > "${OUT_DIR}/size_top50.txt"
  fi
  ok "Размеры: ${OUT_DIR}/size_top50.txt"
else
  warn "du не найден, пропускаю size_top50"
fi

# ----------------------------- 2) LOC (топ-50) -----------------------------
log "[2/9] Топ-50 по строкам кода"
LANGS=(js jsx ts tsx py go php rs java kt dart mjs cjs)
ls_files_by_ext "${LANGS[@]}" \
  | xargs -r wc -l 2>/dev/null \
  | sort -nr | head -n 50 > "${OUT_DIR}/loc_top50.txt"
ok "LOC: ${OUT_DIR}/loc_top50.txt"

# ----------------------------- 3) TODO/FIXME -------------------------------
log "[3/9] TODO/FIXME/BUG"
grep_todos > "${OUT_DIR}/todos.txt"
ok "TODOs: ${OUT_DIR}/todos.txt"

# ----------------------------- 4) Зависимости ------------------------------
log "[4/9] Зависимости проекта"
if [ -f package.json ]; then
  if have jq; then
    jq -r '.dependencies,.devDependencies | keys[]' package.json 2>/dev/null | sort > "${OUT_DIR}/npm_deps.txt" || echo "(parse error)" > "${OUT_DIR}/npm_deps.txt"
  else
    awk '/"dependencies"| "devDependencies"/,/\}/{print}' package.json | sed -n 's/ *"\([^"]\+\)".*:/\1/p' | sort > "${OUT_DIR}/npm_deps.txt" || true
  fi
  ok "NPM deps: ${OUT_DIR}/npm_deps.txt"
fi
[ -f requirements.txt ] && sed 's/#.*//' requirements.txt | sed '/^\s*$/d' > "${OUT_DIR}/py_requirements.txt" && ok "Py reqs: ${OUT_DIR}/py_requirements.txt"
[ -f pyproject.toml ] && cp pyproject.toml "${OUT_DIR}/pyproject.toml" && ok "pyproject.toml сохранен"
[ -f go.mod ] && awk '/require/{flag=1;next}/\)/{flag=0}flag' go.mod | awk '{print $1,$2}' > "${OUT_DIR}/go_requires.txt" && ok "Go deps: ${OUT_DIR}/go_requires.txt"
[ -f Cargo.toml ] && cp Cargo.toml "${OUT_DIR}/Cargo.toml" && ok "Cargo.toml сохранен"

# ----------------------------- 5) Граф импортов ----------------------------
log "[5/9] Граф импортов (JS/TS)"
if have madge; then
  madge --extensions js,jsx,ts,tsx --image "${GRAPH_DIR}/deps_madge.svg" . \
    $(printf ' --exclude %q' "${SKIP_DIRS[@]}") || true
  [ -f "${GRAPH_DIR}/deps_madge.svg" ] && ok "Граф (madge): ${GRAPH_DIR}/deps_madge.svg"
elif have depcruise; then
  depcruise --include-only '^(src|app|lib|components|pages|server)' --output-type dot . > "${GRAPH_DIR}/deps.dot" 2>/dev/null || true
  if have dot; then
    dot -Tsvg "${GRAPH_DIR}/deps.dot" -o "${GRAPH_DIR}/deps_depcruise.svg" && ok "Граф (dependency-cruiser): ${GRAPH_DIR}/deps_depcruise.svg"
  else
    warn "dot не найден, оставил DOT: ${GRAPH_DIR}/deps.dot"
  fi
else
  if have rg; then
    # ВАЖНО: двойные кавычки и PCRE2, чтобы не упасть на кавычках внутри regex
    rg --hidden --no-line-number --pcre2 \
      "^\s*(?:import\s+.*?\s+from\s+[\"']([^\"']+)[\"']|require\(\s*[\"']([^\"']+)[\"']\s*\))" \
      $(printf ' --glob "!%s/**"' "${SKIP_DIRS[@]}") \
      --type-add 'code:*.{js,jsx,ts,tsx}' --type code \
      > "${GRAPH_DIR}/_imports_raw.txt" || true

    rg --hidden --line-number --pcre2 \
      "^\s*(?:import\s+.*?\s+from\s+[\"']([^\"']+)[\"']|require\(\s*[\"']([^\"']+)[\"']\s*\))" \
      $(printf ' --glob "!%s/**"' "${SKIP_DIRS[@]}") \
      --type-add 'code:*.{js,jsx,ts,tsx}' --type code \
      > "${GRAPH_DIR}/_imports_pairs.txt" || true

    awk -F: '{
      file=$1; text=$0;
      match(text, /["'\''"]([^"'\''"]+)["'\''"]/, m);
      if (m[1] != "") print file " -> " m[1];
    }' "${GRAPH_DIR}/_imports_pairs.txt" \
    | sed 's|^\./||' | sort -u > "${GRAPH_DIR}/edges.txt"

    {
      echo "digraph G { rankdir=LR; node [shape=box,fontsize=10];"
      awk '{print "\"" $1 "\" -> \"" $3 "\";"}' "${GRAPH_DIR}/edges.txt" | sed 's/ ->  -> / -> /'
      echo "}"
    } > "${GRAPH_DIR}/deps.dot"

    if have dot; then
      dot -Tsvg "${GRAPH_DIR}/deps.dot" -o "${GRAPH_DIR}/deps.svg" && ok "Граф (rg+dot): ${GRAPH_DIR}/deps.svg"
    else
      warn "dot не найден, оставил DOT: ${GRAPH_DIR}/deps.dot"
    fi
  else
    warn "Нет rg/madge/depcruise — пропускаю граф импортов"
  fi
fi

# ----------------------------- 6) Поиск секретов ---------------------------
log "[6/9] Проверка на секреты/ключи"
SECRETS_RE='(AKIA[0-9A-Z]{16})|(^[A-Za-z0-9_-]{35,}$)|([A-Za-z0-9_]{20,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,})|(sk-[A-Za-z0-9]{20,})|(ghp_[A-Za-z0-9]{36,})'
if have rg; then
  rg -n --hidden --pcre2 "${SECRETS_RE}" \
    $(printf ' --glob "!%s/**"' "${SKIP_DIRS[@]}") \
    --glob '!*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,pdf}' \
    > "${OUT_DIR}/secrets_candidates.txt" || true
else
  grep -RInE "${SECRETS_RE}" . "${GREP_EXCL_DIR[@]}" \
    --exclude='*.png' --exclude='*.jpg' --exclude='*.jpeg' --exclude='*.gif' --exclude='*.svg' \
    --exclude='*.ico' --exclude='*.woff' --exclude='*.woff2' --exclude='*.ttf' --exclude='*.pdf' \
    > "${OUT_DIR}/secrets_candidates.txt" || true
fi
ok "Секреты-кандидаты: ${OUT_DIR}/secrets_candidates.txt"

# ----------------------------- 7) Git-метрики ------------------------------
log "[7/9] Git-метрики"
if have git && [ -d .git ]; then
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || true
  git ls-files > "${OUT_DIR}/git_tracked.txt" || true
  git log --pretty=format:'%h|%an|%ad|%s' --date=short -n 200 > "${OUT_DIR}/git_log_last200.txt" || true
  git shortlog -sn > "${OUT_DIR}/git_authors.txt" || true
  ok "Git: добавлены tracked, last200, authors"
else
  warn "Git недоступен или не репозиторий"
fi

# ----------------------------- 8) Конфиги ----------------------------------
log "[8/9] Конфиги экосистемы"
CONF_DIR="${OUT_DIR}/configs"
mkdir -p "$CONF_DIR"
for f in package.json pnpm-lock.yaml yarn.lock bun.lockb tsconfig.json eslintrc.* .eslintrc* .prettierrc* vite.config.* next.config.* astro.config.* remix.config.*; do
  for p in $f; do
    [ -f "$p" ] && cp -n "$p" "$CONF_DIR/$(basename "$p")" || true
  done
done
ok "Собраны ключевые конфиги в ${CONF_DIR}"

# ----------------------------- 9) Markdown-дашборд -------------------------
log "[9/9] Markdown-дашборд"
SUMMARY="${OUT_DIR}/README.md"
{
  echo "# Project Audit — ${TS}"
  echo
  echo "Папка: \`${OUT_DIR}\`"
  echo
  echo "## Сводка"
  echo "- Дерево: [tree.txt](./$(basename "$OUT_DIR")/tree.txt)"
  [ -f "${OUT_DIR}/size_top50.txt" ] && echo "- Тяжёлые файлы: [size_top50.txt](./$(basename "$OUT_DIR")/size_top50.txt)"
  echo "- Топ по LOC: [loc_top50.txt](./$(basename "$OUT_DIR")/loc_top50.txt)"
  echo "- TODO/FIXME: [todos.txt](./$(basename "$OUT_DIR")/todos.txt)"
  [ -f "${OUT_DIR}/npm_deps.txt" ] && echo "- NPM deps: [npm_deps.txt](./$(basename "$OUT_DIR")/npm_deps.txt)"
  [ -f "${OUT_DIR}/py_requirements.txt" ] && echo "- Python reqs: [py_requirements.txt](./$(basename "$OUT_DIR")/py_requirements.txt)"
  [ -f "${OUT_DIR}/go_requires.txt" ] && echo "- Go requires: [go_requires.txt](./$(basename "$OUT_DIR")/go_requires.txt)"
  echo "- Секреты (кандидаты): [secrets_candidates.txt](./$(basename "$OUT_DIR")/secrets_candidates.txt)"
  if [ -d "${GRAPH_DIR}" ]; then
    if   [ -f "${GRAPH_DIR}/deps_madge.svg" ]; then echo "- Граф импортов: [deps_madge.svg](./$(basename "$OUT_DIR")/graph/deps_madge.svg)"
    elif [ -f "${GRAPH_DIR}/deps_depcruise.svg" ]; then echo "- Граф импортов: [deps_depcruise.svg](./$(basename "$OUT_DIR")/graph/deps_depcruise.svg)"
    elif [ -f "${GRAPH_DIR}/deps.svg" ]; then echo "- Граф импортов: [deps.svg](./$(basename "$OUT_DIR")/graph/deps.svg)"
    elif [ -f "${GRAPH_DIR}/deps.dot" ]; then echo "- Граф импортов (DOT): [deps.dot](./$(basename "$OUT_DIR")/graph/deps.dot)"; fi
  fi
  if [ -d ".git" ] && have git; then
    echo "- Git tracked: [git_tracked.txt](./$(basename "$OUT_DIR")/git_tracked.txt)"
    echo "- Git last 200: [git_log_last200.txt](./$(basename "$OUT_DIR")/git_log_last200.txt)"
    echo "- Авторы: [git_authors.txt](./$(basename "$OUT_DIR")/git_authors.txt)"
  fi
  echo
  echo "## Замечания и быстрые действия"
  echo "1) Посмотри **loc_top50.txt**: распили файлы-монолиты."
  echo "2) Проверь **secrets_candidates.txt**: убери настоящие ключи из репо."
  echo "3) Открой граф импортов: найди циклы и перегруженные узлы."
  echo "4) Разметь **todos.txt** и создай задачи."
  echo "5) Веди ADR в docs/adr/*.md по ключевым решениям."
} > "$SUMMARY"
ok "Дашборд: ${SUMMARY}"

echo
ok "Готово. Открой ${OUT_DIR}/README.md."