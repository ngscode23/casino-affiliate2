// mcp-server.mjs  — v0.5.1 (fix: safe newline in writeResult)

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  InitializedNotificationSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

// ---------- constants ----------
const ROOT = process.cwd();
const REQUIRED_TOKEN = process.env.MCP_SECRET || ""; // пусто → auth off
const NAME = "local-tools";
const VERSION = "0.5.1";
const ALLOWLIST_PATH = path.resolve(ROOT, "scripts/agent-allowlist.json");
const DEFAULT_ALLOW = new Set(["pnpm", "node", "git", "rg", "powershell", "pwsh", "cmd"]);
const QUEUE_DIR = path.resolve(ROOT, "shell-queue");
const OUT_DIR = path.resolve(ROOT, "shell-out");

// ---------- utils ----------
function log(...args) {
  const ts = new Date().toISOString();
  console.error(`[${ts}]`, ...args);
}
function maskToken(s = "") {
  if (!s) return "";
  return s.length <= 8 ? "***" : s.slice(0, 2) + "***" + s.slice(-2);
}
function assertAuth(headers) {
  if (!REQUIRED_TOKEN) return;
  const h = headers?.authorization || headers?.Authorization || "";
  if (h !== `Bearer ${REQUIRED_TOKEN}`) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}
function safeJoin(p) {
  const abs = path.resolve(ROOT, p || ".");
  const rootNorm = path.resolve(ROOT) + path.sep;
  const absDir = path.dirname(abs) + path.sep;
  if (!absDir.startsWith(rootNorm) && abs !== path.resolve(ROOT)) {
    throw new Error("Path outside project");
  }
  return abs;
}
function findCodeCmd() {
  return process.platform === "win32" ? "code.cmd" : "code";
}
function asText(data) {
  const text = typeof data === "string" ? data : "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  return { content: [{ type: "text", text }] };
}
function asError(message, data) {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}\n` + (data ? "```json\n" + JSON.stringify(data, null, 2) + "\n```" : ""),
      },
    ],
  };
}
function runProc(cmd, args, { cwd = ROOT } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: true });
    let out = "", err = "";
    p.stdout.on("data", (b) => (out += b.toString()));
    p.stderr.on("data", (b) => (err += b.toString()));
    p.on("close", (code) => resolve({ code, stdout: out, stderr: err }));
  });
}
function replaceAll(str, find, repl) {
  return (str ?? "").split(find).join(repl);
}
async function loadAllow() {
  try {
    const raw = await fs.readFile(ALLOWLIST_PATH, "utf8");
    const j = JSON.parse(raw);
    const arr = Array.isArray(j?.allowed) ? j.allowed : [];
    return new Set(arr);
  } catch {
    return new Set(DEFAULT_ALLOW);
  }
}
async function ensureDirs() {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
}

// ---------- tools ----------
const TOOL_DEFS = {
  ping: {
    description: "Проверка живости",
    inputSchema: { type: "object", properties: { msg: { type: "string" } } },
  },
  health: {
    description: "Состояние сервера",
    inputSchema: { type: "object", properties: {} },
  },
  list_files: {
    description: "Список файлов/папок относительно корня проекта",
    inputSchema: { type: "object", properties: { dir: { type: "string", default: "." } } },
  },
  read_file: {
    description: "Прочитать файл (UTF-8)",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  write_file: {
    description: "Записать файл (перезапись, UTF-8)",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  delete_file: {
    description: "Удалить файл",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  open_vscode: {
    description: "Открыть VS Code на указанном пути",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        reuseWindow: { type: "boolean", default: true },
        wait: { type: "boolean", default: false },
      },
      required: ["path"],
    },
  },
  open_repo_in_vscode: {
    description: "Открыть корень текущего проекта в VS Code",
    inputSchema: { type: "object", properties: {} },
  },
  search_code: {
    description: "Поиск по проекту (ripgrep)",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        globs: { type: "array", items: { type: "string" }, default: ["**/*"] },
        limit: { type: "number", default: 200 },
      },
      required: ["q"],
    },
  },
  replace_in_file: {
    description: "Точечная замена текста в файле",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, find: { type: "string" }, replace: { type: "string" } },
      required: ["path", "find", "replace"],
    },
  },
  shell_run: {
    description: "Выполнить разрешённую команду в пределах проекта (allowlist + timeout)",
    inputSchema: {
      type: "object",
      properties: {
        cmd: { type: "string" },
        args: { type: "array", items: { type: "string" }, default: [] },
        cwd: { type: "string" },
        timeoutMs: { type: "number", default: 120000 }
      },
      required: ["cmd"],
    },
  },
};

const SERVER_CAPABILITIES = {
  resources: {},
  prompts: {},
  tools: TOOL_DEFS,
};

// ---------- server ----------
const server = new Server(
  { name: NAME, version: VERSION },
  { capabilities: SERVER_CAPABILITIES }
);

// ---------- queue runner ----------
async function processTask(task) {
  const { id, cmd, args = [], cwd = ".", timeoutMs = 120000 } = task || {};
  const allow = await loadAllow();
  if (!allow.has(cmd)) {
    await writeResult(id || "unknown", { denied: true, reason: "command not allowed", cmd, allow: [...allow] });
    return;
  }
  const absCwd = safeJoin(cwd || ".");
  let out = "", err = "";
  let timedOut = false;
  const child = spawn(cmd, args, { cwd: absCwd, shell: process.platform === "win32" });
  const timer = setTimeout(() => { timedOut = true; try { child.kill(); } catch {} }, timeoutMs);
  child.stdout.on("data", (b) => (out += b.toString()));
  child.stderr.on("data", (b) => (err += b.toString()));
  const code = await new Promise((res) => child.on("close", res));
  clearTimeout(timer);
  const MAX = 200_000;
  const trunc = (s) => (s && s.length > MAX ? s.slice(0, MAX) + "\n[...truncated...]" : s);
  await writeResult(id || "unknown", { cmd, args, cwd: path.relative(ROOT, absCwd) || ".", code, timedOut, stdout: trunc(out), stderr: trunc(err) });
}

async function writeResult(id, data) {
  const jsonPath = path.join(OUT_DIR, `${id}.json`);
  const logPath = path.join(OUT_DIR, `${id}.log`);
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  await fs.writeFile(jsonPath, text, "utf8");
  const sep = os.EOL;
  const stdoutPart = (data && typeof data === 'object' && 'stdout' in data && data.stdout) ? data.stdout : "";
  const stderrPart = (data && typeof data === 'object' && 'stderr' in data && data.stderr) ? data.stderr : "";
  const combined = stdoutPart + (stderrPart ? sep + stderrPart : "");
  await fs.writeFile(logPath, combined, "utf8");
}

async function sweepQueueOnce() {
  try {
    await ensureDirs();
    const entries = await fs.readdir(QUEUE_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".json")) continue;
      const src = path.join(QUEUE_DIR, e.name);
      const lock = src + ".lock";
      try { await fs.rename(src, lock); } catch { continue; }
      try {
        const raw = await fs.readFile(lock, "utf8");
        const task = JSON.parse(raw);
        if (!task.id) task.id = path.basename(e.name, ".json");
        await processTask(task);
      } catch (err) {
        log("queue.error", err?.message || String(err));
      } finally {
        try { await fs.rm(lock, { force: true }); } catch {}
      }
    }
  } catch (e) {
    // молча — очередь необязательна
  }
}
setInterval(sweepQueueOnce, 1000);
sweepQueueOnce();

// ---------- MCP handlers ----------
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const started = Date.now();
  try {
    assertAuth(req?.headers || {});
    const { name, arguments: a = {} } = req.params ?? {};
    log(
      `tool.call -> ${name}`,
      JSON.stringify({ a: name === "write_file" ? { ...a, content: a.content?.length } : a })
    );

    if (name === "ping") return asText({ ok: true, echo: a.msg ?? null });

    if (name === "health") {
      return asText({
        ok: true,
        root: ROOT,
        node: process.version,
        platform: `${process.platform} ${os.release()}`,
        tools: Object.keys(TOOL_DEFS),
        auth: REQUIRED_TOKEN ? "required" : "none",
      });
    }

    if (name === "list_files") {
      const dir = safeJoin(a.dir || ".");
      const list = await fs.readdir(dir, { withFileTypes: true });
      const items = list.map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" }));
      return asText({ dir: path.relative(ROOT, dir) || ".", items });
    }

    if (name === "read_file") {
      const abs = safeJoin(a.path);
      const content = await fs.readFile(abs, "utf8");
      const MAX = 200_000;
      const body = content.length > MAX ? content.slice(0, MAX) + "\n[...truncated...]" : content;
      return { content: [{ type: "text", text: body }] };
    }

    if (name === "write_file") {
      const abs = safeJoin(a.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, a.content, "utf8");
      return asText({ ok: true, path: path.relative(ROOT, abs), bytes: Buffer.byteLength(a.content, "utf8") });
    }

    if (name === "delete_file") {
      const abs = safeJoin(a.path);
      await fs.rm(abs, { force: true });
      return asText({ ok: true, path: path.relative(ROOT, abs) });
    }

    if (name === "open_vscode") {
      const target = safeJoin(a.path);
      const args = [];
      if (a.reuseWindow ?? true) args.push("--reuse-window");
      if (a.wait ?? false) args.push("--wait");
      args.push(target);
      const child = spawn(findCodeCmd(), args, { stdio: "ignore", shell: true, detached: true });
      child.unref();
      return asText({ started: true, target: path.relative(ROOT, target) || "." });
    }

    if (name === "open_repo_in_vscode") {
      const child = spawn(findCodeCmd(), ["--reuse-window", ROOT], { stdio: "ignore", shell: true, detached: true });
      child.unref();
      return asText({ started: true, target: "." });
    }

    if (name === "search_code") {
      const { q, globs = ["**/*"], limit = 200 } = a;
      const rgArgs = ["--line-number", "--color", "never", "--hidden", "--follow", "-m", String(limit), q, ...globs];
      const { code, stdout, stderr } = await runProc("rg", rgArgs);
      if (code !== 0 && !stdout) return asText({ error: "rg failed", stderr });
      return asText(stdout || "(no matches)");
    }

    if (name === "replace_in_file") {
      const abs = safeJoin(a.path);
      const orig = await fs.readFile(abs, "utf8");
      const next = replaceAll(orig, a.find, a.replace);
      if (next === orig) return asText({ changed: false, reason: "no occurrences" });
      await fs.writeFile(abs, next, "utf8");
      return asText({ changed: true, path: path.relative(ROOT, abs) });
    }

    if (name === "shell_run") {
      const { cmd, args = [], cwd = ".", timeoutMs = 120000 } = a;
      const allow = await loadAllow();
      if (!allow.has(cmd)) {
        return asText({ denied: true, reason: "command not allowed", cmd, allow: [...allow] });
      }
      const absCwd = safeJoin(cwd);
      const child = spawn(cmd, args, { cwd: absCwd, shell: process.platform === "win32" });
      let out = "", err = "";
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; try { child.kill(); } catch {} }, timeoutMs);
      child.stdout.on("data", (b) => (out += b.toString()));
      child.stderr.on("data", (b) => (err += b.toString()));
      const code = await new Promise((res) => child.on("close", res));
      clearTimeout(timer);
      const MAX = 200_000;
      const trunc = (s) => (s && s.length > MAX ? s.slice(0, MAX) + "\n[...truncated...]" : s);
      return asText({ cmd, args, cwd: path.relative(ROOT, absCwd) || ".", code, timedOut, stdout: trunc(out), stderr: trunc(err) });
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (e) {
    const msg = e?.message || String(e);
    if (e?.status) log(`tool.error ${e.status}:`, msg);
    else log("tool.error:", msg);
    return asError(msg);
  } finally {
    log("tool.done", `+${Date.now() - started}ms`);
  }
});

server.setNotificationHandler(InitializedNotificationSchema, async () => {});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(TOOL_DEFS).map(([name, def]) => ({
    name,
    description: def.description || "",
    inputSchema: def.inputSchema || { type: "object", properties: {} },
  }));
  return { tools };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
server.setRequestHandler(ReadResourceRequestSchema, async () => {
  const err = new Error("Resource not found");
  err.status = 404;
  throw err;
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
server.setRequestHandler(GetPromptRequestSchema, async () => {
  const err = new Error("Prompt not found");
  err.status = 404;
  throw err;
});

// ---------- bootstrap ----------
const transport = new StdioServerTransport();
await ensureDirs();
await server.connect(transport);

log("MCP up:", {
  name: NAME,
  version: VERSION,
  root: ROOT,
  node: process.version,
  auth: REQUIRED_TOKEN ? maskToken(REQUIRED_TOKEN) : "off",
  queueDir: path.relative(ROOT, QUEUE_DIR),
  outDir: path.relative(ROOT, OUT_DIR),
});

process.on("SIGINT", () => { log("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { log("SIGTERM"); process.exit(0); });
process.on("unhandledRejection", (e) => log("UNHANDLED", e));
process.on("uncaughtException", (e) => log("UNCAUGHT", e));
