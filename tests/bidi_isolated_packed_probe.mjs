/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual collector/writer and generated-scope controls; native inputs synthetic. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {BIDI_SCOPE_CASE_ID, packedLegacyBidiScopeCase} from '../scripts/bidi-isolated-packed-contract.mjs';
import {bidiIsolatedPackedFixture} from '../scripts/bidi-isolated-packed-fixture.mjs';
import {packedValueAccessorCases} from '../scripts/value-accessor-packed-contract.mjs';
import {packedTableOnPushCase} from '../scripts/table-onpush-packed-contract.mjs';
import {packedRadioIdentityCase} from '../scripts/radio-identity-packed-contract.mjs';
import {packedGeneratedIdentityCase} from '../scripts/generated-identity-packed-contract.mjs';
import {packedSelectDetachCase} from '../scripts/select-detach-packed-contract.mjs';
import {packedMenuItemTokenCase} from '../scripts/menu-item-token-packed-contract.mjs';
import {packedSelectFocusClickCase} from '../scripts/select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase, packedMenuLazyCase, packedTooltipContainerCase} from '../scripts/chip-menu-tooltip-packed-contract.mjs';
import {allConsumerCaseIds, loadExportKeys, declarationObservations, declarationKeys, librarySpec, harnessCaseIds, writeAcceptanceReport} from '../scripts/packed-consumer-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), hash = value => createHash('sha256').update(value).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const stages = [
  ['initial', 'rtl', 'rtl', []], ['ltr', 'ltr', 'ltr', ['ltr']], ['repeat-ltr', 'ltr', 'ltr', ['ltr']],
  ['uppercase-rtl', 'RTL', 'rtl', ['ltr', 'rtl']], ['invalid', 'invalid-direction', 'ltr', ['ltr', 'rtl', 'ltr']],
  ['empty', '', 'ltr', ['ltr', 'rtl', 'ltr']], ['rtl', 'rtl', 'rtl', ['ltr', 'rtl', 'ltr', 'rtl']],
];
const sample = {execution: 'packed-angular-testbed-dom', error: null, public_dir_instance: true, node_instances_distinct_from_root: true,
  states: stages.map(([stage, bound_value, normalized, events]) => ({stage, bound_value, normalized, host_attribute: bound_value, events,
    same_dir_instance: true, field_provider_is_dir: true, input_provider_is_dir: true, legacy_field_structure: true, legacy_input_structure: true})),
  cleanup: {view_destroyed: true, output_completions: 1, subscription_closed: true}};
const raw = read('scripts/packed-consumer-aot-smoke.mjs').toString();
const source = ts.createSourceFile('producer.mjs', raw, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'collectAcceptanceCases'); assert.ok(declaration);
const collectorText = declaration.getText(source);
const load = text => new Function('declarationObservations', 'declarationKeys', 'packagedSpec', 'harnessCaseIds', 'packedValueAccessorCases',
  'packedTableOnPushCase', 'packedRadioIdentityCase', 'packedGeneratedIdentityCase', 'packedSelectDetachCase', 'packedMenuItemTokenCase',
  'packedSelectFocusClickCase', 'packedChipDisabledCase', 'packedMenuLazyCase', 'packedTooltipContainerCase', 'packedLegacyBidiScopeCase',
  text + ';return collectAcceptanceCases;')(declarationObservations, declarationKeys, librarySpec, harnessCaseIds, packedValueAccessorCases,
  packedTableOnPushCase, packedRadioIdentityCase, packedGeneratedIdentityCase, packedSelectDetachCase, packedMenuItemTokenCase,
  packedSelectFocusClickCase, packedChipDisabledCase, packedMenuLazyCase, packedTooltipContainerCase, packedLegacyBidiScopeCase);
const keys = loadExportKeys(), expected = allConsumerCaseIds(keys), currentCollector = load(collectorText);
assert.equal(expected.length, 106); assert.equal(expected.filter(id => id === BIDI_SCOPE_CASE_ID).length, 1);
const observed = (value, legacy = true, collector = currentCollector) => {
  const selected = collector({harness: {status: 'ok', result: {legacyBidiScope: legacy, isolatedLegacyBidi: value}}}, keys, '/tmp/consumer', '/tmp/source')
    .filter(row => row.case_id === BIDI_SCOPE_CASE_ID); assert.equal(selected.length, 1); return selected[0];
};
assert.equal(observed(sample).result, 'pass'); assert.deepEqual(observed(sample).observation, sample);
assert.equal(observed(sample).legacy_harness_passed, true); assert.equal(observed(sample, false).result, 'fail');
const mutations = [
  value => {value.execution = 'workspace';}, value => {value.error = 'fixture failure';}, value => {value.public_dir_instance = false;},
  value => {value.node_instances_distinct_from_root = false;}, value => {value.states.pop();}, value => {value.states.push(value.states[0]);},
  value => {value.states.reverse();}, value => {delete value.cleanup;}, value => {value.cleanup.view_destroyed = false;},
  value => {value.cleanup.output_completions = 0;}, value => {value.cleanup.output_completions = 2;}, value => {value.cleanup.subscription_closed = false;},
];
for (let index = 0; index < sample.states.length; index++) {
  for (const field of ['stage', 'bound_value', 'normalized', 'host_attribute']) mutations.push(value => {value.states[index][field] = 'wrong';});
  for (const field of ['same_dir_instance', 'field_provider_is_dir', 'input_provider_is_dir', 'legacy_field_structure', 'legacy_input_structure'])
    mutations.push(value => {value.states[index][field] = false;});
  mutations.push(value => {value.states[index].events.push('unexpected');});
}
for (const mutate of mutations) {const value = structuredClone(sample); mutate(value); assert.equal(packedLegacyBidiScopeCase(value).result, 'fail');
  assert.equal(observed(value).result, 'fail', 'current collector ignores defective isolated bidi observation');}
for (const value of [undefined, null, true, [], {}, 'pass']) assert.equal(observed(value).result, 'fail');
const mutants = [
  collectorText.replace(',packedLegacyBidiScopeCase(parsed.isolatedLegacyBidi)', ''),
  collectorText.replace('packedLegacyBidiScopeCase(parsed.isolatedLegacyBidi)', "({case_id:'" + BIDI_SCOPE_CASE_ID + "',result:'pass'})"),
  collectorText.replace("const ok = harnessMap[caseId] === true && row.result === 'pass';", "const ok = row.result === 'pass';"),
];
for (const mutant of mutants) {assert.notEqual(mutant, collectorText); const collector = load(mutant);
  assert.throws(() => {assert.equal(observed(sample, true, collector).result, 'pass'); assert.equal(observed(null, true, collector).result, 'fail');
    assert.equal(observed(sample, false, collector).result, 'fail');});}
const scratch = mkdtempSync(join(tmpdir(), 'bidi-isolated-packed-controls-'));
try {
  for (const name of ['complete', 'missing-observation', 'failed-observation', 'original-mixed-check-failed']) {
    const value = name === 'missing-observation' ? null : structuredClone(sample);
    if (name === 'failed-observation') value.states[1].input_provider_is_dir = false;
    const selected = observed(value, name !== 'original-mixed-check-failed');
    const runDir = join(scratch, name), outputDir = join(runDir, 'evidence/packed-consumer/fixture'); mkdirSync(outputDir, {recursive: true});
    const cases = expected.map(case_id => case_id === BIDI_SCOPE_CASE_ID ? selected : {case_id, result: 'pass'});
    const result = writeAcceptanceReport({checkId: 'packed-consumer', request: {binding: {fixture_only: true}, invocation: 'fixture',
      runId: 'fixture', outputDir, runDir, line}, cases, expectedIds: expected, library: {sha256: 'a'.repeat(64), bytes: 1},
      assertionName: 'fixture-observations.json', command: ['synthetic-bidi-isolation-control']});
    assert.equal(result.passed, name === 'complete');
  }
} finally {rmSync(scratch, {recursive: true, force: true});}
const fixture = bidiIsolatedPackedFixture();
function validateScope(text) {
  const tree = ts.createSourceFile('bidi-probe.ts', text, ts.ScriptTarget.Latest, true); assert.equal(tree.parseDiagnostics.length, 0);
  const components = tree.statements.filter(ts.isClassDeclaration); assert.equal(components.length, 1);
  const decorators = ts.getDecorators(components[0]); assert.equal(decorators.length, 1);
  const metadata = decorators[0].expression.arguments[0], fields = new Map(metadata.properties.map(property => [property.name.getText(tree), property.initializer]));
  assert.deepEqual([...fields.keys()].sort(), ['imports', 'selector', 'standalone', 'template']);
  assert.equal(fields.get('standalone').getText(tree), 'true');
  assert.deepEqual(fields.get('imports').elements.map(node => node.getText(tree)), ['MatLegacyFormFieldModule', 'MatLegacyInputModule']);
  assert.ok(fields.get('template').text.includes('(dirChange)="changes.push($event)"'));
  for (const evidence of ['TestBed.createComponent(PackedLegacyBidiScope)', 'dir instanceof Dir', 'section.injector.get(Dir)',
    'field.injector.get(Directionality)===dir', 'input.injector.get(Directionality)===dir',
    'events:[...fixture.componentInstance.changes]', 'fixture.destroy()', 'output_completions:completions',
    'fixture.componentRef.hostView.destroyed', 'subscription?.closed===true']) assert.ok(text.includes(evidence), evidence);
  assert.doesNotMatch(text, /override(?:Component|Directive)|\.emit\(|\.ngOnDestroy\(|\.ngAfterContentInit\(|new Dir\(/);
}
validateScope(fixture);
const sourceMutants = [
  fixture.replace('imports:[MatLegacyFormFieldModule,MatLegacyInputModule]', 'imports:[MatLegacyFormFieldModule,MatLegacyInputModule,Dir]'),
  fixture.replace('imports:[MatLegacyFormFieldModule,MatLegacyInputModule]', 'imports:[MatLegacyFormFieldModule,MatLegacyInputModule,BidiModule]'),
  fixture.replace('imports:[MatLegacyFormFieldModule,MatLegacyInputModule]', 'imports:[MatFormFieldModule,MatInputModule]'),
  fixture.replace('standalone:true', 'standalone:false'), fixture.replace("selector:'packed-legacy-bidi-scope',", "selector:'packed-legacy-bidi-scope',providers:[],"),
  fixture.replace('dir instanceof Dir', 'true'), fixture.replace('field.injector.get(Directionality)===dir', 'true'),
  fixture.replace('input.injector.get(Directionality)===dir', 'true'), fixture.replace('fixture.destroy()', 'dir.ngOnDestroy()'),
  fixture.replace('events:[...fixture.componentInstance.changes]', "events:['ltr']"),
];
for (const mutant of sourceMutants) {assert.notEqual(mutant, fixture); assert.throws(() => validateScope(mutant));}
const aggregate = 'bidiInitial&&bidiUpdated&&fixture.componentInstance.legacyDirectionChanges===1&&isolatedLegacyBidi.okay';
assert.ok(raw.includes('const legacyBidiScope=' + aggregate + ';'));
for (const values of [[true, true, 1, true, true], [false, true, 1, true, false], [true, false, 1, true, false], [true, true, 0, true, false], [true, true, 1, false, false]]) {
  const [bidiInitial, bidiUpdated, count, okay, expected] = values;
  assert.equal(runInNewContext(aggregate, {bidiInitial, bidiUpdated, fixture: {componentInstance: {legacyDirectionChanges: count}}, isolatedLegacyBidi: {okay}}), expected);
}
const change = JSON.parse(read('compatibility/rc/bidi-isolated-packed-producer-change.json'));
assert.equal(hash(raw), change.current_sha256); let recovered = raw;
for (const [before, after] of [...change.edits].reverse()) {assert.equal(recovered.split(after).length, 2); recovered = recovered.replace(after, () => before);}
assert.equal(hash(recovered), change.before_sha256);
const result = {schema_version: 1, line, semantic_and_actual_collector_defects_rejected: mutations.length + 6,
  collector_mutants_detected: mutants.length, actual_writer_cases: 4, source_scope_mutants_detected: sourceMutants.length,
  unchanged_roster: 106, producer_predecessor_recovered: true, original_mixed_predicate_retained: true,
  actual_packed_native_or_floor_execution: false, synthetic_input: true, G11_or_authored_use_closures: 0};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
