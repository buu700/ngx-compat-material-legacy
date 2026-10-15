/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {allConsumerCaseIds, loadExportKeys} from './packed-consumer-evidence.mjs';
import {SELECT_FOCUS_CLICK_CASE_ID, packedSelectFocusClickCase} from './select-focus-click-packed-contract.mjs';

export const ARTIFACT_BEHAVIOR_KIND = 'artifact-required-individual-behavior';
export const SELECT_FOCUS_SHA = '1b6db8c89b00ace8aaa0e0824866acec5369635f';
export const SELECT_FOCUS_PATCH = 'b937a4a631c52484825a5a3ab74a301b01b64ba494ff72ef4eb7d0de7c992aba';
export const SELECT_FOCUS_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'scripts/packed-consumer-aot-smoke.mjs',
  'scripts/packed-consumer-evidence.mjs',
  'scripts/select-focus-click-packed-fixture.mjs',
  'scripts/select-focus-click-packed-contract.mjs',
  'compatibility/rc/matrices/library-exports.json',
  'compatibility/rc/matrices/full-verify.json',
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => { if (!value) throw new Error(message); };
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
// Same sorted compact JSON/ASCII encoding as rc_acceptance.json_digest.
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
const digest = value => hash(canonical(value).replace(/[\u007f-\uffff]/g,
  char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));

function member(root, relative) {
  const rootStat = lstatSync(root);
  demand(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'invalid member root');
  demand(typeof relative === 'string' && !relative.includes('\\'), 'invalid member path');
  const parts = relative.split('/');
  demand(parts.length > 0 && parts.every(part => part && part !== '.' && part !== '..'), 'member path escape');
  const path = resolve(root, ...parts);
  demand(path.startsWith(resolve(root) + sep), 'member path escape');
  let cursor = root;
  for (const part of parts) {
    cursor = join(cursor, part);
    demand(!lstatSync(cursor).isSymbolicLink(), 'symlink member');
  }
  demand(lstatSync(path).isFile(), 'member is not a regular file');
  return readFileSync(path);
}
const json = (root, path) => JSON.parse(member(root, path));
function checkedBytes(root, record) {
  demand(object(record) && /^[0-9a-f]{64}$/.test(record.sha256)
    && Number.isSafeInteger(record.bytes) && record.bytes > 0, 'missing member identity');
  const bytes = member(root, record.path);
  demand(bytes.length === record.bytes && hash(bytes) === record.sha256, 'member bytes/hash mismatch');
  return bytes;
}

/** Registered subjects cannot fall back to a generic proof kind. */
export function requiresArtifactBehavior(entry, proof) {
  return entry?.sha === SELECT_FOCUS_SHA || proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'artifact_behavior'));
}

/**
 * Consumes trusted coordinator execution, not a self-authenticating report.
 * The final sealer still verifies the complete execution record and all gates.
 * Whole-patch, completion, individual source judgment and branch checks remain
 * the caller's responsibility; this adds the required artifact observation.
 */
export function validateArtifactBehavior({root, entry, proof, request}) {
  try {
    demand(entry?.sha === SELECT_FOCUS_SHA && proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
      && proof.diff_sha256 === SELECT_FOCUS_PATCH, 'unregistered artifact behavior subject');
    const scope = proof.artifact_behavior;
    demand(object(scope) && scope.kind === 'select-focus-before-click'
      && sameIds(scope.case_ids, [SELECT_FOCUS_CLICK_CASE_ID]), 'wrong artifact behavior scope');
    demand(Array.isArray(scope.source_members)
      && sameIds(scope.source_members.map(row => row?.path), SELECT_FOCUS_MEMBERS), 'incomplete reviewed source scope');
    for (const row of scope.source_members) {
      demand(/^[0-9a-f]{64}$/.test(row.sha256) && hash(member(root, row.path)) === row.sha256, 'stale reviewed source member');
    }
    demand(object(request) && !request.error && object(request.binding), 'missing coordinator run');
    const {binding, runDir, packedConsumerExecution: execution} = request;
    demand(['main', '21.x'].includes(binding.source_line) && request.line === binding.source_line
      && request.runId === binding.run_id && binding.source_clean === true && binding.input_clean === true
      && binding.phase === undefined, 'invalid current run binding');
    const version = json(root, 'projects/ngx-material-legacy/package.json').version;
    const sourceLine = /^22\./.test(version) ? 'main' : /^21\./.test(version) ? '21.x' : null;
    demand(sourceLine === binding.source_line, 'wrong checkout source line');
    const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args],
      {cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024}).trim();
    demand(/^[0-9a-f]{40}$/.test(binding.source_commit) && /^[0-9a-f]{40}$/.test(binding.source_tree)
      && git(['rev-parse', 'HEAD']) === binding.source_commit && git(['rev-parse', 'HEAD^{tree}']) === binding.source_tree
      // Match rc-verify.observe_inputs: generated diagnostics are not source.
      && git(['status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)compatibility/rc/reports']) === '', 'stale or dirty checkout');
    demand(object(execution) && execution.run_id === binding.run_id && execution.exit_code === 0
      && typeof execution.invocation_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),
      'missing successful coordinator-observed packed invocation');
    const run = json(runDir, 'run.json');
    demand(run.run_id === binding.run_id && run.source?.line === binding.source_line
      && run.source.commit === binding.source_commit && run.source.git_tree_sha === binding.source_tree
      && run.source.content_sha256 === binding.source_content_sha256 && run.source.clean === true
      && run.execution_inputs?.commit === binding.source_commit && run.execution_inputs.tree === binding.source_tree
      && run.execution_inputs.line === binding.source_line && run.execution_inputs.clean === true
      && run.execution_inputs.inputs_sha256 === binding.inputs_sha256, 'wrong run source snapshot');
    for (const [field, value] of [['artifacts_sha256', run.artifacts], ['environment_sha256', run.environment],
      ['oracles_sha256', run.oracles], ['pack_execution_sha256', run.pack_execution], ['pack_metadata_sha256', run.pack_metadata]]) {
      demand(value !== undefined && /^[0-9a-f]{64}$/.test(binding[field]) && digest(value) === binding[field], 'changed run ' + field);
    }
    const matrixBytes = member(root, 'compatibility/rc/matrices/full-verify.json');
    demand(hash(matrixBytes) === binding.matrix_sha256, 'changed expected matrix');
    const matrix = JSON.parse(matrixBytes).checks.find(row => row.check_id === 'packed-consumer');
    const groups = matrix?.acceptance?.cases_by_line?.[binding.source_line];
    const expected = allConsumerCaseIds(loadExportKeys());
    demand(object(groups) && Object.values(groups).every(Array.isArray)
      && sameIds(Object.values(groups).flat(), expected) && expected.includes(SELECT_FOCUS_CLICK_CASE_ID), 'incomplete packed roster');
    demand(Array.isArray(run.artifacts) && run.artifacts.filter(row => row?.id === 'library').length === 1, 'missing unique library');
    const library = run.artifacts.find(row => row.id === 'library');
    checkedBytes(runDir, library);
    const identity = {sha256: library.sha256, bytes: library.bytes};
    const report = json(runDir, 'reports/packed-consumer.json');
    demand(report.schema_version === 1 && report.template === false && report.check_id === 'packed-consumer'
      && report.line === binding.source_line && report.run_id === binding.run_id
      && report.invocation_id === execution.invocation_id && isDeepStrictEqual(report.binding, binding), 'wrong packed report subject');
    demand(report.result === 'pass' && report.coverage === 'complete' && report.exit_code === 0
      && report.subject_kind === 'artifact' && isDeepStrictEqual(report.subject_ids, ['library'])
      && isDeepStrictEqual(report.artifacts, {library: identity}), 'incomplete or failed packed result');
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) {
      demand(sameIds(report[field], expected), 'incomplete ' + field);
    }
    demand(report.passed === expected.length && report.failed === 0 && report.skipped === 0, 'wrong packed counts');
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions']) {
      demand(Array.isArray(report[field]) && report[field].length === 0, 'unresolved ' + field);
    }
    const relative = `evidence/packed-consumer/${execution.invocation_id}/consumer-observations.json`;
    demand(Array.isArray(report.outputs) && report.outputs.length === 1 && report.outputs[0].path === relative, 'wrong assertion ownership');
    const observation = JSON.parse(checkedBytes(runDir, report.outputs[0]));
    demand(observation.kind === 'packed-consumer-observations' && observation.check_id === 'packed-consumer'
      && observation.run_id === binding.run_id && observation.invocation_id === execution.invocation_id
      && observation.library_sha256 === library.sha256, 'wrong assertion subject');
    demand(Array.isArray(report.case_results) && sameIds(report.case_results.map(row => row?.case_id), expected)
      && report.case_results.every(row => row.result === 'pass' && row.kind === 'assertion'
        && isDeepStrictEqual(row.output_paths, [relative])), 'incomplete report assertions');
    demand(Array.isArray(observation.cases) && sameIds(observation.cases.map(row => row?.case_id), expected)
      && observation.cases.every(row => row.result === 'pass'), 'incomplete observed cases');
    const selected = observation.cases.find(row => row.case_id === SELECT_FOCUS_CLICK_CASE_ID);
    const harness = observation.extra?.harness;
    demand(selected.legacy_harness_passed === true && harness?.selectOpened === true && harness.selectClosed === true
      && harness.viewportShared === true && isDeepStrictEqual(harness.selectFocusClick, selected.observation)
      && packedSelectFocusClickCase(selected.observation).result === 'pass', 'insufficient select focus/click observations');
    return {ok: true, detail: 'Required select behavior observed in this run; complete G11 judgment and final sealing remain separate.',
      invocation_id: execution.invocation_id, output: report.outputs[0], library: identity};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
