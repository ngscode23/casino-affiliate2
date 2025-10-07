import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";

type Opts = {
  root: string;
  write: boolean;
  backup: boolean;
};

function parseArgs(): Opts {
  const args = process.argv.slice(2);
  let root = "apps/web-next";
  let write = false;
  let backup = true;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--root" && args[i + 1]) root = args[++i];
    else if (a === "--write") write = true;
    else if (a === "--no-backup") backup = false;
  }
  return { root, write, backup };
}

/**
 * Матчим только простые строки:
 *   <indent><cond> && <call()><;><eol>
 * где:
 *   - cond не содержит ; { } ? &&
 *   - справа именно вызов функции
 *   - нет return/await/yield в начале
 */
const LINE_RE = new RegExp(
  String.raw`^(?<indent>\s*)(?!\s*(?:return|await|yield)\b)(?<cond>[^;{}\n?&][^;{}\n?&]*?)\s*&&\s*(?<call>[A-Za-z_$][\w.$]*\([^;\n]*\))\s*;?\s*$`,
  "m"
);

function transformText(text: string): { out: string; changes: number } {
  let changes = 0;

  // Идём построчно, чтобы избежать случайных многострочных конструкций
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const m = LINE_RE.exec(line);
    if (!m) continue;

    const { indent, cond, call } = m.groups as Record<string, string>;

    // отбрасываем «слишком умные» условия
    if (cond.includes("&&") || cond.includes("?") || cond.includes("{") || cond.includes("}")) {
      continue;
    }

    // аккуратно собираем замену
    const newLine = `${indent}if (${cond.trim()}) { ${call.trim()}; }`;
    if (newLine !== line) {
      lines[i] = newLine;
      changes++;
    }
  }

  return { out: lines.join("\n"), changes };
}

async function run() {
  const { root, write, backup } = parseArgs();
  const patterns = [
    path.join(root, "**/*.ts").replace(/\\/g, "/"),
    path.join(root, "**/*.tsx").replace(/\\/g, "/"),
  ];

const files = await fg(patterns, {
  dot: false,
  absolute: true,
  ignore: ["**/node_modules/**", "**/.next/**", "**/.turbo/**"]
});

  let totalFiles = 0;
  let totalChanges = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const { out, changes } = transformText(src);
    if (changes > 0) {
      totalFiles++;
      totalChanges += changes;
      if (write) {
        if (backup) fs.writeFileSync(file + ".bak", src, "utf8");
        fs.writeFileSync(file, out, "utf8");
        console.log(`Changed ${changes}  →  ${file}`);
      } else {
        console.log(`Would change ${changes}  →  ${file}`);
      }
    }
  }

  console.log(
    `${write ? "Rewritten" : "Dry-run"}: files ${totalFiles}, replacements ${totalChanges}`
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});