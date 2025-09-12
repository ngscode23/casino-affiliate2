# supa-login.ps1
param(
  [string]$Email,
  [string]$Password,
  [string]$BaseUrl = "http://localhost:8888",   # где крутится netlify dev
  [string]$AdminToken = $env:ADMIN_TOKEN,        # токен для bootstrap/reviews админ-функций
  [switch]$Bootstrap                            # промоут в админы и установка пароля через функцию
)

function Read-Dotenv {
  param([string]$Path = ".\.env.local")
  $vars = @{}
  if (Test-Path $Path) {
    Get-Content $Path | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        $k = $matches[1]; $v = $matches[2]
        if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length-2) }
        elseif ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length-2) }
        $vars[$k] = $v
      }
    }
  }
  return $vars
}

function Decode-Base64Url {
  param([string]$b64u)
  $s = $b64u.Replace('-', '+').Replace('_', '/')
  switch ($s.Length % 4) {
    2 { $s += '==' }
    3 { $s += '=' }
  }
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))
}

function Decode-JWT {
  param([string]$jwt)
  if (-not $jwt) { return $null }
  $parts = $jwt.Split('.')
  if ($parts.Length -lt 2) { return $null }
  try {
    $hdr = Decode-Base64Url $parts[0] | ConvertFrom-Json
    $pld = Decode-Base64Url $parts[1] | ConvertFrom-Json
    [pscustomobject]@{ header=$hdr; payload=$pld }
  } catch { return $null }
}

# 1) прочитать .env.local
$envs = Read-Dotenv
$SUPABASE_URL = $envs["VITE_SUPABASE_URL"]
$ANON_KEY     = $envs["VITE_SUPABASE_ANON_KEY"]

if (-not $SUPABASE_URL -or -not $ANON_KEY) {
  Write-Host "❌ Не нашёл VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env.local" -ForegroundColor Red
  exit 1
}

if (-not $Email)    { $Email    = Read-Host "Email" }
if (-not $Password) { $Password = Read-Host "Пароль" -AsSecureString | ForEach-Object {[System.Net.NetworkCredential]::new("", $_).Password} }

# 2) логин grant_type=password
$authUrl = "$SUPABASE_URL/auth/v1/token?grant_type=password"
$body = @{ email = $Email; password = $Password } | ConvertTo-Json
try {
  $resp = Invoke-RestMethod -Method POST -Uri $authUrl `
    -Headers @{ apikey = $ANON_KEY; Authorization = "Bearer $ANON_KEY"; "Content-Type"="application/json" } `
    -Body $body
} catch {
  Write-Host "❌ Ошибка логина: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}

$access = $resp.access_token
$refresh = $resp.refresh_token
if (-not $access) {
  Write-Host "❌ Нет access_token в ответе" -ForegroundColor Red
  $resp | ConvertTo-Json -Depth 6 | Write-Host
  exit 1
}

Write-Host "✅ Получен JWT (access_token):" -ForegroundColor Green
Write-Host $access
$claims = Decode-JWT $access
if ($claims) {
  Write-Host "`n— JWT header:";  $claims.header  | ConvertTo-Json -Depth 6
  Write-Host "`n— JWT payload:"; $claims.payload | ConvertTo-Json -Depth 6
  Write-Host "`nРоль из клеймов:" $claims.payload.role
}

# 2.5) По желанию — сразу промоут в админы и задать пароль через Netlify-функцию
if ($Bootstrap) {
  if (-not $AdminToken) {
    Write-Host "⚠️  -Bootstrap указан, но ADMIN_TOKEN не задан (-AdminToken или переменная окружения). Пропускаю." -ForegroundColor Yellow
  } else {
    Write-Host "`n=== Bootstrap admin (email+password) ==="
    $b = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
    try {
      $resp2 = Invoke-RestMethod -Method POST -Uri "$BaseUrl/.netlify/functions/bootstrap-admin" `
        -Headers @{ "x-admin-token"=$AdminToken; "content-type"="application/json" } -Body $b
      Write-Host "✅ bootstrap:"; $resp2 | ConvertTo-Json -Depth 6 | Write-Host
    } catch {
      Write-Host "❌ Ошибка bootstrap: $($_.Exception.Message)" -ForegroundColor Yellow
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { Write-Host "HTTP:" ([int]$_.Exception.Response.StatusCode) }
      if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    }
  }
}

# 3) тест wishlist API (JWT в Authorization)
Write-Host "`n=== Тест wishlist/list ==="
try {
  $w = Invoke-RestMethod -Method GET -Uri "$BaseUrl/.netlify/functions/ecom-wishlist/list" `
    -Headers @{ Authorization = "Bearer $access" }
  Write-Host "✅ OK:"; $w | ConvertTo-Json -Depth 6
} catch {
  Write-Host "❌ Ошибка wishlist/list: $($_.Exception.Message)" -ForegroundColor Yellow
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    Write-Host "HTTP:" ([int]$_.Exception.Response.StatusCode)
  }
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}

# 4) тест reviews-admin (нужен x-admin-token)
if ($AdminToken) {
  Write-Host "`n=== Тест reviews-admin?status=pending (x-admin-token) ==="
  try {
    $ra = Invoke-RestMethod -Method GET -Uri "$BaseUrl/.netlify/functions/reviews-admin?status=pending" `
      -Headers @{ "x-admin-token" = $AdminToken }
    Write-Host "✅ OK:"; $ra | ConvertTo-Json -Depth 6
  } catch {
    Write-Host "❌ Ошибка reviews-admin: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      Write-Host "HTTP:" ([int]$_.Exception.Response.StatusCode)
    }
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  }
} else {
  Write-Host "`nℹ Нет ADMIN_TOKEN в окружении — пропускаю проверку reviews-admin."
}
