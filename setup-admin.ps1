# === НАСТРОЙКИ ===
$PROJECT_REF = "wsqhgnxmotswjantxopb"   # твой Supabase project ref
$ANON_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcWhnbnhtb3Rzd2phbnR4b3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDcwMjUsImV4cCI6MjA3MTM4MzAyNX0.WiDgplDwnoqLeJH_mdlJgFGRIjWW4BpQndgjDBMEiKI"
$SRK         = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcWhnbnhtb3Rzd2phbnR4b3BiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgwNzAyNSwiZXhwIjoyMDcxMzgzMDI1fQ.TACsn1CKjTzXYF8DTzqSFuEFKhEeJEhEOjxhVIm3rWM"  # Service Role Key (секрет!)
$ADMIN_EMAIL = "stasvolohovish@gmail.com"
$ADMIN_PASS  = "StrongPass123!"            # задай новый пароль

# === 1. Прописать переменные окружения ===
setx VITE_SUPABASE_URL "https://$PROJECT_REF.supabase.co"
setx VITE_SUPABASE_ANON_KEY "$ANON_KEY"

# для функций (Netlify / сервер)
setx SUPABASE_URL "https://$PROJECT_REF.supabase.co"
setx SUPABASE_ANON_KEY "$ANON_KEY"
setx SUPABASE_SERVICE_ROLE_KEY "$SRK"
setx ADMIN_TOKEN "ddb27690d96f4d788d0197ec209fa469"

Write-Host "✅ Переменные окружения заданы. Перезапусти терминал, чтобы они применились."

# === 2. Создать нового админа через API ===
$body = @{
  email       = $ADMIN_EMAIL
  password    = $ADMIN_PASS
  app_metadata = @{ role = "admin" }
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod -Method Post `
  -Uri "https://$PROJECT_REF.supabase.co/auth/v1/admin/users" `
  -Headers @{
    "apikey"        = $SRK
    "Authorization" = "Bearer $SRK"
    "Content-Type"  = "application/json"
  } `
  -Body $body

Write-Host "✅ Создан новый админ:" ($response | ConvertTo-Json -Depth 5)