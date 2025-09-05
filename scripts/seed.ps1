Param(
  [string]$Host = $env:PGHOST | ForEach-Object { if ($_ -and $_.Trim().Length) { $_ } else { '127.0.0.1' } },
  [int]$Port = $env:PGPORT | ForEach-Object { if ($_ -and $_.Trim().Length) { [int]$_ } else { 54322 } },
  [string]$Database = $env:PGDATABASE | ForEach-Object { if ($_ -and $_.Trim().Length) { $_ } else { 'postgres' } },
  [string]$User = $env:PGUSER | ForEach-Object { if ($_ -and $_.Trim().Length) { $_ } else { 'postgres' } },
  [string]$Password = $env:PGPASSWORD | ForEach-Object { if ($_ -and $_.Trim().Length) { $_ } else { 'postgres' } }
)

$env:PGPASSWORD = $Password
Write-Host "Seeding database at $Host:$Port/$Database as $User..."
& psql -h $Host -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f "supabase/seed.sql"
if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
Write-Host "Seed complete."

