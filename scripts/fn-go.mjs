#!/usr/bin/env node
// Call go/<slug> and print the redirect Location without following it
import http from "node:http";
import https from "node:https";

const slug = process.argv[2] || "test";
const base = process.env.VITE_FUNCTIONS_URL || process.env.FUNCTIONS_URL || "http://localhost:8888/.netlify/functions";
const url = new URL(`${base}/go/${encodeURIComponent(slug)}`);

const mod = url.protocol === "https:" ? https : http;
const req = mod.request(url, { method: "GET" }, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Location: ${res.headers.location || "<none>"}`);
  res.resume();
});
req.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
req.end();

