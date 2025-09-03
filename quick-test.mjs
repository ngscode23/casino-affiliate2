const key = process.env.OPENAI_API_KEY;

if (!key) throw new Error("OPENAI_API_KEY not set");

const r = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-5",                  // ✅ GPT-5
    max_completion_tokens: 300,      // ⚡ ограничиваем вывод
    messages: [
      { role: "system", content: "Отвечай максимально кратко." },
      { role: "user", content: "Скажи OK" }
    ]
  })
});

console.log(r.status, await r.text());