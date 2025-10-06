param(
  [Parameter(Mandatory=$true)] [string]$LeftPath,
  [Parameter(Mandatory=$true)] [string]$RightPath,
  [switch]$Loose,     # включить «умный» режим: сопоставление по хэшу (поймает переносы)
  [string]$Extensions = ""  # через запятую: только эти расширения (например: "ts,tsx,js,json,css")
)

$ErrorActionPreference = "Stop"

# Игноры
$IgnoreDirs = @("node_modules",".pnpm","pnpm-store",".git",".next","dist","build",".turbo","coverage","logs","log","cache",".cache","__pycache__","tmp","temp")
$IgnoreExtsHard = @(".log",".map",".tmp",".bak",".lock",".DS_Store")

function Test-IgnoredPath([string]$rel) {
  foreach ($d in $IgnoreDirs) { if ($rel -match "(^|[\\/])$([regex]::Escape($d))([\\/]|$)") { return $true } }
  foreach ($e in $IgnoreExtsHard) { if ($rel.ToLower().EndsWith($e)) { return $true } }
  return $false
}

function Should-KeepExt([string]$rel,[string[]]$onlyExts) {
  if ($onlyExts.Count -eq 0) { return $true }
  $ext = [IO.Path]::GetExtension($rel).TrimStart('.').ToLower()
  return $onlyExts -contains $ext
}

# Безопасный обход, не входим в игнорируемые каталоги и симлинки
function Get-FilesSafe([string]$root,[string[]]$onlyExts) {
  $root = (Resolve-Path $root).Path
  $stack = New-Object System.Collections.Stack
  $stack.Push($root)
  while ($stack.Count -gt 0) {
    $dir = $stack.Pop()
    try { $entries = Get-ChildItem -LiteralPath $dir -Force } catch { continue }
    foreach ($e in $entries) {
      $rel = $e.FullName.Substring($root.Length).TrimStart('\','/') -replace '\\','/'
      if ($e.PSIsContainer) {
        if (-not (Test-IgnoredPath $rel)) {
          if (($e.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
          $stack.Push($e.FullName)
        }
      } else {
        if (Test-IgnoredPath $rel) { continue }
        if (-not (Should-KeepExt $rel $onlyExts)) { continue }
        [PSCustomObject]@{ Rel=$rel; Full=$e.FullName; Size=$e.Length }
      }
    }
  }
}

# Парсим whitelist расширений
$only = @()
if ($Extensions -and $Extensions.Trim().Length -gt 0) {
  $only = $Extensions.Split(",") | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ }
}

Write-Host "Comparing:"
Write-Host "  LEFT : $LeftPath"
Write-Host "  RIGHT: $RightPath"
if ($only.Count -gt 0) { Write-Host ("  Only extensions: {0}" -f ($only -join ",")) }
if ($Loose) { Write-Host "  Mode: LOOSE (hash-based move detection)" }

$left  = Get-FilesSafe $LeftPath  $only
$right = Get-FilesSafe $RightPath $only

# Индексы по путям
$L = @{}; foreach ($f in $left)  { $L[$f.Rel] = $f }
$R = @{}; foreach ($f in $right) { $R[$f.Rel] = $f }

$leftOnly  = $L.Keys  | Where-Object { -not $R.ContainsKey($_) } | Sort-Object
$rightOnly = $R.Keys  | Where-Object { -not $L.ContainsKey($_) } | Sort-Object
$common    = $L.Keys  | Where-Object {  $R.ContainsKey($_) }     | Sort-Object

# Изменённые по содержимому (в одинаковых путях)
$modified = New-Object System.Collections.Generic.List[object]
foreach ($rel in $common) {
  $a = $L[$rel]; $b = $R[$rel]
  if ($a.Size -ne $b.Size) {
    $modified.Add([PSCustomObject]@{ Path=$rel; Reason="size"; LSize=$a.Size; RSize=$b.Size })
  } else {
    $ha = (Get-FileHash -Algorithm SHA1 -LiteralPath $a.Full).Hash
    $hb = (Get-FileHash -Algorithm SHA1 -LiteralPath $b.Full).Hash
    if ($ha -ne $hb) {
      $modified.Add([PSCustomObject]@{ Path=$rel; Reason="hash"; LSize=$a.Size; RSize=$b.Size })
    }
  }
}

Write-Host ""
Write-Host ("Summary:")
Write-Host ("  Common (same path): {0}" -f $common.Count)
Write-Host ("  Modified (same path): {0}" -f $modified.Count)
Write-Host ("  Added (RIGHT only): {0}" -f $rightOnly.Count)
Write-Host ("  Removed (LEFT only): {0}" -f $leftOnly.Count)

# Если надо поймать переносы — строим индекс по хэшу и ищем пары "removed -> added" с одинаковым контентом
if ($Loose -and ($leftOnly.Count -gt 0 -or $rightOnly.Count -gt 0)) {
  Write-Host "`nMove/Rename detection (content-based):"
  # Хэши для left-only и right-only
  $LH = @{}
  foreach ($rel in $leftOnly)  {
    $h = (Get-FileHash -Algorithm SHA1 -LiteralPath $L[$rel].Full).Hash
    $LH[$rel] = $h
  }
  $RH = @{}
  foreach ($rel in $rightOnly) {
    $h = (Get-FileHash -Algorithm SHA1 -LiteralPath $R[$rel].Full).Hash
    if (-not $RH.ContainsKey($h)) { $RH[$h] = New-Object System.Collections.Generic.List[string] }
    $RH[$h].Add($rel)
  }

  $moved = New-Object System.Collections.Generic.List[object]
  foreach ($rel in $leftOnly) {
    $h = $LH[$rel]
    if ($RH.ContainsKey($h)) {
      foreach ($newRel in $RH[$h]) {
        $moved.Add([PSCustomObject]@{ From=$rel; To=$newRel; Hash=$h })
      }
    }
  }

  if ($moved.Count -gt 0) {
    Write-Host "  Detected moves/renames:"
    $moved | ForEach-Object { Write-Host ("    {0}  ->  {1}" -f $_.From, $_.To) }
    # Убираем перемещённые из Removed/Added, чтобы не пугали
    $leftOnly  = $leftOnly  | Where-Object { $moved.From -notcontains $_ }
    $rightOnly = $rightOnly | Where-Object { $moved.To   -notcontains $_ }
  } else {
    Write-Host "  No moves detected."
  }
}

# Деталка
if ($leftOnly.Count -gt 0)  { Write-Host "`nRemoved (present in LEFT, missing in RIGHT):";  $leftOnly  | ForEach-Object { Write-Host "  $_" } }
if ($rightOnly.Count -gt 0) { Write-Host "`nAdded (present in RIGHT, not in LEFT):";        $rightOnly | ForEach-Object { Write-Host "  $_" } }
if ($modified.Count -gt 0)  { Write-Host "`nModified (same path, different content):";      $modified  | ForEach-Object { Write-Host ("  {0}  ({1})" -f $_.Path,$_.Reason) } }
