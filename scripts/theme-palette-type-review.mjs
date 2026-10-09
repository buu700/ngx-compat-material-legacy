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
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');

/** Exact historical/public palette labels; actual color and Sass behavior is separate. */
export function reviewThemePaletteTypes({root = defaultRoot, readSource, subjectData, compilerRoot} = {}) {
  const require = createRequire(import.meta.url);
  const compilerPath = compilerRoot ? resolve(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const ts = require(compilerPath), read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seed = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(sha(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const subjects = subjectData || JSON.parse(read('compatibility/rc/theme-palette-type-declaration-subjects.json'));
  assert.equal(subjects.subjects.length, 3);
  assert.deepEqual(subjects.subjects.map(s => s.line), ['original', 'main', '21.x']);
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({removeComments: true});
  const models = subjects.subjects.map(subject => {
    assert.equal(subject.module, '@angular/material/core'); assert.equal(subject.package, '@angular/material');
    assert.equal(subject.archive_sri_verified, true);
    if (subject.line === line) assert.equal(manifest.peerDependencies[subject.package], '^' + subject.version);
    if (subject.line === line || subject.line === 'original') assert.equal(sha(read(subject.lock_path)), subject.lock_sha256, 'palette subject lock changed');
    const text = {};
    for (const name of ['package_manifest', 'entry', 'source']) {
      const data = read(subject[name].path);
      assert.equal(sha(data), subject[name].sha256, 'palette declaration subject changed');
      assert.equal(Buffer.byteLength(data), subject[name].bytes);
      text[name] = data;
    }
    const pkg = JSON.parse(text.package_manifest);
    assert.equal(pkg.name, subject.package); assert.equal(pkg.version, subject.version);
    assert.equal(pkg.exports['./core'].types, './' + subject.entry.archive_member.slice('package/'.length), 'public palette package entry changed');
    const file = parse(subject.source.path, text.source), entry = parse(subject.entry.path, text.entry);
    assert.equal(file.parseDiagnostics.length, 0); assert.equal(entry.parseDiagnostics.length, 0);
    const nodes = file.statements.filter(n => ts.isTypeAliasDeclaration(n) && n.name.text === 'ThemePalette');
    assert.equal(nodes.length, 1, 'missing/ambiguous ThemePalette declaration');
    const node = nodes[0]; assert.equal(node.typeParameters?.length || 0, 0, 'generic palette alias');
    assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'private/deprecated/experimental palette type');
    if (subject.line === 'original') assert.ok(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword), 'original palette type not public');
    else {
      const exports = entry.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
        .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'ThemePalette').map(e => ({node: n, binding: e})));
      assert.equal(exports.length, 1, 'missing/ambiguous public palette export');
      assert.equal((exports[0].binding.propertyName || exports[0].binding.name).text, 'ThemePalette', 'palette export alias changed');
      assert.equal(exports[0].node.moduleSpecifier?.text, './_palette-chunk.js', 'palette export chain changed');
      const targets = file.statements.filter(n => ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause))
        .flatMap(n => n.exportClause.elements.filter(e => e.name.text === 'ThemePalette'));
      assert.equal(targets.length, 1, 'palette declaration not exported by target');
      assert.equal((targets[0].propertyName || targets[0].name).text, 'ThemePalette', 'palette target alias changed');
    }
    return {...subject, declaration: node.type.getText(file), shape: printer.printNode(ts.EmitHint.Unspecified, node.type, file).replace(/\s+/g, '')};
  });
  for (const model of models.slice(1)) assert.equal(model.shape, models[0].shape, 'historical palette domain changed');
  const chunks = ['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;', 'type Assert<T extends true>=T;'];
  models.forEach((m, i) => {
    chunks.push(`type Subject${i}=${m.declaration};`);
    for (const [j, value] of ["'primary'", "'accent'", "'warn'", 'undefined'].entries()) chunks.push(`const accepted${i}_${j}:Subject${i}=${value};`);
    for (const [j, value] of ["'custom-palette'", 'null', '12'].entries()) chunks.push(`// @ts-expect-error Outside the historical palette label domain.\nconst rejected${i}_${j}:Subject${i}=${value};`);
    if (i) chunks.push(`declare const old${i}:Subject0;const forward${i}:Subject${i}=old${i};declare const current${i}:Subject${i};const backward${i}:Subject0=current${i};type exact${i}=Assert<Equal<Subject0,Subject${i}>>;`);
  });
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'], target: ts.ScriptTarget.ES2022};
  const fixture = resolve(root, '__theme_palette_type_diagnostic__.ts'), host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? chunks.join('\n') : hostRead(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, 0, 'strict palette type contract failed: ' + ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => root, getNewLine: () => '\n'}));

  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === '@angular/material/core' && r.symbol === 'ThemePalette');
  assert.equal(uses.length, 9); const sources = [], cases = [];
  const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: false}}).outputText;
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file, source = read(path), file = parse(path, source);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === '@angular/material/core'
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings));
    const bindings = imports.flatMap(node => node.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === 'ThemePalette').map(binding => ({node, binding})));
    assert.equal(bindings.length, 1, 'missing/ambiguous palette import');
    const {node, binding} = bindings[0], references = [];
    const symbolHost = ts.createCompilerHost({...options, noResolve: true});
    symbolHost.getSourceFile = filename => filename === resolve(root, path) ? file : undefined;
    const checker = ts.createProgram([resolve(root, path)], {...options, noResolve: true}, symbolHost).getTypeChecker();
    const symbol = checker.getSymbolAtLocation(binding.name); assert.ok(symbol, 'unbound palette import');
    const visit = n => {
      if (ts.isIdentifier(n) && n.text === binding.name.text && n !== binding.name && n !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(n) === symbol, 'shadowed palette reference');
        assert.ok(ts.isTypeReferenceNode(n.parent) && n.parent.typeName === n, 'runtime/unsupported palette reference');
        assert.equal(n.parent.typeArguments?.length || 0, 0, 'modern generic palette use');
        references.push({line: file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1, role: 'erased-type-reference'});
      }
      ts.forEachChild(n, visit);
    };
    visit(file); assert.ok(references.length, 'unused palette import requires separate review');
    const names = node.importClause.namedBindings, kept = names.elements.filter(e => e !== binding);
    const [start, end, replacement] = !kept.length && !node.importClause.name ? [node.getStart(file), node.end, '']
      : [names.getStart(file), names.end, '{' + kept.map(e => e.getText(file)).join(', ') + (names.elements.hasTrailingComma ? ',' : '') + '}'];
    const original = emit(source), erased = emit(source.slice(0, start) + replacement + source.slice(end));
    assert.equal(original, erased, 'palette import changed executable emit');
    sources.push({path, sha256: sha(source), bytes: Buffer.byteLength(source), emit_sha256: sha(original), emit_without_palette_sha256: sha(erased)});
    cases.push({...use, candidate_source_sha256: sha(source), import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1,
      local_name: binding.name.text, references, public_subject: models.find(m => m.line === line).entry.path});
  }
  return {schema_version: 1, line, role: 'Finite nine ThemePalette label type/erasure boundaries; no runtime color or Sass qualification.',
    node: process.version, compiler: ts.version, compiler_source_sha256: sha(readFileSync(compilerPath)), compiler_root: compilerRoot || null,
    models, sources, cases, strict_assignments: 4, strict_equalities: 2, accepted_literals: 12, rejected_literals: 9,
    limitations: ['Public union and erased authored bindings only; no runtime color defaults/state/inheritance, class selectors, palette/theme/typography Sass or M2/M3 behavior clearance.',
      'Captured original/minimum types and source diagnostics only, not Angular/AOT/DI/packed/full runtime-floor qualification.',
      'Diagnostic emitDecoratorMetadata:false.'], g11_claim: 'not-passed'};
}
