#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { diffLines } from "diff";
import OpenAI from "openai";

const args = (() => {
  const a = process.argv.slice(2);
  const out = {
    glob: null,
    task: null,
    maxkb: 200,
    apply: false,
    dry: true,
    model: process.env.CODEX_MODEL || "gpt-5-codex",
    temperature: 0.3,
  };

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === "--glob") out.glob = a[++i];
    else if (x === "--task") out.task = a[++i];
    else if (x === "--maxkb") out.maxkb = parseInt(a[++i] || "200", 10);
    else if (x === "--apply") { out.apply = true; out.dry = false; }
    else if (x === "--dry") out.dry = true;
    else if (x === "--model") out.model = a[++i];
    else if (x === "--temperature") out.temperature = parseFloat(a[++i]);
  }

  if (!out.glob || !out.task) {
    console.error(`Usage: node codex-local.mjs --glob "src/**/*.{ts,tsx}" --task "…" [--maxkb 200] [--apply|--dry] [--model gpt-5-codex] [--temperature ]`);
    process.exit(1);
  }

  return out;
})();

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY не задан.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function kb(str) {
  return Buffer.byteLength(str, "utf8") / 1024;
}

const files = await fg(args.glob, { dot: false, onlyFiles: true });
if (!files.length) {
  console.error("❌ По шаблону ничего не найдено:", args.glob);
  process.exit(1);
}

const pack = [];
let budget = args.maxkb;
for (const f of files) {
  const abs = path.resolve(f);
  let txt = "";
  try { txt = await fs.readFile(abs, "utf8"); } catch {}
  const size = kb(txt);
  if (size > budget) {
    const slice = Math.floor((budget - 1) * 1024);
    if (slice <= 0) continue;
    txt = txt.slice(0, slice);
  }
  const used = Math.min(size, budget);
  budget -= used;
  if (budget <= 0) { pack.push({ path: f, content: txt }); break; }
  pack.push({ path: f, content: txt });
}

if (!pack.length) {
  console.error("❌ Нечего отправлять (maxkb слишком мал?).");
  process.exit(1);
}

const system = [
  "Ты код-ассистент. Верни ИСКЛЮЧИТЕЛЬНО JSON-массив патчей.",
  "Формат ответа строго:",
  "[{ \"path\": \"relative/path.ts\", \"new_content\": \"полный новый файл\" }, …]",
  "Никакого текста вне JSON. Не добавляй комментарии. Путь — относительный.",
].join(" ");

const inputPayload = [
  { role: "system", content: [{ type: "input_text", text: system }] },
  { role: "user", content: [{ type: "input_text", text: `Задача: ${args.task}` }] },
  { role: "user", content: [{ type: "input_text", text: `Файлы (обрезаны до ${args.maxkb}KB суммарно):\n${pack.map(p => `# ${p.path}\n${p.content}`).join("\n\n")}` }] },
];

console.error(`▶ Отправляю ~${pack.length} файлов, лимит ~${args.maxkb}KB, модель: ${args.model}, температура: ${args.temperature} …`);

let resp;
try {
  const req = {
    model: args.model,
    input: inputPayload,
  };

  // Определяем тип модели
  const isReasoning = /gpt-5|codex|o1/i.test(args.model);

  if (isReasoning) {
    req.reasoning = { effort: "medium" };
  } else {
    req.temperature = args.temperature;
  }

  resp = await client.responses.create(req);
} catch (e) {
  console.error("❌ API ошибка:", e?.message || e);
  process.exit(1);
}

const raw = resp.output_text
  ?? (resp.output?.find(o => o.type === "output_text")?.text)
  ?? "";

let patches;
try {
  const m = raw.match(/```json\s*([\s\S]*?)```/i);
  const jsonStr = m ? m[1] : raw.trim();
  patches = JSON.parse(jsonStr);
  if (!Array.isArray(patches)) throw new Error("Ответ не массив");
} catch (e) {
  console.error("❌ Не получилось распарсить JSON-патчи. Ответ модели:\n", raw.slice(0, 2000));
  process.exit(1);
}

if (!patches.length) {
  console.error("ℹ️ Патчей нет.");
  process.exit(0);
}

for (const p of patches) {
  const rel = p.path;
  const abs = path.resolve(rel);
  let before = "";
  try { before = await fs.readFile(abs, "utf8"); } catch {}
  const after = String(p.new_content ?? "");

  console.log("\n—".repeat(80));
  console.log(rel);
  const d = diffLines(before, after);
  for (const part of d) {
    const prefix = part.added ? "+" : part.removed ? "-" : " ";
    const lines = part.value.split("\n");
    for (const line of lines) {
      if (!line) continue;
      console.log(prefix + line);
    }
  }

  if (!args.dry) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, after, "utf8");
    console.error(`✔ Применено: ${rel}`);
  }
}

if (args.dry) {
  console.error("\n💡 Это был dry-run. Для записи добавь флаг --apply");
}