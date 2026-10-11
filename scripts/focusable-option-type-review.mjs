/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite structural type closure and exact authored erasure, not native focus behavior. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleName = '@angular/cdk/a11y', symbolName = 'FocusableOption';
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim().replace(/^(?:(?:export|declare) )+/, '');
function publicExport(source, name, relative) {
  return source.statements.some(n => n.name?.text === name && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
    || source.statements.some(n => ts.isExportDeclaration(n) && n.moduleSpecifier?.text === relative && n.exportClause && ts.isNamedExports(n.exportClause) && n.exportClause.elements.some(e => e.name.text === name && (!e.propertyName || e.propertyName.text === name)));
}
function declaration(source, name) {
  const nodes = source.statements.filter(n => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text === name);
  assert.equal(nodes.length, 1, 'missing or ambiguous type declaration ' + name);
  for (const node of [nodes[0], ...(nodes[0].members ?? [])])
    assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)), 'unstable option type');
  return print(nodes[0], source);
}

export function loadFocusableOptionModels(root = rootDefault) {
  const focusPath = 'compatibility/rc/focus-origin-declaration-subjects.json', keyPath = 'compatibility/rc/tab-header-public-key-manager-subjects.json';
  const focusBytes = readFileSync(join(root, focusPath)), keyBytes = readFileSync(join(root, keyPath));
  assert.equal(hash(focusBytes), '0f0aeee44460041b4c2c89555bc2d7544c607f28627fda3614ab1df86b6f7ec5');
  assert.equal(hash(keyBytes), 'f9ddb7e762ebdc52dbdac079d3b66c2b3c99f7d60cd13066f8b126d25847a0d6');
  const focus = JSON.parse(focusBytes), keys = JSON.parse(keyBytes), models = [];
  for (const subject of focus.subjects) {
    const read = (path, digest, bytes) => {const raw = readFileSync(join(root, path)); assert.equal(hash(raw), digest); if (bytes !== undefined) assert.equal(raw.length, bytes); return parse(path, raw.toString());};
    const origin = read(subject.path, subject.sha256, subject.bytes), entry = read(subject.entry_path, subject.entry_sha256);
    const parts = subject.line === 'original' ? {FocusableOption: origin, ListKeyManagerOption: origin, FocusOrigin: origin} : Object.fromEntries(['FocusableOption', 'ListKeyManagerOption', 'FocusOrigin'].map(name => {
      if (name === 'FocusOrigin') return [name, origin];
      const key = keys.subjects.find(s => s.line === subject.line); assert.equal(key.version, subject.version); assert.equal(key.archive_sha256, subject.archive_sha256); assert.equal(key.integrity, subject.integrity);
      const member = key.members.find(m => m.member.endsWith(name === 'FocusableOption' ? '/_focus-key-manager-chunk.d.ts' : '/_list-key-manager-chunk.d.ts')); assert.ok(member);
      return [name, read(member.path, member.sha256, member.bytes)];
    }));
    for (const [name, relative] of [['FocusableOption', './_focus-key-manager-chunk.js'], ['ListKeyManagerOption', './_list-key-manager-chunk.js'], ['FocusOrigin', './_focus-monitor-chunk.js']])
      assert.ok(publicExport(entry, name, relative), 'missing public export ' + name);
    if (subject.line !== 'original') for (const [name, relative] of [['ListKeyManagerOption', './_list-key-manager-chunk.js'], ['FocusOrigin', './_focus-monitor-chunk.js']])
      assert.ok(parts.FocusableOption.statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === relative && n.importClause?.namedBindings?.elements?.some(e => (e.propertyName || e.name).text === name)), 'option declaration dependency is not the authenticated public closure');
    const declarations = Object.fromEntries(Object.entries(parts).map(([name, source]) => [name, declaration(source, name)]));
    models.push({line: subject.line, version: subject.version, archive_sha256: subject.archive_sha256, integrity: subject.integrity,
      public_entry: {path: subject.entry_path, sha256: subject.entry_sha256}, declaration_sources: [...new Map(Object.values(parts).map(s => [s.fileName, {path: s.fileName, sha256: hash(s.text)}])).values()], declarations});
  }
  assert.equal(models.length, 3); return models;
}

export function compileFocusableOptionClosure(models, root = rootDefault) {
  const original = models.find(m => m.line === 'original'); assert.ok(original);
  for (const model of models) assert.deepEqual(model.declarations, original.declarations, 'structural option declaration closure changed');
  const namespaces = models.map((model, index) => `namespace Subject${index}{${Object.values(model.declarations).map(text => 'export ' + text).join('\n')}}`);
  const chunks = ["type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;", ...namespaces];
  for (const [i] of models.entries()) {
    chunks.push(`const minimal${i}:Subject${i}.FocusableOption={focus(){}};
const complete${i}:Subject${i}.FocusableOption={disabled:false,getLabel(){return 'label';},focus(origin){}};
declare const option${i}:Subject${i}.FocusableOption;
const disabled${i}:boolean|undefined=option${i}.disabled;const label${i}:string|undefined=option${i}.getLabel?.();
const focusResult${i}:void=option${i}.focus();`);
    for (const origin of ["'touch'", "'mouse'", "'keyboard'", "'program'", 'null', 'undefined']) chunks.push(`option${i}.focus(${origin});`);
    chunks.push(`// @ts-expect-error Focus remains a required method.
const missingFocus${i}:Subject${i}.FocusableOption={};
// @ts-expect-error Disabled state remains optional boolean.
const badDisabled${i}:Subject${i}.FocusableOption={disabled:'false',focus(){}};
// @ts-expect-error Option labels remain strings.
const badLabel${i}:Subject${i}.FocusableOption={getLabel(){return 1;},focus(){}};
// @ts-expect-error Unknown origins remain invalid.
option${i}.focus('unknown');
// @ts-expect-error Numeric origins remain invalid.
option${i}.focus(1);
// @ts-expect-error Disabled state can be absent.
const lostDisabled${i}:boolean=option${i}.disabled;
// @ts-expect-error Optional label lookup can be absent.
const lostLabel${i}:string=option${i}.getLabel?.();`);
    if (i) for (const name of ['FocusableOption', 'ListKeyManagerOption', 'FocusOrigin']) chunks.push(`type same${i}_${name}=Assert<Equal<Subject0.${name},Subject${i}.${name}>>;
declare const old${i}_${name}:Subject0.${name};const forward${i}_${name}:Subject${i}.${name}=old${i}_${name};
declare const current${i}_${name}:Subject${i}.${name};const backward${i}_${name}:Subject0.${name}=current${i}_${name};`);
  }
  const code = chunks.join('\n'), entry = join(root, '__focusable_option_types__.ts');
  const options = {strict: true, skipLibCheck: false, noEmit: true, types: [], target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts']};
  const host = ts.createCompilerHost(options), fallback = host.readFile.bind(host); host.readFile = path => path === entry ? code : fallback(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([entry], options, host));
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => root, getNewLine: () => '\n'}));
  return {strict: true, skip_lib_check: false, subjects: 3, exact_structural_equalities: 6, assignment_directions: 12,
    valid_focus_argument_cases: 18, negative_controls: 21, fixture_sha256: hash(code), compiler: ts.version,
    scope: 'Complete exact FocusableOption/ListKeyManagerOption/FocusOrigin declaration bodies in isolated namespaces; no complete a11y module, owned component, AOT, packed or floor consumer compile'};
}

export function inspectFocusableOptionCallers({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === moduleName && r.symbol === symbolName); assert.equal(uses.length, 7);
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const config = ts.parseConfigFileTextToJson('tsconfig.lib.json', read('projects/ngx-material-legacy/tsconfig.lib.json')); assert.equal(config.error, undefined);
  const converted = ts.convertCompilerOptionsFromJson(config.config.compilerOptions, root); assert.equal(converted.errors.length, 0); assert.notEqual(converted.options.emitDecoratorMetadata, true);
  const options = {...converted.options, removeComments: true, sourceMap: false, declaration: false, declarationMap: false, inlineSources: false};
  const host = ts.createCompilerHost(options), fallback = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : fallback(path);
  const program = ts.createProgram(uses.map(r => join(authoredRoot, r.file)), options, host), checker = program.getTypeChecker(), cases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source); assert.equal(source.parseDiagnostics.length, 0);
    const matches = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName)
      .flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === symbolName).map(binding => ({node: n, binding})) : []);
    assert.equal(matches.length, 1, 'missing or ambiguous public FocusableOption import');
    const {node, binding} = matches[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    const visit = n => {
      if (ts.isIdentifier(n) && n !== binding.name && n !== binding.propertyName && checker.getSymbolAtLocation(n) === symbol) {
        const parent = n.parent; let role;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === n && !parent.typeArguments?.length) role = 'erased-type-reference';
        else if (ts.isExpressionWithTypeArguments(parent) && !parent.typeArguments?.length && ts.isHeritageClause(parent.parent) && parent.parent.token === ts.SyntaxKind.ImplementsKeyword && ts.isClassDeclaration(parent.parent.parent)) role = 'erased-implements';
        else assert.fail('runtime or unsupported option-interface use: ' + parent.getText(source));
        references.push({role, line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1, expression: parent.getText(source), owner: role === 'erased-implements' ? parent.parent.parent.name.text : null});
      }
      ts.forEachChild(n, visit);
    };
    visit(source); assert.equal(references.length, 1, 'exact caller option-interface reference changed');
    const bindings = node.importClause.namedBindings, kept = bindings.elements.filter(e => e !== binding);
    const start = kept.length ? bindings.getStart(source) : node.getStart(source), end = kept.length ? bindings.end : node.end;
    const replacement = kept.length ? '{' + kept.map(e => e.getText(source)).join(', ') + (bindings.elements.hasTrailingComma ? ',' : '') + '}' : '';
    const stripped = source.text.slice(0, start) + replacement + source.text.slice(end);
    const emit = text => {const r = ts.transpileModule(text, {compilerOptions: options, reportDiagnostics: true}); assert.equal(r.diagnostics.length, 0); return r.outputText;};
    const emitted = emit(source.text); assert.equal(emitted, emit(stripped), 'type import changes executable code');
    cases.push({...use, candidate_source_sha256: hash(source.text), local_name: binding.name.text, references, emitted_js_sha256: hash(emitted), emitted_js_without_import_sha256: hash(emit(stripped))});
  }
  assert.equal(cases.filter(r => r.references[0].role === 'erased-implements').length, 6);
  return {cases, compiler_emit_options: {target: options.target, module: options.module, experimental_decorators: options.experimentalDecorators, import_helpers: options.importHelpers, emit_decorator_metadata: options.emitDecoratorMetadata ?? false}};
}

export function reviewFocusableOptionTypes({root = rootDefault} = {}) {
  const models = loadFocusableOptionModels(root), callers = inspectFocusableOptionCallers({root}), manifest = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + models.find(m => m.line === line).version);
  return {schema_version: 1, line, role: 'Seven exact erased FocusableOption caller imports and their complete finite declaration closure', models, ...callers,
    type_compilation: compileFocusableOptionClosure(models, root), node: process.version, compiler: ts.version,
    limits: ['Isolated structural declaration and TypeScript executable-erasure proof only; full component declarations/templates/native focus, key-manager/monitor behavior and lifecycle, complete packed/floor consumer and upstream SHA obligations remain open.'], g11_claim: 'not-passed'};
}
