/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine property/query annotation contracts and exact historical option shapes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parameterDecoratorSubjects} from './parameter-decorator-use-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = b => createHash('sha256').update(b).digest('hex'), moduleName = '@angular/core';
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const names = ['Input', 'Output', 'ViewChild', 'ContentChild', 'ContentChildren'], queryNames = names.slice(2);
const deltaKeys = ['legacy-dialog/internal/dialog-container-base.ts#ViewChild', 'legacy-table/internal/table-outlet.ts#Input'];
const unusedKeys = ['legacy-tabs/internal/tab-base.ts#ContentChild', 'legacy-tabs/internal/tab-nav-bar-base.ts#ContentChildren', 'legacy-tabs/internal/tab-nav-bar-base.ts#ViewChild', 'legacy-tabs/internal/tab-group-base.ts#ContentChildren', 'legacy-tabs/internal/tab-group-base.ts#ViewChild', 'legacy-radio/internal/radio-base.ts#ContentChildren', 'legacy-slide-toggle/internal/slide-toggle-base.ts#ViewChild', 'legacy-select/internal/select-base.ts#ContentChild', 'legacy-select/internal/select-base.ts#ContentChildren'];
const printer = ts.createPrinter({removeComments: true}), print = (n, s) => printer.printNode(ts.EmitHint.Unspecified, n, s).trim();
function parse(path, text) {const s = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(s.parseDiagnostics.length, 0); return s;}
function unique(nodes, label) {assert.equal(nodes.length, 1, label); return nodes[0];}
function stable(n) {assert.ok(!ts.getJSDocTags(n).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable property/query public API');}
function tokens(text) {const source = parse('contract.ts', text), out = []; function visit(n) {const children = n.getChildren(source); if (children.length) children.forEach(visit); else if (n.kind !== ts.SyntaxKind.EndOfFileToken) out.push([n.kind, n.getText(source)]);} visit(source); return out.filter((t, i) => !(t[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));}
const emit = t => ts.transpileModule(t, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, experimentalDecorators: true, emitDecoratorMetadata: false, removeComments: true}}).outputText;
function normalizedArrow(arrow, source, query) {
  let body = print(arrow.body, source), parameters = arrow.parameters.map(p => print(p, source));
  if (query) {assert.equal(parameters.length, 2); const old = arrow.parameters[1].name.text; assert.ok(['data', 'opts'].includes(old)); body = body.replaceAll('...' + old, '...options'); parameters[1] = parameters[1].replace(old, 'options');}
  // Force explicit parameter parentheses; this removes only syntactic optionality.
  return tokens('const props = (' + parameters.join(',') + ') => ' + body + ';');
}
export async function propertyDecoratorSubjects(root = rootDefault) {
  const loaded = await parameterDecoratorSubjects(root);
  try {
    for (const model of loaded.models) {
      const files = [...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, t]) => parse(p, t)), declarations = {}, initializers = {}, props = {};
      const entry = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'makePropDecorator').map(n => ({s, n}))), 'whole property helper'); let factory = print(entry.n, entry.s), original = model.subject.line === 'original';
      const processBranch = 'if (additionalProcessing)\n                    additionalProcessing(target, name, ...args);';
      if (original) {assert.ok(factory.includes(processBranch)); factory = factory.replace(processBranch, '');} else assert.equal(factory.includes('if (additionalProcessing)'), false);
      if (model.subject.line === 'main') {assert.ok(factory.includes('Object.hasOwn(constructor, PROP_METADATA)') && factory.includes('Object.hasOwn(meta, name)')); factory = factory.replace('Object.hasOwn(constructor, PROP_METADATA)', 'constructor.hasOwnProperty(PROP_METADATA)').replace('Object.hasOwn(meta, name)', 'meta.hasOwnProperty(name)');}
      const propConstant = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === 'PROP_METADATA').map(n => ({s, n}))), 'property metadata key'); assert.equal(propConstant.n.initializer.text, '__prop__metadata__');
      const distinct = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === 'emitDistinctChangesOnlyDefaultValue').map(n => ({s, n}))), 'default distinct constant'); assert.equal(distinct.n.initializer.kind, ts.SyntaxKind.TrueKeyword);
      const runtimeQuery = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'Query').map(n => ({s, n}))), 'query metadata parent'); assert.equal(runtimeQuery.n.members.length, 0); assert.equal(Function.prototype.toString.call(model.runtime.Query), runtimeQuery.n.getText(runtimeQuery.s));
      const nested = []; function find(n) {if (ts.isFunctionDeclaration(n) && n.name?.text === 'PropDecoratorFactory') nested.push(n); ts.forEachChild(n, find);} find(entry.n); const runtimeBody = unique(nested, 'public property factory closure');
      for (const name of names) {
        assert.deepEqual(tokens(Function.prototype.toString.call(model.runtime[name])), tokens(runtimeBody.getText(entry.s)), 'public property factory identity ' + name);
        const initializer = unique(files.filter(s => s.fileName.endsWith('.mjs')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === name).map(n => ({s, n}))), 'public property initializer ' + name), call = initializer.n.initializer; assert.ok(ts.isCallExpression(call) && call.expression.text === 'makePropDecorator'); assert.equal(call.arguments[0].text, name); assert.equal(call.arguments.length, queryNames.includes(name) ? 3 : 2, 'no built-in additionalProcessing argument'); assert.ok(ts.isArrowFunction(call.arguments[1]));
        if (queryNames.includes(name)) assert.equal(call.arguments[2].text, 'Query'); props[name] = normalizedArrow(call.arguments[1], initializer.s, queryNames.includes(name)); initializers[name] = print(initializer.n, initializer.s);
        const variable = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).filter(n => n.name.text === name).map(n => ({s, n}))), 'public variable ' + name); stable(variable.n); stable(variable.n.parent.parent); assert.equal(variable.n.type.getText(variable.s), name + 'Decorator');
      }
      for (const name of ['Input', 'Output', 'Query', ...names.map(n => n + 'Decorator')]) {
        const type = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(n => ts.isInterfaceDeclaration(n) && n.name?.text === name).map(n => ({s, n}))), 'whole property interface ' + name); stable(type.n); type.n.members.forEach(stable); declarations[name] = print(type.n, type.s).replace(/^(?:(?:export|declare) )+/, '');
        if (name === 'ContentChildrenDecorator') assert.ok(type.n.getFullText(type.s).includes('This config option is **deprecated**'));
      }
      for (const name of queryNames) {const alias = unique(files.filter(s => s.fileName.endsWith('.d.ts')).flatMap(s => s.statements.filter(n => ts.isTypeAliasDeclaration(n) && n.name?.text === name).map(n => ({s, n}))), 'query public alias ' + name); stable(alias.n); assert.equal(alias.n.type.getText(alias.s), 'Query');}
      model.property_contract = {declarations, initializers, props, full_factory: print(entry.n, entry.s), normalized_factory: tokens(factory), distinct_default: true, property_key: '__prop__metadata__', ownership_check: model.subject.line === 'main' ? 'Object.hasOwn' : 'receiver.hasOwnProperty', additional_processing_removed: !original};
    }
    for (const model of loaded.models) for (const key of ['declarations', 'props', 'normalized_factory']) assert.deepEqual(model.property_contract[key], loaded.models[0].property_contract[key], 'property contract differs beyond measured changes: ' + key);
    return loaded;
  } catch (error) {loaded.dispose(); throw error;}
}
export function exercisePropertyDecorators(core, api = core) {
  const cases = [], input = new api.Input(), output = new api.Output(); assert.deepEqual(Object.keys(input), []); assert.equal(output.alias, undefined); assert.equal(input.ngMetadataName, 'Input'); assert.equal(output.ngMetadataName, 'Output'); cases.push('default-input-output-metadata');
  assert.equal(new api.Input('renamed').alias, 'renamed'); assert.equal(new api.Output('changed').alias, 'changed'); cases.push('string-aliases');
  let calls = 0; const transform = value => {calls++; return value;}, options = {alias: 'name', required: true, transform}, configured = new api.Input(options); assert.notEqual(configured, options); assert.equal(configured.alias, options.alias); assert.equal(configured.required, true); assert.equal(configured.transform, transform); assert.equal(calls, 0); assert.deepEqual(options, {alias: 'name', required: true, transform}); cases.push('input-options-transform-identity-not-eager-or-mutated');
  class Selector {} const read = new core.InjectionToken('read');
  for (const name of queryNames) {const q = new api[name](Selector); assert.equal(q instanceof core.Query, true); assert.equal(q.selector, Selector); assert.equal(q.first, name !== 'ContentChildren'); assert.equal(q.isViewQuery, name === 'ViewChild'); assert.equal(q.descendants, name !== 'ContentChildren'); if (name === 'ContentChildren') assert.equal(q.emitDistinctChangesOnly, true);} cases.push('query-parent-types-and-historical-defaults');
  for (const name of queryNames) {const data = name === 'ContentChildren' ? {descendants: true, read} : name === 'ContentChild' ? {descendants: false, read, static: true} : {read, static: true}; const before = {...data}, q = new api[name](Selector, data); assert.equal(q.read, read); if (name !== 'ContentChildren') assert.equal(q.static, true); assert.deepEqual(data, before); assert.equal(q.selector, Selector); if ('descendants' in data) assert.equal(q.descendants, data.descendants);} cases.push('query-options-read-identity-and-input-map-preserved');
  const forward = core.forwardRef(() => Selector), q = new api.ContentChildren(forward); assert.equal(q.selector, forward); cases.push('deferred-query-selector-retained-not-eagerly-resolved');
  class Target {} api.Input('first')(Target.prototype, 'value'); api.Output('second')(Target.prototype, 'value'); const descriptor = Object.getOwnPropertyDescriptor(Target, '__prop__metadata__'); assert.deepEqual([descriptor.enumerable, descriptor.configurable, descriptor.writable], [false, false, false]); assert.deepEqual(descriptor.value.value.map(m => m.ngMetadataName), ['Output', 'Input']); assert.deepEqual(descriptor.value.value.map(m => m.alias), ['second', 'first']); cases.push('property-metadata-prepend-order-and-descriptors');
  class Child extends Target {} api.Input('child')(Child.prototype, 'child'); assert.notEqual(Child.__prop__metadata__, Target.__prop__metadata__); assert.deepEqual(Object.keys(Child.__prop__metadata__), ['child']); assert.deepEqual(Object.keys(Target.__prop__metadata__), ['value']); cases.push('subclass-property-map-isolation');
  const fixture = new Function(...names, 'Selector', 'read', emit(`class Fixture { @Input('alias') value:any; @Output('changed') event:any; @ViewChild('ref',{static:true}) view:any; @ContentChild(Selector,{read,static:true}) child:any; @ContentChildren(Selector,{descendants:true}) children:any;} return Fixture;`))(...names.map(n => api[n]), Selector, read); const metadata = fixture.__prop__metadata__; assert.equal(metadata.value[0].alias, 'alias'); assert.equal(metadata.event[0].alias, 'changed'); assert.equal(metadata.view[0].static, true); assert.equal(metadata.child[0].read, read); assert.equal(metadata.children[0].descendants, true); cases.push('actual-typescript-emitted-field-decorators');
  assert.throws(() => api.Input()(undefined, 'value'), error => error.message === 'Standard Angular field decorators are not supported in JIT mode.'); cases.push('unsupported-standard-field-decorator-target-error');
  let reads = 0; const getterOptions = {get alias() {reads++; return 'getter';}}; assert.equal(new api.Input(getterOptions).alias, 'getter'); assert.equal(reads, 1); cases.push('metadata-option-getter-read-once');
  const inherited = Object.create({required: true}); inherited.alias = 'inherited'; assert.equal(new api.Input(inherited).required, true); cases.push('historical-inherited-option-fields');
  class Interposed {} api.Input()(Interposed.prototype, 'first'); Interposed.hasOwnProperty = () => false; const main = core.VERSION.full.startsWith('22.'); if (main) {api.Input()(Interposed.prototype, 'second'); assert.equal(Interposed.__prop__metadata__.second.length, 1);} else assert.throws(() => api.Input()(Interposed.prototype, 'second'), TypeError); cases.push('measured-constructor-ownership-interposition-difference');
  class NamedProperty {} api.Input()(NamedProperty.prototype, 'hasOwnProperty'); if (main) {api.Input()(NamedProperty.prototype, 'second'); assert.equal(NamedProperty.__prop__metadata__.second.length, 1);} else assert.throws(() => api.Input()(NamedProperty.prototype, 'second'), TypeError); cases.push('measured-property-name-hasOwnProperty-difference');
  return {cases, metadata_reflection_is_diagnostic_only: true, native_input_binding_query_discovery_executed: false};
}
export function compilePropertyTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(path), receipts = [];
  for (const model of models) {
    const file = join(dirname(dirname(dirname(model.package_root))), 'property-consumer.ts'), code = `import {Input,Output,ViewChild,ContentChild,ContentChildren,ElementRef,TemplateRef,forwardRef,booleanAttribute} from '@angular/core';
class Selected{} class Fixture{@Input() value:any;@Input('alias') aliased:any;@Input({alias:'disabled',required:true,transform:booleanAttribute}) disabled:any;@Output('changed') event:any;@ViewChild('ref',{static:true}) view:any;@ContentChild(TemplateRef,{read:ElementRef,static:true}) child:any;@ContentChildren(forwardRef(()=>Selected),{descendants:true,read:ElementRef}) children:any;}
new Input({transform:booleanAttribute});new Output('event');new ViewChild(Selected,{read:ElementRef});new ContentChild('selector',{descendants:false});new ContentChildren(Selected,{descendants:true});
// @ts-expect-error Input alias is a string.
Input({alias:1});
// @ts-expect-error Output alias is a string.
Output({alias:'wrong-shape'});
// @ts-expect-error Input transform is callable.
Input({transform:true});
// @ts-expect-error ContentChild static is boolean.
ContentChild(Selected,{static:1});
// @ts-expect-error ContentChildren descendants is boolean.
ContentChildren(Selected,{descendants:'true'});
// @ts-expect-error ViewChild does not accept descendants.
ViewChild(Selected,{descendants:true});
`;
    writeFileSync(file, code); const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, experimentalDecorators: true, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']}); const diagnostics = compiler.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'})); receipts.push({line: model.subject.line, negative_checks: 6, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}
export async function reviewPropertyDecoratorUses({root = rootDefault, subjects, compilerRoot, readSource, skipDiagnostics = false} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash); const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && names.includes(u.symbol)); assert.equal(uses.length, 99);
  const own = !subjects, loaded = subjects ?? await propertyDecoratorSubjects(root), read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
  try {
    const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n'); const actual = paths.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => names.includes((i.propertyName || i.name).text)))); assert.equal(actual.length, 47);
    const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy'); host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
    const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], applications = [];
    for (const path of actual) {
      const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path));
      for (const name of names) {
        const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === name)); if (!imports.length) continue; const imported = unique(imports, 'missing/ambiguous property import'), symbol = checker.getSymbolAtLocation(imported.name); assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported, 'property import shadowed'); const references = [];
        function publicIdentifier(node, expected) {const declaration = unique(checker.getSymbolAtLocation(node)?.declarations ?? [], 'exact option helper import'); assert.ok(ts.isImportSpecifier(declaration) && (declaration.propertyName || declaration.name).text === expected && declaration.parent.parent.parent.moduleSpecifier.text === moduleName, 'option helper must remain public core import');}
        function visit(node) {
          if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'runtime property decorator imported type only'); const call = node.parent; assert.ok(ts.isCallExpression(call) && call.expression === node && !call.typeArguments, 'unreviewed property alias/type/runtime use'); assert.ok(ts.isDecorator(call.parent), 'property call must remain decorator'); const member = call.parent.parent; assert.ok([ts.isPropertyDeclaration, ts.isGetAccessorDeclaration, ts.isSetAccessorDeclaration].some(test => test(member)) && ts.isIdentifier(member.name) && ts.isClassDeclaration(member.parent) && member.parent.name, 'unreviewed property target'); assert.notEqual(member.name.text, 'hasOwnProperty', 'nonordinary metadata property name'); assert.ok(!member.parent.members.some(m => m.modifiers?.some(x => x.kind === ts.SyntaxKind.StaticKeyword) && m.name?.getText(source) === 'hasOwnProperty'), 'nonordinary constructor ownership');
            const args = [...call.arguments];
            if (name === 'Input' || name === 'Output') {assert.ok(args.length <= 1, 'property decorator argument count'); if (args[0]) {assert.ok(ts.isStringLiteral(args[0]) || name === 'Input' && ts.isObjectLiteralExpression(args[0]), 'unreviewed input/output option shape'); if (ts.isObjectLiteralExpression(args[0])) {assert.ok(args[0].properties.every(p => ts.isPropertyAssignment(p) && ['alias', 'transform'].includes(p.name.getText(source))), 'unreviewed input option'); for (const p of args[0].properties) {if (p.name.getText(source) === 'alias') assert.ok(ts.isStringLiteral(p.initializer)); else {assert.ok(ts.isIdentifier(p.initializer)); publicIdentifier(p.initializer, 'booleanAttribute');}}}}}
            else {assert.ok(args.length === 1 || args.length === 2, 'query argument count'); assert.ok(ts.isIdentifier(args[0]) || ts.isStringLiteral(args[0]) || ts.isCallExpression(args[0]), 'unreviewed selector shape'); if (ts.isCallExpression(args[0])) {assert.ok(ts.isIdentifier(args[0].expression)); publicIdentifier(args[0].expression, 'forwardRef'); assert.ok(args[0].arguments.length === 1 && ts.isArrowFunction(args[0].arguments[0]) && args[0].arguments[0].parameters.length === 0 && ts.isIdentifier(args[0].arguments[0].body));} if (args[1]) {assert.ok(ts.isObjectLiteralExpression(args[1]), 'query options must be literal'); for (const p of args[1].properties) {assert.ok(ts.isPropertyAssignment(p)); const key = p.name.getText(source); assert.notEqual(key, 'emitDistinctChangesOnly', 'deprecated query option is not admitted'); assert.ok((name !== 'ViewChild' && key === 'descendants') || key === 'read' || name !== 'ContentChildren' && key === 'static', 'unreviewed query option'); if (key === 'read') assert.ok(ts.isIdentifier(p.initializer)); else assert.ok([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(p.initializer.kind));}}}
            const record = {line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: call.getText(source), target_class: member.parent.name.text, member: member.name.text, member_kind: ts.SyntaxKind[member.kind], argument_shapes: args.map(a => ts.SyntaxKind[a.kind])}; references.push(record); applications.push({source, call, name, local_name: imported.name.text, file, ...record});
          }
          ts.forEachChild(node, visit);
        }
        visit(source); let unused = null;
        if (!references.length) {assert.ok(unusedKeys.includes(file + '#' + name), 'unexpected unused property import'); const named = imported.parent, kept = named.elements.filter(e => e !== imported), changed = source.text.slice(0, named.getStart(source)) + '{' + kept.map(e => e.getText(source)).join(', ') + (named.elements.hasTrailingComma ? ',' : '') + '}' + source.text.slice(named.end); const transpile = t => ts.transpileModule(t, {compilerOptions: {...options, removeComments: true, emitDecoratorMetadata: false}}).outputText; assert.equal(hash(transpile(source.text)), hash(transpile(changed))); unused = {emit_sha256: hash(transpile(source.text)), metadata_mode: false, emitter: ts.version};}
        cases.push({file, module: moduleName, symbol: name, local_name: imported.name.text, frozen_use: uses.some(u => u.file === file && u.symbol === name), candidate_source_sha256: hash(source.text), references, unused_import_erasure: unused});
      }
    }
    assert.equal(cases.length, 101); assert.deepEqual(cases.filter(c => !c.frozen_use).map(c => c.file + '#' + c.symbol).sort(), deltaKeys); for (const use of uses) assert.ok(cases.some(c => c.file === use.file && c.symbol === use.symbol)); assert.equal(applications.length, 321);
    const behaviors = [], authored = [];
    if (!skipDiagnostics) for (const model of loaded.models) {
      behaviors.push({line: model.subject.line, ...exercisePropertyDecorators(model.runtime)}); const receipts = [];
      for (const app of applications) {
        const identifiers = new Map(), source = app.source;
        function visit(node) {if (ts.isIdentifier(node)) {const parent = node.parent; if (!(ts.isPropertyAssignment(parent) && parent.name === node) && !(ts.isPropertyAccessExpression(parent) && parent.name === node) && !(ts.isArrowFunction(parent) && parent.parameters.some(p => p.name === node))) identifiers.set(node.text, checker.getSymbolAtLocation(node));} ts.forEachChild(node, visit);}
        app.call.arguments.forEach(visit); const values = [];
        for (const [name, symbol] of identifiers) {const imported = symbol?.declarations?.find(ts.isImportSpecifier), publicName = imported && (imported.propertyName || imported.name).text; if (imported?.parent.parent.parent.moduleSpecifier.text === moduleName && ['forwardRef', 'booleanAttribute'].includes(publicName)) values.push(model.runtime[publicName]); else values.push(new model.runtime.InjectionToken('selector/read protocol:' + name));}
        const callback = new Function(app.local_name, ...identifiers.keys(), emit('return ' + app.call.getText(source) + ';'))(model.runtime[app.name], ...values); class Target {} callback(Target.prototype, app.member); const metadata = Target.__prop__metadata__[app.member][0]; assert.equal(metadata.ngMetadataName, app.name); if (app.name === 'Input' && app.call.arguments[0] && ts.isStringLiteral(app.call.arguments[0])) assert.equal(metadata.alias, app.call.arguments[0].text); if (app.name === 'Input' && app.call.arguments[0] && ts.isObjectLiteralExpression(app.call.arguments[0])) assert.equal(metadata.transform, model.runtime.booleanAttribute); receipts.push({file: app.file, target_class: app.target_class, member: app.member, symbol: app.name, metadata_name_and_registration_verified: true, selector_read_are_protocol: queryNames.includes(app.name)});
      }
      authored.push({line: model.subject.line, annotation_count: 321, annotations: receipts});
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main'; assert.equal(manifest.peerDependencies[moduleName], '^' + loaded.models.find(m => m.subject.line === line).subject.version);
    return {schema_version: 1, line, frozen_uses: 99, current_uses: 101, current_delta_uses: 2, node: process.version, binding_parser: ts.version, cases, behaviors, authored_annotations: authored, rxjs: loaded.rxjs, source_override_used: !!readSource, subjects: loaded.models.map(m => ({subject: {...m.subject, members: undefined}, property_contract: {...m.property_contract, props: undefined, normalized_factory: undefined, props_sha256: hash(JSON.stringify(m.property_contract.props)), normalized_factory_sha256: hash(JSON.stringify(m.property_contract.normalized_factory))}})), type_compilation: skipDiagnostics ? null : compilePropertyTypes(loaded.models, compilerRoot), limits: ['Public property/query annotation metadata boundary; reflection reads implementation output and is not a new consumer API.', '321 actual call expressions replayed; selector/read/local class identities are protocol tokens, public forwardRef/booleanAttribute genuine. Native bindings/query discovery/full classes/actual selector identities and floors remain separate.', 'Deprecated emitDistinctChangesOnly explicit option rejected, default internal metadata source inspected. Main ownership differences explicit; no product source/style/golden change.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
