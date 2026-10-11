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
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
export function emitProgressBarSubject(text) {
  const source = parse('subject.ts', text), ranges = [];
  function visit(node) {
    if (ts.isDecorator(node)) ranges.push([node.getStart(source), node.end]);
    ts.forEachChild(node, visit);
  }
  visit(source);
  // Only decorators are omitted. These manual-instance tests do not qualify
  // Angular node DI, templates, compiled component factories or native rendering.
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + text.slice(end);
  const out = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS}, reportDiagnostics: true});
  assert.equal(out.diagnostics.length, 0); return out.outputText;
}
export function reviewProgressBarZone({root = rootDefault, readSource} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const capsulePath = 'compatibility/rc/progress-bar-zone-original-subjects.json';
  const bytes = readFileSync(join(root, capsulePath));
  assert.equal(hash(bytes), 'c9f2f2d241bf795eaf3481fd215cd25e3c9360578835eb7e3d034db39c469a99');
  const capsule = JSON.parse(bytes);
  assert.equal(capsule.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  assert.equal(capsule.tag, '16.2.14');
  assert.deepEqual(capsule.members.map(r => r.path), [
    'src/material/legacy-progress-bar/progress-bar.ts', 'src/material/legacy-progress-bar/progress-bar.html',
    'src/material/legacy-progress-bar/progress-bar.scss', 'src/material/core/common-behaviors/color.ts']);
  for (const member of capsule.members) {
    const raw = Buffer.from(member.source);
    assert.equal(hash(raw), member.sha256);
    assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest('hex'), member.git_blob_sha1);
  }
  const file = 'legacy-progress-bar/progress-bar.ts', path = 'projects/ngx-material-legacy/' + file;
  const current = read(path), original = capsule.members[0].source;
  const now = parse(path, current), old = parse('original.ts', original);
  const getClass = source => {
    const classes = source.statements.filter(ts.isClassDeclaration);
    assert.equal(classes.length, 1); assert.equal(classes[0].name.text, 'MatLegacyProgressBar'); return classes[0];
  };
  const owned = getClass(now), historical = getClass(old);
  assert.deepEqual(owned.members.map(n => print(n, now)), historical.members.map(n => print(n, old)),
    'every historical constructor, field, getter, setter and lifecycle method must remain exact');
  const support = source => source.statements.filter(n => !ts.isImportDeclaration(n)
    && !ts.isClassDeclaration(n) && !(ts.isTypeAliasDeclaration(n) && n.name.text === 'NumberInput'));
  assert.deepEqual(support(now).map(n => print(n, now)), support(old).map(n => print(n, old)),
    'historical base initialization, ID counter and clamp helper must remain exact');
  const coreImports = now.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/core');
  const zones = coreImports.flatMap(n => n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'NgZone'));
  assert.equal(zones.length, 1); assert.equal(zones[0].name.text, 'NgZone');
  assert.ok(!zones[0].isTypeOnly && !zones[0].parent.parent.isTypeOnly);
  const zoneRefs = [];
  function visit(node) {
    if (ts.isIdentifier(node) && node.text === 'NgZone' && node !== zones[0].name) {
      assert.ok(ts.isTypeReferenceNode(node.parent) && ts.isParameter(node.parent.parent));
      assert.equal(node.parent.parent.getText(now), 'private _ngZone: NgZone');
      assert.ok(ts.isConstructorDeclaration(node.parent.parent.parent)); zoneRefs.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(now); assert.equal(zoneRefs.length, 1);
  const ownedColorPath = 'projects/ngx-material-legacy/legacy-progress-bar/internal/common-behaviors/color.ts';
  const ownedColor = read(ownedColorPath), originalColor = capsule.members[3].source;
  assert.equal(ownedColor, originalColor, 'the actual owned mixin is the untouched historical implementation');
  const templatePath = 'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.html';
  assert.equal(read(templatePath), capsule.members[1].source);
  const helper = now.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'clamp');
  assert.equal(print(helper, now), print(old.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'clamp'), old));
  return {schema_version: 1, file, module: '@angular/core', symbol: 'NgZone', candidate_source_sha256: hash(current),
    original_subject: {path: capsulePath, sha256: hash(bytes)}, historical_members: owned.members.length,
    constructor_and_all_members_match: true, owned_color: {path: ownedColorPath, sha256: hash(ownedColor)},
    unchanged_template: {path: templatePath, sha256: hash(read(templatePath))},
    contexts: ['constructor', 'ngAfterViewInit', 'ngOnDestroy'].map(name => {
      const node = owned.members.find(n => name === 'constructor' ? ts.isConstructorDeclaration(n) : n.name?.text === name);
      return {name, source: node.getText(now), sha256: hash(node.getText(now))};
    }), payload: {current: emitProgressBarSubject(current), original: emitProgressBarSubject(original),
      ownedColor: emitProgressBarSubject(ownedColor), originalColor: emitProgressBarSubject(originalColor)},
    scope: 'One frozen public NgZone dependency and exact complete historical class members/mixin/template. The runtime producer tests manually constructed complete classes with genuine public peer NgZone/EventEmitter/ElementRef/coercion and borrowed RxJS. Decorators omitted; event target and geometry are explicit protocols. No Angular node DI, packed/AOT/native motion/style or full runtime-floor qualification.'};
}
