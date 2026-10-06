/** Bind the upstream audit's advisory case to this run's actual dependency producer. */
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

function requireValue(value, message) {
  if (!value) throw new Error(message);
}
function checkedPath(root, relative) {
  requireValue(typeof relative === 'string' && relative.length > 0 && !relative.includes('\\'), 'invalid evidence path');
  const parts = relative.split('/');
  requireValue(parts.every(part => part && part !== '.' && part !== '..'), 'evidence path escape');
  const path = resolve(root, ...parts);
  requireValue(path.startsWith(resolve(root) + sep), 'evidence path escape');
  let cursor = root;
  for (const part of parts) {
    cursor = join(cursor, part);
    requireValue(!lstatSync(cursor).isSymbolicLink(), 'symlink evidence');
  }
  requireValue(lstatSync(path).isFile(), 'evidence is not a regular file');
  return path;
}
function sameIds(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length
    && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
}

export function validateCurrentAdvisories({runDir, binding, expectedCaseIds, now = Date.now()}) {
  try {
    requireValue(binding && ['main', '21.x'].includes(binding.source_line), 'unsupported source line');
    requireValue(Array.isArray(expectedCaseIds) && expectedCaseIds.length > 0
      && new Set(expectedCaseIds).size === expectedCaseIds.length, 'unresolved dependency roster');
    const report = JSON.parse(readFileSync(checkedPath(runDir, 'reports/dependency-eligibility.json'), 'utf8'));
    requireValue(report.check_id === 'dependency-eligibility' && report.line === binding.source_line
      && report.run_id === binding.run_id && isDeepStrictEqual(report.binding, binding), 'wrong dependency subject');
    requireValue(report.result === 'pass' && report.coverage === 'complete' && report.exit_code === 0,
      'dependency lookup is incomplete or failed');
    requireValue(report.subject_kind === 'source' && isDeepStrictEqual(report.subject_ids, ['source']), 'wrong dependency scope');
    for (const field of ['expected_case_ids', 'discovered_case_ids', 'executed_case_ids', 'passed_case_ids']) {
      requireValue(sameIds(report[field], expectedCaseIds), `incomplete ${field}`);
    }
    for (const field of ['failed_case_ids', 'skipped_case_ids', 'unresolved_case_ids', 'exceptions']) {
      requireValue(Array.isArray(report[field]) && report[field].length === 0, `unresolved ${field}`);
    }
    requireValue(typeof report.invocation_id === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(report.invocation_id), 'invalid dependency invocation');
    const relative = `evidence/dependency-eligibility/${report.invocation_id}/eligibility-observations.json`;
    requireValue(Array.isArray(report.outputs), 'missing dependency outputs');
    const records = report.outputs.filter(output => output.path === relative);
    requireValue(records.length === 1, 'missing or duplicate dependency observation');
    const bytes = readFileSync(checkedPath(runDir, relative));
    requireValue(records[0].bytes === bytes.length && records[0].sha256 === createHash('sha256').update(bytes).digest('hex'),
      'dependency observation hash mismatch');
    const observation = JSON.parse(bytes);
    requireValue(observation.kind === 'dependency-eligibility-observations'
      && observation.check_id === report.check_id && observation.run_id === report.run_id
      && observation.invocation_id === report.invocation_id && observation.line === report.line
      && isDeepStrictEqual(observation.binding, binding), 'wrong dependency observation subject');
    requireValue(observation.lookup === 'queried' && observation.lock_packages > 0
      && observation.uncovered_lock_packages === 0 && observation.vendor_files > 0
      && Array.isArray(observation.vendor_hash_mismatches) && observation.vendor_hash_mismatches.length === 0,
      'unknown or incomplete lookup coverage');
    const cutoff = Date.parse(observation.lookup_cutoff);
    requireValue(Number.isFinite(cutoff) && cutoff <= now && now - cutoff <= 7 * 86400000, 'stale or future advisory cutoff');
    requireValue(Array.isArray(observation.cases) && sameIds(observation.cases.map(item => item.case_id), expectedCaseIds)
      && observation.cases.every(item => item.result === 'pass'), 'failed or omitted advisory assertion');
    requireValue(Array.isArray(report.case_results) && sameIds(report.case_results.map(item => item.case_id), expectedCaseIds)
      && report.case_results.every(item => item.result === 'pass' && item.kind === 'assertion'
        && isDeepStrictEqual(item.output_paths, [relative])), 'missing dependency assertion ownership');
    return {ok: true, detail: 'Current dependency lookup is bound to this source, line, run and invocation; security clearance remains separate.',
      dependency_invocation_id: report.invocation_id, output: records[0]};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
