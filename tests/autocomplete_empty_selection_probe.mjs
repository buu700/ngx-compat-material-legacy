/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Complete source prototypes; explicit overlay services, no Angular views.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p));
const hash = value => createHash('sha256').update(value).digest('hex');
const require = createRequire(import.meta.url), ts = require('typescript');
const url = name => pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const {FormControl} = await import(url('@angular/forms'));
const input = JSON.parse(read('compatibility/rc/autocomplete-empty-selection-inputs.json'));
assert.equal(input.sha, 'db06fa8d8939d793f598bc3dbedc96a5a71c0db0');
assert.equal(input.parent, 'bae953999407fd385b1d571e04350bf0f28abf05');
assert.equal(input.patch_sha256, '097bc267621c07d520fd9aac2e3329a90c05c0ca308a9cc4e3aa4ecb43dc68b7');
assert.equal(hash(read('compatibility/rc/autocomplete-empty-selection-original.patch')), input.patch_sha256);
const originalBlobs = [
  '44c041a2228023ed3dac6eb6afd8e5de7489b230', '5e881a9f9ae6ffbe6f5d7392573eb36cefd4ef21',
  '27365fa5b76f32a8dff87648d2d5bad410843568', '41e51dd5a3d7e4045eb39fe21effcda0a70f554a',
];
assert.deepEqual(input.original_files.map(row => row.git_blob), originalBlobs);
for (const member of input.original_files) {
  assert.equal(hash(member.text), member.sha256);
  assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(member.text) + '\0').update(member.text).digest('hex'), member.git_blob);
}
function program(source, name, kind = ts.ScriptKind.TS) {
  const file = ts.createSourceFile('subject.ts', source, ts.ScriptTarget.Latest, true, kind);
  const owner = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
  assert.ok(owner, name);
  const methods = owner.members.filter(n => ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n));
  const node = ts.factory.updateClassDeclaration(owner, [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], ts.factory.createIdentifier('Probe'), undefined, undefined, methods);
  const transformed = ts.transform(node, [context => {
    const visit = item => ts.isDecorator(item) ? undefined : ts.visitEachChild(item, visit, context);
    return item => ts.visitNode(item, visit);
  }]);
  try {
    return ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified, transformed.transformed[0], file), {
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true},
    }).outputText;
  } finally { transformed.dispose(); }
}
async function type(source, name, kind) {
  const emitted = 'import {take} from ' + JSON.stringify(url('rxjs/operators')) + ';\n' + program(source, name, kind);
  return (await import('data:text/javascript;base64,' + Buffer.from(emitted).toString('base64'))).Probe;
}
function fixture(Type, {required = true, visible = false} = {}) {
  const selected = {code: 'CA', name: 'California'}, control = new FormControl(selected);
  const changes = [], opened = [], selectedEvents = [], calls = [];
  control.valueChanges.subscribe(value => changes.push(value));
  let attached = false;
  const native = {value: 'California', focus() { calls.push('focus'); }};
  const panel = {requireSelection: required, options: [], showPanel: visible, _isOpen: false,
    _animationDone: null, displayWith: value => value?.name ?? value,
    _setColor() {}, opened: {emit() { opened.push(native.value); }},
    _emitSelectEvent(option) { selectedEvents.push(option.value); }};
  const overlay = {hasAttached: () => attached, attach() { attached = true; calls.push('attach'); },
    updateSize() {}, detach() { attached = false; }};
  const instance = Object.create(Type.prototype);
  Object.assign(instance, {autocomplete: panel, _element: {nativeElement: native}, _formField: null,
    _overlayRef: overlay, _portal: {}, _positionStrategy: {setOrigin() {}}, _overlayAttached: false,
    _trackedModal: null, _pendingAutoselectedOption: null, _valueOnLastKeydown: null,
    _getConnectedElement: () => ({}), _getPanelWidth: () => 100,
    _subscribeToClosingActions() { calls.push('subscribe'); return {unsubscribe() {}}; },
    _updatePanelState() {}, _applyModalPanelOwnership() {}, _floatLabel() {},
    closePanel() { calls.push('close'); attached = false; this._overlayAttached = false; },
  });
  instance.registerOnChange(value => control.setValue(value));
  return {instance, native, panel, control, selected, changes, opened, selectedEvents, calls};
}
function result(f) {
  return {value: f.native.value, model: f.control.value, changes: f.changes,
    selectionEvents: f.selectedEvents, opened: f.opened, calls: f.calls, panelOpen: f.instance.panelOpen};
}
function observations(Type) {
  const rows = [];
  for (const required of [true, false]) for (const visible of [false, true]) for (const changed of [false, true]) {
    const f = fixture(Type, {required, visible});
    f.instance.openPanel();
    assert.equal(f.instance.panelOpen, visible);
    if (changed) f.native.value = 'Cali';
    f.instance._setValueAndClose(null);
    rows.push({id: [required ? 'required' : 'optional', visible ? 'visible' : 'empty', changed ? 'changed' : 'unchanged'].join('/'), ...result(f)});
  }
  const f = fixture(Type);
  f.instance.openPanel();
  f.instance._setValueAndClose(null);
  f.native.value = 'Alabama'; f.control.setValue({code: 'AL', name: 'Alabama'}, {emitEvent: false});
  f.instance.openPanel(); f.instance._setValueAndClose(null);
  rows.push({id: 'required/empty/reopen-with-new-model', ...result(f)});
  return rows;
}
const candidatePath = 'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
const candidate = read(candidatePath).toString();
const originalPath = 'reference/material-16.2.14/component-behavior-sources/autocomplete/autocomplete-trigger.ts';
const original = read(originalPath).toString();
assert.equal(hash(original), 'b69decaf81ef29dd665a0b267f3a121837212157b31ddd02c3b617fa958844f2');
const expected = observations(await type(original, '_MatAutocompleteTriggerBase'));
for (const row of expected) {
  assert.deepEqual(row.selectionEvents, []);
  if (row.id.endsWith('/unchanged')) {
    assert.equal(row.value, 'California'); assert.deepEqual(row.model, {code: 'CA', name: 'California'}); assert.deepEqual(row.changes, []);
  }
  if (row.id === 'required/empty/changed') { assert.equal(row.value, ''); assert.equal(row.model, null); assert.deepEqual(row.changes, [null]); }
}
const actual = observations(await type(candidate, '_MatAutocompleteTriggerBase'));
assert.deepEqual(actual, expected);
const peers = [];
for (const identity of JSON.parse(read('compatibility/rc/autocomplete-input-peer-sources/identities.json'))) {
  const compressed = read(identity.retained.path); assert.equal(hash(compressed), identity.retained.sha256);
  const bytes = gunzipSync(compressed); assert.equal(hash(bytes), identity.member_sha256); assert.equal(bytes.length, identity.member_bytes);
  const rows = observations(await type(bytes.toString(), 'MatAutocompleteTrigger', ts.ScriptKind.JS));
  assert.deepEqual(rows, expected); peers.push({line: identity.line, version: identity.version, member_sha256: identity.member_sha256, rows});
}
const upstream = [];
for (const commit of [input.parent, input.sha]) {
  const source = input.original_files.find(row => row.commit === commit && row.path.endsWith('autocomplete-trigger.ts'));
  const rows = observations(await type(source.text, 'MatAutocompleteTrigger'));
  const defects = rows.filter((row, index) => JSON.stringify(row) !== JSON.stringify(expected[index])).map(row => row.id);
  if (commit === input.parent) assert.ok(defects.includes('required/empty/unchanged'), 'pre-fix empty-option defect was not reproduced');
  else assert.deepEqual(defects, []);
  upstream.push({commit, source_sha256: source.sha256, differences_from_tagged: defects, rows});
}
const mutants = [];
for (const [id, from, to] of [
  ['omit-attach-capture', 'this._valueOnAttach = valueOnAttach;', ''],
  ['capture-only-when-visible', 'this._valueOnAttach = valueOnAttach;', 'if (this.panelOpen) this._valueOnAttach = valueOnAttach;'],
  ['never-reset-changed-input', 'this._element.nativeElement.value !== this._valueOnAttach', 'false'],
  ['always-reset-required-input', 'this._element.nativeElement.value !== this._valueOnAttach', 'true'],
]) {
  assert.equal(candidate.split(from).length, 2, id);
  const rows = observations(await type(candidate.replace(from, to), '_MatAutocompleteTriggerBase'));
  const differences = rows.filter((row, index) => JSON.stringify(row) !== JSON.stringify(expected[index])).map(row => row.id);
  assert.ok(differences.length, id + ' survived'); mutants.push({id, result: 'rejected', differences});
}
const report = {schema_version: 1, line: input.line, node: process.version, typescript: ts.version,
  scope: 'Complete source prototype methods on synthetic reused OverlayRef/panel/input services and borrowed real FormControl callbacks. Constructors, first overlay creation, Angular views/DI, actual browser/outside-click routing, packed/native and framework/runtime floors are unexecuted.',
  candidate_source: {path: candidatePath, sha256: hash(candidate)}, tagged_source: {path: originalPath, sha256: hash(original)},
  expected, actual, peers, upstream, mutants, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
const out = process.argv.indexOf('--out'); if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({line: input.line, cases_per_source: expected.length, sources: 6, mutants_rejected: mutants.length, native_executed: false}));
