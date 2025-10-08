#!/usr/bin/env node

import OpenAI from "openai";

// Пример: node codex-message.mjs --model gpt-5-codex --text "Объясни, как работает Event Loop в JS"
const args = (() => {
  const a = process.argv.slice(2);
  const out = { model: "gpt-5-codex", text: null, temperature: 0.7 };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === "--model") out.model = a[++i];
    else if (x === "--text") out.text = a[++i];
    else if (x === "--temperature") out.temperature = parseFloat(a[++i]);
  }
  if (!out.text) {
    console.error("❌ Использование: node codex-message.mjs --model gpt-5-codex --text \"твой вопрос\"");
    process.exit(1);
  }
  return out;
})();

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY не задан.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

try {
  const resp = await client.responses.create({
    model: args.model,
    input: [{ role: "user", content: [{ type: "input_text", text: args.text }] }],
    // reasoning: { effort: "medium" }, // включай только если gpt-5-codex
    temperature: args.temperature, // игнорируется reasoning-моделями
  });

  console.log("\n✅ Ответ:");
  console.log(resp.output_text || JSON.stringify(resp, null, 2));
} catch (e) {
  console.error("❌ Ошибка:", e.message);
}