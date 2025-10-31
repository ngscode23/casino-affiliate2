#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
try {
  await import('node:fs/promises').then(({ writeFile }) => writeFile(outPath, res.stdout, 'utf-8'));
  console.log('[gen-db-types] Wrote types to', outPath);
} catch (err) {
  console.error('[gen-db-types] Failed to write types:', err?.message || err);
  process.exitCode = 1;
}
