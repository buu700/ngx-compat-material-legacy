#!/usr/bin/env node
/**
 * Regressions for the shipped packed-exports checker.
 * Builds minimal packages and invokes the real script. Not release evidence.
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  PACKAGE_NAME,
  entrypointCaseIds,
  expectedConditions,
  filesForRegistry,
} from './check-packed-exports.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function expect(name, condition, detail = '') {
  if (!condition) {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

function git(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

const registry = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/library-exports.json'), 'utf8'));
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const derived = entrypointCaseIds(registry.exports);
const packedRow = matrix.checks.find(row => row.check_id === 'packed-exports');
expect('main roster matches derived ids', JSON.stringify(packedRow.acceptance.cases_by_line.main.entrypoints) === JSON.stringify(derived), `derived ${derived.length}`);
expect('21.x entrypoints match derived ids', JSON.stringify(packedRow.acceptance.cases_by_line['21.x'].entrypoints) === JSON.stringify(derived), `derived ${derived.length}`);
expect('roster has 95 reviewed cases', derived.length === 95 && new Set(derived).size === 95);

function writePackage(scratch, mutate) {
  const pkgDir = join(scratch, 'package');
  mkdirSync(pkgDir, {recursive: true});
  const exportsMap = {};
  for (const key of registry.exports) exportsMap[key] = {...expectedConditions(key)};
  const files = new Set(filesForRegistry(registry.exports));
  mutate?.(exportsMap, files);
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({name: PACKAGE_NAME, exports: exportsMap}));
  for (const target of files) {
    if (target === './package.json') continue;
    const dest = join(pkgDir, target.slice(2));
    mkdirSync(dirname(dest), {recursive: true});
    if (!existsSync(dest)) writeFileSync(dest, `reviewed target ${target}\n`);
  }
  const tarPath = join(scratch, 'library.tgz');
  const packed = spawnSync('tar', ['-czf', tarPath, '-C', scratch, 'package'], {encoding: 'utf8'});
  if (packed.status !== 0) throw new Error(packed.stderr || 'tar failed');
  return tarPath;
}

function runChecker(tarball, env = {}) {
  return spawnSync(process.execPath, ['scripts/check-packed-exports.mjs', '--tarball', tarball], {
    cwd: root,
    encoding: 'utf8',
    env: {...process.env, ...env},
  });
}

const base = mkdtempSync(join(tmpdir(), 'packed-exports-'));
try {
  const intactDir = join(base, 'intact');
  const intactTar = writePackage(intactDir, null);
  const standalone = runChecker(intactTar);
  expect('intact package passes standalone', standalone.status === 0, standalone.stderr);
  expect('standalone does not write a run report', !existsSync(join(intactDir, 'reports/packed-exports.json')));

  const missingDir = join(base, 'missing-key');
  const missingTar = writePackage(missingDir, exportsMap => {
    delete exportsMap['./legacy-button'];
  });
  const missing = runChecker(missingTar);
  expect('missing key exits 1', missing.status === 1, missing.stderr);

  const nullDir = join(base, 'null-target');
  const nullTar = writePackage(nullDir, exportsMap => {
    exportsMap['./legacy-button'].types = null;
  });
  const nulled = runChecker(nullTar);
  expect('null target exits 1', nulled.status === 1, nulled.stderr);

  const goneDir = join(base, 'missing-file');
  const goneTar = writePackage(goneDir, (exportsMap, files) => {
    files.delete(expectedConditions('./legacy-card').types);
  });
  const gone = runChecker(goneTar);
  expect('missing target file exits 1', gone.status === 1, gone.stderr);

  const animDir = join(base, 'animations');
  const animTar = writePackage(animDir, exportsMap => {
    exportsMap['./legacy-dialog/animations'] = {
      types: './types/ngx-compat-material-legacy-legacy-dialog-animations.d.ts',
      default: './fesm2022/ngx-compat-material-legacy-legacy-dialog-animations.mjs',
    };
  });
  const anim = runChecker(animTar);
  expect('unsupported animations entry exits 1', anim.status === 1, anim.stderr);

  const unsafeDir = join(base, 'unsafe');
  const unsafeTar = writePackage(unsafeDir, exportsMap => {
    exportsMap['./legacy-button'].default = '../outside.mjs';
  });
  const unsafe = runChecker(unsafeTar);
  expect('unsafe target exits 1', unsafe.status === 1, unsafe.stderr);

  const commit = git(['rev-parse', 'HEAD']);
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  const invocation = 'regression-invocation';
  const runDir = join(base, 'run');
  const outputDir = join(runDir, 'evidence', 'packed-exports', invocation);
  mkdirSync(outputDir, {recursive: true});
  const binding = {
    run_id: 'packed-exports-regression',
    source_commit: commit,
    source_tree: tree,
    source_line: 'main',
    matrix_sha256: 'a'.repeat(64),
    input_clean: true,
  };
  const coordEnv = {
    RC_CHECK_ID: 'packed-exports',
    RC_RUN_ID: binding.run_id,
    RC_INVOCATION_ID: invocation,
    RC_EVIDENCE_BINDING: JSON.stringify(binding),
    RC_ASSERTION_OUTPUT_DIR: outputDir,
  };
  const accepted = runChecker(intactTar, coordEnv);
  expect('coordinator accepts intact package', accepted.status === 0, accepted.stderr);
  const reportPath = join(runDir, 'reports/packed-exports.json');
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  expect('coordinator report is complete', report.coverage === 'complete' && report.result === 'pass' && report.exit_code === 0);
  expect('report roster is the derived roster', JSON.stringify(report.expected_case_ids) === JSON.stringify(derived));
  expect('report copies the coordinator binding', JSON.stringify(report.binding) === JSON.stringify(binding));
  const assertionPath = join(outputDir, 'entrypoint-observations.json');
  const assertion = JSON.parse(readFileSync(assertionPath, 'utf8'));
  expect('assertion is an observation product', assertion.kind === 'packed-export-entrypoint-observations');
  const packageBytes = readFileSync(join(intactDir, 'package/package.json'));
  expect('assertion is not package.json', !readFileSync(assertionPath).equals(packageBytes));
  expect('every case passed in the assertion', assertion.cases.every(item => item.result === 'pass'));

  const out21 = join(base, 'run-21x', 'evidence', 'packed-exports', invocation);
  mkdirSync(out21, {recursive: true});
  const binding21 = {...binding, source_line: '21.x', run_id: 'packed-exports-regression-21x'};
  const accepted21 = runChecker(intactTar, {
    ...coordEnv,
    RC_RUN_ID: binding21.run_id,
    RC_EVIDENCE_BINDING: JSON.stringify(binding21),
    RC_ASSERTION_OUTPUT_DIR: out21,
  });
  expect('coordinator accepts intact package on 21.x', accepted21.status === 0, accepted21.stderr);
  const report21 = JSON.parse(readFileSync(join(base, 'run-21x', 'reports/packed-exports.json'), 'utf8'));
  expect('21.x coordinator report is complete', report21.coverage === 'complete' && report21.line === '21.x');

  const rejectedDir = join(base, 'rejected-run');
  const rejectedOut = join(rejectedDir, 'evidence', 'packed-exports', invocation);
  mkdirSync(rejectedOut, {recursive: true});
  const rejected = runChecker(nullTar, {...coordEnv, RC_ASSERTION_OUTPUT_DIR: rejectedOut});
  expect('null target stays nonzero under the coordinator', rejected.status === 1, rejected.stderr);
  const rejectedReport = JSON.parse(readFileSync(join(rejectedDir, 'reports/packed-exports.json'), 'utf8'));
  expect('failing coordinator run is not coverage complete', rejectedReport.coverage !== 'complete');

  const forgedDir = join(base, 'forged');
  const forgedOut = join(forgedDir, 'evidence', 'packed-exports', invocation);
  mkdirSync(forgedOut, {recursive: true});
  const forged = runChecker(intactTar, {
    ...coordEnv,
    RC_ASSERTION_OUTPUT_DIR: forgedOut,
    RC_EVIDENCE_BINDING: JSON.stringify({...binding, source_commit: 'f'.repeat(40)}),
  });
  expect('forged source identity exits 2', forged.status === 2, forged.stderr);
  const forgedReport = join(forgedDir, 'reports/packed-exports.json');
  expect('forged identity writes no complete report', !existsSync(forgedReport));

  const omitted = runChecker(intactTar, {
    RC_CHECK_ID: 'packed-exports',
    RC_RUN_ID: binding.run_id,
    RC_INVOCATION_ID: invocation,
    RC_EVIDENCE_BINDING: JSON.stringify(binding),
  });
  expect('omitted assertion directory exits 2', omitted.status === 2, omitted.stderr);

  const partial = runChecker(intactTar, {RC_RUN_ID: binding.run_id});
  expect('partial coordinator environment does not grant acceptance', partial.status === 2, partial.stderr);
} finally {
  rmSync(base, {recursive: true, force: true});
}

if (failures.length) {
  console.error(`${failures.length} packed-exports regression(s) failed`);
  process.exit(1);
}
console.log('packed-exports regressions passed');
