#!/usr/bin/env node
/**
 * Build + pack @ngx-compat/material-legacy with the project tsconfig.
 *
 * ng-packagr without `-c` falls back to its bundled tsconfig.ngc.json, which
 * enables strictPropertyInitialization and fails on historical @Input() fields.
 * Always pass projects/ngx-material-legacy/tsconfig.lib.json.
 *
 * Usage:
 *   node scripts/pack-library.mjs [--out compatibility/pack-proof]
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

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = resolve(root, outIdx >= 0 ? args[outIdx + 1] : 'compatibility/pack-proof');

function run(cmd, cmdline, opts = {}) {
  const res = spawnSync(cmd, cmdline, {stdio: 'inherit', cwd: root, ...opts});
  if (res.status !== 0) process.exit(res.status ?? 1);
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

run('npm', ['pack', dist, '--pack-destination', outDir]);

const tarballName = `${pkg.name.replace('@', '').replace('/', '-')}-${version}.tgz`;
const tarballPath = join(outDir, tarballName);
if (!existsSync(tarballPath)) {
  console.error(`Expected tarball missing: ${tarballPath}`);
  process.exit(1);
}
const sha = createHash('sha256').update(readFileSync(tarballPath)).digest('hex');
const meta = {
  schema_version: 1,
  captured_at: new Date().toISOString(),
  package: `${pkg.name}@${version}`,
  tarball: tarballName,
  sha256: sha,
  tsconfig: 'projects/ngx-material-legacy/tsconfig.lib.json',
  note: 'Built via scripts/pack-library.mjs (explicit -c). No npm publish.',
};
writeFileSync(join(outDir, 'pack-meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`Packed ${tarballName} sha256=${sha}`);
