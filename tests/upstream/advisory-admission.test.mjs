import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateCurrentAdvisories} from '../../scripts/upstream-advisory-admission.mjs';

const ids = ['lookup', 'coverage', 'disposition'];
function fixture(line = 'main') {
  const root = mkdtempSync(join(tmpdir(), 'audit-advisory-'));
  const binding = {run_id: 'fixture-run', source_line: line, source_commit: 'a'.repeat(40)};
  const now = Date.now();
  const invocation = 'fixture-dependency';
  const relative = `evidence/dependency-eligibility/${invocation}/eligibility-observations.json`;
  const observation = {kind: 'dependency-eligibility-observations', check_id: 'dependency-eligibility', line,
    run_id: binding.run_id, invocation_id: invocation, binding, lookup: 'queried', lookup_cutoff: new Date(now).toISOString(),
    lock_packages: 100, uncovered_lock_packages: 0, vendor_files: 119, vendor_hash_mismatches: [],
    cases: ids.map(case_id => ({case_id, result: 'pass'}))};
  const report = {check_id: 'dependency-eligibility', line, run_id: binding.run_id, invocation_id: invocation, binding,
    result: 'pass', coverage: 'complete', exit_code: 0, subject_kind: 'source', subject_ids: ['source'],
    expected_case_ids: ids, discovered_case_ids: ids, executed_case_ids: ids, passed_case_ids: ids,
    failed_case_ids: [], skipped_case_ids: [], unresolved_case_ids: [], exceptions: [],
    case_results: ids.map(case_id => ({case_id, result: 'pass', kind: 'assertion', output_paths: [relative]}))};
  mkdirSync(join(root, 'reports'), {recursive: true});
  mkdirSync(join(root, 'evidence/dependency-eligibility', invocation), {recursive: true});
  function save() {
    const bytes = Buffer.from(JSON.stringify(observation));
    writeFileSync(join(root, relative), bytes);
    report.outputs = [{path: relative, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length}];
    writeFileSync(join(root, 'reports/dependency-eligibility.json'), JSON.stringify(report));
  }
  save();
  return {root, binding, observation, report, relative, save,
    check: () => validateCurrentAdvisories({runDir: root, binding, expectedCaseIds: ids, now}),
    dispose: () => rmSync(root, {recursive: true, force: true})};
}
for (const line of ['main', '21.x']) {
  test(`${line}: complete current lookup is admissible`, () => {
    const f = fixture(line);
    try { assert.equal(f.check().ok, true); } finally { f.dispose(); }
  });
}
const mutations = [
  ['wrong line', f => {f.report.line = '21.x';}],
  ['wrong source binding', f => {f.report.binding = {...f.binding, source_commit: 'b'.repeat(40)};}],
  ['wrong run', f => {f.report.run_id = 'old-run';}],
  ['wrong invocation', f => {f.observation.invocation_id = 'old-invocation';}],
  ['failed child', f => {f.report.exit_code = 7;}],
  ['passing slice', f => {f.report.coverage = 'slice';}],
  ['omitted required case', f => {f.report.executed_case_ids = ids.slice(1);}],
  ['duplicate case', f => {f.report.passed_case_ids = ['lookup', 'coverage', 'coverage'];}],
  ['unknown HTTP lookup', f => {f.observation.lookup = 'unknown';}],
  ['stale lookup', f => {f.observation.lookup_cutoff = '2020-01-01T00:00:00Z';}],
  ['future lookup', f => {f.observation.lookup_cutoff = '2099-01-01T00:00:00Z';}],
  ['uncovered dependency', f => {f.observation.uncovered_lock_packages = 1;}],
  ['missing vendor', f => {f.observation.vendor_files = 0;}],
  ['failed substantive assertion', f => {f.observation.cases[0].result = 'fail';}],
  ['pending decision', f => {f.report.unresolved_case_ids = ['owner-grant'];}],
  ['borrowed assertion output', f => {f.report.case_results[0].output_paths = ['evidence/other.json'];}],
];
for (const [name, mutate] of mutations) {
  test(`rejects ${name}, including rehashed observations`, () => {
    const f = fixture();
    try { mutate(f); f.save(); assert.equal(f.check().ok, false); } finally { f.dispose(); }
  });
}
test('rejects tampered bytes without restamping hashes', () => {
  const f = fixture();
  try { writeFileSync(join(f.root, f.relative), '{}'); assert.equal(f.check().ok, false); } finally { f.dispose(); }
});
test('rejects symlinked report and observation', () => {
  for (const relative of ['reports/dependency-eligibility.json', 'evidence/dependency-eligibility/fixture-dependency/eligibility-observations.json']) {
    const f = fixture();
    try {
      const path = join(f.root, relative);
      renameSync(path, path + '.saved'); symlinkSync(path + '.saved', path);
      assert.equal(f.check().ok, false);
    } finally { f.dispose(); }
  }
});
test('rejects an unresolved or empty roster', () => {
  const f = fixture();
  try {
    for (const expectedCaseIds of [null, []]) assert.equal(validateCurrentAdvisories({runDir: f.root, binding: f.binding, expectedCaseIds}).ok, false);
  } finally { f.dispose(); }
});
