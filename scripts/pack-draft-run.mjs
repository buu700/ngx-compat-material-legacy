#!/usr/bin/env node
/**
 * Pack the library once into a run directory and write draft run.json.
 *
 *   node scripts/pack-draft-run.mjs --line main|21.x --out artifacts/main/entry-<sha-or-stamp>
 *
 * Refuses compatibility/pack-proof so the historical unbound tarball stays put.
 * Does not publish and does not seal the manifest.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, lstatSync} from 'node:fs';
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
// A coordinator creates only its running prepack record and empty evidence
// directory before invoking us. An old pack must never be erased or reused.
function coordinatorPrepackOnly() {
  if (process.env.RC_CHECK_ID !== 'pack-library') return false;
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[0-9a-f]{32}$/.test(invocation || '')) return false;
  try {
    const names = readdirSync(outDir).sort();
    if (JSON.stringify(names) !== JSON.stringify(['evidence', 'pack-execution.json'])) return false;
    const recordPath = join(outDir, 'pack-execution.json');
    if (!lstatSync(recordPath).isFile() || lstatSync(recordPath).isSymbolicLink()) return false;
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    const binding = JSON.parse(process.env.RC_EVIDENCE_BINDING || 'null');
    if (record.check_id !== 'pack-library' || record.status !== 'running' ||
        record.exit_code !== null || record.finished_at !== null ||
        record.run_id !== process.env.RC_RUN_ID || record.invocation_id !== invocation ||
        !binding || binding.phase !== 'prepack' || binding.source_line !== line ||
        JSON.stringify(Object.entries(record.binding || {}).sort()) !== JSON.stringify(Object.entries(binding).sort())) return false;
    for (const [dir, expected] of [
      [join(outDir, 'evidence'), ['pack-library']],
      [join(outDir, 'evidence', 'pack-library'), [invocation]],
      [join(outDir, 'evidence', 'pack-library', invocation), []],
    ]) {
      if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink() ||
          JSON.stringify(readdirSync(dir).sort()) !== JSON.stringify(expected)) return false;
    }
    return true;
  } catch { return false; }
}
mkdirSync(outDir, {recursive: true});
if (lstatSync(outDir).isSymbolicLink() ||
    (readdirSync(outDir).length && !coordinatorPrepackOnly())) {
  fail('--out must be a fresh empty directory or this invocation\'s unused coordinator prepack directory');
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
