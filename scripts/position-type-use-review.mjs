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
const selection = {
  '@angular/cdk/overlay': ['ConnectedPosition', 'HorizontalConnectionPos', 'VerticalConnectionPos'],
  '@angular/cdk/bidi': ['Direction'],
  '@angular/material/menu': ['MenuPositionX', 'MenuPositionY'],
};
const domains = {
  HorizontalConnectionPos: ['start', 'center', 'end'], VerticalConnectionPos: ['top', 'center', 'bottom'],
  Direction: ['ltr', 'rtl'], MenuPositionX: ['before', 'after'], MenuPositionY: ['above', 'below'],
};

/** Finite type/erasure boundary only; overlay geometry and direction behavior remain separate. */
export function reviewPositionTypes({root = defaultRoot, readSource, subjectData, compilerRoot} = {}) {
  const require = createRequire(import.meta.url);
  const compilerPath = compilerRoot ? resolve(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const ts = require(compilerPath);
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seedPath = 'compatibility/f10/authored-dependency-inventory-seed.json';
  const seed = readFileSync(resolve(root, seedPath));
  assert.equal(sha(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const model = subjectData || JSON.parse(read('compatibility/rc/position-type-declaration-subjects.json'));
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({removeComments: true});
  const shapes = new Map(), models = [];
  assert.equal(model.subjects.length, 9);
  for (const subject of model.subjects) {
    assert.ok(selection[subject.module]);
    assert.deepEqual(subject.symbols, selection[subject.module]);
    assert.equal(subject.archive_sri_verified, true);
    if (subject.line === line) assert.equal(manifest.peerDependencies[subject.package], '^' + subject.version);
    if (subject.line === line || subject.line === 'original') {
      assert.equal(sha(read(subject.lock_path)), subject.lock_sha256, 'position subject lock changed');
    }
    const texts = {};
    for (const name of ['package_manifest', 'entry', 'source']) {
      const cap = subject[name], text = read(cap.path);
      assert.equal(sha(text), cap.sha256, 'position declaration subject changed');
      assert.equal(Buffer.byteLength(text), cap.bytes, 'position declaration bytes changed');
      texts[name] = text;
    }
    const pkg = JSON.parse(texts.package_manifest);
    assert.equal(pkg.name, subject.package); assert.equal(pkg.version, subject.version);
    const subpath = './' + subject.module.split('/').at(-1);
    assert.equal(pkg.exports[subpath].types, './' + subject.entry.archive_member.slice('package/'.length), 'public package type entry changed');
    const file = parse(subject.source.path, texts.source), entry = parse(subject.entry.path, texts.entry);
    assert.equal(file.parseDiagnostics.length, 0); assert.equal(entry.parseDiagnostics.length, 0);
    const declarations = {};
    for (const name of subject.symbols) {
      const nodes = file.statements.filter(n => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text === name);
      assert.equal(nodes.length, 1, 'missing or ambiguous position declaration');
      const node = nodes[0];
      assert.equal(node.typeParameters?.length || 0, 0, 'generic position type requires separate review');
      assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)), 'private/deprecated/experimental position type');
      if (subject.line === 'original') {
        assert.ok(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword), 'original type is not a public export');
      } else {
        const exports = entry.statements.filter(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
          .flatMap(n => n.exportClause.elements.filter(e => e.name.text === name).map(e => ({node: n, binding: e})));
        assert.equal(exports.length, 1, 'missing/ambiguous public position export');
        assert.equal((exports[0].binding.propertyName || exports[0].binding.name).text, name, 'public position export alias changed');
        if (subject.entry.path === subject.source.path) assert.equal(exports[0].node.moduleSpecifier, undefined);
        else {
          const expected = './' + subject.source.archive_member.split('/').at(-1).replace(/\.d\.ts$/, '.js');
          assert.equal(exports[0].node.moduleSpecifier?.text, expected, 'public position export chain changed');
          const internal = file.statements.filter(n => ts.isExportDeclaration(n) && !n.moduleSpecifier && n.exportClause && ts.isNamedExports(n.exportClause))
            .flatMap(n => n.exportClause.elements.filter(e => e.name.text === name));
          assert.equal(internal.length, 1, 'declaration is not exported from public target');
          assert.equal((internal[0].propertyName || internal[0].name).text, name, 'position target export alias changed');
        }
      }
      const shape = ts.isInterfaceDeclaration(node)
        ? node.members.map(n => printer.printNode(ts.EmitHint.Unspecified, n, file).replace(/\s+/g, '')).join('')
        : printer.printNode(ts.EmitHint.Unspecified, node.type, file).replace(/\s+/g, '');
      if (subject.line === 'original') shapes.set(name, shape);
      else assert.equal(shape, shapes.get(name), 'historical position type shape changed: ' + name);
      declarations[name] = node.getText(file);
    }
    models.push({...subject, declarations});
  }
  assert.equal(shapes.size, 6);
  assert.deepEqual(models.map(m => m.line), ['original', 'original', 'original', 'main', 'main', 'main', '21.x', '21.x', '21.x']);

  const chunks = ['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;', 'type Assert<T extends true>=T;'];
  let assignments = 0, equalities = 0, positives = 0, negatives = 0;
  for (const [index, key] of ['original', 'main', '21.x'].entries()) {
    const declarations = models.filter(m => m.line === key).flatMap(m => Object.values(m.declarations));
    chunks.push('declare namespace Subject' + index + '{' + declarations.map(text => text.replace(/^(?:export\s+)?(?:declare\s+)?/, '').replace(/^(interface|type) /, 'export $1 ')).join('\n') + '}');
    for (const [name, values] of Object.entries(domains)) {
      for (const value of values) {chunks.push(`const accepted${positives++}:Subject${index}.${name}='${value}';`);}
      for (const value of ["'invalid-position'", 'undefined']) chunks.push(`// @ts-expect-error Outside the historical domain.\nconst rejected${negatives++}:Subject${index}.${name}=${value};`);
    }
    const axes = ['start', 'center', 'end'], vertical = ['top', 'center', 'bottom'];
    for (const originX of axes) for (const originY of vertical) for (const overlayX of axes) for (const overlayY of vertical)
      chunks.push(`const accepted${positives++}:Subject${index}.ConnectedPosition={originX:'${originX}',originY:'${originY}',overlayX:'${overlayX}',overlayY:'${overlayY}'};`);
    const good = {originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom'};
    chunks.push(`const accepted${positives++}:Subject${index}.ConnectedPosition={...${JSON.stringify(good)} as const,weight:2,offsetX:-12,offsetY:8,panelClass:['one','two']};`,
      `const accepted${positives++}:Subject${index}.ConnectedPosition={...${JSON.stringify(good)} as const,panelClass:'one'};`);
    const rejected = [];
    for (const field of Object.keys(good)) {
      rejected.push({...good, [field]: 'wrong-axis'});
      const missing = {...good}; delete missing[field]; rejected.push(missing);
    }
    for (const [field, value] of [['weight', 'heavy'], ['offsetX', 'left'], ['offsetY', 'up'], ['panelClass', 8], ['viewportMargin', 0]]) rejected.push({...good, [field]: value});
    for (const value of rejected) chunks.push(`// @ts-expect-error Invalid or missing historical position field.\nconst rejected${negatives++}:Subject${index}.ConnectedPosition=${JSON.stringify(value)};`);
    if (index) for (const name of shapes.keys()) {
      chunks.push(`declare const old${index}${name}:Subject0.${name};const forward${index}${name}:Subject${index}.${name}=old${index}${name};`,
        `declare const current${index}${name}:Subject${index}.${name};const backward${index}${name}:Subject0.${name}=current${index}${name};`,
        `type exact${index}${name}=Assert<Equal<Subject0.${name},Subject${index}.${name}>>;`);
      assignments += 2; equalities++;
    }
  }
  const fixture = resolve(root, '__position_type_diagnostic__.ts');
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'], target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? chunks.join('\n') : hostRead(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, 0, 'strict position type contract failed: ' + ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => root, getNewLine: () => '\n'}));

  const uses = JSON.parse(seed).symbol_uses.filter(row => selection[row.module]?.includes(row.symbol));
  assert.equal(uses.length, 16);
  const files = new Map(), cases = [];
  const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: false}}).outputText;
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file;
    if (!files.has(path)) {
      const source = read(path), file = parse(path, source), edits = [];
      assert.equal(file.parseDiagnostics.length, 0);
      for (const node of file.statements.filter(ts.isImportDeclaration)) {
        const selected = selection[node.moduleSpecifier.text], bindings = node.importClause?.namedBindings;
        if (!selected || !bindings || !ts.isNamedImports(bindings)) continue;
        const kept = bindings.elements.filter(e => !selected.includes((e.propertyName || e.name).text));
        if (kept.length === bindings.elements.length) continue;
        if (!kept.length && !node.importClause.name) edits.push([node.getStart(file), node.end, '']);
        else edits.push([bindings.getStart(file), bindings.end, '{' + kept.map(e => e.getText(file)).join(', ') + (bindings.elements.hasTrailingComma ? ',' : '') + '}']);
      }
      let erased = source;
      for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) erased = erased.slice(0, start) + replacement + erased.slice(end);
      const originalEmit = emit(source), erasedEmit = emit(erased);
      assert.equal(originalEmit, erasedEmit, 'position type import changed executable emit');
      const symbolHost = ts.createCompilerHost({...options, noResolve: true});
      symbolHost.getSourceFile = filename => filename === resolve(root, path) ? file : undefined;
      const checker = ts.createProgram([resolve(root, path)], {...options, noResolve: true}, symbolHost).getTypeChecker();
      files.set(path, {file, checker, cap: {path, sha256: sha(source), bytes: Buffer.byteLength(source), emit_sha256: sha(originalEmit), emit_without_position_types_sha256: sha(erasedEmit)}});
    }
    const {file, checker, cap} = files.get(path), matches = [];
    for (const node of file.statements.filter(ts.isImportDeclaration)) {
      if (node.moduleSpecifier.text !== use.module || !node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) continue;
      matches.push(...node.importClause.namedBindings.elements.filter(e => (e.propertyName || e.name).text === use.symbol));
    }
    assert.equal(matches.length, 1, 'missing/ambiguous position type import');
    const binding = matches[0], references = [], symbol = checker.getSymbolAtLocation(binding.name);
    assert.ok(symbol, 'unbound position type import');
    const visit = node => {
      if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name && node !== binding.propertyName) {
        assert.ok(checker.getSymbolAtLocation(node) === symbol, 'shadowed position type use');
        assert.ok(ts.isTypeReferenceNode(node.parent) && node.parent.typeName === node, 'runtime/unsupported position type use');
        assert.equal(node.parent.typeArguments?.length || 0, 0, 'modern generic position type use');
        references.push({line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, role: 'erased-type-reference'});
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    assert.ok(references.length, 'unused position import requires separate review');
    cases.push({...use, candidate_source_sha256: cap.sha256, import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1,
      local_name: binding.name.text, references, public_subject: models.find(m => m.line === line && m.module === use.module).entry.path});
  }
  return {schema_version: 1, line, node: process.version, compiler: ts.version,
    compiler_source_sha256: sha(readFileSync(compilerPath)), compiler_root: compilerRoot || null,
    role: 'Finite16public position/direction type dependencies; no actual overlay positioning or direction runtime qualification.',
    models, strict_assignments: assignments, strict_equalities: equalities, strict_positive_assignments: positives, strict_negative_assignments: negatives,
    sources: [...files.values()].map(f => f.cap), cases,
    limitations: ['Exact erased types/public declaration chains only; actual CDK strategy, Directionality, Angular DI/component behavior and all upstream fixes remain separate.',
      'Host diagnostic compiler with captured exact minimum declarations, not a full minimum installed compiler/runtime or packed consumer run.',
      'Diagnostic emitDecoratorMetadata:false; no compiled artifact pass is inferred.'], g11_claim: 'not-passed'};
}
