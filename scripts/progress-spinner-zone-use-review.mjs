/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {emitProgressBarSubject} from './progress-bar-zone-use-review.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (name, text) => {const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
export function reviewProgressSpinnerZone({root = rootDefault, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const capsulePath = 'compatibility/rc/progress-spinner-zone-original-subjects.json.gz';
  const bytes = readFileSync(join(root, capsulePath));
  assert.equal(hash(bytes), 'cca6bbbe97c179d4d7131a3b1cc9a708ed960ed0c64df953e696a55a9cfef7b9');
  const raw = gunzipSync(bytes); assert.equal(hash(raw), '848390d912842cb7fe52733fa2a3218dde47f2e974d94589937027422a3366d9');
  const capsule = JSON.parse(raw); assert.equal(capsule.tag, '16.2.14');
  assert.equal(capsule.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  assert.deepEqual(capsule.members.map(r => r.path), ['src/material/legacy-progress-spinner/progress-spinner.ts',
    'src/material/legacy-progress-spinner/progress-spinner.html', 'src/material/core/common-behaviors/color.ts']);
  for (const member of capsule.members) {
    const raw = Buffer.from(member.source); assert.equal(hash(raw), member.sha256);
    assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest('hex'), member.git_blob_sha1);
  }
  const file = 'legacy-progress-spinner/progress-spinner.ts', path = 'projects/ngx-material-legacy/' + file;
  const current = read(path), original = capsule.members[0].source;
  const now = parse(path, current), old = parse('original.ts', original);
  const named = source => {const rows = source.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'MatLegacyProgressSpinner');
    assert.equal(rows.length, 1); return rows[0];};
  const owner = named(now), historical = named(old);
  assert.deepEqual(owner.members.filter(n => n.name?.text !== 'ngOnInit').map(n => print(n, now)),
    historical.members.filter(n => n.name?.text !== 'ngOnInit').map(n => print(n, old)),
    'all class members outside the separately owned shadow-lookup lifecycle remain exact');
  for (const name of ['constructor', 'ngOnDestroy']) {
    const member = cls => cls.members.find(n => name === 'constructor' ? ts.isConstructorDeclaration(n) : n.name?.text === name);
    assert.equal(print(member(owner), now), print(member(historical), old), 'complete historical ' + name + ' changed');
  }
  // Entire property/field initialization participates in constructor execution.
  assert.deepEqual(owner.members.filter(ts.isPropertyDeclaration).map(n => print(n, now)),
    historical.members.filter(ts.isPropertyDeclaration).map(n => print(n, old)));
  const support = source => source.statements.filter(n => !ts.isClassDeclaration(n) && !ts.isImportDeclaration(n)
    && !(ts.isTypeAliasDeclaration(n) && n.name.text === 'NumberInput'));
  assert.deepEqual(support(now).map(n => print(n, now)), support(old).map(n => print(n, old)));
  const binding = now.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core')
    .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'NgZone'));
  assert.equal(binding.length, 1); assert.equal(binding[0].name.text, 'NgZone');
  assert.ok(!binding[0].isTypeOnly && !binding[0].parent.parent.isTypeOnly);
  let count = 0;
  function visit(node) {
    if (ts.isIdentifier(node) && node.text === 'NgZone' && node !== binding[0].name) {
      assert.ok(ts.isTypeReferenceNode(node.parent) && ts.isParameter(node.parent.parent));
      assert.equal(node.parent.parent.getText(now), 'ngZone?: NgZone');
      assert.ok(ts.isConstructorDeclaration(node.parent.parent.parent)); count++;
    }
    ts.forEachChild(node, visit);
  }
  visit(now); assert.equal(count, 1);
  const ctor = owner.members.find(ts.isConstructorDeclaration);
  assert.equal(ctor.parameters.length, 9); assert.equal(ctor.parameters[7].getText(now), 'ngZone?: NgZone');
  const colorPath = 'projects/ngx-material-legacy/legacy-progress-spinner/internal/common-behaviors/color.ts';
  const color = read(colorPath); assert.equal(color, capsule.members[2].source);
  const templatePath = 'projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.html';
  assert.equal(read(templatePath), capsule.members[1].source);
  return {file, module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(current),
    original_subject: {path: capsulePath, sha256: hash(bytes)}, constructor_parameter_count: 9, zone_parameter_index: 7,
    constructor_source: ctor.getText(now), destruction_source: owner.members.find(n => n.name?.text === 'ngOnDestroy').getText(now),
    constructor_fields_and_destruction_match_original: true, owned_color: {path: colorPath, sha256: hash(color)},
    unchanged_template: {path: templatePath, sha256: hash(read(templatePath))},
    payload: {current: emitProgressBarSubject(current), original: emitProgressBarSubject(original),
      ownedColor: emitProgressBarSubject(color), originalColor: emitProgressBarSubject(capsule.members[2].source)},
    scope: 'One public NgZone import and its complete historical constructor/field/resize callback/destruction contract. Complete manual classes are loaded; ngOnInit, dynamic styles, shadow lookup, circle geometry and other methods are not qualified. Genuine minimum public Platform/NgZone with explicit UA/window and viewport/change-detector protocols, borrowed RxJS; decorators omitted. No packed/native/AOT or full floor qualification.'};
}
