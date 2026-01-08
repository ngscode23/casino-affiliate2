# find-codex-auth.ps1
# Search Codex local auth/cache files on Windows (no secrets printed).
# Run:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\find-codex-auth.ps1

$ErrorActionPreference = "SilentlyContinue"

function Show-FileInfo([string]$path) {
  $item = Get-Item -LiteralPath $path
  [PSCustomObject]@{
    Path      = $item.FullName
    SizeKB    = [math]::Round($item.Length / 1KB, 1)
    LastWrite = $item.LastWriteTime
  }
}

Write-Host "== Codex auth/cache finder (Windows) =="

$userHome = $env:USERPROFILE
$searchRoots = @($env:USERPROFILE, $env:APPDATA, $env:LOCALAPPDATA) |
  Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

# Fast candidates (quick checks)
$fastCandidates = @(
  Join-Path $userHome ".codex\auth.json",
  Join-Path $userHome ".codex\config.toml",
  Join-Path $env:APPDATA "codex\auth.json",
  Join-Path $env:LOCALAPPDATA "codex\auth.json",
  Join-Path $env:APPDATA ".codex\auth.json",
  Join-Path $env:LOCALAPPDATA ".codex\auth.json"
)

$foundFast = @()
foreach ($c in $fastCandidates) {
  if (Test-Path -LiteralPath $c) { $foundFast += $c }
}

if ($foundFast.Count -gt 0) {
  Write-Host "`n[FAST] Found:" -ForegroundColor Green
  $foundFast | Sort-Object -Unique | ForEach-Object {
    if ($_ -like "*.json") { Show-FileInfo $_ } else { Get-Item $_ | Select-Object FullName, LastWriteTime }
  } | Format-Table -AutoSize
} else {
  Write-Host "`n[FAST] Nothing found in common locations." -ForegroundColor Yellow
}

# Scan for .codex\auth.json and .codex\config.toml under likely roots
Write-Host "`n[SCAN] Searching under USERPROFILE / APPDATA / LOCALAPPDATA ..." -ForegroundColor Cyan

$foundPaths = @()

foreach ($root in $searchRoots) {
  # Look for ".codex" directories
  $codexDirs = Get-ChildItem -Path $root -Directory -Force -Recurse |
    Where-Object { $_.Name -eq ".codex" }

  foreach ($d in $codexDirs) {
    $auth = Join-Path $d.FullName "auth.json"
    $cfg  = Join-Path $d.FullName "config.toml"
    if (Test-Path -LiteralPath $auth) { $foundPaths += $auth }
    if (Test-Path -LiteralPath $cfg)  { $foundPaths += $cfg }
  }

  # Also look for auth.json that ends with \.codex\auth.json
  $auths = Get-ChildItem -Path $root -File -Force -Recurse -Filter "auth.json" |
    Where-Object { $_.FullName -match "\\\.codex\\auth\.json$" }

  foreach ($a in $auths) { $foundPaths += $a.FullName }
}

$foundPaths = $foundPaths | Sort-Object -Unique

if ($foundPaths.Count -gt 0) {
  Write-Host "`n[SCAN] Matches:" -ForegroundColor Green
  $foundPaths | ForEach-Object {
    if ($_ -like "*.json") { Show-FileInfo $_ } else { Get-Item $_ | Select-Object FullName, LastWriteTime }
  } | Format-Table -AutoSize

  Write-Host "`nNOTE: Do NOT paste auth.json content anywhere (tokens inside)." -ForegroundColor DarkYellow
} else {
  Write-Host "`n[SCAN] No files found. Credentials may be stored in Windows Credential Manager (keyring)." -ForegroundColor Yellow
}

# Check Windows Credential Manager list (safe: no secrets shown)
Write-Host "`n[CREDMAN] Listing saved credentials that look like 'codex' or 'openai'..." -ForegroundColor Cyan
$credList = (cmdkey /list 2>$null)
if ($credList) {
  $credHits = $credList | Select-String -Pattern "(?i)codex|openai"
  if ($credHits) {
    Write-Host "[CREDMAN] Hits:" -ForegroundColor Green
    $credHits | ForEach-Object { $_.Line } | Select-Object -Unique
  } else {
    Write-Host "[CREDMAN] No obvious entries matched." -ForegroundColor Yellow
  }
} else {
  Write-Host "[CREDMAN] cmdkey returned nothing (unexpected)." -ForegroundColor Yellow
}
