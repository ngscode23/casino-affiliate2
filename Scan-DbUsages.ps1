<# 
Scan-DbUsages.ps1
Сканирует исходники Next.js/Node и считает упоминания таблиц БД.
— Без опасных регексов для путей: игнорит каталоги по сегментам.
— Понимает supabase.from('table'), knex('table'), SQL FROM/JOIN/INSERT/UPDATE и т.д.
— Может сохранить CSV и (по желанию) показать строки контекста.

Пример:
  .\Scan-DbUsages.ps1 -Root . -EmitCsv
  .\Scan-DbUsages.ps1 -Root . -Context 2 -Patterns @('orders','orders_archive','ecom_products','products')
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  # Таблицы, которые ищем (стартовый набор под твой проект, правь под себя)
  [string[]]$Patterns = @(
    'ecom_products','products','products_v',
    'product_reviews_raw','product_reviews','reviews',
    'ecom_product_image_versions','ecom_product_images_latest',
    'orders','order_items','order_items_v','order_status_history','order_history_v',
    'orders_archive','orders_archive_export',
    'impressions','shop_impressions','product_impressions','product_impressions_30d',
    'webhook_logs','webhook_logs_app',
    'stripe_webhooks','stripe_webhooks_failed','stripe_webhooks_with_mode'
  ),

  # Какие файлы сканировать
  [string[]]$Extensions = @('ts','tsx','js','jsx','mjs','cjs','sql'),

  # Что игнорировать (по сегментам пути, регексы не нужны)
  [string[]]$IgnoreDirs = @(
    'node_modules','.next','.turbo','.git','.vercel',
    'dist','build','out','coverage','.cache','.husky','vendor',
    '.venv','venv'
  ),

  # Сколько строк контекста вокруг совпадения показать (0 = без контекста)
  [int]$Context = 0,

  # Сохранить summary.csv и details.csv в _db-usage-report
  [switch]$EmitCsv
)

function Test-IgnoredPath {
  param([string]$Path,[string[]]$Ignore)
  if (-not $Ignore -or $Ignore.Count -eq 0) { return $false }
  $segs = ($Path -replace '/', '\') -split '\\'
  foreach ($seg in $segs) {
    foreach ($ign in $Ignore) {
      if ($seg.Trim() -ieq $ign.Trim()) { return $true }
    }
  }
  return $false
}

# Быстрый набор расширений
$extSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($e in $Extensions) {
  $extSet.Add(($e -replace '^\*?\.', ''))
}

Write-Host "Сканирую файлы..." -ForegroundColor Cyan
$allFiles = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  -not (Test-IgnoredPath -Path $_.FullName -Ignore $IgnoreDirs) -and
  ($extSet.Contains($_.Extension.TrimStart('.')))
}

if (-not $allFiles -or $allFiles.Count -eq 0) {
  Write-Error "Файлов не найдено. Проверь -Root и список Extensions."
  exit 1
}

function New-TableRegexSet {
  param([string]$Name)
  $q = [Regex]::Escape($Name)
  @(
    "\b$q\b",                                        # products
    "\bpublic\.$q\b",                                # public.products
    "(?i)(?:from|join|into|update)\s+[`'\""]?$q[`'\""]?",               # SQL без схемы
    "(?i)(?:from|join)\s+[`'\""]?public\.?$q[`'\""]?",                  # SQL со схемой
    "(?i)knex\s*\(\s*[`'\""]$q[`'\""]\s*\)",                            # knex('products')
    "(?i)\.from\s*\(\s*[`'\""]$q[`'\""]\s*\)",                          # supabase.from('products')
    "(?i)Entity\s*\(\s*[`'\""]$q[`'\""]\s*\)",                          # TypeORM @Entity('products')
    "(?i)Table\s*[:=]\s*[`'\""]$q[`'\""]"                               # ORM конфиги
  )
}

$summary  = New-Object System.Collections.Generic.List[object]
$details  = New-Object System.Collections.Generic.List[object]

foreach ($tbl in ($Patterns | Sort-Object -Unique)) {
  $regexes   = New-TableRegexSet -Name $tbl
  $totalHits = 0
  $filesHit  = 0

  # Чтобы не дёргать Select-String по одному файлу, даём список сразу
  $hitList = @()
  try {
    if ($Context -gt 0) {
      $hitList = Select-String -Path $allFiles.FullName -Pattern $regexes -AllMatches -CaseSensitive:$false -Encoding UTF8 -Context $Context -ErrorAction SilentlyContinue
    } else {
      $hitList = Select-String -Path $allFiles.FullName -Pattern $regexes -AllMatches -CaseSensitive:$false -Encoding UTF8 -ErrorAction SilentlyContinue
    }
  } catch { }

  if ($hitList) {
    # сгруппируем по файлам
    $byFile = $hitList | Group-Object -Property Path
    foreach ($grp in $byFile) {
      $filesHit += 1
      $count = ($grp.Group | ForEach-Object { $_.Matches.Count } | Measure-Object -Sum).Sum
      $totalHits += $count

      if ($Context -gt 0) {
        foreach ($m in $grp.Group) {
          $snippet = $m.Line
          if ($null -ne $m.Context) {
            $pre  = ($m.Context.PreContext  -join "`n")
            $post = ($m.Context.PostContext -join "`n")
            $snippet = @($pre, $m.Line, $post) -join "`n"
          }
          $details.Add([pscustomobject]@{
            Table   = $tbl
            File    = $m.Path
            Line    = $m.LineNumber
            Snippet = $snippet
          })
        }
      } else {
        # без контекста достаточно уникального списка файлов
        $details.Add([pscustomobject]@{
          Table   = $tbl
          File    = $grp.Name
          Line    = $null
          Snippet = $null
        })
      }
    }
  }

  $summary.Add([pscustomobject]@{
    Table        = $tbl
    Files        = $filesHit
    TotalMatches = $totalHits
  })
}

$summarySorted = $summary | Sort-Object -Property @{Expression='TotalMatches';Descending=$true}, @{Expression='Files';Descending=$true}, Table
Write-Host "`n=== Таблицы по убыванию использования ===" -ForegroundColor Green
$summarySorted | Format-Table -AutoSize

if ($Context -gt 0) {
  Write-Host "`n=== Совпадения с контекстом ($Context строк) ===" -ForegroundColor Green
  $details | Sort-Object Table, File, Line | Format-Table -AutoSize
}

if ($EmitCsv) {
  $outDir = Join-Path $Root "_db-usage-report"
  New-Item -Path $outDir -ItemType Directory -Force | Out-Null
  $summarySorted | Export-Csv (Join-Path $outDir "summary.csv") -NoTypeInformation -Encoding UTF8
  $details       | Export-Csv (Join-Path $outDir "details.csv") -NoTypeInformation -Encoding UTF8
  Write-Host "`nCSV сохранены в $outDir" -ForegroundColor Cyan
}
