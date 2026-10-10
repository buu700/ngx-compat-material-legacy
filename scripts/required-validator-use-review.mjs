/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical required getters, public validator contracts and exact multi providers. */
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
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const names = ['Validators', 'CheckboxRequiredValidator', 'NG_VALIDATORS', 'ValidatorFn'];
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const emit = text => ts.transpileModule(text, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  experimentalDecorators: true, emitDecoratorMetadata: false, removeComments: true,
}}).outputText;
const references = [
  ['chip-list', '83c17cd61f9ecb8cc4dcc7947a493a78a93a6b880d3c69f9284eb39106662414'],
  ['checkbox-required-validator', '0fdde92babb15669a8bfafd48f7f04a98f3c1854f81ec3bf1ff9762e9f9f6951'],
  ['slide-toggle-required-validator', 'e5990e4436cfac932e997f6024d9d47d159f4d2979fe9f83f3bd9b33cb4739fc'],
].map(([name, sha256]) => ({path: 'reference/material-16.2.14/required-validator-sources/' + name + '.ts', sha256}));
const selectReference = {path: 'reference/material-16.2.14/abstract-control-sources/select.ts',
  sha256: 'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73'};
function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0); return source;
}
function one(nodes, label) { assert.equal(nodes.length, 1, label); return nodes[0]; }
function member(source, name, predicate) {
  const found = [];
  function visit(node) { if (predicate(node) && node.name?.text === name) found.push(node); ts.forEachChild(node, visit); }
  visit(source); return one(found, 'whole ' + name + ' member');
}
function stable(node) {
  assert.ok(!ts.getJSDocTags(node).some(tag =>
    ['deprecated', 'experimental', 'docs-private', 'breaking-change'].includes(tag.tagName.text)),
  'unstable consumed public validator declaration');
}
function imports(source) {
  return source.statements.filter(ts.isImportDeclaration)
    .filter(node => node.moduleSpecifier.text === '@angular/forms' &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
    .flatMap(node => node.importClause.namedBindings.elements.filter(item =>
      names.includes((item.propertyName || item.name).text)));
}

export function scanRequiredValidatorUses({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const frozen = JSON.parse(seed).symbol_uses.filter(row => row.module === '@angular/forms' && names.includes(row.symbol));
  assert.equal(frozen.length, 6);
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts', '-g', '!*.spec.ts'],
    {cwd: root, encoding: 'utf8'}).trim().split('\n').filter(path => imports(parse(path, read(path))).length);
  assert.equal(paths.length, 5);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  const base = join(root, 'projects/ngx-material-legacy');
  host.readFile = path => path.startsWith(base + '/')
    ? read('projects/ngx-material-legacy/' + path.slice(base.length + 1)) : oldRead(path);
  const program = ts.createProgram(paths.map(path => join(root, path)), options, host);
  const checker = program.getTypeChecker(), cases = [], getters = [], providers = [];
  const tagged = new Map([...references, selectReference].map(ref => {
    const raw = readFileSync(join(root, ref.path)); assert.equal(hash(raw), ref.sha256);
    return [ref.path, parse(ref.path, raw.toString())];
  }));
  for (const path of paths) {
    const source = program.getSourceFile(join(root, path)), file = path.slice('projects/ngx-material-legacy/'.length);
    const bindings = imports(source), seen = new Set();
    for (const imported of bindings) {
      const name = (imported.propertyName || imported.name).text;
      assert.ok(!seen.has(name), 'ambiguous required-validator import'); seen.add(name);
      const symbol = checker.getSymbolAtLocation(imported.name), refs = [];
      assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === imported);
      function visit(node) {
        if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName &&
            checker.getSymbolAtLocation(node) === symbol) {
          const parent = node.parent; let role;
          if (name === 'Validators') {
            assert.ok(ts.isPropertyAccessExpression(parent) && parent.expression === node &&
              parent.name.text === 'required', 'unreviewed Validators role');
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly);
            role = 'public-required-callback-identity';
          } else if (name === 'CheckboxRequiredValidator') {
            assert.ok(ts.isExpressionWithTypeArguments(parent) && !parent.typeArguments &&
              ts.isHeritageClause(parent.parent) && parent.parent.token === ts.SyntaxKind.ExtendsKeyword,
            'unreviewed checkbox-validator role');
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly);
            assert.equal(parent.parent.parent.members.length, 0, 'historical validator subclass has overrides');
            role = 'empty-historical-public-subclass';
          } else if (name === 'NG_VALIDATORS') {
            assert.ok(ts.isPropertyAssignment(parent) && parent.initializer === node &&
              parent.name.text === 'provide', 'unreviewed validator-token role');
            assert.ok(!imported.isTypeOnly && !imported.parent.parent.isTypeOnly);
            role = 'historical-multi-validator-token';
          } else {
            assert.ok(ts.isTypeReferenceNode(parent) && parent.typeName === node && !parent.typeArguments &&
              ts.isUnionTypeNode(parent.parent) && ts.isPropertyDeclaration(parent.parent.parent),
            'unreviewed ValidatorFn role');
            const property = parent.parent.parent;
            assert.equal(property.name.text, '_previousControlValidatorFn');
            assert.equal(property.initializer.kind, ts.SyntaxKind.NullKeyword);
            assert.ok(property.modifiers.some(node => node.kind === ts.SyntaxKind.PrivateKeyword));
            assert.deepEqual(parent.parent.types.map(type => type === parent ? 'ValidatorFn' : print(type, source)),
              ['ValidatorFn', 'null'], 'historical callback cache type changed');
            role = 'nullable-private-public-callback-cache';
          }
          refs.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            role, context: parent.getText(source)});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); assert.equal(refs.length, 1);
      const supplemental = name === 'ValidatorFn';
      assert.equal(frozen.some(row => row.file === file && row.symbol === name), !supplemental);
      cases.push({file, module: '@angular/forms', symbol: name, local_name: imported.name.text,
        supplemental, candidate_source_sha256: hash(source.text), references: refs});
    }
    if (seen.has('Validators')) {
      const getter = member(source, 'required', ts.isGetAccessorDeclaration);
      const reference = file.startsWith('legacy-chips/') ? references[0].path : selectReference.path;
      const originalSource = tagged.get(reference), original = member(originalSource, 'required', ts.isGetAccessorDeclaration);
      assert.equal(print(getter.body, source), print(original.body, originalSource),
        'whole required getter differs from tagged original');
      getters.push({file, body: print(getter.body, source), original_body: print(original.body, originalSource), reference});
    }
    if (seen.has('CheckboxRequiredValidator')) {
      assert.ok(source.statements.filter(ts.isImportDeclaration).every(node =>
        ['@angular/core', '@angular/forms'].includes(node.moduleSpecifier.text)),
      'unreviewed required-validator import module');
      for (const key of ['Directive', 'forwardRef', 'NgModule']) {
        const found = source.statements.filter(ts.isImportDeclaration)
          .filter(node => node.moduleSpecifier.text === '@angular/core')
          .flatMap(node => node.importClause.namedBindings.elements.filter(item =>
            (item.propertyName || item.name).text === key));
        const binding = one(found, 'required public core binding ' + key);
        assert.equal(binding.name.text, key, 'unreviewed core decorator alias');
        const symbol = checker.getSymbolAtLocation(binding.name);
        assert.ok(symbol.declarations.length === 1 && symbol.declarations[0] === binding);
      }
      const checkbox = file.startsWith('legacy-checkbox/'), reference = references[checkbox ? 1 : 2].path;
      const originalSource = tagged.get(reference);
      const declaration = one(source.statements.filter(ts.isVariableStatement).flatMap(node => node.declarationList.declarations)
        .filter(node => node.name?.text.endsWith('REQUIRED_VALIDATOR')), 'whole required provider');
      const originalDeclaration = one(originalSource.statements.filter(ts.isVariableStatement)
        .flatMap(node => node.declarationList.declarations), 'tagged required provider');
      assert.equal(print(declaration.initializer, source), print(originalDeclaration.initializer, originalSource),
        'historical multi provider changed');
      const className = checkbox ? 'MatCheckboxRequiredValidator' : 'MatSlideToggleRequiredValidator';
      const cls = one(source.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === className));
      const originalClass = one(originalSource.statements.filter(ts.isClassDeclaration));
      const metadata = ts.getDecorators(cls)[0].expression.arguments[0];
      const originalMetadata = ts.getDecorators(originalClass)[0].expression.arguments[0];
      const decoratorCall = ts.getDecorators(cls)[0].expression;
      const decoratorBinding = checker.getSymbolAtLocation(decoratorCall.expression)?.declarations?.find(ts.isImportSpecifier);
      assert.ok(decoratorBinding && decoratorBinding.name.text === 'Directive' &&
        decoratorBinding.parent.parent.parent.moduleSpecifier.text === '@angular/core',
      'required provider is not attached to actual public Directive');
      const metadataProviders = node => one(node.properties.filter(node => node.name?.text === 'providers')).initializer;
      assert.equal(print(metadataProviders(metadata), source), print(metadataProviders(originalMetadata), originalSource),
        'historical directive provider attachment changed');
      const selector = node => one(node.properties.filter(node => node.name?.text === 'selector')).initializer.text;
      assert.equal(selector(metadata), selector(originalMetadata), 'historical required selector changed');
      assert.equal(one(metadata.properties.filter(node => node.name?.text === 'standalone')).initializer.kind,
        ts.SyntaxKind.FalseKeyword);
      const code = source.statements.filter(node => !ts.isImportDeclaration(node))
        .map(node => print(node, source).replace(/^export /gm, '')).join('\n');
      providers.push({file, class_name: className, provider_name: declaration.name.text,
        selector: selector(metadata), code, reference});
    }
  }
  assert.equal(cases.length, 7); assert.equal(getters.length, 2); assert.equal(providers.length, 2);
  const formField = program.getSourceFile(join(base, 'legacy-form-field/form-field.ts'));
  const cacheMethod = print(member(formField, 'ngAfterContentChecked', ts.isMethodDeclaration), formField);
  return {cases, getters, providers, cache_method: cacheMethod, source_override_used: !!readSource};
}

export function inspectRequiredValidatorContracts(subjects) {
  return subjects.models.map(model => {
    const records = [];
    for (const [path, text] of model.sources) if (path.startsWith('@angular/forms/') && /\.(mjs|d\.ts)$/.test(path)) {
      const source = parse(path, text);
      for (const node of source.statements) {
        const name = node.name?.text;
        if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
            ['Validators', 'ValidatorFn', 'Validator', 'CheckboxRequiredValidator',
              'RequiredValidator', 'AbstractValidatorDirective'].includes(name)) {
          if (path.endsWith('.d.ts') && ['Validators', 'ValidatorFn', 'Validator', 'CheckboxRequiredValidator'].includes(name)) stable(node);
          records.push({name, path, whole: node.getText(source)});
        }
        if (ts.isFunctionDeclaration(node) && ['requiredValidator', 'requiredTrueValidator',
          'hasValidator', 'isEmptyInputValue', 'lengthOrSize'].includes(name)) records.push({name, path, whole: node.getText(source)});
        if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations)
          if (declaration.name?.text === 'NG_VALIDATORS') records.push({name: 'NG_VALIDATORS', path, whole: node.getText(source)});
      }
    }
    return {line: model.line, records, readonly_token_array: model.line !== 'original',
      public_interface_calls_only: ['Validator.validate', 'Validator.registerOnValidatorChange', 'OnChanges.ngOnChanges'],
      private_ancestor_import_or_enabled_createValidator_call: false};
  });
}

export function exerciseRequiredValidatorRuntime({core, forms}, payload, change = {}) {
  class Directive extends forms.NgControl { current = null; get control() { return this.current; } viewToModelUpdate() {} }
  const getters = [];
  for (const entry of payload.getters) for (const [kind, body] of [['tagged', entry.original_body], ['owned', change.getter_body ?? entry.body]]) {
    const Type = new Function('Validators', emit('class Getter { get required() ' + body + '}\nreturn Getter;'))(forms.Validators);
    const instance = new Type(), directive = new Directive(), states = [];
    const step = (id, expected) => { assert.equal(instance.required, expected); states.push({id, value: instance.required}); };
    step('missing-directive', false); instance.ngControl = directive; step('missing-control', false);
    const control = new forms.FormControl(''); directive.current = control; step('no-validator', false);
    control.setValidators(forms.Validators.required); step('direct-required', true);
    control.setValidators(forms.Validators.compose([forms.Validators.required])); step('composed-only', false);
    control.setValidators(forms.Validators.requiredTrue); step('different-required-true', false);
    control.setValidators([forms.Validators.required, forms.Validators.requiredTrue]); step('raw-array-required', true);
    instance._required = false; step('explicit-false-overrides-validator', false);
    instance._required = true; control.clearValidators(); step('explicit-true-overrides-absence', true);
    instance._required = undefined; step('cleared-validator', false);
    control.addValidators(forms.Validators.required); step('added-required', true);
    control.removeValidators(forms.Validators.required); step('removed-required', false);
    directive.current = new forms.FormControl('', forms.Validators.required); step('replacement-control', true);
    getters.push({file: entry.file, kind, states});
  }
  for (let index = 0; index < getters.length; index += 2) assert.deepEqual(getters[index].states, getters[index + 1].states);
  const validators = [], providerChecks = [], fieldInitializers = [];
  for (const entry of payload.providers) {
    const code = change.provider_code ? change.provider_code(entry.code) : entry.code;
    const imports = {Directive: core.Directive, forwardRef: core.forwardRef, NgModule: core.NgModule,
      CheckboxRequiredValidator: forms.CheckboxRequiredValidator, NG_VALIDATORS: forms.NG_VALIDATORS};
    const exported = new Function(...Object.keys(imports), emit(code + '\nreturn {Type:' + entry.class_name + ',provider:' + entry.provider_name + '};'))(...Object.values(imports));
    const instance = new exported.Type(); assert.ok(instance instanceof forms.CheckboxRequiredValidator);
    const hasRequired = Object.prototype.hasOwnProperty.call(instance, 'required');
    assert.equal(hasRequired, !core.VERSION.full.startsWith('16.'));
    fieldInitializers.push({file: entry.file, required_own_field: hasRequired});
    let callbacks = 0; instance.registerOnValidatorChange(() => callbacks++);
    const observations = [];
    for (const [required, active] of [[false, false], [true, true], ['', true], ['false', false], ['true', true]]) {
      instance.required = required;
      instance.ngOnChanges({required: new core.SimpleChange(undefined, required, false)});
      for (const value of [false, true, '', 0, 1, 'true']) {
        const result = instance.validate(new forms.FormControl(value));
        assert.deepEqual(result, active && value !== true ? {required: true} : null);
        observations.push({required, value, result, callbacks});
      }
    }
    assert.equal(callbacks, 5);
    validators.push({file: entry.file, observations});
    const injector = core.Injector.create({providers: [exported.Type, exported.provider]});
    try {
      const values = injector.get(forms.NG_VALIDATORS);
      assert.equal(values.length, 1); assert.equal(values[0], injector.get(exported.Type));
      assert.ok(values[0] instanceof forms.CheckboxRequiredValidator);
      providerChecks.push({file: entry.file, actual_token: true, multi_count: values.length, same_class_instance: true});
    } finally { injector.destroy(); }
  }
  const cacheRun = new Function(emit('class Cache {' + (change.cache_method ?? payload.cache_method) + '}\nreturn Cache;'))().prototype.ngAfterContentChecked;
  const directive = new Directive(), control = new forms.FormControl(''); directive.current = control;
  const cache = {_control: {ngControl: directive}, _previousControl: null, _previousControlValidatorFn: null,
    marks: 0, initialized: 0, _outlineGapCalculationNeededImmediately: false,
    _validateControlChild() {}, _initializeControl() { this.initialized++; },
    _changeDetectorRef: {markForCheck() { cache.marks++; }}};
  const cacheStates = []; let expected = 0, previous = null;
  const step = (id, mutation) => {
    mutation?.(); const current = control.validator;
    if (cache._previousControl && current !== previous) expected++;
    cacheRun.call(cache); assert.equal(cache.marks, expected);
    assert.equal(cache._previousControlValidatorFn, current);
    previous = current; cacheStates.push({id, marks: cache.marks, initialized: cache.initialized});
  };
  step('first', null); step('unchanged', null);
  step('direct-required', () => control.setValidators(forms.Validators.required));
  step('same-direct-function', () => control.setValidators(forms.Validators.required));
  step('composed-array', () => control.setValidators([forms.Validators.required]));
  step('new-composition', () => control.addValidators(forms.Validators.requiredTrue));
  step('cleared', () => control.clearValidators());
  const emptySet = forms.Validators.required(new forms.FormControl(new Set()));
  assert.deepEqual(emptySet, core.VERSION.full.startsWith('16.') ? null : {required: true});
  return {getters, validators, provider_checks: providerChecks, cache_states: cacheStates,
    edge_differences: {empty_set_required: emptySet, required_field_initializers: fieldInitializers},
    public_contracts: true, form_field_and_change_detector_are_protocols: true,
    native_node_CVA_metadata_inheritance_or_rendering: false};
}

export function compileRequiredValidatorTypes(models, compilerRoot) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(path), receipts = [];
  for (const model of models) {
    const code = `import {CheckboxRequiredValidator,Validator,ValidatorFn,NG_VALIDATORS,Validators,FormControl} from '@angular/forms';import {OnChanges,SimpleChange,Injector} from '@angular/core';
class LegacyCheckbox extends CheckboxRequiredValidator {};const instance=new LegacyCheckbox();instance.required='';const validator:Validator=instance;const lifecycle:OnChanges=instance;
validator.validate(new FormControl(false));validator.registerOnValidatorChange?.(()=>{});lifecycle.ngOnChanges({required:new SimpleChange(false,true,false)});
const fn:ValidatorFn=Validators.required;const control=new FormControl('',fn);const cached:ValidatorFn|null=control.validator;const present:boolean=control.hasValidator(Validators.required);
declare const injector:Injector;const provided=injector.get(NG_VALIDATORS);const readonlyValues:readonly(Function|Validator)[]=provided;
// @ts-expect-error Public required input remains Boolean or string.
instance.required=1;
// @ts-expect-error Validator result cannot be numeric.
const wrong:ValidatorFn=()=>1;
// @ts-expect-error Validator requires a control.
fn(true);
// @ts-expect-error Lifecycle requires SimpleChange values.
lifecycle.ngOnChanges({required:true});
// @ts-expect-error hasValidator requires a callback reference.
control.hasValidator('required');
${model.line === 'original' ? '' : '// @ts-expect-error Minimum token array is readonly.\n'}provided.push(()=>null);
`;
    const file = join(model.root, 'required-validator-consumer.ts'); writeFileSync(file, code);
    const program = compiler.createProgram([file], {target: compiler.ScriptTarget.ES2022,
      module: compiler.ModuleKind.ESNext, moduleResolution: compiler.ModuleResolutionKind.Bundler,
      strict: true, skipLibCheck: false, noEmit: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']});
    const diagnostics = compiler.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, compiler.formatDiagnostics(diagnostics, {
      getCanonicalFileName: path => path, getCurrentDirectory: () => dirname(file), getNewLine: () => '\n'}));
    receipts.push({line: model.line, negative_checks: model.line === 'original' ? 5 : 6, fixture_sha256: hash(code)});
  }
  return {compiler: compiler.version, compiler_source_sha256: hash(readFileSync(path)), subjects: receipts};
}

export function reviewRequiredValidatorUses({root = rootDefault, subjects, compilerRoot} = {}) {
  const own = !subjects, loaded = subjects ?? prepareMaterialPublicSubjects(root);
  try {
    const scanned = scanRequiredValidatorUses({root}), runtime = [];
    for (const model of loaded.models) {
      writeFileSync(join(model.root, 'required-validator-payload.json'), JSON.stringify(scanned));
      const script = `import {readFileSync} from 'node:fs';import {exerciseRequiredValidatorRuntime} from ${JSON.stringify(join(root,'scripts/required-validator-use-review.mjs'))};
const core=await import('@angular/core');await import('@angular/compiler');const forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./required-validator-payload.json',import.meta.url)));
console.log(JSON.stringify(exerciseRequiredValidatorRuntime({core,forms},payload)));`;
      writeFileSync(join(model.root, 'required-validator-runtime.mjs'), script);
      runtime.push({line: model.line, ...JSON.parse(execFileSync(process.execPath,
        ['--max-old-space-size=512', join(model.root, 'required-validator-runtime.mjs')],
        {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024}))});
    }
    for (const entry of runtime.slice(1)) for (const key of ['getters', 'validators', 'provider_checks', 'cache_states'])
      assert.deepEqual(entry[key], runtime[0][key]);
    const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')))
      .version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, frozen_uses: 6, current_uses: 7, supplemental_current_uses: 1,
      ...scanned, contracts: inspectRequiredValidatorContracts(loaded), runtime,
      type_compilation: compileRequiredValidatorTypes(loaded.models, compilerRoot), references: [...references, selectReference],
      namespace_capsule_sha256: loaded.capsule_hash, node: process.version, binding_parser: ts.version,
      limits: ['Genuine public validator/OnChanges interfaces and exact historical getters/empty subclasses/provider objects. Form-field/change detector and SimpleChange event inputs are protocols; native node/CVA/input metadata inheritance/rendering/application/AOT/packed/Node/Rx floors remain separate.',
        'Readonly token typing, new required field initialization, private implementation annotations and empty-Set required behavior are explicit peer differences. No private ancestor or enabled/createValidator adoption, no universal validator equivalence.'],
      g11_claim: 'not-passed'};
  } finally { if (own) loaded.dispose(); }
}
