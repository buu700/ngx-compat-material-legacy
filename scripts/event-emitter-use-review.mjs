/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public EventEmitter contracts and exact synchronous/asynchronous owned uses. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {elementRefSubjects} from './element-ref-use-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleName = '@angular/core', seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const deltaFiles = ['internal/testing/owned-test-events.ts', 'legacy-menu/internal/menu-panel.ts'];
const asyncNames = ['legacy-tabs/internal/tab-body-base.ts:_onCentered', 'legacy-tabs/internal/tab-group-base.ts:selectedTabChange'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;}
function stable(node) {assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable public emitter surface');}
function normalized(text) {
  const source = parse('contract.ts', text), out = [];
  function visit(node) {const children = node.getChildren(source); if (children.length) children.forEach(visit); else if (node.kind !== ts.SyntaxKind.EndOfFileToken) out.push([node.kind, node.getText(source)]);}
  visit(source);
  return out.filter((token, i) => !(token[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));
}
const contract = text => normalized('class Boundary {' + text + '}');
function unique(nodes, label) {assert.equal(nodes.length, 1, label); return nodes[0];}
export async function eventEmitterSubjects(root = defaultRoot) {
  const loaded = await elementRefSubjects(root);
  try {
    for (const model of loaded.models) {
      const files = [...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, text]) => parse(p, text));
      const runtimeFile = unique(files.filter(s => s.fileName.endsWith('.mjs') && s.statements.some(n => ts.isClassDeclaration(n) && n.name?.text === 'EventEmitter_')), 'whole emitter class');
      const cls = runtimeFile.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'EventEmitter_');
      assert.equal(Function.prototype.toString.call(model.runtime.EventEmitter), cls.getText(runtimeFile), 'public exported emitter class identity');
      const typeFile = unique(files.filter(s => s.fileName.endsWith('.d.ts') && s.statements.some(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'EventEmitter')), 'public emitter declaration');
      const declaration = typeFile.statements.find(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'EventEmitter');
      stable(declaration); declaration.members.forEach(stable);
      const publicConstructor = unique(typeFile.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === 'EventEmitter'), 'public constructor overloads');
      stable(publicConstructor); stable(publicConstructor.parent.parent);
      const original = model.subject.line === 'original';
      assert.deepEqual(declaration.heritageClauses[0].types.map(t => t.getText(typeFile)), original ? ['Subject<T>'] : ['Subject<T>', 'OutputRef<T>']);
      const ctor = unique(cls.members.filter(ts.isConstructorDeclaration), 'runtime constructor');
      const methods = cls.members.filter(ts.isMethodDeclaration), fields = cls.members.filter(ts.isPropertyDeclaration);
      assert.deepEqual(methods.map(m => m.name.text), original ? ['emit', 'subscribe'] : ['emit', 'subscribe', 'wrapInTimeout']);
      assert.deepEqual(fields.map(f => f.name.text), original ? [] : ['__isAsync', 'destroyRef', 'pendingTasks']);
      assert.equal(cls.members.length, 1 + methods.length + fields.length);
      assert.equal(print(cls.heritageClauses[0], runtimeFile), 'extends Subject');
      const expectedConstructor = original ? `constructor(isAsync = false) {super(); this.__isAsync = isAsync;}` : `constructor(isAsync = false) {super(); this.__isAsync = isAsync; if (isInInjectionContext()) {this.destroyRef = inject(DestroyRef, {optional: true}) ?? undefined; this.pendingTasks = inject(PendingTasksInternal, {optional: true}) ?? undefined;}}`;
      assert.deepEqual(contract(print(ctor, runtimeFile)), contract(expectedConstructor));
      if (!original) assert.deepEqual(fields.map(f => print(f, runtimeFile)), ['__isAsync;', 'destroyRef = undefined;', 'pendingTasks = undefined;']);
      const emit = methods.find(m => m.name.text === 'emit');
      assert.deepEqual(contract(print(emit, runtimeFile)), contract(original ? 'emit(value) {super.next(value);}' : 'emit(value) {const prevConsumer = setActiveConsumer$1(null); try {super.next(value);} finally {setActiveConsumer$1(prevConsumer);}}'));
      const subscribe = print(methods.find(m => m.name.text === 'subscribe'), runtimeFile).replaceAll('this.wrapInTimeout', '_wrapInTimeout');
      const wrap = original ? print(unique(runtimeFile.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === '_wrapInTimeout'), 'historical timeout helper'), runtimeFile) : print(methods.find(m => m.name.text === 'wrapInTimeout'), runtimeFile);
      assert.deepEqual(normalized(original ? wrap : 'class Boundary {' + wrap + '}'), normalized(original ? 'function _wrapInTimeout(fn) {return (value) => {setTimeout(fn, undefined, value);};}' : 'class Boundary {wrapInTimeout(fn) {return value => {const taskId = this.pendingTasks?.add(); setTimeout(() => {try {fn(value);} finally {if (taskId !== undefined) {this.pendingTasks?.remove(taskId);}}});};}}'));
      let output = null;
      if (!original) {
        const outputFile = unique(files.filter(s => s.fileName.endsWith('.d.ts') && s.statements.some(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'OutputRef')), 'OutputRef closure');
        const outputNode = outputFile.statements.find(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'OutputRef'); stable(outputNode); outputNode.members.forEach(stable);
        output = print(outputNode, outputFile);
        assert.equal(output, 'interface OutputRef<T> {\n    subscribe(callback: (value: T) => void): OutputRefSubscription;\n}');
        const subscriptionNode = unique(outputFile.statements.filter(n => ts.isInterfaceDeclaration(n) && n.name?.text === 'OutputRefSubscription'), 'OutputRefSubscription closure');
        stable(subscriptionNode); subscriptionNode.members.forEach(stable);
        assert.equal(print(subscriptionNode, outputFile), 'interface OutputRefSubscription {\n    unsubscribe(): void;\n}');
      }
      model.emitter_contract = {runtime_file: runtimeFile.fileName, whole_class_sha256: hash(cls.getText(runtimeFile)), declaration_members: declaration.members.map(n => print(n, typeFile)), constructor_declaration: print(publicConstructor, typeFile), subscriber: contract(subscribe), timeout_helper_sha256: hash(wrap), output_ref: output, constructor: print(ctor, runtimeFile), emit: print(emit, runtimeFile), timeout_helper: wrap};
    }
    const original = loaded.models.find(m => m.subject.line === 'original');
    for (const model of loaded.models) {
      assert.deepEqual(model.emitter_contract.declaration_members, original.emitter_contract.declaration_members);
      assert.equal(model.emitter_contract.constructor_declaration, original.emitter_contract.constructor_declaration);
      assert.deepEqual(model.emitter_contract.subscriber, original.emitter_contract.subscriber, 'subscriber changed outside timeout helper routing');
    }
    assert.equal(loaded.models[1].emitter_contract.whole_class_sha256, loaded.models[2].emitter_contract.whole_class_sha256, 'minimum emitter class bodies differ');
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
export async function exerciseEventEmitter(core, Emitter = core.EventEmitter) {
  const cases = [], value = {}, failure = new Error('emitter error'), e = new Emitter(), values = [];
  const a = e.subscribe(v => values.push(['a', v])), b = e.subscribe(v => values.push(['b', v]));
  e.emit(value); assert.deepEqual(values, [['a', value], ['b', value]]); assert.equal(values[0][1], value); cases.push('default-sync-order-payload-identity');
  b.unsubscribe(); e.emit(); assert.equal(values.length, 3); assert.equal(values[2][1], undefined); cases.push('unsubscribe-and-omitted-void-value');
  e.next(value); assert.equal(values[3][1], value); cases.push('inherited-subject-next');
  let completed = 0; e.subscribe({complete() {completed++;}}); e.complete(); e.emit(value); assert.equal(completed, 1); assert.equal(values.length, 4); assert.equal(a.closed, true); cases.push('complete-closes-and-stops-delivery');
  let late = 0; e.subscribe({complete() {late++;}}); assert.equal(late, 1); cases.push('late-completion-subscription');
  for (const async of [false, true]) {
    const emitter = new Emitter(async), order = [], observer = {next(v) {assert.equal(this, observer); assert.equal(v, value); order.push('next');}, error(v) {assert.equal(this, observer); assert.equal(v, failure); order.push('error');}, complete() {assert.equal(this, observer); order.push('complete');}};
    emitter.subscribe(observer); emitter.emit(value); emitter.complete();
    if (async) {assert.deepEqual(order, []); await tick();}
    assert.deepEqual(order, ['next', 'complete']); cases.push((async ? 'async' : 'sync') + '-observer-receiver-next-complete');
    const failed = new Emitter(async); failed.subscribe(observer); failed.error(failure);
    if (async) {assert.deepEqual(order, ['next', 'complete']); await tick();}
    assert.deepEqual(order, ['next', 'complete', 'error']); cases.push((async ? 'async' : 'sync') + '-observer-receiver-error-identity');
  }
  const async = new Emitter(true), queue = [], subscription = async.subscribe(v => queue.push(v)); async.emit(value); await Promise.resolve(); assert.equal(queue.length, 0); cases.push('async-not-sync-or-microtask');
  subscription.unsubscribe(); await tick(); assert.deepEqual(queue, [value]); cases.push('already-scheduled-not-cancelled-by-unsubscribe'); async.complete();
  const direct = new Emitter(), child = direct.subscribe(() => {}), another = new Emitter(); another.subscribe(child); child.unsubscribe(); assert.equal(direct.observers.length, 0); assert.equal(another.observers.length, 0); cases.push('subscription-parent-teardown'); direct.complete(); another.complete();
  const parent = core.Injector.create({providers: []}), inContext = core.runInInjectionContext(parent, () => new Emitter()), delivered = [];
  inContext.subscribe(v => delivered.push(v)); parent.destroy(); inContext.emit(value); assert.equal(delivered[0], value); inContext.complete(); cases.push('direct-subject-subscription-survives-context-destroy');
  const original = core.VERSION.full.startsWith('16.'), tracked = core.signal(1), after = core.signal(1), emitter = new Emitter(); let runs = 0;
  emitter.subscribe(() => tracked()); const computation = core.computed(() => {runs++; emitter.emit(); return after();}); computation(); tracked.set(2); computation(); assert.equal(runs, original ? 2 : 1); const before = runs; after.set(2); computation(); assert.equal(runs, before + 1); emitter.complete(); cases.push('measured-signal-tracking-difference-and-restoration');
  // The public DestroyRef environment hook returns the environment injector.
  // Compare against actual public inject(), not a replacement provider assumption.
  const injector = core.Injector.create({providers: []});
  try {
    const expected = core.runInInjectionContext(injector, () => core.inject(core.DestroyRef));
    const constructed = core.runInInjectionContext(injector, () => new Emitter(true));
    assert.ok(constructed.destroyRef === (original ? undefined : expected), 'actual public DestroyRef capture differs');
    assert.equal(constructed.pendingTasks, undefined);
    let destroyed = 0; expected.onDestroy(() => {destroyed++;}); injector.destroy();
    assert.equal(destroyed, 1); constructed.complete(); cases.push('optional-lifecycle-capture-public-environment-hook');
  } finally {if (!injector.destroyed) injector.destroy();}
  return {cases, signal_listener_reads_tracked: original, optional_destroy_ref_captured: !original, native_pending_tasks_executed: false};
}
export function compileEmitterTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(path), receipts = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'emitter-consumer.ts');
    const code = `import {EventEmitter} from '@angular/core'; import {Observable,Subscription} from 'rxjs';
const event = new EventEmitter<{id:number}>(); const async = new EventEmitter<void>(true); const sync = new EventEmitter<number>(false);
const typed:EventEmitter<{id:number}>=event; const observable:Observable<{id:number}>=event; const subscription:Subscription=event.subscribe(value=>value.id);
event.subscribe({next(value:{id:number}){value.id;},complete(){}});event.emit({id:1});event.emit();event.next({id:2});event.complete();async.emit();
// @ts-expect-error Async mode is boolean.
new EventEmitter('true');
// @ts-expect-error Typed payloads remain checked.
event.emit('bad');
// @ts-expect-error Subject.next payloads remain checked.
event.next('bad');
// @ts-expect-error Subscription is not the event payload.
const invalid:Subscription=event;
${model.subject.line === 'original' ? '' : "import type {OutputRef} from '@angular/core'; const output:OutputRef<{id:number}>=event; output.subscribe(v=>v.id).unsubscribe();\n"}`;
    writeFileSync(file, code); const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'}));
    receipts.push({line: model.subject.line, negative_checks: 4, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}
export async function reviewEventEmitterUses({root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && u.symbol === 'EventEmitter'); assert.equal(uses.length, 19);
  const own = !subjects, loaded = subjects ?? await eventEmitterSubjects(root), read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  try {
    const discovered = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
    const actual = discovered.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => (i.propertyName || i.name).text === 'EventEmitter')));
    assert.equal(actual.length, 21); assert.deepEqual(actual.map(p => p.slice('projects/ngx-material-legacy/'.length)).filter(p => !uses.some(u => u.file === p)).sort(), deltaFiles);
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy');
    host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
    const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], constructions = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path)); assert.ok(source);
      const imported = unique(source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === 'EventEmitter')), 'missing/ambiguous emitter import');
      const symbol = checker.getSymbolAtLocation(imported.name); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported, 'emitter import shadowed'); const references = [];
      function visit(node) {
        if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          const parent = node.parent; let kind, async = null, member = null;
          assert.equal(parent.typeArguments?.length, 1, 'typed emitter boundary');
          if (ts.isTypeReferenceNode(parent) && parent.typeName === node) kind = 'emitter-type';
          else {
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime emitter imported type only');
            assert.ok(ts.isNewExpression(parent) && parent.expression === node, 'unreviewed emitter alias/subclass/runtime use');
            assert.ok(ts.isPropertyDeclaration(parent.parent) && parent.parent.initializer === parent && ts.isIdentifier(parent.parent.name), 'unreviewed emitter construction owner');
            member = parent.parent.name.text; assert.ok(parent.arguments.length === 0 || parent.arguments.length === 1 && parent.arguments[0].kind === ts.SyntaxKind.TrueKeyword, 'unreviewed async argument'); async = parent.arguments.length === 1;
            assert.equal(asyncNames.includes(file + ':' + member), async, 'historical emitter scheduling mode changed'); kind = 'owned-emitter-construction'; constructions.push({source, expression: parent, local_name: imported.name.text, file, member, async});
          }
          references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, expression: parent.getText(source), member, async});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); cases.push({file, module: moduleName, symbol: 'EventEmitter', frozen_use: uses.some(u => u.file === file), local_name: imported.name.text, candidate_source_sha256: hash(source.text), references});
    }
    assert.equal(constructions.filter(c => c.async).length, 2); const authored = [];
    if (!skipDiagnostics) for (const model of loaded.models) {
      const receipts = [];
      for (const c of constructions) {
        const emitted = ts.transpileModule('return ' + c.expression.getText(c.source) + ';', {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}}).outputText;
        const emitter = new Function(c.local_name, emitted)(model.runtime.EventEmitter), payload = {}, delivered = []; emitter.subscribe(v => delivered.push(v)); emitter.emit(payload);
        assert.equal(delivered.length, c.async ? 0 : 1); if (c.async) await tick(); assert.equal(delivered[0], payload); emitter.complete(); receipts.push({file: c.file, member: c.member, async: c.async, payload_identity: true});
      }
      authored.push({line: model.subject.line, construction_count: constructions.length, async_count: 2, constructors: receipts});
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + loaded.models.find(m => m.subject.line === line).subject.version);
    const behaviors = []; if (!skipDiagnostics) for (const model of loaded.models) behaviors.push({line: model.subject.line, ...await exerciseEventEmitter(model.runtime)});
    return {schema_version: 1, line, node: process.version, binding_parser: ts.version, frozen_uses: 19, current_uses: 21, current_delta_uses: 2, cases, authored_constructions: authored, behaviors, rxjs: loaded.rxjs, source_override_used: !!readSource,
      subjects: loaded.models.map(m => ({subject: m.subject, emitter_contract: {...m.emitter_contract, subscriber: undefined}})), type_compilation: skipDiagnostics ? null : compileEmitterTypes(loaded.models, compilerRoot),
      limits: ['Public dependency and exact constructor snippets only; complete owned event producer/caller lifecycle remains separately required.', 'Current signal tracking suppression and optional lifecycle capture are real measured differences. Direct Subject subscriptions are not automatically torn down by destroying the construction context.', 'PendingTasks add/remove/finally inspected in whole authentic source; application-root/native task scheduling, AOT/packed/browser and full Node/RxJS floors unexecuted. Borrowed RxJS7.8.2.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
