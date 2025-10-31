// codex-tools.js
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

const DEFAULT_CWD = process.env.PROJECT_ROOT || process.cwd();
const CODEX_BIN = process.env.CODEX_BIN || (
  os.platform() === "win32"
    ? "C:\\\\Users\\\\stasv\\\\AppData\\\\Roaming\\\\npm\\\\codex.cmd"
    : "codex"
);
const CODEX_CLI = process.env.CODEX_CLI || path.resolve(DEFAULT_CWD, "codex-cli.mjs");

function runSpawn(cmd, args, { cwd = DEFAULT_CWD, input, timeoutMs = 300000, maxBytes = 10 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args ?? [], { cwd, shell: false });
    let out = Buffer.alloc(0);
    let err = Buffer.alloc(0);
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (c) => {
      out = Buffer.concat([out, c]);
      if (out.length > maxBytes) out = out.subarray(out.length - maxBytes);
    });
    child.stderr.on("data", (c) => {
      err = Buffer.concat([err, c]);
      if (err.length > maxBytes) err = err.subarray(err.length - maxBytes);
    });

    child.on("error", (e) => { clearTimeout(killTimer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(killTimer);
      resolve({ exitCode: code ?? -1, stdout: out.toString("utf8"), stderr: err.toString("utf8") });
    });

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

// Инструмент: codex.run
export async function codexRunTool({ cmd, args, cwd, input }) {
  if (!cmd) cmd = CODEX_BIN;
  const res = await runSpawn(cmd, args, { cwd, input, timeoutMs: 600000, maxBytes: 20 * 1024 * 1024 });
  return res;
}

// Инструмент: codex.apply_patch (через git apply --whitespace=nowarn)
export async function codexApplyPatchTool({ diff, cwd }) {
  if (!diff || diff.trim().length < 10) return { exitCode: 1, stdout: "", stderr: "empty diff" };
  const res = await runSpawn("git", ["apply", "--whitespace=nowarn", "-p0"], { cwd, input: diff, timeoutMs: 300000 });
  return res;
}

// Инструмент: codex.search (rg)
export async function codexSearchTool({ q, globs = ["**/*"], cwd }) {
  const args = ["--line-number", "--hidden", "--color", "never", q, ...globs];
  const res = await runSpawn("rg", args, { cwd, timeoutMs: 180000 });
  return res;
}

// Новый инструмент: прямой диалог с codex-cli
export async function codexPromptTool({
  prompt,
  system,
  model,
  effort,
  maxTokens,
  temperature,
  topP,
  store = true,
  stream = false,
  json = false,
  cwd,
  input
}) {
  const args = [CODEX_CLI];
  if (model) args.push("-m", model);
  if (effort) args.push("-r", effort);
  if (system) args.push("--system", system);
  if (typeof maxTokens === "number") args.push("--max-tokens", String(maxTokens));
  if (typeof temperature === "number") args.push("--temp", String(temperature));
  if (typeof topP === "number") args.push("--top-p", String(topP));
  if (store === false) args.push("--no-store");
  if (stream) args.push("--stream");
  if (json) args.push("--json");
  if (prompt) args.push(prompt);

  const res = await runSpawn(process.execPath, args, {
    cwd,
    input,
    timeoutMs: 600000,
    maxBytes: 20 * 1024 * 1024
  });
  return res;
}
