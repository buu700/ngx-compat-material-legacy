/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual collector/writer controls; structured native input is synthetic. */
import assert from 'node:assert/strict';
import {reverseNativeDatePackedSource} from '../scripts/native-date-packed-source-context.mjs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SELECTION_COMPARATOR_CASE_ID, packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from '../scripts/native-date-packed-contract.mjs';
import {selectionComparatorPackedFixture} from '../scripts/selection-comparator-packed-fixture.mjs';
import {selectionComparatorPackedSample} from './selection_comparator_packed_sample.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase, packedMenuLazyCase, packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {allConsumerCaseIds, loadExportKeys, declarationObservations, declarationKeys, librarySpec, harnessCaseIds, writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const raw = read('scripts/packed-consumer-aot-smoke.mjs').toString();
const source = ts.createSourceFile('producer.mjs', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'collectAcceptanceCases'); assert.ok(declaration);
const collectorText = declaration.getText(source);
const load = text => new Function('declarationObservations', 'declarationKeys', 'packagedSpec', 'harnessCaseIds', 'packedValueAccessorCases',
  'packedTableOnPushCase', 'packedRadioIdentityCase', 'packedGeneratedIdentityCase', 'packedSelectDetachCase', 'packedMenuItemTokenCase',
  'packedSelectFocusClickCase', 'packedChipDisabledCase', 'packedMenuLazyCase', 'packedTooltipContainerCase', 'packedLegacyBidiScopeCase', 'packedSelectionComparatorCase', 'packedNativeDateConstructorCase', 'packedNativeDateProviderCase',
  text + ';return collectAcceptanceCases;')(declarationObservations, declarationKeys, librarySpec, harnessCaseIds, packedValueAccessorCases,
  packedTableOnPushCase, packedRadioIdentityCase, packedGeneratedIdentityCase, packedSelectDetachCase, packedMenuItemTokenCase,
  packedSelectFocusClickCase, packedChipDisabledCase, packedMenuLazyCase, packedTooltipContainerCase, packedLegacyBidiScopeCase, packedSelectionComparatorCase,packedNativeDateConstructorCase,packedNativeDateProviderCase);
const keys = loadExportKeys(), expected = allConsumerCaseIds(keys), collector = load(collectorText), sample = selectionComparatorPackedSample();
assert.equal(expected.length, 106); assert.equal(expected.filter(id => id === SELECTION_COMPARATOR_CASE_ID).length, 1);
const observed = (value, original = true, fn = collector) => {
  const rows = fn({harness: {status: 'ok', result: {selectionComparatorExposure: original, selectionComparatorObservation: value}}}, keys, '/tmp/consumer', '/tmp/source')
    .filter(row => row.case_id === SELECTION_COMPARATOR_CASE_ID); assert.equal(rows.length, 1); return rows[0];
};
assert.equal(observed(sample).result, 'pass'); assert.deepEqual(observed(sample).observation, sample);
assert.equal(observed(sample).legacy_harness_passed, true); assert.equal(observed(sample, false).result, 'fail');
const mutations = [value => {value.execution = 'marker';}, value => {value.error = 'fixture failure';},
  value => {value.public_selection_model = false;}, value => {value.option_count = 1;}, value => {value.legacy_list_structure = false;},
  value => {value.list_multiple = true;}, value => {value.model_is_multiple = true;}, value => {value.before_indices = [];},
  value => {value.after_indices = [];}, value => {value.cleanup.subscription_closed = false;}, value => {value.states.pop();},
  value => {value.states.reverse();}, value => {value.states.push(value.states[0]);}];
for (const field of ['comparable_model_public', 'comparable_model_distinct', 'comparable_options_distinct', 'comparable_list_structure'])
  mutations.push(value => {value[field] = false;});
mutations.push(value => {value.comparable_option_count = 1;});
for (let index = 0; index < sample.states.length; index++) {
  mutations.push(value => {value.states[index].stage = 'wrong';});
  for (const field of ['same_model', 'same_options', 'same_nodes', 'legacy_option_classes']) mutations.push(value => {value.states[index][field] = false;});
  for (const field of ['same_comparable_model', 'same_comparable_options', 'same_comparable_nodes']) mutations.push(value => {value.states[index][field] = false;});
  mutations.push(value => {value.states[index].comparable_selected_indices = [0];});
  mutations.push(value => {value.states[index].comparable_option_selected[0] = true;});
  mutations.push(value => {value.states[index].comparable_aria_selected[0] = 'true';});
  mutations.push(value => {value.states[index].selected_indices = [-1];});
  mutations.push(value => {value.states[index].selected_values = ['not-an-option'];});
  mutations.push(value => {value.states[index].option_selected[0] = !value.states[index].option_selected[0];});
  mutations.push(value => {value.states[index].aria_selected[0] = 'wrong';});
  mutations.push(value => {value.states[index].events.push({source_is_model: true, added_indices: [], removed_indices: []});});
  for (let event = 0; event < sample.states[index].events.length; event++) {
    mutations.push(value => {value.states[index].events[event].source_is_model = false;});
    for (const field of ['added_indices', 'removed_indices']) mutations.push(value => {value.states[index].events[event][field] = [-1];});
  }
}
for (const mutate of mutations) {const value = structuredClone(sample); mutate(value);
  assert.equal(packedSelectionComparatorCase(value).result, 'fail'); assert.equal(observed(value).result, 'fail');}
for (const value of [undefined, null, true, [], {}, 'pass']) assert.equal(observed(value).result, 'fail');
const mutants = [
  collectorText.replace('    packedSelectionComparatorCase(parsed.selectionComparatorObservation),', ''),
  collectorText.replace('packedSelectionComparatorCase(parsed.selectionComparatorObservation)', "({case_id:'" + SELECTION_COMPARATOR_CASE_ID + "',result:'pass'})"),
  collectorText.replace("const ok = harnessMap[caseId] === true && row.result === 'pass';", "const ok = row.result === 'pass';"),
];
for (const mutant of mutants) {assert.notEqual(mutant, collectorText); const fn = load(mutant);
  assert.throws(() => {assert.equal(observed(sample, true, fn).result, 'pass'); assert.equal(observed(null, true, fn).result, 'fail');
    assert.equal(observed(sample, false, fn).result, 'fail');});}
const scratch = mkdtempSync(join(tmpdir(), 'selection-comparator-packed-controls-'));
try {
  for (const name of ['complete', 'missing-observation', 'failed-observation', 'old-assertion-failed', 'omitted-case']) {
    const value = name === 'missing-observation' ? null : structuredClone(sample);
    if (name === 'failed-observation') value.states[2].selected_indices = [-1];
    const selected = observed(value, name !== 'old-assertion-failed'), runDir = join(scratch, name), outputDir = join(runDir, 'evidence/packed-consumer/fixture');
    mkdirSync(outputDir, {recursive: true}); const ids = name === 'omitted-case' ? expected.filter(id => id !== SELECTION_COMPARATOR_CASE_ID) : expected;
    const cases = ids.map(case_id => case_id === SELECTION_COMPARATOR_CASE_ID ? selected : {case_id, result: 'pass'});
    const result = writeAcceptanceReport({checkId: 'packed-consumer', request: {binding: {fixture_only: true}, invocation: 'fixture', runId: 'fixture', outputDir, runDir, line},
      cases, expectedIds: expected, library: {sha256: 'c'.repeat(64), bytes: 1}, assertionName: 'fixture-observations.json', command: ['synthetic-selection-comparator-control']});
    assert.equal(result.passed, name === 'complete');
  }
} finally {rmSync(scratch, {recursive: true, force: true});}
const fixture = selectionComparatorPackedFixture();
function validateFixture(text) {
  const file = ts.createSourceFile('selection-probe.ts', text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0);
  const imports = file.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);
  assert.deepEqual(imports, ['@angular/cdk/collections', '@ngx-compat/material-legacy/legacy-list', './selection-comparator-contract.mjs']);
  assert.equal(file.statements.filter(ts.isClassDeclaration).length, 0);
  for (const evidence of ['const model=list.selectedOptions,options=list.options.toArray()', 'model instanceof SelectionModel', 'model.changed.subscribe',
    'event.source===model', 'observed.before_indices=model.selected.map(option=>options.indexOf(option))', 'list.selectedOptions===model',
    "aria_selected:nodes.map(node=>node.getAttribute('aria-selected'))", 'nodes.every((node,index)=>host.querySelectorAll(\'mat-list-option\')[index]===node&&node.isConnected)',
    'model.setSelection(options[0])', 'model.setSelection(comparableOptions[0])', 'model.setSelection(options[1])', 'model.setSelection(comparableOptions[1])',
    'comparableList.selectedOptions', 'comparableModel!==model&&comparableList!==list',
    'comparable_selected_indices:comparableModel.selected.map(option=>comparableOptions.indexOf(option))',
    'model.clear()', 'fixture.detectChanges()', 'await fixture.whenStable()', 'subscription?.unsubscribe()', 'subscription?.closed===true']) assert.ok(text.includes(evidence), evidence);
  assert.doesNotMatch(text, /new SelectionModel|\.emit\(|\.next\(|\._\w+|\.ngOnDestroy\(|\.selected\s*=|as typeof options/);
}
validateFixture(fixture);
const sourceMutants = [fixture.replace("from '@angular/cdk/collections'", "from '@angular/cdk/private'"),
  fixture.replace('model instanceof SelectionModel', 'true'), fixture.replace('const model=list.selectedOptions,options=list.options.toArray()', 'const model=new SelectionModel(),options=list.options.toArray()'),
  fixture.replace('event.source===model', 'true'), fixture.replace('options.indexOf(option)', '0'),
  fixture.replace('list.selectedOptions===model', 'true'), fixture.replace("node.getAttribute('aria-selected')", "'true'"),
  fixture.replace('node.isConnected', 'true'), fixture.replace('subscription?.unsubscribe()', 'model.changed.next({})'),
  fixture.replace('fixture.detectChanges()', 'fixture.ngOnDestroy()')];
for (const [index, mutant] of sourceMutants.entries()) {assert.notEqual(mutant, fixture); assert.throws(() => validateFixture(mutant), 'fixture source mutant ' + index);}
const change = JSON.parse(read('compatibility/rc/selection-comparator-packed-producer-change.json'));
let recovered = reverseNativeDatePackedSource('scripts/packed-consumer-aot-smoke.mjs', raw, {readMember:read});
assert.equal(hash(recovered), change.current_sha256); for (const [before, after] of [...change.edits].reverse()) {assert.equal(recovered.split(after).length, 2); recovered = recovered.replace(after, () => before);}
assert.equal(hash(recovered), change.before_sha256);
assert.ok(recovered.includes("selectionList.selectedOptions.setSelection({value:'one'} as typeof selectionOptions[number]);fixture.detectChanges();"));
const result = {schema_version: 1, line, semantic_and_actual_collector_defects_rejected: mutations.length + 6,
  collector_mutants_detected: mutants.length, actual_writer_cases: 5, source_scope_mutants_detected: sourceMutants.length,
  unchanged_roster: 106, complete_preceding_producer_recovered: true, original_regression_retained: true,
  actual_packed_native_or_floor_execution: false, synthetic_input: true, G11_or_authored_use_closures: 0};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
