#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , fileArg = 'log.txt', ...restArgs] = process.argv;
const filePath = path.resolve(process.cwd(), fileArg);

if (!fs.existsSync(filePath)) {
  console.error(`Файл не найден: ${filePath}`);
  process.exit(1);
}

const args = new Set(restArgs);

const getArgValue = (flag, fallback) => {
  const idx = restArgs.indexOf(flag);
  if (idx === -1) return fallback;
  const value = restArgs[idx + 1];
  if (!value || value.startsWith('-')) return fallback;
  return value;
};

const minCount = Number(getArgValue('--min', 2));
const top = Number(getArgValue('--top', 20));
const outputUnique = args.has('--unique');
const outputJson = args.has('--json');
const outPath = getArgValue('--out', null);
const sortStack = args.has('--sort-stack');

// Извлекает сигнатуру ошибки из строки лога.
const extractSignature = (line) => {
  // Явные Error: ...
  const errIdx = line.indexOf('Error:');
  if (errIdx !== -1) return line.slice(errIdx).trim();

  // Частые JS ошибки без префикса "Error:"
  const match =
    line.match(/\b(TypeError|ReferenceError|RangeError|SyntaxError|Unhandled .*?Error|ERR_[A-Z_]+)\b.*$/);
  if (match) return match[0].trim();

  // WARN/ERROR уровни логов
  const warn = line.match(/\b(WARN|ERROR)\b.*$/);
  if (warn) return warn[0].trim();

  return null;
};

const counts = new Map();
const seenSigs = new Set();
const uniqueBlocks = [];

const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const sig = extractSignature(line);
  if (!sig) continue;

  // Собираем блок: сама строка ошибки + последующие строки стека "    at ..."
  const stackLines = [];
  let j = i + 1;
  while (j < lines.length && /^\s+at\s/.test(lines[j])) {
    stackLines.push(lines[j]);
    j++;
  }
  // переставляем индекс, чтобы не пересчитывать тот же стек
  i = j - 1;

  // Убираем дубликаты кадров, при желании сортируем
  const frameSet = new Set();
  const frames = sortStack
    ? [...new Set(stackLines.map((s) => s.trim()))].sort().map((s) => `    ${s.replace(/^\s+/, '')}`)
    : stackLines.filter((s) => {
        const trimmed = s.trim();
        if (frameSet.has(trimmed)) return false;
        frameSet.add(trimmed);
        return true;
      });

  const block = [line, ...frames];

  counts.set(sig, (counts.get(sig) || 0) + 1);

  if (outPath && !seenSigs.has(sig)) {
    seenSigs.add(sig);
    uniqueBlocks.push(block.join('\n'));
  }
}

const entries = [...counts.entries()];
const sorted = entries.sort((a, b) => b[1] - a[1]);

// Записать все ошибки (с их стеком) один раз
if (outPath) {
  fs.writeFileSync(outPath, uniqueBlocks.join('\n\n'), 'utf8');
  console.log(`Сохранил ${uniqueBlocks.length} уникальных ошибок (с их стеками) в ${outPath}`);
  process.exit(0);
}

if (outputJson) {
  if (outputUnique) {
    console.log(JSON.stringify(sorted.filter(([, n]) => n === 1), null, 2));
    process.exit(0);
  }
  console.log(JSON.stringify(sorted.filter(([, n]) => n >= minCount).slice(0, top), null, 2));
  process.exit(0);
}

if (outputUnique) {
  console.log('Ошибки, встретившиеся ровно 1 раз:');
  sorted
    .filter(([, n]) => n === 1)
    .forEach(([sig]) => console.log(`- ${sig}`));
  process.exit(0);
}

console.log(`Топ ошибок (мин. ${minCount} повторений, максимум ${top}):`);
sorted
  .filter(([, n]) => n >= minCount)
  .slice(0, top)
  .forEach(([sig, n]) => console.log(`${n}×  ${sig}`));
