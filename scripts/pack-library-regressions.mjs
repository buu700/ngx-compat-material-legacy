#!/usr/bin/env node
/** Regressions for the shipped pack-library checker. Not release evidence. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {artifactNegativeObservations, packLibraryCaseIds} from './check-pack-library.mjs';
import {writeAcceptanceReport} from './packed-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition, detail = '') {
  if (!condition) {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'pack-library');
const derived = packLibraryCaseIds();
const mainGroups = row.acceptance.cases_by_line.main;
expect('main fresh-build roster', JSON.stringify(mainGroups['fresh-build']) === JSON.stringify(derived.filter(id => id.includes('/fresh-build/'))));
expect('main artifact-negative roster', JSON.stringify(mainGroups['artifact-negatives']) === JSON.stringify(derived.filter(id => id.includes('/artifact-negatives/'))));
const branchGroups = row.acceptance.cases_by_line['21.x'];
expect('21.x fresh-build roster', JSON.stringify(branchGroups['fresh-build']) === JSON.stringify(derived.filter(id => id.includes('/fresh-build/'))));
expect('21.x artifact-negative roster', JSON.stringify(branchGroups['artifact-negatives']) === JSON.stringify(derived.filter(id => id.includes('/artifact-negatives/'))));

process.env.RC_CHECK_ID = 'pack-library';
process.env.RC_RUN_ID = 'coordinator-must-not-leak';
const negatives = artifactNegativeObservations();
delete process.env.RC_CHECK_ID;
delete process.env.RC_RUN_ID;
expect('negative probes pass', negatives.every(item => item.result === 'pass'), negatives.filter(item => item.result !== 'pass').map(item => item.case_id).join(','));

const scratch = mkdtempSync(join(tmpdir(), 'pack-library-reg-'));
const runDir = join(scratch, 'run');
const outDir = join(runDir, 'evidence', 'pack-library', 'regression-invocation');
mkdirSync(outDir, {recursive: true});
const git = args => spawnSync('git', args, {cwd: root, encoding: 'utf8'}).stdout.trim();
const binding = {
  run_id: 'pack-library-regression',
  source_commit: git(['rev-parse', 'HEAD']),
  source_tree: git(['rev-parse', 'HEAD^{tree}']),
  source_line: 'main',
};
const cases = derived.map(id => ({case_id: id, result: 'pass', failure: null}));
const dropped = cases.map(item => item.case_id === derived[0] ? {...item, result: 'fail', failure: 'removed observation'} : item);
const request = {binding, invocation: 'regression-invocation', runId: binding.run_id, outputDir: outDir, runDir, line: 'main', checkId: 'pack-library'};
const rejected = writeAcceptanceReport({
  checkId: 'pack-library',
  request,
  cases: dropped,
  expectedIds: derived,
  library: {sha256: 'ab'.repeat(32), bytes: 4},
  assertionName: 'build-observations.json',
  command: ['node', 'scripts/check-pack-library.mjs'],
});
expect('missing fresh observation is not coverage complete', rejected.passed === false);
const rejectedReport = JSON.parse(readFileSync(join(runDir, 'reports/pack-library.json'), 'utf8'));
expect('failed writer keeps coverage incomplete', rejectedReport.coverage !== 'complete');

const accepted21 = writeAcceptanceReport({
  checkId: 'pack-library',
  request: {...request, line: '21.x', binding: {...binding, source_line: '21.x'}},
  cases,
  expectedIds: derived,
  library: {sha256: 'cd'.repeat(32), bytes: 4},
  assertionName: 'build-observations-21x.json',
  command: ['node', 'scripts/check-pack-library.mjs'],
});
expect('complete 21.x pack report is accepted', accepted21.passed === true);
const acceptedReport21 = JSON.parse(readFileSync(join(runDir, 'reports/pack-library.json'), 'utf8'));
expect('complete 21.x pack coverage', acceptedReport21.coverage === 'complete' && acceptedReport21.line === '21.x');

writeFileSync(join(runDir, 'run.json'), '{}\n');
const forged = spawnSync(process.execPath, ['scripts/check-pack-library.mjs', '--run', join(runDir, 'run.json')], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    RC_CHECK_ID: 'pack-library',
    RC_RUN_ID: binding.run_id,
    RC_INVOCATION_ID: 'regression-invocation',
    RC_EVIDENCE_BINDING: JSON.stringify({...binding, source_commit: 'f'.repeat(40)}),
    RC_ASSERTION_OUTPUT_DIR: outDir,
  },
});
expect('forged source identity exits 2', forged.status === 2, forged.stderr);

rmSync(scratch, {recursive: true, force: true});
if (failures.length) {
  console.error(`${failures.length} pack-library regression(s) failed`);
  process.exit(1);
}
console.log('pack-library regressions passed');
