/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical parent-form token, type and submitted-state contracts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';

const require = createRequire(import.meta.url), ts = require('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['NgForm', 'FormGroupDirective'], moduleName = '@angular/forms';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, removeComments: true,
}}).outputText;
function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
}
function one(nodes, label) { assert.equal(nodes.length, 1, label); return nodes[0]; }
function stable(node) {
  assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)),
  'unstable consumed parent-form public declaration');
}
function mixin(source) {
  return one(source.statements.filter(node => ts.isFunctionDeclaration(node) &&
    node.name?.text === 'mixinErrorState' && node.body), 'whole historical mixin')
    .getText(source).replace(/^export\s+/, '');
}

export function scanParentFormUses({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(use =>
    use.module === moduleName && names.includes(use.symbol));
  for (const name of names) assert.equal(uses.filter(use => use.symbol === name).length, 24);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const importedNodes = source => source.statements.filter(ts.isImportDeclaration)
    .filter(node => node.moduleSpecifier.text === moduleName &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
    .flatMap(node => node.importClause.namedBindings.elements
      .filter(item => names.includes((item.propertyName || item.name).text)));
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts',
    '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  const actual = paths.filter(path => importedNodes(parse(path, read(path))).length);
  assert.equal(actual.length, 24);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  const base = join(root, 'projects/ngx-material-legacy');
  host.readFile = path => path.startsWith(base + '/')
    ? read('projects/ngx-material-legacy/' + path.slice(base.length + 1)) : oldRead(path);
  const program = ts.createProgram(actual.map(path => join(root, path)), options, host);
  const checker = program.getTypeChecker(), cases = [], mixins = [];
  for (const path of actual) {
    const source = program.getSourceFile(join(root, path));
    const file = path.slice('projects/ngx-material-legacy/'.length);
    for (const name of names) {
      const imported = one(importedNodes(source).filter(item =>
        (item.propertyName || item.name).text === name), 'missing/ambiguous parent-form import');
      const symbol = checker.getSymbolAtLocation(imported.name);
      assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported);
      const references = [];
      function visit(node) {
        if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName &&
            checker.getSymbolAtLocation(node) === symbol) {
          const parent = node.parent;
          assert.ok(ts.isTypeReferenceNode(parent) && parent.typeName === node &&
            !parent.typeArguments, 'unreviewed parent-form role');
          const context = parent.parent;
          assert.ok(ts.isPropertySignature(context) || ts.isParameter(context),
            'unreviewed parent-form type context');
          const expectedProperty = name === 'NgForm' ? '_parentForm' : '_parentFormGroup';
          assert.equal(context.name.text, expectedProperty, 'parent-form member name changed');
          let decorators = null;
          if (ts.isParameter(context) && context.modifiers?.some(ts.isDecorator)) {
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly,
              'parent-form runtime token imported type only');
            decorators = context.modifiers.filter(ts.isDecorator).map(decorator => {
              const call = decorator.expression;
              assert.ok(ts.isCallExpression(call) && call.arguments.length === 0);
              const symbol = checker.getSymbolAtLocation(call.expression);
              const item = symbol?.declarations?.find(ts.isImportSpecifier);
              assert.ok(item && item.parent.parent.parent.moduleSpecifier.text === '@angular/core');
              return (item.propertyName || item.name).text;
            }).sort();
            assert.deepEqual(decorators, ['Optional'], 'parent-form lookup flags changed');
          }
          references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            role: ts.SyntaxKind[context.kind], context: context.getText(source), decorators});
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      assert.ok(references.length);
      assert.ok(uses.some(use => use.file === file && use.symbol === name));
      cases.push({file, module: moduleName, symbol: name, local_name: imported.name.text,
        candidate_source_sha256: hash(source.text), references});
    }
    if (file.endsWith('/common-behaviors/error-state.ts')) {
      mixins.push({file, body: mixin(source), source_sha256: hash(source.text)});
    }
  }
  assert.equal(cases.length, 48);
  assert.equal(cases.flatMap(row => row.references).length, 52);
  assert.equal(cases.flatMap(row => row.references).filter(ref => ref.decorators).length, 4);
  assert.equal(mixins.length, 22);
  return {cases, mixins, source_override_used: !!readSource};
}

export function inspectParentFormContracts(subjects) {
  const records = [];
  for (const model of subjects.models) {
    const classes = {};
    for (const extension of ['.mjs', '.d.ts']) {
      for (const [path, text] of model.sources) {
        if (!path.startsWith('@angular/forms/') || !path.endsWith(extension)) continue;
        const source = parse(path, text);
        for (const node of source.statements) if (ts.isClassDeclaration(node) &&
            ['NgForm', 'FormGroupDirective', 'AbstractFormDirective', 'ControlContainer',
              'AbstractControlDirective'].includes(node.name?.text)) {
          assert.equal(classes[node.name.text + extension], undefined);
          classes[node.name.text + extension] = {path, source, node};
        }
      }
    }
    for (const name of names) {
      const declaration = classes[name + '.d.ts'];
      assert.ok(declaration); stable(declaration.node);
      const chain = [name];
      while (true) {
        const current = classes[chain.at(-1) + '.d.ts'];
        const clause = current.node.heritageClauses?.find(clause =>
          clause.token === ts.SyntaxKind.ExtendsKeyword);
        if (!clause) break;
        const ancestor = clause.types[0].expression.getText(current.source);
        assert.ok(classes[ancestor + '.d.ts'] && !chain.includes(ancestor));
        chain.push(ancestor);
      }
      assert.deepEqual(chain, name === 'FormGroupDirective' && model.line !== 'original'
        ? [name, 'AbstractFormDirective', 'ControlContainer', 'AbstractControlDirective']
        : [name, 'ControlContainer', 'AbstractControlDirective']);
      function inherited(predicate) {
        for (const owner of chain) {
          const declaration = classes[owner + '.d.ts'];
          const found = declaration.node.members.filter(predicate);
          if (found.length) return {owner, declaration, node: one(found, 'public inherited member')};
        }
        assert.fail('missing inherited parent-form declaration');
      }
      const submitted = inherited(node => node.name?.text === 'submitted' &&
        !node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword));
      stable(submitted.node);
      assert.equal(submitted.node.type.kind, ts.SyntaxKind.BooleanKeyword);
      const constructor = inherited(ts.isConstructorDeclaration);
      assert.equal(constructor.node.parameters.length, 3);
      assert.ok(constructor.node.parameters[2].questionToken);
      records.push({line: model.line, symbol: name, inheritance_chain: chain,
        submitted_owner: submitted.owner,
        submitted_declaration: print(submitted.node, submitted.declaration.source),
        constructor_owner: constructor.owner,
        constructor_declaration: print(constructor.node, constructor.declaration.source),
        classes: chain.map(owner => ({name: owner,
          declaration_path: classes[owner + '.d.ts'].path,
          whole_declaration: print(classes[owner + '.d.ts'].node, classes[owner + '.d.ts'].source),
          runtime_path: classes[owner + '.mjs'].path,
          whole_runtime_class: classes[owner + '.mjs'].node.getText(classes[owner + '.mjs'].source)})),
        private_ancestor_or_signal_API_adopted: false});
    }
  }
  assert.equal(new Set(records.map(record => record.constructor_declaration)).size, 1);
  return records;
}

export function exerciseParentFormRuntime({core, forms, material, rxjs}, payload, change = {}) {
  const cases = [], observations = [];
  for (const name of names) {
    const Parent = forms[name], instance = new Parent([], []);
    if (name === 'FormGroupDirective') instance.form = new forms.FormGroup({});
    assert.ok(instance instanceof Parent && instance instanceof forms.ControlContainer);
    assert.equal(instance.control, instance.form);
    assert.equal(instance.formDirective, instance);
    assert.equal(instance.submitted, false);
    const emitted = [], subscription = instance.ngSubmit.subscribe(event => emitted.push(event));
    const event = {type: 'submit', target: {method: 'post'}};
    try {
      assert.equal(instance.onSubmit(event), false);
      assert.equal(instance.submitted, true);
      assert.equal(emitted[0], event);
      instance.resetForm(); assert.equal(instance.submitted, false);
      assert.equal(instance.onSubmit({target: {method: 'dialog'}}), true);
      instance.onReset(); assert.equal(instance.submitted, false);
      observations.push({id: name + ':submit-reset', initial: false, submitted: true,
        reset: instance.submitted, events: emitted.length});
    } finally { subscription.unsubscribe(); }
    cases.push('genuine-' + name + '-manual-construction-submit-reset');
  }
  const injector = core.Injector.create({providers: [forms.NgForm, forms.FormGroupDirective,
    {provide: forms.ControlContainer, useExisting: forms.NgForm}]});
  try {
    assert.ok(injector.get(forms.NgForm) instanceof forms.NgForm);
    assert.ok(injector.get(forms.FormGroupDirective) instanceof forms.FormGroupDirective);
    assert.equal(injector.get(forms.ControlContainer), injector.get(forms.NgForm));
  } finally { injector.destroy(); }
  cases.push('genuine-public-class-factories-and-cyph-control-container-alias');
  for (const name of names) {
    const first = new forms[name]([], []), second = new forms[name]([], []);
    const selected = new core.InjectionToken('selected-' + name);
    const parent = core.Injector.create({providers: [{provide: forms[name], useValue: first}]});
    const absent = core.Injector.create({providers: [{provide: selected, useFactory: value => value,
      deps: [[new core.Optional(), new core.Inject(forms[name])]]}]});
    const child = core.Injector.create({parent, providers: [{provide: selected, useFactory: value => value,
      deps: [[new core.Optional(), new core.Inject(forms[name])]]}]});
    const local = core.Injector.create({parent, providers: [{provide: forms[name], useValue: second},
      {provide: selected, useFactory: value => value,
        deps: [[new core.Optional(), new core.Inject(forms[name])]]}]});
    try {
      assert.equal(absent.get(selected), null);
      assert.equal(child.get(selected), first);
      assert.equal(local.get(selected), second);
    } finally { local.destroy(); child.destroy(); absent.destroy(); parent.destroy(); }
  }
  cases.push('actual-parent-tokens-optional-absent-inherited-local-lookup');
  const mixins = [];
  class ControlDirective extends forms.NgControl {
    current = null;
    get control() { return this.current; }
    viewToModelUpdate() {}
  }
  for (const entry of [{file: 'tagged-original', body: payload.original_mixin}, ...payload.mixins]) {
    const body = entry.file === 'tagged-original' ? entry.body : change.mixin_body ?? entry.body;
    const factory = new Function(emit(body + '\nreturn mixinErrorState;'))();
    const form = new forms.NgForm([], []), group = new forms.FormGroupDirective([], []);
    group.form = new forms.FormGroup({});
    const control = new forms.FormControl('', forms.Validators.required);
    const directive = new ControlDirective(); directive.current = control;
    class Base {
      ngControl = directive;
      _parentForm = null;
      _parentFormGroup = null;
      _defaultErrorStateMatcher = new material.ErrorStateMatcher();
      stateChanges = new rxjs.Subject();
    }
    const instance = new (factory(Base))(), emissions = [], sequence = [];
    const subscription = instance.stateChanges.subscribe(() => emissions.push(instance.errorState));
    const step = id => { instance.updateErrorState(); sequence.push({id, state: instance.errorState,
      emissions: [...emissions]}); };
    try {
      step('absent-parents'); instance._parentForm = form; step('unsubmitted-form');
      form.onSubmit({target: {method: 'post'}}); step('submitted-form'); step('unchanged-form');
      instance._parentFormGroup = group; step('unsubmitted-group-precedence');
      group.onSubmit({target: {method: 'dialog'}}); step('submitted-group');
      group.resetForm(); step('reset-group'); instance._parentFormGroup = null;
      step('submitted-form-fallback'); form.resetForm(); step('reset-form');
      control.markAsTouched(); step('touched-control'); control.setValue('valid'); step('valid-control');
      directive.current = null; step('null-current-control'); instance.ngControl = null;
      step('absent-control-directive');
      assert.deepEqual(sequence.map(row => row.state),
        [false, false, true, true, false, true, false, true, false, true, false, false, false]);
      assert.deepEqual(sequence.map(row => row.emissions.length), [0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8]);
      mixins.push({file: entry.file, sequence});
    } finally { subscription.unsubscribe(); instance.stateChanges.complete(); }
  }
  for (const entry of mixins.slice(1)) assert.deepEqual(entry.sequence, mixins[0].sequence);
  cases.push('whole-original-owned-mixins-genuine-parent-submitted-precedence-reset');
  return {cases, observations, mixins, actual_public_namespaces_and_parent_instances: true,
    event_and_node_hierarchy_are_protocols: true,
    native_node_CVA_application_root_rendering_or_floor_qualification: false};
}

export function compileParentFormTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(path), receipts = [];
  const code = `import {NgForm,FormGroupDirective,ControlContainer,FormGroup} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
const form=new NgForm([],[]), group=new FormGroupDirective([],[]);group.form=new FormGroup({});
const parent:NgForm|FormGroupDirective|null=form;const container:ControlContainer=group;
const submitted:boolean=form.submitted;const groupSubmitted:boolean=group.submitted;
new ErrorStateMatcher().isErrorState(null,parent);form.resetForm();group.resetForm();
// @ts-expect-error Historical constructor still requires validator arrays.
new NgForm();
// @ts-expect-error Inherited group constructor retains required arguments.
new FormGroupDirective();
// @ts-expect-error Public submitted state is read-only.
form.submitted=true;
// @ts-expect-error Group submitted state is read-only.
group.submitted=true;
// @ts-expect-error Submitted state remains boolean.
const bad:string=form.submitted;
// @ts-expect-error Classic parent argument cannot be boolean.
new ErrorStateMatcher().isErrorState(null,true);
`;
  for (const model of models) {
    const file = join(model.root, 'parent-form-consumer.ts'); writeFileSync(file, code);
    const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'}));
    receipts.push({line: model.line, negative_checks: 6, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}

export function reviewParentFormUses({root = rootDefault, subjects, compilerRoot} = {}) {
  const own = !subjects, loaded = subjects ?? prepareMaterialPublicSubjects(root);
  try {
    const scanned = scanParentFormUses({root});
    const original = mixin(parse('tagged-original.ts', loaded.tagged_original_mixin));
    for (const entry of scanned.mixins) assert.equal(entry.body, original,
      'whole owned historical helper differs from tagged source');
    const runtime = [];
    for (const model of loaded.models) {
      writeFileSync(join(model.root, 'parent-form-payload.json'),
        JSON.stringify({original_mixin: original, mixins: scanned.mixins}));
      const script = `import {readFileSync} from 'node:fs';
import {exerciseParentFormRuntime} from ${JSON.stringify(join(root,'scripts/parent-form-use-review.mjs'))};
const core=await import('@angular/core');await import('@angular/compiler');const forms=await import('@angular/forms');const material=await import('@angular/material/core');const rxjs=await import('rxjs');
const payload=JSON.parse(readFileSync(new URL('./parent-form-payload.json',import.meta.url)));
console.log(JSON.stringify(exerciseParentFormRuntime({core,forms,material,rxjs},payload)));`;
      writeFileSync(join(model.root, 'parent-form-runtime.mjs'), script);
      runtime.push({line: model.line, ...JSON.parse(execFileSync(process.execPath,
        ['--max-old-space-size=512', join(model.root,'parent-form-runtime.mjs')],
        {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024}))});
    }
    for (const entry of runtime.slice(1)) {
      assert.deepEqual(entry.observations, runtime[0].observations);
      assert.deepEqual(entry.mixins, runtime[0].mixins);
    }
    const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')))
      .version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, frozen_uses: 48, current_uses: 48,
      cases: scanned.cases, contracts: inspectParentFormContracts(loaded), runtime,
      type_compilation: compileParentFormTypes(loaded.models, compilerRoot),
      namespace_capsule_sha256: loaded.capsule_hash, node: process.version, binding_parser: ts.version,
      limits: ['Actual public parent instances, submitted/reset state, explicit R3 token DI and whole historical helpers. Event targets and native node/view-provider hierarchy are protocols; native form/CVA/application/full component/AOT/packed/Node/Rx floors remain open.',
        'Private AbstractFormDirective inheritance and internal signal/event changes inspected, not adopted. No private ancestor import or fork.'],
      g11_claim: 'not-passed'};
  } finally { if (own) loaded.dispose(); }
}
