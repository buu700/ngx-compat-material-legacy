/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), read = path => readFileSync(join(root, path), 'utf8');
const capsulePath = 'compatibility/rc/owned-menu-item-original-subjects.json.gz', bytes = readFileSync(join(root, capsulePath));
assert.equal(hash(bytes), '31202e16f329569d0797b37f4d811f29856a441b33871058e5166decc6f5a269');
const raw = gunzipSync(bytes); assert.equal(hash(raw), '4af903303794476b6f873e2ceb8f6d8ea426fb16941c9c6f1d8635fce523f2ca');
const original = JSON.parse(raw); assert.equal(original.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
for (const member of original.members) {const bytes = Buffer.from(member.source); assert.equal(hash(bytes), member.sha256);
  assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex'), member.git_blob_sha1);}
const sources = {base: read('projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts'),
  leaf: read('projects/ngx-material-legacy/legacy-menu/menu-item.ts')};
assert.equal(read('projects/ngx-material-legacy/legacy-menu/menu-item.html'), original.members[2].source);
const parse = (name, text) => {const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;};
const printer = ts.createPrinter({removeComments: true});
const currentSource = parse('owned.ts', sources.base), taggedSource = parse('tagged.ts', original.members[0].source);
const currentClass = currentSource.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === '_LegacyMenuItemBase');
const taggedClass = taggedSource.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MatMenuItem');
assert.ok(currentClass && taggedClass);
function normalized(node, source) {
  const transformed = ts.transform(node, [context => root => ts.visitNode(root, function visit(n) {
    return ts.isIdentifier(n) && n.text === '_LegacyMenuItemBase' ? ts.factory.createIdentifier('MatMenuItem')
      : ts.visitEachChild(n, visit, context);
  })]);
  try {return printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], source);}
  finally {transformed.dispose();}
}
assert.deepEqual(currentClass.members.map(n => normalized(n, currentSource)),
  taggedClass.members.map(n => normalized(n, taggedSource)), 'every original constructor/member remains exact after the owned class rename');
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS,
  experimentalDecorators: true, emitDecoratorMetadata: true}}).outputText;
const payload = {currentBase: emit(sources.base), currentLeaf: emit(sources.leaf), originalBase: emit(original.members[0].source),
  originalLeaf: emit(original.members[1].source), mixins: ['disabled', 'disable-ripple'].map(name => emit(read('projects/ngx-material-legacy/legacy-menu/internal/common-behaviors/' + name + '.ts')))};
const loaded = prepareMaterialPublicSubjects(root), results = [];
try {
  for (const model of loaded.models) {
    writeFileSync(join(model.root, 'owned-menu-item-payload.json'), JSON.stringify(payload));
    const entry = join(model.root, 'owned-menu-item-subject.mjs'); writeFileSync(entry, read('tests/owned_menu_item_subject.mjs'));
    for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [entry, model.line, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: model.borrowed});
    }
  }
  const report = {schema_version: 1, sources: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, hash(value)])),
    original_subject: {path: capsulePath, sha256: hash(bytes)}, results,
    scope: 'Complete owned/tagged parent/legacy item with actual decorators and public-framework JIT factories. Focus/document/panel/DOM/change-detector protocols, RxJS borrowed; no application or style-service adapter. Manual one/five-argument construction restored. Native queries/inputs/DI, actual FocusMonitor, packed/AOT/styles/full floors and complete API admission remain pending.',
    g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    manual_contract_restored: true, application_created: false, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
