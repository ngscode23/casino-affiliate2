param(
  [Parameter(Mandatory=$true)] [string]$LeftPath,
  [Parameter(Mandatory=$true)] [string]$RightPath,
  [string]$ReportCsv = ""
)

$ErrorActionPreference = "Stop"

$IgnoreDirs = @("node_modules",".pnpm","pnpm-store",".git",".next","dist","build",".turbo","coverage","logs","log","cache",".cache")
$IgnoreExts = @(".log",".map",".tmp",".bak",".lock")

function Test-Ignored([string]$relPath) {
  foreach ($d in $IgnoreDirs) {
    if ($relPath -match "(^|[\\/])$([regex]::Escape($d))([\\/]|$)") { return $true }
  }
  if ($relPath -match "\.(log|map|tmp|bak|lock)$") { return $true }
  return $false
}

# ЗАМИНАЕТ старую Get-FileList — используем безопасный обход без захода в мусор
function Get-FileList([string]$root) {
  $rootResolved = (Resolve-Path $root).Path
  $stack = New-Object System.Collections.Stack
  $stack.Push($rootResolved)

  while ($stack.Count -gt 0) {
    $dir = $stack.Pop()
    try {
      # читаем содержимое каталога; !ReparsePoint — не входим в симлинки
      $entries = Get-ChildItem -LiteralPath $dir -Force -ErrorAction Stop
    } catch {
      # каталог успели удалить/переименовать — пропускаем
      continue
    }

    foreach ($e in $entries) {
      # относительный путь
      $rel = $e.FullName.Substring($rootResolved.Length).TrimStart('\','/')
      $rel = $rel -replace '\\','/'

      if ($e.PSIsContainer) {
        # если это каталог и он не игнорируемый — спускаемся; если игнор — не входим
        if (-not (Test-Ignored $rel)) {
          # пропускаем симлинки на каталоги
          if (($e.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
          $stack.Push($e.FullName)
        }
      } else {
        # файл: если не игнор — отдаём
        if (-not (Test-Ignored $rel)) {
          [PSCustomObject]@{
            Rel  = $rel
            Full = $e.FullName
            Size = $e.Length
          }
        }
      }
    }
  }
}

Write-Host "Comparing:"
Write-Host "  LEFT : $LeftPath"
Write-Host "  RIGHT: $RightPath"
Write-Host ""

$left  = Get-FileList $LeftPath
$right = Get-FileList $RightPath

$leftIdx  = @{}; foreach ($f in $left)  { $leftIdx[$f.Rel]  = $f }
$rightIdx = @{}; foreach ($f in $right) { $rightIdx[$f.Rel] = $f }

$onlyLeft  = $leftIdx.Keys  | Where-Object { -not $rightIdx.ContainsKey($_) } | Sort-Object
$onlyRight = $rightIdx.Keys | Where-Object { -not $leftIdx.ContainsKey($_) }  | Sort-Object
$common    = $leftIdx.Keys  | Where-Object { $rightIdx.ContainsKey($_) }      | Sort-Object

$modified = New-Object System.Collections.Generic.List[object]
foreach ($rel in $common) {
  $L = $leftIdx[$rel]; $R = $rightIdx[$rel]
  if ($L.Size -ne $R.Size) {
    $modified.Add([PSCustomObject]@{ Path=$rel; Reason="size"; LeftSize=$L.Size; RightSize=$R.Size })
  } else {
    $lh = (Get-FileHash -Algorithm SHA1 -LiteralPath $L.Full).Hash
    $rh = (Get-FileHash -Algorithm SHA1 -LiteralPath $R.Full).Hash
    if ($lh -ne $rh) { $modified.Add([PSCustomObject]@{ Path=$rel; Reason="hash"; LeftSize=$L.Size; RightSize=$R.Size }) }
  }
}

Write-Host "Summary:"
Write-Host ("  Common:    {0}" -f $common.Count)
Write-Host ("  Modified:  {0}" -f $modified.Count)
Write-Host ("  Added:     {0}" -f $onlyRight.Count)
Write-Host ("  Removed:   {0}" -f $onlyLeft.Count)
Write-Host ""

if ($onlyLeft.Count)  { Write-Host "Removed (present in LEFT, missing in RIGHT):";  $onlyLeft  | ForEach-Object { Write-Host "  $_" }; Write-Host "" }
if ($onlyRight.Count) { Write-Host "Added (present in RIGHT, not in LEFT):";       $onlyRight | ForEach-Object { Write-Host "  $_" }; Write-Host "" }
if ($modified.Count)  { Write-Host "Modified (size/hash differs):";                 $modified  | ForEach-Object { Write-Host ("  {0} ({1})" -f $_.Path,$_.Reason) } }

if ($ReportCsv -and $ReportCsv.Trim().Length -gt 0) {
  $rows = @()
  $onlyLeft  | ForEach-Object { $rows += [PSCustomObject]@{ Path=$_; Status="removed" } }
  $onlyRight | ForEach-Object { $rows += [PSCustomObject]@{ Path=$_; Status="added" } }
  $modified  | ForEach-Object { $rows += [PSCustomObject]@{ Path=$_.Path; Status="modified" } }
  $rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $ReportCsv
  Write-Host ("Report written: {0}" -f $ReportCsv)
}
