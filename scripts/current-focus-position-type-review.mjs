/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven current additions to independently verified, self-contained literal types. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
import {reviewFocusOriginTypes} from './focus-origin-type-review.mjs';
import {reviewPositionTypes} from './position-type-use-review.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const hash = b => createHash('sha256').update(b).digest('hex');
const key = r => JSON.stringify([r.file, r.module, r.symbol]);
const prefix = 'projects/ngx-material-legacy/';
const selection = new Map([
  ['@angular/cdk/a11y', ['FocusOrigin']], ['@angular/cdk/bidi', ['Direction']],
  ['@angular/material/menu', ['MenuPositionX', 'MenuPositionY']],
]);
const roster = [
  ['legacy-dialog/internal/dialog-container-base.ts', '@angular/cdk/a11y', 'FocusOrigin'],
  ['legacy-menu/internal/menu-panel.ts', '@angular/cdk/a11y', 'FocusOrigin'],
  ['legacy-menu/internal/menu-panel.ts', '@angular/cdk/bidi', 'Direction'],
  ['legacy-menu/internal/menu-panel.ts', '@angular/material/menu', 'MenuPositionX'],
  ['legacy-menu/internal/menu-panel.ts', '@angular/material/menu', 'MenuPositionY'],
  ['legacy-menu/public-api.ts', '@angular/material/menu', 'MenuPositionX'],
  ['legacy-menu/public-api.ts', '@angular/material/menu', 'MenuPositionY'],
].map(([file, module, symbol]) => ({file, module, symbol}));
const exports = {MenuPositionX: 'LegacyMenuPositionX', MenuPositionY: 'LegacyMenuPositionY'};
const parse = (path, raw) => {
  const file = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'invalid type-use source');
  return file;
};
const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true,
  types: [], lib: ['lib.es2022.d.ts'], experimentalDecorators: true, emitDecoratorMetadata: false,
  removeComments: true};
const emit = raw => ts.transpileModule(raw, {compilerOptions: options}).outputText;
const applyEdits = (raw, edits) => {
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
    raw = raw.slice(0, start) + replacement + raw.slice(end);
  return raw;
};

/** Reuse original/minimum declaration checks; never revise their oracle or old receipts. */
export function prepareCurrentFocusPositionTypes({root = rootDefault} = {}) {
  const focus = reviewFocusOriginTypes({root}), positions = reviewPositionTypes({root});
  assert.equal(focus.line, positions.line);
  const aliases = [];
  for (const model of focus.models) aliases.push({line: model.line, module: '@angular/cdk/a11y',
    symbol: 'FocusOrigin', path: model.path, body: model.declaration});
  for (const model of positions.models) for (const [name, declaration] of Object.entries(model.declarations)) {
    if (!selection.get(model.module)?.includes(name)) continue;
    const file = parse(model.source.path, declaration), node = file.statements[0];
    assert.ok(ts.isTypeAliasDeclaration(node));
    aliases.push({line: model.line, module: model.module, symbol: name,
      path: model.source.path, body: node.type.getText(file)});
  }
  assert.equal(aliases.length, 12);
  for (const alias of aliases) {
    const node = parse(alias.path, 'type Alias=' + alias.body + ';').statements[0].type;
    assert.ok(ts.isUnionTypeNode(node));
    assert.ok(node.types.every(t => ts.isLiteralTypeNode(t) &&
      (ts.isStringLiteral(t.literal) || t.literal.kind === ts.SyntaxKind.NullKeyword)),
    'type extraction has an unresolved dependency');
  }
  const paths = new Set([
    'scripts/focus-origin-type-review.mjs', 'scripts/position-type-use-review.mjs',
    'compatibility/rc/focus-origin-declaration-subjects.json',
    'compatibility/rc/position-type-declaration-subjects.json',
  ]);
  const focusSubjects = JSON.parse(readFileSync(resolve(root, 'compatibility/rc/focus-origin-declaration-subjects.json')));
  for (const m of focusSubjects.subjects) {paths.add(m.path); paths.add(m.entry_path);}
  for (const m of positions.models) {
    for (const field of ['package_manifest', 'entry', 'source']) paths.add(m[field].path);
    if (m.line === positions.line || m.line === 'original') paths.add(m.lock_path);
  }
  const inputs = [...paths].sort().map(path => ({path,
    sha256: hash(readFileSync(resolve(root, path)))}));
  const current = scanCurrentAuthoredUses({root});
  return {schema_version: 1, line: positions.line, aliases, inputs, focus, positions,
    current_source_snapshot: {source_files: current.source_files,
      source_population_sha256: current.source_population_sha256}};
}

/** The selected complete aliases are self-contained. Other module members are not modelled. */
function reexportProof(root, raw, stripped, filePath, model) {
  const sourcePath = resolve(root, filePath), consumer = resolve(root, '__current_menu_type_consumer__.ts');
  const peer = resolve(root, '__current_menu_literal_peer__.d.ts');
  const aliases = model.aliases.filter(a => a.line === model.line && a.module === '@angular/material/menu');
  const peerText = aliases.map(a => 'export type ' + a.symbol + '=' + a.body + ';').join('\n');
  const original = model.aliases.filter(a => a.line === 'original' && a.module === '@angular/material/menu');
  const fixture = [
    "import type {LegacyMenuPositionX,LegacyMenuPositionY} from './surface';",
    'type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;',
    'type Assert<T extends true>=T;',
    ...original.map(a => 'type Expected' + a.symbol + '=' + a.body + ';'),
    'type X=Assert<Equal<LegacyMenuPositionX,ExpectedMenuPositionX>>;',
    'type Y=Assert<Equal<LegacyMenuPositionY,ExpectedMenuPositionY>>;',
    "const x1:LegacyMenuPositionX='before',x2:LegacyMenuPositionX='after';",
    "const y1:LegacyMenuPositionY='above',y2:LegacyMenuPositionY='below';",
    "// @ts-expect-error Outside the complete historical horizontal domain.\nconst badX:LegacyMenuPositionX='left';",
    "// @ts-expect-error Outside the complete historical vertical domain.\nconst badY:LegacyMenuPositionY='bottom';",
  ].join('\n');
  function program(text, withConsumer) {
    const virtual = new Map([[sourcePath, text], [peer, peerText], [consumer, fixture]]);
    const host = ts.createCompilerHost(options), baseGet = host.getSourceFile.bind(host);
    host.getSourceFile = (path, language, ...args) => virtual.has(path)
      ? parse(path, virtual.get(path)) : baseGet(path, language, ...args);
    // Deliberately do not substitute unrelated peer or owned implementations.
    host.resolveModuleNames = (names, from) => names.map(name => {
      const path = name === '@angular/material/menu' ? peer
        : from === consumer && name === './surface' ? sourcePath : null;
      return path ? {resolvedFileName: path, extension: ts.Extension.Dts, isExternalLibraryImport: path === peer} : undefined;
    });
    const p = ts.createProgram(withConsumer ? [sourcePath, peer, consumer] : [sourcePath, peer], options, host);
    const file = p.getSourceFile(sourcePath), checker = p.getTypeChecker();
    const targets = [];
    for (const node of file.statements.filter(ts.isExportDeclaration)) {
      if (node.moduleSpecifier?.text !== '@angular/material/menu' || !node.exportClause || !ts.isNamedExports(node.exportClause)) continue;
      for (const binding of node.exportClause.elements) {
        const name = (binding.propertyName || binding.name).text;
        if (!exports[name]) continue;
        const target = checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name));
        assert.ok(target.flags & ts.SymbolFlags.TypeAlias, 'public reexport does not resolve to a type alias');
        assert.equal(target.flags & ts.SymbolFlags.Value, 0);
        assert.equal(target.name, name);
        assert.equal(target.declarations.length, 1);
        assert.equal(target.declarations[0].getSourceFile().fileName, peer);
        targets.push({symbol: name, public_alias: binding.name.text,
          declaration: target.declarations[0].getText(target.declarations[0].getSourceFile())});
      }
    }
    if (withConsumer) {
      assert.equal(targets.length, 2);
      const diagnostics = p.getSemanticDiagnostics(p.getSourceFile(consumer));
      assert.equal(diagnostics.length, 0, 'selected public alias consumer contract failed');
    }
    let output;
    const emitted = p.emit(file, (path, data) => {if (path.endsWith('.js')) output = data;});
    assert.equal(emitted.emitSkipped, false); assert.equal(typeof output, 'string');
    return {output, targets, unqualified_surface_diagnostics: p.getSemanticDiagnostics(file).length};
  }
  const before = program(raw, true), after = program(stripped, false);
  assert.equal(before.output, after.output, 'type reexports alter executable emit');
  return {targets: before.targets, strict_selected_consumer_equalities: 2,
    strict_selected_positive_assignments: 4, strict_selected_negative_assignments: 2,
    emit_sha256: hash(before.output), emit_without_selected_reexports_sha256: hash(after.output),
    selected_peer_aliases: aliases, other_members_or_modules_qualified: false,
    unqualified_surface_diagnostics: before.unqualified_surface_diagnostics};
}

export function reviewCurrentFocusPositionTypes({root = rootDefault, model, readSource} = {}) {
  model ||= prepareCurrentFocusPositionTypes({root});
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  for (const input of model.inputs) assert.equal(hash(read(input.path)), input.sha256, 'changed independent type input');
  const focusBytes = read('compatibility/rc/focus-origin-declaration-subjects.json');
  const positionBytes = read('compatibility/rc/position-type-declaration-subjects.json');
  assert.equal(hash(focusBytes), '0f0aeee44460041b4c2c89555bc2d7544c607f28627fda3614ab1df86b6f7ec5');
  assert.equal(hash(positionBytes), 'a118630f1cc6faf338fa4d0298330e3602dfd6b4f4a5c675f2b3819be6761ec1');
  const expectedAliases = [];
  for (const subject of JSON.parse(focusBytes).subjects) {
    const text = read(subject.path); assert.equal(hash(text), subject.sha256);
    const file = parse(subject.path, text), node = file.statements.find(n => ts.isTypeAliasDeclaration(n) && n.name.text === 'FocusOrigin');
    assert.ok(node);
    expectedAliases.push({line: subject.line, module: '@angular/cdk/a11y', symbol: 'FocusOrigin', path: subject.path, body: node.type.getText(file)});
  }
  for (const subject of JSON.parse(positionBytes).subjects) {
    if (!selection.has(subject.module)) continue;
    const text = read(subject.source.path); assert.equal(hash(text), subject.source.sha256);
    const file = parse(subject.source.path, text);
    for (const name of subject.symbols) {
      if (!selection.get(subject.module).includes(name)) continue;
      const node = file.statements.find(n => ts.isTypeAliasDeclaration(n) && n.name.text === name); assert.ok(node);
      expectedAliases.push({line: subject.line, module: subject.module, symbol: name, path: subject.source.path, body: node.type.getText(file)});
    }
  }
  assert.deepEqual(model.aliases, expectedAliases, 'extracted complete alias body changed');
  const manifest = JSON.parse(read(prefix + 'package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(model.line, line);
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + model.focus.models.find(m => m.line === line).version);
  const frozen = readFileSync(resolve(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(frozen), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozenKeys = new Set(JSON.parse(frozen).symbol_uses.map(key));
  // Parse the whole population once, then rehash every member on each test.
  // Mutations outside the three bounded files require a new complete census.
  const snapshot = model.current_source_snapshot;
  const recorded = JSON.parse(readFileSync(resolve(root, 'compatibility/f10/authored-dependency-current-dispositions.json')));
  assert.equal(hash(JSON.stringify(snapshot.source_files)), recorded.current_source_population_sha256, 'changed whole-source snapshot');
  assert.equal(snapshot.source_population_sha256, recorded.current_source_population_sha256);
  const actualPaths = execFileSync('rg', ['--files', '--hidden', '--no-ignore', prefix.slice(0, -1),
    '--glob', '*.ts', '--glob', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(actualPaths, snapshot.source_files.map(s => s.path), 'source population changed');
  const scope = [...new Set(roster.map(r => prefix + r.file))].sort();
  const actualSources = snapshot.source_files.map(s => {
    const sha256 = hash(read(s.path));
    if (!scope.includes(s.path)) assert.equal(sha256, s.sha256, 'source change outside the finite type context');
    return {path: s.path, sha256};
  });
  if (!readSource) assert.equal(hash(JSON.stringify(actualSources)), recorded.current_source_population_sha256, 'current source snapshot changed');
  const current = scanCurrentAuthoredUses({root, files: scope, readSource: read});
  current.source_population_sha256 = hash(JSON.stringify(actualSources));
  const additions = current.symbol_uses.filter(r => selection.get(r.module)?.includes(r.symbol) && !frozenKeys.has(key(r)));
  assert.deepEqual(additions.map(key).sort(), roster.map(key).sort(), 'current literal-type roster changed');
  const cases = [], sources = new Map(), reexports = new Map();
  for (const use of additions) {
    const path = prefix + use.file, raw = read(path), file = parse(path, raw);
    assert.equal(use.occurrences.length, 1, 'ambiguous current literal-type route');
    const occurrence = use.occurrences[0], references = [], edits = [];
    if (occurrence.kind === 'named-import') {
      const bindings = file.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === use.module &&
        n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(node =>
        node.importClause.namedBindings.elements.filter(b => (b.propertyName || b.name).text === use.symbol).map(binding => ({node, binding})));
      assert.equal(bindings.length, 1); const {node, binding} = bindings[0];
      const host = ts.createCompilerHost({...options, noResolve: true});
      host.getSourceFile = name => name === path ? file : undefined;
      const checker = ts.createProgram([path], {...options, noResolve: true}, host).getTypeChecker();
      const symbol = checker.getSymbolAtLocation(binding.name); assert.ok(symbol);
      function visit(n) {
        if (ts.isIdentifier(n) && n.text === binding.name.text && n !== binding.name && n !== binding.propertyName) {
          assert.ok(checker.getSymbolAtLocation(n) === symbol, 'shadowed literal-type import');
          assert.ok(ts.isTypeReferenceNode(n.parent) && n.parent.typeName === n, 'runtime literal-type reference');
          assert.equal(n.parent.typeArguments?.length || 0, 0, 'generic literal-type reference');
          references.push(file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1);
        }
        ts.forEachChild(n, visit);
      }
      visit(file); assert.ok(references.length);
      const kept = node.importClause.namedBindings.elements.filter(b => b !== binding);
      edits.push(!kept.length && !node.importClause.name ? [node.getStart(file), node.end, '']
        : [node.importClause.namedBindings.getStart(file), node.importClause.namedBindings.end,
          '{' + kept.map(b => b.getText(file)).join(',') + '}']);
      const actual = emit(raw), erased = emit(applyEdits(raw, edits));
      assert.equal(actual, erased, 'literal-type import changes executable emit');
      cases.push({...use, scope: 'erased-type-import', references, emit_sha256: hash(actual), erased_emit_sha256: hash(erased)});
    } else {
      assert.equal(occurrence.kind, 'named-reexport'); assert.equal(use.file, 'legacy-menu/public-api.ts');
      const nodes = file.statements.filter(n => ts.isExportDeclaration(n) && n.moduleSpecifier?.text === use.module && n.exportClause && ts.isNamedExports(n.exportClause));
      const matches = nodes.flatMap(node => node.exportClause.elements.filter(b => (b.propertyName || b.name).text === use.symbol).map(binding => ({node, binding})));
      assert.equal(matches.length, 1); assert.equal(matches[0].binding.name.text, exports[use.symbol], 'historical public alias renamed');
      for (const node of nodes) {
        const kept = node.exportClause.elements.filter(b => !exports[(b.propertyName || b.name).text]);
        edits.push([node.exportClause.getStart(file), node.exportClause.end,
          '{' + kept.map(b => b.getText(file)).join(',') + (node.exportClause.elements.hasTrailingComma ? ',' : '') + '}']);
      }
      function forbidValue(n) {
        if (ts.isIdentifier(n) && Object.values(exports).includes(n.text)) assert.ok(ts.isExportSpecifier(n.parent), 'public alias used as a value');
        ts.forEachChild(n, forbidValue);
      }
      forbidValue(file);
      if (!reexports.has(path)) reexports.set(path, reexportProof(root, raw, applyEdits(raw, edits), path, model));
      const proof = reexports.get(path);
      cases.push({...use, scope: 'public-type-alias-reexport', public_alias: exports[use.symbol], reexport_proof: proof});
    }
    sources.set(path, {path, sha256: hash(raw), bytes: Buffer.byteLength(raw)});
  }
  return {schema_version: 1, line, node: process.version, compiler: ts.version,
    role: 'Seven additional erased FocusOrigin, Direction and menu-position types; no focus/menu runtime qualification',
    independent_inputs: model.inputs, aliases: model.aliases, current_source_population_sha256: current.source_population_sha256,
    sources: [...sources.values()], cases, declaration_contracts: {
      focus_assignments: model.focus.strict_assignments, focus_equalities: model.focus.strict_equalities,
      position_assignments: model.positions.strict_assignments, position_equalities: model.positions.strict_equalities},
    source_or_contract_changes: false, native_or_packed_execution: false, consumer_floor_execution: false,
    limitations: ['Complete selected self-contained literal type bodies and verified public routes come from genuine original/minimum declarations.',
      'The reexport compiler fixture models only those complete literal aliases; other peer members and owned modules remain unresolved and receive no compile/runtime credit.',
      'No focus routing, dialog/menu lifecycle, Angular node/AOT, emitted package, full templates, installed compiler or Node/RxJS floor qualification.'],
    g11_claim: 'not-passed'};
}
