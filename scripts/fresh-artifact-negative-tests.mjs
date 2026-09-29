#!/usr/bin/env node
/**
 * Fail-closed checks for the draft pack identity.
 * These do not pack the library and do not install a consumer.
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function run(args) {
  return spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8'});
}

function expect(name, condition, detail) {
  if (condition) {
    console.log(`ok ${name}`);
    return;
  }
  failures.push(name);
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
}

const missing = run(['scripts/packed-consumer-aot-smoke.mjs']);
expect('missing tarball exits 2', missing.status === 2, missing.stderr);

const unknown = run(['scripts/packed-consumer-aot-smoke.mjs', '--bogus']);
expect('unknown consumer argument exits 2', unknown.status === 2, unknown.stderr);

const badLine = run([
  'scripts/write-draft-run.mjs',
  '--line',
  'nope',
  '--out',
  'artifacts/main/draft',
  '--tarball',
  'artifacts/main/draft/sample.tgz',
]);
expect('unknown line exits 2', badLine.status === 2, badLine.stderr);

const scratch = mkdtempSync(join(tmpdir(), 'ngx-draft-negative-'));
const runDir = join(scratch, 'run');
mkdirSync(runDir);
const outside = join(scratch, 'outside.tgz');
writeFileSync(outside, 'outside');
const outsideRun = run([
  'scripts/write-draft-run.mjs',
  '--line',
  'main',
  '--out',
  runDir,
  '--tarball',
  outside,
]);
expect('tarball outside the run directory exits 2', outsideRun.status === 2, outsideRun.stderr);

const tarball = join(runDir, 'sample.tgz');
writeFileSync(tarball, 'sample-bytes');
const drafted = run([
  'scripts/write-draft-run.mjs',
  '--line',
  'main',
  '--out',
  runDir,
  '--tarball',
  tarball,
]);
expect('draft run is written', drafted.status === 0, drafted.stderr);
const draft = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
expect('draft is unsealed', draft.stage === 'draft' && draft.template === false);
expect('draft has no self digest', draft.run_json_sha256 === undefined);
expect('library digest is recorded', /^[0-9a-f]{64}$/.test(draft.artifacts?.[0]?.sha256 ?? ''));

writeFileSync(tarball, 'tampered-bytes');
const tampered = run(['scripts/packed-consumer-aot-smoke.mjs', '--run', join(runDir, 'run.json')]);
expect('tampered tarball exits 1', tampered.status === 1, tampered.stderr);
const child = JSON.parse(readFileSync(join(runDir, 'reports/packed-consumer.json'), 'utf8'));
expect(
  'tamper report stays on the draft run',
  child.result === 'fail' && child.run_id === draft.run_id && child.failed === 1,
);

const evil = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
evil.artifacts[0].path = '../outside.tgz';
const evilPath = join(runDir, 'evil-run.json');
writeFileSync(evilPath, JSON.stringify(evil));
const traversal = run(['scripts/packed-consumer-aot-smoke.mjs', '--run', evilPath]);
expect('path traversal exits 2', traversal.status === 2, traversal.stderr);

rmSync(scratch, {recursive: true, force: true});

if (failures.length) {
  console.error(`${failures.length} fresh-artifact negative check(s) failed`);
  process.exit(1);
}
console.log('fresh-artifact negative checks passed');
