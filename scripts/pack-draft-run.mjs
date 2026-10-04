#!/usr/bin/env node
/**
 * Pack the library once into a run directory and write draft run.json.
 *
 *   node scripts/pack-draft-run.mjs --line main|21.x --out artifacts/main/draft
 *
 * Refuses compatibility/pack-proof so the historical unbound tarball stays put.
 * Does not publish and does not seal the manifest.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  let outDir = null;
  let line = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '--line') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(`${arg} requires a value`);
      if (arg === '--out') outDir = resolve(root, value);
      else line = value;
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }
  if (line !== 'main' && line !== '21.x') fail('--line must be main or 21.x');
  if (!outDir) fail('--out is required');
  return {outDir, line};
}

function allowedOut(dir) {
  const resolved = resolve(dir);
  const artifacts = resolve(root, 'artifacts');
  const relArtifacts = relative(artifacts, resolved);
  const underArtifacts =
    relArtifacts !== '' && !relArtifacts.startsWith('..') && !isAbsolute(relArtifacts);
  const relTmp = relative(resolve(tmpdir()), resolved);
  const underTmp = relTmp !== '' && !relTmp.startsWith('..') && !isAbsolute(relTmp);
  return underArtifacts || underTmp;
}

function runNode(script, args) {
  const res = spawnSync(process.execPath, [join(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const {outDir, line} = parseArgs(process.argv.slice(2));
if (!allowedOut(outDir)) {
  fail('--out must be a subdirectory of artifacts/ or the system temp directory');
}
mkdirSync(outDir, {recursive: true});
for (const name of readdirSync(outDir)) {
  if (name.endsWith('.tgz') || name === 'pack-meta.json' || name === 'run.json' || name === 'reports') {
    rmSync(join(outDir, name), {recursive: true, force: true});
  }
}
if (process.env.RC_PACK_DRAFT_FAIL === '1') {
  console.error('RC_PACK_DRAFT_FAIL: pack refused before ng-packagr');
  process.exit(1);
}

runNode('scripts/pack-library.mjs', ['--out', outDir, '--line', line]);
const metaPath = join(outDir, 'pack-meta.json');
if (!existsSync(metaPath)) fail('pack-library did not write pack-meta.json');
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
if (meta.line !== line || typeof meta.tarball !== 'string') {
  fail('pack-meta.json is missing the requested line or tarball name');
}
const tarball = join(outDir, meta.tarball);
if (!existsSync(tarball)) fail(`Packed tarball is missing: ${tarball}`);
runNode('scripts/write-draft-run.mjs', ['--tarball', tarball, '--line', line, '--out', outDir]);
