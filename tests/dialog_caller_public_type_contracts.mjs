/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Explicit enum/type erasure and the public optional container hooks used by the owned bridge. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const unstable = new Set(['docs-private', 'deprecated', 'breaking-change', 'experimental', 'developerPreview']);

export function dialogPublicTypeContracts(model) {
  const current = model.line !== 'original', fixture = join(model.root, 'dialog-public-types.ts');
  const text = `
import {AutoFocusTarget, DialogPosition, MatDialogState} from '@angular/material/dialog';
import * as cdk from '@angular/cdk/dialog';
export const states: [0,1,2] = [MatDialogState.OPEN, MatDialogState.CLOSING, MatDialogState.CLOSED];
const focus: AutoFocusTarget = 'first-heading';
const position: DialogPosition = {top:'1px',left:'2vw',right:'3em',bottom:'4px'};
${current ? `
import {Observable} from 'rxjs';
import {FocusOrigin} from '@angular/cdk/a11y';
declare let container: cdk.DialogContainer;
const focusEvents: Observable<void> | undefined = container._focusTrapped;
const origin: FocusOrigin | undefined = container._closeInteractionType;
container._recaptureFocus?.();
` : ''}`;
  writeFileSync(fixture, text);
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false,
    noEmitOnError: true, types: []};
  const program = ts.createProgram([fixture], options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics,
    {getCanonicalFileName: path => path, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const checker = program.getTypeChecker(), source = program.getSourceFile(fixture);
  const resolve = symbol => {
    const seen = new Set();
    while (symbol.flags & ts.SymbolFlags.Alias) {assert.equal(seen.has(symbol), false); seen.add(symbol); symbol = checker.getAliasedSymbol(symbol);}
    return symbol;
  };
  const exported = new Map(source.statements.filter(ts.isImportDeclaration).filter(statement =>
    ['@angular/material/dialog', '@angular/cdk/dialog'].includes(statement.moduleSpecifier.text)).map(statement => [
      statement.moduleSpecifier.text, new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(statement.moduleSpecifier))
        .map(symbol => [symbol.name, resolve(symbol)])),
    ]));
  const describe = symbol => {
    const tags = symbol.getJsDocTags(checker).map(tag => tag.name);
    assert.ok(tags.every(tag => !unstable.has(tag)), 'unstable public container/type member ' + symbol.name);
    return {name: symbol.name, tags, declarations: symbol.getDeclarations().map(declaration => ({
      file: declaration.getSourceFile().fileName.slice(model.root.length + 1), sha256: hash(declaration.getText(declaration.getSourceFile()))}))};
  };
  const material = exported.get('@angular/material/dialog'), cdk = exported.get('@angular/cdk/dialog');
  const symbols = ['AutoFocusTarget', 'DialogPosition', 'MatDialogState'].map(name => describe(material.get(name)));
  const state = material.get('MatDialogState'), enumeration = state.getDeclarations().find(ts.isEnumDeclaration);
  assert.ok(enumeration);
  const constEnum = !!enumeration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ConstKeyword);
  assert.equal(constEnum, !current);
  const hooks = [];
  if (current) {
    const container = cdk.get('DialogContainer'); assert.ok(container); symbols.push(describe(container));
    const type = checker.getDeclaredTypeOfSymbol(container);
    for (const name of ['_focusTrapped', '_closeInteractionType', '_recaptureFocus']) {
      const member = type.getProperty(name); assert.ok(member);
      hooks.push({...describe(member), optional: !!(member.flags & ts.SymbolFlags.Optional)});
      assert.equal(hooks.at(-1).optional, true);
    }
  } else assert.equal(cdk.has('DialogContainer'), false);
  const outputs = new Map(); const emitted = program.emit(undefined, (path, value) => outputs.set(path, value));
  assert.equal(emitted.emitSkipped, false); assert.equal(emitted.diagnostics.length, 0);
  const js = outputs.get(fixture.replace(/\.ts$/, '.js')); assert.ok(js);
  const emittedSource = ts.createSourceFile('emitted.js', js, ts.ScriptTarget.Latest, true);
  const imports = emittedSource.statements.filter(ts.isImportDeclaration).flatMap(statement =>
    statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)
      ? statement.importClause.namedBindings.elements.map(specifier => (specifier.propertyName ?? specifier.name).text) : []);
  assert.equal(imports.includes('AutoFocusTarget'), false); assert.equal(imports.includes('DialogPosition'), false);
  assert.equal(imports.includes('MatDialogState'), current);
  const negative = join(model.root, 'invalid-dialog-public-types.ts');
  writeFileSync(negative, `
import {AutoFocusTarget, DialogPosition, MatDialogState} from '@angular/material/dialog';
const focus:AutoFocusTarget=17;
const position:DialogPosition={left:23};
const state:MatDialogState='OPEN';
${current ? `
import {DialogContainer} from '@angular/cdk/dialog';
declare let container:DialogContainer;
container._focusTrapped=17;
container._closeInteractionType='invalid';
container._recaptureFocus=17;
` : ''}`);
  const invalid = ts.getPreEmitDiagnostics(ts.createProgram([negative], {...options, noEmit: true}));
  assert.equal(invalid.length, current ? 6 : 3);
  assert.ok(invalid.every(diagnostic => diagnostic.file?.fileName === negative && diagnostic.code === 2322));
  return {line: model.line, typescript: ts.version, strict: true, skipLibCheck: false, diagnostics: 0,
    enum_constants_typed_as_0_1_2: true, original_const_enum_erasure: constEnum,
    runtime_enum_import_emitted: imports.includes('MatDialogState'), type_only_focus_and_position_imports_erased: true,
    public_symbols: symbols, optional_container_hooks: hooks, invalid_type_controls: invalid.length,
    current_owned_sources_compiled: 0, SDK_source_rewrites: false,
    full_compiler_or_peer_floor_qualified: false};
}
