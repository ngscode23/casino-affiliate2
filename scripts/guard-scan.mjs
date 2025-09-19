// Simple guard scan for banned class patterns in src/**/*
// Bans: Tailwind arbitrary colors like bg-[#...], text-[#...], border-[#...] and legacy classes btn-cta, neon-
// Exits with non-zero if any violations found; prints a concise report.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** Recursively list files under dir */
function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      // skip common output and vendor dirs under src just in case
      if (['__tests__', '__mocks__'].includes(name.name)) continue;
      out.push(...listFiles(join(dir, name.name)));
    } else if (/\.(tsx?|jsx?)$/i.test(name.name)) {
      out.push(join(dir, name.name));
    }
  }
  return out;
}

const patterns = [
  { re: /\bbg-\[#/g, msg: 'Tailwind arbitrary color: bg-[#...]' },
  { re: /\btext-\[#/g, msg: 'Tailwind arbitrary color: text-[#...]' },
  { re: /\bborder-\[#/g, msg: 'Tailwind arbitrary color: border-[#...]' },
  { re: /\bbtn-cta\b/g, msg: 'Legacy class: btn-cta' },
  { re: /\bneon-[a-z0-9_-]+\b/gi, msg: 'Legacy class: neon-*' },
];

const files = listFiles(SRC);
let violations = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const p of patterns) {
    if (p.re.test(text)) {
      violations++;
      console.log(`${f}: ${p.msg}`);
    }
    p.re.lastIndex = 0; // reset sticky regex state
  }
}

if (violations > 0) {
  console.error(`Guard scan failed: ${violations} violation(s) found.`);
  process.exit(1);
} else {
  console.log('Guard scan passed: no banned patterns found.');
}

