/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Recompute existing applicability producers after one reviewed test change.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {buildScopeEvidenceOk} from './upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk, testConsolidationEntryOk} from './upstream-test-consolidation-evidence.mjs';
import {reviewSliderInputScope, sliderInputScopeEvidenceOk} from './upstream-slider-input-scope.mjs';
import {reviewSliderThumbDestroyScope, sliderThumbDestroyEvidenceOk} from './upstream-slider-thumb-destroy-scope.mjs';
import {analyzeBazelBuildSubjects, reviewBazelBuildContext, bazelBuildEvidenceOk} from './upstream-bazel-build-scope.mjs';
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const prefix = 'compatibility/rc/autocomplete-empty-selection-';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const reportPrefix = 'compatibility/f10/disposition-ledger/evidence/';
const names = ['closeout-fourteen-build-scope-review', 'harness-animation-preparation-test-consolidation',
  'closeout-three-slider-input-source-review', 'closeout-slider-thumb-destroy-review', 'closeout-bazel-build-only-review'];
const pins = {main: '347e2d714c947a0749cb90c3020dba6057ebae639a33cdf2e57bbd30970d1752',
  '21.x': '26d9770317733bd56daa379551f40f19192070ce397c5e6e66f207c959a12f93'};
const ts = createRequire(import.meta.url)('typescript');
const omitPopulation = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'product_source_population_sha256'));

export function inspectEmptySelectionSourceContext({root = defaultRoot, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p)));
  const raw = read(prefix + 'scope-context.json.gz'), prior = JSON.parse(gunzipSync(raw));
  assert.equal(hash(raw), pins[prior.line]);
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(line, prior.line); assert.equal(prior.entries.length, 52);
  assert.deepEqual(prior.reports.map(row => row.path), names.map(n => reportPrefix + n + '.json'));
  for (const row of prior.reports) assert.equal(hash(row.text), row.sha256);
  const oldReports = new Map(prior.reports.map(row => [row.path, Buffer.from(row.text)]));
  const bodies = prior.reports.map(row => JSON.parse(row.text));
  const native = JSON.parse(gunzipSync(read(prefix + 'context.json.gz')));
  const spec = native.members.find(row => row.path === prior.changed_product); assert.ok(spec);
  assert.equal(hash(spec.before), spec.before_sha256); assert.equal(hash(read(spec.path)), spec.after_sha256);
  const currentLedgerBytes = read(ledgerPath), currentLedger = JSON.parse(currentLedgerBytes);
  const productPaths = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-files', 'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  assert.equal(productPaths.length, 1141); assert.deepEqual(bodies[0].candidate_context.tracked_product_paths, productPaths);
  const changed = bodies[0].candidate_context.product_members.filter(row => hash(read(row.path)) !== row.sha256);
  assert.deepEqual(changed.map(row => row.path), [spec.path]); assert.equal(changed[0].sha256, spec.before_sha256);
  const sourcePaths = () => candidateProductSourcePaths(root);
  const oldRead = p => oldReports.get(p) || (p === spec.path ? Buffer.from(spec.before) : read(p));
  const decisions = bodies.map(body => structuredClone(body.reviews ?? body.hunk_reviews));
  const originals = bodies.map(body => structuredClone(body));
  // The original task used a borrowed6.0.3 parser. A later branch-native
  // qualification changes only this diagnostic identity on21.x. Authenticate
  // that exact transition and recheck every original source-analysis field;
  // do not treat an arbitrary extra context object as accepted drift.
  let compilerAlignment = null;
  const currentBazel = JSON.parse(read(prior.reports[4].path));
  if (currentBazel.slider_range_followup_branch_compiler_context !== undefined) {
    assert.equal(line, '21.x');
    const alignment = currentBazel.slider_range_followup_branch_compiler_context;
    const previousPath = 'compatibility/rc/slider-range-followup-floor-compiler-prior.json.gz';
    const previousRaw = read(previousPath), previous = JSON.parse(gunzipSync(previousRaw));
    assert.equal(hash(previousRaw), '9ca79a96da3c3df19a1843c23a7c8a967c71d16ce691deebdbb229ec4ba1ac24');
    assert.equal(previous.line, '21.x'); assert.equal(previous.path, prior.reports[4].path);
    assert.equal(hash(previous.text), previous.sha256);
    const actual = analyzeBazelBuildSubjects(read);
    assert.equal(actual.compiler, '5.9.2'); assert.equal(originals[4].source_analysis.compiler, '6.0.3');
    const before = structuredClone(originals[4].source_analysis), after = structuredClone(actual);
    delete before.compiler; delete after.compiler; assert.deepEqual(after, before);
    assert.deepEqual(currentBazel.source_analysis, actual);
    assert.deepEqual(alignment, {prior: {path: previousPath, sha256: hash(previousRaw)}, before_compiler: '6.0.3',
      current_branch_compiler: '5.9.2', all_other_source_analysis_and_original_verdicts_unchanged: true,
      actual_native_packed_or_floor_qualified: false});
    assert.deepEqual(previous.entries.map(row => row.sha).sort(), currentBazel.scope_sha_ids.slice().sort());
    compilerAlignment = {actual, alignment, previous};
  }
  bodies[0].candidate_context.product_members = bodies[0].candidate_context.product_members.map(row => {
    if (row.path !== spec.path) return row;
    const value = read(row.path); return {...row, sha256: hash(value), bytes: value.length};
  });
  bodies[1].candidate_context.sha256 = ''; // Bound after adding explicit context below.
  const slider = reviewSliderInputScope(read, sourcePaths, line);
  assert.deepEqual(omitPopulation(slider), omitPopulation(originals[2].source_scope));
  bodies[2].source_scope = slider;
  const thumb = reviewSliderThumbDestroyScope(read, sourcePaths, line);
  const oldThumb = structuredClone(originals[3].source_scope), newThumb = structuredClone(thumb);
  delete oldThumb.retained_architecture.product_source_population_sha256;
  delete newThumb.retained_architecture.product_source_population_sha256;
  assert.deepEqual(newThumb, oldThumb); bodies[3].source_scope = thumb;
  const bazel = reviewBazelBuildContext(read, () => productPaths, line);
  const oldBazel = structuredClone(originals[4].candidate_context), newBazel = structuredClone(bazel);
  for (const value of [oldBazel, newBazel]) {
    delete value.product_population_sha256;
    value.product_members = value.product_members.filter(row => row.path !== spec.path);
  }
  assert.deepEqual(newBazel, oldBazel); bodies[4].candidate_context = bazel;
  const qualification = {path: prefix + 'scope-context.json.gz', sha256: hash(raw), source_parent: prior.source_parent,
    reviewed_test_delta: {path: spec.path, before_sha256: spec.before_sha256, after_sha256: spec.after_sha256},
    other_product_members_unchanged: 1140, original_source_decisions_unchanged: true, native_packed_or_floor_qualified: false};
  const writes = new Map();
  for (const [index, body] of bodies.entries()) {
    assert.deepEqual(body.reviews ?? body.hunk_reviews, decisions[index]);
    body.autocomplete_empty_selection_context_requalification = qualification;
    if (index === 1) body.candidate_context.sha256 = hash(writes.get(prior.reports[0].path));
    if (index === 4 && compilerAlignment) {
      assert.equal(bytes(body).toString(), compilerAlignment.previous.text, 'unreviewed change before compiler alignment');
      body.source_analysis = compilerAlignment.actual;
      body.slider_range_followup_branch_compiler_context = compilerAlignment.alignment;
    }
    writes.set(prior.reports[index].path, bytes(body));
  }
  const entries = prior.entries.map(old => {
    const next = structuredClone(old);
    if (next.source_check?.evidence_report_sha256 !== undefined) {
      assert.equal(next.source_check.evidence_report_sha256, hash(oldReports.get(old.evidence_report)));
      next.source_check.evidence_report_sha256 = hash(writes.get(old.evidence_report));
    }
    const current = currentLedger.entries.find(row => row.sha === old.sha);
    assert.ok(JSON.stringify(current) === JSON.stringify(old) || JSON.stringify(current) === JSON.stringify(next), 'unreviewed ledger delta');
    return next;
  });
  let proposedLedger = currentLedgerBytes.toString();
  const file = ts.parseJsonText('ledger.json', proposedLedger), replacements = new Map(entries.map(row => [row.sha, row]));
  assert.equal(file.parseDiagnostics.length, 0);
  const array = file.statements[0].expression.properties.find(row => row.name.text === 'entries').initializer;
  const edits = [];
  for (const node of array.elements) {
    const row = JSON.parse(node.getText(file)), replacement = replacements.get(row.sha); if (!replacement) continue;
    const indent = ' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
    edits.push({start: node.getStart(file), end: node.end, text: JSON.stringify(replacement, null, 2).replaceAll('\n', '\n' + indent)});
  }
  assert.equal(edits.length, 52);
  for (const edit of edits.reverse()) proposedLedger = proposedLedger.slice(0, edit.start) + edit.text + proposedLedger.slice(edit.end);
  const proposed = JSON.parse(proposedLedger), chosen = new Set(entries.map(row => row.sha));
  assert.deepEqual(proposed.entries.filter(row => !chosen.has(row.sha)), currentLedger.entries.filter(row => !chosen.has(row.sha)));
  writes.set(ledgerPath, Buffer.from(proposedLedger));
  const proposedRead = p => writes.get(p) || read(p);
  const oldLedger = structuredClone(proposed);
  oldLedger.entries = oldLedger.entries.map(row => prior.entries.find(old => old.sha === row.sha) || row);
  let beforeBazel = null;
  if (compilerAlignment) {
    const body = JSON.parse(oldReports.get(prior.reports[4].path));
    body.source_analysis = compilerAlignment.actual;
    beforeBazel = bytes(body);
  }
  // The historical source analyses are unchanged. Align their compiler
  // diagnostic for this current consistency check, rather than claiming that
  // the untouched old6.0.3 receipt was executed under5.9.2.
  const beforeRead = p => p === ledgerPath ? bytes(oldLedger)
    : p === prior.reports[4].path && beforeBazel ? beforeBazel : oldRead(p);
  const validate = (read, sourceEntries) => {
    const docs = prior.reports.map(row => JSON.parse(read(row.path))), results = [];
    const batch = testConsolidationBatchOk(docs[1], read, productPaths);
    for (const entry of sourceEntries) {
      const index = prior.reports.findIndex(row => row.path === entry.evidence_report);
      const ok = index === 0 ? buildScopeEvidenceOk(docs[0], entry, read, productPaths)
        : index === 1 ? testConsolidationEntryOk(docs[1], entry, read, batch)
        : index === 2 ? sliderInputScopeEvidenceOk(docs[2], entry, read, sourcePaths, line)
        : index === 3 ? sliderThumbDestroyEvidenceOk(docs[3], entry, read, sourcePaths, line)
        : bazelBuildEvidenceOk(docs[4], entry, read, () => productPaths, line);
      assert.equal(ok, true, 'actual source validator: ' + entry.sha); results.push(entry.sha);
    }
    return results;
  };
  assert.deepEqual(validate(beforeRead, prior.entries), validate(proposedRead, entries));
  for (const row of prior.reports) assert.ok(read(row.path).equals(oldReports.get(row.path)) || read(row.path).equals(writes.get(row.path)), 'unreviewed report delta');
  return {line, writes, summary: {line, source_rows_requalified: entries.length, product_members: productPaths.length,
    changed_product_members: 1, other_product_members_unchanged: 1140, original_source_judgments_unchanged: true,
    qualified_branch_compiler_alignment: compilerAlignment ? {historical_compiler: '6.0.3', current_compiler: '5.9.2',
      other_original_source_analysis_fields_unchanged: true, historical_diagnostic_aligned_for_current_consistency_check: true} : null,
    actual_native_packed_or_floor_qualified: false}};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectEmptySelectionSourceContext();
  if (process.argv.includes('--write')) for (const [path, value] of result.writes) writeFileSync(resolve(defaultRoot, path), value);
  console.log(JSON.stringify({...result.summary, applied: process.argv.includes('--write')}));
}
