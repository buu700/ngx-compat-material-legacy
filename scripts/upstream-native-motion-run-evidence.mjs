/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {deriveMainRoster, assertCase, SOURCE_LINE} from './native-motion-roster.mjs';
import {engineIdentityProblems} from './browser-matrix-roster.mjs';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (root, path) => JSON.parse(readEvidenceMember(root, path));
/** The current writer retains raw observations. Re-evaluate all306 against
 * the unchanged motion predicates, in the same clean-source full packed run. */
export function validateNativeMotionRun({root, request}) {
  try {
    const packed = validatePackedConsumerRun({root, request}); demand(packed.ok, packed.detail);
    const {binding, runDir, nativeMotionExecution: execution} = request;
    demand(object(execution) && execution.run_id === binding.run_id && execution.exit_code === 0
      && typeof execution.invocation_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),
      'missing successful coordinator-observed native-motion invocation');
    const roster = deriveMainRoster(), expected = roster.ids;
    const groups = json(root, 'compatibility/rc/matrices/full-verify.json').checks.find(row => row.check_id === 'native-motion')?.acceptance?.cases_by_line?.[binding.source_line];
    demand(SOURCE_LINE === binding.source_line && object(groups) && isDeepStrictEqual(groups, roster.groups)
      && expected.length === 306 && new Set(expected).size === expected.length, 'incomplete full native-motion roster');
    const report = json(runDir, 'reports/native-motion.json');
    demand(report.schema_version === 1 && report.template === false && report.check_id === 'native-motion'
      && report.line === binding.source_line && report.run_id === binding.run_id && report.invocation_id === execution.invocation_id
      && isDeepStrictEqual(report.binding, binding), 'wrong native-motion report subject');
    demand(report.result === 'pass' && report.coverage === 'complete' && report.exit_code === 0
      && report.subject_kind === 'artifact' && isDeepStrictEqual(report.subject_ids, ['library'])
      && isDeepStrictEqual(report.artifacts, {library: packed.library}), 'incomplete or failed native-motion result');
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids'])
      demand(sameIds(report[field], expected), 'incomplete native-motion ' + field);
    demand(report.passed === expected.length && report.failed === 0 && report.skipped === 0, 'wrong native-motion counts');
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions'])
      demand(Array.isArray(report[field]) && report[field].length === 0, 'unresolved native-motion ' + field);
    const relative = `evidence/native-motion/${execution.invocation_id}/motion-observations.json`;
    demand(Array.isArray(report.outputs) && report.outputs.length === 1 && report.outputs[0].path === relative, 'wrong native-motion assertion ownership');
    const output = report.outputs[0], bytes = readEvidenceMember(runDir, relative);
    demand(/^[0-9a-f]{64}$/.test(output.sha256) && Number.isSafeInteger(output.bytes) && output.bytes > 0
      && bytes.length === output.bytes && hash(bytes) === output.sha256, 'native-motion assertion bytes/hash mismatch');
    const observation = JSON.parse(bytes);
    demand(observation.kind === 'native-motion-observations' && observation.check_id === 'native-motion'
      && observation.run_id === binding.run_id && observation.invocation_id === execution.invocation_id
      && observation.library_sha256 === packed.library.sha256 && observation.source_clean === true
      && observation.source_commit === binding.source_commit && observation.source_tree === binding.source_tree,
      'wrong native-motion assertion subject');
    demand(Array.isArray(report.case_results) && sameIds(report.case_results.map(row => row?.case_id), expected)
      && report.case_results.every(row => row.result === 'pass' && row.kind === 'assertion' && isDeepStrictEqual(row.output_paths, [relative])),
      'incomplete native-motion report assertions');
    demand(object(observation.engines) && sameIds(Object.keys(observation.engines), ['chromium', 'firefox', 'webkit'])
      && engineIdentityProblems(observation.engines).length === 0 && observation.webkit_backend === 'webkitgtk'
      && observation.safari_certification === false && isDeepStrictEqual(observation.not_applicable, roster.notApplicable)
      && isDeepStrictEqual(observation.per_group, roster.perGroup) && isDeepStrictEqual(observation.per_engine, roster.perEngine),
      'incomplete native-motion engine/coverage identities');
    demand(Array.isArray(observation.cases) && sameIds(observation.cases.map(row => row?.case_id), expected)
      && observation.cases.every(row => row.result === 'pass' && typeof row.evidence === 'string' && row.evidence.length > 0
        && object(row.observation) && assertCase(row.case_id, row.observation).length === 0), 'insufficient raw native-motion cases');
    return {ok: true, detail: 'Complete current-clean same-run packed/native-motion prerequisites and all306 raw motion predicates verified; individual contracts and final sealing remain separate.',
      observation, invocation_id: execution.invocation_id, output, library: packed.library,
      packed_consumer: {invocation_id: packed.invocation_id, output: packed.output}};
  } catch (error) {return {ok: false, detail: error.message};}
}
