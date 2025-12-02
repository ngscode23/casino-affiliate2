#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CUSTOM_START = '// CUSTOM_TYPES_START';
const CUSTOM_END = '// CUSTOM_TYPES_END';

async function extractCustomBlock(path) {
  try {
    const prev = await readFile(path, 'utf-8');
    const start = prev.indexOf(CUSTOM_START);
    const end = prev.indexOf(CUSTOM_END, start + CUSTOM_START.length);
    if (start === -1 || end === -1) return '';
    return prev.slice(start, end + CUSTOM_END.length).trimEnd() + '\n';
  } catch {
    return '';
  }
}

function extractProjectRef(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^[a-z0-9]{20}$/.test(trimmed)) return trimmed;
  const urlMatch = trimmed.match(/https?:\/\/([a-z0-9]{20})\.supabase\.[a-z.]+\/?/i);
  if (urlMatch) return urlMatch[1];
  const refMatch = trimmed.match(/([a-z0-9]{20})$/i);
  if (refMatch) {
    const candidate = refMatch[1];
    if (/^[a-z0-9]{20}$/.test(candidate)) return candidate;
  }
  return null;
}

const projectRef =
  extractProjectRef(process.env.SUPABASE_PROJECT_REF) ||
  extractProjectRef(process.env.SUPABASE_PROJECT_ID) ||
  extractProjectRef(process.env.SUPABASE_URL) ||
  '';

if (!projectRef) {
  console.error('[gen-db-types] Could not determine Supabase project ref. Set SUPABASE_PROJECT_REF or SUPABASE_URL.');
  process.exitCode = 1;
  process.exit();
}

const args = ['gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'];
const res = spawnSync('supabase', args, { encoding: 'utf-8' });
if (res.error) {
  console.error('[gen-db-types] Failed to run supabase CLI:', res.error.message);
  process.exitCode = 1;
  process.exit();
}
if (res.status !== 0) {
  console.error('[gen-db-types] supabase CLI exited with code', res.status);
  console.error(res.stderr || res.stdout);
  process.exitCode = res.status;
  process.exit();
}

const outPath = resolve(__dirname, '..', 'packages', 'shared', 'src', 'lib', 'database.types.ts');

let customBlock = await extractCustomBlock(outPath);
let nextContent = applyBigintFixes(res.stdout);
if (customBlock) {
  nextContent = `${nextContent.trimEnd()}\n\n${customBlock}\n`;
}

try {
  await writeFile(outPath, nextContent, 'utf-8');
  console.log('[gen-db-types] Wrote types to', outPath);
} catch (err) {
  console.error('[gen-db-types] Failed to write types:', err?.message || err);
  process.exitCode = 1;
}

function applyBigintFixes(input) {
  // Replace only the literal `number` token used as the type of *_cents fields,
  // but keep all following syntax (newlines, `| null`, etc.) intact.
  //
  // Examples:
  //   amount_off_cents: number
  //   amount_off_cents?: number | null
  //   p_amount_cents: number
  //
  // become:
  //   amount_off_cents: string
  //   amount_off_cents?: string | null
  //   p_amount_cents: string
  const bigIntFieldPattern = /(\b[A-Za-z0-9_]*[cC]ents\b\??:\s*)number\b/g;
  return input.replace(bigIntFieldPattern, '$1string');
}
