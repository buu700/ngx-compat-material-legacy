/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine QueryList collection/change contracts and historical owned query consumers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {elementRefSubjects} from './element-ref-use-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), {startWith} = require('rxjs/operators');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..'), moduleName = '@angular/core';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const originalHash = '6a507a2d9b0d339af8f47261ad2451305cf96001d305511e0de524c7504bc85d';
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function unique(nodes, label) {assert.equal(nodes.length, 1, label); return nodes[0];}
function stable(node) {assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable QueryList declaration');}
function tokens(text) {
  const source = parse('contract.ts', text), out = [];
  function visit(node) {const children = node.getChildren(source); if (children.length) children.forEach(visit); else if (node.kind !== ts.SyntaxKind.EndOfFileToken) out.push([node.kind, node.getText(source)]);}
  visit(source); return out.filter((t, i) => !(t[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));
}
const contract = text => tokens('class Boundary {' + text + '}');
export async function queryListSubjects(root = defaultRoot) {
  const loaded = await elementRefSubjects(root);
  try {
    for (const model of loaded.models) {
      const files = [...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, text]) => parse(p, text));
      const runtimeFile = unique(files.filter(s => s.fileName.endsWith('.mjs') && s.statements.some(n => ts.isClassDeclaration(n) && n.name?.text === 'QueryList')), 'whole QueryList class');
      const cls = runtimeFile.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'QueryList');
      assert.equal(Function.prototype.toString.call(model.runtime.QueryList), cls.getText(runtimeFile), 'public runtime QueryList identity');
      const typeFile = unique(files.filter(s => s.fileName.endsWith('.d.ts') && s.statements.some(n => ts.isClassDeclaration(n) && n.name?.text === 'QueryList')), 'whole QueryList declaration');
      const declaration = typeFile.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'QueryList'); stable(declaration); declaration.members.forEach(stable);
      const original = model.subject.line === 'original', privateDirty = declaration.members.filter(n => n.name?.text === '_onDirty'); assert.equal(privateDirty.length, original ? 0 : 1);
      if (!original) assert.ok(privateDirty[0].modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) && privateDirty[0].questionToken && !privateDirty[0].type);
      const projected = ts.factory.updateClassDeclaration(declaration, undefined, declaration.name, declaration.typeParameters, declaration.heritageClauses, declaration.members.filter(n => !privateDirty.includes(n)));
      const shape = print(projected, typeFile);
      const methods = cls.members.filter(ts.isMethodDeclaration), getters = cls.members.filter(ts.isGetAccessorDeclaration), fields = cls.members.filter(ts.isPropertyDeclaration), ctor = unique(cls.members.filter(ts.isConstructorDeclaration), 'QueryList ctor');
      const common = ['get', 'map', 'filter', 'find', 'reduce', 'forEach', 'some', 'toArray', 'toString'];
      assert.deepEqual(methods.map(m => m.name.getText(runtimeFile)), [...common, 'reset', 'notifyOnChanges', ...(!original ? ['onDirty'] : []), 'setDirty', 'destroy']);
      assert.deepEqual(getters.map(m => m.name.text), ['changes']); assert.equal(cls.heritageClauses, undefined);
      const commonBodies = common.map(name => contract(print(methods.find(m => m.name.text === name), runtimeFile)));
      let reset = print(methods.find(m => m.name.text === 'reset'), runtimeFile);
      if (original) {assert.ok(reset.includes('const self = this;')); reset = reset.replace('const self = this;', '').replaceAll('self.', 'this.');}
      const helpers = {};
      for (const name of ['arrayEquals', 'flatten', 'symbolIterator']) {
        const found = files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name).map(n => ({source: s, node: n}))); const helper = unique(found, 'complete query helper ' + name); helpers[name] = tokens(print(helper.node, helper.source));
      }
      const ctorExpected = original ? `constructor(_emitDistinctChangesOnly = false) {this._emitDistinctChangesOnly = _emitDistinctChangesOnly;this.dirty = true;this._results = [];this._changesDetected = false;this._changes = null;this.length = 0;this.first = undefined;this.last = undefined;const proto = QueryList.prototype;if (!proto[Symbol.iterator]) proto[Symbol.iterator] = symbolIterator;}` : 'constructor(_emitDistinctChangesOnly = false) {this._emitDistinctChangesOnly = _emitDistinctChangesOnly;}';
      assert.deepEqual(contract(print(ctor, runtimeFile)), contract(ctorExpected));
      assert.deepEqual(fields.map(f => print(f, runtimeFile)), original ? [] : ['_emitDistinctChangesOnly;', 'dirty = true;', '_onDirty = undefined;', '_results = [];', '_changesDetected = false;', '_changes = undefined;', 'length = 0;', 'first = undefined;', 'last = undefined;', '[Symbol.iterator] = (() => symbolIterator)();']);
      const blocks = cls.members.filter(ts.isClassStaticBlockDeclaration); assert.equal(blocks.length, original ? 1 : 0);
      if (original) assert.deepEqual(contract(print(blocks[0], runtimeFile)), contract('static {Symbol.iterator;}'));
      assert.equal(cls.members.length, 1 + methods.length + getters.length + fields.length + blocks.length);
      const changed = {changes: print(getters[0], runtimeFile)};
      assert.deepEqual(contract(changed.changes), contract(original ? 'get changes() {return this._changes || (this._changes = new EventEmitter());}' : 'get changes() {return this._changes ??= new Subject();}'));
      for (const [name, old, current] of [
        ['notifyOnChanges', 'notifyOnChanges() {if (this._changes && (this._changesDetected || !this._emitDistinctChangesOnly)) this._changes.emit(this);}', 'notifyOnChanges() {if (this._changes !== undefined && (this._changesDetected || !this._emitDistinctChangesOnly)) this._changes.next(this);}'],
        ['setDirty', 'setDirty() {this.dirty = true;}', 'setDirty() {this.dirty = true;this._onDirty?.();}'],
        ['destroy', 'destroy() {this.changes.complete();this.changes.unsubscribe();}', 'destroy() {if (this._changes !== undefined) {this._changes.complete();this._changes.unsubscribe();}}'],
      ]) {changed[name] = print(methods.find(m => m.name.text === name), runtimeFile); assert.deepEqual(contract(changed[name]), contract(original ? old : current));}
      if (!original) {changed.onDirty = print(methods.find(m => m.name.text === 'onDirty'), runtimeFile); assert.deepEqual(contract(changed.onDirty), contract('onDirty(cb) {this._onDirty = cb;}'));}
      model.query_contract = {runtime_file: runtimeFile.fileName, whole_class_sha256: hash(cls.getText(runtimeFile)), historical_declaration: shape, declaration_private_addition: privateDirty.length ? print(privateDirty[0], typeFile) : null, common_bodies: commonBodies, reset: contract(reset), helpers, changed_methods: changed, constructor: print(ctor, runtimeFile), iterator_placement: original ? 'base prototype, conditional constructor registration' : 'own instance data field'};
    }
    const original = loaded.models.find(m => m.subject.line === 'original');
    for (const model of loaded.models) for (const name of ['historical_declaration', 'common_bodies', 'reset', 'helpers']) assert.deepEqual(model.query_contract[name], original.query_contract[name], 'historical complete query contract changed: ' + name);
    assert.equal(loaded.models[1].query_contract.whole_class_sha256, loaded.models[2].query_contract.whole_class_sha256);
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
export function exerciseQueryList(core, Query = core.QueryList) {
  const cases = [], first = {id: 1}, second = {id: 2}, third = {id: 3}, q = new Query();
  assert.equal(q.dirty, true); assert.equal(q.length, 0); assert.equal(q.first, undefined); assert.equal(q.last, undefined); assert.deepEqual([...q], []); cases.push('initial-empty-dirty-and-iterator');
  q.reset([first, [[second]], third]); assert.equal(q.dirty, false); assert.equal(q.length, 3); assert.equal(q.first, first); assert.equal(q.last, third); assert.equal(q.get(1), second); assert.equal(q.get(-1), undefined); assert.equal(q.get(3), undefined); cases.push('recursive-flatten-boundaries-and-object-identity');
  const visits = []; assert.deepEqual(q.map((v, i, array) => {assert.equal(array[i], v); visits.push(v); return v.id + i;}), [1, 3, 5]); assert.deepEqual(visits, [first, second, third]); cases.push('map-order-index-array-and-result');
  assert.deepEqual(q.filter((v, i, array) => {assert.equal(array[i], v); return v.id > 1;}), [second, third]); assert.equal(q.find(v => v.id === 2), second); assert.equal(q.find(() => false), undefined); assert.equal(q.some(v => v.id === 3), true); assert.equal(q.some(() => false), false); cases.push('filter-find-some-predicates');
  assert.equal(q.reduce((sum, v, i, array) => {assert.equal(array[i], v); return sum + v.id;}, 10), 16); const seen = []; assert.equal(q.forEach(v => seen.push(v)), undefined); assert.deepEqual(seen, [first, second, third]); cases.push('reduce-initial-value-and-forEach-order');
  const copy = q.toArray(); assert.deepEqual(copy, [first, second, third]); copy.pop(); assert.equal(q.length, 3); assert.equal(q.get(2), third); assert.equal(q.toString(), [first, second, third].toString()); cases.push('copied-array-and-string');
  const changes = q.changes, notifications = []; assert.equal(q.changes, changes); const subscription = changes.subscribe(v => notifications.push(v)); q.notifyOnChanges(); assert.equal(notifications[0], q); cases.push('lazy-stable-synchronous-change-stream-self-payload');
  q.reset([first, second, third]); q.notifyOnChanges(); assert.equal(notifications.length, 2); cases.push('default-recomputed-equal-query-notification');
  const distinct = new Query(true), events = []; distinct.changes.subscribe(v => events.push(v)); distinct.reset([first]); distinct.notifyOnChanges(); distinct.reset([first]); distinct.notifyOnChanges(); assert.equal(events.length, 1); distinct.reset([second]); distinct.notifyOnChanges(); assert.equal(events.length, 2); cases.push('explicit-distinct-change-mode');
  const replacement = {id: 2}; distinct.reset([replacement], v => v.id); distinct.notifyOnChanges(); assert.equal(events.length, 2); assert.equal(distinct.first, second); cases.push('identity-accessor-retains-previous-objects-for-equal-identities');
  const reordered = new Query(true); reordered.changes.subscribe(() => {}); reordered.reset([first, second]); reordered.notifyOnChanges(); reordered.reset([second, first]); assert.equal(reordered.first, second); assert.equal(reordered.last, first); cases.push('order-change-detected');
  q.setDirty(); assert.equal(q.dirty, true); q.reset([]); assert.equal(q.dirty, false); assert.equal(q.length, 0); assert.equal(q.first, undefined); assert.equal(q.last, undefined); cases.push('dirty-reset-and-cleared-endpoints');
  const failure = new Error('query callback'); q.reset([first]); assert.throws(() => q.map(() => {throw failure;}), error => error === failure); assert.throws(() => q.reset([second], () => {throw failure;}), error => error === failure); cases.push('collection-and-identity-callback-error-identity');
  let completed = 0; changes.subscribe({complete() {completed++;}}); q.destroy(); assert.equal(completed, 1); assert.equal(subscription.closed, true); distinct.destroy(); reordered.destroy(); cases.push('destroy-completes-allocated-stream-and-closes-subscriptions');
  const original = core.VERSION.full.startsWith('16.'), empty = new Query(); empty.destroy(); let late;
  try {late = empty.changes.subscribe(() => {}); assert.equal(original, false);} catch (error) {assert.equal(original, true); assert.equal(error.name, 'ObjectUnsubscribedError');}
  late?.unsubscribe(); if (!original) empty.destroy(); cases.push('measured-destroy-before-stream-allocation-difference');
  let accessorCalls = 0; class UnsupportedAccessor extends Query {get [Symbol.iterator]() {accessorCalls++; return () => [][Symbol.iterator]();}}
  const derived = new UnsupportedAccessor(); derived.reset([first]); assert.deepEqual([...derived], original ? [] : [first]); assert.equal(accessorCalls, original ? 1 : 0); derived.destroy(); cases.push('measured-unsupported-js-iterator-accessor-difference');
  const query = new Query(), read = core.signal(1); query.changes.subscribe(() => read()); let runs = 0; const computed = core.computed(() => {runs++; query.notifyOnChanges(); return 1;}); computed(); read.set(2); computed(); assert.equal(runs, 2); query.destroy(); cases.push('query-change-listener-signal-reads-retain-historical-tracking');
  return {cases, changes_runtime_kind: original ? 'EventEmitter' : 'Subject', destroy_before_changes_subscription: original ? 'throws ObjectUnsubscribedError' : 'new live stream', unsupported_js_iterator_accessor_calls: accessorCalls, native_query_lifecycle_executed: false};
}
function emitted(text) {return ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}}).outputText.trim();}
function method(source, name) {const nodes = []; function visit(n) {if (ts.isMethodDeclaration(n) && n.name?.text === name) nodes.push(n); ts.forEachChild(n, visit);} visit(source); return unique(nodes, 'whole owned query consumer ' + name);}
function fn(source, name) {return unique(source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name), 'whole query helper ' + name);}
export function ownedQueryContexts(root = defaultRoot, readSource) {
  const capsuleBytes = readFileSync(join(root, 'compatibility/rc/query-list-original-subjects.json')); assert.equal(hash(capsuleBytes), originalHash); const capsule = JSON.parse(capsuleBytes), originals = {};
  assert.equal(capsule.commit, 'df60e733c60e572ba538f6ad0ceff3e63e527b53');
  for (const member of capsule.members) {const stored = readFileSync(join(root, member.path)); assert.equal(hash(stored), member.stored_sha256); const raw = gunzipSync(stored); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes); originals[member.name] = parse(member.original_path, raw.toString());}
  const read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8'), contexts = [];
  for (const [id, file, name] of [['menu', 'legacy-menu/internal/menu-base.ts', '_updateDirectDescendants'], ['tabs', 'legacy-tabs/internal/tab-group-base.ts', '_subscribeToAllTabChanges']]) {
    const source = parse(file, read('projects/ngx-material-legacy/' + file));
    const original = 'class Context {' + print(method(originals[id], name), originals[id]) + '}', owned = 'class Context {' + print(method(source, name), source) + '}'; assert.deepEqual(tokens(emitted(owned)), tokens(emitted(original)), 'whole query consumer differs from original: ' + id);
    contexts.push({id, file, original_sha256: hash(original), candidate_source_sha256: hash(source.text), source_equal_after_type_erasure: true, original: new Function('startWith', emitted(original) + '; return Context;')(startWith).prototype[name], owned: new Function('startWith', emitted(owned) + '; return Context;')(startWith).prototype[name]});
  }
  for (const [id, file, oldName, newName, extras] of [['option', 'legacy-core/option/option-helpers.ts', '_countGroupLabelsBeforeOption', '_countGroupLabelsBeforeOption', []], ['line', 'legacy-core/internal/line/line.ts', 'setLines', 'legacySetLines', ['setClass']]]) {
    const source = parse(file, read('projects/ngx-material-legacy/' + file));
    const parts = (s, name) => [print(fn(s, name), s).replace(/^export /, '').replace('function ' + name + '(', 'function Context('), ...extras.map(n => print(fn(s, n), s))].join('\n');
    const original = parts(originals[id], oldName), owned = parts(source, newName); assert.deepEqual(tokens(emitted(owned)), tokens(emitted(original)), 'whole query helper differs from original: ' + id);
    contexts.push({id, file, original_sha256: hash(original), candidate_source_sha256: hash(source.text), source_equal_after_type_erasure: true, original: new Function('startWith', emitted(original) + '; return Context;')(startWith), owned: new Function('startWith', emitted(owned) + '; return Context;')(startWith)});
  }
  return contexts;
}
export function exerciseOwnedQueries(Query, contexts) {
  const receipts = [];
  for (const context of contexts) for (const version of ['original', 'owned']) {
    const action = context[version], cases = [];
    if (context.id === 'menu' || context.id === 'tabs') {
      const all = new Query(), direct = new Query(), notifications = [], owner = {}, other = {}, field = context.id === 'menu' ? '_parentMenu' : '_closestTabGroup';
      const a = {[field]: owner}, b = {[field]: other}, c = {[field]: owner}, loose = {};
      Object.assign(owner, context.id === 'menu' ? {_allItems: all, _directDescendantItems: direct} : {_allTabs: all, _tabs: direct}); direct.changes.subscribe(v => notifications.push(v)); action.call(owner); assert.equal(notifications.length, 1); assert.equal(notifications[0], direct); assert.equal(direct.length, 0); cases.push('startWith-empty-initial-notification');
      all.reset([a, b, c, loose]); all.notifyOnChanges(); assert.deepEqual(direct.toArray(), context.id === 'menu' ? [a, c] : [a, c, loose]); assert.equal(notifications.length, 2); cases.push('nested-parent-filter-and-order');
      all.reset([c, a]); all.notifyOnChanges(); assert.deepEqual(direct.toArray(), [c, a]); assert.equal(notifications.length, 3); assert.equal(notifications[2], direct); cases.push('dynamic-reorder-synchronous-own-query-payload');
      all.reset([c, a]); all.notifyOnChanges(); assert.equal(notifications.length, 4); cases.push('default-recompute-notification-retained');
      all.destroy(); const before = notifications.length; assert.equal(before, 4); direct.destroy(); cases.push('source-stream-and-owned-query-destroy');
    } else if (context.id === 'option') {
      const options = new Query(), groups = new Query(), a = {}, b = {}; groups.reset([a, b]); options.reset([{group: a}, {group: a}, {group: b}, {}]); assert.equal(action(0, options, groups), 1); assert.equal(action(1, options, groups), 1); assert.equal(action(2, options, groups), 2); cases.push('group-label-counts-use-object-identity'); groups.reset([]); assert.equal(action(2, options, groups), 0); cases.push('no-groups-zero'); options.destroy(); groups.destroy();
    } else {
      const lines = new Query(), classes = new Set(['mat-2-line', 'mat-3-line', 'mat-multi-line']), element = {nativeElement: {classList: {toggle(name, add) {if (add) classes.add(name); else classes.delete(name);}}}};
      action(lines, element); assert.equal(classes.size, 0); cases.push('initial-startWith-clears-stale-line-classes');
      for (const [length, expected] of [[2, ['mat-2-line']], [3, ['mat-3-line']], [4, ['mat-multi-line']], [1, []]]) {lines.reset(Array.from({length}, () => ({}))); lines.notifyOnChanges(); assert.deepEqual([...classes], expected);} cases.push('line-count-change-updates-historical-selectors');
      lines.destroy(); cases.push('query-destroy-completes-line-stream');
    }
    receipts.push({context: context.id, version, cases});
  }
  return receipts;
}
export function compileQueryTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(path), receipts = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'query-consumer.ts'), code = `import {QueryList} from '@angular/core';import type {Observable} from 'rxjs';
const query = new QueryList<{id:number}>();const distinct = new QueryList<number>(true);const iterable:Iterable<{id:number}>=query;const changes:Observable<any>=query.changes;
query.reset([{id:1},[{id:2}]],v=>v.id);query.notifyOnChanges();query.setDirty();query.destroy();const maybe:{id:number}|undefined=query.get(0);const values:number[]=query.map(v=>v.id);const found:{id:number}|undefined=query.find(v=>v.id===1);const selected:{id:number}[]=query.filter(v=>v.id>0);const sum:number=query.reduce((n,v)=>n+v.id,0);const any:boolean=query.some(v=>v.id>0);query.forEach(v=>v.id);
const union = new QueryList<string|number>();const numbers:number[]=union.filter((v):v is number=>typeof v==='number');
// @ts-expect-error Distinct mode is boolean.
new QueryList('true');
// @ts-expect-error Public readonly collection metadata is not writable.
query.length=1;
// @ts-expect-error Changes is an Observable, not a public EventEmitter API.
query.changes.emit(query);
// @ts-expect-error Dirty callback registration is not declared public.
query.onDirty(()=>{});
class UnsupportedAccessor extends QueryList<number>{
// @ts-expect-error The declared iterator data field cannot be replaced by an accessor.
get [Symbol.iterator](){return ()=>[][Symbol.iterator]();}}
`;
    writeFileSync(file, code); const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']}); const diagnostics = compiler.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'})); receipts.push({line: model.subject.line, negative_checks: 5, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}
export async function reviewQueryListUses({root = defaultRoot, readSource, subjects, compilerRoot, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash); const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && u.symbol === 'QueryList'); assert.equal(uses.length, 21);
  const own = !subjects, loaded = subjects ?? await queryListSubjects(root), read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  try {
    const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n'); const actual = paths.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => (i.propertyName || i.name).text === 'QueryList'))); assert.equal(actual.length, 21); assert.deepEqual(actual.map(p => p.slice('projects/ngx-material-legacy/'.length)).sort(), uses.map(u => u.file).sort());
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy'); host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
    const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], constructors = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path));
      const imported = unique(source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === 'QueryList')), 'missing/ambiguous query import'); const symbol = checker.getSymbolAtLocation(imported.name); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported, 'query import shadowed'); const references = [];
      function visit(node) {
        if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          const parent = node.parent; assert.equal(parent.typeArguments?.length, 1, 'typed query boundary'); let kind, member = null;
          if (ts.isTypeReferenceNode(parent) && parent.typeName === node) kind = 'query-type'; else {
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime query imported type only'); assert.ok(ts.isNewExpression(parent) && parent.expression === node, 'unreviewed query alias/subclass/runtime use'); assert.ok(ts.isPropertyDeclaration(parent.parent) && parent.parent.initializer === parent && ts.isIdentifier(parent.parent.name), 'unreviewed query constructor owner'); assert.equal(parent.arguments.length, 0, 'historical query uses default notification mode'); member = parent.parent.name.text; assert.ok(['legacy-menu/internal/menu-base.ts:_directDescendantItems', 'legacy-tabs/internal/tab-group-base.ts:_tabs'].includes(file + ':' + member), 'unreviewed query construction'); kind = 'owned-query-construction'; constructors.push({source, expression: parent, local_name: imported.name.text, file, member});
          }
          references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, expression: parent.getText(source), member});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); let unused = null;
      if (!references.length) {
        assert.equal(file, 'legacy-core/option/option-base.ts', 'unreviewed unused query import'); const named = imported.parent, kept = named.elements.filter(e => e !== imported), changed = source.text.slice(0, named.getStart(source)) + '{' + kept.map(e => e.getText(source)).join(', ') + (named.elements.hasTrailingComma ? ',' : '') + '}' + source.text.slice(named.end); const emit = t => ts.transpileModule(t, {compilerOptions: {...options, removeComments: true, emitDecoratorMetadata: false}}).outputText; assert.equal(hash(emit(source.text)), hash(emit(changed)), 'unused query import changes runtime emit'); unused = {emit_sha256: hash(emit(source.text)), emitter: ts.version, metadata_mode: false};
      }
      cases.push({file, module: moduleName, symbol: 'QueryList', local_name: imported.name.text, candidate_source_sha256: hash(source.text), references, unused_import_erasure: unused});
    }
    assert.equal(constructors.length, 2); const contexts = ownedQueryContexts(root, readSource), behaviors = [], owned = [];
    if (!skipDiagnostics) for (const model of loaded.models) {behaviors.push({line: model.subject.line, ...exerciseQueryList(model.runtime)}); owned.push({line: model.subject.line, receipts: exerciseOwnedQueries(model.runtime.QueryList, contexts)}); for (const c of constructors) {const q = new Function(c.local_name, emitted('return ' + c.expression.getText(c.source) + ';'))(model.runtime.QueryList); q.destroy();}}
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + loaded.models.find(m => m.subject.line === line).subject.version);
    return {schema_version: 1, line, frozen_uses: 21, current_uses: 21, current_delta_uses: 0, node: process.version, binding_parser: ts.version, cases, behaviors, owned_contexts: contexts.map(({original, owned, ...c}) => c), owned_executions: owned, rxjs: loaded.rxjs, source_override_used: !!readSource,
      subjects: loaded.models.map(m => ({subject: {...m.subject, members: undefined}, query_contract: {...m.query_contract, common_bodies: undefined, reset: undefined, helpers: undefined, common_bodies_sha256: hash(JSON.stringify(m.query_contract.common_bodies)), reset_sha256: hash(JSON.stringify(m.query_contract.reset)), helpers_sha256: hash(JSON.stringify(m.query_contract.helpers))}})), type_compilation: skipDiagnostics ? null : compileQueryTypes(loaded.models, compilerRoot),
      limits: ['Genuine public dependency and four complete original/owned source consumers with controlled query/item/classList contexts, not native Angular query discovery/rendering/full component lifecycle.', 'Original/current lazy stream destruction and unsupported JS iterator subclass differences are explicit; historical public types and allocated-stream protocols preserved. Internal onDirty source inspected, not adopted.', 'Borrowed RxJS7.8.2/host Node source diagnostics; packed/AOT/browser/application queries and full peer/RxJS/Node floors remain open.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
