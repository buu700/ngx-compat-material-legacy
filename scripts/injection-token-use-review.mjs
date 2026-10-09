/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Stable InjectionToken overloads,unique owned tokens and explicit factory contracts. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { elementRefSubjects } from './element-ref-use-review.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), moduleName = '@angular/core';
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const deltaFiles = ['legacy-tabs/internal/tab-token.ts', 'legacy-form-field/owned-tokens.ts', 'legacy-menu/internal/menu-panel-token.ts', 'legacy-progress-bar/internal/progress-bar-defaults.ts', 'legacy-progress-bar/internal/progress-bar-location.ts'];
const unusedFiles = ['legacy-menu/internal/menu-base.ts', 'legacy-menu/internal/menu-trigger-base.ts', 'legacy-tooltip/internal/tooltip-base.ts', 'legacy-autocomplete/internal/autocomplete-trigger-base.ts', 'legacy-paginator/internal/paginator-base.ts'];
const printer = ts.createPrinter({ removeComments: true }), print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
function parse(path, text) { const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source; }
const unstable = node => ts.getJSDocTags(node).filter(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text));
function binding(files, path, name, kind, chain = []) {
    assert.ok(chain.length < 10);
    const source = files.get(path);
    assert.ok(source, 'missing token export closure');
    const local = source.statements.filter(n => kind(n) && n.name?.text === name);
    if (local.length) {
        assert.equal(local.length, 1);
        return { source, node: local[0], chain };
    }
    for (const link of source.statements) {
        const clause = ts.isExportDeclaration(link) ? link.exportClause : ts.isImportDeclaration(link) ? link.importClause?.namedBindings : null;
        if (!clause || !ts.isNamedExports(clause) && !ts.isNamedImports(clause))
            continue;
        const item = clause.elements.find(e => e.name.text === name);
        if (!item)
            continue;
        assert.equal(unstable(item).length, 0);
        const targetName = (item.propertyName || item.name).text;
        if (!link.moduleSpecifier)
            return binding(files, path, targetName, kind, [...chain, { path, name, target_name: targetName }]);
        assert.ok(link.moduleSpecifier.text.startsWith('./'));
        const target = posix.join(posix.dirname(path), path.endsWith('.d.ts') ? link.moduleSpecifier.text.replace(/\.js$/, '.d.ts') : link.moduleSpecifier.text);
        return binding(files, target, targetName, kind, [...chain, { path, name, target, target_name: targetName }]);
    }
    assert.fail('missing public token binding');
}
function tokens(text) {
    const source = parse('contract.ts', text.startsWith('class ') ? text : `class Boundary {${text}}`), out = [];
    function visit(node) { const children = node.getChildren(source); if (children.length)
        children.forEach(visit);
    else if (node.kind !== ts.SyntaxKind.EndOfFileToken)
        out.push([node.kind, node.getText(source)]); }
    visit(source);
    return out.filter((t, i) => !(t[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken].includes(out[i + 1]?.[0])));
}
export async function injectionTokenSubjects(root = defaultRoot) {
    const base = await elementRefSubjects(root);
    try {
        for (const model of base.models) {
            const files = new Map([...model.sources].filter(([p]) => p.endsWith('.mjs') || p.endsWith('.d.ts')).map(([p, t]) => [p, parse(p, t)]));
            const rb = binding(files, model.subject.runtime_entry.replace(/^\.\//, ''), 'InjectionToken', ts.isClassDeclaration), tb = binding(files, model.subject.type_entry.replace(/^\.\//, ''), 'InjectionToken', ts.isClassDeclaration);
            assert.equal(unstable(tb.node).length, 0);
            const ctors = tb.node.members.filter(ts.isConstructorDeclaration), deprecated = ctors.filter(c => unstable(c).length), original = model.subject.line === 'original';
            assert.equal(deprecated.length, original ? 0 : 1);
            if (deprecated.length)
                assert.deepEqual(unstable(deprecated[0]).map(t => [t.tagName.text, t.comment]), [['deprecated', "The `providedIn: NgModule` or `providedIn:'any'` options are deprecated. Please use the other signature."]]);
            const kept = tb.node.members.filter(m => !deprecated.includes(m));
            kept.forEach(m => assert.equal(unstable(m).length, 0));
            const projected = ts.factory.updateClassDeclaration(tb.node, undefined, tb.node.name, tb.node.typeParameters, tb.node.heritageClauses, kept);
            const declaration = print(projected, tb.source).replace(/^(?:(?:export|declare) )+/, '');
            assert.equal(ctors.length, original ? 1 : 2);
            const cls = rb.node, source = rb.source, runtimeCtors = cls.members.filter(ts.isConstructorDeclaration);
            assert.equal(runtimeCtors.length, 1);
            assert.equal(cls.heritageClauses, undefined);
            const ctor = runtimeCtors[0], statements = [...ctor.body.statements], fields = cls.members.filter(ts.isPropertyDeclaration);
            assert.deepEqual(fields.map(f => f.name.text), original ? [] : ['_desc', 'ngMetadataName', 'ɵprov']);
            if (original) {
                assert.equal(print(statements[1], source), "this.ngMetadataName = 'InjectionToken';");
                statements.splice(1, 1);
            }
            else {
                assert.equal(fields[0].initializer, undefined);
                assert.equal(fields[2].initializer, undefined);
                assert.equal(print(fields[1].initializer, source), "'InjectionToken'");
            }
            const normalized = ts.factory.updateConstructorDeclaration(ctor, ctor.modifiers, ctor.parameters, ts.factory.updateBlock(ctor.body, statements));
            const constructor = tokens(print(normalized, source)), methods = cls.members.filter(m => ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m));
            assert.deepEqual(methods.map(m => m.name.text), ['multi', 'toString']);
            assert.equal(cls.members.length, 1 + fields.length + methods.length);
            model.token_contract = { declaration, constructor, methods: methods.map(m => tokens(print(m, source))), deprecated_constructor: deprecated.length ? print(deprecated[0], tb.source) : null };
            const helpers = [...files.values()].filter(source => source.fileName.endsWith('.mjs')).flatMap(source => source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ɵɵdefineInjectable').map(node => ({source, node})));
            assert.equal(helpers.length, 1, 'missing complete injectable definition helper');
            const helper = helpers[0];
            // Inspect the full private implementation dependency; product code uses only the
            // stable public constructor and never imports/invokes this helper.
            model.token_contract.define_injectable = tokens('class Helper {static ' + print(helper.node, helper.source).replace(/^function /, '') + '}');
            model.token_export_chains = { runtime: rb.chain, types: tb.chain };
            assert.equal(typeof model.runtime.InjectionToken, 'function');
        }
        const original = base.models.find(m => m.subject.line === 'original');
        for (const model of base.models) {
            assert.equal(model.token_contract.declaration, original.token_contract.declaration);
            assert.deepEqual(model.token_contract.constructor, original.token_contract.constructor, 'token constructor behavior changed outside field relocation');
            assert.deepEqual(model.token_contract.methods, original.token_contract.methods);
            assert.deepEqual(model.token_contract.define_injectable, original.token_contract.define_injectable, 'complete token definition helper changed');
        }
        return base;
    }
    catch (error) {
        base.dispose();
        throw error;
    }
}
export function exerciseInjectionToken(core, Token = core.InjectionToken) {
    const cases = [], a = new Token('same'), b = new Token('same'), first = {}, second = {}, override = {}, missing = new Token('same');
    assert.notEqual(a, b);
    assert.equal(a.toString(), 'InjectionToken same');
    assert.equal(b.toString(), a.toString());
    assert.equal(a instanceof core.InjectionToken, true);
    cases.push('same-description-distinct-public-token');
    const parent = core.Injector.create({ providers: [{ provide: a, useValue: first }, { provide: b, useValue: second }] }), child = core.Injector.create({ providers: [{ provide: a, useValue: override }], parent });
    try {
        assert.equal(parent.get(a), first);
        assert.equal(parent.get(b), second);
        assert.equal(child.get(a), override);
        assert.equal(child.get(b), second);
        cases.push('identity-provider-parent-child-override');
        assert.equal(core.runInInjectionContext(child, () => core.inject(a)), override);
        assert.equal(core.runInInjectionContext(child, () => core.inject(b)), second);
        cases.push('public-inject-distinct-token-identity');
        assert.equal(core.runInInjectionContext(child, () => core.inject(missing, { optional: true })), null);
        const fallback = {};
        assert.equal(child.get(missing, fallback), fallback);
        assert.throws(() => child.get(missing));
        cases.push('equal-description-missing-token-options');
    }
    finally {
        child.destroy();
        parent.destroy();
    }
    const multi = new Token('multi'), values = [{}, {}], multiInjector = core.Injector.create({ providers: values.map(value => ({ provide: multi, useValue: value, multi: true })) });
    try {
        const result = multiInjector.get(multi);
        assert.equal(result[0], values[0]);
        assert.equal(result[1], values[1]);
        assert.equal(result.length, 2);
        assert.equal(multiInjector.get(multi), result);
        cases.push('explicit-multi-order-identity-cache');
    }
    finally {
        multiInjector.destroy();
    }
    let calls = 0;
    const answer = {}, factory = () => { calls++; return answer; }, root = new Token('factory', { providedIn: 'root', factory });
    assert.equal(calls, 0);
    cases.push('constructor-does-not-call-root-factory');
    const injector = core.Injector.create({ providers: [{ provide: root, useFactory: factory }] });
    try {
        assert.equal(calls, 0);
        assert.equal(injector.get(root), answer);
        assert.equal(injector.get(root), answer);
        assert.equal(calls, 1);
        cases.push('explicit-factory-lazy-once-result-identity');
    }
    finally {
        injector.destroy();
    }
    const absentParent = core.Injector.create({ providers: [] }), env = core.createEnvironmentInjector([], absentParent);
    try {
        assert.equal(env.get(root, null), null);
        assert.equal(calls, 1);
        cases.push('standalone-environment-is-not-application-root');
    }
    finally {
        env.destroy();
        absentParent.destroy();
    }
    const sentinel = new Error('factory sentinel'), bad = new Token('bad'), failed = core.Injector.create({ providers: [{ provide: bad, useFactory: () => { throw sentinel; } }] });
    try {
        assert.throws(() => failed.get(bad), error => error === sentinel);
        cases.push('explicit-factory-error-identity');
    }
    finally {
        failed.destroy();
    }
    let setters = 0;
    class UnsupportedAccessor extends Token {
        get _desc() { return 'value'; }
        set _desc(value) { setters++; }
    }
    new UnsupportedAccessor('value');
    return { cases, unsupported_js_accessor_setter_calls: setters, automatic_application_root_factory_executed: false, native_environment: false };
}
function executeTokenDeclaration(source, variable, core) {
    const declaration = variable.initializer;
    let options = declaration.arguments[1], factoryNode = null;
    if (options) {
        factoryNode = options.properties.find(p => p.name.getText(source) === 'factory').initializer;
    }
    const helper = factoryNode && ts.isIdentifier(factoryNode) ? source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === factoryNode.text) : null;
    if (factoryNode && ts.isIdentifier(factoryNode))
        assert.ok(helper, 'unowned token callback');
    const documentToken = new core.InjectionToken('document protocol'), code = (helper ? print(helper, source).replace(/^export /, '') + '\n' : '') + 'const owned = ' + declaration.getText(source) + ';\nreturn owned;';
    const emitted = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
    const token = new Function(declaration.expression.text, 'inject', 'DOCUMENT', emitted)(core.InjectionToken, core.inject, documentToken);
    const callback = options ? new Function(declaration.expression.text, 'inject', 'DOCUMENT', ts.transpileModule((helper ? print(helper, source).replace(/^export /, '') + '\n' : '') + 'return ' + factoryNode.getText(source) + ';', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText)(core.InjectionToken, core.inject, documentToken) : null;
    return { token, callback, documentToken };
}
export function compileTokenTypes(models, compilerRoot) {
    const compilerPath = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript'), compiler = require(compilerPath), results = [];
    for (const model of models) {
        const file = join(dirname(dirname(dirname(model.package_root))), 'token-consumer.ts'), code = `import {InjectionToken,Injector,inject,runInInjectionContext} from '@angular/core';
const value=new InjectionToken<string>('value');const root=new InjectionToken<number>('root',{providedIn:'root',factory:()=>1});
const defaultScope=new InjectionToken<number>('default',{factory:()=>1});declare const injector:Injector;
const injected:string=runInInjectionContext(injector,()=>inject(value));const optional:string|null=runInInjectionContext(injector,()=>inject(value,{optional:true}));
const debug:string=value.toString();
// @ts-expect-error Descriptions are strings.
new InjectionToken(1);
// @ts-expect-error Root option objects require a factory.
new InjectionToken<number>('bad',{providedIn:'root'});
// @ts-expect-error The typed factory result is checked.
new InjectionToken<number>('bad',{providedIn:'root',factory:()=> 'string'});
// @ts-expect-error Numeric internal constructor paths are outside the public declaration.
new InjectionToken('bad',-1);
class UnsupportedAccessor extends InjectionToken<number>{
// @ts-expect-error The protected data field cannot become an accessor.
protected get _desc():string{return 'bad';}
}
const obsolete=new InjectionToken<number>('obsolete',{providedIn:'any',factory:()=>1});
`;
        writeFileSync(file, code);
        const options = { target: compiler.ScriptTarget.ES2022, module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'] };
        const program = compiler.createProgram([file], options), diagnostics = compiler.getPreEmitDiagnostics(program);
        assert.equal(diagnostics.length, 0, compiler.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: p => p, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n' }));
        const checker = program.getTypeChecker(), consumer = program.getSourceFile(file), signatures = [];
        function visit(node) { if (compiler.isNewExpression(node) && compiler.isIdentifier(node.expression) && node.expression.text === 'InjectionToken' && node.arguments && compiler.isStringLiteral(node.arguments[0]) && ['value', 'root', 'default', 'obsolete'].includes(node.arguments[0].text)) {
            const declaration = checker.getResolvedSignature(node).getDeclaration();
            const tags = compiler.getJSDocTags(declaration).map(t => t.tagName.text);
            const obsolete = node.arguments[0].text === 'obsolete';
            assert.equal(tags.includes('deprecated'), obsolete && model.subject.line !== 'original');
            signatures.push({ description: node.arguments[0].text, deprecated: tags.includes('deprecated') });
        } compiler.forEachChild(node, visit); }
        visit(consumer);
        results.push({ line: model.subject.line, compiler: compiler.version, negative_checks: 5, stable_signature_resolution_checked: true, deprecated_scope_signature_control: signatures.find(s => s.description === 'obsolete').deprecated, fixture_sha256: hash(code) });
    }
    return { compiler: compiler.version, compiler_source_sha256: hash(readFileSync(compilerPath)), subjects: results, scope: 'Complete genuine core declarations with borrowed RxJS;not AOT/native/full floors.' };
}
export async function reviewInjectionTokenUses({ root = defaultRoot, readSource, compilerRoot, subjects, skipDiagnostics = false } = {}) {
    const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
    assert.equal(hash(seed), seedHash);
    const uses = JSON.parse(seed).symbol_uses.filter(u => u.module === moduleName && u.symbol === 'InjectionToken');
    assert.equal(uses.length, 20);
    const own = !subjects, loaded = subjects ?? await injectionTokenSubjects(root), { models, rxjs } = loaded, read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8');
    try {
        const discovered = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'], { cwd: root, encoding: 'utf8' }).trim().split('\n'), actual = discovered.filter(p => parse(p, read(p)).statements.some(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some(i => (i.propertyName || i.name).text === 'InjectionToken')));
        assert.equal(actual.length, 25);
        assert.deepEqual(actual.map(p => p.slice('projects/ngx-material-legacy/'.length)).filter(p => !uses.some(u => u.file === p)).sort(), [...deltaFiles].sort());
        for (const use of uses)
            assert.ok(actual.includes('projects/ngx-material-legacy/' + use.file), 'missing frozen token import');
        const options = { noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true }, host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host), authoredRoot = join(root, 'projects/ngx-material-legacy');
        host.readFile = p => p.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + p.slice(authoredRoot.length + 1)) : originalRead(p);
        const program = ts.createProgram(actual.map(p => join(root, p)), options, host), checker = program.getTypeChecker(), cases = [], declarations = [];
        for (const path of actual) {
            const file = path.slice('projects/ngx-material-legacy/'.length), source = program.getSourceFile(join(root, path));
            assert.ok(source);
            const bindings = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)).flatMap(n => n.importClause.namedBindings.elements.filter(i => (i.propertyName || i.name).text === 'InjectionToken'));
            assert.equal(bindings.length, 1, 'missing/ambiguous token import');
            const imported = bindings[0], symbol = checker.getSymbolAtLocation(imported.name), references = [];
            assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported, 'token import shadowed');
            function visit(node) {
                if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName && checker.getSymbolAtLocation(node) === symbol) {
                    const parent = node.parent;
                    let kind, description = null, tokenName = null;
                    if (ts.isTypeReferenceNode(parent) && parent.typeName === node) {
                        assert.equal(parent.typeArguments?.length, 1);
                        kind = 'token-type';
                    }
                    else {
                        assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly, 'token runtime imported as type only');
                        assert.ok(ts.isNewExpression(parent) && parent.expression === node, 'unreviewed token alias/subclass/runtime use');
                        assert.equal(parent.typeArguments?.length, 1);
                        assert.ok(parent.arguments.length === 1 || parent.arguments.length === 2, 'token requires reviewed constructor arguments');
                        assert.ok(ts.isStringLiteral(parent.arguments[0]), 'token description must be the reviewed literal');
                        description = parent.arguments[0].text;
                        assert.ok(ts.isVariableDeclaration(parent.parent) && parent.parent.initializer === parent && ts.isIdentifier(parent.parent.name), 'token must be a named owned variable');
                        tokenName = parent.parent.name.text;
                        kind = 'owned-token-construction';
                        if (parent.arguments[1]) {
                            const option = parent.arguments[1];
                            assert.ok(ts.isObjectLiteralExpression(option), 'token options must be reviewed inline object');
                            assert.deepEqual(option.properties.map(p => p.name?.getText(source)).sort(), ['factory', 'providedIn']);
                            assert.ok(option.properties.every(ts.isPropertyAssignment));
                            const provided = option.properties.find(p => p.name.getText(source) === 'providedIn').initializer;
                            assert.ok(ts.isStringLiteral(provided) && provided.text === 'root', 'deprecated/unreviewed providedIn scope');
                            const factory = option.properties.find(p => p.name.getText(source) === 'factory').initializer;
                            assert.ok(ts.isArrowFunction(factory) || ts.isIdentifier(factory), 'unreviewed factory expression');
                            if (ts.isArrowFunction(factory))
                                assert.equal(factory.parameters.length, 0);
                        }
                        declarations.push({ source, variable: parent.parent, file, description, token_name: tokenName });
                    }
                    references.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind, description, token_name: tokenName, expression: parent.getText(source) });
                }
                ts.forEachChild(node, visit);
            }
            visit(source);
            let unused = null;
            if (!references.length) {
                assert.ok(unusedFiles.includes(file), 'unexpected unused token import');
                const named = imported.parent, kept = named.elements.filter(e => e !== imported), changed = source.text.slice(0, named.getStart(source)) + '{' + kept.map(e => e.getText(source)).join(', ') + (named.elements.hasTrailingComma ? ',' : '') + '}' + source.text.slice(named.end);
                const emit = t => ts.transpileModule(t, { compilerOptions: { ...options, removeComments: true, emitDecoratorMetadata: false } }).outputText;
                assert.equal(hash(emit(source.text)), hash(emit(changed)), 'unused import changes runtime emit');
                unused = { emit_sha256: hash(emit(source.text)), emitter: ts.version, metadata_mode: false };
            }
            cases.push({ file, module: moduleName, symbol: 'InjectionToken', frozen_use: uses.some(u => u.file === file), local_name: imported.name.text, candidate_source_sha256: hash(source.text), references, unused_import_erasure: unused });
        }
        assert.equal(declarations.length, 27);
        assert.equal(cases.filter(c => c.unused_import_erasure).length, 5);
        assert.equal(cases.flatMap(c => c.references).filter(r => r.kind === 'token-type').length, 1);
        const authored = [];
        if (!skipDiagnostics)
            for (const model of models) {
                const tokens = new Map(), receipts = [];
                for (const d of declarations) {
                    const value = executeTokenDeclaration(d.source, d.variable, model.runtime);
                    assert.equal(value.token.toString(), 'InjectionToken ' + d.description);
                    assert.equal(value.token instanceof model.runtime.InjectionToken, true);
                    tokens.set(d.file + ':' + d.token_name, value.token);
                    let callback = null;
                    if (value.callback) {
                        const doc = { location: { pathname: '/initial', search: '?one' } }, injector = model.runtime.Injector.create({ providers: [{ provide: value.documentToken, useValue: doc }, { provide: value.token, useFactory: value.callback }] });
                        try {
                            const result = injector.get(value.token);
                            assert.equal(injector.get(value.token), result);
                            callback = { result_kind: typeof result, cached_identity: true, automatic_application_root: false, document_dependency_is_protocol_token: true };
                        }
                        finally {
                            injector.destroy();
                        }
                    }
                    receipts.push({ file: d.file, token_name: d.token_name, description: d.description, callback });
                }
                assert.equal(new Set(tokens.values()).size, 27, 'owned tokens were deduplicated');
                authored.push({ line: model.subject.line, owned_token_count: 27, distinct_identity_count: 27, tokens: receipts });
            }
        const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
        assert.equal(manifest.peerDependencies[moduleName], '^' + models.find(m => m.subject.line === line).subject.version);
        return { schema_version: 1, line, node: process.version, binding_parser: ts.version, frozen_uses: 20, current_uses: 25, current_delta_uses: 5, cases, authored_tokens: authored, rxjs, source_override_used: !!readSource,
            behaviors: skipDiagnostics ? [] : models.map(m => ({ line: m.subject.line, ...exerciseInjectionToken(m.runtime) })), type_compilation: skipDiagnostics ? null : compileTokenTypes(models, compilerRoot),
            subjects: models.map(({ runtime, sources, package_root, token_contract, ...m }) => ({ ...m, token_contract: { ...token_contract, constructor_sha256: hash(JSON.stringify(token_contract.constructor)), methods_sha256: hash(JSON.stringify(token_contract.methods)), definition_helper_sha256: hash(JSON.stringify(token_contract.define_injectable)), constructor: undefined, methods: undefined, define_injectable: undefined } })),
            limits: ['Exact20 frozen and5 supplementary imports/27owned token declarations. Five unused imports erased under actual no-metadata transpile profile. No product source change.',
                'Deprecated numeric/internal or any/NgModule scope paths are inspected but not admitted. Whole public modules use borrowed RxJS7.8.2. Explicit-provider factories are not automatic application-root resolution.',
                'Owned factory snippets run only for token callback/cache boundaries;DOCUMENT is a protocol token. Complete owned factory/consumer/native/Node/RxJS/floor/upstream SHA obligations remain separate.'], g11_claim: 'not-passed' };
    }
    finally {
        if (own)
            loaded.dispose();
    }
}
