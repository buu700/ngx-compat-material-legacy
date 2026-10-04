#!/usr/bin/env node
/**
 * Host-motion roster regressions. Case ids come from the lifecycle predicates.
 * A clean fixture, a one-predicate failure, the checked-in matrix, and one
 * coordinator report are required. 21.x stays null.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  HOST_MOTION_CASES,
  hostMotionObservations,
  lifecycleErrors,
  workspaceMotionFiles,
  writeAcceptance,
} from './motion-lifecycle-smoke.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const matrixPath = join(root, 'compatibility/rc/matrices/full-verify.json');

function cleanFixture() {
  return {
    helper: "import {MATERIAL_ANIMATIONS} from '@angular/material/core';\nexport function legacyAnimationsDisabled() { return false; }\n",
    dialog: 'const OPEN_CLASS = "mat-legacy-dialog-container-open";\n',
    menu: '_onCssAnimationDone()\n',
    menuHtml: '[class.mat-menu-panel-animations-enabled]\n',
    select: 'legacyAnimationsDisabled()\n',
    selectHtml: '[class.mat-select-panel-animations-enabled]\n',
    formField: 'legacyAnimationsDisabled()\n',
    formFieldHtml: 'class="mat-form-field-subscript-message"\n',
    snackBar: "'[class.mat-snack-bar-container-enter]'\n",
    tabs: '_onContentTransitionEnd()\n',
    tabBody: 'class TabBody {}\n',
    tooltip: 'class Tooltip {}\n',
    tooltipBase: 'legacyAnimationsDisabled()\n',
  };
}

function failedIds(files) {
  return hostMotionObservations(files).filter(item => item.result !== 'pass').map(item => item.case_id);
}

function expectOnly(files, caseId) {
  assert.deepEqual(failedIds(files), [caseId], caseId);
}

const clean = cleanFixture();
assert.deepEqual(failedIds(clean), []);
assert.deepEqual(lifecycleErrors(clean), []);
assert.equal(new Set(HOST_MOTION_CASES).size, HOST_MOTION_CASES.length);
assert.ok(HOST_MOTION_CASES.length > 1);

expectOnly(
  {...clean, helper: clean.helper.replace('MATERIAL_ANIMATIONS', 'MATERIAL_ANIMATION')},
  'motion-smoke/host-motion/helper/public-material-animations',
);
expectOnly(
  {...clean, helper: `${clean.helper}\n_animationsDisabled()\n`},
  'motion-smoke/host-motion/helper/no-private-helpers',
);
expectOnly(
  {...clean, helper: "import {MATERIAL_ANIMATIONS} from '@angular/material/core';\n"},
  'motion-smoke/host-motion/helper/legacy-animations-disabled',
);
assert.deepEqual(failedIds({...clean, dialog: ''}), [
  'motion-smoke/host-motion/dialog/present',
  'motion-smoke/host-motion/dialog/css-open-class',
]);
expectOnly(
  {...clean, dialog: `${clean.dialog}\nimport {trigger} from '@angular/animations';\n`},
  'motion-smoke/host-motion/dialog/no-engine-import',
);
expectOnly({...clean, tooltip: 'animations: []\n'}, 'motion-smoke/host-motion/tooltip/no-animations-metadata');
expectOnly({...clean, dialog: 'class Dialog {}\n'}, 'motion-smoke/host-motion/dialog/css-open-class');
expectOnly({...clean, menuHtml: 'class Menu {}\n'}, 'motion-smoke/host-motion/menu-html/css-motion-class');
expectOnly({...clean, menu: 'class Menu {}\n'}, 'motion-smoke/host-motion/menu/css-animation-callback');
expectOnly({...clean, selectHtml: 'class Select {}\n'}, 'motion-smoke/host-motion/select-html/css-motion-class');
expectOnly({...clean, snackBar: 'class Snack {}\n'}, 'motion-smoke/host-motion/snack-bar/css-enter-class');
expectOnly({...clean, tabs: 'class Tabs {}\n'}, 'motion-smoke/host-motion/tabs/css-transition-callback');
expectOnly({...clean, tooltipBase: 'class Tooltip {}\n'}, 'motion-smoke/host-motion/tooltip-base/honors-motion-helper');

const workspace = workspaceMotionFiles();
assert.deepEqual(failedIds(workspace), [], 'workspace source failed a host-motion predicate');

const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'motion-smoke');
assert.deepEqual(row.acceptance.cases_by_line.main['host-motion'], HOST_MOTION_CASES);
assert.equal(row.acceptance.cases_by_line['21.x']['host-motion'], null);

const failedObservation = hostMotionObservations({...clean, dialog: 'class Dialog {}\n'});
const scratch = mkdtempSync(join(tmpdir(), 'motion-smoke-reg-'));
try {
  const invocation = 'reginvoke';
  const runDir = join(scratch, 'run');
  const outputDir = join(runDir, 'evidence', 'motion-smoke', invocation);
  mkdirSync(outputDir, {recursive: true});
  const binding = {run_id: 'run-1', source_line: 'main', source_commit: 'abc', source_tree: 'def'};
  const request = {binding, invocation, runId: 'run-1', outputDir, runDir, line: 'main'};
  assert.equal(writeAcceptance(request, failedObservation, {dialog: 'hash'}), false);
  const failedReport = JSON.parse(readFileSync(join(runDir, 'reports', 'motion-smoke.json'), 'utf8'));
  assert.equal(failedReport.coverage, 'incomplete');
  assert.equal(failedReport.result, 'fail');
  assert.deepEqual(failedReport.failed_case_ids, ['motion-smoke/host-motion/dialog/css-open-class']);
  assert.ok(failedReport.case_results.every(item => item.kind === 'assertion'));

  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root, encoding: 'utf8'}).trim();
  const liveInvocation = 'a'.repeat(32);
  const liveRun = join(scratch, 'live');
  const liveOut = join(liveRun, 'evidence', 'motion-smoke', liveInvocation);
  mkdirSync(liveOut, {recursive: true});
  const liveBinding = {
    run_id: 'live-run',
    source_line: 'main',
    source_commit: commit,
    source_tree: tree,
  };
  const receipt = join(root, 'compatibility/pack-proof/motion-lifecycle-smoke.json');
  const receiptBefore = readFileSync(receipt);
  const env = {
    ...process.env,
    RC_CHECK_ID: 'motion-smoke',
    RC_RUN_ID: 'live-run',
    RC_INVOCATION_ID: liveInvocation,
    RC_EVIDENCE_BINDING: JSON.stringify(liveBinding),
    RC_ASSERTION_OUTPUT_DIR: liveOut,
  };
  execFileSync('node', ['scripts/motion-lifecycle-smoke.mjs'], {cwd: root, env, stdio: 'pipe'});
  assert.equal(readFileSync(receipt).equals(receiptBefore), true);
  const report = JSON.parse(readFileSync(join(liveRun, 'reports', 'motion-smoke.json'), 'utf8'));
  assert.equal(report.coverage, 'complete');
  assert.equal(report.result, 'pass');
  assert.equal(report.exit_code, 0);
  assert.equal(report.subject_kind, 'source');
  assert.deepEqual(report.subject_ids, ['source']);
  assert.deepEqual(report.artifacts, {});
  assert.deepEqual(report.expected_case_ids, HOST_MOTION_CASES);
  assert.deepEqual(report.discovered_case_ids, HOST_MOTION_CASES);
  assert.deepEqual(report.executed_case_ids, HOST_MOTION_CASES);
  assert.deepEqual(report.passed_case_ids, HOST_MOTION_CASES);
  assert.deepEqual(report.failed_case_ids, []);
  assert.equal(report.passed, HOST_MOTION_CASES.length);
  assert.equal(report.failed, 0);
  assert.equal(report.skipped, 0);
  assert.equal(report.case_results.length, HOST_MOTION_CASES.length);
  assert.deepEqual(report.binding, liveBinding);
  const output = report.outputs[0];
  assert.equal(output.path, `evidence/motion-smoke/${liveInvocation}/host-motion-observations.json`);
  const observationBytes = readFileSync(join(liveRun, output.path));
  assert.equal(createHash('sha256').update(observationBytes).digest('hex'), output.sha256);
  assert.equal(observationBytes.length, output.bytes);
  const observation = JSON.parse(observationBytes.toString('utf8'));
  assert.equal(observation.kind, 'host-motion-source-observations');
  assert.deepEqual(observation.cases.map(item => item.case_id), HOST_MOTION_CASES);
  assert.ok(observation.cases.every(item => item.result === 'pass' && item.detail === 'observed'));
  assert.equal(observation.file_sha256.helper, createHash('sha256').update(workspace.helper).digest('hex'));
  assert.ok(report.case_results.every(item => item.kind === 'assertion' && item.output_paths[0] === output.path));

  const badEnv = {...env, RC_EVIDENCE_BINDING: JSON.stringify({...liveBinding, source_commit: '0'.repeat(40)})};
  assert.throws(() => execFileSync('node', ['scripts/motion-lifecycle-smoke.mjs'], {cwd: root, env: badEnv, stdio: 'pipe'}));
  assert.equal(readFileSync(receipt).equals(receiptBefore), true);

  const line21 = join(scratch, 'line21');
  const line21Out = join(line21, 'evidence', 'motion-smoke', liveInvocation);
  mkdirSync(line21Out, {recursive: true});
  const line21Env = {...env, RC_ASSERTION_OUTPUT_DIR: line21Out, RC_EVIDENCE_BINDING: JSON.stringify({...liveBinding, source_line: '21.x'})};
  execFileSync('node', ['scripts/motion-lifecycle-smoke.mjs'], {cwd: root, env: line21Env, stdio: 'pipe'});
  assert.equal(readFileSync(join(line21Out, 'motion-lifecycle-smoke.json'), 'utf8').includes('"status": "ok"'), true);
  assert.throws(() => readFileSync(join(line21, 'reports', 'motion-smoke.json')));

  const partial = join(scratch, 'partial');
  mkdirSync(partial, {recursive: true});
  assert.throws(() => execFileSync('node', ['scripts/motion-lifecycle-smoke.mjs'], {
    cwd: root,
    env: {...process.env, RC_CHECK_ID: 'motion-smoke', RC_RUN_ID: 'live-run', RC_ASSERTION_OUTPUT_DIR: partial},
    stdio: 'pipe',
  }));
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

console.log(`motion-smoke regressions passed (${HOST_MOTION_CASES.length} host-motion cases)`);
