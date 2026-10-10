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
import {reviewPlatformUses} from '../scripts/platform-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript'), hash = text => createHash('sha256').update(text).digest('hex');
const review = reviewPlatformUses({root});
const form = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const wrapper = 'projects/ngx-material-legacy/legacy-tabs/tab-header.ts';
const chip = 'projects/ngx-material-legacy/legacy-chips/chip.ts';
const viewport = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
const source = readFileSync(join(root, form), 'utf8'), wrapperSource = readFileSync(join(root, wrapper), 'utf8');
const chipSource = readFileSync(join(root, chip), 'utf8'), viewportSource = readFileSync(join(root, viewport), 'utf8');
const sourceMutants = [
  [form, source.replace("from '@angular/cdk/platform'", "from '@angular/cdk/private'")],
  [form, source.replace('import {Platform}', 'import type {Platform}')],
  [form, source + '\nconst unreviewed = new Platform();\n'],
  [form, source.replace('this._platform.isBrowser', 'this._platform.isBrowser()')],
  [form, source.replace('this._platform.isBrowser', "this._platform['isBrowser']")],
  [form, source.replace('this._platform.isBrowser', "this['_platform'].isBrowser")],
  [form, source.replace('this._platform.isBrowser', '(this._platform.isBrowser = true)')],
  [form, source.replace('this._platform.isBrowser', '(this._platform.isBrowser++)')],
  [form, source.replace('this._platform.isBrowser', 'this._platform.valueSignal()')],
  [wrapper, wrapperSource.replace('viewportRuler, dir, ngZone, platform, animationMode)', 'viewportRuler, dir, platform, ngZone, animationMode)')],
  [chip, chipSource.replace('LegacyRippleRenderer as RippleRenderer', 'ModernRippleRenderer as RippleRenderer')],
  [viewport, viewportSource + '\n// unreviewed Platform delta\n'],
];
for (const [path, mutant] of sourceMutants) {
  assert.notEqual(mutant, readFileSync(join(root, path), 'utf8'));
  assert.throws(() => reviewPlatformUses({root, readSource: p => p === path ? mutant : readFileSync(join(root, p), 'utf8')}));
}
const loaded = prepareMaterialPublicSubjects(root), results = [], declarations = [], mutations = [];
const worker = readFileSync(join(root, 'tests/platform_public_subject.mjs'), 'utf8');
try {
  for (const model of loaded.models) {
    const pkg = model.packages.get('@angular/cdk'), route = pkg.exports['./platform'];
    const entryKey = '@angular/cdk/' + route.types.slice(2), entryText = model.sources.get(entryKey);
    const entry = ts.createSourceFile(entryKey, entryText, ts.ScriptTarget.Latest, true);
    let targetKey = entryKey;
    if (model.line !== 'original') {
      const links = entry.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'Platform').map(e => ({node: n, binding: e})));
      assert.equal(links.length, 1); assert.equal((links[0].binding.propertyName || links[0].binding.name).text, 'Platform');
      assert.equal(links[0].node.moduleSpecifier.text, './_platform-chunk.js');
      targetKey = '@angular/cdk/types/_platform-chunk.d.ts';
    }
    const targetText = model.sources.get(targetKey), target = ts.createSourceFile(targetKey, targetText, ts.ScriptTarget.Latest, true);
    const classes = target.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'Platform');
    assert.equal(classes.length, 1);
    const cls = classes[0], fields = ['isBrowser', 'EDGE', 'TRIDENT', 'BLINK', 'WEBKIT', 'IOS', 'FIREFOX', 'ANDROID', 'SAFARI'];
    const members = cls.members.filter(n => n.name && fields.includes(n.name.getText(target)));
    assert.deepEqual(members.map(n => n.name.getText(target)), fields);
    for (const node of [cls, ...members]) assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
    for (const node of members) {
      assert.ok(ts.isPropertyDeclaration(node)); assert.equal(node.type.kind, ts.SyntaxKind.BooleanKeyword);
      assert.ok(!(node.modifiers || []).some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.StaticKeyword].includes(m.kind)));
    }
    if (model.line === 'original') assert.ok(cls.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    else assert.equal(target.statements.filter(n => ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause))
      .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'Platform' && (e.propertyName || e.name).text === 'Platform')).length, 1);
    const entries = [...model.sources].filter(([key, text]) => key.startsWith('@angular/cdk/') && key.endsWith('.mjs') && text.includes('class Platform {'));
    assert.equal(entries.length, 1);
    const [runtimeKey, runtime] = entries[0], runtimePath = join(model.root, 'node_modules', runtimeKey);
    declarations.push({line: model.line, version: pkg.version, entry: {path: entryKey, sha256: hash(entryText)},
      target: {path: targetKey, sha256: hash(targetText)}, runtime: {path: runtimeKey, sha256: hash(runtime)}, declaration: cls.getText(target),
      compatibility_constructor_arguments_used: false});
    const path = join(model.root, 'platform-public-subject.mjs'); writeFileSync(path, worker);
    for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [path, model.line, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: model.borrowed});
    }
    // Change one contract in the whole authenticated module; never substitute a sliced fake class.
    const ast = ts.createSourceFile(runtimeKey, runtime, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const runtimeClass = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'Platform');
    assert.ok(runtimeClass);
    const begin = runtimeClass.getStart(ast), end = runtimeClass.end, body = runtime.slice(begin, end);
    const replace = (from, to) => {assert.equal(body.split(from).length, 2, from); return runtime.slice(0, begin) + body.replace(from, to) + runtime.slice(end);};
    const mutants = {
      'edge-detection': replace('/(edge)/i', '/(never-edge)/i'),
      'trident-detection': replace('/(msie|trident)/i', '/(never-trident)/i'),
      'ios-msstream-exclusion': replace(" && !('MSStream' in window)", ''),
      'safari-webkit-requirement': replace(' && this.WEBKIT', ''),
      'firefox-detection': replace('/(firefox|minefield)/i', '/(never-firefox)/i'),
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
  const report = {schema_version: 1, role: 'Finite public Platform dependency review', line: review.line,
    node: process.version, compiler: ts.version, source_review: review, source_negative_controls: sourceMutants.length,
    public_namespace_capsule_sha256: loaded.capsule_hash, declarations, results, mutations,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    scope: 'Whole authenticated original16 and advertised main/21 minimum public modules. Genuine public Platform and Core/Compiler factories execute with borrowed RxJS/tslib. UA/window/document records are protocols. Original manual construction works; current Platform requires DI. Owned callers only inject/forward and read boolean flags. No actual legacy components, automatic application root provision, native rendering, packed AOT, full Node/RxJS floors or G11 qualification.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({uses: review.cases.length, delta_sources: review.delta_sources.length, subjects: results.length,
    cases: results.reduce((n, r) => n + r.cases.length, 0), source_negative_controls: sourceMutants.length,
    runtime_mutation_rejections: mutations.length, actual_legacy_components_executed: false, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
