/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine complete dialog SDKs and the selected line's actual current source graph. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {dialogCallerSource, DIALOG_CALLER_PRIOR} from '../scripts/dialog-caller-contracts.mjs';
import {prepareDialogCallerPublicSubjects, DIALOG_CALLER_SUBJECTS} from '../scripts/dialog-caller-public-subjects.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const source = dialogCallerSource({root}), loaded = prepareDialogCallerPublicSubjects(root);
const discovering = process.argv[3] === '--discover';
const unstable = new Set(['docs-private', 'deprecated', 'breaking-change', 'experimental', 'developerPreview']);
const subjects = [];
const pairs = [...new Map(source.facts.map(fact => [fact.module + ':' + fact.symbol,
  {module: fact.module, name: fact.symbol}])).values()];
const modules = [...new Set(pairs.map(pair => pair.module))];
const tagsOf = (checker, symbol) => symbol.getJsDocTags(checker).map(tag => tag.name);
function resolved(checker, symbol) {
  const seen = new Set();
  while (symbol.flags & ts.SymbolFlags.Alias) {
    assert.equal(seen.has(symbol), false, 'dialog declaration cycle');
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

try {
  for (const model of loaded.models) {
    const fixture = join(model.root, 'public-dialog.ts');
    writeFileSync(fixture, modules.map((module, index) => `import * as entry${index} from '${module}';`).join('\n') + '\n');
    const roots = [fixture], current = model.line === source.prior.line;
    if (current) for (const [path, text] of source.sources) {
      const target = join(model.root, path);
      mkdirSync(dirname(target), {recursive: true});
      writeFileSync(target, text);
      roots.push(target);
    }
    const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true,
      strict: true, strictPropertyInitialization: false, noImplicitOverride: true,
      skipLibCheck: false, noEmit: true, types: [],
      paths: current ? Object.fromEntries([...source.routes].map(([specifier, path]) =>
        [specifier, [join(model.root, path)]])) : {}};
    const program = ts.createProgram(roots, options), diagnostics = ts.getPreEmitDiagnostics(program);
    if (!discovering) assert.equal(diagnostics.length, 0,
      ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path,
        getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
    const checker = program.getTypeChecker(), sf = program.getSourceFile(fixture);
    const exported = new Map(sf.statements.filter(ts.isImportDeclaration).map(statement =>
      [statement.moduleSpecifier.text, new Map(checker.getExportsOfModule(
        checker.getSymbolAtLocation(statement.moduleSpecifier)).map(symbol =>
        [symbol.name, resolved(checker, symbol)]))]));
    const symbols = [], selected = new Set(), unstableUses = [], bindings = [];
    for (const pair of pairs) {
      const actual = source.facts.some(fact => fact.current_peer_use && fact.module === pair.module && fact.symbol === pair.name);
      const symbol = exported.get(pair.module).get(pair.name);
      if (!symbol) {
        assert.ok(model.line !== 'original' || (pair.module === '@angular/cdk/dialog' && pair.name === 'DialogContainer'), 'unexpected missing tagged public export ' + pair.module + ':' + pair.name);
        if (actual && model.line !== 'original') unstableUses.push({...pair, reason: 'missing-current-export'});
        symbols.push({...pair, actually_consumed_current_peer: actual, missing: true});
        continue;
      }
      if (actual) selected.add(symbol);
      const tags = tagsOf(checker, symbol);
      if (actual && model.line !== 'original' && tags.some(tag => unstable.has(tag))) {
        unstableUses.push({...pair, reason: 'unstable-current-symbol', tags});
      }
      symbols.push({...pair, actually_consumed_current_peer: actual, missing: false, tags,
        declarations: symbol.getDeclarations().map(declaration => ({
          file: declaration.getSourceFile().fileName.slice(model.root.length + 1),
          sha256: hash(declaration.getText(declaration.getSourceFile()))})),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.getDeclarations()[0]))});
    }
    const members = [], calls = [], casts = [];
    if (current) {
      for (const fact of source.facts) {
        const path = 'projects/ngx-material-legacy/' + fact.file;
        const sf = program.getSourceFile(join(model.root, path));
        const matches = [];
        function binding(node) {
          if ((ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) &&
            node.name.text === fact.binding.local_name && (node.propertyName ?? node.name).text === fact.symbol) {
            matches.push(node);
          }
          if (fact.owned_original_container_replacement && ts.isClassDeclaration(node) &&
            node.name?.text === fact.binding.local_name) matches.push(node);
          ts.forEachChild(node, binding);
        }
        binding(sf);
        assert.equal(matches.length, 1, 'ambiguous semantic dialog binding ' + fact.file + ':' + fact.symbol);
        const symbol = resolved(checker, checker.getSymbolAtLocation(matches[0].name));
        if (fact.current_peer_use) {
          assert.equal(symbol, exported.get(fact.module).get(fact.symbol), 'wrong actual peer binding identity');
        } else {
          assert.ok(symbol.getDeclarations().every(declaration => source.sources.has(
            declaration.getSourceFile().fileName.slice(model.root.length + 1))), 'owned replacement resolves outside owned graph');
        }
        bindings.push({file: fact.file, module: fact.module, name: fact.symbol,
          current_peer_use: fact.current_peer_use, current_module: fact.binding.module,
          declarations: symbol.getDeclarations().map(declaration => ({
            file: declaration.getSourceFile().fileName.slice(model.root.length + 1),
            sha256: hash(declaration.getText(declaration.getSourceFile()))}))});
      }
      for (const path of source.sources.keys()) {
        const sf = program.getSourceFile(join(model.root, path));
        const targetType = type => selected.has(checker.getNonNullableType(type).getSymbol());
        function inspect(node) {
          if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
            [ts.SyntaxKind.AnyKeyword, ts.SyntaxKind.UnknownKeyword].includes(node.type.kind) &&
            targetType(checker.getTypeAtLocation(node.expression))) {
            casts.push({file: path, expression: node.getText(sf)});
          }
          if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
            const location = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression;
            const symbol = checker.getSymbolAtLocation(location);
            for (const declaration of symbol?.getDeclarations() ?? []) {
              const owner = declaration.parent;
              if (!(ts.isClassDeclaration(owner) || ts.isInterfaceDeclaration(owner)) || !owner.name ||
                !selected.has(checker.getSymbolAtLocation(owner.name))) continue;
              const tags = tagsOf(checker, symbol), hidden = !!declaration.modifiers?.some(modifier =>
                [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(modifier.kind));
              const member = {file: path, expression: node.getText(sf), owner: owner.name.text,
                member: symbol.name, tags, hidden,
                declaration: {file: declaration.getSourceFile().fileName.slice(model.root.length + 1),
                  sha256: hash(declaration.getText(declaration.getSourceFile()))}};
              members.push(member);
              if (hidden || tags.some(tag => unstable.has(tag))) unstableUses.push({...member, reason: 'unstable-or-hidden-current-member'});
            }
          }
          if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const signature = checker.getResolvedSignature(node), declaration = signature?.getDeclaration();
            const owner = declaration?.parent;
            if (owner && (ts.isClassDeclaration(owner) || ts.isInterfaceDeclaration(owner)) && owner.name &&
              selected.has(checker.getSymbolAtLocation(owner.name))) {
              const tags = signature.getJsDocTags().map(tag => tag.name);
              calls.push({file: path, expression: node.getText(sf), owner: owner.name.text,
                member: declaration.name?.getText(declaration.getSourceFile()) ?? 'constructor', tags,
                signature: checker.signatureToString(signature),
                declaration_sha256: hash(declaration.getText(declaration.getSourceFile()))});
              if (tags.some(tag => unstable.has(tag))) unstableUses.push({file: path,
                expression: node.getText(sf), reason: 'unstable-current-signature', tags});
            }
          }
          ts.forEachChild(node, inspect);
        }
        inspect(sf);
      }
    }
    const negative = join(model.root, 'invalid-dialog.ts');
    writeFileSync(negative, `
import {DialogConfig,DialogRef} from '@angular/cdk/dialog';
import {MatDialogConfig,DialogPosition,MatDialogState} from '@angular/material/dialog';
new MatDialogConfig().disableClose='bad';
new MatDialogConfig().autoFocus=7;
new MatDialogConfig().maxWidth=false;
const position:DialogPosition={top:23};
const state:MatDialogState='closed';
new DialogConfig().restoreFocus=23;
declare const ref:DialogRef;
ref.close(undefined,{focusOrigin:'bad'});
`);
    const invalid = ts.getPreEmitDiagnostics(ts.createProgram([negative], options));
    assert.equal(invalid.length, 7, JSON.stringify({line: model.line, diagnostics: invalid.map(diagnostic =>
      ({file: diagnostic.file?.fileName, code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}))}));
    assert.ok(invalid.every(diagnostic => diagnostic.file?.fileName === negative &&
      [2322, 2345, 2769].includes(diagnostic.code)));
    if (!discovering && model.line !== 'original') assert.deepEqual(unstableUses, [], 'unstable current dialog APIs');
    if (!discovering && current) {
      assert.equal(bindings.length, 18);
      assert.equal(bindings.filter(binding => !binding.current_peer_use).length, 1);
      assert.ok(members.length > 0);
      assert.deepEqual(casts, [], 'selected dialog APIs cast to any/unknown');
    }
    subjects.push({line: model.line, Core: model.packages.get('@angular/core').version,
      Material: model.packages.get('@angular/material').version, strict: true,
      strictPropertyInitialization: false, noImplicitOverride: true, skipLibCheck: false,
      diagnostics: diagnostics.map(diagnostic => ({file: diagnostic.file?.fileName.slice(model.root.length + 1),
        code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')})),
      current_source_files: current ? source.sources.size : 0, symbols,
      actual_bindings: bindings, actual_consumed_members: members, actual_resolved_calls: calls,
      selected_any_unknown_casts: casts, unstable_current_uses: unstableUses,
      invalid_type_controls: 7, SDK_rewrites: false});
  }
  const paths = new Set(['scripts/dialog-caller-contracts.mjs',
    'scripts/dialog-caller-public-subjects.mjs', 'scripts/component-config-caller-public-subjects.mjs', 'tests/dialog_caller_type_probe.mjs',
    DIALOG_CALLER_PRIOR, DIALOG_CALLER_SUBJECTS, 'compatibility/rc/api/export-name-allowlist.json',
    ...source.sources.keys(), ...source.prior.metadata.map(member => member.path)]);
  for (const capsule of ['material-public-subjects', 'element-ref-public-subjects',
    'cdk-module-type-public-subjects', 'overlay-caller-public-subjects', 'overlay-caller-contract-sdk',
    'tabs-caller-public-subjects', 'component-config-caller-public-subjects', 'dialog-caller-public-subjects']) {
    const path = 'compatibility/rc/' + capsule + '.json', body = JSON.parse(read(path));
    paths.add(path);
    for (const subject of body.subjects) for (const member of subject.members ?? subject.additions ?? []) paths.add(member.path);
    if (body.tagged_original_mixin) paths.add(body.tagged_original_mixin.path);
  }
  for (const name of ['material-public-subjects', 'cdk-module-type-public-subjects',
    'overlay-caller-public-subjects', 'overlay-caller-contracts', 'tabs-caller-public-subjects']) paths.add('scripts/' + name + '.mjs');
  const report = {schema_version: 1, line: source.prior.line, discovering,
    typescript: ts.version, node: process.version, source_parent: source.prior.source_parent,
    subjects, source_files: source.sources.size, metadata: source.prior.metadata,
    inputs: [...paths].sort().map(path => ({path, sha256: hash(read(path))})), source_closures: 0,
    scope: 'Genuine tagged/minimum SDK declarations and the selected line\'s raw complete current source graph. Discovery reports are never qualification passes. No service/default/token/owned caller runtime,generated templates/queries,native behavior,packed/AOT,consumer/toolchain/peer/RxJS floors or G01-G13 pass.',
    actual_runtime_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
  assert.ok(process.argv[2]);
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, discovering, source_files: report.source_files,
    subjects: subjects.map(subject => ({line: subject.line, diagnostics: subject.diagnostics.length,
      symbols: subject.symbols.length, bindings: subject.actual_bindings.length,
      members: subject.actual_consumed_members.length, calls: subject.actual_resolved_calls.length,
      unstable: subject.unstable_current_uses.length, casts: subject.selected_any_unknown_casts.length})),
    invalid_controls: 21, source_closures: 0}));
} finally {loaded.dispose();}
