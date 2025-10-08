#!/usr/bin/env node
/**
 * Minimal, robust CLI for OpenAI Responses API (gpt-5-codex by default).
 *
 * Examples:
 *   node codex-cli.mjs "Сгенерируй React-компонент карточки товара"
 *   node codex-cli.mjs -m gpt-5 -r low --system "Ты код-ассистент" "Сделай summary PR #42"
 *   node codex-cli.mjs --stream "Напиши функцию на TS для debounce"
 *   node codex-cli.mjs --in prompt.txt --json
 *
 * Env:
 *   OPENAI_API_KEY=<your key>
 */

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { stdin, stdout, stderr, argv, env, exit } from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import OpenAI from "openai";

const HELP = `Usage: node codex-cli.mjs [options] [prompt...]
Options:
  -m, --model <name>         Модель (default: gpt-5-codex)
  -r, --reasoning <level>    Уровень рассуждений: low|medium|high (default: medium)
  -s, --system <text>        Системная подсказка
  -i, --in <file>            Читать промпт из файла (txt/markdown). Если не задано и нет аргументов — из STDIN.
      --stream               Потоковый вывод (по мере генерации)
      --max-tokens <n>       Ограничить вывод (max_output_tokens)
      --temp <t>             temperature (default: 1)
      --top-p <p>            top_p (default: 1)
      --no-store             store=false (не сохранять в истории у провайдера)
      --json                 Печатать сырой JSON ответа
  -h, --help                 Показать помощь
`;

const allowedEfforts = new Set(["low", "medium", "high"]);
const aliases = new Map([
  ["none", "low"],
  ["minimal", "low"],
  ["detailed", "high"],
]);

function normalizeEffort(x) {
  if (!x) return "medium";
  const v = (x + "").toLowerCase();
  return allowedEfforts.has(v) ? v : (aliases.get(v) || v);
}

function parseArgs() {
  const out = {
    model: env.CODEX_MODEL || "gpt-5-codex",
    effort: normalizeEffort(env.CODEX_REASONING || "medium"),
    system: env.CODEX_SYSTEM || null,
    inFile: null,
    stream: false,
    maxTokens: null,
    temperature: (env.CODEX_TEMP && Number(env.CODEX_TEMP)) || 1,
    topP: (env.CODEX_TOP_P && Number(env.CODEX_TOP_P)) || 1,
    store: true,
    json: false,
    promptParts: [],
  };

  const a = argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    switch (x) {
      case "-m":
      case "--model":
        out.model = a[++i];
        break;
      case "-r":
      case "--reasoning":
        out.effort = normalizeEffort(a[++i]);
        break;
      case "-s":
      case "--system":
        out.system = a[++i];
        break;
      case "-i":
      case "--in":
        out.inFile = a[++i];
        break;
      case "--stream":
        out.stream = true;
        break;
      case "--max-tokens":
        out.maxTokens = Number(a[++i]);
        break;
      case "--temp":
        out.temperature = Number(a[++i]);
        break;
      case "--top-p":
        out.topP = Number(a[++i]);
        break;
      case "--no-store":
        out.store = false;
        break;
      case "--json":
        out.json = true;
        break;
      case "-h":
      case "--help":
        stdout.write(HELP);
        exit(0);
      default:
        out.promptParts.push(x);
    }
  }
  return out;
}

async function readPrompt(inFile, parts) {
  if (inFile) {
    return await fs.readFile(inFile, "utf8");
  }
  if (parts.length) return parts.join(" ");
  if (!stdin.isTTY) {
    const chunks = [];
    for await (const c of stdin) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  }
  stderr.write("Укажите промпт в аргументах, через --in <file> или передайте через STDIN.\n");
  stderr.write(HELP);
  exit(1);
}

function buildInput(prompt, system) {
  const input = [];
  if (system) {
    input.push({
      role: "system",
      content: [{ type: "input_text", text: system }],
    });
  }
  input.push({
    role: "user",
    content: [{ type: "input_text", text: prompt }],
  });
  return input;
}

function extractText(resp) {
  if (!resp) return "";
  if (resp.output_text) return resp.output_text;
  if (Array.isArray(resp.output)) {
    return resp.output
      .flatMap((item) => (item?.type === "message"
        ? item.content?.filter(c => c.type === "output_text").map(c => c.text) ?? []
        : item?.type === "output_text" ? [item.text] : []))
      .join("\n");
  }
  return "";
}

async function withRetry(fn, { retries = 5, baseMs = 300 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = (e?.message || "").toLowerCase();
      // Ретраим 429/5xx/временные ошибки сети
      if (msg.includes("rate") || msg.includes("429") || msg.includes("timeout") || msg.includes("5")) {
        const wait = Math.min(5000, baseMs * Math.pow(2, i) + Math.random() * 200);
        stderr.write(`⚠️  retry ${i + 1}/${retries} in ${Math.round(wait)}ms…\n`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function main() {
  const args = parseArgs();

  if (!allowedEfforts.has(args.effort)) {
    stderr.write(`Некорректный reasoning: "${args.effort}". Используй: low|medium|high\n`);
    exit(1);
  }
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    stderr.write("Нет OPENAI_API_KEY в окружении.\n");
    exit(1);
  }

  const prompt = (await readPrompt(args.inFile, args.promptParts)).trim();
  if (!prompt) {
    stderr.write("Пустой промпт.\n");
    exit(1);
  }

  const client = new OpenAI({ apiKey });

  // STREAM
  if (args.stream) {
    const stream = await client.responses.stream.create({
      model: args.model,
      store: args.store,
      temperature: args.temperature,
      top_p: args.topP,
      ...(args.maxTokens ? { max_output_tokens: args.maxTokens } : {}),
      reasoning: { effort: args.effort },
      input: buildInput(prompt, args.system),
    });

    stream.on("message", (msg) => {
      const chunk = msg?.content?.find?.((c) => c.type === "output_text");
      if (chunk?.text) stdout.write(chunk.text);
    });
    stream.on("end", () => stdout.write("\n"));
    stream.on("error", (e) => {
      stderr.write(`\nstream error: ${e?.message || e}\n`);
      exit(1);
    });
    return; // поток сам завершит процесс
  }

  // NON-STREAM + RETRY
  const resp = await withRetry(async () => {
    return await client.responses.create({
      model: args.model,
      store: args.store,
      temperature: args.temperature,
      top_p: args.topP,
      ...(args.maxTokens ? { max_output_tokens: args.maxTokens } : {}),
      reasoning: { effort: args.effort },
      input: buildInput(prompt, args.system),
      metadata: { source: "codex-cli" },
    });
  });

  if (args.json) {
    stdout.write(JSON.stringify(resp, null, 2) + "\n");
    return;
  }

  const text = extractText(resp) || "[no output_text]";
  // краткая строка мета-данных в stderr, чтобы не мешать пайпам
  const usage = resp.usage?.total_tokens ?? (
    Object.entries(resp.usage || {})
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${k}=${v}`).join(" ")
  );
  stderr.write(`[codex-cli] model=${resp.model || args.model} tokens=${usage ?? "n/a"}\n`);
  stdout.write(text + "\n");
}

try {
  await main();
} catch (e) {
  stderr.write(`Ошибка: ${e?.message || e}\n`);
  exit(1);
}








