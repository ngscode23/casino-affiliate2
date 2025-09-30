<#
  Count source files and non-empty lines, respecting ignore files.
  - Respects: .rgignore, .gitignore, .ignore (ripgrep defaults)
  - Filters by extensions to avoid binaries
  - Excludes common test/fixture paths via ripgrep -g negated globs
#>

param(
  # Optional working directory; defaults to current
  [string]$Root = '.'
)

$ErrorActionPreference = 'Stop'

# Ensure ripgrep is available
if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
  Write-Error 'ripgrep (rg) не найден. Установите rg и добавьте в PATH.'
  exit 1
}

# File extensions to include
$exts = @('ts','tsx','js','jsx','css','scss','json','md','mdx')

# Extra excludes (as ripgrep -g negated globs). These complement .rgignore/.gitignore
$negatedGlobs = @(
  '!**/*.test.*',
  '!**/*.spec.*',
  '!**/__mocks__/**',
  '!**/__fixtures__/**',
  '!**/__snapshots__/**',
  '!**/*.d.ts',
  '!**/*.map',
  '!**/.env', '!**/.env.*', '**/.env.example'
)

# Build rg arguments — DO NOT add -u / -uu to keep respecting ignore files
$rgArgs = @('--files', '--hidden')  # include dotfiles then let ignores filter
foreach ($e in $exts) { $rgArgs += @('-g', "*.$e") }
foreach ($g in $negatedGlobs) { $rgArgs += @('-g', $g) }

Push-Location $Root
try {
  $files = & rg @rgArgs 2>$null
} finally {
  Pop-Location
}

if (-not $files -or $files.Count -eq 0) {
  'Files counted: 0'
  'Directories visited: 0'
  'Clean lines: 0'
  exit 0
}

# Unique directories
$dirs = $files | ForEach-Object { Split-Path $_ -Parent } | Sort-Object -Unique

# Count non-empty lines
$clean = 0
foreach ($f in $files) {
  try {
    $full = [System.IO.Path]::GetFullPath($f)
    foreach ($line in [System.IO.File]::ReadLines($full)) {
      if ($line.Trim().Length -gt 0) { $clean++ }
    }
  } catch {
    Write-Warning ("Skipped {0}: {1}" -f $f, $_.Exception.Message)
  }
}

"Files counted: {0}" -f $files.Count
"Directories visited: {0}" -f $dirs.Count
"Clean lines: {0}" -f $clean
