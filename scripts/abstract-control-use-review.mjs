/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite historical AbstractControl casts and select replacement identity. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const moduleName = '@angular/forms';
const name = 'AbstractControl';
const selectPath = 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts';
const referencePath = 'reference/material-16.2.14/abstract-control-sources/select.ts';
const referenceHash = 'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73';
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  experimentalDecorators: true, removeComments: true,
}}).outputText;

function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
}
function one(nodes, label) {
  assert.equal(nodes.length, 1, label);
  return nodes[0];
}
function method(source, name) {
  const found = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.text === name) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return print(one(found, 'whole ' + name + ' method'), source);
}
function mixin(source) {
  const node = one(source.statements.filter(node => ts.isFunctionDeclaration(node) &&
    node.name?.text === 'mixinErrorState' && node.body), 'whole historical mixin');
  return node.getText(source).replace(/^export\s+/, '');
}
function stable(node) {
  assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(tag.tagName.text)),
  'unstable consumed AbstractControl declaration');
}

export function scanAbstractControlUses({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(use =>
    use.module === moduleName && use.symbol === name);
  assert.equal(uses.length, 23);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts',
    '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  const importedNodes = source => source.statements.filter(ts.isImportDeclaration)
    .filter(node => node.moduleSpecifier.text === moduleName &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
    .flatMap(node => node.importClause.namedBindings.elements
      .filter(item => (item.propertyName || item.name).text === name));
  const actual = paths.filter(path => importedNodes(parse(path, read(path))).length);
  assert.equal(actual.length, 23);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile.bind(host);
  const base = join(root, 'projects/ngx-material-legacy');
  host.readFile = path => path.startsWith(base + '/')
    ? read('projects/ngx-material-legacy/' + path.slice(base.length + 1)) : originalRead(path);
  const program = ts.createProgram(actual.map(path => join(root, path)), options, host);
  const checker = program.getTypeChecker();
  const cases = [], mixins = [];
  for (const path of actual) {
    const source = program.getSourceFile(join(root, path));
    const file = path.slice('projects/ngx-material-legacy/'.length);
    const imported = one(importedNodes(source), 'missing/ambiguous AbstractControl import');
    const symbol = checker.getSymbolAtLocation(imported.name);
    assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported);
    const references = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName &&
          checker.getSymbolAtLocation(node) === symbol) {
        const parent = node.parent;
        assert.ok(ts.isTypeReferenceNode(parent) && parent.typeName === node &&
          !parent.typeArguments, 'unreviewed AbstractControl role');
        const context = parent.parent;
        let role;
        if (ts.isAsExpression(context)) {
          assert.ok(file.endsWith('/common-behaviors/error-state.ts'));
          assert.equal(context.expression.getText(source), 'this.ngControl.control',
            'historical control cast expression changed');
          role = 'erased-error-state-control-cast';
        } else {
          assert.equal(file, 'legacy-select/internal/select-base.ts');
          assert.ok(ts.isUnionTypeNode(context) && ts.isPropertyDeclaration(context.parent),
            'unreviewed AbstractControl type context');
          assert.equal(context.parent.name.text, '_previousControl');
          assert.deepEqual(context.types.map(type => type === parent ? 'AbstractControl' :
            print(type, source)), ['AbstractControl', 'null', 'undefined'],
          'historical previous-control union changed');
          assert.ok(context.parent.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
          role = 'private-select-previous-control-identity';
        }
        references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          role, context: context.getText(source)});
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(references.length, 1);
    assert.ok(uses.some(use => use.file === file));
    if (file.endsWith('/common-behaviors/error-state.ts')) {
      mixins.push({file, body: mixin(source), source_sha256: hash(source.text)});
    }
    cases.push({file, module: moduleName, symbol: name, local_name: imported.name.text,
      candidate_source_sha256: hash(source.text), references});
  }
  assert.equal(mixins.length, 22);
  const tagged = readFileSync(join(root, referencePath));
  assert.equal(hash(tagged), referenceHash, 'tagged select oracle changed');
  const originalSelect = method(parse(referencePath, tagged.toString()), 'ngDoCheck');
  const ownedSelect = method(parse(selectPath, read(selectPath)), 'ngDoCheck');
  assert.equal(ownedSelect, originalSelect, 'select ngDoCheck differs from tagged original');
  return {cases, mixins, original_select_method: originalSelect,
    owned_select_method: ownedSelect, source_override_used: !!readSource};
}

export function inspectAbstractControlContracts(subjects) {
  return subjects.models.map(model => {
    const classes = {};
    for (const extension of ['.mjs', '.d.ts']) {
      const found = [...model.sources].filter(([path]) =>
        path.startsWith('@angular/forms/') && path.endsWith(extension)).flatMap(([path, text]) => {
        const source = parse(path, text);
        return source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name)
          .map(node => ({path, source, node}));
      });
      classes[extension] = one(found, 'complete published AbstractControl class');
    }
    const declaration = classes['.d.ts'];
    stable(declaration.node);
    assert.ok(declaration.node.modifiers.some(node => node.kind === ts.SyntaxKind.AbstractKeyword));
    assert.equal(declaration.node.typeParameters.length, model.line === 'original' ? 2 : 3);
    const generics = declaration.node.typeParameters.map(node => print(node, declaration.source));
    assert.deepEqual(generics.slice(0, 2), ['TValue = any', 'TRawValue extends TValue = TValue']);
    if (model.line !== 'original') assert.ok(declaration.node.typeParameters[2].default);
    const consumed = ['value', 'status', 'invalid', 'disabled', 'dirty', 'touched'];
    const members = declaration.node.members.filter(node => consumed.includes(node.name?.text) &&
      !node.modifiers?.some(modifier =>
        [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(modifier.kind)));
    assert.equal(members.length, consumed.length);
    members.forEach(stable);
    return {line: model.line, declaration_path: declaration.path,
      whole_declaration: print(declaration.node, declaration.source),
      runtime_path: classes['.mjs'].path,
      whole_runtime_class: classes['.mjs'].node.getText(classes['.mjs'].source),
      generic_parameters: generics,
      consumed_members: members.map(node => print(node, declaration.source)),
      newer_state_getters_and_internal_signals_adopted: false};
  });
}

export function exerciseAbstractControlRuntime({forms, material}, payload, changed = {}) {
  class ControlDirective extends forms.NgControl {
    current = null;
    get control() { return this.current; }
    viewToModelUpdate() {}
  }
  const directive = new ControlDirective();
  const control = new forms.FormControl('', forms.Validators.required);
  directive.current = control;
  const group = new forms.FormGroup({field: new forms.FormControl('', forms.Validators.required)});
  const array = new forms.FormArray([new forms.FormControl('', forms.Validators.required)]);
  for (const item of [control, group, array]) assert.ok(item instanceof forms.AbstractControl);
  const cases = ['real-control-group-array-public-ancestor-identity'];
  const observations = [];
  const observe = (id, item) => observations.push({id, value: item.value,
    invalid: item.invalid, disabled: item.disabled, dirty: item.dirty, touched: item.touched,
    error: new material.ErrorStateMatcher().isErrorState(item, null)});
  for (const [id, item] of [['control', control], ['group', group], ['array', array]]) {
    observe(id + ':initial', item);
    item.markAsTouched(); item.markAsDirty(); observe(id + ':touched-dirty', item);
    item.disable(); observe(id + ':disabled', item);
    item.enable(); observe(id + ':enabled', item);
  }
  cases.push('public-abstract-state-readers-with-real-reactive-controls');
  const originalMixin = payload.original_mixin;
  const mixinResults = [];
  for (const entry of [{file: 'tagged-original', body: originalMixin}, ...payload.mixins]) {
    const factory = new Function(emit(entry.body + '\nreturn mixinErrorState;'))();
    const calls = [];
    class Base {
      ngControl = directive;
      _parentFormGroup = null;
      _parentForm = null;
      _defaultErrorStateMatcher = {isErrorState(value, parent) {
        calls.push({same: value === directive.current, is_null: value === null,
          parent_null: parent === null});
        return !!value?.invalid;
      }};
      stateChanges = {next() {}};
    }
    const instance = new (factory(Base))();
    directive.current = control; instance.updateErrorState();
    directive.current = group; instance.updateErrorState();
    directive.current = array; instance.updateErrorState();
    directive.current = null; instance.updateErrorState();
    instance.ngControl = null; instance.updateErrorState();
    assert.deepEqual(calls, [false, false, false, true, true].map(is_null =>
      ({same: true, is_null, parent_null: true})));
    mixinResults.push({file: entry.file, calls});
  }
  cases.push('whole-tagged-and-owned-casts-preserve-control-and-null-identity');
  const selectResults = [];
  for (const [id, text] of [['tagged-original', payload.original_select_method],
      ['owned-select', changed.select_method ?? payload.owned_select_method]]) {
    const run = new Function(emit('class Subject {' + text + '}\nreturn Subject;'))()
      .prototype.ngDoCheck;
    const instance = {ngControl: directive, disabled: false, _triggerAriaLabelledBy: null,
      _getTriggerAriaLabelledby() { return null; }, updates: 0,
      updateErrorState() { this.updates++; }};
    const records = [];
    const step = (label, item) => {
      directive.current = item; run.call(instance);
      records.push({label, disabled: instance.disabled,
        previous_same: instance._previousControl === item, updates: instance.updates});
    };
    control.disable(); step('first-disabled-control-preserves-component-default', control);
    const replacement = new forms.FormControl('replacement'); replacement.disable();
    step('replacement-disabled-control-updates-component', replacement);
    replacement.enable(); step('same-control-state-change-does-not-resync', replacement);
    step('replacement-enabled-group-updates-component', group);
    step('null-control-preserves-disabled-and-cache', null);
    instance.ngControl = null; run.call(instance);
    records.push({label: 'absent-directive-skips-error-update', disabled: instance.disabled,
      previous_same: instance._previousControl === null, updates: instance.updates});
    assert.deepEqual(records.map(row => row.disabled), [false, true, true, false, false, false]);
    assert.ok(records.every(row => row.previous_same));
    assert.deepEqual(records.map(row => row.updates), [1, 2, 3, 4, 5, 5]);
    selectResults.push({id, records});
  }
  assert.deepEqual(selectResults[1].records, selectResults[0].records);
  cases.push('whole-select-tagged-replacement-identity-and-disabled-lifecycle');
  return {cases, observations, mixins: mixinResults, selects: selectResults,
    actual_public_forms_namespace: true, select_host_and_state_emission_are_protocols: true,
    native_node_form_CVA_application_rendering_or_floor_qualification: false};
}

export function compileAbstractControlTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(path), receipts = [];
  const code = `import {AbstractControl, FormControl, FormGroup, FormArray, NgControl} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
const values: AbstractControl[] = [new FormControl(''), new FormGroup({}), new FormArray([])];
const typed: AbstractControl<string|null> = new FormControl('');
class Historical extends NgControl { current: AbstractControl|null = null; override get control() { return this.current; } override viewToModelUpdate(value:any):void {} }
const directive = new Historical();
const selected = directive ? (directive.control as AbstractControl) : null;
new ErrorStateMatcher().isErrorState(selected, null);
class Cached { private previous: AbstractControl|null|undefined; update(value: NgControl) { if (this.previous !== value.control) this.previous=value.control; } }
for (const value of values) { const invalid:boolean=value.invalid; const touched:boolean=value.touched; const dirty:boolean=value.dirty; const disabled:boolean=value.disabled; }
// @ts-expect-error AbstractControl remains abstract.
new AbstractControl(null, null);
// @ts-expect-error A control reference cannot be a number.
const invalidControl: AbstractControl = 1;
// @ts-expect-error Classic state reads remain boolean.
const invalidState: string = values[0].invalid;
// @ts-expect-error Nullable previous-control values cannot be erased.
const nonNullable: AbstractControl = directive.control;
// @ts-expect-error Explicit control value typing is retained.
const wrongValue: number = typed.value;
`;
  for (const model of models) {
    const file = join(model.root, 'abstract-control-consumer.ts');
    writeFileSync(file, code);
    const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => dirname(file),
      getNewLine: () => '\n'}));
    receipts.push({line: model.line, negative_checks: 5, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}

export function reviewAbstractControlUses({root = rootDefault, subjects, compilerRoot} = {}) {
  const own = !subjects, loaded = subjects ?? prepareMaterialPublicSubjects(root);
  try {
    const scanned = scanAbstractControlUses({root});
    const original = mixin(parse('tagged-original.ts', loaded.tagged_original_mixin));
    for (const entry of scanned.mixins) assert.equal(emit(entry.body), emit(original),
      'owned cast helper executable body differs from tagged original');
    const runtime = [];
    for (const model of loaded.models) {
      const payload = {original_mixin: original, mixins: scanned.mixins,
        original_select_method: scanned.original_select_method,
        owned_select_method: scanned.owned_select_method};
      writeFileSync(join(model.root, 'abstract-control-payload.json'), JSON.stringify(payload));
      const script = `import {readFileSync} from 'node:fs';
import {exerciseAbstractControlRuntime} from ${JSON.stringify(join(root, 'scripts/abstract-control-use-review.mjs'))};
await import('@angular/compiler'); const forms=await import('@angular/forms'); const material=await import('@angular/material/core');
const payload=JSON.parse(readFileSync(new URL('./abstract-control-payload.json',import.meta.url)));
console.log(JSON.stringify(exerciseAbstractControlRuntime({forms,material},payload)));`;
      writeFileSync(join(model.root, 'abstract-control-runtime.mjs'), script);
      runtime.push({line: model.line, ...JSON.parse(execFileSync(process.execPath,
        ['--max-old-space-size=512', join(model.root, 'abstract-control-runtime.mjs')],
        {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024}))});
    }
    for (const entry of runtime.slice(1)) {
      assert.deepEqual(entry.observations, runtime[0].observations);
      assert.deepEqual(entry.mixins, runtime[0].mixins);
      assert.deepEqual(entry.selects, runtime[0].selects);
    }
    const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')))
      .version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, frozen_uses: 23, current_uses: 23,
      cases: scanned.cases, contracts: inspectAbstractControlContracts(loaded), runtime,
      reference: {path: referencePath, sha256: referenceHash},
      type_compilation: compileAbstractControlTypes(loaded.models, compilerRoot),
      namespace_capsule_sha256: loaded.capsule_hash, node: process.version, binding_parser: ts.version,
      limits: ['Finite erased casts and previous-control identity only. Whole select method runs with genuine NgControl and real reactive controls, while host/emission dependencies are protocols.',
        'New optional generic parameter, events, signal-backed state and private machinery are inspected, not adopted. Native node/form/CVA/full select/application/root/packed/AOT and Node/Rx floors remain open.'],
      g11_claim: 'not-passed'};
  } finally { if (own) loaded.dispose(); }
}
