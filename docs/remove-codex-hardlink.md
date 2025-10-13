# Remove-CodexHardlink.ps1

Скрипт нужен, чтобы почистить хардлинк на исполняемый файл Codex, который VS Code создавал во время локальных экспериментов. Он:

- проверяет наличие ссылки `C:\Users\stasv\.vscode\extensions\openai.chatgpt-0.5.19-win32-x64\bin\windows-x86_64\codex.exe`;
- показывает связанные с оригиналом `codex.exe` файлы через `fsutil hardlink list`;
- удаляет хардлинк, чтобы не мешал обновлениям расширения;
- убедится, что оригинальный бинарь по пути `C:\Users\stasv\AppData\Roaming\npm\node_modules\@openai\codex\vendor\x86_64-pc-windows-msvc\codex\codex.exe` на месте.

Запускай скрипт, когда нужно удалить созданную ранее ссылку и вернуть расширение к штатному бинарю.
