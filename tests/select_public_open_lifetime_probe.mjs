/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole owned base/derived prototypes; constructors and Angular are excluded. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), ts = require('typescript');
const {Subject} = require('rxjs'), {take, takeUntil} = require('rxjs/operators');
const paths = {
  base: 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  public: 'projects/ngx-material-legacy/legacy-select/select.ts',
};
const raw = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(resolve(root, path), 'utf8')]));
const sha = value => createHash('sha256').update(value).digest('hex');

function declaration(source, name) {
  const file = ts.createSourceFile('subject.ts', source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  const node = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
  assert.ok(node);
  const result = ts.transform(node, [context => node => {
    const visit = n => ts.isDecorator(n) ? undefined : ts.visitEachChild(n, visit, context);
    return ts.visitNode(node, visit);
  }]);
  const printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, result.transformed[0], file);
  result.dispose();
  return ts.transpileModule(printed, {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  }}).outputText;
}
function prototype(sources) {
  const base = {}, derived = {};
  new Function('exports', '_MatSelectMixinBase', 'take', 'takeUntil', declaration(sources.base, '_MatSelectBase'))(
    base, class {}, take, takeUntil);
  new Function('exports', '_MatSelectBase', 'take', 'takeUntil', 'getComputedStyle', declaration(sources.public, 'MatLegacySelect'))(
    derived, base._MatSelectBase, take, takeUntil, () => ({fontSize: '16px'}));
  return derived.MatLegacySelect.prototype;
}
function fixture(proto) {
  const instance = Object.create(proto), stable = new Subject(), destroy = new Subject();
  let measurements = 0, calculations = 0, fontWrites = 0, font;
  const style = {};
  Object.defineProperty(style, 'fontSize', {set(value) {fontWrites++; font = value;}});
  Object.assign(instance, {
    _motionSequence: 0, _motionDestroyed: false, _completedEnterAnimation: false,
    _panelOpen: false, _overlayAttached: false, _panelExiting: false,
    _destroy: destroy, _panelDoneAnimatingStream: new Subject(), stateChanges: new Subject(),
    _ngZone: {onStable: stable}, disabled: false, options: {length: 1},
    _keyManager: {withHorizontalOrientation() {}, destroy() {}},
    _changeDetectorRef: {markForCheck() {}}, _onTouched() {},
    trigger: {nativeElement: {getBoundingClientRect() {measurements++; return {height: 16, top: 0};}}},
    _overlayDir: {overlayRef: {overlayElement: {style}}},
    _applyModalPanelOwnership() {}, _clearFromModal() {}, _highlightCorrectOption() {},
    _calculateOverlayPosition() {calculations++;}, _selectAnimationsEnabled: () => false,
    _isRtl: () => false,
  });
  return {instance, stable, measurements: () => measurements, calculations: () => calculations,
    fontWrites: () => fontWrites, font: () => font};
}
function observations(sources) {
  const proto = prototype(sources), cases = [];
  for (const [id, run] of [
    ['public-open-measures-and-sets-font-once', f => {
      f.instance.open(); assert.equal(f.measurements(), 1); assert.equal(f.calculations(), 1);
      f.stable.next(); f.stable.next(); assert.equal(f.fontWrites(), 1); assert.equal(f.font(), '16px');
    }],
    ['public-open-after-destroy-is-inert', f => {
      f.instance.ngOnDestroy(); f.instance.open(); f.stable.next();
      assert.equal(f.measurements(), 0); assert.equal(f.calculations(), 0);
      assert.equal(f.fontWrites(), 0); assert.equal(f.stable.observers.length, 0);
    }],
    ['destroy-before-stable-unsubscribes-font-work', f => {
      f.instance.open(); f.instance.ngOnDestroy();
      assert.equal(f.stable.observers.length, 0); f.stable.next(); assert.equal(f.fontWrites(), 0);
    }],
    ['close-before-stable-does-no-closed-panel-font-work', f => {
      f.instance.open(); f.instance.close(); f.stable.next(); assert.equal(f.fontWrites(), 0);
    }],
    ['disabled-and-empty-open-remain-inert', f => {
      f.instance.disabled = true; f.instance.open(); f.instance.disabled = false;
      f.instance.options.length = 0; f.instance.open();
      assert.equal(f.measurements(), 0); assert.equal(f.stable.observers.length, 0);
    }],
  ]) {
    const f = fixture(proto);
    try {run(f); cases.push({id, result: 'pass'});}
    catch (error) {cases.push({id, result: 'fail', error: String(error.message)});}
    finally {f.instance.ngOnDestroy();}
  }
  return cases;
}
const cases = observations(raw), failures = cases.filter(row => row.result !== 'pass'), mutations = [];
if (!failures.length) {
  for (const [key, before, after, id, intended] of [
    ['base', 'return !this._motionDestroyed && !this._panelOpen', 'return !this._panelOpen', 'remove-open-predicate-destroy-guard', 'public-open-after-destroy-is-inert'],
    ['public', 'take(1), takeUntil(this._destroy)', 'take(1)', 'retain-stable-subscription-after-destroy', 'destroy-before-stable-unsubscribes-font-work'],
    ['public', 'this.panelOpen &&\n          this._triggerFontSize', 'this._triggerFontSize', 'font-work-on-closed-panel', 'close-before-stable-does-no-closed-panel-font-work'],
  ]) {
    assert.ok(raw[key].includes(before));
    const rows = observations({...raw, [key]: raw[key].replace(before, after)});
    assert.equal(rows.find(row => row.id === intended)?.result, 'fail', id);
    mutations.push({id, intended_case: intended, rejected: true});
  }
}
const args = process.argv.slice(2), reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
const report = {schema_version: 1, line: JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main',
  node: process.version, compiler: ts.version, source_sha256: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, sha(value)])),
  cases, failures, mutations, scope: 'Actual complete owned base and public derived prototype bodies, without constructors/decorators, with synthetic measurement/view/zone services and real borrowed RxJS streams. No Angular/browser/packed/floor qualification.', g11_claim: 'not-passed'};
if (reportPath) {assert.equal(existsSync(reportPath), false); writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');}
console.log(JSON.stringify({line: report.line, cases: cases.length, mutants_rejected: mutations.length, failures}));
if (failures.length && !args.includes('--allow-failures')) process.exitCode = 1;
