# ===== Настраиваемые параметры =====
# Какие расширения считаем "кодом"
$codeExt = @('*.ts','*.tsx','*.js','*.jsx','*.css','*.scss')    # если нужно: добавь '*.md','*.sql'

# Разрешённые корневые пути проекта (если папки нет — пропускаем)
$allowRoots = @(
  'apps/web-next', 'packages', 'supabase', 'scripts',
  'apps/web', 'apps/functions'
) | ForEach-Object { Join-Path -Path (Get-Location) -ChildPath $_ } | Where-Object { Test-Path $_ }

# Если разрешённые пути не найдены — работаем из корня репо
if ($allowRoots.Count -eq 0) { $allowRoots = @((Get-Location).Path) }

# Регексы исключений по директориям
$dirEx = '\\(node_modules|\.pnpm-store|\.yarn|\.cache|\.git|\.turbo|\.vercel|dist|build|out|coverage|playwright-report|test-results|logs|backups|backup_before_[^\\]+|\.idea|\.vscode)(\\|$)'

# Исключаемые файлы по расширению/имени
$fileEx = '\.(log|zip|7z|rar|tar|tgz|gz|mp4|mov|mkv|webm|mp3|wav|flac)$'
# .env, кроме *.env.example
$envEx  = '\.env(\..*)?$'

# ===== Сбор кандидатов =====
$files = @()
$dirs  = @()

foreach ($root in $allowRoots) {
  # Папки с исключениями
  $dirs += Get-ChildItem $root -Recurse -Directory -Force | Where-Object {
    $_.FullName -notmatch $dirEx
  }

  # Файлы кода с исключениями
  foreach ($pattern in $codeExt) {
    $files += Get-ChildItem $root -Recurse -File -Force -Include $pattern | Where-Object {
      $_.FullName -notmatch $dirEx -and
      $_.FullName -notmatch $fileEx -and
      (
        # выкидываем .env*, НО оставляем *.env.example
        ($_.Name -notmatch $envEx) -or ($_.Name -match '\.env\.example$')
      )
    }
  }
}

$files = $files | Select-Object -Unique
$dirs  = $dirs  | Select-Object -Unique

# ===== Подсчёт строк (быстро, без чтения в память) =====
$lineSum = 0
foreach ($f in $files) {
  $r = [System.IO.File]::OpenText($f.FullName)
  while ($null -ne $r.ReadLine()) { $lineSum++ }
  $r.Close()
}

# ===== Вывод =====
"Файлы кода: {0}" -f $files.Count
"Папки:      {0}" -f $dirs.Count
"Строк кода: {0}" -f $lineSum