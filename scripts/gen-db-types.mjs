#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_ID || '';
if (!projectRef) {
  console.error('[gen-db-types] SUPABASE_PROJECT_REF is not set.');
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

