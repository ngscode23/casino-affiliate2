// mcp-server.mjs — v0.8.0 (worker pool, async queue, streaming logs, idle-aware timeouts, VSCode logs, limits)
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
import fssync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import crypto from "node:crypto";

// ---------- constants ----------
const ROOT = process.cwd();
const REQUIRED_TOKEN = process.env.MCP_SECRET || "";           // "" → auth off (warn)
const NAME = "local-tools";
const VERSION = "0.8.0";

const ALLOWLIST_PATH = path.resolve(ROOT, "scripts/agent-allowlist.json");
const DEFAULT_ALLOW = new Set(["pnpm", "node", "git", "rg", "powershell", "pwsh", "cmd"]);

const QUEUE_DIR = path.resolve(ROOT, "shell-queue");
const OUT_DIR   = path.resolve(ROOT, "shell-out");
const CANCEL_DIR= path.resolve(ROOT, path.join("shell-queue", "cancel"));

const DEFAULT_EXCLUDES = ["!/node_modules/","!/.git/","!/.next/","!/.turbo/","!/.pnpm-store/"];

// pool & timeouts
const WORKERS          = Math.max(1, parseInt(process.env.WORKERS || "4", 10));
const QUEUE_POLL_MS    = Math.max(200, parseInt(process.env.QUEUE_POLL_MS || "750", 10));
const TASK_TIMEOUT_MS  = Math.max(10_000, parseInt(process.env.TASK_TIMEOUT_MS || "600000", 10));     // 10 минут
const IDLE_TIMEOUT_MS  = Math.max(5_000, parseInt(process.env.IDLE_TIMEOUT_MS || "120000", 10));      // 2 минуты простоя
// зеркало stdout задач в терминале VS Code
const MIRROR_STDOUT    = (process.env.MCP_STDOUT_MIRROR || "0") === "1";
// усечение логов по хвосту
const MAX_LOG_BYTES    = Math.max(262144, parseInt(process.env.MCP_MAX_LOG_BYTES || "5242880", 10)); // 5 MiB
// лимиты параллельности по именам команд
const PER_CMD_LIMIT = {
  pnpm: parseInt(process.env.MCP_LIMIT_PNPM || "1", 10),
};

// ---------- utils ----------
function log(...args) {
  const ts = new Date().toISOString();
  console.error(`[${ts}]`, ...args);
}
function maskToken(s = "") {
  if (!s) return "";
  return s.length <= 8 ? "" : s.slice(0,2) + "…" + s.slice(-2);
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
  if (!abs.startsWith(rootNorm) && abs !== path.resolve(ROOT)) {
    throw new Error("Path outside project");
  }
  return abs;
}
function findCodeCmd() {
  return process.platform === "win32" ? "code.cmd" : "code";
}
function asText(data) {
  const text = typeof data === "string" ? data : "json\n" + JSON.stringify(data, null, 2) + "\n";
  return { content: [{ type: "text", text }] };
}
function asJSON(data) {
  return { content: [{ type: "json", json: data }] };
}
function asError(message, data) {
  return {
    content: [
      { type: "text", text: `Error: ${message}\n` + (data ? "```json\n" + JSON.stringify(data, null, 2) + "\n```" : "") }
    ],
  };
}
function replaceAll(str, find, repl) {
  return (str ?? "").split(find).join(repl);
}
async function assertAllowedCommand(cmd) {
  const allow = await loadAllow();
  if (!allow.has(cmd)) {
    const err = new Error(`Command not allowed: ${cmd}`);
    err.status = 403;
    err.allow = [...allow];
    throw err;
  }
}
function formatProcResult(cmd, args, result, extra = {}) {
  return {
    cmd,
    args,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    ...extra,
  };
}
async function readJsonFile(p) {
  const abs = safeJoin(p);
  const raw = await fs.readFile(abs, "utf8");
  return { abs, data: JSON.parse(raw) };
}
async function writeJsonFile(p, data, { spaces = 2, newline = true } = {}) {
  const abs = safeJoin(p);
  const json = JSON.stringify(data, null, spaces);
  const text = newline && !json.endsWith("\n") ? json + "\n" : json;
  await fs.writeFile(abs, text, "utf8");
  return abs;
}
async function readPackageScripts(cwd = ROOT) {
  const abs = safeJoin(cwd);
  const pkgPath = path.join(abs, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    return { path: pkgPath, scripts: pkg.scripts || {}, workspaces: pkg.workspaces || null };
  } catch (error) {
    return { path: pkgPath, scripts: {}, error: error?.message || String(error) };
  }
}
const SAFE_ENV_PREFIXES = (process.env.MCP_SAFE_ENV_PREFIXES || "NEXT_PUBLIC_,PUBLIC_,REACT_APP_")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SAFE_ENV_KEYS = (process.env.MCP_SAFE_ENV_KEYS || "NODE_ENV,APP_ENV,NEXT_PUBLIC_APP_ENV")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
function collectSafeEnv({ keys = SAFE_ENV_KEYS, prefixes = SAFE_ENV_PREFIXES, includeValues = false } = {}) {
  const out = {};
  for (const key of Object.keys(process.env)) {
    if (keys.includes(key) || prefixes.some((p) => key.startsWith(p))) {
      out[key] = includeValues ? maskToken(process.env[key]) : true;
    }
  }
  return out;
}

// allowlist cache with TTL
let _allowCache = { set: new Set(DEFAULT_ALLOW), ts: 0 };
const ALLOW_TTL_MS = 10_000;

async function loadAllow() {
  const now = Date.now();
  if (now - _allowCache.ts < ALLOW_TTL_MS) return _allowCache.set;
  try {
    const raw = await fs.readFile(ALLOWLIST_PATH, "utf8");
    const j = JSON.parse(raw);
    const arr = Array.isArray(j?.allowed) ? j.allowed : [];
    _allowCache = { set: new Set(arr), ts: now };
  } catch {
    _allowCache = { set: new Set(DEFAULT_ALLOW), ts: now };
  }
  return _allowCache.set;
}

async function ensureDirs() {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(CANCEL_DIR, { recursive: true });
}

async function listFilesByGlobs(globs = ["**/*"], { cwd = ROOT } = {}) {
  const args = ["--files", "--hidden", "--follow"];
  for (const g of [...globs, ...DEFAULT_EXCLUDES]) args.push("-g", g);
  const { code, stdout } = await runProc("rg", args, { cwd });
  if (code !== 0 && !stdout) return [];
  return stdout.split(/\r?\n/).filter(Boolean);
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

function randomId() {
  return crypto.randomBytes(8).toString("hex");
}

function nowIso() {
  return new Date().toISOString();
}

// параллельность по командам
const runningByCmd = new Map(); // cmd -> count
async function withCmdLimit(cmd, fn) {
  const lim = Number.isFinite(PER_CMD_LIMIT[cmd]) ? PER_CMD_LIMIT[cmd] : Infinity;
  while ((runningByCmd.get(cmd) || 0) >= lim) {
    await new Promise(r => setTimeout(r, 250));
  }
  runningByCmd.set(cmd, (runningByCmd.get(cmd) || 0) + 1);
  try { return await fn(); }
  finally { runningByCmd.set(cmd, (runningByCmd.get(cmd) || 0) - 1); }
}

// ---------- task queue helpers ----------
/**
 * Task file format (json):
 * {
 *   id, cmd, args[], cwd, timeoutMs, idleTimeoutMs,
 *   priority (int, default 100),
 *   attempt (int), maxRetries (int), backoffMs (int),
 *   createdAt, meta: {}, env?:{}
 * }
 */

async function writeResultFiles(id, partial) {
  const jsonPath = path.join(OUT_DIR, `${id}.json`);
  const text = JSON.stringify(partial, null, 2);
  await fs.writeFile(jsonPath, text, "utf8");
}

function openStreamLog(id) {
  const logPath = path.join(OUT_DIR, `${id}.log`);
  const stream = fssync.createWriteStream(logPath, { flags: "a", encoding: "utf8" });
  return { logPath, stream };
}

async function listTasksSorted() {
  const entries = await fs.readdir(QUEUE_DIR, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    if (e.name.includes(".lock.")) continue;
    const full = path.join(QUEUE_DIR, e.name);
    try {
      const raw = await fs.readFile(full, "utf8");
      const t = JSON.parse(raw);
      const pr = Number.isFinite(t?.priority) ? t.priority : 100;
      const created = t?.createdAt || "9999";
      items.push({ path: full, priority: pr, createdAt: created });
    } catch {}
  }
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return items;
}

async function claimNextTask(workerTag) {
  const items = await listTasksSorted();
  for (const it of items) {
    const src = it.path;
    const lock = src + `.lock.${process.pid}.${workerTag}`;
    try {
      await fs.rename(src, lock); // атомарно захватили
      return lock;
    } catch {
      continue;
    }
  }
  return null;
}

async function checkCanceled(id) {
  try {
    await fs.access(path.join(CANCEL_DIR, id));
    return true;
  } catch {
    return false;
  }
}

function killTree(child) {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    } else {
      process.kill(-child.pid, "SIGKILL");
    }
  } catch {}
  try { child.kill(); } catch {}
}

// core exec streaming with adaptive timeouts and cancel
async function execStreamingTask(task) {
  const {
    id,
    cmd,
    args = [],
    cwd = ".",
    timeoutMs = TASK_TIMEOUT_MS,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
  } = task;

  const allow = await loadAllow();
  if (!allow.has(cmd)) {
    const res = { id, denied: true, reason: "command not allowed", cmd, allow: [...allow], finishedAt: nowIso() };
    await writeResultFiles(id, res);
    return res;
  }

  const absCwd = safeJoin(cwd || ".");
  const env = {
    ...process.env,
    ...(task.env || {}),
    MCP_TASK_ID: String(id),
    MCP_ATTEMPT: String(task.attempt || 0),
  };
  const child = spawn(cmd, args, {
    cwd: absCwd,
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    env,
  });

  const { stream } = openStreamLog(id);

  let stdoutSize = 0;
  let stderrSize = 0;
  let lastActivity = Date.now();
  let timedOut = false;
  let idleTimedOut = false;
  let canceled = false;

  const MAX_JSON_SNIPPET = 5000;

  function onDataWrite(buf) {
    const s = buf.toString();
    stream.write(s);
    if (MIRROR_STDOUT) { try { process.stdout.write(`[${id}] ${s}`); } catch {} }
    lastActivity = Date.now();
  }

  child.stdout.on("data", (b) => { stdoutSize += b.length; onDataWrite(b); });
  child.stderr.on("data", (b) => { stderrSize += b.length; onDataWrite(b); });

  const hardTimer = setTimeout(() => {
    timedOut = true;
    try { killTree(child); } catch {}
  }, timeoutMs);

  const idleTicker = setInterval(() => {
    if (Date.now() - lastActivity > idleTimeoutMs) {
      idleTimedOut = true;
      try { killTree(child); } catch {}
    }
  }, Math.min(1000, Math.max(250, Math.floor(idleTimeoutMs / 4))));

  const cancelTicker = setInterval(async () => {
    if (await checkCanceled(id)) {
      canceled = true;
      try { killTree(child); } catch {}
    }
  }, 1000);

  const code = await new Promise((res) => child.on("close", res));

  clearTimeout(hardTimer);
  clearInterval(idleTicker);
  clearInterval(cancelTicker);
  try { stream.end(); } catch {}

  // усечение больших логов
  try {
    const logPath2 = path.join(OUT_DIR, `${id}.log`);
    const st2 = await fs.stat(logPath2);
    if (st2.size > MAX_LOG_BYTES) {
      const keep = Math.min(st2.size, MAX_LOG_BYTES);
      const fd2 = await fs.open(logPath2, 'r');
      const buf2 = Buffer.alloc(keep);
      await fd2.read(buf2, 0, keep, st2.size - keep);
      await fd2.close();
      await fs.writeFile(logPath2, Buffer.concat([Buffer.from(`[truncated to last ${keep} bytes]\n`), buf2]));
    }
  } catch {}

  // tiny tail for convenience
  let tail = "";
  try {
    const logPath = path.join(OUT_DIR, `${id}.log`);
    const stat = await fs.stat(logPath);
    const fd = await fs.open(logPath, "r");
    const size = Math.min(MAX_JSON_SNIPPET, stat.size);
    const buf = Buffer.alloc(size);
    await fd.read(buf, 0, size, stat.size - size);
    await fd.close();
    tail = buf.toString();
  } catch {}

  const result = {
    id,
    cmd,
    args,
    cwd: path.relative(ROOT, absCwd) || ".",
    code,
    canceled,
    timedOut,
    idleTimedOut,
    stdoutBytes: stdoutSize,
    stderrBytes: stderrSize,
    tail,
    finishedAt: nowIso(),
  };
  await writeResultFiles(id, result);
  return result;
}

async function requeueOnFail(lockPath, task, execRes) {
  const { code, timedOut, idleTimedOut, canceled } = execRes;
  if (canceled) return;
  const failed = code !== 0 || timedOut || idleTimedOut;
  if (!failed) return;

  const attempt = (task.attempt ?? 0) + 1;
  const maxRetries = Number.isFinite(task.maxRetries) ? task.maxRetries : 0;
  if (attempt > maxRetries) return;

  const backoff = Math.max(0, Number(task.backoffMs ?? 2000)) * attempt;
  const nextId = task.id;
  const dst = path.join(QUEUE_DIR, `${nextId}.json`);
  const nextTask = {
    ...task,
    attempt,
    scheduledAt: Date.now() + backoff,
  };
  await fs.writeFile(dst, JSON.stringify(nextTask, null, 2), "utf8");
  log("queue.requeue", { id: nextId, attempt, backoff });
}

async function processLockFile(lockPath) {
  let task;
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    task = JSON.parse(raw);
  } catch (e) {
    log("queue.read.error", e?.message || String(e));
    try { await fs.rm(lockPath, { force: true }); } catch {}
    return;
  }

  if (!task.id) task.id = path.basename(lockPath, ".json").split(".lock.")[0];

  if (task.scheduledAt && Date.now() < task.scheduledAt) {
    const back = path.join(QUEUE_DIR, `${task.id}.json`);
    try {
      await fs.writeFile(back, JSON.stringify(task, null, 2), "utf8");
      await fs.rm(lockPath, { force: true });
    } catch {}
    return;
  }

  try {
    const res = await withCmdLimit(task.cmd, () => execStreamingTask(task));
    await requeueOnFail(lockPath, task, res);
  } catch (err) {
    log("queue.exec.error", err?.message || String(err));
  } finally {
    try { await fs.rm(lockPath, { force: true }); } catch {}
  }
}

async function workerLoop(workerTag) {
  while (true) {
    try {
      await ensureDirs();
      const lock = await claimNextTask(workerTag);
      if (lock) {
        await processLockFile(lock);
        continue;
      }
    } catch (e) {
      log(`worker[${workerTag}]`, e?.message || String(e));
    }
    await new Promise((r) => setTimeout(r, QUEUE_POLL_MS));
  }
}

// bootstrap workers
for (let i = 0; i < WORKERS; i++) {
  workerLoop(String(i));
}

// ---------- helpers for existing tools ----------
async function doWriteFiles(files = [], { atomic = true, dryRun = false } = {}) {
  const results = [];
  const backups = [];
  try {
    for (const f of files) {
      const abs = safeJoin(f.path);
      const exists = await fs.stat(abs).then(() => true).catch(() => false);
      const before = exists ? await fs.readFile(abs, "utf8") : "";
      let after = before;
      const mode = f.mode || "overwrite";
      if (mode === "overwrite") after = f.content;
      if (mode === "append")   after = before + f.content;
      if (mode === "prepend")  after = f.content + before;
      results.push({ path: path.relative(ROOT, abs) || ".", bytesBefore: Buffer.byteLength(before, "utf8"), bytesAfter: Buffer.byteLength(after, "utf8") });
      backups.push({ abs, before });
      if (!dryRun) {
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, after, "utf8");
      }
    }
    return { ok: true, results, dryRun };
  } catch (e) {
    if (atomic && !dryRun) {
      for (const b of backups) { try { await fs.writeFile(b.abs, b.before, "utf8"); } catch {} }
    }
    return { ok: false, error: e?.message || String(e), results, dryRun };
  }
}

async function doBatchReplace({ find, replace, regex = false, globs = ["**/*"], limitPerFile = 1000000, dryRun = true }) {
  const files = await listFilesByGlobs(globs);
  const changed = [];
  let totalOccurrences = 0;
  let pattern = null;
  if (regex) {
    try { pattern = new RegExp(find, "g"); } catch (e) { return { ok: false, error: "Invalid regex: " + (e?.message || String(e)) }; }
  }
  for (const rel of files) {
    const abs = safeJoin(rel);
    let content = await fs.readFile(abs, "utf8");
    let next = content;
    let count = 0;
    if (regex) {
      next = content.replace(pattern, (m) => { count++; if (count > limitPerFile) return m; return replace; });
    } else {
      const idx = content.indexOf(find);
      if (idx !== -1) {
        next = content.split(find).join(replace);
        count = (content.length - content.split(find).join("").length) / find.length;
      }
    }
    if (count > 0) {
      totalOccurrences += count;
      changed.push({ path: rel, occurrences: count, bytesBefore: Buffer.byteLength(content, "utf8"), bytesAfter: Buffer.byteLength(next, "utf8") });
      if (!dryRun) { await fs.writeFile(abs, next, "utf8"); }
    }
  }
  return { ok: true, filesChanged: changed.length, totalOccurrences, changed, dryRun };
}

async function doApplyPatch(diffText, { reverse = false, index = false } = {}) {
  const allow = await loadAllow();
  if (!allow.has("git")) return { ok: false, error: "git not allowed" };
  const tmp = path.join(QUEUE_DIR, "patch-" + Date.now() + ".diff");
  await fs.writeFile(tmp, diffText, "utf8");
  const args = ["apply", "--reject", "--whitespace=fix"];
  if (reverse) args.push("--reverse");
  if (index)   args.push("--index");
  args.push(tmp);
  const { code, stdout, stderr } = await runProc("git", args, { cwd: ROOT });
  try { await fs.rm(tmp, { force: true }); } catch {}
  return { ok: code === 0, code, stdout, stderr };
}

// ---------- tools ----------
const TOOL_DEFS = {
  ping: { description: "Echo helper to verify connectivity", inputSchema: { type: "object", properties: { msg: { type: "string" } } } },
  health: { description: "Runtime health information", inputSchema: { type: "object", properties: {} } },

  list_files: { description: "List files/dirs via ripgrep --files", inputSchema: { type: "object", properties: { dir: { type: "string", default: "." } } } },
  read_file: { description: "Read a UTF-8 file", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  write_file: { description: "Write/overwrite a UTF-8 file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  delete_file: { description: "Delete file or directory", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  mkdirp: { description: "Create directory recursively", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  move_file: { description: "Move or rename file", inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, overwrite: { type: "boolean", default: false }, createDirs: { type: "boolean", default: true } }, required: ["from", "to"] } },

  open_vscode: { description: "Open path in VS Code", inputSchema: { type: "object", properties: { path: { type: "string" }, reuseWindow: { type: "boolean", default: true }, wait: { type: "boolean", default: false } }, required: ["path"] } },
  open_repo_in_vscode: { description: "Open repository root in VS Code", inputSchema: { type: "object", properties: {} } },

  search_code: { description: "Code search via ripgrep", inputSchema: { type: "object", properties: { q: { type: "string" }, globs: { type: "array", items: { type: "string" }, default: ["**/*"] }, limit: { type: "number", default: 200 } }, required: ["q"] } },
  replace_in_file: { description: "Replace first occurrences in file", inputSchema: { type: "object", properties: { path: { type: "string" }, find: { type: "string" }, replace: { type: "string" } }, required: ["path", "find", "replace"] } },
  write_files: { description: "Write multiple files in one call", inputSchema: { type: "object", properties: { files: { type: "array", items: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, mode: { type: "string", enum: ["overwrite", "append", "prepend"], default: "overwrite" } }, required: ["path", "content"] } }, atomic: { type: "boolean", default: true }, dryRun: { type: "boolean", default: false } }, required: ["files"] } },
  batch_replace: { description: "Replace text across many files", inputSchema: { type: "object", properties: { find: { type: "string" }, replace: { type: "string" }, regex: { type: "boolean", default: false }, globs: { type: "array", items: { type: "string" }, default: ["**/*"] }, limitPerFile: { type: "number", default: 1000000 }, dryRun: { type: "boolean", default: true } }, required: ["find", "replace"] } },
  apply_patch: { description: "Apply unified diff through git", inputSchema: { type: "object", properties: { diff: { type: "string" }, reverse: { type: "boolean", default: false }, index: { type: "boolean", default: false } }, required: ["diff"] } },

  read_json: { description: "Read JSON file and parse", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  write_json: { description: "Write JSON file (pretty)", inputSchema: { type: "object", properties: { path: { type: "string" }, data: {}, spaces: { type: "number", default: 2 }, newline: { type: "boolean", default: true } }, required: ["path", "data"] } },
  list_scripts: { description: "List package.json scripts", inputSchema: { type: "object", properties: { cwd: { type: "string", default: "." } } } },
  run_script: { description: "Run pnpm script", inputSchema: { type: "object", properties: { script: { type: "string" }, args: { type: "array", items: { type: "string" }, default: [] }, cwd: { type: "string", default: "." } }, required: ["script"] } },

  git_status: { description: "git status (porcelain)", inputSchema: { type: "object", properties: { cwd: { type: "string", default: "." }, porcelain: { type: "boolean", default: true }, branch: { type: "boolean", default: true }, extraArgs: { type: "array", items: { type: "string" }, default: [] } } } },
  git_diff: { description: "git diff (worktree/index)", inputSchema: { type: "object", properties: { cwd: { type: "string", default: "." }, staged: { type: "boolean", default: false }, path: { type: "string" }, stat: { type: "boolean", default: false }, extraArgs: { type: "array", items: { type: "string" }, default: [] } } } },
  git_log: { description: "git log summary", inputSchema: { type: "object", properties: { cwd: { type: "string", default: "." }, limit: { type: "number", default: 20 }, format: { type: "string", default: "%h %ci %an %s" }, path: { type: "string" }, extraArgs: { type: "array", items: { type: "string" }, default: [] } } } },

  inspect_env: { description: "Show safe environment variables", inputSchema: { type: "object", properties: { includeValues: { type: "boolean", default: false }, keys: { type: "array", items: { type: "string" } }, prefixes: { type: "array", items: { type: "string" } } } } },
  search_logs: { description: "Search worker log files", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 20 }, caseSensitive: { type: "boolean", default: false } }, required: ["query"] } },

  shell_run: { description: "Execute command immediately (allowlist + timeout)", inputSchema: { type: "object", properties: { cmd: { type: "string" }, args: { type: "array", items: { type: "string" }, default: [] }, cwd: { type: "string" }, timeoutMs: { type: "number", default: 120000 } }, required: ["cmd"] } },

  enqueue_shell: { description: "Enqueue command for async execution", inputSchema: { type: "object", properties: {
    cmd: { type: "string" },
    args: { type: "array", items: { type: "string" }, default: [] },
    cwd: { type: "string", default: "." },
    timeoutMs: { type: "number", default: TASK_TIMEOUT_MS },
    idleTimeoutMs: { type: "number", default: IDLE_TIMEOUT_MS },
    priority: { type: "number", default: 100 },
    maxRetries: { type: "number", default: 0 },
    backoffMs: { type: "number", default: 2000 },
    env: { type: "object" },
    meta: { type: "object" },
    id: { type: "string" }
  }, required: ["cmd"] } },
  task_status: { description: "Inspect async task result", inputSchema: { type: "object", properties: { id: { type: "string" }, tailBytes: { type: "number", default: 4000 } }, required: ["id"] } },
  cancel_task: { description: "Request async task cancellation", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  queue_info: { description: "Queue metrics (pending/locked)", inputSchema: { type: "object", properties: {} } },
  list_logs: { description: "List worker log files", inputSchema: { type: "object", properties: { limit: { type: "number", default: 20 } } } },
  tail_log: { description: "Tail worker log by id", inputSchema: { type: "object", properties: { id: { type: "string" }, bytes: { type: "number", default: 8000 } }, required: ["id"] } },
};

const SERVER_CAPABILITIES = { resources: {}, prompts: {}, tools: TOOL_DEFS };

// ---------- server ----------
const server = new Server({ name: NAME, version: VERSION }, { capabilities: SERVER_CAPABILITIES });

// ---------- MCP handlers ----------
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const started = Date.now();
  try {
    assertAuth(req?.headers || {});
    const { name, arguments: a = {} } = req.params ?? {};
    log(`tool.call -> ${name}`, JSON.stringify({ a: name === "write_file" ? { ...a, content: a.content?.length } : a }));

    if (name === "ping") return asText({ ok: true, echo: a.msg ?? null });

    if (name === "health") {
      return asText({
        ok: true,
        root: ROOT,
        node: process.version,
        platform: `${process.platform} ${os.release()}`,
        tools: Object.keys(TOOL_DEFS),
        auth: REQUIRED_TOKEN ? "required" : "none",
        workers: WORKERS,
        queuePollMs: QUEUE_POLL_MS,
        timeouts: { task: TASK_TIMEOUT_MS, idle: IDLE_TIMEOUT_MS },
        mirrorStdout: MIRROR_STDOUT,
        perCmdLimit: PER_CMD_LIMIT,
        maxLogBytes: MAX_LOG_BYTES
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

    if (name === "write_files") {
      const r = await doWriteFiles(a.files || [], { atomic: a.atomic ?? true, dryRun: a.dryRun ?? false });
      return asText(r);
    }

    if (name === "mkdirp") {
      const abs = safeJoin(a.path);
      await fs.mkdir(abs, { recursive: true });
      return asText({ ok: true, path: path.relative(ROOT, abs) || "." });
    }

    if (name === "move_file") {
      const from = safeJoin(a.from);
      const to   = safeJoin(a.to);
      if (a.createDirs ?? true) await fs.mkdir(path.dirname(to), { recursive: true });
      if (!(a.overwrite ?? false)) {
        const exists = await fs.stat(to).then(() => true).catch(() => false);
        if (exists) return asText({ ok: false, error: "target exists", to: path.relative(ROOT, to) });
      }
      await fs.rename(from, to).catch(async () => {
        const data = await fs.readFile(from);
        await fs.writeFile(to, data);
        await fs.rm(from, { force: true });
      });
      return asText({ ok: true, from: path.relative(ROOT, from), to: path.relative(ROOT, to) });
    }

    if (name === "delete_file") {
      const abs = safeJoin(a.path);
      await fs.rm(abs, { force: true, recursive: true });
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
      const rgArgs = ["--line-number", "--color", "never", "--hidden", "--follow", "-m", String(limit), q];
      for (const g of [...globs, ...DEFAULT_EXCLUDES]) rgArgs.push("-g", g);
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

    if (name === "batch_replace") {
      const r = await doBatchReplace({ find: a.find, replace: a.replace, regex: a.regex ?? false, globs: a.globs ?? ["**/*"], limitPerFile: a.limitPerFile ?? 1000000, dryRun: a.dryRun ?? true });
      return asText(r);
    }

    if (name === "apply_patch") {
      const r = await doApplyPatch(a.diff, { reverse: a.reverse ?? false, index: a.index ?? false });
      return asText(r);
    }

    if (name === "read_json") {
      const { abs, data } = await readJsonFile(a.path);
      return asText({ path: path.relative(ROOT, abs), data });
    }

    if (name === "write_json") {
      const abs = await writeJsonFile(a.path, a.data, { spaces: a.spaces ?? 2, newline: a.newline ?? true });
      return asText({ ok: true, path: path.relative(ROOT, abs) });
    }

    if (name === "list_scripts") {
      const info = await readPackageScripts(a.cwd || ROOT);
      return asText(info);
    }

    if (name === "run_script") {
      await assertAllowedCommand("pnpm");
      const { script, args = [], cwd = "." } = a;
      const res = await withCmdLimit("pnpm", () => runProc("pnpm", ["run", script, ...args], { cwd: safeJoin(cwd) }));
      return asText({ ok: res.code === 0, code: res.code, stdout: res.stdout, stderr: res.stderr });
    }

    if (name === "git_status") {
      await assertAllowedCommand("git");
      const { cwd = ".", porcelain = true, branch = true, extraArgs = [] } = a;
      const args = [];
      if (porcelain) args.push("status", "--porcelain=v1");
      if (branch)    args.push("--branch");
      args.push(...extraArgs);
      const res = await runProc("git", args, { cwd: safeJoin(cwd) });
      return asText({ code: res.code, stdout: res.stdout, stderr: res.stderr });
    }

    if (name === "git_diff") {
      await assertAllowedCommand("git");
      const { cwd = ".", staged = false, path: p, stat = false, extraArgs = [] } = a;
      const args = ["diff"];
      if (staged) args.push("--staged");
      if (stat)   args.push("--stat");
      args.push(...extraArgs);
      if (p) args.push(p);
      const res = await runProc("git", args, { cwd: safeJoin(cwd) });
      return asText({ code: res.code, stdout: res.stdout, stderr: res.stderr });
    }

    if (name === "git_log") {
      await assertAllowedCommand("git");
      const { cwd = ".", limit = 20, format = "%h %ci %an %s", path: p, extraArgs = [] } = a;
      const args = ["log", "-n", String(limit), `--pretty=format:${format}`, ...extraArgs];
      if (p) args.push(p);
      const res = await runProc("git", args, { cwd: safeJoin(cwd) });
      return asText({ code: res.code, stdout: res.stdout, stderr: res.stderr });
    }

    if (name === "inspect_env") {
      const out = collectSafeEnv({ includeValues: a.includeValues ?? false, keys: a.keys ?? SAFE_ENV_KEYS, prefixes: a.prefixes ?? SAFE_ENV_PREFIXES });
      return asText(out);
    }

    if (name === "search_logs") {
      const { query, limit = 20, caseSensitive = false } = a;
      await ensureDirs();
      const args = ["--line-number", "--color", "never", "-m", String(limit)];
      if (!caseSensitive) args.push("-i");
      args.push(query, path.join(OUT_DIR, "*.log"));
      const res = await runProc("rg", args, { cwd: ROOT });
      if (res.code !== 0 && !res.stdout) return asText({ matches: 0, stderr: res.stderr });
      return asText({ matches: res.stdout.split(/\r?\n/).filter(Boolean).length, output: res.stdout });
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

    if (name === "enqueue_shell") {
      const id = String(a.id ?? a.meta?.id ?? randomId());
      const task = {
        id,
        cmd: a.cmd,
        args: a.args ?? [],
        cwd: a.cwd ?? ".",
        timeoutMs: a.timeoutMs ?? TASK_TIMEOUT_MS,
        idleTimeoutMs: a.idleTimeoutMs ?? IDLE_TIMEOUT_MS,
        priority: Number.isFinite(a.priority) ? a.priority : 100,
        maxRetries: Number.isFinite(a.maxRetries) ? a.maxRetries : 0,
        backoffMs: Number.isFinite(a.backoffMs) ? a.backoffMs : 2000,
        attempt: 0,
        createdAt: nowIso(),
        meta: a.meta ?? {},
        env: a.env ?? {}
      };
      const dst = path.join(QUEUE_DIR, `${id}.json`);
      await ensureDirs();
      await fs.writeFile(dst, JSON.stringify(task, null, 2), "utf8");
      return asText({ enqueued: true, id, queue: path.relative(ROOT, QUEUE_DIR) || "." });
    }

    if (name === "task_status") {
      const id = String(a.id);
      const jsonPath = path.join(OUT_DIR, `${id}.json`);
      const logPath  = path.join(OUT_DIR, `${id}.log`);
      const out = { id, exists: false };
      try {
        const raw = await fs.readFile(jsonPath, "utf8");
        out.exists = true;
        out.result = JSON.parse(raw);
      } catch {}
      try {
        const stat = await fs.stat(logPath);
        const tailBytes = Math.max(512, Math.min(1_000_000, a.tailBytes ?? 4000));
        const size = Math.min(tailBytes, stat.size);
        const fd = await fs.open(logPath, "r");
        const buf = Buffer.alloc(size);
        await fd.read(buf, 0, size, stat.size - size);
        await fd.close();
        out.tail = buf.toString();
      } catch {
        out.tail = "";
      }
      return asText(out);
    }

    if (name === "cancel_task") {
      const id = String(a.id);
      await ensureDirs();
      await fs.writeFile(path.join(CANCEL_DIR, id), nowIso(), "utf8");
      return asText({ id, cancel: "requested" });
    }

    if (name === "queue_info") {
      await ensureDirs();
      const all = (await fs.readdir(QUEUE_DIR)).filter(f => f.endsWith('.json') && !f.includes('.lock.'));
      const locks = (await fs.readdir(QUEUE_DIR)).filter(f => f.endsWith('.json') && f.includes('.lock.'));
      return asText({ queued: all.length, locked: locks.length, workers: WORKERS });
    }

    if (name === "list_logs") {
      await ensureDirs();
      const files = (await fs.readdir(OUT_DIR))
        .filter(f => f.endsWith('.log'))
        .map(f => path.join(OUT_DIR, f));
      const stats = await Promise.all(files.map(async p => ({ p, s: await fs.stat(p).catch(() => null) })));
      const items = stats
        .filter(x => x.s)
        .sort((a,b) => b.s.mtimeMs - a.s.mtimeMs)
        .slice(0, Math.max(1, Math.min(200, a.limit ?? 20)))
        .map(x => ({ id: path.basename(x.p, '.log'), log: path.relative(ROOT, x.p), bytes: x.s.size, mtime: x.s.mtime }));
      return asText({ count: items.length, items });
    }

    if (name === "tail_log") {
      const id = String(a.id);
      const p = path.join(OUT_DIR, `${id}.log`);
      const tailBytes = Math.max(512, Math.min(1_000_000, a.bytes ?? 8000));
      try {
        const stat = await fs.stat(p);
        const size = Math.min(tailBytes, stat.size);
        const fd = await fs.open(p, 'r');
        const buf = Buffer.alloc(size);
        await fd.read(buf, 0, size, stat.size - size);
        await fd.close();
        return asText({ id, bytes: size, tail: buf.toString(), path: path.relative(ROOT, p) });
      } catch (e) {
        return asText({ id, error: e?.message || String(e) });
      }
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
    inputSchema: def.inputSchema || { type: "object", properties: {} }
  }));
  return { tools };
});
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
server.setRequestHandler(ReadResourceRequestSchema, async () => { const err = new Error("Resource not found"); err.status = 404; throw err; });
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
server.setRequestHandler(GetPromptRequestSchema, async () => { const err = new Error("Prompt not found"); err.status = 404; throw err; });

// ---------- bootstrap ----------
const transport = new StdioServerTransport();
await ensureDirs();
await server.connect(transport);
if (!REQUIRED_TOKEN) log("WARN: MCP_SECRET not set; tools are open to whoever can reach the transport");
log("MCP up:", {
  name: NAME,
  version: VERSION,
  root: ROOT,
  node: process.version,
  auth: REQUIRED_TOKEN ? maskToken(REQUIRED_TOKEN) : "off",
  queueDir: path.relative(ROOT, QUEUE_DIR),
  outDir: path.relative(ROOT, OUT_DIR),
  workers: WORKERS,
  queuePollMs: QUEUE_POLL_MS,
  timeouts: { task: TASK_TIMEOUT_MS, idle: IDLE_TIMEOUT_MS },
  mirrorStdout: MIRROR_STDOUT,
  perCmdLimit: PER_CMD_LIMIT,
  maxLogBytes: MAX_LOG_BYTES
});

process.on("SIGINT", () => { log("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { log("SIGTERM"); process.exit(0); });
process.on("unhandledRejection", (e) => log("UNHANDLED", e));
process.on("uncaughtException", (e) => log("UNCAUGHT", e));
