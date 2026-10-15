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

export function readEvidenceMember(root, relative) {
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
const json = (root, path) => JSON.parse(readEvidenceMember(root, path));
function checkedBytes(root, record) {
  demand(object(record) && /^[0-9a-f]{64}$/.test(record.sha256)
    && Number.isSafeInteger(record.bytes) && record.bytes > 0, 'missing member identity');
  const bytes = readEvidenceMember(root, record.path);
  demand(bytes.length === record.bytes && hash(bytes) === record.sha256, 'member bytes/hash mismatch');
  return bytes;
}

/** Shared packed-run identity and complete assertion validation only.
 * A registered individual case contract must still re-evaluate its observations.
 * The coordinator/final sealer owns execution authenticity and full acceptance.
 */
export function validatePackedConsumerRun({root, request}) {
  try {
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
    const matrixBytes = readEvidenceMember(root, 'compatibility/rc/matrices/full-verify.json');
    demand(hash(matrixBytes) === binding.matrix_sha256, 'changed expected matrix');
    const matrix = JSON.parse(matrixBytes).checks.find(row => row.check_id === 'packed-consumer');
    const groups = matrix?.acceptance?.cases_by_line?.[binding.source_line];
    const expected = allConsumerCaseIds(loadExportKeys());
    demand(object(groups) && Object.values(groups).every(Array.isArray)
      && sameIds(Object.values(groups).flat(), expected) && expected.length > 0, 'incomplete packed roster');
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
    return {ok: true, invocation_id: execution.invocation_id, output: report.outputs[0], library: identity, observation};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
