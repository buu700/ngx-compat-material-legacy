/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const root = resolve(process.argv[2] || process.cwd());
const ts = createRequire(resolve(root, 'package.json'))('typescript');
const path = 'projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts';
const raw = readFileSync(resolve(root, path), 'utf8');
const file = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true);
assert.equal(file.parseDiagnostics.length, 0);
const owner = file.statements.find(
  node => ts.isClassDeclaration(node) && node.name?.text === '_MatRadioButtonBase',
);
const method = owner.members.find(node => node.name?.getText(file) === '_updateTabIndex').getText(file);
const destroy = owner.members.find(node => node.name?.getText(file) === 'ngOnDestroy').getText(file);

function scenarios(body, destroyBody = destroy) {
  const js = ts.transpileModule('export class Replay {' + body + destroyBody + '}', {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS},
  }).outputText;
  let cases = 0;
  for (const mode of [
    'server', 'normal', 'foreign-document', 'focus-moved', 'disabled',
    'destroyed', 'destroyed-retained-focus',
  ]) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
    try {
      if (mode === 'foreign-document') {
        Object.defineProperty(globalThis, 'document', {
          configurable: true, value: {activeElement: {outside: true}},
        });
      } else {
        delete globalThis.document;
      }
      const tasks = [], exports = {};
      new Function('exports', 'queueMicrotask', js)(exports, fn => tasks.push(fn));
      const outside = {outside: true}, doc = {activeElement: null}, attrs = {};
      let focusCalls = 0, blurCalls = 0;
      const target = {
        ownerDocument: doc,
        focus() {
          focusCalls++;
          if (mode !== 'disabled') doc.activeElement = target;
        },
      };
      const input = {
        ownerDocument: doc,
        setAttribute(name, value) { attrs[name] = value; },
        blur() { blurCalls++; doc.activeElement = outside; },
      };
      if (mode !== 'server') doc.activeElement = input;
      const subject = new exports.Replay();
      Object.assign(subject, {
        radioGroup: {selected: {_inputElement: {nativeElement: target}}},
        tabIndex: 0, disabled: false, _inputElement: {nativeElement: input},
        _focusMonitor: {stopMonitoring() {}}, _removeUniqueSelectionListener() {},
      });
      subject._updateTabIndex();
      assert.equal(attrs.tabindex, '-1');
      assert.equal(tasks.length, 1);
      assert.equal(focusCalls, 0);
      if (mode === 'focus-moved' || mode === 'destroyed') doc.activeElement = outside;
      if (mode === 'destroyed-retained-focus') subject.ngOnDestroy();
      tasks.shift()();
      assert.equal(tasks.length, 0);
      if (mode === 'normal' || mode === 'foreign-document') {
        assert.equal(doc.activeElement, target);
        assert.equal(focusCalls, 1);
        assert.equal(blurCalls, 0);
      } else if (mode === 'disabled') {
        assert.equal(doc.activeElement, outside);
        assert.equal(focusCalls, 1);
        assert.equal(blurCalls, 1);
      } else {
        assert.equal(focusCalls, 0);
        assert.equal(blurCalls, 0);
        assert.equal(doc.activeElement,
          mode === 'server' ? null : mode === 'destroyed-retained-focus' ? input : outside);
      }
      cases++;
    } finally {
      if (original) Object.defineProperty(globalThis, 'document', original);
      else delete globalThis.document;
    }
  }
  return cases;
}

assert.equal(scenarios(method), 7);
const mutants = [
  ['missing-destruction-guard', method.replace('!this._isDestroyed &&', '')],
  ['global-document', method.replaceAll('input.ownerDocument.activeElement', 'document.activeElement')],
  ['synchronous-focus', method.replace('queueMicrotask(() => {', '((fn) => fn())(() => {')],
  ['steal-later-focus', method.replace('input.ownerDocument.activeElement === input', 'true')],
  ['missing-disabled-blur', method.replace('this._inputElement.nativeElement.blur();', ';')],
];
for (const [name, body] of mutants) {
  assert.notEqual(body, method, name + ' was not applied');
  assert.throws(() => scenarios(body), undefined, name + ' escaped');
}
const missingDestroyFlag = destroy.replace('this._isDestroyed = true;', ';');
assert.notEqual(missingDestroyFlag, destroy);
assert.throws(() => scenarios(method, missingDestroyFlag), undefined, 'missing-destruction-hook escaped');
console.log(JSON.stringify({
  source: {path, sha256: createHash('sha256').update(raw).digest('hex')},
  cases: 7,
  mutants_rejected: [...mutants.map(([name]) => name), 'missing-destruction-hook'],
  scope: 'Actual owned methods in protocol receivers; complete Angular SSR and browser rendering are separate evidence.',
}));
