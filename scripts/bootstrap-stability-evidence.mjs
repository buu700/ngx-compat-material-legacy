/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite qualification of actual current bootstrap preparation; original source history stays immutable. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bootstrapBefore, publicFixtureReferenceFacts, compareBootstrapSource, BOOTSTRAP_PATH} from './bootstrap-stability-contract.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
const prefix = 'compatibility/rc/bootstrap-stability-';
const inputPath = prefix + 'qualification-inputs.json';
const inputSha = '59d6008a1f0916528d74ef2c9f262fa4dcafed1e54a2e633f676783171b766b5';
export const BOOTSTRAP_QUALIFICATION_REPORT = prefix + 'current-qualification.json';
const receiptShas = new Set(['c26dd866e2952a7ac117397418d3f7697badf816', '205c0a4dcb8368356109084f8c68303650b16a4a',
  '2600e0d7970960f126acd57967815f88e5c2be81', '4e0ea8e7dc8033a30e84c64b42eda5899c7ddacf',
  '357cfd3b8d5fa9505215914b10de27c148f7a02d', '31077c2eae76b0bc0bc348ee2bd2801864aa409a',
  '83006db94a2912fa3cd3b7e1f1dcca9be064d183', '830e39ee983fcee507d3f42362b36d734cac8132',
  '79c67d40f4fa4ca636be0157711bc33bca32fb81']);
export const requiresBootstrapPreparation = entry => receiptShas.has(entry.sha);
const same = (a, b, label) => assert.equal(hash(JSON.stringify(a)), hash(JSON.stringify(b)), label);
const reference = (read, path) => ({path, sha256: hash(read(path))});
export function inspectBootstrapPreparation(read) {
  assert.equal(hash(read(inputPath)), inputSha, 'unregistered preparation inputs');
  const input = JSON.parse(read(inputPath)), before = bootstrapBefore({readMember: read}), line = before.line;
  assert.equal(input.schema_version, 1); const selected = input.lines[line];
  for (const ref of [selected.before, selected.current_bootstrap, selected.controls])
    assert.equal(hash(read(ref.path)), ref.sha256, 'preparation member changed '+ref.path);
  const source = read(BOOTSTRAP_PATH).toString();
  const delta = compareBootstrapSource(before.bootstrap.text, source), references = publicFixtureReferenceFacts({readMember: read});
  const controls = JSON.parse(read(selected.controls.path));
  assert.equal(controls.line, line); assert.equal(controls.original_control.passed, 5); assert.equal(controls.original_control.failed, 3);
  assert.equal(controls.current_control.passed, 8); assert.equal(controls.current_control.failed, 0);
  assert.equal(controls.negative_controls, 8); assert.ok(controls.cases.every(n => n.result === 'rejected'));
  assert.equal(controls.actual_Angular_fixture_fakeAsync_native_browser_SSR_or_floor_qualified, false);
  same(controls.exact_source_delta, delta, 'contract report/source delta differs');
  same(controls.original_public_framework_references, references, 'framework reference differs');
  for (const ref of [controls.source_helper, controls.producer]) assert.equal(hash(read(ref.path)), ref.sha256, 'contract program changed');
  assert.equal(selected.original_source_reports.length, 9);
  const rows = selected.original_source_reports.map(row => {
    const prior = before.affected_source_receipts.find(n => n.sha === row.sha); assert.ok(prior);
    assert.equal(row.original_report.path, prior.evidence_report); assert.equal(row.original_report.sha256, prior.evidence_report_sha256);
    assert.equal(hash(read(row.original_report.path)), row.original_report.sha256, 'original source receipt changed');
    const oldRef = prior.prior_source_entry.individual_proof.source_evidence.filter(n => n.path === BOOTSTRAP_PATH);
    assert.equal(oldRef.length, 1); assert.equal(oldRef[0].sha256, before.bootstrap.sha256);
    return {sha: row.sha, original_source_report: row.original_report,
      original_source_conclusion_preserved: true, current_preparation_separately_qualified: true};
  });
  assert.equal(new Set(rows.map(n => n.sha)).size, 9);
  return {schema_version: 1, line, role: 'Historical source conclusions plus independently checked actual current public fixture preparation. Neither view is a native/floor pass.',
    inputs: reference(read, inputPath), before: selected.before, current_bootstrap: selected.current_bootstrap,
    controls: selected.controls, exact_source_delta: delta, public_framework_reference_methods: references,
    source_conclusions: rows, current_contract_cases_passed: 8, original_shortcut_contract_failures: 3,
    negative_controls_passed: 8, all_other_bootstrap_operations_preserved: true,
    all_original_historical_callbacks_and_product_sources_preserved: true,
    actual_Angular_fixture_fakeAsync_native_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
export function expectedBootstrapProof(original, preparationRef, read) {
  const proof = structuredClone(original); let count = 0;
  proof.source_evidence = proof.source_evidence.map(ref => {
    if (ref.path !== BOOTSTRAP_PATH) return ref;
    count++; return reference(read, BOOTSTRAP_PATH);
  }); assert.equal(count, 1);
  for (const ref of [preparationRef, reference(read, inputPath), reference(read, 'scripts/bootstrap-stability-evidence.mjs')]) {
    assert.ok(!proof.source_evidence.some(n => n.path === ref.path)); proof.source_evidence.push(ref);
  }
  proof.current_bootstrap_preparation = preparationRef; return proof;
}
export function bootstrapPreparationEntryOk(entry, proof, read) {
  try {
    const ref = proof.current_bootstrap_preparation;
    assert.equal(ref.path, BOOTSTRAP_QUALIFICATION_REPORT); assert.equal(hash(read(ref.path)), ref.sha256);
    const report = JSON.parse(read(ref.path)), expected = inspectBootstrapPreparation(read); same(report, expected, 'current preparation facts changed');
    const before = bootstrapBefore({readMember: read}), row = before.affected_source_receipts.find(n => n.sha === entry.sha); assert.ok(row, 'source outside exact nine receipts');
    const old = row.prior_source_entry;
    for (const field of ['sha', 'final_disposition', 'reason', 'files', 'read_note_disposition', 'source_conclusion_only'])
      same(entry[field], old[field], 'source conclusion changed '+field);
    same(proof, expectedBootstrapProof(old.individual_proof, ref, read), 'source proof not exact current preparation');
    const bodyBytes = read(entry.evidence_report), body = JSON.parse(bodyBytes);
    assert.equal(hash(bodyBytes), entry.source_check.evidence_report_sha256);
    assert.equal(body.sha, entry.sha); same(body.individual_proof, proof);
    same(body.historical_source_review, JSON.parse(read(row.evidence_report)), 'historical original source review changed');
    same(body.current_bootstrap_preparation, ref);
    same(body.original_source_review, {path: row.evidence_report, sha256: row.evidence_report_sha256});
    assert.equal(body.source_conclusion_only, true); assert.equal(body.actual_current_native_or_floor_qualified, false);
    return true;
  } catch {return false;}
}
