#!/usr/bin/env node
// Post an impression to the local Netlify function with a given slug
const slug = process.argv[2] || "test";
const base = process.env.VITE_FUNCTIONS_URL || process.env.FUNCTIONS_URL || "http://localhost:8888/.netlify/functions";
const url = `${base}/track-impression`;

(async () => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug })
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

