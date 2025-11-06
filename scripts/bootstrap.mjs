#!/usr/bin/env node

import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const rawArgs = process.argv.slice(2);
const flagSet = new Set(rawArgs);

if (flagSet.has('--help') || flagSet.has('-h')) {
  console.log(`Usage: node scripts/bootstrap.mjs [options]

Options:
  --skip-install     Skip pnpm install
  --skip-build       Skip the initial Next.js build
  --skip-env         Do not create .env files from templates
  --prefer-offline   Pass --prefer-offline to pnpm install
  --verbose          Print additional debug output
  --help, -h         Show this help message
`);
  process.exit(0);
}

const options = {
  skipInstall: flagSet.has('--skip-install'),
  skipBuild: flagSet.has('--skip-build'),
  skipEnv: flagSet.has('--skip-env'),
  preferOffline: flagSet.has('--prefer-offline'),
  verbose: flagSet.has('--verbose'),
};

const notes = [];

function log(message, type = 'info') {
  const prefix = type === 'error' ? '✖' : type === 'success' ? '✔' : '•';
  console.log(`${prefix} ${message}`);
}

async function ensurePrerequisites() {
  log('Checking Node.js runtime…');
  const pkg = JSON.parse(
    readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf8'),
  );

  const requiredNode =
    typeof pkg.engines?.node === 'string'
      ? pkg.engines.node.replace(/^v/, '')
      : null;
  const currentNode = process.versions.node;

  if (requiredNode) {
    const [reqMajor] = requiredNode.split('.').map((part) => parseInt(part, 10));
    const [curMajor] = currentNode.split('.').map((part) => parseInt(part, 10));
    if (Number.isFinite(reqMajor) && Number.isFinite(curMajor)) {
      if (curMajor < reqMajor) {
        throw new Error(
          `Node.js ${requiredNode}+ required (current ${currentNode}).`,
        );
      }
      if (curMajor > reqMajor && options.verbose) {
        log(
          `Node.js ${currentNode} detected (higher than declared ${requiredNode}).`,
        );
      }
    }
  }
  log(`Node.js version OK (${currentNode})`, 'success');

  log('Checking pnpm availability…');
  const pnpmVersion = await getCommandVersion('pnpm');
  log(`pnpm version OK (${pnpmVersion})`, 'success');

  try {
    const supabaseVersion = await getCommandVersion('supabase');
    log(`Supabase CLI detected (${supabaseVersion}).`);
  } catch {
    notes.push(
      'Supabase CLI not found. Install https://supabase.com/docs/guides/cli if you plan to run local migrations.',
    );
  }
}

function getCommandVersion(command) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, ['--version'], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      rejectPromise(
        new Error(`Failed to execute ${command}: ${error.message}`),
      );
    });
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            stderr.trim() ||
              `Command ${command} exited with ${code} while resolving version.`,
          ),
        );
        return;
      }
      resolvePromise(stdout.trim());
    });
  });
}

async function provisionEnvFiles() {
  const envPairs = [
    ['.env.example', '.env'],
    ['apps/web-next/.env.example', 'apps/web-next/.env.local'],
  ];

  for (const [example, target] of envPairs) {
    const examplePath = resolve(ROOT_DIR, example);
    const targetPath = resolve(ROOT_DIR, target);

    if (!existsSync(examplePath)) {
      if (options.verbose) {
        log(`Template missing: ${relative(ROOT_DIR, examplePath)}`);
      }
      continue;
    }

    if (existsSync(targetPath)) {
      log(`Keeping existing ${relative(ROOT_DIR, targetPath)}`);
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(examplePath, targetPath);
    log(
      `Created ${relative(ROOT_DIR, targetPath)} from ${relative(
        ROOT_DIR,
        examplePath,
      )}`,
      'success',
    );
  }

  notes.push(
    'Update `.env` and `apps/web-next/.env.local` with your Supabase, Stripe, and branding keys.',
  );
}

async function installDependencies() {
  const installArgs = ['install', '--frozen-lockfile'];
  if (options.preferOffline) {
    installArgs.push('--prefer-offline');
  }

  await runCommand('pnpm', installArgs);
}

async function buildWebNext() {
  await runCommand('pnpm', ['--filter', 'web-next', 'build']);
  notes.push('Run `pnpm dev:web-next` to start the Next.js dev server.');
}

function runCommand(command, args, overrides = {}) {
  if (options.verbose) {
    log(`Executing: ${command} ${args.join(' ')}`);
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      ...overrides,
    });

    child.on('error', (error) => {
      rejectPromise(
        new Error(`Failed to launch ${command}: ${error.message}`),
      );
    });
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`),
        );
        return;
      }
      resolvePromise();
    });
  });
}

async function main() {
  const steps = [
    {
      title: 'Verify prerequisites',
      fn: ensurePrerequisites,
    },
    {
      title: 'Provision environment files',
      fn: provisionEnvFiles,
      skip: options.skipEnv,
    },
    {
      title: 'Install workspace dependencies',
      fn: installDependencies,
      skip: options.skipInstall,
    },
    {
      title: 'Compile Next.js app once',
      fn: buildWebNext,
      skip: options.skipBuild,
    },
  ];

  const activeSteps = steps.filter((step) => !step.skip);
  const total = activeSteps.length;
  const startTime = Date.now();

  for (let index = 0; index < activeSteps.length; index += 1) {
    const current = activeSteps[index];
    const label = `[${index + 1}/${total}] ${current.title}`;
    log(label);
    const stepStart = Date.now();
    await current.fn();
    const durationMs = Date.now() - stepStart;
    log(`${current.title} completed in ${(durationMs / 1000).toFixed(1)}s`, 'success');
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Bootstrap finished in ${elapsedSeconds}s`, 'success');

  if (notes.length > 0) {
    console.log('\nNext steps:');
    for (const note of notes) {
      console.log(`- ${note}`);
    }
  }
}

main().catch((error) => {
  log(error.message, 'error');
  if (options.verbose && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

