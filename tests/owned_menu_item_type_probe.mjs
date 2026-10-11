/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareOwnedMenuItemTypeSubjects} from './owned_menu_item_type_subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const loaded = prepareOwnedMenuItemTypeSubjects(root), results = [], hash = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  for (const model of loaded.models) {
    const fixture = `import {ElementRef,ChangeDetectorRef} from '@angular/core';
import {FocusMonitor} from '@angular/cdk/a11y';
import {MatMenuItem} from '@angular/material/menu';
import {MatLegacyMenuItem} from '${join(root, 'projects/ngx-material-legacy/legacy-menu/menu-item.ts').replace(/\.ts$/, '')}';
declare const element:HTMLElement, document:any, monitor:FocusMonitor, detector:ChangeDetectorRef;
const minimal = new MatLegacyMenuItem(new ElementRef(element));
const complete = new MatLegacyMenuItem(new ElementRef(element),document,monitor,undefined,detector);
minimal.focus('keyboard',{preventScroll:true}); complete.ngOnDestroy();
const role:'menuitem'|'menuitemcheckbox'|'menuitemradio'=minimal.role;
// @ts-expect-error The historical first constructor argument remains required.
new MatLegacyMenuItem();
// @ts-expect-error The historical host remains an HTMLElement ElementRef.
new MatLegacyMenuItem(new ElementRef('invalid host'));
// @ts-expect-error The approved historical implementation does not extend the current nominal parent.
const currentParent:MatMenuItem=minimal;
`;
    const path = join(model.root, 'owned-menu-item-type-fixture.ts'); writeFileSync(path, fixture);
    const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, experimentalDecorators: true,
      skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
    const host = ts.createCompilerHost(options);
    host.resolveModuleNames = (names, from) => names.map(name => ts.resolveModuleName(name,
      name.startsWith('.') || name.startsWith('/') ? from : join(model.root, 'source.ts'), options, host).resolvedModule);
    const program = ts.createProgram([path], options, host), diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p,
      getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    results.push({line: model.line, fixture_sha256: hash(fixture), negative_checks: 3,
      owned_sources: program.getSourceFiles().filter(f => f.fileName.startsWith(join(root, 'projects/')))
        .map(f => ({path: f.fileName.slice(root.length + 1), sha256: hash(readFileSync(f.fileName))}))});
  }
  const report = {schema_version: 1, compiler: ts.version, results, namespace_capsule_sha256: loaded.capsule_hash,
    scope: 'Actual owned source and full authenticated minimum declarations, original one/five-argument overloads and approved nominal-parent difference. Borrowed host compiler/RxJS; no ngc/AOT/native/packed or advertised compiler-floor qualification.'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({strict_minimum_subjects: results.length, negative_checks: 6, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
