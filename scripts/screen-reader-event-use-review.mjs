/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public fake-event helpers and exact historical menu handler bodies. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule, SyntheticModule} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {keyManagerPublicSubjects} from './key-manager-public-subjects.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const names = ['isFakeMousedownFromScreenReader', 'isFakeTouchstartFromScreenReader'];
const moduleName = '@angular/cdk/a11y';
const menuFile = 'legacy-menu/internal/menu-trigger-base.ts';
const rendererFile = 'legacy-core/ripple/ripple-renderer.ts';
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
const parse = (path, text) => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
};
const emit = code => ts.transpileModule(code, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true,
}}).outputText;
const syntaxTree = (node, source) => {
  if (ts.isParenthesizedExpression(node)) return syntaxTree(node.expression, source);
  const children = [];
  ts.forEachChild(node, child => {children.push(syntaxTree(child, source));});
  return [ts.SyntaxKind[node.kind], children.length ? children : node.getText(source)];
};

function inspectPeer(model) {
  const helpers = [];
  for (const name of names) {
    const runtime = [], declarations = [];
    for (const [path, text] of model.sources) {
      if (!path.startsWith('@angular/cdk/') || !/\.(mjs|d\.ts)$/.test(path)) continue;
      const source = parse(path, text);
      for (const node of source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name))
        (path.endsWith('.mjs') ? runtime : declarations).push({path, source, node});
    }
    assert.equal(runtime.length, 1); assert.equal(declarations.length, 1);
    const body = runtime[0], type = declarations[0];
    assert.equal(model.runtime[name].toString(), body.node.getText(body.source));
    assert.ok(!ts.getJSDocTags(type.node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)));
    assert.equal(type.node.parameters.length, 1); assert.equal(type.node.typeParameters?.length || 0, 0);
    assert.equal(type.node.parameters[0].type.getText(type.source), name === names[0] ? 'MouseEvent' : 'TouchEvent');
    assert.equal(type.node.type.getText(type.source), 'boolean');
    const bodyCode = print(body.node.body, body.source);
    helpers.push({name, runtime_path: body.path, runtime_sha256: sha(body.source.text),
      function_sha256: sha(body.node.getText(body.source)), body_code: bodyCode,
      body_syntax_sha256: sha(JSON.stringify(syntaxTree(body.node.body, body.source))),
      declaration_path: type.path, declaration_sha256: sha(type.source.text),
      declaration: print(type.node, type.source).replace(/^export /, '')});
  }
  return {line: model.subject.line, cdk_version: model.subject.cdk_version, public_entry: model.public_entry, helpers};
}

function inspectCallers(root, read) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(sha(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === moduleName && names.includes(r.symbol));
  assert.equal(uses.length, 4);
  const cases = [], menuMembers = new Map();
  for (const file of [menuFile, rendererFile]) {
    const path = 'projects/ngx-material-legacy/' + file, text = read(path), source = parse(path, text);
    const absolute = join(root, path), options = {noResolve: true, noLib: true};
    const host = ts.createCompilerHost(options); host.getSourceFile = p => p === absolute ? source : undefined;
    const checker = ts.createProgram([absolute], options, host).getTypeChecker();
    for (const name of names) {
      const bindings = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName)
        .flatMap(n => n.importClause?.namedBindings?.elements?.filter(b => (b.propertyName || b.name).text === name) || []);
      assert.equal(bindings.length, 1);
      const binding = bindings[0], symbol = checker.getSymbolAtLocation(binding.name), calls = [];
      assert.deepEqual(symbol?.declarations, [binding]);
      assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly);
      function visit(node) {
        if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          assert.ok(ts.isCallExpression(node.parent) && node.parent.expression === node && node.parent.arguments.length === 1);
          assert.equal(node.parent.arguments[0].getText(source), 'event');
          let member = node.parent;
          while (member.parent && !ts.isClassDeclaration(member.parent)) member = member.parent;
          const expected = file === menuFile
            ? name === names[0] ? '_handleMousedown' : '_handleTouchStart'
            : name === names[0] ? '_onMousedown' : '_onTouchStart';
          assert.equal(member.name?.getText(source), expected);
          calls.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            expression: node.parent.getText(source), member: expected, member_source: member.getText(source)});
          if (file === menuFile) menuMembers.set(name, {member, source, local_name: binding.name.text});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); assert.equal(calls.length, 1);
      cases.push({file, module: moduleName, symbol: name, local_name: binding.name.text,
        candidate_source_sha256: sha(text), references: calls});
    }
  }
  assert.ok(cases.every(c => uses.some(u => u.file === c.file && u.symbol === c.symbol)));
  return {cases, menuMembers};
}

function taggedMenuBodies(root, members) {
  const raw = readFileSync(join(root, 'compatibility/rc/key-manager-tagged-construction-subjects.json'));
  assert.equal(sha(raw), '50e7f14e8460bef4eab432c53de985b502678d5c1f0257b1dbcc4a2e30e1aad2');
  const entry = JSON.parse(raw).members.find(m => m.archive_member === 'package/fesm2022/menu.mjs');
  const stored = readFileSync(join(root, entry.path)); assert.equal(sha(stored), entry.gzip_sha256);
  const bytes = gunzipSync(stored); assert.equal(sha(bytes), entry.sha256); assert.equal(bytes.length, entry.bytes);
  const source = parse(entry.archive_member, bytes.toString()), cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === '_MatMenuTriggerBase');
  assert.ok(cls);
  const oldMouse = cls.members.find(n => ts.isMethodDeclaration(n) && n.name?.getText(source) === '_handleMousedown');
  const touch = [];
  function visit(node) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts.SyntaxKind.ThisKeyword
      && node.left.name.text === '_handleTouchStart') touch.push(node.right);
    ts.forEachChild(node, visit);
  }
  visit(cls); assert.equal(touch.length, 1); assert.ok(ts.isArrowFunction(touch[0]));
  const normalize = (body, file, local, publicName) => {
    const code = emit('function replay(event){' + body.statements.map(s => s.getText(file)).join('\n') + '}');
    const output = parse('replay.mjs', code), fn = output.statements.find(ts.isFunctionDeclaration);
    const printed = print(fn.body, output);
    return local === publicName ? printed : printed.replaceAll(local, publicName);
  };
  const comparisons = [];
  for (const [name, oldBody] of [[names[0], oldMouse.body], [names[1], touch[0].body]]) {
    const own = members.get(name), body = ts.isMethodDeclaration(own.member) ? own.member.body : own.member.initializer.body;
    const original = normalize(oldBody, source, name, name), candidate = normalize(body, own.source, own.local_name, name);
    assert.equal(candidate, original, 'owned fake-event handler differs from untouched menu');
    comparisons.push({name, tagged_member_sha256: entry.sha256, handler_body_sha256: sha(original), owned_body_matches_tag: true});
  }
  return comparisons;
}

export function exerciseScreenReaderHelpers(api) {
  const receipts = [];
  for (const buttons of [-1, 0, 1, 2]) for (const detail of [-1, 0, 1, 2]) {
    const reads = [], event = {};
    for (const [key, value] of [['buttons', buttons], ['detail', detail]]) Object.defineProperty(event, key, {get() {reads.push(key); return value;}});
    for (const key of ['offsetX', 'offsetY']) Object.defineProperty(event, key, {get() {throw Error('layout coordinate read');}});
    const expected = buttons === 0 || detail === 0;
    assert.equal(api[names[0]](event), expected);
    assert.deepEqual(reads, buttons === 0 ? ['buttons'] : ['buttons', 'detail']);
    receipts.push(['mouse', buttons, detail, expected, reads]);
  }
  const radii = [undefined, null, 0, 1, 2];
  for (const identifier of [-1, 0, 1]) for (const radiusX of radii) for (const radiusY of radii) {
    const touch = {identifier, radiusX, radiusY};
    for (const changed of [false, true]) {
      const event = changed ? {touches: [], changedTouches: [touch]} : {touches: [touch], changedTouches: []};
      const expected = identifier === -1 && (radiusX == null || radiusX === 1) && (radiusY == null || radiusY === 1);
      assert.equal(api[names[1]](event), expected); receipts.push(['touch', identifier, radiusX, radiusY, changed, expected]);
    }
  }
  for (const event of [{}, {touches: [], changedTouches: []}, {touches: [{identifier: 0}], changedTouches: [{identifier: -1}]}]) {
    assert.equal(api[names[1]](event), false); receipts.push(['empty-or-primary-real', event, false]);
  }
  return {mouse_cases: 16, touch_cases: 153, receipt_sha256: sha(JSON.stringify(receipts)), layout_coordinate_reads: 0};
}

async function replayMenu(model, members, api) {
  const imports = [...members].map(([name, row]) => name + (row.local_name === name ? '' : ' as ' + row.local_name)).join(', ');
  const code = emit(`import {${imports}} from '${moduleName}';export class Replay {${[...members.values()].map(r => r.member.getText(r.source)).join('\n')}}`);
  const bridge = new SyntheticModule(names, function() {for (const name of names) this.setExport(name, api[name]);});
  const module = new SourceTextModule(code); await module.link(spec => {assert.equal(spec, moduleName); return bridge;}); await module.evaluate();
  const receipts = [];
  for (const [buttons, detail] of [[0, 1], [1, 0], [1, 1]]) for (const button of [0, 1, 2])
    for (const submenu of [false, true]) for (const prior of [undefined, 'keyboard']) {
      const instance = new module.namespace.Replay(); instance._openedBy = prior; instance.triggersSubmenu = () => submenu;
      let prevented = 0; const event = {buttons, detail, button, preventDefault() {prevented++;}};
      for (const key of ['offsetX', 'offsetY']) Object.defineProperty(event, key, {get() {throw Error('owned handler read a layout coordinate');}});
      instance._handleMousedown(event);
      const fake = buttons === 0 || detail === 0;
      assert.equal(instance._openedBy, fake ? prior : button === 0 ? 'mouse' : undefined);
      assert.equal(prevented, !fake && submenu ? 1 : 0);
      receipts.push(['mouse', buttons, detail, button, submenu, prior, instance._openedBy, prevented]);
    }
  for (const identifier of [-1, 0]) for (const prior of [undefined, 'keyboard']) for (const changed of [false, true]) {
    const instance = new module.namespace.Replay(); instance._openedBy = prior;
    const event = changed ? {changedTouches: [{identifier}]} : {touches: [{identifier}]};
    instance._handleTouchStart(event); assert.equal(instance._openedBy, identifier === -1 ? prior : 'touch');
    receipts.push(['touch', identifier, prior, changed, instance._openedBy]);
  }
  return {line: model.subject.line, mouse_cases: 36, touch_cases: 8, receipt_sha256: sha(JSON.stringify(receipts)),
    exact_owned_handlers_replayed: true, whole_angular_class_constructed: false, native_focus_or_view_executed: false};
}

export async function reviewScreenReaderEventUses({root = rootDefault, readSource, subjects, runtimeOverrides} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const callers = inspectCallers(root, read), tagged = taggedMenuBodies(root, callers.menuMembers);
  const own = !subjects, loaded = subjects || await keyManagerPublicSubjects(root);
  try {
    const contracts = loaded.models.map(inspectPeer), original = contracts.find(c => c.line === 'original');
    for (const contract of contracts) for (const helper of contract.helpers) {
      const historical = original.helpers.find(h => h.name === helper.name);
      // Retain the complete expression tree while ignoring emitter parentheses/comments.
      assert.equal(helper.body_syntax_sha256, historical.body_syntax_sha256);
      assert.equal(helper.declaration, historical.declaration);
    }
    const helpers = [], delegations = [];
    for (const model of loaded.models) {
      const api = runtimeOverrides?.[model.subject.line] || model.runtime;
      helpers.push({line: model.subject.line, ...exerciseScreenReaderHelpers(api)});
      delegations.push(await replayMenu(model, callers.menuMembers, api));
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
    const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
    assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + contracts.find(c => c.line === line).cdk_version);
    const patchPath = 'compatibility/f10/disposition-ledger/evidence/patches/737c7a8f1a5bc4df0e790d3ecdd227f8342499f8.patch';
    const patch = readFileSync(join(root, patchPath)); assert.equal(sha(patch), '3b851d3ccee1db729cd51680182d3832947fec5533e30bb18f851d6813325e20');
    return {schema_version: 1, line, node: process.version, compiler: ts.version,
      upstream_sha: '737c7a8f1a5bc4df0e790d3ecdd227f8342499f8', patch_path: patchPath, patch_sha256: sha(patch),
      public_subjects_sha256: loaded.capsule_sha256, cases: callers.cases, contracts, tagged_menu_bodies: tagged,
      helpers, delegations, runtime_override_used: !!runtimeOverrides, source_override_used: !!readSource,
      original_already_has_detail_based_fix: true, rxjs: loaded.rxjs,
      limits: ['Complete genuine original/minimum public a11y modules are executed with existing authenticated Core/compiler capsules and borrowed host RxJS.',
        'Only the two exact historical menu handler bodies are replayed with explicit input-origin/submenu protocols; no complete Angular component construction, native focus, screen reader/browser, packed consumer or runtime-floor pass.',
        'The upstream test-helper default/detail changes exercise the same predicate. No unrelated focus-monitor, drag/drop, input-modality or whole ripple behavior is claimed.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
