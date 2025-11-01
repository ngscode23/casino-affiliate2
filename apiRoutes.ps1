# Задаём список страничных маршрутов админки
$routes = @(
  "/admin",
  "/admin/analytics",
  "/admin/metrics",
  "/admin/offers",
  "/admin/orders",
  "/admin/reviews",
  "/admin/partners",
  "/admin/webhooks",
  "/admin/shop/products"
)

# Проходим по списку и сохраняем отчёт в файлы admin-<slug>.log
foreach ($route in $routes) {
  $slug = ($route -replace "^/admin/?", "") -replace "[/]", "-"
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "root" }

  $url = "http://localhost:3000$route"
  $outFile = "admin-$slug.log"

  Write-Host "Замер $url -> $outFile"
  curl -s -w "`n---`nTTFB: %{time_starttransfer}s`nTotal: %{time_total}s`n" $url > $outFile
}