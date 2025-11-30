#!/usr/bin/env node
import fs from "fs";
import path from "path";

const rootDir = process.argv[2] || "src";
const outputFile = process.argv[3] || "style-mess-report.txt";

const extsCode = [".tsx", ".ts", ".jsx", ".js"];
const extsCss = [".css", ".scss"];
const ignoreDirs = new Set(["node_modules", ".next", "dist", "build", ".turbo", ".git"]);

const outputBuffer = [];
const out = (line = "") => {
  console.log(line);
  outputBuffer.push(line);
};

const families = [
  { name: "padding", test: (c) => /^p[trblxy]?-[^\s]+/.test(c), key: (c) => c.match(/^p[trblxy]?/)[0] },
  { name: "margin", test: (c) => /^m[trblxy]?-[^\s]+/.test(c), key: (c) => c.match(/^m[trblxy]?/)[0] },
  { name: "space", test: (c) => /^space-[xy]-[^\s]+/.test(c), key: (c) => c.match(/^space-[xy]/)[0] },
  { name: "gap", test: (c) => /^gap(?:-[xy])?-[^\s]+/.test(c), key: (c) => c.match(/^gap(?:-[xy])?/)[0] },
  { name: "background", test: (c) => /^bg-[^\s]+/.test(c), key: () => "bg" },
  {
    name: "text-size",
    test: (c) =>
      /^text-(xs|sm|base|lg|xl|[2-9]xl|[1-9]0?\/[1-9]0?|\[(?:\d+(?:\.\d+)?(?:px|rem|em)|calc[^\]]+)\])$/.test(c),
    key: () => "text-size",
  },
  {
    name: "text-color",
    test: (c) =>
      /^text-(?!xs$|sm$|base$|lg$|xl$|[2-9]xl|[1-9]0?\/[1-9]0?$)(?!left$|right$|center$|justify$|start$|end$|balance$)(?!\[[^\]]+\])[^\s]+$/.test(
        c,
      ),
    key: () => "text-color",
  },
  { name: "width", test: (c) => /^w-[^\s]+/.test(c), key: () => "w" },
  { name: "height", test: (c) => /^h-[^\s]+/.test(c), key: () => "h" },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(full);
    } else {
      const ext = path.extname(entry.name);
      if (extsCode.includes(ext)) {
        checkJsxFile(full);
      } else if (extsCss.includes(ext)) {
        checkCssFile(full);
      }
    }
  }
}

const classNameRegex = /className\s*=\s*(?:{)?\s*["'`]([^"'`]+)["'`]\s*(?:})?/g;

function checkJsxFile(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = classNameRegex.exec(code)) !== null) {
    const raw = match[1];
    const classes = raw
      .split(/\s+/)
      .map((c) => c.trim())
      .filter(Boolean);
    const issues = findConflicts(classes);
    if (issues.length === 0) continue;

    const { line, column } = getPosition(code, match.index);
    out("");
    out(`${filePath}:${line}:${column}`);
    out(`  className="${raw}"`);
    for (const issue of issues) {
      out(`  ⚠️ Конфликт ${issue.family} [${issue.key}]: ${issue.classes.join("  ")}`);
      out(`     → ${issue.reason}`);
    }
  }
}

function findConflicts(classes) {
  const problems = [];
  for (const fam of families) {
    const famClasses = classes
      .map((cls, index) => ({ cls, index }))
      .filter((item) => fam.test(item.cls));
    if (famClasses.length <= 1) continue;

    const grouped = new Map();
    for (const item of famClasses) {
      const key = fam.key(item.cls);
      const arr = grouped.get(key) || [];
      arr.push(item);
      grouped.set(key, arr);
    }

    for (const [key, list] of grouped.entries()) {
      if (list.length <= 1) continue;
      const sorted = list.slice().sort((a, b) => a.index - b.index);
      const losers = sorted.slice(0, -1).map((item) => item.cls);
      const winner = sorted.at(-1).cls;
      const duplicated = sorted.some((item, idx) => idx > 0 && item.cls === sorted[idx - 1].cls);
      problems.push({
        family: fam.name,
        key,
        classes: sorted.map((item) => item.cls),
        reason: duplicated
          ? `класс "${winner}" повторяется несколько раз; Tailwind применит последнее объявление`
          : `класс "${winner}" расположен после ${losers.join(", ")}, поэтому предыдущие значения для ${key} будут проигнорированы`,
      });
    }
  }
  return problems;
}

function splitSelectorsSafe(selectorRaw) {
  const result = [];
  let current = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  let escaped = false;

  for (let i = 0; i < selectorRaw.length; i++) {
    const ch = selectorRaw[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === "[") bracketDepth++;
    if (ch === "]" && bracketDepth > 0) bracketDepth--;
    if (ch === "(") parenDepth++;
    if (ch === ")" && parenDepth > 0) parenDepth--;
    if (ch === "," && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function checkCssFile(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const cleaned = code.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRegex = /([^{]+)\{([^}]*)\}/g;
  const seenSelectors = new Set();

  let match;
  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selectorRaw = match[1].trim();
    const bodyRaw = match[2].trim();
    if (!selectorRaw || !bodyRaw) continue;

    const { line, column } = getPosition(code, match.index);
    const selectors = splitSelectorsSafe(selectorRaw);
    const ruleIssues = [];

    for (const sel of selectors) {
      if (sel.startsWith("@")) continue;
      const lower = sel.toLowerCase();
      const isKeyframeStep = lower === "from" || lower === "to" || /^\d+%$/.test(lower);
      const isTagOnly =
        /^[a-z][a-z0-9-]*$/i.test(sel) && !sel.includes(".") && !sel.includes("#") && !isKeyframeStep;
      if (isTagOnly && !["html", "body"].includes(lower)) {
        ruleIssues.push(`глобальный селектор по тегу "${sel}" (сложно контролировать в проекте с Tailwind)`);
      }
      if (seenSelectors.has(sel)) {
        ruleIssues.push(`повторяющийся селектор "${sel}" (правила уже встречались выше)`);
      } else {
        seenSelectors.add(sel);
      }
      const classCount = (sel.match(/\./g) || []).length;
      const idCount = (sel.match(/#/g) || []).length;
      const deepChain = /[\s>+~]/.test(sel);
      if (idCount >= 1 || classCount + idCount >= 3 || (classCount >= 2 && deepChain)) {
        ruleIssues.push(
          `селектор "${sel}" имеет высокую специфичность — переопределять его utility-классами будет сложно`,
        );
      }
    }

    const importantProps = bodyRaw
      .split(";")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.includes("!important"));
    if (importantProps.length > 0) {
      ruleIssues.push(`используется !important (пример: "${importantProps[0]}")`);
    }

    if (ruleIssues.length > 0) {
      out("");
      out(`${filePath}:${line}:${column}`);
      out(`  selector: ${selectorRaw}`);
      for (const issue of ruleIssues) {
        out(`  • ${issue}`);
      }
    }
  }
}

function getPosition(code, index) {
  const slice = code.slice(0, index);
  const lines = slice.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

if (!fs.existsSync(rootDir)) {
  console.error(`Путь "${rootDir}" не найден. Использование: node scripts/find-style-mess.mjs ./apps/web-next ./style-mess-report.txt`);
  process.exit(1);
}

walk(rootDir);
fs.writeFileSync(outputFile, outputBuffer.join("\n"), "utf8");
console.error(`\nОтчёт по потенциальным конфликтам стилей: ${outputFile}`);
