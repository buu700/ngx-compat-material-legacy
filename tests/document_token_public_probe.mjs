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
import {reviewDocumentTokenUses} from '../scripts/document-token-use-review.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript'), hash = text => createHash('sha256').update(text).digest('hex');
const review = reviewDocumentTokenUses({root});
const path = 'projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.ts', source = readFileSync(join(root, path), 'utf8');
const snackPath = 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts', snack = readFileSync(join(root, snackPath), 'utf8');
const negatives = [
  [path, source.replace("import {DOCUMENT} from '@angular/common';", "import {DOCUMENT} from '@angular/common/private';")],
  [path, source.replace('import {DOCUMENT}', 'import type {DOCUMENT}')],
  [path, source.replace('@Optional() @Inject(DOCUMENT)', '@Inject(DOCUMENT)')],
  [path, source.replace('@Optional() @Inject(DOCUMENT)', '@Optional() @Inject(new InjectionToken("DocumentToken"))')],
  [path, source.replace('@Optional() @Inject(DOCUMENT) private _document: any,', 'private _document: any,\n    @Optional() @Inject(DOCUMENT) misplaced: any,')],
  [path, source + '\nfunction shadow(DOCUMENT: any) {return DOCUMENT;}\n'],
  [path, source + '\nconst unexpected = DOCUMENT;\n'],
  [path, source.replace('  Inject,', '  Inject as UnusedInject,') + '\nfunction Inject(_: any): any {return () => {}; }\n'],
  [snackPath, snack.replace('inject(DOCUMENT)', 'inject(DOCUMENT, {optional: true})')],
  [snackPath, snack.replace('inject(DOCUMENT)', 'DOCUMENT')],
];
const corePath = 'projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts';
const coreSource = readFileSync(join(root, corePath), 'utf8');
negatives.push(
  [corePath, coreSource.replace("import {DOCUMENT} from '@angular/core';", "import type {DOCUMENT} from '@angular/core';")],
  [corePath, coreSource.replace('@Inject(DOCUMENT) private _document?', '@Optional() @Inject(DOCUMENT) private _document?')],
  [corePath, coreSource + "\nimport {DOCUMENT as DuplicateDocument} from '@angular/core';\n"],
  [corePath, coreSource + '\nconst unexpectedCoreToken = DOCUMENT;\n'],
);
for (const [changed, text] of negatives) {
  assert.notEqual(text, readFileSync(join(root, changed), 'utf8'));
  assert.throws(() => reviewDocumentTokenUses({root, readSource: p => p === changed ? text : readFileSync(join(root, p), 'utf8')}));
}
const progressPath = 'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-location.ts';
const progressSource = readFileSync(join(root, progressPath), 'utf8'), progressAst = ts.createSourceFile(progressPath, progressSource, ts.ScriptTarget.Latest, true);
const functions = progressAst.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MAT_PROGRESS_BAR_LOCATION_FACTORY');
assert.equal(functions.length, 1);
const selected = functions[0].getText(progressAst).replace(/^export\s+/, '');
const emitted = ts.transpileModule(selected, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: true}, reportDiagnostics: true});
assert.equal(emitted.diagnostics.length, 0);
const loaded = prepareMaterialPublicSubjects(root), declarations = [], results = [], controls = [];
const worker = readFileSync(join(root, 'tests/document_token_public_subject.mjs'), 'utf8');
try {
  for (const model of loaded.models) {
    const common = model.packages.get('@angular/common'), core = model.packages.get('@angular/core');
    const commonKey = '@angular/common/' + common.exports['.'].types.slice(2), commonText = model.sources.get(commonKey);
    const commonAst = ts.createSourceFile(commonKey, commonText, ts.ScriptTarget.Latest, true);
    let targetKey = commonKey;
    if (model.line !== 'original') {
      const links = commonAst.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'DOCUMENT').map(e => ({node: n, binding: e})));
      assert.equal(links.length, 1); assert.equal(links[0].node.moduleSpecifier.text, '@angular/core');
      assert.equal((links[0].binding.propertyName || links[0].binding.name).text, 'DOCUMENT');
      targetKey = '@angular/core/' + core.exports['.'].types.slice(2);
    }
    const text = model.sources.get(targetKey), ast = ts.createSourceFile(targetKey, text, ts.ScriptTarget.Latest, true);
    const matches = ast.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations)
      .filter(n => ts.isIdentifier(n.name) && n.name.text === 'DOCUMENT');
    assert.equal(matches.length, 1);
    const declaration = matches[0];
    assert.equal(declaration.type.getText(ast), 'InjectionToken<Document>');
    assert.ok(declaration.parent.parent.getFullText(ast).includes('@publicApi'));
    assert.ok(!ts.getJSDocTags(declaration.parent.parent).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
    if (model.line === 'original') assert.ok(declaration.parent.parent.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
    else assert.equal(ast.statements.filter(n => ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause))
      .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'DOCUMENT' && (e.propertyName || e.name).text === 'DOCUMENT')).length, 1);
    declarations.push({line: model.line, common_version: common.version, core_version: core.version,
      common_entry: {path: commonKey, sha256: hash(commonText)}, target: {path: targetKey, sha256: hash(text)},
      declaration: declaration.parent.parent.getFullText(ast).trim(), current_common_is_exact_core_reexport: model.line !== 'original'});
    writeFileSync(join(model.root, 'document-token-payload.json'), JSON.stringify({cases: review.cases, progress_factory: emitted.outputText}));
    const file = join(model.root, 'document-token-public-subject.mjs'); writeFileSync(file, worker);
    for (const production of [false, true]) {
      const stdout = execFileSync(process.execPath, [file, model.line, String(production)], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: model.borrowed});
    }
    const variants = ['clone-token', 'drop-optional', 'clone-progress-token', 'static-progress-path', 'drop-progress-search'];
    if (model.line !== 'original') variants.push('clone-core-token');
    for (const variant of variants) {
      const result = spawnSync(process.execPath, [file, model.line, 'false', variant], {cwd: model.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, variant + ' escaped');
      assert.match(result.stderr, /AssertionError/, variant + ' did not reach the contract assertion');
      controls.push({line: model.line, variant, assertion_rejected: true, kind: variant.includes('progress') ? 'whole-owned-function-or-binding' : 'token-or-provider-boundary'});
    }
  }
  const report = {schema_version: 1, role: 'Finite public document token boundary diagnostic', line: review.line,
    node: process.version, compiler: ts.version, source_review: review, source_negative_controls: negatives.length,
    public_namespace_capsule_sha256: loaded.capsule_hash, declarations, results, controls,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker),
    owned_progress_factory: {path: progressPath, source_sha256: hash(progressSource), selected_function_sha256: hash(selected),
      only_export_modifier_removed: true, emitted_function_sha256: hash(emitted.outputText)},
    scope: 'Whole SRI-authenticated original16 and both peer-minimum Core/Common modules.10 frozen plus6 current-added bindings inspected. Original16 executes its12 Common-route expressions; both actual minima execute all16 Common/Core-route expressions through genuine Core DI. Core DOCUMENT is absent in the original namespace and the four current-only routes are explicitly excluded there, with no original qualification claim. Whole owned progress-location function executes against location protocols. Metadata targets and documents are protocols. No actual complete owned components/application factories/native DOM/SSR renderer/packed AOT/full Node-RxJS floors or G11 qualification.', g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({frozen_uses: review.frozen_uses, current_uses: review.current_uses, delta_uses: review.delta_uses,
    subjects: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0), source_negative_controls: negatives.length,
    contract_negative_controls: controls.length, actual_legacy_components_executed: false, native_or_packed_qualified: false}));
} finally {loaded.dispose();}
