import { ServerType, startStdioServer } from "mcp-proxy";

const url = process.env.SUPABASE_MCP_URL || "https://c9f58c104f4c.ngrok-free.app/sse";
const headers = {};

if (process.env.SUPABASE_MCP_AUTH) {
  headers["Authorization"] = process.env.SUPABASE_MCP_AUTH;
}

if (process.env.SUPABASE_MCP_API_KEY) {
  headers["X-API-Key"] = process.env.SUPABASE_MCP_API_KEY;
}

const transportOptions = Object.keys(headers).length ? { headers } : {};

console.error(`[${new Date().toISOString()}] Connecting to Supabase MCP at ${url}`);

await startStdioServer({
  serverType: ServerType.SSE,
  transportOptions,
  url,
});
