/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Untouched tagged option/list methods with complete authenticated peer model
 * classes. Detector/HTML/output callbacks are explicit protocols, not Angular
 * components or native DOM. This is no packed, native, compiler or floor pass. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectionComparatorPackedFixture} from '../scripts/selection-comparator-packed-fixture.mjs';
import {packedSelectionComparatorCase} from '../scripts/selection-comparator-packed-contract.mjs';
import {selectionComparatorPackedSample} from './selection_comparator_packed_sample.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const require = createRequire(import.meta.url), ts = require('typescript'), {Subject} = require('rxjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const referencePath = 'reference/material-16.2.14/value-accessor-token-sources/legacy-list/selection-list.ts';
const reference = read(referencePath).toString(), gitDirectory = '/home/parallels/.cache/angular-components.git';
assert.equal(hash(reference), 'e14d9323d58fe7c9655861a504d9c19adf11fd9eac6e202e9e085cc035f5ac1c', 'untouched tagged source changed');
let cachedTagCompared = false;
if (existsSync(gitDirectory)) {
  const gitOptions = ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', '-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=', '--git-dir=' + gitDirectory];
  const tagged = execFileSync('git', [...gitOptions, 'show', '16.2.14:src/material/legacy-list/selection-list.ts']);
  assert.equal(tagged.toString(), reference, 'reference must be untouched tagged source'); cachedTagCompared = true;
}
const patchPath = 'compatibility/f10/disposition-ledger/evidence/patches/9494ff2d65c98726046e6a20dd6a6d938e97a2f6-selection-comparator-full.patch';
assert.equal(hash(read(patchPath)), 'cf574324e4e76ccd1ea45bf25e3bddf9e28b9db07d9fce40e804d04b0a55a73c');
assert.ok(read(patchPath).toString().includes('+    const newSelectedSet = new Set(values.map(value => this._getConcreteValue(value)));'));
function legacyParts(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0);
  const option = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatLegacyListOption');
  const list = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatLegacySelectionList'); assert.ok(option && list);
  const text = node => {
    let start = node.getStart(file); for (const decorator of ts.getDecorators(node) || []) start = Math.max(start, decorator.end);
    return source.slice(start, node.end).trim();
  };
  const optionParts = option.members.filter(node => (ts.isGetAccessor(node) && ['value', 'selected'].includes(node.name.getText(file)))
    || (ts.isSetAccessor(node) && node.name.getText(file) === 'selected')
    || (ts.isMethodDeclaration(node) && node.name.getText(file) === '_setSelected')).map(text); assert.equal(optionParts.length, 4);
  const listParts = list.members.filter(node => ts.isMethodDeclaration(node) && ['_reportValueChange', '_getSelectedOptionValues'].includes(node.name.getText(file))).map(text);
  assert.equal(listParts.length, 2); const callbacks = [];
  const visit = node => {if (ts.isCallExpression(node) && node.expression.getText(file).includes('this.selectedOptions.changed')
    && node.expression.getText(file).endsWith('.subscribe')) callbacks.push(node.arguments[0].getText(file)); ts.forEachChild(node, visit);};
  visit(list); assert.equal(callbacks.length, 1);
  return {option: optionParts, list: listParts, sync: callbacks[0]};
}
const parts = legacyParts(referencePath, reference), owned = legacyParts('owned.ts', read('projects/ngx-material-legacy/legacy-list/selection-list.ts').toString());
const normalized = value => JSON.stringify(value).replace(/\s/g, '');
assert.equal(normalized(owned), normalized(parts), 'candidate receiver methods differ from the untouched tagged reference');
function receivers(optionParts = parts.option, syncText = parts.sync) {
  const code = 'class TaggedOption {\n' + optionParts.join('\n') + '\n}\nclass TaggedList {\n' + parts.list.join('\n') + '\n}';
  const output = ts.transpileModule(code, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
  return new Function('coerceBooleanProperty', output + ';return {Option:TaggedOption,List:TaggedList,sync:(' + syncText + ')};')(
    value => {assert.equal(typeof value, 'boolean', 'only the disclosed boolean coercion protocol is supplied'); return value;});
}
function modelClass(source, production) {
  const file = ts.createSourceFile('peer.mjs', source, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0);
  const node = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'SelectionModel'); assert.ok(node);
  const helpers = file.statements.filter(ts.isFunctionDeclaration).map(node => node.getText(file)).join('\n');
  return new Function('Subject', 'ngDevMode', helpers + '\n' + node.getText(file) + ';return SelectionModel;')(Subject, !production);
}
function setup(Model, receiver = receivers(), compare = true) {
  const model = new Model(false), list = new receiver.List();
  if (compare) model.compareWith = (left, right) => left.value === right.value;
  const output = [], changed = [];
  Object.assign(list, {selectedOptions: model, multiple: false, _isDestroyed: false, _onChange: value => changed.push(value)});
  const options = ['one', 'two'].map(value => Object.assign(new receiver.Option(), {selectionList: list, _value: value, _selected: false,
    _changeDetector: {markForCheck() {}}, selectedChange: {emit: value => output.push(value)}}));
  list.options = {toArray: () => [...options], filter: predicate => options.filter(predicate)};
  const subscription = model.changed.subscribe(receiver.sync);
  return {model, list, options, output, changed, dispose: () => subscription.unsubscribe()};
}
function trace(Model, receiver) {
  const context = setup(Model, receiver), comparable = setup(Model, receiver, false), {model, options} = context, events = [];
  const subscription = model.changed.subscribe(event => events.push({source_is_model: event.source === model,
    added_indices: event.added.map(option => options.indexOf(option)), removed_indices: event.removed.map(option => options.indexOf(option))}));
  const snapshot = stage => ({stage, selected_indices: model.selected.map(option => options.indexOf(option)),
    selected_values: model.selected.map(option => option.value), option_selected: options.map(option => option.selected), events: structuredClone(events),
    comparable_selected_indices: comparable.model.selected.map(option => comparable.options.indexOf(option)),
    comparable_option_selected: comparable.options.map(option => option.selected)});
  try {
    const states = [snapshot('initial')];
    for (const [stage, action] of [['first-real', () => model.setSelection(options[0])], ['first-equivalent', () => model.setSelection(comparable.options[0])],
      ['repeat-first-equivalent', () => model.setSelection(comparable.options[0])], ['second-real', () => model.setSelection(options[1])],
      ['second-equivalent', () => model.setSelection(comparable.options[1])], ['cleared', () => model.clear()], ['restored-first', () => model.setSelection(options[0])]]) {
      action(); states.push(snapshot(stage));
    }
    return states;
  } finally {subscription.unsubscribe(); context.dispose(); comparable.dispose();}
}
const fixture = selectionComparatorPackedFixture(), emitted = ts.transpileModule(fixture, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
const fixtureFile = ts.createSourceFile('fixture.mjs', emitted, ts.ScriptTarget.Latest, true);
const program = fixtureFile.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(fixtureFile).replace(/^export /, '')).join('\n');
async function executeObserver(Model) {
  const context = setup(Model), comparable = setup(Model, receivers(), false), {model, list, options} = context;
  const scopes = [context, comparable].map(owner => {
    const nodes = owner.options.map(() => ({isConnected: true, classList: {contains: value => value === 'mat-list-option'}, aria: 'false',
      getAttribute(name) {assert.equal(name, 'aria-selected'); return this.aria;}}));
    const host = {classList: {contains: value => value === 'mat-selection-list'}, querySelectorAll: selector => {assert.equal(selector, 'mat-list-option'); return nodes;}};
    return {owner, nodes, host};
  });
  const selectors = ['#selection-comparator-list', '#selection-comparator-comparable-list'];
  const protocol = {nativeElement: {querySelector: selector => {assert.ok(selectors.includes(selector)); return scopes[selectors.indexOf(selector)].host;}},
    detectChanges: () => scopes.forEach(({owner, nodes}) => nodes.forEach((node, index) => {node.aria = String(owner.options[index].selected);})), whenStable: async () => {}};
  // The host's unchanged earlier regression leaves the first real option selected.
  model.setSelection(options[0]); model.setSelection({value: 'one'}); protocol.detectChanges();
  const observe = new Function('SelectionModel', 'packedSelectionComparatorCase', program + ';return observePackedSelectionComparator;')(Model, packedSelectionComparatorCase);
  try {return await observe(protocol, list, comparable.list);} finally {context.dispose(); comparable.dispose();}
}
const capsulePath = 'compatibility/rc/selection-model-public-subjects.json', capsuleBytes = read(capsulePath);
assert.equal(hash(capsuleBytes), '4932727a9d031223efc0108d2d22c4a95019b81ee06e834424246173bf7998cc');
const members = JSON.parse(capsuleBytes).subjects.map(subject => {
  const member = subject.members.find(row => row.module_path === (subject.line === 'original' ? 'fesm2022/collections.mjs' : 'fesm2022/_selection-model-chunk.mjs')); assert.ok(member);
  const stored = read(member.path); assert.equal(hash(stored), member.stored_sha256); const raw = gunzipSync(stored); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
  return {line: subject.line, version: subject.version, path: member.path, sha256: member.sha256, source: raw.toString()};
});
const original = members.find(row => row.line === 'original').source, oldExpression = 'new Set(values)', fixedExpression = 'new Set(values.map(value => this._getConcreteValue(value)))';
assert.equal(original.split(oldExpression).length, 2);
// This is an explicit counterfactual, not a changed tagged reference or golden:
// apply only the authenticated upstream fix to the original complete peer class.
const referenceWithUpstreamFix = original.replace(oldExpression, fixedExpression), expected = trace(modelClass(referenceWithUpstreamFix, false));
const sample = selectionComparatorPackedSample();
assert.deepEqual(sample.states.map(({stage, selected_indices, selected_values, option_selected, events, comparable_selected_indices, comparable_option_selected}) =>
  ({stage, selected_indices, selected_values, option_selected, events, comparable_selected_indices, comparable_option_selected})), expected);
assert.deepEqual(expected.map(row => row.events.length), [0, 2, 2, 2, 5, 5, 7, 9]);
const results = [], mutations = [];
for (const member of [...members, {line: 'original-with-upstream-fix', version: '16.2.14+one-explicit-counterfactual-hunk', source: referenceWithUpstreamFix}]) {
  for (const production of [false, true]) {
    const Model = modelClass(member.source, production), states = trace(Model), observer = await executeObserver(Model);
    if (member.line === 'original') {assert.deepEqual(states[2].selected_indices, []); assert.equal(observer.okay, false);}
    else {assert.deepEqual(states, expected); assert.equal(observer.okay, true, JSON.stringify(observer.observed));}
    results.push({line: member.line, version: member.version, production, states, generated_observer_protocol_passed: observer.okay,
      original_bug_reproduced: member.line === 'original', actual_legacy_component_or_DOM_created: false});
  }
  if (['main', '21.x'].includes(member.line)) {
    assert.equal(member.source.split(fixedExpression).length, 2);
    const reverted = member.source.replace(fixedExpression, oldExpression).replace('!newSelectedSet.has(this._getConcreteValue(value, newSelectedSet))', '!newSelectedSet.has(value)');
    assert.notEqual(reverted, member.source); assert.notDeepEqual(trace(modelClass(reverted, false)), expected); mutations.push({line: member.line, id: 'restore-entire-original-comparator-deletion-algorithm', rejected: true});
  }
}
const current = modelClass(members.find(row => row.line === 'main').source, false);
const withoutReentry = parts.option.map(text => text.replace('this.selectionList.selectedOptions.select(this);', 'void 0;'));
assert.notDeepEqual(withoutReentry, parts.option); assert.notDeepEqual(trace(current, receivers(withoutReentry)), expected);
mutations.push({id: 'remove-tagged-option-model-reentry', rejected: true});
assert.notDeepEqual(trace(current, receivers(parts.option, 'event => {}')), expected); mutations.push({id: 'remove-tagged-list-sync', rejected: true});
const report = {schema_version: 1, source_parent: JSON.parse(read('compatibility/rc/selection-comparator-packed-inputs.json')).source_parent,
  tagged_reference: {path: referencePath, sha256: hash(reference), git_tag: '16.2.14', repository_path: 'src/material/legacy-list/selection-list.ts',
    pinned_tagged_bytes_checked: true, cached_Git_tag_also_compared: cachedTagCompared},
  original_patch: {path: patchPath, sha256: hash(read(patchPath))}, explicit_original_counterfactual: {before: oldExpression, after: fixedExpression},
  candidate_receiver_methods_equal_untouched_tagged_methods: true, subjects: members.map(({source, ...row}) => row), results, mutations,
  event_counts_from_tagged_receiver_and_upstream_fix: expected.map(row => row.events.length),
  borrowed: {node: process.version, typescript: ts.version, rxjs: require('rxjs/package.json').version},
  protocols: 'Boolean-only coercion, output and change-detector callbacks, list QueryList surface and HTML attributes are explicitly supplied protocols. Complete genuine model classes and exact tagged option/list methods execute; no Angular component factory, real DOM rendering or native event executes.',
  actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed', producer_sha256: hash(read('tests/selection_comparator_tagged_protocol.mjs')),
  fixture_sha256: hash(read('scripts/selection-comparator-packed-fixture.mjs')), contract_sha256: hash(read('scripts/selection-comparator-packed-contract.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({subjects: results.length, generated_observer_positive_protocols: results.filter(row => row.generated_observer_protocol_passed).length,
  original_bug_protocols: results.filter(row => row.original_bug_reproduced).length, mutations_rejected: mutations.length,
  tagged_event_counts: expected.map(row => row.events.length), actual_packed_native_or_floor_qualified: false}));
