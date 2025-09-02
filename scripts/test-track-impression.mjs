// Simple local tester for Netlify Function `track-impression`
// Usage: node scripts/test-track-impression.mjs [slug]
// Requires Netlify Dev running at http://localhost:8888

const slug = process.argv[2] || 'lucky-star';
const url = process.env.FN_URL || 'http://localhost:8888/.netlify/functions/track-impression';

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug })
  });
  const text = await res.text();

  const ts = new Date().toISOString().replace('T',' ').replace('Z','');
  const block = [
    `===== test-track-impression at ${ts} =====`,
    `POST ${url} { slug: ${slug} }`,
    `Status: ${res.status}`,
    text,
    ''
  ].join('\n');

  await BunWrite('.reports/functions.log', block);
  console.log(block);
}

async function BunWrite(path, data) {
  const fs = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.appendFile(path, data, { encoding: 'utf8' });
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

