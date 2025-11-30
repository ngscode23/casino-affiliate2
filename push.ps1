
$URL = "https://wsqhgnxmotswjantxopb.supabase.co/rest/v1/user_events"
$ANON = "sb_publishable_PemABWwYtVQnmoqmsOxSMA_nujVdFbD"

$headers = @{
  apikey        = $ANON
  Authorization = "Bearer $ANON"
  Prefer        = "return=representation"
}

$body = @{
  anon_id    = "6ad5a25e-21ee-49c7-b732-f3f100aeb10e"
  event      = "view"
  product_id = "4cad420c-b824-4c87-972b-3c329bf29f9d"
  category   = "shop"
  ts         = (Get-Date).ToUniversalTime().ToString("o")
  weight     = 1
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri $URL -Headers $headers `
  -ContentType 'application/json' -Body $body
