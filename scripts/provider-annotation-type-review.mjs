/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite public const-annotation type review; no provider execution or DI. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const declarations = ['Provider', 'Type', 'TypeProvider', 'ValueProvider', 'ClassProvider',
  'ConstructorProvider', 'ExistingProvider', 'FactoryProvider', 'ValueSansProvider',
  'ClassSansProvider', 'ConstructorSansProvider', 'ExistingSansProvider', 'FactorySansProvider'];
export const PROVIDER_ANNOTATION_USES = Object.freeze([
  {file: 'legacy-checkbox/internal/checkbox-required-validator.ts', constants: ['MAT_CHECKBOX_REQUIRED_VALIDATOR'], population: 'frozen'},
  {file: 'legacy-slide-toggle/internal/slide-toggle-required-validator.ts', constants: ['MAT_SLIDE_TOGGLE_REQUIRED_VALIDATOR'], population: 'frozen'},
  {file: 'internal/testing/owned-animation-modules.ts', constants: ['LEGACY_NOOP_ANIMATIONS', 'LEGACY_ENABLED_ANIMATIONS'], population: 'additional'},
].map(row => Object.freeze({...row, constants: Object.freeze(row.constants)})));

export function reviewProviderAnnotations({root = defaultRoot, readSource, subjectData} = {}) {
  const ts = createRequire(import.meta.url)('typescript');
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path));
  const parse = (path, text) => {
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(file.parseDiagnostics.length, 0, 'invalid declaration/source syntax');
    return file;
  };
  const subjects = subjectData || JSON.parse(read('compatibility/rc/provider-declaration-subjects.json'));
  assert.equal(subjects.schema_version, 1);
  assert.deepEqual(subjects.subjects.map(row => [row.line, row.version]),
    [['original', '16.2.12'], ['main', '22.1.7'], ['21.x', '21.2.23']]);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/core'], '^' + subjects.subjects.find(row => row.line === line).version);
  const printer = ts.createPrinter({removeComments: true});
  const shape = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file)
    .replace(/^(?:export\s+|declare\s+)+/, '').replace(/\s+/g, '');
  const models = subjects.subjects.map(subject => {
    const stored = read(subject.path);
    assert.equal(hash(stored), subject.sha256, 'declaration bytes changed');
    const raw = subject.path.endsWith('.gz') ? gunzipSync(stored) : stored;
    if (subject.raw_sha256) assert.equal(hash(raw), subject.raw_sha256, 'raw declaration bytes changed');
    assert.equal(Buffer.byteLength(raw), subject.bytes);
    const rootRaw = read(subject.root_path);
    assert.equal(hash(rootRaw), subject.root_sha256, 'public barrel bytes changed');
    const file = parse(subject.path, raw.toString()), barrel = parse(subject.root_path, rootRaw.toString());
    if (subject.line !== 'original') {
      for (const [publicName, localName] of [['Provider', 'Provider'], ['Type', 'Type$1']]) {
        const exports = barrel.statements.filter(ts.isExportDeclaration).flatMap(node =>
          node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.filter(e => e.name.text === publicName).map(e => ({node, e})) : []);
        assert.equal(exports.length, 1, 'ambiguous/missing public export');
        assert.equal(exports[0].node.moduleSpecifier, undefined);
        assert.equal((exports[0].e.propertyName || exports[0].e.name).text, localName, 'wrong public type alias');
        const imports = barrel.statements.filter(ts.isImportDeclaration).flatMap(node =>
          node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
            ? node.importClause.namedBindings.elements.filter(e => e.name.text === localName).map(e => ({node, e})) : []);
        assert.equal(imports.length, 1, 'ambiguous/missing declaration import');
        assert.equal(imports[0].node.moduleSpecifier.text, subject.export_route);
        assert.equal((imports[0].e.propertyName || imports[0].e.name).text, publicName);
        const terminal = file.statements.filter(ts.isExportDeclaration).flatMap(node =>
          node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.filter(e => e.name.text === publicName) : []);
        assert.equal(terminal.length, 1, 'declaration is not publicly reexported');
        assert.equal((terminal[0].propertyName || terminal[0].name).text, publicName);
      }
    }
    const nodes = new Map();
    for (const name of declarations) {
      const matches = file.statements.filter(node => (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name.text === name);
      assert.equal(matches.length, 1, 'missing/ambiguous Provider closure declaration: ' + name);
      const node = matches[0];
      assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'internal'].includes(tag.tagName.text)), 'private/deprecated declaration');
      if (subject.line === 'original') assert.ok(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword), 'original type is not public');
      const visit = value => {
        if (ts.isTypeReferenceNode(value)) assert.ok(['Function', 'T', ...declarations].includes(value.typeName.getText(file)), 'unreviewed type closure');
        ts.forEachChild(value, visit);
      };
      visit(node); nodes.set(name, node);
    }
    return {subject, file, nodes};
  });
  for (const model of models.slice(1)) for (const name of declarations)
    assert.equal(shape(model.nodes.get(name), model.file), shape(models[0].nodes.get(name), models[0].file), 'Provider closure shape changed: ' + name);
  const code = ['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;'];
  for (const [index, model] of models.entries()) code.push('declare namespace S' + index + '{' +
    [...model.nodes.values()].map(node => printer.printNode(ts.EmitHint.Unspecified, node, model.file)
      .replace(/^(?:export\s+|declare\s+)+/, '').replace(/^(interface|type) /, 'export $1 ')).join('\n') + '}');
  for (const index of [1, 2]) for (const name of declarations) {
    const id = index + name;
    code.push(`declare const a${id}:S0.${name}${name === 'Type' ? '<unknown>' : ''};const b${id}:S${index}.${name}${name === 'Type' ? '<unknown>' : ''}=a${id};`,
      `declare const c${id}:S${index}.${name}${name === 'Type' ? '<unknown>' : ''};const d${id}:S0.${name}${name === 'Type' ? '<unknown>' : ''}=c${id};`,
      `type e${id}=Assert<Equal<typeof a${id},typeof c${id}>>;`);
  }
  const fixture = resolve(root, '__provider_annotation_type_diagnostic__.ts');
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'], target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? code.join('\n') : hostRead(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, 0, 'Provider type assignments/equalities failed: ' + ts.formatDiagnostics(diagnostics,
    {getCanonicalFileName: p => p, getCurrentDirectory: () => root, getNewLine: () => '\n'}));
  const cases = PROVIDER_ANNOTATION_USES.map(use => {
    const path = 'projects/ngx-material-legacy/' + use.file, text = read(path).toString(), file = parse(path, text);
    const imports = file.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core')
      .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
        ? node.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'Provider').map(binding => ({node, binding})) : []);
    assert.equal(imports.length, 1, 'missing/ambiguous Provider import');
    const {node, binding} = imports[0], local = binding.name.text, found = [];
    const visit = value => {
      if (value === node) return;
      if (ts.isIdentifier(value) && value.text === local) {
        const type = value.parent, owner = type.parent;
        assert.ok(ts.isTypeReferenceNode(type) && type.typeName === value && !type.typeArguments?.length
          && ts.isVariableDeclaration(owner) && owner.type === type && ts.isIdentifier(owner.name)
          && ts.isVariableDeclarationList(owner.parent) && owner.parent.flags & ts.NodeFlags.Const
          && ts.isVariableStatement(owner.parent.parent) && owner.parent.parent.parent === file,
        'Provider reference is not a top-level const annotation');
        found.push(owner.name.text);
      }
      ts.forEachChild(value, visit);
    };
    visit(file); assert.deepEqual(found, use.constants, 'exact Provider const roster changed');
    const bindings = node.importClause.namedBindings, kept = bindings.elements.filter(e => e !== binding);
    const replacement = kept.length ? '{' + kept.map(e => e.getText(file)).join(', ') + '}' : '';
    const erased = kept.length ? text.slice(0, bindings.getStart(file)) + replacement + text.slice(bindings.end)
      : text.slice(0, node.getStart(file)) + text.slice(node.end);
    const emits = [false, true].map(metadata => {
      const emit = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: metadata}}).outputText;
      const before = emit(text), after = emit(erased);
      assert.equal(before, after, 'Provider import changes executable emit');
      return {emitDecoratorMetadata: metadata, emit_sha256: hash(before), without_Provider_import_sha256: hash(after)};
    });
    return {...use, module: '@angular/core', symbol: 'Provider', candidate_source_sha256: hash(text),
      import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1, emits};
  });
  return {schema_version: 1, line, node: process.version, compiler: ts.version,
    role: 'Complete authentic public Provider type closure and three const-annotation imports only; no provider runtime/DI/AOT/floor qualification',
    models: models.map(model => ({...model.subject, closure: Object.fromEntries([...model.nodes].map(([name, node]) => [name, shape(node, model.file)]))})),
    strict_assignments: 52, strict_equalities: 26, cases, actual_provider_DI_Angular_AOT_native_packed_or_floor_execution: false};
}
