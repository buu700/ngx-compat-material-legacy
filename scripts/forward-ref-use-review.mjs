/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public deferred references, exact local-class callbacks and mode differences. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {elementRefSubjects} from './element-ref-use-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = b => createHash('sha256').update(b).digest('hex'), moduleName = '@angular/core';
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const printer = ts.createPrinter({removeComments: true}), print = (n, s) => printer.printNode(ts.EmitHint.Unspecified, n, s).trim();
function parse(path, text) {const s = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;}
function stable(n) {assert.ok(!ts.getJSDocTags(n).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable forward-reference declaration');}
function unique(nodes, label) {assert.equal(nodes.length, 1, label); return nodes[0];}
function tokens(text) {const source = parse('contract.ts', text), out = []; function visit(n) {const children = n.getChildren(source); if (children.length) children.forEach(visit); else if (n.kind !== ts.SyntaxKind.EndOfFileToken) out.push([n.kind, n.getText(source)]);} visit(source); return out.filter((t, i) => !(t[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));}
export async function forwardRefSubjects(root = rootDefault) {
  const loaded = await elementRefSubjects(root);
  try {
    for (const model of loaded.models) {
      const files = [...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, t]) => parse(p, t)), source = {}, declarations = {};
      for (const name of ['forwardRef', 'resolveForwardRef', 'isForwardRef', 'stringify', 'getClosureSafeProperty']) {
        const entry = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name).map(n => ({s, n}))), 'whole forward helper ' + name); source[name] = print(entry.n, entry.s);
        if (['forwardRef', 'resolveForwardRef'].includes(name)) assert.equal(Function.prototype.toString.call(model.runtime[name]), entry.n.getText(entry.s), 'actual public export ' + name);
      }
      for (const name of ['forwardRef', 'resolveForwardRef', 'ForwardRefFn']) {
        const entry = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(n => (ts.isFunctionDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name?.text === name).map(n => ({s, n}))), 'public declaration ' + name); stable(entry.n); entry.n.members?.forEach(stable);
        declarations[name] = print(entry.n, entry.s).replace(/^(?:(?:export|declare) )+/, '').replace('Type$1<any>', 'Type<any>');
        if (name === 'forwardRef') {
          const returned = entry.n.type; assert.ok(ts.isTypeReferenceNode(returned));
          const localType = returned.typeName.text; if (localType !== 'Type') {
            const links = entry.s.statements.filter(ts.isImportDeclaration).flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements : []); const imported = unique(links.filter(i => i.name.text === localType), 'public Type alias'); assert.equal(imported.propertyName.text, 'Type');
          }
        }
      }
      const original = model.subject.line === 'original';
      assert.deepEqual(tokens(source.forwardRef), tokens(original ? 'function forwardRef(forwardRefFn) {forwardRefFn.__forward_ref__ = forwardRef;forwardRefFn.toString = function () {return stringify(this());};return forwardRefFn;}' : 'function forwardRef(forwardRefFn) {forwardRefFn.__forward_ref__ = forwardRef;if (ngDevMode) {forwardRefFn.toString = function () {return stringify(this());};}return forwardRefFn;}'));
      assert.deepEqual(tokens(source.resolveForwardRef), tokens('function resolveForwardRef(type) {return isForwardRef(type) ? type() : type;}'));
      assert.deepEqual(tokens(source.isForwardRef), tokens(model.subject.line === 'main' ? 'function isForwardRef(fn) {return typeof fn === \'function\' && Object.hasOwn(fn, __forward_ref__) && fn.__forward_ref__ === forwardRef;}' : 'function isForwardRef(fn) {return typeof fn === \'function\' && fn.hasOwnProperty(__forward_ref__) && fn.__forward_ref__ === forwardRef;}'));
      const safeExpected = original ? 'function getClosureSafeProperty(objWithPropertyToExtract) {for (let key in objWithPropertyToExtract) {if (objWithPropertyToExtract[key] === getClosureSafeProperty) {return key;}}throw Error(\'Could not find renamed property on target object.\');}' : 'function getClosureSafeProperty(objWithPropertyToExtract) {for (let key in objWithPropertyToExtract) {if (objWithPropertyToExtract[key] === getClosureSafeProperty) {return key;}}throw Error(typeof ngDevMode !== \'undefined\' && ngDevMode ? \'Could not find renamed property on target object.\' : \'\');}'; assert.deepEqual(tokens(source.getClosureSafeProperty), tokens(safeExpected));
      const marker = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === '__forward_ref__').map(n => ({s, n}))), 'complete marker initializer'); assert.deepEqual(tokens(print(marker.n, marker.s)), tokens('__forward_ref__ = getClosureSafeProperty({__forward_ref__: getClosureSafeProperty})'));
      // stringify is a source-inspected private dependency, never product-imported.
      const stringifyExpected = original ? `function stringify(token) {if (typeof token === 'string') {return token;}if (Array.isArray(token)) {return '[' + token.map(stringify).join(', ') + ']';}if (token == null) {return '' + token;}if (token.overriddenName) {return \`\${token.overriddenName}\`;}if (token.name) {return \`\${token.name}\`;}const res = token.toString();if (res == null) {return '' + res;}const newLineIndex = res.indexOf('\\n');return newLineIndex === -1 ? res : res.substring(0, newLineIndex);}` : `function stringify(token) {if (typeof token === 'string') {return token;}if (Array.isArray(token)) {return \`[\${token.map(stringify).join(', ')}]\`;}if (token == null) {return '' + token;}const name = token.overriddenName || token.name;if (name) {return \`\${name}\`;}const result = token.toString();if (result == null) {return '' + result;}const newLineIndex = result.indexOf('\\n');return newLineIndex >= 0 ? result.slice(0, newLineIndex) : result;}`;
      assert.deepEqual(tokens(source.stringify), tokens(stringifyExpected)); model.forward_contract = {declarations, complete_source: source, marker_initializer: print(marker.n, marker.s), source_hashes: Object.fromEntries(Object.entries(source).map(([name, text]) => [name, hash(text)]))};
    }
    for (const model of loaded.models) assert.deepEqual(model.forward_contract.declarations, loaded.models[0].forward_contract.declarations);
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
export function exerciseForwardRef(core, mode = 'development', forward = core.forwardRef, resolveRef = core.resolveForwardRef) {
  const cases = []; let target, calls = 0; const callback = () => {calls++; return target;}, forwarded = forward(callback); assert.equal(forwarded, callback); assert.equal(calls, 0); cases.push('callback-object-retained-and-no-eager-call');
  class Target {} target = Target; assert.equal(resolveRef(forwarded), Target); assert.equal(calls, 1); cases.push('late-class-definition-resolution-identity');
  class Replacement {} target = Replacement; assert.equal(resolveRef(forwarded), Replacement); assert.equal(calls, 2); cases.push('not-memoized-and-latest-target');
  let ordinaryCalls = 0; const plain = () => {ordinaryCalls++; return Target;}; assert.equal(resolveRef(plain), plain); assert.equal(ordinaryCalls, 0); cases.push('plain-functions-are-not-invoked');
  for (const value of [Target, {}, null, undefined, 1, 'token']) assert.equal(resolveRef(value), value); cases.push('ordinary-values-and-classes-pass-through');
  const sentinel = new Error('deferred sentinel'), bad = forward(() => {throw sentinel;}); assert.throws(() => resolveRef(bad), error => error === sentinel); cases.push('callback-error-identity');
  const child = Object.setPrototypeOf(() => Target, forwarded); assert.equal(resolveRef(child), child); cases.push('inherited-marker-does-not-authorize-resolution');
  const object = {__forward_ref__: forward}; assert.equal(resolveRef(object), object); cases.push('nonfunction-marker-object-pass-through');
  const second = forward(() => Target); assert.notEqual(second, forwarded); assert.equal(resolveRef(second), Target); cases.push('distinct-reference-callbacks');
  const alias = new core.InjectionToken('forward alias'), instance = {}, injector = core.Injector.create({providers: [{provide: Target, useValue: instance}, {provide: alias, useExisting: forward(() => Target)}]});
  try {assert.equal(injector.get(alias), instance); assert.equal(injector.get(Target), instance); cases.push('public-explicit-useExisting-deferred-class-token');} finally {injector.destroy();}
  const original = core.VERSION.full.startsWith('16.'), ownString = Object.hasOwn(forwarded, 'toString'); assert.equal(ownString, original || mode === 'development'); if (ownString) assert.equal(forwarded.toString(), 'Replacement'); else assert.equal(forwarded.toString(), Function.prototype.toString.call(callback)); cases.push('measured-mode-specific-debug-string');
  if (mode === 'development') {
    for (const [value, expected] of [['value', 'value'], [null, 'null'], [undefined, 'undefined'], [[Target, 'x'], '[Target, x]'], [{overriddenName: 'renamed'}, 'renamed'], [{toString() {return 'first\nsecond';}}, 'first'], [{toString() {return null;}}, 'null']]) assert.equal(forward(() => value).toString(), expected); cases.push('debug-stringify-supported-values');
  }
  const custom = () => Target; custom.hasOwnProperty = () => false; const interposed = forward(custom); const nullPrototype = Object.setPrototypeOf(() => Target, null); forward(nullPrototype);
  const main = core.VERSION.full.startsWith('22.'); assert.equal(resolveRef(interposed), main ? Target : interposed); if (main) assert.equal(resolveRef(nullPrototype), Target); else assert.throws(() => resolveRef(nullPrototype), TypeError); cases.push('measured-nonordinary-function-ownership-differences');
  return {mode, cases, debug_to_string_installed: ownString, nonordinary_function_ownership: main ? 'Object.hasOwn' : 'function.hasOwnProperty', native_provider_or_query_executed: false};
}
function emit(text) {return ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}}).outputText;}
export function compileForwardTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(path), subjects = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'forward-consumer.ts'), code = `import {forwardRef,resolveForwardRef} from '@angular/core';import type {ForwardRefFn,Type} from '@angular/core';
class Deferred{} const callback:ForwardRefFn=()=>Deferred; const ref:Type<any>=forwardRef(callback); const value:Type<any>=resolveForwardRef(ref); const scalar:number=resolveForwardRef(1); const token:{id:number}=resolveForwardRef({id:1});
// @ts-expect-error Callback must be callable.
forwardRef(1);
// @ts-expect-error Callback cannot require parameters.
forwardRef((required:number)=>Deferred);
// @ts-expect-error No second forwardRef argument.
forwardRef(callback,true);
// @ts-expect-error resolveForwardRef preserves the advertised input type.
const bad:number=resolveForwardRef('string');
// @ts-expect-error Internal forward marker is not part of Type.
ref.__forward_ref__;
`;
    writeFileSync(file, code); const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']}); const diagnostics = compiler.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'})); subjects.push({line: model.subject.line, negative_checks: 5, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects};
}
export async function reviewForwardRefUses({root = rootDefault, subjects, compilerRoot, readSource, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash); const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && u.symbol === 'forwardRef'); assert.equal(uses.length, 11);
  const own = !subjects, loaded = subjects ?? await forwardRefSubjects(root), read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  try {
    const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n'); const actual = paths.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => (i.propertyName || i.name).text === 'forwardRef'))); assert.equal(actual.length, 11); assert.deepEqual(actual.map(p => p.slice('projects/ngx-material-legacy/'.length)).sort(), uses.map(u => u.file).sort());
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy'); host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
    const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], callbacks = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path)); const imported = unique(source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === 'forwardRef')), 'missing/ambiguous forwardRef import'); const symbol = checker.getSymbolAtLocation(imported.name); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported); const references = [];
      function visit(node) {
        if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          const call = node.parent; assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime forwardRef imported type only'); assert.ok(ts.isCallExpression(call) && call.expression === node, 'unreviewed forwardRef alias/runtime use'); assert.equal(call.typeArguments, undefined); assert.equal(call.arguments.length, 1, 'one forward callback'); const callback = call.arguments[0]; assert.ok(ts.isArrowFunction(callback) && callback.parameters.length === 0 && ts.isIdentifier(callback.body), 'forward callback must remain pure zero-argument local class reference'); const target = checker.getSymbolAtLocation(callback.body), declaration = unique(target?.declarations ?? [], 'exact forward target binding'); assert.ok(ts.isClassDeclaration(declaration) && declaration.getSourceFile() === source && declaration.name.text === callback.body.text, 'forward target must be same-file class declaration');
          const parent = call.parent; let role; if (ts.isPropertyAssignment(parent) && parent.name.getText(source) === 'useExisting') role = 'provider-useExisting'; else if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression)) {const caller = unique(checker.getSymbolAtLocation(parent.expression)?.declarations ?? [], 'exact caller import'); assert.ok(ts.isImportSpecifier(caller) && caller.parent.parent.parent.moduleSpecifier.text === moduleName, 'caller must remain public Angular import'); const callerName = (caller.propertyName || caller.name).text; assert.ok(['Inject', 'ContentChildren'].includes(callerName), 'unreviewed forward caller'); role = callerName === 'Inject' ? 'constructor-Inject' : 'ContentChildren-query';} else assert.fail('unreviewed forwardRef caller role');
          const record = {line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: call.getText(source), target_class: declaration.name.text, target_declaration_line: source.getLineAndCharacterOfPosition(declaration.getStart(source)).line + 1, role}; references.push(record); callbacks.push({source, call, local_name: imported.name.text, file, ...record});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); let unused = null;
      if (!references.length) {assert.equal(file, 'legacy-tabs/internal/tab-nav-bar-base.ts', 'unexpected unused forwardRef import'); const named = imported.parent, kept = named.elements.filter(e => e !== imported), changed = source.text.slice(0, named.getStart(source)) + '{' + kept.map(e => e.getText(source)).join(', ') + (named.elements.hasTrailingComma ? ',' : '') + '}' + source.text.slice(named.end); const transpile = t => ts.transpileModule(t, {compilerOptions: {...options, removeComments: true, emitDecoratorMetadata: false}}).outputText; assert.equal(hash(transpile(source.text)), hash(transpile(changed))); unused = {emit_sha256: hash(transpile(source.text)), metadata_mode: false, emitter: ts.version};}
      cases.push({file, module: moduleName, symbol: 'forwardRef', local_name: imported.name.text, candidate_source_sha256: hash(source.text), references, unused_import_erasure: unused});
    }
    assert.equal(callbacks.length, 12); const authored = [], behaviors = [];
    if (!skipDiagnostics) for (const model of loaded.models) {
      behaviors.push({line: model.subject.line, ...exerciseForwardRef(model.runtime)}); const receipts = [];
      for (const c of callbacks) {
        const code = `let ${c.target_class}; const ref=${c.call.getText(c.source)};return {ref,set(value){${c.target_class}=value;}};`, context = new Function(c.local_name, emit(code))(model.runtime.forwardRef); assert.equal(model.runtime.resolveForwardRef(context.ref), undefined); const token = class OwnedClassProtocol {}; context.set(token); assert.equal(model.runtime.resolveForwardRef(context.ref), token); const other = class ReplacementProtocol {}; context.set(other); assert.equal(model.runtime.resolveForwardRef(context.ref), other); receipts.push({file: c.file, line: c.line, target_class: c.target_class, role: c.role, deferred_identity_and_late_replacement: true, target_is_protocol_identity: true});
      }
      authored.push({line: model.subject.line, callback_count: 12, callbacks: receipts});
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + loaded.models.find(m => m.subject.line === line).subject.version);
    return {schema_version: 1, line, frozen_uses: 11, current_uses: 11, current_delta_uses: 0, node: process.version, binding_parser: ts.version, cases, behaviors, authored_callbacks: authored, rxjs: loaded.rxjs, source_override_used: !!readSource, subjects: loaded.models.map(m => ({subject: {...m.subject, members: undefined}, forward_contract: m.forward_contract})), type_compilation: skipDiagnostics ? null : compileForwardTypes(loaded.models, compilerRoot), limits: ['Genuine public forward-reference dependency/callback boundary; local class bindings statically exact but execution identities are controlled protocol classes, not constructed/compiled components.', 'Production/debug and nonordinary function ownership differences explicit. Complete provider/query/native/AOT/class identity/full Node/RxJS/peer floors remain open; no private product import.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
