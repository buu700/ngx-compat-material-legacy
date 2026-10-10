/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable implementation provenance; never execute a private upstream symbol. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepareMaterialPublicSubjects, resolveMaterialPublicDeclaration} from '../scripts/material-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), hash = b => createHash('sha256').update(b).digest('hex');
const loaded = prepareMaterialPublicSubjects(), subjects = [];
try {
  for (const model of loaded.models) {
    const candidates = [...model.sources].filter(([p, text]) => p.startsWith('@angular/cdk/')
      && p.endsWith('.mjs') && text.includes('function _getEventTarget(event)'));
    assert.equal(candidates.length, 1);
    const [helperPath, helperText] = candidates[0];
    const helperFile = ts.createSourceFile(helperPath, helperText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const helper = helperFile.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === '_getEventTarget');
    assert.ok(helper);
    let catches = 0;
    const count = node => {if (ts.isTryStatement(node) && node.catchClause) catches++; ts.forEachChild(node, count);};
    count(helper); assert.equal(catches, model.line === 'main' ? 1 : 0);
    const entries = [...model.sources].filter(([p, text]) => p.startsWith('@angular/material/')
      && p.endsWith('.mjs') && text.includes('class RippleEventManager'));
    assert.equal(entries.length, 1);
    const [path, text] = entries[0], file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const classes = Object.fromEntries(['MatRipple', 'RippleRenderer', 'RippleEventManager'].map(name => {
      const node = file.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name);
      assert.ok(node, name); return [name, node];
    }));
    const delegates = [];
    const find = node => {
      if (ts.isPropertyDeclaration(node) && node.name.getText(file) === '_delegateEventHandler') delegates.push(node.initializer);
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts.SyntaxKind.ThisKeyword
        && node.left.name.text === '_delegateEventHandler') delegates.push(node.right);
      ts.forEachChild(node, find);
    };
    find(classes.RippleEventManager); assert.equal(delegates.length, 1);
    const calls = [];
    const visit = node => {if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === '_getEventTarget') calls.push(node); ts.forEachChild(node, visit);};
    visit(delegates[0]); assert.equal(calls.length, 1);
    const imports = file.statements.filter(ts.isImportDeclaration).flatMap(n =>
      n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)
        ? n.importClause.namedBindings.elements.filter(e => e.name.text === '_getEventTarget').map(e => ({node: n, binding: e})) : []);
    assert.equal(imports.length, 1); assert.equal(imports[0].node.moduleSpecifier.text, '@angular/cdk/platform');
    const declaration = resolveMaterialPublicDeclaration(model, 'MatRipple');
    assert.ok(!ts.getJSDocTags(declaration.node).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)));
    subjects.push({line: model.line, cdk_version: model.packages.get('@angular/cdk').version,
      material_version: model.packages.get('@angular/material').version, public_route: '@angular/material/core',
      declaration_chain: declaration.chain,
      helper: {path: helperPath, sha256: hash(helperText), complete_function: helper.getText(helperFile), catch_blocks: catches},
      callers: {path, sha256: hash(text), private_helper_import: imports[0].node.getText(file),
        complete_public_ripple: classes.MatRipple.getText(file), complete_renderer: classes.RippleRenderer.getText(file),
        complete_event_manager: classes.RippleEventManager.getText(file)},
      private_symbols_invoked: false, runtime_or_native_behavior_qualified: false});
  }
  const report = {schema_version: 1, role: 'Source-only public ripple event-target floor provenance',
    namespace_capsule_sha256: loaded.capsule_hash, producer_sha256: hash(readFileSync(new URL(import.meta.url))), subjects,
    scope: 'Whole authenticated original16 and exact22.1.7/21.2.14 public namespaces. Complete helper and caller source inspected; main contains the error guard and21 does not. Manual public launch is separate from document-capture delegation. No private runtime invocation, Angular/native replay, packed artifact, installed floor matrix or G11 qualification.'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({subjects: subjects.length, helper_guard: {main: true, '21.x': false},
    public_native_delegation_source_identified: true, private_runtime_or_native_qualified: false}));
} finally {loaded.dispose();}
