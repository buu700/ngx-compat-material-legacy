#!/usr/bin/env node
/**
 * Fail-closed checks for the draft pack identity.
 * These do not pack the library and do not install a consumer.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
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

const sealDir = join(scratch, 'seal');
mkdirSync(sealDir);
const sealTarball = join(sealDir, 'sample.tgz');
writeFileSync(sealTarball, 'seal-bytes');
const sealDrafted = run([
  'scripts/write-draft-run.mjs',
  '--line',
  'main',
  '--out',
  sealDir,
  '--tarball',
  sealTarball,
]);
expect('seal fixture draft is written', sealDrafted.status === 0, sealDrafted.stderr);
const beforeSeal = readFileSync(join(sealDir, 'run.json'), 'utf8');
const missingReport = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('missing report exits 1', missingReport.status === 1, missingReport.stderr);
expect('missing report leaves the draft', readFileSync(join(sealDir, 'run.json'), 'utf8') === beforeSeal);

const sealDraft = JSON.parse(beforeSeal);
const wrongReport = {
  schema_version: 1,
  template: false,
  run_id: 'other-run',
  check_id: 'packed-consumer',
  line: 'main',
  subject_kind: 'artifact',
  result: 'pass',
  exit_code: 0,
  failed: 0,
  artifact: sealDraft.artifacts[0],
};
mkdirSync(join(sealDir, 'reports'));
writeFileSync(join(sealDir, 'reports/packed-consumer.json'), JSON.stringify(wrongReport));
const wrongRun = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('wrong run id exits 1', wrongRun.status === 1, wrongRun.stderr);
expect('wrong run id leaves the draft', readFileSync(join(sealDir, 'run.json'), 'utf8') === beforeSeal);

writeFileSync(
  join(sealDir, 'reports/packed-consumer.json'),
  JSON.stringify({...wrongReport, run_id: sealDraft.run_id, line: '21.x'}),
);
const wrongLine = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('mismatched line exits 1', wrongLine.status === 1, wrongLine.stderr);
expect('mismatched line leaves the draft', readFileSync(join(sealDir, 'run.json'), 'utf8') === beforeSeal);

writeFileSync(
  join(sealDir, 'reports/packed-consumer.json'),
  JSON.stringify({...wrongReport, run_id: sealDraft.run_id, line: 'main', result: 'fail', failed: 1, exit_code: 1}),
);
writeFileSync(
  join(sealDir, 'reports/packed-consumer.previous.json'),
  JSON.stringify({...wrongReport, run_id: sealDraft.run_id, line: 'main', result: 'pass'}),
);
const stale = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('stale passing report cannot rescue a failure', stale.status === 1, stale.stderr);
expect('stale report leaves the draft', readFileSync(join(sealDir, 'run.json'), 'utf8') === beforeSeal);

writeFileSync(
  join(sealDir, 'reports/packed-consumer.json'),
  JSON.stringify({...wrongReport, run_id: sealDraft.run_id}),
);
const sealed = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('matching report seals', sealed.status === 0, sealed.stderr);
const sealedManifest = JSON.parse(readFileSync(join(sealDir, 'run.json'), 'utf8'));
const sidecar = readFileSync(join(sealDir, 'run.json.sha256'), 'utf8').split(' ')[0];
expect('sealed stage is recorded', sealedManifest.stage === 'sealed' && sealedManifest.reports.length === 1);
expect('sidecar is outside the manifest', sealedManifest.run_json_sha256 === undefined);
expect(
  'sidecar matches the sealed bytes',
  sidecar === createHash('sha256').update(readFileSync(join(sealDir, 'run.json'))).digest('hex'),
);
const again = run(['scripts/seal-draft-run.mjs', '--run', join(sealDir, 'run.json')]);
expect('a second seal exits 2', again.status === 2, again.stderr);

const exportDir = join(scratch, 'exports');
mkdirSync(exportDir);
const required = JSON.parse(
  readFileSync(join(root, 'compatibility/rc/matrices/library-exports.json'), 'utf8'),
).exports;
function writeExportTar(name, keys) {
  const pkgDir = join(exportDir, name);
  mkdirSync(join(pkgDir, 'package'), {recursive: true});
  const exportsMap = Object.fromEntries(keys.map(key => [key, {default: './fesm2022/entry.mjs'}]));
  writeFileSync(join(pkgDir, 'package/package.json'), JSON.stringify({name: 'sample', exports: exportsMap}));
  const tarPath = join(exportDir, `${name}.tgz`);
  const packed = spawnSync('tar', ['-czf', tarPath, '-C', pkgDir, 'package'], {encoding: 'utf8'});
  if (packed.status !== 0) throw new Error(packed.stderr || 'tar failed');
  return tarPath;
}
const completeTar = writeExportTar('complete', required);
const omittedTar = writeExportTar('omitted', required.filter(key => key !== './legacy-button'));
const completeCheck = run(['scripts/check-packed-exports.mjs', '--tarball', completeTar]);
expect('complete export set passes', completeCheck.status === 0, completeCheck.stderr);
const omittedCheck = run(['scripts/check-packed-exports.mjs', '--tarball', omittedTar]);
expect('omitted export exits 1', omittedCheck.status === 1, omittedCheck.stderr);

const oldDir = join(scratch, 'old-pack');
mkdirSync(oldDir);
writeFileSync(join(oldDir, 'previous.tgz'), 'old-tarball');
writeFileSync(join(oldDir, 'run.json'), '{"stage":"draft"}\n');
const failedPack = spawnSync(process.execPath, ['scripts/pack-draft-run.mjs', '--line', 'main', '--out', oldDir], {
  cwd: root,
  encoding: 'utf8',
  env: {...process.env, RC_PACK_DRAFT_FAIL: '1'},
});
expect('broken pack exits 1', failedPack.status === 1, failedPack.stderr);
expect('broken pack removes the old tarball', !existsSync(join(oldDir, 'previous.tgz')));
expect('broken pack does not write a new manifest', !existsSync(join(oldDir, 'run.json')));

const motion = run(['scripts/motion-lifecycle-smoke.mjs', '--self-check']);
expect('motion self-check passes', motion.status === 0, motion.stderr);

rmSync(scratch, {recursive: true, force: true});

if (failures.length) {
  console.error(`${failures.length} fresh-artifact negative check(s) failed`);
  process.exit(1);
}
console.log('fresh-artifact negative checks passed');
