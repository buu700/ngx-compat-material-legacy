#!/usr/bin/env node
/**
 * Build + pack @ngx-compat/material-legacy with the project tsconfig.
 *
 * ng-packagr without `-c` falls back to its bundled tsconfig.ngc.json, which
 * enables strictPropertyInitialization and fails on historical @Input() fields.
 * Always pass projects/ngx-material-legacy/tsconfig.lib.json.
 *
 * Usage:
 *   node scripts/pack-library.mjs [--out compatibility/pack-proof] [--line main|21.x]
 * No npm publish.
 */
import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'projects/ngx-material-legacy/ng-package.json');
const tsconfig = join(root, 'projects/ngx-material-legacy/tsconfig.lib.json');
const dist = join(root, 'dist/ngx-material-legacy');

function parseArgs(argv) {
  let outDir = 'compatibility/pack-proof';
  let line = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        console.error('--out requires a directory');
        process.exit(2);
      }
      outDir = value;
      i += 1;
    } else if (arg === '--line') {
      const value = argv[i + 1];
      if (value !== 'main' && value !== '21.x') {
        console.error('--line must be main or 21.x');
        process.exit(2);
      }
      line = value;
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return {outDir: resolve(root, outDir), line};
}

const {outDir, line} = parseArgs(process.argv.slice(2));

function run(cmd, cmdline, opts = {}) {
  const res = spawnSync(cmd, cmdline, {stdio: 'inherit', cwd: root, ...opts});
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function npmPack(packageDir, destination) {
  const res = spawnSync(
    'npm',
    ['pack', packageDir, '--json', '--pack-destination', destination],
    {cwd: root, encoding: 'utf8'},
  );
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    process.exit(res.status ?? 1);
  }
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    console.error('npm pack --json did not return JSON');
    console.error(res.stdout);
    process.exit(1);
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  if (entries.length !== 1 || typeof entries[0]?.filename !== 'string') {
    console.error(`npm pack --json returned ${entries.length} entries; expected one tarball`);
    process.exit(1);
  }
  return entries[0];
}

run('pnpm', [
  'exec',
  'ng-packagr',
  '-p',
  project,
  '-c',
  tsconfig,
]);

if (!existsSync(join(dist, 'package.json'))) {
  console.error('Pack failed: missing dist package.json');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8'));
const version = pkg.version;
mkdirSync(outDir, {recursive: true});

const packed = npmPack(dist, outDir);
const tarballName = packed.filename;
const tarballPath = join(outDir, tarballName);
if (!existsSync(tarballPath)) {
  console.error(`npm pack named a missing tarball: ${tarballPath}`);
  process.exit(1);
}
const sha = createHash('sha256').update(readFileSync(tarballPath)).digest('hex');
const meta = {
  schema_version: 1,
  captured_at: new Date().toISOString(),
  package: `${pkg.name}@${version}`,
  tarball: tarballName,
  sha256: sha,
  line,
  tsconfig: 'projects/ngx-material-legacy/tsconfig.lib.json',
  note: 'Built via scripts/pack-library.mjs (explicit -c, npm pack --json). No npm publish.',
};
writeFileSync(join(outDir, 'pack-meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`Packed ${tarballName} sha256=${sha}`);
