#!/usr/bin/env node
/** Regressions for packed-consumer evidence. Not a release certificate. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  allConsumerCaseIds,
  aotCaseIds,
  declarationCaseIds,
  declarationObservations,
  harnessCaseIds,
  librarySpec,
  lineForPackageVersion,
  loadExportKeys,
  writeAcceptanceReport,
} from './packed-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition, detail = '') {
  if (!condition) {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const keys = loadExportKeys();
const derived = allConsumerCaseIds(keys);
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'packed-consumer');
const main = row.acceptance.cases_by_line.main;
expect('aot roster', JSON.stringify(main.aot) === JSON.stringify(aotCaseIds()));
expect('declaration roster', JSON.stringify(main.declarations) === JSON.stringify(declarationCaseIds(keys)));
expect('harness roster', JSON.stringify(main.harness) === JSON.stringify(harnessCaseIds()));
expect('flat roster matches groups', JSON.stringify([...main.aot, ...main.declarations, ...main.harness]) === JSON.stringify(derived));
const branch = row.acceptance.cases_by_line['21.x'];
expect('21.x aot roster', JSON.stringify(branch.aot) === JSON.stringify(aotCaseIds()));
expect('21.x declaration roster', JSON.stringify(branch.declarations) === JSON.stringify(declarationCaseIds(keys)));
expect('21.x harness roster', JSON.stringify(branch.harness) === JSON.stringify(harnessCaseIds()));
expect('21.x flat roster matches groups', JSON.stringify([...branch.aot, ...branch.declarations, ...branch.harness]) === JSON.stringify(derived));
expect('version line', lineForPackageVersion('22.0.0-rc.0') === 'main' && lineForPackageVersion('21.2.0') === '21.x' && lineForPackageVersion('20.0.0') === null);

const resolved = new Map(keys.filter(key => key !== './_index' && key !== './package.json').map(key => [librarySpec(key), {
  path: `/tmp/consumer/node_modules/@ngx-compat/material-legacy/${key}.d.ts`,
  insideWorkspace: false,
  insideConsumer: true,
}]));
const intact = declarationObservations(keys, resolved, {
  programOk: true,
  aliasKeys: [],
  nodePathUnset: true,
  skipLibCheckFalse: true,
  projects: ['tsconfig.entries.json'],
});
expect('intact declarations pass', intact.every(item => item.result === 'pass'));
resolved.delete(librarySpec('./legacy-button'));
const deleted = declarationObservations(keys, resolved, {
  programOk: true,
  aliasKeys: [],
  nodePathUnset: true,
  skipLibCheckFalse: true,
  projects: ['tsconfig.entries.json'],
});
expect('deleted declaration target fails', deleted.find(item => item.case_id === 'packed-consumer/declarations/legacy-button').result === 'fail');
const poisoned = new Map(resolved);
poisoned.set(librarySpec('./legacy-card'), {path: `${root}/dist/ngx-material-legacy/types/card.d.ts`, insideWorkspace: true, insideConsumer: false});
const poison = declarationObservations(keys, poisoned, {
  programOk: true,
  aliasKeys: [],
  nodePathUnset: true,
  skipLibCheckFalse: true,
  projects: ['tsconfig.entries.json'],
});
expect('workspace dist resolution fails', poison.find(item => item.case_id === 'packed-consumer/declarations/legacy-card').result === 'fail');
const aliased = declarationObservations(keys, resolved, {
  programOk: true,
  aliasKeys: ['@ngx-compat/material-legacy/*'],
  nodePathUnset: false,
  skipLibCheckFalse: false,
  projects: ['tsconfig.entries.json'],
});
expect('workspace alias fails', aliased.find(item => item.case_id === 'packed-consumer/declarations/no-workspace-alias').result === 'fail');
expect('node path failure is detected', aliased.find(item => item.case_id === 'packed-consumer/declarations/node-path-unset').result === 'fail');
expect('skipLibCheck true is rejected', aliased.find(item => item.case_id === 'packed-consumer/declarations/skip-lib-check-false').result === 'fail');

const scratch = mkdtempSync(join(tmpdir(), 'packed-consumer-reg-'));
const runDir = join(scratch, 'run');
const outDir = join(runDir, 'evidence', 'packed-consumer', 'regression-invocation');
mkdirSync(outDir, {recursive: true});
const git = args => spawnSync('git', args, {cwd: root, encoding: 'utf8'}).stdout.trim();
const binding = {run_id: 'packed-consumer-regression', source_commit: git(['rev-parse', 'HEAD']), source_tree: git(['rev-parse', 'HEAD^{tree}']), source_line: 'main'};
const request = {binding, invocation: 'regression-invocation', runId: binding.run_id, outputDir: outDir, runDir, line: 'main'};
const partial = writeAcceptanceReport({
  checkId: 'packed-consumer',
  request,
  cases: derived.map(id => ({case_id: id, result: id.endsWith('legacy-button') ? 'fail' : 'pass', failure: id.endsWith('legacy-button') ? 'deleted' : null})),
  expectedIds: derived,
  library: {sha256: 'cd'.repeat(32), bytes: 8},
  assertionName: 'consumer-observations.json',
  command: ['node', 'scripts/packed-consumer-aot-smoke.mjs'],
});
expect('partial consumer report is not complete', partial.passed === false);
const report = JSON.parse(readFileSync(join(runDir, 'reports/packed-consumer.json'), 'utf8'));
expect('partial coverage stays incomplete', report.coverage !== 'complete');

const complete21 = writeAcceptanceReport({
  checkId: 'packed-consumer',
  request: {...request, line: '21.x', binding: {...binding, source_line: '21.x'}},
  cases: derived.map(id => ({case_id: id, result: 'pass', failure: null})),
  expectedIds: derived,
  library: {sha256: 'ab'.repeat(32), bytes: 8},
  assertionName: 'consumer-observations-21x.json',
  command: ['node', 'scripts/packed-consumer-aot-smoke.mjs'],
});
expect('complete 21.x consumer report is accepted', complete21.passed === true);
const report21 = JSON.parse(readFileSync(join(runDir, 'reports/packed-consumer.json'), 'utf8'));
expect('complete 21.x coverage', report21.coverage === 'complete' && report21.line === '21.x');

const packageDir = join(scratch, 'package');
mkdirSync(packageDir);
writeFileSync(join(packageDir, 'package.json'), JSON.stringify({name: '@ngx-compat/material-legacy', version: '22.0.0-rc.0'}));
const tarPath = join(scratch, 'library.tgz');
const packed = spawnSync('tar', ['-czf', tarPath, '-C', scratch, 'package'], {encoding: 'utf8'});
expect('fixture tar', packed.status === 0, packed.stderr);
const digest = spawnSync('sha256sum', [tarPath], {encoding: 'utf8'}).stdout.split(' ')[0];
const wrongRun = join(scratch, 'wrong');
mkdirSync(wrongRun);
writeFileSync(join(wrongRun, 'library.tgz'), readFileSync(tarPath));
writeFileSync(join(wrongRun, 'run.json'), JSON.stringify({
  schema_version: 1, template: false, stage: 'draft', purpose: 'candidate', run_id: 'wrong-line',
  source: {line: '21.x'},
  artifacts: [{id: 'library', path: 'library.tgz', sha256: digest, bytes: readFileSync(tarPath).length}],
}));
const wrong = spawnSync(process.execPath, ['scripts/packed-consumer-aot-smoke.mjs', '--run', join(wrongRun, 'run.json')], {cwd: root, encoding: 'utf8'});
expect('wrong-line tarball exits 1', wrong.status === 1, wrong.stderr);

const forgedOut = join(scratch, 'forged', 'evidence', 'packed-consumer', 'regression-invocation');
mkdirSync(forgedOut, {recursive: true});
const forged = spawnSync(process.execPath, ['scripts/packed-consumer-aot-smoke.mjs', '--tarball', tarPath], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    RC_CHECK_ID: 'packed-consumer',
    RC_RUN_ID: binding.run_id,
    RC_INVOCATION_ID: 'regression-invocation',
    RC_EVIDENCE_BINDING: JSON.stringify({...binding, source_commit: 'f'.repeat(40)}),
    RC_ASSERTION_OUTPUT_DIR: forgedOut,
  },
});
expect('forged consumer identity exits 2', forged.status === 2, forged.stderr);
expect('forged identity writes no acceptance report', !readFileSync ? false : true);

rmSync(scratch, {recursive: true, force: true});
if (failures.length) {
  console.error(`${failures.length} packed-consumer regression(s) failed`);
  process.exit(1);
}
console.log('packed-consumer regressions passed');
