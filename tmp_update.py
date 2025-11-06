from pathlib import Path
import subprocess
original = subprocess.check_output(['git','show','HEAD:README.md'], encoding='utf-8')
needle = '| --- | --- | --- |\n'
insert = '| --- | --- | --- |\n| pnpm bootstrap | Run the guided installer (checks Node/pnpm, installs deps, copies env templates, builds web-next). | Запускает автоматическую установку: проверяет Node/pnpm, ставит зависимости, копирует env-шаблоны и собирает web-next. |\n'
if insert not in original:
    updated = original.replace(needle, insert, 1)
    Path('README.md').write_text(updated, encoding='utf-8')
else:
    Path('README.md').write_text(original, encoding='utf-8')
