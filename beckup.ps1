# C:\Project\casino-affiliate2\beckup.ps1
$root = "C:\Project\casino-affiliate2"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$staging = Join-Path $env:TEMP "casino-affiliate2_backup_$stamp"
$zipPath = "C:\Project\casino-affiliate2_backup_$stamp.zip"

# Папки-мусор (НЕ копируем)
$excludeDirs = @(
  ".git",
  "node_modules", ".pnpm-store", ".yarn", ".cache",
  ".next", ".turbo", ".vercel", ".vite",
  "dist", "build", "out", "coverage",
  "test-results", "playwright-report", "tests", "e2e",
  "logs", "backups", "backup_before_*",
  "django", "venv", ".venv",
  "tools", "supabase_schema", "output", "reports", "generated"
)


# Файлы-мусор (НЕ копируем)
$excludeFiles = @(
  "*.log", "trace.txt", "netlify-debug*",
  "*.zip", "openai.chatgpt-*.vsix"
)

if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}

# копируем проект во временную папку, исключая мусор
$rcArgs = @($root, $staging, "/E", "/COPY:DAT", "/R:1", "/W:1", "/XD") + $excludeDirs + @("/XF") + $excludeFiles
robocopy @rcArgs | Out-Null

# создаём zip
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force

# чистим временную папку
Remove-Item -Recurse -Force $staging

Write-Host "Backup created:" $zipPath
