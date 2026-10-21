/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact current overlay callers and their finite,untouched minimum SDK declarations. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join, dirname, posix} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {overlayCallerPrior} from './overlay-caller-roles.mjs';
import {prepareOverlayCallerPublicSubjects} from './overlay-caller-public-subjects.mjs';

const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {main: '5b0befd5297218443b2707fc15aebb722efdb36e3157561640284a40d5a4f069',
  '21.x': 'ada5a4f44c60dad85f4fe54bfd74c985db1eaa0a974dd70a7ce6ad188e2fb037'};
const sdkPin = '41381d79c5005d63b695e6e487109ca04b3b994362ee43cae835114abfcf1b97';
export const OVERLAY_CONTRACT_INPUTS = 'compatibility/rc/overlay-caller-contract-inputs.json';
export const OVERLAY_CONTRACT_SDK = 'compatibility/rc/overlay-caller-contract-sdk.json';
const authenticated = new Set();

export function overlayContractSource({root = process.cwd(), read = raw(root)} = {}) {
  const bytes = read(OVERLAY_CONTRACT_INPUTS), digest = hash(bytes);
  const line = Object.keys(pins).find(line => pins[line] === digest);
  assert.ok(line, 'changed current overlay contract capture');
  const capture = JSON.parse(bytes), prior = overlayCallerPrior({root, read});
  assert.equal(capture.line, line); assert.equal(prior.line, line);
  assert.equal(hash(read(capture.original_prior.path)), capture.original_prior.sha256);
  assert.deepEqual(capture.selected_sources, prior.sources.map(m => m.path));
  assert.equal(capture.sources.length, 145); assert.equal(capture.self_package_routes.length, 4);
  assert.deepEqual(capture.support, prior.support.map(m => ({path: m.path, sha256: m.sha256})));
  const sources = new Map();
  for (const member of [...capture.sources, ...capture.support, ...capture.self_package_routes]) {
    const value = read(member.path); assert.equal(hash(value), member.sha256, 'changed overlay contract input ' + member.path);
    if (member.bytes !== undefined) assert.equal(value.length, member.bytes);
    const key = [root, capture.source_parent, member.path, member.sha256].join(':');
    if (!authenticated.has(key)) {
      const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', 'show', capture.source_parent + ':' + member.path],
        {cwd: root, maxBuffer: 4 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
      assert.equal(hash(original), member.sha256, 'overlay source capture is not its committed input');
      authenticated.add(key);
    }
  }
  for (const member of capture.sources) sources.set(member.path, read(member.path).toString());
  assert.equal(hash(sources.get('projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts')), capture.tooltip_current_sha256);
  const routes = new Map(capture.self_package_routes.map(r => [r.specifier, r.entry])), edges = [], visited = new Set();
  function visit(path) {
    if (visited.has(path)) return; visited.add(path);
    const text = sources.get(path); assert.equal(typeof text, 'string', 'uncaptured owned dependency ' + path);
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0);
    function edge(spec) {
      let target;
      if (spec.startsWith('@ngx-compat/material-legacy/')) {target = routes.get(spec); assert.ok(target, 'uncaptured owned public entry ' + spec);}
      else if (spec.startsWith('.')) {
        const base = posix.normalize(posix.join(posix.dirname(path), spec));
        const candidates = [base, base + '.ts', base + '/index.ts'].filter(p => sources.has(p));
        assert.equal(candidates.length, 1, 'ambiguous or missing owned import ' + path + ':' + spec); target = candidates[0];
      } else return;
      edges.push({from: path, specifier: spec, to: target}); visit(target);
    }
    for (const n of source.statements) if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) edge(n.moduleSpecifier.text);
    function nested(n) {
      if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) edge(n.argument.literal.text);
      assert.ok(!(ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword), 'unqualified dynamic owned import');
      ts.forEachChild(n, nested);
    }
    nested(source);
  }
  for (const path of capture.selected_sources) visit(path);
  assert.deepEqual([...visited].sort(), [...sources.keys()].sort(), 'changed complete current source closure');
  for (const route of capture.self_package_routes) {
    const metadata = JSON.parse(read(route.path));
    assert.equal(posix.join(posix.dirname(route.path), metadata.lib.entryFile), route.entry);
  }
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const files = new Map([...sources].map(([path, text]) => [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const host = ts.createCompilerHost(options); host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()].map(path => join(root, path)), options, host).getTypeChecker();
  const facts = prior.selected.map(selected => {
    const row = selected.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = files.get(path);
    const binding = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === row.module)
      .flatMap(n => n.importClause?.namedBindings?.elements ?? []).find(n => (n.propertyName ?? n.name).text === row.symbol);
    assert.ok(binding, 'lost selected overlay binding');
    const symbol = checker.getSymbolAtLocation(binding.name), occurrences = [], bound = new Set();
    function visit(n) {
      if (ts.isIdentifier(n) && n !== binding.name && n !== binding.propertyName && checker.getSymbolAtLocation(n) === symbol) {
        occurrences.push({line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1,
          parent_kind: ts.SyntaxKind[n.parent.kind], expression: n.parent.getText(source)});
        let owner = n;
        while (owner && !ts.isParameter(owner) && !ts.isPropertyDeclaration(owner) && !ts.isVariableDeclaration(owner) && !ts.isSourceFile(owner)) owner = owner.parent;
        if (owner?.name && ts.isIdentifier(owner.name)) bound.add(owner.name.text);
      }
      ts.forEachChild(n, visit);
    }
    visit(source);
    return {file: row.file, module: row.module, symbol: row.symbol, ledger: selected.ledger,
      candidate_source_sha256: hash(source.text), binding: {local_name: binding.name.text,
        type_only: !!(binding.isTypeOnly || binding.parent.parent.isTypeOnly), line: source.getLineAndCharacterOfPosition(binding.getStart(source)).line + 1,
        text: binding.getText(source)}, occurrences, bound_receivers: [...bound], unused_import: occurrences.length === 0,
      complete_context_members: [{kind: 'SourceFile', line: 1, sha256: hash(source.text), text: source.text}]};
  });
  assert.equal(facts.length, 48); assert.equal(facts.filter(f => f.unused_import).length, 1);
  return {capture, prior, sources, edges, facts};
}

export function prepareOverlayContractSubjects(root = process.cwd()) {
  const bytes = readFileSync(join(root, OVERLAY_CONTRACT_SDK)); assert.equal(hash(bytes), sdkPin, 'changed sealed overlay declaration capsule');
  const capsule = JSON.parse(bytes), loaded = prepareOverlayCallerPublicSubjects(root);
  try {
    assert.deepEqual(capsule.base, loaded.overlay_caller_capsule);
    for (const model of loaded.models.filter(m => m.line !== 'original')) {
      const subject = capsule.subjects.find(s => s.line === model.line); assert.ok(subject);
      assert.deepEqual(subject.archives, model.subject.packages.filter(p => ['@angular/cdk', '@angular/material'].includes(p.name)));
      assert.equal(subject.additions.length, 20);
      for (const member of subject.additions) {
        assert.ok(member.key.startsWith(member.package + '/') && !member.key.split('/').includes('..'));
        assert.equal(member.archive_member, 'package/' + member.key.slice(member.package.length + 1));
        assert.equal(member.path, 'compatibility/rc/overlay-caller-contract-sdk/' + member.sha256 + '.gz');
        const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256);
        const value = gunzipSync(stored); assert.equal(hash(value), member.sha256); assert.equal(value.length, member.bytes);
        assert.equal(model.sources.has(member.key), false, 'SDK declaration override');
        model.sources.set(member.key, value.toString());
        const target = join(model.root, 'node_modules', member.key); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, value, {flag: 'wx'});
      }
      model.overlay_contract_subject = subject;
    }
    return {...loaded, overlay_contract_capsule: {path: OVERLAY_CONTRACT_SDK, sha256: sdkPin}};
  } catch (error) {loaded.dispose(); throw error;}
}

export function inspectOverlayStrategyProvenance({program, model}) {
  const checker = program.getTypeChecker(), prefix = 'projects/ngx-material-legacy/';
  const file = name => program.getSourceFile(join(model.root, prefix + name));
  const tooltip = file('legacy-tooltip/internal/tooltip-base.ts');
  const menu = file('legacy-menu/internal/menu-trigger-base.ts');
  const dialog = file('legacy-dialog/internal/dialog-base.ts');
  function all(source, predicate) {const result = []; function visit(n) {if (predicate(n)) result.push(n); ts.forEachChild(n, visit);} visit(source); return result;}
  function member(n, name) {return ts.isPropertyAccessExpression(n) && n.name.text === name;}
  function positionProperty(node) {return node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === 'positionStrategy');}
  function exactType(node, name) {
    const type = checker.getTypeAtLocation(node), symbol = type.getSymbol();
    assert.equal(symbol?.name, name, 'wrong position-strategy construction provenance');
    const declaration = symbol.getDeclarations()?.[0];
    assert.ok(declaration?.getSourceFile().fileName.includes('/node_modules/@angular/cdk/'));
    return {type: name, expression: node.getText(), declaration_sha256: hash(declaration.getText(declaration.getSourceFile()))};
  }
  const writes = all(tooltip, n => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(tooltip) === 'this._overlayRef');
  const constructions = writes.filter(n => n.right.kind !== ts.SyntaxKind.NullKeyword);
  assert.equal(constructions.length, 1);
  const create = constructions[0].right;
  assert.ok(ts.isCallExpression(create) && create.expression.getText(tooltip) === 'this._overlay.create');
  assert.equal(create.arguments.length, 1); assert.ok(ts.isObjectLiteralExpression(create.arguments[0]));
  const tooltipPosition = positionProperty(create.arguments[0]); assert.ok(tooltipPosition);
  const tooltipConstruction = exactType(tooltipPosition.initializer, 'FlexibleConnectedPositionStrategy');
  const updates = all(tooltip, n => ts.isCallExpression(n) && n.expression.getText(tooltip) === 'this._updatePosition');
  assert.equal(updates.length, 3); assert.ok(updates.every(n => n.arguments.length === 1 && n.arguments[0].getText(tooltip) === 'this._overlayRef'));
  const menuConfigs = all(menu, n => ts.isNewExpression(n) && n.expression.getText(menu) === 'OverlayConfig');
  assert.equal(menuConfigs.length, 1);
  const menuConstruction = exactType(positionProperty(menuConfigs[0].arguments[0]).initializer, 'FlexibleConnectedPositionStrategy');
  const menuWrites = all(menu, n => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(menu) === 'this._overlayRef');
  assert.equal(menuWrites.filter(n => n.right.kind !== ts.SyntaxKind.NullKeyword).length, 1);
  assert.equal(menuWrites.find(n => n.right.kind !== ts.SyntaxKind.NullKeyword).right.getText(menu), 'this._overlay.create(config)');
  const configCalls = all(menu, n => ts.isCallExpression(n) && n.expression.getText(menu) === 'this._getOverlayConfig');
  assert.equal(configCalls.length, 1);
  const opens = all(dialog, n => ts.isCallExpression(n) && n.expression.getText(dialog) === 'this._dialog.open');
  assert.equal(opens.length, 1); const config = opens[0].arguments[1]; assert.ok(ts.isObjectLiteralExpression(config));
  const property = positionProperty(config); assert.ok(property);
  const dialogConstruction = exactType(property.initializer, 'GlobalPositionStrategy');
  const propertyIndex = config.properties.indexOf(property);
  assert.ok(config.properties.every((n, i) => !ts.isSpreadAssignment(n) || i < propertyIndex), 'later spread can replace dialog strategy');
  const casts = [];
  for (const path of ['legacy-tooltip/internal/tooltip-base.ts', 'legacy-menu/internal/menu-trigger-base.ts', 'legacy-dialog/dialog-ref.ts']) {
    const source = file(path);
    for (const n of all(source, n => ts.isAsExpression(n) && ['FlexibleConnectedPositionStrategy', 'GlobalPositionStrategy'].includes(n.type.getText(source)))) {
      casts.push({file: prefix + path, line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1,
        expression: n.getText(source), asserted_type: n.type.getText(source)});
    }
  }
  assert.equal(casts.length, 5);
  assert.equal(casts.filter(c => c.file.endsWith('tooltip-base.ts')).length, 2);
  assert.equal(casts.filter(c => c.file.endsWith('menu-trigger-base.ts')).length, 2);
  assert.equal(casts.filter(c => c.file.endsWith('dialog-ref.ts')).length, 1);
  return {casts, tooltipConstruction, menuConstruction, dialogConstruction,
    tooltip_non_null_reference_writes: 1, tooltip_update_calls_from_owned_reference: 3,
    menu_non_null_reference_writes: 1, dialog_strategy_overrides_all_user_spreads: true,
    scope: 'Owned tooltip/menu creation and dialog-service construction establish the asserted strategy classes. External fabricated refs,subclass overrides,private field mutation and full component/native lifecycle are not admitted.'};
}

export function compileOverlayContractSource({model, source}) {
  assert.notEqual(model.line, 'original', 'current sources do not backcompile to historical peers');
  const roots = [];
  for (const [path, text] of source.sources) {
    const target = join(model.root, path); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, text); roots.push(target);
  }
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true, strictPropertyInitialization: false, skipLibCheck: false, noEmit: true, noImplicitOverride: true,
    experimentalDecorators: true, types: [], paths: Object.fromEntries(source.capture.self_package_routes.map(r => [r.specifier, [join(model.root, r.entry)]]))};
  const program = ts.createProgram(roots, options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics,
    {getCanonicalFileName: p => p, getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
  const consumed = program.getSourceFiles().filter(sf => sf.fileName.startsWith(join(model.root, 'node_modules', '@angular') + '/'))
    .map(sf => {const key = sf.fileName.slice(join(model.root, 'node_modules').length + 1), text = readFileSync(sf.fileName, 'utf8');
      assert.equal(text, model.sources.get(key)); return {key, sha256: hash(text), bytes: Buffer.byteLength(text)};});
  assert.deepEqual(consumed, model.overlay_contract_subject.consumed_declarations, 'changed exact SDK declaration closure');
  const {calls, members} = inspectActualOverlayCalls({program, roots, model});
  return {program, options, roots, report: {line: model.line, Core: model.packages.get('@angular/core').version,
    CDK: model.packages.get('@angular/cdk').version, typescript: ts.version, source_files: roots.length,
    strict: true, strictPropertyInitialization: false, skipLibCheck: false, noImplicitOverride: true, diagnostics: 0,
    source_or_SDK_rewrites: false, emit_or_AOT: false, actual_resolved_overlay_calls: calls, actual_overlay_members: members,
    strategy_provenance: inspectOverlayStrategyProvenance({program, model}),
    consumed_declarations: consumed, self_package_routes: source.capture.self_package_routes}};
}

export function inspectActualOverlayCalls({program, roots, model}) {
  const checker = program.getTypeChecker(), calls = [], members = [], unstable = new Set(['deprecated', 'docs-private', 'experimental', 'developerPreview', 'breaking-change']);
  for (const path of roots) {
    const file = program.getSourceFile(path);
    function walk(n) {
      if (ts.isPropertyAccessExpression(n)) {
        let symbol = checker.getSymbolAtLocation(n.name);
        if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        const declarations = symbol?.getDeclarations()?.filter(d => d.getSourceFile().fileName.includes('/node_modules/@angular/cdk/') && /overlay/.test(d.getSourceFile().fileName)) ?? [];
        if (declarations.length) {
          const tags = symbol.getJsDocTags(checker).map(t => t.name);
          assert.ok(tags.every(t => !unstable.has(t)), 'unstable actual overlay member ' + path + ':' + n.getText(file) + ':' + tags.join(','));
          for (const d of declarations) assert.ok(!d.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(m.kind)), 'inaccessible actual overlay member');
          members.push({file: path.slice(model.root.length + 1), line: file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1,
            expression: n.getText(file), tags, declarations: declarations.map(d => hash(d.getText(d.getSourceFile())))});
        }
      }
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const signature = checker.getResolvedSignature(n), declaration = signature?.declaration;
        if (declaration?.getSourceFile().fileName.includes('/node_modules/@angular/cdk/') && /overlay/.test(declaration.getSourceFile().fileName)) {
          const tags = signature.getJsDocTags().map(t => t.name); assert.ok(tags.every(t => !unstable.has(t)), 'unstable actual overlay overload');
          calls.push({file: path.slice(model.root.length + 1), line: file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1,
            expression: n.getText(file), declaration_sha256: hash(declaration.getText(declaration.getSourceFile())), tags,
            arguments: (n.arguments ?? []).map(a => ({text: a.getText(file), type: checker.typeToString(checker.getTypeAtLocation(a))})),
            parameter_types: signature.getParameters().map(p => checker.typeToString(checker.getTypeOfSymbolAtLocation(p, declaration)))});
        }
      }
      ts.forEachChild(n, walk);
    }
    walk(file);
  }
  assert.equal(calls.length, 104);
  return {calls, members};
}
