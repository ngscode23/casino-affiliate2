# Путь к "ссылке", которую ты создавал
$linkPath = "C:\Users\stasv\.vscode\extensions\openai.chatgpt-0.5.19-win32-x64\bin\windows-x86_64\codex.exe"

# Путь к оригинальному файлу
$targetPath = "C:\Users\stasv\AppData\Roaming\npm\node_modules\@openai\codex\vendor\x86_64-pc-windows-msvc\codex\codex.exe"

# Проверяем, существует ли хардлинк
if (Test-Path $linkPath) {
    Write-Host "🧩 Найдена хардссылка: $linkPath"
    # Показываем все связанные ссылки
    Write-Host "Связанные файлы:"
    fsutil hardlink list $targetPath

    # Удаляем хардлинк
    Remove-Item $linkPath -Force
    Write-Host "✅ Хардлинк удалён: $linkPath"
} else {
    Write-Host "⚠️ Хардлинк уже отсутствует: $linkPath"
}

# Проверяем оригинал
if (Test-Path $targetPath) {
    Write-Host "🎯 Оригинальный файл на месте: $targetPath"
    fsutil hardlink list $targetPath
} else {
    Write-Host "❌ Оригинальный файл не найден! Проверь путь."
}
