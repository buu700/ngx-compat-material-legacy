/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const paths = {
  checkbox: 'projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-base.ts',
  slide: 'projects/ngx-material-legacy/legacy-slide-toggle/internal/slide-toggle-base.ts',
  originalCheckbox: 'reference/material-16.2.14/deferred-control-sources/checkbox.ts',
  originalSlide: 'reference/material-16.2.14/deferred-control-sources/slide-toggle.ts',
};
const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, read(path)]));
assert.equal(hash(sources.originalCheckbox), '6f362a270133996edea98bf03b6c1a212c3a3011e16562734e8ed9c1dea45e56');
assert.equal(hash(sources.originalSlide), 'd930ac9f21781f68cc4568e670ce7bc2890ca9c4afe29bfed621a6945148b595');
function methods(text, slide) {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const cls = source.statements.find(n => ts.isClassDeclaration(n)
    && n.name?.text === (slide ? '_MatSlideToggleBase' : '_MatCheckboxBase'));
  assert.ok(cls);
  const names = slide ? ['ngAfterContentInit', 'ngOnDestroy'] : ['_onBlur', '_handleInputClick', 'ngOnDestroy'];
  const members = cls.members.filter(n => names.includes(n.name?.text));
  assert.equal(members.length, slide || text !== sources.originalCheckbox ? names.length : names.length - 1);
  const program = ts.transpileModule('class Replay {\n' + members.map(n =>
    printer.printNode(ts.EmitHint.Unspecified, n, source)).join('\n') + '\n}\nexports.Replay = Replay;',
    {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
  const exports = {};
  new Function('exports', 'TransitionCheckState', program)(exports, {Init: 0, Checked: 1, Unchecked: 2, Indeterminate: 3});
  return {Replay: exports.Replay, emitted_method_sha256: hash(program)};
}
function fixture(text, slide, reentrant = false) {
  const {Replay, emitted_method_sha256} = methods(text, slide), instance = new Replay();
  let observer, touched = 0, marks = 0, immediateChanges = 0, indeterminateEvents = 0;
  Object.assign(instance, {_slideToggleDestroyed: false, _checkboxDestroyed: false,
    _animationCleanups: new Map(), _elementRef: {}, _focused: true, _checked: false,
    indeterminate: true, _indeterminate: true, disabled: false, _options: {clickAction: 'check-indeterminate'},
    _transitionCheckState() {}, _emitChangeEvent() {immediateChanges++;},
    indeterminateChange: {emit() {indeterminateEvents++;}},
    _changeDetectorRef: {markForCheck() {marks++;}},
    _focusMonitor: {monitor: () => ({subscribe(fn) {observer = fn;}}), stopMonitoring() {observer = undefined;}},
  });
  const destroy = () => instance.ngOnDestroy?.();
  instance._onTouched = () => {touched++; if (reentrant) destroy();};
  if (slide) instance.ngAfterContentInit();
  return {instance, blur() {if (slide) observer(null); else instance._onBlur();}, destroy,
    counts: () => ({touched, marks, immediateChanges, indeterminateEvents}), emitted_method_sha256};
}
async function live(text, slide) {
  const f = fixture(text, slide); f.blur();
  assert.deepEqual(f.counts(), {touched: 0, marks: 0, immediateChanges: 0, indeterminateEvents: 0});
  await Promise.resolve(); assert.equal(f.counts().touched, 1); assert.equal(f.counts().marks, 1);
  if (slide) assert.equal(f.instance._focused, false);
  f.destroy(); return f.emitted_method_sha256;
}
async function destroyed(text, slide) {
  const f = fixture(text, slide); f.blur(); f.destroy();
  await Promise.resolve(); assert.equal(f.counts().touched, 0, 'destroyed control cannot touch a form');
  assert.equal(f.counts().marks, 0, 'destroyed view cannot be marked');
  if (slide) assert.equal(f.instance._focused, true, 'queued blur cannot change destroyed focus state');
}
async function reentrant(text, slide) {
  const f = fixture(text, slide, true); f.blur(); await Promise.resolve();
  assert.equal(f.counts().touched, 1); assert.equal(f.counts().marks, 0, 'touch callback destruction must stop the view mark');
}
async function indeterminate(text, dead) {
  const f = fixture(text, false); f.instance._handleInputClick();
  assert.equal(f.counts().immediateChanges, 1, 'live click remains synchronous');
  assert.equal(f.instance._indeterminate, true); assert.equal(f.counts().indeterminateEvents, 0);
  if (dead) f.destroy();
  await Promise.resolve(); assert.equal(f.counts().indeterminateEvents, dead ? 0 : 1);
  assert.equal(f.instance._indeterminate, dead); f.destroy();
}
const cases = [], check = async (id, action) => {await action(); cases.push(id);};
for (const slide of [false, true]) {
  const candidate = sources[slide ? 'slide' : 'checkbox'], original = sources[slide ? 'originalSlide' : 'originalCheckbox'];
  await check((slide ? 'slide' : 'checkbox') + '/original-and-current-live-blur', async () => {await live(original, slide); await live(candidate, slide);});
  await check((slide ? 'slide' : 'checkbox') + '/destroy-before-blur-microtask', () => destroyed(candidate, slide));
  await check((slide ? 'slide' : 'checkbox') + '/reentrant-touch-destruction', () => reentrant(candidate, slide));
  await check((slide ? 'slide' : 'checkbox') + '/original-late-touch-reproduced', async () => {
    const f = fixture(original, slide); f.blur(); f.destroy(); await Promise.resolve();
    assert.equal(f.counts().touched, 1); assert.equal(f.counts().marks, 1);
  });
}
await check('checkbox/live-indeterminate-defer', () => indeterminate(sources.checkbox, false));
await check('checkbox/destroy-before-indeterminate-microtask', () => indeterminate(sources.checkbox, true));
await check('checkbox/post-destruction-blur-entry', async () => {
  const f = fixture(sources.checkbox, false); f.destroy(); f.blur(); await Promise.resolve();
  assert.equal(f.counts().touched, 0); assert.equal(f.counts().marks, 0);
});
const replace = (text, from, to) => {assert.equal(text.split(from).length - 1, 1); return text.replace(from, to);};
const mutants = [
  ['checkbox-blur-callback-guard', replace(sources.checkbox,
    '    Promise.resolve().then(() => {\n      if (this._checkboxDestroyed) {\n        return;\n      }',
    '    Promise.resolve().then(() => {'), text => destroyed(text, false)],
  ['checkbox-reentrant-touch-guard', replace(sources.checkbox,
    '      if (!this._checkboxDestroyed) {\n        this._changeDetectorRef.markForCheck();\n      }',
    '      this._changeDetectorRef.markForCheck();'), text => reentrant(text, false)],
  ['checkbox-indeterminate-guard', replace(sources.checkbox,
    '          if (this._checkboxDestroyed) {\n            return;\n          }\n', ''), text => indeterminate(text, true)],
  ['slide-destroy-flag', replace(sources.slide, '    this._slideToggleDestroyed = true;\n', ''), text => destroyed(text, true)],
  ['slide-blur-callback-guard', replace(sources.slide,
    '          if (this._slideToggleDestroyed) {\n            return;\n          }\n', ''), text => destroyed(text, true)],
  ['slide-reentrant-touch-guard', replace(sources.slide,
    '          if (!this._slideToggleDestroyed) {\n            this._changeDetectorRef.markForCheck();\n          }',
    '          this._changeDetectorRef.markForCheck();'), text => reentrant(text, true)],
];
for (const [id, text, action] of mutants) await assert.rejects(() => action(text), error => error.code === 'ERR_ASSERTION', id);
const report = {schema_version: 1, line: JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main',
  cases, mutation_controls: mutants.map(([id]) => ({id, rejected: true})),
  sources: Object.values(paths).map(path => ({path, sha256: hash(read(path))})),
  scope: 'Complete selected blur/click/destroy methods from untouched tag16 and owned classes, actual Promise microtasks. Fields, focus emissions, CDR/forms/output/transition functions are protocols; full constructors, Angular DI/zone/CVA, native focus/motion, packed and floors remain unqualified.',
  native_or_packed_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.line, cases: cases.length, mutation_controls: mutants.length, native_or_packed_qualified: false}));
