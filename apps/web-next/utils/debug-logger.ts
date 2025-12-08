import { appendFile } from "node:fs/promises";
import path from "node:path";

const LOG_PATH = path.resolve(process.cwd(), "log.txt");

export function logDebug(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  const line = `${new Date().toISOString()} ${label} ${JSON.stringify(payload)}\n`;
  appendFile(LOG_PATH, line).catch(() => {
    /* ignore file write errors */
  });
}
