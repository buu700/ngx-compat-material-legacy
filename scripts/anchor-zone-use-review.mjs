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
const ts = createRequire(import.meta.url)('typescript'), rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
function print(node, source, owner) {
  if (ts.isPropertyDeclaration(node) && node.exclamationToken) {
    assert.ok(owner === 'MatLegacyButton' && node.name.text === 'ripple'
      || owner === 'MatLegacyAnchor' && node.name.text === 'tabIndex', 'new definite-assignment exception');
    node = ts.factory.updatePropertyDeclaration(node, node.modifiers, node.name, undefined, node.type, node.initializer);
  }
  return printer.printNode(ts.EmitHint.Unspecified, node, source);
}
export function reviewAnchorZone({root = rootDefault, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const capsulePath = 'compatibility/rc/anchor-zone-original-subjects.json.gz', bytes = readFileSync(join(root, capsulePath));
  assert.equal(hash(bytes), '8193b7fba7fff172b8cead965325d2005107790f8a7342430e2ba82cd77c3241');
  const raw = gunzipSync(bytes); assert.equal(hash(raw), '8e15a382ce9166bbf2c5a778accf282cd9a83a75e609068f3a2ab1b4b2aad684');
  const capsule = JSON.parse(raw); assert.equal(capsule.tag, '16.2.14');
  assert.equal(capsule.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  assert.deepEqual(capsule.members.map(r => r.path), ['src/material/legacy-button/button.ts', 'src/material/legacy-button/button.html',
    'src/material/core/common-behaviors/color.ts', 'src/material/core/common-behaviors/disabled.ts',
    'src/material/core/common-behaviors/disable-ripple.ts']);
  for (const member of capsule.members) {
    const raw = Buffer.from(member.source); assert.equal(hash(raw), member.sha256);
    assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest('hex'), member.git_blob_sha1);
  }
  const file = 'legacy-button/button.ts', path = 'projects/ngx-material-legacy/' + file;
  const current = read(path), original = capsule.members[0].source, now = parse(path, current), old = parse('original.ts', original);
  const classes = source => source.statements.filter(ts.isClassDeclaration);
  assert.deepEqual(classes(now).map(n => n.name.text), ['MatLegacyButton', 'MatLegacyAnchor']);
  assert.deepEqual(classes(old).map(n => n.name.text), ['MatLegacyButton', 'MatLegacyAnchor']);
  for (const [index, cls] of classes(now).entries()) {
    assert.deepEqual(cls.members.map(n => print(n, now, cls.name.text)),
      classes(old)[index].members.map(n => print(n, old, cls.name.text)), 'complete historical class members changed');
    assert.deepEqual(cls.heritageClauses.map(n => print(n, now)), classes(old)[index].heritageClauses.map(n => print(n, old)));
  }
  const support = source => source.statements.filter(n => !ts.isImportDeclaration(n) && !ts.isClassDeclaration(n));
  assert.deepEqual(support(now).map(n => print(n, now)), support(old).map(n => print(n, old)));
  for (const name of ['mixinColor', 'mixinDisabled', 'mixinDisableRipple']) {
    const owners = now.statements.filter(ts.isImportDeclaration).filter(n => n.importClause?.namedBindings
      && ts.isNamedImports(n.importClause.namedBindings)
      && n.importClause.namedBindings.elements.some(e => e.name.text === name && (e.propertyName || e.name).text === name));
    assert.equal(owners.length, 1); assert.equal(owners[0].moduleSpecifier.text, './internal/common-behaviors');
  }
  const bindings = now.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core')
    .flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'NgZone'));
  assert.equal(bindings.length, 1); assert.equal(bindings[0].name.text, 'NgZone');
  assert.ok(!bindings[0].isTypeOnly && !bindings[0].parent.parent.isTypeOnly);
  let references = 0;
  function visit(node) {
    if (ts.isIdentifier(node) && node.text === 'NgZone' && node !== bindings[0].name) {
      assert.ok(ts.isTypeReferenceNode(node.parent) && ts.isParameter(node.parent.parent));
      assert.equal(node.parent.parent.getText(now), '@Optional() private _ngZone?: NgZone');
      assert.ok(ts.isConstructorDeclaration(node.parent.parent.parent));
      assert.equal(node.parent.parent.parent.parent.name.text, 'MatLegacyAnchor'); references++;
    }
    ts.forEachChild(node, visit);
  }
  visit(now); assert.equal(references, 1);
  const mixins = {};
  for (const member of capsule.members.slice(2)) {
    const name = member.path.split('/').at(-1), path = 'projects/ngx-material-legacy/legacy-button/internal/common-behaviors/' + name;
    assert.equal(read(path), member.source); mixins[name] = {path, sha256: hash(read(path)), emitted: emitProgressBarSubject(member.source)};
  }
  const templatePath = 'projects/ngx-material-legacy/legacy-button/button.html';
  assert.equal(read(templatePath), capsule.members[1].source);
  const anchor = classes(now)[1], ctor = anchor.members.find(ts.isConstructorDeclaration);
  assert.equal(ctor.parameters.length, 4); assert.equal(ctor.parameters[3].name.text, '_ngZone');
  return {file, module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(current),
    original_subject: {path: capsulePath, sha256: hash(bytes)}, constructor_zone_index: 3,
    complete_parent_and_anchor_members_and_initialization_match: true,
    definite_assignment_exceptions: ['MatLegacyButton.ripple', 'MatLegacyAnchor.tabIndex'],
    contexts: anchor.members.map(n => n.getText(now)), owned_mixins: Object.values(mixins).map(({emitted, ...row}) => row),
    unchanged_template: {path: templatePath, sha256: hash(read(templatePath))},
    payload: {current: emitProgressBarSubject(current), original: emitProgressBarSubject(original),
      mixins: Object.fromEntries(Object.entries(mixins).map(([key, value]) => [key, value.emitted]))},
    scope: 'One frozen public NgZone import and complete manually constructed button/anchor classes with exact owned historical mixins. Supplied genuine zones, optional-zone fallback, disabled click behavior and parent/listener teardown are exercised. FocusMonitor and event target are explicit protocols; decorators omitted. No public FocusMonitor/ripple, native navigation/focus, Angular component DI/AOT/packed/styles/full floors or whole audit qualification.'};
}
