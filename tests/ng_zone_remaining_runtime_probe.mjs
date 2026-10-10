/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public method contracts and whole owned observer helpers; no import admissions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {inventoryNgZoneUses} from '../scripts/ng-zone-use-inventory.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(join(root, path), 'utf8');
const resizePath = 'projects/ngx-material-legacy/legacy-tabs/internal/owned-header-resize.ts';
const viewportPath = 'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts';
const workerPath = 'tests/ng_zone_remaining_runtime_subject.mjs';
const resize = read(resizePath), viewport = read(viewportPath), worker = read(workerPath);
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS, experimentalDecorators: true}}).outputText;
const replace = (source, from, to) => {
  assert.equal(source.split(from).length - 1, 1, 'mutation anchor is not unique');
  return source.replace(from, to);
};
const payload = {resize: emit(resize), viewport: emit(viewport), mutations: {
  resizeNoDisconnect: emit(replace(resize, 'return () => resizeObserver.disconnect();', 'return () => {};')),
  resizeInside: emit(replace(resize, 'ngZone.runOutsideAngular(', 'ngZone.run(')),
  viewportNoRemove: emit(replace(viewport,
    "      target.removeEventListener('resize', state.listener);\n      target.removeEventListener('orientationchange', state.listener);", '')),
  viewportNoComplete: emit(replace(viewport, 'state.changes.complete();', '')),
  viewportInside: emit(replace(viewport, 'zone.runOutsideAngular(', 'zone.run(')),
}};
const inventory = inventoryNgZoneUses({root}), loaded = prepareMaterialPublicSubjects(root), results = [];
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
try {
  const compilerPath = process.env.CLOSEOUT_TYPESCRIPT_ROOT
    ? join(process.env.CLOSEOUT_TYPESCRIPT_ROOT, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(compilerPath), declarations = [], types = [];
  for (const model of loaded.models) {
    const found = [];
    for (const [path, text] of model.sources) if (path.startsWith('@angular/core/') && path.endsWith('.d.ts')) {
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const node of source.statements) if (ts.isClassDeclaration(node) && node.name?.text === 'NgZone') {
        assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)));
        const selected = node.members.filter(member => ['run', 'runOutsideAngular', 'isStable', 'onStable', 'onMicrotaskEmpty'].includes(member.name?.getText(source)));
        assert.equal(selected.length, 5);
        selected.forEach(member => assert.ok(!ts.getJSDocTags(member).some(tag =>
          ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text))));
        found.push({path, source_sha256: hash(text), members: selected.map(member => member.getText(source))});
      }
    }
    assert.equal(found.length, 1); declarations.push({line: model.line, ...found[0]});
    if (model.line === line) {
      const fixture = `import {NgZone} from '@angular/core';
import {take} from 'rxjs/operators';
const zone = new NgZone({enableLongStackTrace: false});
const inside: number = zone.run(() => 1);
const outside: string = zone.runOutsideAngular(() => 'value');
const stable: boolean = zone.isStable;
zone.onStable.pipe(take(1)).subscribe(() => {});
zone.onMicrotaskEmpty.pipe(take(1)).subscribe(() => {});
// @ts-expect-error Public stability is readonly.
zone.isStable = true;
// @ts-expect-error Synchronous callback is required.
zone.run(1);
// @ts-expect-error The callback return type is preserved.
const wrongInside: string = zone.run(() => 1);
// @ts-expect-error The outside callback return type is preserved.
const wrongOutside: number = zone.runOutsideAngular(() => 'value');
// @ts-expect-error There is no promise of arbitrary private members.
zone.missingLegacyCompatibilityMember();
`;
      const path = join(model.root, 'ng-zone-public-contract.ts'); writeFileSync(path, fixture);
      const program = compiler.createProgram([path], {target: compiler.ScriptTarget.ES2022,
        module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
        strict: true, noEmit: true, skipLibCheck: false, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
      const diagnostics = compiler.getPreEmitDiagnostics(program);
      assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
        getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
      types.push({line: model.line, fixture_sha256: hash(fixture), negative_checks: 5});
    }
    const zoneSubject = installNgZonePublicSubject(model, root);
    writeFileSync(join(model.root, 'ng-zone-remaining-payload.json'), JSON.stringify(payload));
    const path = join(model.root, 'ng-zone-remaining-runtime-subject.mjs'); writeFileSync(path, worker);
    for (const mode of model.line === 'original' ? ['zoneful'] : ['zoneful', 'zoneless']) {
      for (const production of [false, true]) {
        const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path,
          model.line, mode, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
        results.push({line: model.line, mode, production, zone_subject: zoneSubject, borrowed: model.borrowed, ...result});
      }
    }
  }
  assert.equal(results.length, 10);
  const report = {schema_version: 1, line, node: process.version, binding_parser: ts.version,
    namespace_capsule_sha256: loaded.capsule_hash, inventory, declarations, results,
    sources: [resizePath, viewportPath, workerPath, 'scripts/ng-zone-use-inventory.mjs']
      .map(path => ({path, sha256: hash(read(path))})),
    type_compilation: {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: types},
    scope: 'Complete authenticated public NgZone namespaces/providers, public synchronous return/error/context and asynchronous task/event contracts. Whole owned resize function and viewport class with genuine public zones/RxJS; EventTarget/window/ResizeObserver/platform/document/renderer are explicit protocols. No native browser observers, actual Angular legacy component DI, product AOT, packed artifact, consumer builds or Node/Rx floors. Original has no current zoneless provider; owned viewport only runs in current subjects. No frozen use or SHA is closed by this report.',
    new_frozen_use_closures: 0, actual_legacy_component_instances_qualified: false,
    native_or_packed_qualified: false, g11_claim: 'not-passed'};
  const mutations = results.flatMap(row => row.mutations).length;
  assert.equal(mutations, 36);
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line, subjects: results.length, mutation_rejections: mutations,
    source_member_accesses: inventory.accesses.length, compiler: compiler.version,
    new_frozen_use_closures: 0, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
