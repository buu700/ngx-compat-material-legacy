/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryNgZoneUses} from './ng-zone-use-inventory.mjs';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = b => createHash('sha256').update(b).digest('hex');
export function reviewInkBarZoneUse({root = rootDefault, readSource = p => readFileSync(join(root, p), 'utf8')} = {}) {
  const file = 'legacy-tabs/ink-bar.ts', path = 'projects/ngx-material-legacy/' + file;
  const inventory = inventoryNgZoneUses({root, readSource});
  const cases = inventory.cases.filter(row => row.file === file); assert.equal(cases.length, 1);
  const source = ts.createSourceFile(path, readSource(path), ts.ScriptTarget.Latest, true);
  const imported = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === '@angular/core')
    .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'NgZone'));
  assert.equal(imported.length, 1); assert.ok(!imported[0].isTypeOnly && !imported[0].parent.parent.isTypeOnly);
  const cls = source.statements.find(ts.isClassDeclaration), ctor = cls.members.find(ts.isConstructorDeclaration);
  assert.equal(cls.name.text, 'MatLegacyInkBar'); assert.equal(ctor.parameters.length, 4);
  assert.equal(ctor.parameters[1].name.getText(source), '_ngZone'); assert.ok(!ctor.parameters[1].questionToken);
  assert.equal(ctor.parameters[1].type.getText(source), 'NgZone'); assert.equal(ctor.body.statements.length, 0);
  assert.deepEqual(cases[0].references.map(r => r.role), ['typed-receiver:Parameter']);
  const accesses = inventory.accesses.filter(row => row.file === file);
  assert.deepEqual(accesses.map(r => r.member), ['run', 'isStable', 'onStable']);
  assert.deepEqual(inventory.forwarding.filter(row => row.file === file), []);
  return {file, module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(source.text),
    references: cases[0].references, accesses, historical_constructor_parameters: 4,
    scope: 'One checker-bound required historical constructor zone and three exact public accesses. Whole class/public zone execution is separately bound; no broad NgZone caller admission.'};
}
