/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine built-in parameter annotations and explicit provider dependency flags. */
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
const names = ['Inject', 'Optional', 'Self', 'SkipSelf', 'Host'], flags = {Inject: -1, Optional: 8, Self: 2, SkipSelf: 4, Host: 1};
const deltaKeys = ["legacy-core/internal/common-module.ts#Inject", "legacy-core/internal/common-module.ts#Optional", "legacy-core/internal/datetime/native-date-adapter.ts#Inject", "legacy-core/internal/datetime/native-date-adapter.ts#Optional", "legacy-core/internal/legacy-viewport.ts#Inject", "legacy-core/internal/legacy-viewport.ts#Optional", "legacy-core/pseudo-checkbox/pseudo-checkbox.ts#Inject", "legacy-core/pseudo-checkbox/pseudo-checkbox.ts#Optional", "legacy-dialog/dialog-container.ts#Inject", "legacy-dialog/dialog-container.ts#Optional", "legacy-dialog/internal/dialog-container-base.ts#Inject", "legacy-dialog/internal/dialog-container-base.ts#Optional", "legacy-table/cell.ts#Inject", "legacy-table/cell.ts#Optional", "legacy-table/internal/definition-owner.ts#Inject", "legacy-table/internal/definition-owner.ts#Optional", "legacy-table/internal/definition-owner.ts#Self", "legacy-table/row.ts#Inject", "legacy-table/row.ts#Optional", "legacy-table/text-column.ts#Inject", "legacy-table/text-column.ts#Optional", "legacy-tabs/tab-label.ts#Inject", "legacy-tabs/tab-label.ts#Optional"];
const printer = ts.createPrinter({removeComments: true}), print = (n, s) => printer.printNode(ts.EmitHint.Unspecified, n, s).trim();
function parse(path, text) {const s = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;}
function unique(nodes, label) {assert.equal(nodes.length, 1, label); return nodes[0];}
function stable(n) {assert.ok(!ts.getJSDocTags(n).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable parameter decorator API');}
function tokens(text) {const source = parse('contract.ts', text), out = []; function visit(n) {const children = n.getChildren(source); if (children.length) children.forEach(visit); else if (n.kind !== ts.SyntaxKind.EndOfFileToken) out.push([n.kind, n.getText(source)]);} visit(source); return out.filter((t, i) => !(t[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));}
const emit = t => ts.transpileModule(t, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, experimentalDecorators: true, emitDecoratorMetadata: false, removeComments: true}}).outputText;
export async function parameterDecoratorSubjects(root = rootDefault) {
  const loaded = await elementRefSubjects(root);
  try {
    for (const model of loaded.models) {
      const files = [...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, t]) => parse(p, t)), helpers = {}, declarations = {}, bindings = {};
      const runtimeFunctions = name => files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name).map(n => ({s, n})));
      for (const name of ['makeParamDecorator', 'makeMetadataCtor', 'noSideEffects', 'attachInjectFlag', 'getInjectFlag', 'injectArgs']) {const entry = unique(runtimeFunctions(name), 'complete metadata helper ' + name); helpers[name] = print(entry.n, entry.s);}
      const original = model.subject.line === 'original', parentBranch = 'if (parentClass) {\n            ParamDecoratorFactory.prototype = Object.create(parentClass.prototype);\n        }';
      let normalizedFactory = helpers.makeParamDecorator;
      if (original) {assert.ok(normalizedFactory.includes(parentBranch)); normalizedFactory = normalizedFactory.replace(parentBranch, '');} else assert.equal(normalizedFactory.includes('if (parentClass)'), false);
      if (model.subject.line === 'main') {assert.ok(normalizedFactory.includes('Object.hasOwn(cls, PARAMETERS)')); normalizedFactory = normalizedFactory.replace('Object.hasOwn(cls, PARAMETERS)', 'cls.hasOwnProperty(PARAMETERS)');}
      const normalizedArgs = helpers.injectArgs.replace('InjectFlags.Default', '0'); if (original) assert.equal(model.runtime.InjectFlags.Default, 0);
      const constants = {};
      for (const name of ['PARAMETERS', 'DI_DECORATOR_FLAG']) {const entry = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === name).map(n => ({s, n}))), 'metadata constant ' + name); assert.ok(ts.isStringLiteral(entry.n.initializer)); constants[name] = entry.n.initializer.text;}
      assert.deepEqual(constants, {PARAMETERS: '__parameters__', DI_DECORATOR_FLAG: '__NG_DI_FLAG__'});
      for (const name of names) {
        const entry = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === name).map(n => ({s, n}))), 'public metadata factory ' + name), outer = entry.n.initializer;
        assert.ok(ts.isCallExpression(outer) && outer.expression.text === 'attachInjectFlag' && outer.arguments.length === 2); const flag = Number(outer.arguments[1].getText(entry.s)); assert.equal(flag, flags[name]); const factory = outer.arguments[0]; assert.ok(ts.isCallExpression(factory) && factory.expression.text === 'makeParamDecorator'); assert.equal(factory.arguments[0].text, name); assert.equal(factory.arguments.length, name === 'Inject' ? 2 : 1, 'no built-in factory passes parentClass');
        if (name === 'Inject') {const props = factory.arguments[1]; assert.ok(ts.isArrowFunction(props) && props.parameters.length === 1 && props.parameters[0].name.text === 'token'); const body = ts.isParenthesizedExpression(props.body) ? props.body.expression : props.body; assert.ok(ts.isObjectLiteralExpression(body) && body.properties.length === 1 && ts.isShorthandPropertyAssignment(body.properties[0]) && body.properties[0].name.text === 'token');}
        const source = parse('factory.js', helpers.makeParamDecorator), functions = []; function visit(n) {if (ts.isFunctionDeclaration(n) && n.name?.text === 'ParamDecoratorFactory') functions.push(n); ts.forEachChild(n, visit);} visit(source); const publicBody = unique(functions, 'actual public constructor closure'); assert.deepEqual(tokens(Function.prototype.toString.call(model.runtime[name])), tokens(publicBody.getText(source)), 'actual public factory identity ' + name);
        const declared = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === name).map(n => ({s, n}))), 'public metadata variable declaration ' + name); stable(declared.n); stable(declared.n.parent.parent); assert.equal(declared.n.type.getText(declared.s), name + 'Decorator');
        for (const typeName of [name, name + 'Decorator']) {
          const type = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(n => ts.isInterfaceDeclaration(n) && n.name?.text === typeName).map(n => ({s, n}))), 'complete public metadata type ' + typeName); stable(type.n); type.n.members.forEach(stable); let members = [...type.n.members];
          if (!original && typeName === 'InjectDecorator') {assert.equal(members.length, 4); assert.equal(print(members[0], type.s), '(token: string): any;'); assert.equal(print(members[1], type.s), 'new (token: string): Inject;'); assert.ok(members[0].getFullText(type.s).includes('String tokens are not recommended')); members = members.slice(2);}
          const projected = ts.factory.updateInterfaceDeclaration(type.n, undefined, type.n.name, type.n.typeParameters, type.n.heritageClauses, members); declarations[typeName] = print(projected, type.s);
        }
        bindings[name] = {initializer: print(entry.n, entry.s), flag, no_parent_class_argument: true};
      }
      model.parameter_contract = {declarations, bindings, helpers, constants, normalized_factory: tokens(normalizedFactory), normalized_inject_args: tokens(normalizedArgs), string_advisory_overloads: original ? 0 : 2, ownership_check: model.subject.line === 'main' ? 'Object.hasOwn' : 'cls.hasOwnProperty', removed_unused_parent_branch: !original};
    }
    for (const model of loaded.models) {
      const original = loaded.models[0]; assert.deepEqual(model.parameter_contract.declarations, original.parameter_contract.declarations); assert.deepEqual(model.parameter_contract.normalized_factory, original.parameter_contract.normalized_factory); assert.deepEqual(model.parameter_contract.normalized_inject_args, original.parameter_contract.normalized_inject_args);
      for (const helper of ['makeMetadataCtor', 'noSideEffects', 'attachInjectFlag', 'getInjectFlag']) assert.deepEqual(tokens(model.parameter_contract.helpers[helper]), tokens(original.parameter_contract.helpers[helper]));
    }
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
export function exerciseParameterDecorators(core, api = core) {
  const cases = [], token = new core.InjectionToken('metadata'), other = new core.InjectionToken('other');
  for (const name of names) {const value = name === 'Inject' ? new api[name](token) : new api[name](); assert.equal(value instanceof api[name], true); assert.equal(value.ngMetadataName, name); if (name === 'Inject') assert.equal(value.token, token); else assert.deepEqual(Object.keys(value), []);} cases.push('public-constructor-types-token-identity-and-empty-flags');
  const inject = api.Inject(token), optional = api.Optional(); assert.equal(typeof inject, 'function'); assert.equal(inject.annotation.token, token); assert.equal(optional.annotation.ngMetadataName, 'Optional'); cases.push('call-form-returns-annotation-decorator');
  class Target {} assert.equal(inject(Target, undefined, 2), Target); optional(Target, undefined, 2); const descriptor = Object.getOwnPropertyDescriptor(Target, '__parameters__'); assert.deepEqual([descriptor.enumerable, descriptor.configurable, descriptor.writable], [false, false, false]); assert.equal(descriptor.value.length, 3); assert.equal(descriptor.value[0], null); assert.equal(descriptor.value[1], null); assert.equal(descriptor.value[2][0], inject.annotation); assert.equal(descriptor.value[2][1], optional.annotation); cases.push('sparse-parameter-slots-order-and-descriptor');
  class Child extends Target {} const child = api.Inject(other); child(Child, undefined, 0); assert.notEqual(Child.__parameters__, Target.__parameters__); assert.equal(Child.__parameters__.length, 1); assert.equal(Child.__parameters__[0][0].token, other); assert.equal(Target.__parameters__[2][0].token, token); cases.push('subclass-metadata-array-isolation');
  const fixture = new Function(...names, 'token', 'other', emit(`class Base {constructor(@Optional() @Inject(token) one:any, @Self() @Inject(other) two:any){}} class Derived extends Base {constructor(@SkipSelf() @Inject(token) three:any, @Host() four:any){super(null,null);}} return {Base,Derived};`))(...names.map(n => api[n]), token, other);
  assert.deepEqual(fixture.Base.__parameters__.map(slot => slot.map(v => v.ngMetadataName)), [['Inject', 'Optional'], ['Inject', 'Self']]); assert.deepEqual(fixture.Derived.__parameters__.map(slot => slot.map(v => v.ngMetadataName)), [['Inject', 'SkipSelf'], ['Host']]); assert.equal(fixture.Base.__parameters__[0][0].token, token); assert.equal(fixture.Base.__parameters__[1][0].token, other); cases.push('actual-typescript-emitted-parameter-decorators');
  const parentValue = {}, childValue = {}, parent = core.Injector.create({providers: [{provide: token, useValue: parentValue}]}), result = new core.InjectionToken('result');
  function dependency(deps, providers = [], factory = value => value) {const injector = core.Injector.create({parent, providers: [...providers, {provide: result, useFactory: factory, deps: [deps]}]}); try {return injector.get(result);} finally {injector.destroy();}}
  try {
    assert.equal(dependency([new api.Inject(token)]), parentValue); cases.push('public-factory-deps-inject-token-identity');
    assert.equal(dependency([new api.Optional(), new api.Inject(other)]), null); cases.push('optional-missing-factory-dependency');
    assert.equal(dependency([new api.Self(), new api.Inject(token)], [{provide: token, useValue: childValue}]), childValue); cases.push('self-local-provider');
    assert.throws(() => dependency([new api.Self(), new api.Inject(token)])); assert.equal(dependency([new api.Optional(), new api.Self(), new api.Inject(token)]), null); cases.push('self-blocks-parent-and-combined-optional');
    assert.equal(dependency([new api.SkipSelf(), new api.Inject(token)], [{provide: token, useValue: childValue}]), parentValue); cases.push('skipSelf-bypasses-local-provider');
    assert.equal(dependency([api.Optional, api.SkipSelf, other]), null); cases.push('static-decorator-factory-flags-in-deps');
    assert.equal(dependency([new api.Host(), new api.Optional(), token]), parentValue); cases.push('host-metadata-in-environment-injector-not-node-boundary');
    assert.equal(dependency([new api.Inject(core.forwardRef(() => token))]), parentValue); cases.push('deferred-inject-token-through-public-factory');
    const sentinel = new Error('provider error'); assert.throws(() => dependency([new api.Inject(token)], [], () => {throw sentinel;}), error => error === sentinel); cases.push('factory-error-identity');
  } finally {parent.destroy();}
  function Interposed() {} api.Optional()(Interposed, undefined, 0); Interposed.hasOwnProperty = () => false; const annotation = api.Optional(); const main = core.VERSION.full.startsWith('22.');
  if (main) {annotation(Interposed, undefined, 0); assert.equal(Interposed.__parameters__[0].length, 2);} else assert.throws(() => annotation(Interposed, undefined, 0), TypeError); cases.push('measured-nonordinary-constructor-ownership-difference');
  return {cases, source_metadata_reflection_used: true, metadata_fields_are_not_consumer_api: true, native_node_host_boundary_executed: false};
}
export function compileParameterTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(path), receipts = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'parameter-consumer.ts'), code = `import {Inject,Optional,Self,SkipSelf,Host,InjectionToken} from '@angular/core';import type {Inject as InjectMetadata,Optional as OptionalMetadata} from '@angular/core';
const token=new InjectionToken<string>('token');const injected:InjectMetadata=new Inject(token);const optional:OptionalMetadata=new Optional();new Self();new SkipSelf();new Host();const tokenIdentity:any=injected.token; Inject('string');new Inject('string');
class Fixture {constructor(@Inject(token) @Optional() @Self() value: string|null,@SkipSelf() @Host() other:unknown){}}
// @ts-expect-error Inject requires a token argument.
Inject();
// @ts-expect-error Constructed Inject requires a token argument.
new Inject();
// @ts-expect-error Optional has no argument.
Optional(token);
// @ts-expect-error Self has no argument.
new Self(token);
// @ts-expect-error SkipSelf has no argument.
SkipSelf(token);
// @ts-expect-error Host has no argument.
Host(token);
`;
    writeFileSync(file, code); const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, experimentalDecorators: true, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']}); const diagnostics = compiler.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'})); receipts.push({line: model.subject.line, negative_checks: 6, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}
export async function reviewParameterDecoratorUses({root = rootDefault, subjects, compilerRoot, readSource, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash); const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && names.includes(u.symbol)); assert.equal(uses.length, 89);
  const own = !subjects, loaded = subjects ?? await parameterDecoratorSubjects(root), read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  try {
    const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n'); const actual = paths.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => names.includes((i.propertyName || i.name).text)))); assert.equal(actual.length, 57);
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy'); host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
    const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], applications = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path));
      for (const name of names) {
        const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === name)); if (!imports.length) continue; const imported = unique(imports, 'missing/ambiguous parameter import'), symbol = checker.getSymbolAtLocation(imported.name); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported, 'parameter import shadowed'); const references = [];
        function visit(node) {
          if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime parameter decorator imported type only'); const call = node.parent; assert.ok((ts.isCallExpression(call) || ts.isNewExpression(call)) && call.expression === node, 'unreviewed parameter alias/subclass/type/runtime use'); assert.equal(call.typeArguments, undefined); assert.equal(call.arguments.length, name === 'Inject' ? 1 : 0, 'historical parameter decorator arity');
            if (name === 'Inject') {
              const token = call.arguments[0];
              assert.ok(ts.isIdentifier(token) || ts.isCallExpression(token) && ts.isIdentifier(token.expression), 'unreviewed token expression shape');
              if (ts.isCallExpression(token)) {
                const importedToken = unique(checker.getSymbolAtLocation(token.expression)?.declarations ?? [], 'exact forward token import');
                assert.ok(ts.isImportSpecifier(importedToken) && (importedToken.propertyName || importedToken.name).text === 'forwardRef' && importedToken.parent.parent.parent.moduleSpecifier.text === moduleName, 'deferred token must use public forwardRef');
                assert.ok(token.arguments.length === 1 && ts.isArrowFunction(token.arguments[0]) && token.arguments[0].parameters.length === 0 && ts.isIdentifier(token.arguments[0].body), 'unreviewed deferred token callback');
              }
            }
            let role, targetClass = null, position = null;
            if (ts.isCallExpression(call)) {const decorated = call.parent; assert.ok(ts.isDecorator(decorated) && ts.isParameter(decorated.parent) && ts.isConstructorDeclaration(decorated.parent.parent), 'parameter decorator must remain constructor annotation'); const parameter = decorated.parent, constructor = parameter.parent, cls = constructor.parent; assert.ok(ts.isClassDeclaration(cls) && cls.name); assert.ok(!cls.members.some(m => m.modifiers?.some(x => x.kind === ts.SyntaxKind.StaticKeyword) && m.name?.getText(source) === 'hasOwnProperty'), 'nonordinary static constructor ownership interposition'); targetClass = cls.name.text; position = constructor.parameters.indexOf(parameter); role = 'constructor-parameter-annotation'; applications.push({source, call, name, local_name: imported.name.text, file, targetClass, position});}
            else {assert.ok(name === 'Optional' || name === 'SkipSelf', 'unreviewed constructed metadata'); assert.ok(ts.isArrayLiteralExpression(call.parent) && ts.isArrayLiteralExpression(call.parent.parent) && ts.isPropertyAssignment(call.parent.parent.parent) && call.parent.parent.parent.name.getText(source) === 'deps', 'metadata must remain nested factory deps array'); role = 'factory-dependency-metadata';}
            references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: call.getText(source), role, target_class: targetClass, parameter_index: position, token_expression: name === 'Inject' ? call.arguments[0].getText(source) : null});
          }
          ts.forEachChild(node, visit);
        }
        visit(source); let unused = null;
        if (!references.length) {
          assert.ok(['legacy-core/option/option-base.ts#Optional', 'legacy-core/option/option-base.ts#Inject', 'legacy-paginator/internal/paginator-base.ts#Inject', 'legacy-radio/internal/radio-base.ts#Inject', 'legacy-radio/internal/radio-base.ts#Optional'].includes(file + '#' + name), 'unexpected unused parameter import'); const named = imported.parent, kept = named.elements.filter(e => e !== imported), changed = source.text.slice(0, named.getStart(source)) + '{' + kept.map(e => e.getText(source)).join(', ') + (named.elements.hasTrailingComma ? ',' : '') + '}' + source.text.slice(named.end); const transpile = t => ts.transpileModule(t, {compilerOptions: {...options, removeComments: true, emitDecoratorMetadata: false}}).outputText; assert.equal(hash(transpile(source.text)), hash(transpile(changed))); unused = {emit_sha256: hash(transpile(source.text)), metadata_mode: false, emitter: ts.version};
        }
        cases.push({file, module: moduleName, symbol: name, local_name: imported.name.text, frozen_use: uses.some(u => u.file === file && u.symbol === name), candidate_source_sha256: hash(source.text), references, unused_import_erasure: unused});
      }
    }
    assert.equal(cases.length, 112); assert.deepEqual(cases.filter(c => !c.frozen_use).map(c => c.file + '#' + c.symbol).sort(), deltaKeys); for (const use of uses) assert.ok(cases.some(c => c.file === use.file && c.symbol === use.symbol), 'missing frozen parameter use'); assert.equal(applications.length, 205);
    const behaviors = [], authored = [];
    if (!skipDiagnostics) for (const model of loaded.models) {
      behaviors.push({line: model.subject.line, ...exerciseParameterDecorators(model.runtime)}); const records = [];
      for (const app of applications) {
        const protocolToken = app.name === 'Inject' ? new model.runtime.InjectionToken(app.file + ':' + app.targetClass + ':' + app.position) : null;
        // Replay exact annotation call shape; its token expression is statically recorded
        // but deliberately replaced by a protocol token. This is not actual-token/node DI proof.
        const expression = app.name === 'Inject' ? app.local_name + '(token)' : app.call.getText(app.source), callback = new Function(app.local_name, 'token', emit('return ' + expression + ';'))(model.runtime[app.name], protocolToken); class Target {} const returned = callback(Target, undefined, app.position); assert.equal(returned, Target); const annotation = Target.__parameters__[app.position][0]; assert.equal(annotation.ngMetadataName, app.name); if (app.name === 'Inject') assert.equal(annotation.token, protocolToken); records.push({file: app.file, target_class: app.targetClass, parameter_index: app.position, symbol: app.name, token_is_protocol: app.name === 'Inject', metadata_name_and_slot_verified: true});
      }
      authored.push({line: model.subject.line, annotation_count: 205, annotations: records});
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + loaded.models.find(m => m.subject.line === line).subject.version);
    return {schema_version: 1, line, frozen_uses: 89, current_uses: 112, current_delta_uses: 23, node: process.version, binding_parser: ts.version, cases, behaviors, authored_annotations: authored, rxjs: loaded.rxjs, source_override_used: !!readSource, subjects: loaded.models.map(m => ({subject: {...m.subject, members: undefined}, parameter_contract: {...m.parameter_contract, normalized_factory: undefined, normalized_inject_args: undefined, normalized_factory_sha256: hash(JSON.stringify(m.parameter_contract.normalized_factory)), normalized_inject_args_sha256: hash(JSON.stringify(m.parameter_contract.normalized_inject_args))}})), type_compilation: skipDiagnostics ? null : compileParameterTypes(loaded.models, compilerRoot), limits: ['Public built-in annotation/factory-dependency boundary; metadata reflection observes implementation output, not a new consumer API.', '205 annotation shapes replayed with protocol target classes/tokens. Actual token-expression identities/full source class/native node and Host boundary remain separately required.', 'Current Inject string advisory overloads and main nonordinary ownership differences explicit. Whole genuine modules/borrowed RxJS7.8.2; packed/AOT/full Node/Rx/peer floors unqualified.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
