import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/transports/stdio.js";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
const sh = promisify(exec);

const server = new Server({ name: "local-fileserver", version: "1.0.0" }, {
  capabilities: {
    tools: {
      read_file: {
        description: "Считать содержимое файла",
        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
      },
      run_command: {
        description: "Выполнить shell-команду",
        inputSchema: { type: "object", properties: { cmd: { type: "string" } }, required: ["cmd"] }
      }
    }
  }
});

server.setRequestHandler("tools/call", async ({ name, arguments: a }) => {
  if (name === "read_file") return { content: await fs.readFile(a.path, "utf8") };
  if (name === "run_command") {
    const { stdout, stderr } = await sh(a.cmd, { windowsHide: true });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  }
  throw new Error(`Unknown tool: ${name}`);
});

await server.connect(new StdioServerTransport());
console.log("✅ MCP server started");