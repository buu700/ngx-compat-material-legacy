/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete same-run browser prerequisite; individual raw behavior is separate. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {deriveReleaseIds, familiesFromInventory, engineIdentityProblems} from './browser-matrix-roster.mjs';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (root, path) => JSON.parse(readEvidenceMember(root, path));
const runtimes = ['zoneful', 'zoneless'];
/** Report labels alone cannot qualify a slice, foreign artifact, unknown engine,
 * missing runtime or rehashed raw identity. Final sealing remains independent. */
export function validateBrowserMatrixRun({root, request}) {
  try {
    const packed = validatePackedConsumerRun({root, request}); demand(packed.ok, packed.detail);
    const {binding, runDir, browserExecution: execution} = request;
    demand(object(execution) && execution.run_id === binding.run_id && execution.exit_code === 0
      && typeof execution.invocation_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),
      'missing successful coordinator-observed browser invocation');
    const inventory = json(root, 'testing/legacy-runner/historical-inventory.json');
    const expected = deriveReleaseIds(familiesFromInventory(inventory), binding.source_line);
    const matrix = json(root, 'compatibility/rc/matrices/full-verify.json');
    const groups = matrix.checks.find(row => row.check_id === 'browser-matrix')?.acceptance?.cases_by_line?.[binding.source_line];
    demand(object(groups) && isDeepStrictEqual(Object.keys(groups), ['release-engine-runtime-state-matrix'])
      && isDeepStrictEqual(groups['release-engine-runtime-state-matrix'], expected)
      && expected.length === 912 && new Set(expected).size === expected.length, 'incomplete full browser matrix roster');
    const report = json(runDir, 'reports/browser-matrix.json');
    demand(report.schema_version === 1 && report.template === false && report.check_id === 'browser-matrix'
      && report.line === binding.source_line && report.run_id === binding.run_id
      && report.invocation_id === execution.invocation_id && isDeepStrictEqual(report.binding, binding), 'wrong browser report subject');
    demand(report.result === 'pass' && report.coverage === 'complete' && report.exit_code === 0
      && report.subject_kind === 'artifact' && isDeepStrictEqual(report.subject_ids, ['library'])
      && isDeepStrictEqual(report.artifacts, {library: packed.library}), 'incomplete or failed browser result');
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids'])
      demand(sameIds(report[field], expected), 'incomplete browser ' + field);
    demand(report.passed === expected.length && report.failed === 0 && report.skipped === 0, 'wrong browser counts');
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions'])
      demand(Array.isArray(report[field]) && report[field].length === 0, 'unresolved browser ' + field);
    const relative = `evidence/browser-matrix/${execution.invocation_id}/browser-observations.json`;
    demand(Array.isArray(report.outputs) && report.outputs.length === 1 && report.outputs[0].path === relative, 'wrong browser assertion ownership');
    const output = report.outputs[0], bytes = readEvidenceMember(runDir, relative);
    demand(/^[0-9a-f]{64}$/.test(output.sha256) && Number.isSafeInteger(output.bytes) && output.bytes > 0
      && bytes.length === output.bytes && hash(bytes) === output.sha256, 'browser assertion bytes/hash mismatch');
    const observation = JSON.parse(bytes);
    demand(observation.kind === 'browser-matrix-observations' && observation.check_id === 'browser-matrix'
      && observation.run_id === binding.run_id && observation.invocation_id === execution.invocation_id
      && observation.library_sha256 === packed.library.sha256 && observation.source_clean === true
      && observation.source_commit === binding.source_commit && observation.source_tree === binding.source_tree,
      'wrong browser assertion subject');
    demand(Array.isArray(report.case_results) && sameIds(report.case_results.map(row => row?.case_id), expected)
      && report.case_results.every(row => row.result === 'pass' && row.kind === 'assertion' && isDeepStrictEqual(row.output_paths, [relative])),
      'incomplete browser report assertions');
    demand(Array.isArray(observation.cases) && sameIds(observation.cases.map(row => row?.case_id), expected)
      && observation.cases.every(row => row.result === 'pass' && typeof row.evidence === 'string' && row.evidence.length > 0),
      'incomplete browser observed cases');
    demand(engineIdentityProblems(observation.engines).length === 0 && observation.webkit_backend === 'webkitgtk'
      && observation.safari_certification === false && observation.hydration_replay?.ok === true, 'incomplete browser native prerequisites');
    demand(object(observation.closeout_diagnostics) && sameIds(Object.keys(observation.closeout_diagnostics), runtimes), 'missing both native runtimes');
    for (const runtime of runtimes) {
      const diagnostic = observation.closeout_diagnostics[runtime], raw = diagnostic?.observation, zoneless = runtime === 'zoneless';
      demand(object(diagnostic) && diagnostic.status === 'executed' && diagnostic.exit_code === 0
        && diagnostic.artifact_bound === true && diagnostic.runtime_passed === true && diagnostic.acceptance_credit === false
        && diagnostic.progress_csp_passed === true && diagnostic.core_high_contrast_passed === true
        && diagnostic.report === `reports/closeout-browser-diagnostics${zoneless ? '-zoneless' : ''}.json`, 'failed ' + runtime + ' native diagnostic');
      demand(object(raw) && raw.schema_version === 1 && raw.tarball_sha256 === packed.library.sha256 && raw.error === null
        && /^(?:Headless)?Chrome\//.test(raw.browser ?? '') && raw.zoneless === zoneless
        && raw.bundle_has_zone === !zoneless && raw.zone_global === (zoneless ? 'undefined' : 'function')
        && raw.angular_zone_entered === !zoneless, 'wrong ' + runtime + ' native identity');
    }
    return {ok: true, detail: 'Complete current-clean same-run packed/browser prerequisites and both runtime identities verified; individual behavior and final sealing remain separate.',
      observation, invocation_id: execution.invocation_id, output, library: packed.library,
      packed_consumer: {invocation_id: packed.invocation_id, output: packed.output}};
  } catch (error) {return {ok: false, detail: error.message};}
}
