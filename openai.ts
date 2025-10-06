import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: { "OpenAI-Beta": "responses-logging" },
});

const run = async () => {
  const res = await client.responses.create({
    model: "gpt-5-codex",
    input: "Оптимизируй этот код.",
    store: true,
    metadata: { source: "codex-cli" },
  });
  console.log(res.output_text);
};

run();

