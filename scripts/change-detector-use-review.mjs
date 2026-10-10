/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public detector source/type/component lead; actual legacy callers remain separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'projects/ngx-material-legacy/';
const supplements = ['legacy-dialog/dialog-container.ts',
  'legacy-dialog/internal/dialog-container-base.ts',
  'legacy-dialog/internal/dialog-container-state.ts',
  'legacy-menu/internal/menu-item-context.ts'].sort();
function one(nodes, label) { assert.equal(nodes.length, 1, label); return nodes[0]; }
function imported(source, name) {
  return source.statements.filter(ts.isImportDeclaration).filter(node =>
    node.moduleSpecifier.text === '@angular/core' && node.importClause?.namedBindings &&
    ts.isNamedImports(node.importClause.namedBindings)).flatMap(node =>
    node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === name));
}
function coreBinding(checker, node, name) {
  const binding = checker.getSymbolAtLocation(node)?.declarations?.find(ts.isImportSpecifier);
  assert.ok(binding && (binding.propertyName || binding.name).text === name &&
    binding.parent.parent.parent.moduleSpecifier.text === '@angular/core', 'public core binding changed');
  assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly, 'runtime core binding imported type only');
}

export function scanChangeDetectorUses({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen = JSON.parse(seed).symbol_uses.filter(row => row.module === '@angular/core' && row.symbol === 'ChangeDetectorRef');
  assert.equal(frozen.length, 38);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'],
    {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(join(root, prefix))
    ? read(prefix + path.slice(join(root, prefix).length)) : oldRead(path);
  const program = ts.createProgram(paths.map(path => join(root, path)), options, host);
  const checker = program.getTypeChecker(), cases = [], receivers = new Set(), receiverRecords = [];
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path));
    assert.equal(source.parseDiagnostics.length, 0);
    const imports = imported(source, 'ChangeDetectorRef');
    if (!imports.length) continue;
    const binding = one(imports, 'missing/ambiguous detector import');
    const symbol = checker.getSymbolAtLocation(binding.name), references = [];
    assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === binding);
    const file = path.slice(prefix.length);
    function addReceiver(node) {
      if (receivers.has(node)) return;
      receivers.add(node);
      receiverRecords.push({file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        kind: ts.SyntaxKind[node.kind], declaration: node.getText(source)});
    }
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName &&
          checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent;
        let role, context;
        if (ts.isTypeReferenceNode(parent) && parent.typeName === node && !parent.typeArguments) {
          context = parent.parent;
          while (ts.isUnionTypeNode(context)) context = context.parent;
          assert.ok(ts.isParameter(context) || ts.isPropertyDeclaration(context) || ts.isPropertySignature(context),
            'unreviewed detector type context');
          role = 'type:' + ts.SyntaxKind[context.kind]; addReceiver(context);
        } else if (ts.isCallExpression(parent) && parent.arguments.length === 1 && parent.arguments[0] === node) {
          coreBinding(checker, node, 'ChangeDetectorRef');
          context = parent;
          const target = checker.getSymbolAtLocation(parent.expression)?.declarations;
          const isAmbient = file === 'legacy-dialog/internal/dialog-container-base.ts' &&
            target?.length === 1 && ts.isFunctionDeclaration(target[0]) && target[0].name.text === 'ambientService';
          if (!isAmbient) coreBinding(checker, parent.expression, 'inject');
          role = isAmbient ? 'owned-optional-ambient-token' : 'public-inject-token';
          if (ts.isPropertyDeclaration(parent.parent)) addReceiver(parent.parent);
        } else if (ts.isArrayLiteralExpression(parent) && file === 'legacy-menu/internal/menu-item-context.ts' &&
                   parent.elements.length === 2 && parent.elements[0] === node) {
          coreBinding(checker, node, 'ChangeDetectorRef');
          const value = parent.elements[1];
          assert.ok(ts.isCallExpression(value) && value.arguments.length === 1 &&
            checker.getSymbolAtLocation(value.arguments[0]) === symbol, 'detector context token/value pair changed');
          coreBinding(checker, value.expression, 'inject');
          role = 'owned-menu-context-token-key'; context = parent;
        } else assert.fail('unreviewed detector import role');
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          role, context: context.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(references.length, 'unused detector import');
    cases.push({file, module: '@angular/core', symbol: 'ChangeDetectorRef', local_name: binding.name.text,
      supplementary: !frozen.some(row => row.file === file), candidate_source_sha256: hash(source.text), references});
  }
  assert.deepEqual(cases.filter(row => row.supplementary).map(row => row.file).sort(), supplements);
  assert.deepEqual(cases.filter(row => !row.supplementary).map(row => row.file).sort(), frozen.map(row => row.file).sort());
  assert.equal(cases.length, 42); assert.equal(cases.flatMap(row => row.references).length, 48);
  assert.equal(receivers.size, 46);
  const calls = [];
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path));
    function visit(node) {
      if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
        const receiver = node.expression.expression;
        const declarations = checker.getSymbolAtLocation(receiver)?.declarations ?? [];
        if (declarations.some(declaration => receivers.has(declaration))) {
          assert.ok(ts.isPropertyAccessExpression(node.expression), 'unreviewed computed detector call');
          const method = node.expression.name.text;
          assert.ok(['markForCheck', 'detectChanges'].includes(method), 'unreviewed detector method');
          assert.equal(node.arguments.length, 0, 'detector method arguments changed');
          calls.push({file: path.slice(prefix.length), source_sha256: hash(source.text),
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            method, expression: node.getText(source), receiver_declarations: declarations.filter(declaration =>
              receivers.has(declaration)).map(declaration => ({file: declaration.getSourceFile().fileName.slice(join(root, prefix).length),
                line: declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}))});
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(calls.length, 94); assert.equal(calls.filter(row => row.method === 'markForCheck').length, 85);
  assert.equal(calls.filter(row => row.method === 'detectChanges').length, 9);
  return {frozen_uses: 38, current_uses: 42, supplementary_uses: 4, cases,
    receiver_declarations: receiverRecords, calls, binding_parser: ts.version,
    source_override_used: !!readSource,
    limits: 'Checker binding uses a noResolve source program, including local ancestors and standard library types. It is not a product compilation, exhaustive escape/alias analysis or execution of the actual legacy callers.'};
}

export function inspectChangeDetectorContracts(subjects) {
  return subjects.models.map(model => {
    const records = [];
    for (const [path, text] of model.sources) {
      if (!path.startsWith('@angular/core/') || !/\.(mjs|d\.ts)$/.test(path)) continue;
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const node of source.statements) if (ts.isClassDeclaration(node) && node.name?.text === 'ChangeDetectorRef') {
        assert.ok(!ts.getJSDocTags(node).some(tag => ['deprecated', 'internal'].includes(tag.tagName.text)));
        records.push({path, source_sha256: hash(text), whole_class: node.getText(source), members: node.members.map(member =>
          ({name: member.name?.getText(source) ?? ts.SyntaxKind[member.kind],
            tags: ts.getJSDocTags(member).map(tag => tag.tagName.text), text: member.getText(source)}))});
        if (path.endsWith('.d.ts')) {
          assert.ok(node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.AbstractKeyword));
          assert.deepEqual(node.members.map(member => member.name.text), model.line === 'main'
            ? ['markForCheck', 'detach', 'detectChanges', 'reattach']
            : ['markForCheck', 'detach', 'detectChanges', 'checkNoChanges', 'reattach']);
          for (const member of node.members) {
            assert.equal(member.parameters.length, 0); assert.equal(member.type.kind, ts.SyntaxKind.VoidKeyword);
            const tags = ts.getJSDocTags(member).map(tag => tag.tagName.text);
            assert.deepEqual(tags, member.name.text === 'checkNoChanges' && model.line === '21.x' ? ['deprecated'] : []);
          }
        }
      }
    }
    assert.equal(records.length, 2);
    return {line: model.line, records,
      note: 'The public abstract token has internal element injection machinery. The runtime injected view is opaque; no private field/function/class is called or adopted.'};
  });
}

export function exerciseChangeDetectorRuntime(core, documentToken, change = {}) {
  const document = {head: {children: []}}, host = {children: []};
  const renderer = {data: {}, destroy() {}, createElement: name => ({name, children: []}),
    createComment: value => ({textContent: value}), createText: value => ({textContent: value}),
    appendChild(parent, child) { parent.children.push(child); child.parent = parent; },
    insertBefore(parent, child, before) { const index = parent.children.indexOf(before);
      parent.children.splice(index < 0 ? parent.children.length : index, 0, child); child.parent = parent; },
    removeChild(parent, child) { const index = parent.children.indexOf(child); if (index >= 0) parent.children.splice(index, 1); },
    selectRootElement: () => host, parentNode: node => node.parent ?? null, nextSibling: () => null,
    setAttribute() {}, removeAttribute() {}, addClass() {}, removeClass() {}, setStyle() {}, removeStyle() {},
    setProperty(node, name, value) { node[name] = value; }, setValue(node, value) { node.textContent = value; },
    listen: () => () => {}};
  let child;
  class Child {
    value = 'before'; detector = core.inject(core.ChangeDetectorRef);
    constructor() { child = this; }
  }
  core.Component({selector: 'cdr-child', standalone: true, changeDetection: core.ChangeDetectionStrategy.OnPush,
    template: '{{value}}'})(Child);
  class Parent {}
  core.Component({selector: 'cdr-parent', standalone: true, imports: [Child], template: '<cdr-child></cdr-child>'})(Parent);
  const parent = core.Injector.create({providers: []});
  let env, component;
  const states = [];
  function rendered(node) { return (node.textContent ?? '') + (node.children ?? []).map(rendered).join(''); }
  function check(id, value) { assert.equal(rendered(host), value, id); states.push({id, value: rendered(host)}); }
  try {
    assert.equal(parent.get(core.ChangeDetectorRef, null), null);
    assert.throws(() => parent.get(core.ChangeDetectorRef));
    assert.throws(() => core.inject(core.ChangeDetectorRef));
    env = core.createEnvironmentInjector([{provide: core.RendererFactory2, useValue: {createRenderer: () => renderer}},
      {provide: documentToken, useValue: document}], parent);
    component = core.createComponent(Parent, {environmentInjector: env, hostElement: host});
    component.changeDetectorRef.detectChanges(); check('initial', 'before');
    child.value = 'unmarked'; component.changeDetectorRef.detectChanges(); check('onpush-unmarked-skipped', 'before');
    if (!change.omitMark) child.detector.markForCheck();
    component.changeDetectorRef.detectChanges(); check('marked-onpush', 'unmarked');
    child.value = 'local'; if (!change.omitLocal) child.detector.detectChanges(); check('local-detect', 'local');
    if (!change.omitDetach) child.detector.detach();
    child.value = 'detached'; child.detector.markForCheck();
    component.changeDetectorRef.detectChanges(); check('detached-parent-skipped', 'local');
    child.detector.detectChanges(); check('detached-local-detect', 'detached');
    child.value = 'reattached'; if (!change.omitReattach) child.detector.reattach();
    child.detector.markForCheck(); component.changeDetectorRef.detectChanges(); check('reattached-marked', 'reattached');
    return {states, injection_controls: 3, genuine_public_component_and_injected_detector: true,
      synthetic_renderer_and_document: true, native_or_actual_legacy_components_executed: false};
  } finally { component?.destroy(); env?.destroy(); parent.destroy(); }
}

export function compileChangeDetectorTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(path), receipts = [];
  for (const model of models) {
    const code = `import {ChangeDetectorRef,inject} from '@angular/core';
declare const detector:ChangeDetectorRef;const injected:ChangeDetectorRef=inject(ChangeDetectorRef);
const marked:void=detector.markForCheck();const detected:void=detector.detectChanges();
const detached:void=detector.detach();const reattached:void=detector.reattach();
type HasCheckNoChanges='checkNoChanges' extends keyof ChangeDetectorRef?true:false;
const publicTestOnlyMember:HasCheckNoChanges=${model.line === 'main' ? 'false' : 'true'};
// @ts-expect-error The public detector remains abstract.
new ChangeDetectorRef();
// @ts-expect-error Marking does not accept arguments.
detector.markForCheck(true);
// @ts-expect-error Local detection does not accept arguments.
detector.detectChanges(true);
// @ts-expect-error A detector cannot be null.
const absent:ChangeDetectorRef=null;
// @ts-expect-error Detection does not return a boolean.
const flag:boolean=detector.detectChanges();
// @ts-expect-error A partial method protocol is not the full public detector type.
const partial:ChangeDetectorRef={markForCheck(){},detectChanges(){}};
${model.line === 'main' ? '// @ts-expect-error Removed public method must not be used.\ndetector.checkNoChanges();\n' : ''}`;
    const file = join(model.root, 'change-detector-consumer.ts'); writeFileSync(file, code);
    const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'}));
    receipts.push({line: model.line, negative_checks: model.line === 'main' ? 7 : 6, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}

export function reviewChangeDetectorUses({root = rootDefault, subjects, compilerRoot, runtimeMutations = false} = {}) {
  const own = !subjects, loaded = subjects ?? prepareMaterialPublicSubjects(root);
  try {
    const scanned = scanChangeDetectorUses({root}), runtime = [], mutations = [];
    for (const model of loaded.models) for (const production of [false, true]) {
      const script = `${production ? 'globalThis.ngDevMode=false;' : ''}
import {exerciseChangeDetectorRuntime} from ${JSON.stringify(join(root, 'scripts/change-detector-use-review.mjs'))};
await import('@angular/compiler');const core=await import('@angular/core');
const documentToken=${model.line === 'original' ? "(await import('@angular/common')).DOCUMENT" : 'core.DOCUMENT'};
const result=exerciseChangeDetectorRuntime(core,documentToken),mutations=[];
${runtimeMutations && !production && model.line !== 'original' ? `
for(const key of ['omitMark','omitLocal','omitDetach','omitReattach']){
 const expected={omitMark:'marked-onpush',omitLocal:'local-detect',omitDetach:'detached-parent-skipped',omitReattach:'reattached-marked'}[key];
 let rejected=false;try{exerciseChangeDetectorRuntime(core,documentToken,{[key]:true});}
 catch(error){if(error.code!=='ERR_ASSERTION'||!error.message.startsWith(expected))throw error;rejected=true;}
 if(!rejected)throw Error('Runtime mutation survived: '+key);mutations.push({id:key,rejected});}
` : ''}
console.log(JSON.stringify({result,mutations}));`;
      const path = join(model.root, 'change-detector-runtime-' + production + '.mjs'); writeFileSync(path, script);
      const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=512', path],
        {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}));
      runtime.push({line: model.line, production, ...result.result});
      mutations.push(...result.mutations.map(row => ({...row, id: model.line + ':' + row.id})));
    }
    for (const row of runtime.slice(1)) assert.deepEqual(row.states, runtime[0].states);
    const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, ...scanned, contracts: inspectChangeDetectorContracts(loaded), runtime,
      runtime_mutations: mutations, type_compilation: compileChangeDetectorTypes(loaded.models, compilerRoot),
      namespace_capsule_sha256: loaded.capsule_hash, node: process.version,
      actual_legacy_caller_native_packed_scheduler_and_runtime_floors_qualified: false,
      g11_claim: 'not-passed'};
  } finally { if (own) loaded.dispose(); }
}
