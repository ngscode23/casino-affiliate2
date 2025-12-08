Write-Host "Ищу конфиги OpenAI/Codex в типичных местах..." -ForegroundColor Cyan

$roots = @(
    "$env:USERPROFILE\AppData\Roaming\Code\User\globalStorage\openai.chatgpt",
    "$env:USERPROFILE\AppData\Roaming\openai",
    "$env:USERPROFILE\.openai",
    "$env:USERPROFILE\.config\openai"
)

$paths = @()

foreach ($root in $roots) {
    if (Test-Path $root) {
        $found = Get-ChildItem -Path $root -Recurse -ErrorAction SilentlyContinue |
                 Where-Object { $_.Name -match "openai|config|codex" }
        if ($found) { $paths += $found }
    }
}

if ($paths.Count -eq 0) {
    Write-Host "Ничего не нашёл в стандартных местах. Либо Codex хранит только в переменной среды, либо вообще без конфига." -ForegroundColor Yellow
} else {
    Write-Host "`nНайдено:" -ForegroundColor Green
    $paths | Select-Object -Unique FullName | ForEach-Object { Write-Host $_ }
}
