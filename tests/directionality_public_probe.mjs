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
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {reviewDirectionalityUses} from '../scripts/directionality-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript'), hash = text => createHash('sha256').update(text).digest('hex');
const review = reviewDirectionalityUses({root});
const form = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const wrapper = 'projects/ngx-material-legacy/legacy-tabs/tab-header.ts';
const source = readFileSync(join(root, form), 'utf8'), wrapperSource = readFileSync(join(root, wrapper), 'utf8');
const sourceMutants = [
  [form, source.replace("from '@angular/cdk/bidi'", "from '@angular/cdk/private'")],
  [form, source.replace('import {Directionality}', 'import type {Directionality}')],
  [form, source + '\nconst unreviewed = new Directionality();\n'],
  [form, source.replace('this._dir.value', 'this._dir.valueSignal()')],
  [form, source.replace('this._dir.value', "this._dir['value']")],
  [form, source.replace('this._dir.value', "this['_dir'].value")],
  [form, source.replace('this._dir.value', "(this._dir.value = 'rtl')")],
  [form, source + '\nfunction shadow(_dir: any) {return _dir.value;}\n'],
  [form, source + '\nfunction construct(Directionality: any) {return new Directionality();}\n'],
  [wrapper, wrapperSource.replace('viewportRuler, dir, ngZone, platform, animationMode)', 'dir, viewportRuler, ngZone, platform, animationMode)')],
];
for (const [path, mutant] of sourceMutants) {
  assert.notEqual(mutant, path === form ? source : wrapperSource);
  assert.throws(() => reviewDirectionalityUses({root, readSource: p => p === path ? mutant : readFileSync(join(root, p), 'utf8')}));
}
const loaded = prepareMaterialPublicSubjects(root), results = [], declarations = [], mutations = [];
const worker = readFileSync(join(root, 'tests/directionality_public_subject.mjs'), 'utf8');
try {
  for (const model of loaded.models) {
    const pkg = model.packages.get('@angular/cdk'), types = pkg.exports['./bidi'].types;
    const entryKey = '@angular/cdk/' + types.slice(2), entryText = model.sources.get(entryKey);
    const entry = ts.createSourceFile(entryKey, entryText, ts.ScriptTarget.Latest, true);
    let targetKey = entryKey;
    if (model.line !== 'original') {
      const links = entry.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'Directionality').map(e => ({node: n, binding: e})));
      assert.equal(links.length, 1); assert.equal((links[0].binding.propertyName || links[0].binding.name).text, 'Directionality');
      assert.equal(links[0].node.moduleSpecifier.text, './_bidi-module-chunk.js');
      targetKey = '@angular/cdk/types/_bidi-module-chunk.d.ts';
    }
    const targetText = model.sources.get(targetKey), target = ts.createSourceFile(targetKey, targetText, ts.ScriptTarget.Latest, true);
    const classes = target.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'Directionality');
    assert.equal(classes.length, 1);
    const cls = classes[0], members = cls.members.filter(n => n.name && ['value', 'change'].includes(n.name.getText(target)));
    assert.equal(members.length, 2);
    for (const node of [cls, ...members]) assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
    assert.equal(members.find(n => n.name.getText(target) === 'change').type.getText(target), 'EventEmitter<Direction>');
    const value = members.find(n => n.name.getText(target) === 'value');
    assert.equal(value.type.getText(target), 'Direction');
    if (model.line === 'original') assert.ok(cls.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    else assert.equal(target.statements.filter(n => ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause))
      .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'Directionality' && (e.propertyName || e.name).text === 'Directionality')).length, 1);
    const entries = [...model.sources].filter(([key, text]) => key.startsWith('@angular/cdk/') && key.endsWith('.mjs') && text.includes('class Directionality {'));
    assert.equal(entries.length, 1);
    const [runtimeKey, runtime] = entries[0], runtimePath = join(model.root, 'node_modules', runtimeKey);
    declarations.push({line: model.line, version: pkg.version, entry: {path: entryKey, sha256: hash(entryText)},
      target: {path: targetKey, sha256: hash(targetText)}, runtime: {path: runtimeKey, sha256: hash(runtime)}, declaration: cls.getText(target)});
    const path = join(model.root, 'directionality-public-subject.mjs'); writeFileSync(path, worker);
    for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [path, model.line, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: model.borrowed});
    }
    // Mutate the complete authenticated runtime; class slicing scopes replacements only.
    const ast = ts.createSourceFile(runtimeKey, runtime, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const runtimeClass = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'Directionality');
    assert.ok(runtimeClass);
    const begin = runtimeClass.getStart(ast), end = runtimeClass.end, body = runtime.slice(begin, end);
    const replace = (from, to) => {assert.equal(body.split(from).length, 2, from); return runtime.slice(0, begin) + body.replace(from, to) + runtime.slice(end);};
    const mutants = {
      'document-precedence': replace("bodyDir || htmlDir || 'ltr'", "htmlDir || bodyDir || 'ltr'"),
      'service-completion': replace('this.change.complete();', "this.change.emit('ltr');"),
      'initial-value': replace(model.line === 'original' ? "this.value = 'ltr';" : "valueSignal = signal('ltr'", model.line === 'original' ? "this.value = 'rtl';" : "valueSignal = signal('rtl'"),
      'optional-document': replace('optional: true', 'optional: false'),
    };
    for (const [id, text] of Object.entries(mutants)) {
      writeFileSync(runtimePath, text);
      const result = spawnSync(process.execPath, [path, model.line, 'false'], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, id + ' escaped');
      assert.match(result.stderr, /AssertionError/, id + ' did not reach contract assertion');
      mutations.push({line: model.line, id, assertion_rejected: true});
    }
    writeFileSync(runtimePath, runtime);
  }
  const report = {schema_version: 1, role: 'Finite public Directionality dependency review', line: review.line,
    node: process.version, compiler: ts.version, source_review: review, source_negative_controls: sourceMutants.length,
    public_namespace_capsule_sha256: loaded.capsule_hash, declarations, results, mutations,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    scope: 'Whole authenticated original16 and advertised main/21 minimum public modules. Actual public factories and explicit Injector providers execute with genuine Core/Compiler and borrowed RxJS. Document records are protocols. Original manual Directionality construction works; current service requires DI. Owned callers only inject/forward and read value/change. No actual legacy components, automatic application root provision, native rendering, packed AOT, full Node/RxJS floors or G11 qualification.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({uses: review.cases.length, subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0),
    source_negative_controls: sourceMutants.length, runtime_mutation_rejections: mutations.length, actual_legacy_components_executed: false, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
