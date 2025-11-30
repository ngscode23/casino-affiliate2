#!/usr/bin/env node
import fs from "fs";
import path from "path";

const reportPath = process.argv[2] || "style-mess-report.txt";

if (!fs.existsSync(reportPath)) {
  console.error(`Файл отчёта "${reportPath}" не найден.`);
  process.exit(1);
}

const text = fs.readFileSync(reportPath, "utf8");
const lines = text.split(/\r?\n/);

// агрегаты
const issuesPerFile = new Map();
const issuesPerType = new Map();

let currentFile = null;

// грубые типы проблем по фразам
function classifyIssue(line) {
  if (line.includes("конфликт в семействе [padding")) return "padding";
  if (line.includes("конфликт в семействе [margin")) return "margin";
  if (line.includes("конфликт в семействе [space")) return "space";
  if (line.includes("конфликт в семействе [gap")) return "gap";
  if (line.includes("конфликт в семействе [background/bg")) return "background";
  if (line.includes("конфликт в семействе [text-size")) return "text-size";
  if (line.includes("конфликт в семействе [text-color")) return "text-color";
  if (line.includes("конфликт в семействе [width")) return "width";
  if (line.includes("конфликт в семействе [height")) return "height";

  if (line.includes("селектор по тегу")) return "tag-selector";
  if (line.includes("очень специфичный селектор")) return "high-specificity";
  if (line.includes("повторный селектор")) return "duplicate-selector";
  if (line.includes("используется !important")) return "important";

  return "other";
}

for (const line of lines) {
  // строка вида:
  // apps/web-next/.../Component.tsx:23:5
  // или styles/global.css:41:1
  const fileMatch = line.match(/^(.+?):\d+:\d+\s*$/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    if (!issuesPerFile.has(currentFile)) {
      issuesPerFile.set(currentFile, 0);
    }
    continue;
  }

  if (line.trim().startsWith("→")) {
    const type = classifyIssue(line);

    if (currentFile) {
      issuesPerFile.set(currentFile, issuesPerFile.get(currentFile) + 1);
    }

    issuesPerType.set(type, (issuesPerType.get(type) || 0) + 1);
  }
}

// helper для сортировки
function sortMapDesc(m) {
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

console.log("\n===== ТОП ФАЙЛОВ ПО КОЛИЧЕСТВУ ПРОБЛЕМ =====\n");

for (const [file, count] of sortMapDesc(issuesPerFile).slice(0, 30)) {
  console.log(`${count.toString().padStart(4, " ")}  ${file}`);
}

console.log("\n===== РАЗБИВКА ПО ТИПАМ ПРОБЛЕМ =====\n");

for (const [type, count] of sortMapDesc(issuesPerType)) {
  console.log(`${count.toString().padStart(4, " ")}  ${type}`);
}

console.log("\nГотово. Начинай с верхних файлов из списка – там концентрация бардака максимальная.");
