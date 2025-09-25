param(
  [Parameter(Mandatory=$true)]
  [string]$Root
)

$ErrorActionPreference = 'Stop'

Write-Host "Scanning $Root for .ts import specifiers..."

$files = Get-ChildItem -Path $Root -Recurse -Filter *.ts
$updated = 0

foreach ($f in $files) {
  $p = $f.FullName
  $text = Get-Content -Raw -LiteralPath $p
  # Replace occurrences of .ts" and .ts'
  $text2 = $text -replace '\.ts"', '"'
  $text3 = $text2 -replace "\.ts'", "'"
  # Normalize shared package import to use tsconfig path alias
  $text4 = $text3 -replace '@casino-affiliate/shared/', '@shared/'
  if ($text4 -ne $text) {
    Set-Content -Encoding UTF8 -LiteralPath $p -Value $text4
    $updated++
    Write-Host "Updated: $p"
  }
}

Write-Host "Done. Updated $updated files."
