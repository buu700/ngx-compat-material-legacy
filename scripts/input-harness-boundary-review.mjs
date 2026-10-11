/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Native-property adapter and three complete public harness declaration/interaction boundaries. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputHarnessHost, inputHarnessPublicSubjects, loadLegacyInputHarness} from './input-harness-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript'), rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const classNames = ['MatInputHarness', 'MatNativeSelectHarness', 'MatNativeOptionHarness'];
function bodyTokens(node, source) {
  const out = [], scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, print(node, source));
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) out.push([kind, scanner.getTokenText()]);
  return out.filter((row, index) => !(row[0] === ts.SyntaxKind.CommaToken && [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseParenToken].includes(out[index + 1]?.[0])));
}
function classes(model, extension) {
  const result = {};
  for (const [path, text] of model.sources) if (path.startsWith('@angular/material/') && path.endsWith(extension)) {
    const source = parse(path, text);
    for (const node of source.statements) if (ts.isClassDeclaration(node) && classNames.includes(node.name?.text)) {
      assert.ok(!result[node.name.text], 'duplicate public class definition');
      result[node.name.text] = {path, source, node};
    }
  }
  assert.deepEqual(Object.keys(result).sort(), [...classNames].sort()); return result;
}

export function inspectInputHarnessContracts(models) {
  const original = models.find(m => m.subject.line === 'original'), originals = classes(original, '.mjs'), comparisons = [];
  for (const model of models) {
    const runtimes = classes(model, '.mjs'), types = classes(model, '.d.ts'), changed = [], unchanged = [];
    for (const name of classNames) {
      const declarations = types[name];
      for (const node of [declarations.node, ...declarations.node.members.filter(n => !n.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(m.kind)))])
        assert.ok(!ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)), 'unstable public harness/member');
      const methods = runtimes[name].node.members.filter(ts.isMethodDeclaration), old = originals[name].node.members.filter(ts.isMethodDeclaration);
      assert.deepEqual(methods.map(n => n.name.text), old.map(n => n.name.text), 'public runtime method set changed');
      for (const node of methods) {
        const previous = old.find(n => n.name.text === node.name.text), id = name + '.' + node.name.text;
        if (JSON.stringify(bodyTokens(node.body, runtimes[name].source)) === JSON.stringify(bodyTokens(previous.body, originals[name].source))) unchanged.push(id);
        else changed.push(id);
      }
    }
    assert.deepEqual(changed, model === original ? [] : ['MatInputHarness.with', 'MatInputHarness.isDisabled', 'MatNativeSelectHarness.with']);
    comparisons.push({line: model.subject.line, unchanged_methods: unchanged, changed_methods: changed,
      runtime_declarations: Object.fromEntries(Object.entries(runtimes).map(([name, value]) => [name, {path: value.path, class_sha256: hash(print(value.node, value.source))}])),
      type_declarations: Object.fromEntries(Object.entries(types).map(([name, value]) => [name, {path: value.path, class_sha256: hash(print(value.node, value.source))}]))});
  }
  return comparisons;
}

export async function exerciseNativeInput(Harness, {labelFilters = false} = {}) {
  const cases = [], record = id => cases.push(id);
  for (const [id, value, attributes] of [['enabled', false, {}], ['disabled-empty-attribute', true, {disabled: ''}],
    ['disabled-false-attribute', true, {disabled: 'false'}], ['disabled-true-attribute', true, {disabled: 'true'}],
    ['enabled-with-aria-disabled', false, {'aria-disabled': 'true'}]]) {
    const context = inputHarnessHost({properties: {disabled: value}, attributes}), instance = new Harness(context.locator);
    assert.equal(await instance.isDisabled(), value, id); record(id);
    assert.deepEqual(context.calls, [['property', 'disabled']], 'native disabled property was not authoritative');
  }
  const context = inputHarnessHost({properties: {disabled: false, required: true, readOnly: true, value: 'Sushi', name: 'food', type: 'text', placeholder: 'Favorite food', id: 'legacy-id'}, attributes: {'aria-label': 'Account'}}), instance = new Harness(context.locator);
  for (const [method, expected] of [['isRequired', true], ['isReadonly', true], ['getValue', 'Sushi'], ['getName', 'food'], ['getType', 'text'], ['getPlaceholder', 'Favorite food'], ['getId', 'legacy-id']]) {
    assert.equal(await instance[method](), expected); record(method);
  }
  await instance.focus(); assert.equal(await instance.isFocused(), true); record('focus'); await instance.blur(); assert.equal(await instance.isFocused(), false); record('blur');
  await instance.setValue('Replacement'); assert.equal(context.properties.value, 'Replacement'); record('setValue');
  context.properties.value = 'Sushi';
  for (const [id, options, expected] of [['empty', {}, true], ['value-exact', {value: 'Sushi'}, true], ['value-regex', {value: /shi$/}, true], ['value-mismatch', {value: 'Other'}, false],
    ['placeholder-exact', {placeholder: 'Favorite food'}, true], ['placeholder-regex', {placeholder: /food/}, true], ['placeholder-mismatch', {placeholder: 'Other'}, false],
    ['base-selector', {selector: '.allowed'}, true], ['base-selector-mismatch', {selector: '.missing'}, false]]) {
    const predicate = Harness.with(options); assert.equal(predicate.harnessType, Harness, 'predicate constructs a different harness');
    assert.equal(await predicate.evaluate(instance), expected, id); record('predicate-' + id);
  }
  for (const [native, fallback, expected] of [['Native', 'Data', 'Native'], ['', 'Data', 'Data'], ['', '', '']]) {
    const host = inputHarnessHost({properties: {placeholder: native}, attributes: {'data-placeholder': fallback}});
    assert.equal(await new Harness(host.locator).getPlaceholder(), expected); record('placeholder-fallback-' + expected);
  }
  if (labelFilters) for (const [label, expected] of [['Account', true], [/count$/, true], ['Other', false]]) {
    assert.equal(await Harness.with({label}).evaluate(instance), expected); record('label-filter-' + String(label));
  }
  return {cases, native_browser_executed: false};
}

export async function exerciseNativeSelectAndOption(model) {
  const {MatNativeSelectHarness: Select, MatNativeOptionHarness: Option} = model.runtime, cases = [];
  assert.equal(Select.hostSelector, 'select[matNativeControl]'); assert.equal(Option.hostSelector, 'select[matNativeControl] option');
  const options = ['One', 'Two', 'Three'].map((text, index) => {
    const context = inputHarnessHost({properties: {label: text, index, selected: index === 0, disabled: index === 2}});
    return {...context, harness: new Option(context.locator)};
  });
  const host = inputHarnessHost({properties: {disabled: false, required: true, multiple: false, name: 'account', id: 'legacy-select'}, attributes: {'aria-label': 'Account'}, optionHosts: options}), select = new Select(host.locator);
  for (const [method, expected] of [['isDisabled', false], ['isRequired', true], ['isMultiple', false], ['getName', 'account'], ['getId', 'legacy-select']]) {assert.equal(await select[method](), expected); cases.push('select-' + method);}
  await select.focus(); assert.equal(await select.isFocused(), true); await select.blur(); assert.equal(await select.isFocused(), false); cases.push('select-focus-and-blur');
  for (const [filter, indices] of [[{}, [0, 1, 2]], [{text: 'Two'}, [1]], [{text: /T/}, [1, 2]], [{index: 2}, [2]], [{isSelected: true}, [0]], [{text: 'Missing'}, []]]) {
    const found = await select.getOptions(filter); assert.deepEqual(await Promise.all(found.map(option => option.getIndex())), indices); cases.push('get-options-' + JSON.stringify(filter));
  }
  await select.selectOptions({text: /T/}); assert.deepEqual(options.filter(o => o.properties.selected).map(o => o.properties.index), [1]); cases.push('single-selection-first-match');
  host.properties.multiple = true; await select.selectOptions({text: /T/}); assert.deepEqual(options.filter(o => o.properties.selected).map(o => o.properties.index), [1, 2]); cases.push('multiple-selection-all-matches');
  await assert.rejects(select.selectOptions({text: 'Missing'}), {message: 'Select does not have options matching the specified filter'}); cases.push('empty-selection-error');
  for (const option of options) for (const [method, expected] of [['getText', option.properties.label], ['getIndex', option.properties.index], ['isDisabled', option.properties.disabled], ['isSelected', option.properties.selected]]) {assert.equal(await option.harness[method](), expected); cases.push('option-' + option.properties.index + '-' + method);}
  if (model.subject.line !== 'original') for (const [label, expected] of [['Account', true], [/count$/, true], ['Other', false]]) {assert.equal(await Select.with({label}).evaluate(select), expected); cases.push('select-label-' + String(label));}
  return {cases, native_browser_executed: false};
}

export function compileInputHarnessConsumers(models, root = rootDefault) {
  const results = [];
  for (const model of models) {
    const virtual = join(root, '__input_harness_declarations__', model.subject.line), files = new Map(), material = model.packages.get('@angular/material');
    for (const [key, text] of model.sources) if (key.endsWith('.d.ts')) files.set(join(virtual, 'node_modules', key), text);
    for (const [path, text] of model.testingSources) if (path.endsWith('.d.ts')) files.set(join(virtual, 'node_modules/@angular/cdk', path), text);
    const peerInput = material.exports['./input/testing'].types.replace(/^\.\//, ''), control = material.exports['./form-field/testing/control'].types.replace(/^\.\//, '');
    const aliases = join(virtual, 'candidate/public-api.ts');
    if (model.subject.line === 'original') files.set(aliases, model.sources.get('@angular/material/' + material.exports['./legacy-input/testing'].types.replace(/^\.\//, '')));
    else {
      files.set(aliases, readFileSync(join(root, 'projects/ngx-material-legacy/legacy-input/testing/public-api.ts'), 'utf8'));
      files.set(join(virtual, 'candidate/input-harness.ts'), readFileSync(join(root, 'projects/ngx-material-legacy/legacy-input/testing/input-harness.ts'), 'utf8'));
    }
    const code = `import {MatLegacyInputHarness,MatLegacyNativeSelectHarness,MatLegacyNativeOptionHarness,LegacyInputHarnessFilters,LegacyNativeSelectHarnessFilters} from './candidate/public-api';
import {LocatorFactory,HarnessPredicate} from '@angular/cdk/testing';import {MatInputHarness} from '@angular/material/input/testing';
declare const factory:LocatorFactory;const input=new MatLegacyInputHarness(factory);const peer:MatInputHarness=input;const constructor:typeof MatInputHarness=MatLegacyInputHarness;
const inputFilter:LegacyInputHarnessFilters={selector:'.input',ancestor:'.parent',value:/x/,placeholder:'Hint'};const inputPredicate:HarnessPredicate<MatLegacyInputHarness>=MatLegacyInputHarness.with(inputFilter);
const disabled:Promise<boolean>=input.isDisabled();const required:Promise<boolean>=input.isRequired();const readonly:Promise<boolean>=input.isReadonly();
const value:Promise<string>=input.getValue();const name:Promise<string>=input.getName();const type:Promise<string>=input.getType();const hint:Promise<string>=input.getPlaceholder();const id:Promise<string>=input.getId();
const focus:Promise<void>=input.focus();const blur:Promise<void>=input.blur();const focused:Promise<boolean>=input.isFocused();const setValue:Promise<void>=input.setValue('Text');
const select=new MatLegacyNativeSelectHarness(factory);const selectFilter:LegacyNativeSelectHarnessFilters={selector:'select'};const selectPredicate:HarnessPredicate<MatLegacyNativeSelectHarness>=MatLegacyNativeSelectHarness.with(selectFilter);
const options:Promise<MatLegacyNativeOptionHarness[]>=select.getOptions({text:/Two/,index:1,isSelected:false});const selected:Promise<void>=select.selectOptions({index:1});
const option=new MatLegacyNativeOptionHarness(factory);const optionText:Promise<string>=option.getText();const index:Promise<number>=option.getIndex();const isSelected:Promise<boolean>=option.isSelected();
// @ts-expect-error Native input values remain strings.
input.setValue(1);
// @ts-expect-error Value predicates require string or RegExp.
MatLegacyInputHarness.with({value:1});
// @ts-expect-error Placeholder predicates require string or RegExp.
MatLegacyInputHarness.with({placeholder:true});
// @ts-expect-error Public base selectors remain strings.
MatLegacyInputHarness.with({selector:1});
// @ts-expect-error Option indices remain numeric.
select.getOptions({index:'1'});
// @ts-expect-error Selected-state predicates remain boolean.
select.getOptions({isSelected:'true'});
${model.subject.line === 'original' ? '' : "const labelInput:LegacyInputHarnessFilters={label:/Account/};MatLegacyInputHarness.with(labelInput);const labelSelect:LegacyNativeSelectHarnessFilters={label:'Account'};MatLegacyNativeSelectHarness.with(labelSelect);const label:Promise<string|null>=input.getLabel();"}
`;
    const entry = join(virtual, 'consumer.ts'); files.set(entry, code);
    const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true,
      paths: {'@angular/cdk/testing': [join(virtual, 'node_modules/@angular/cdk', model.testingSubject.public_types)], '@angular/material/input/testing': [join(virtual, 'node_modules/@angular/material', peerInput)], '@angular/material/form-field/testing/control': [join(virtual, 'node_modules/@angular/material', control)]}};
    const host = ts.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
    host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
    host.directoryExists = path => [...files.keys()].some(p => p.startsWith(path + '/')) || ts.sys.directoryExists(path);
    const program = ts.createProgram([entry], options, host), diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: path => path, getCurrentDirectory: () => virtual, getNewLine: () => '\n'}));
    results.push({line: model.subject.line, compiler: ts.version, strict: true, skip_lib_check: false, negative_controls: 6, fixture_sha256: hash(code), current_class_subtype_preserved: true, scope: 'Complete authentic public input/control/testing declarations with candidate adapter and public API; no AOT/packed/floor consumer build'});
  }
  return {compiler_source_sha256: hash(readFileSync(require.resolve('typescript'))), results};
}

export async function reviewInputHarnessBoundary({root = rootDefault, sourceText, compile = true} = {}) {
  const subjects = await inputHarnessPublicSubjects(root), inputFile = 'projects/ngx-material-legacy/legacy-input/testing/input-harness.ts';
  try {
    const source = sourceText ?? readFileSync(join(root, inputFile), 'utf8'), contracts = inspectInputHarnessContracts(subjects.models), observations = [];
    for (const model of subjects.models) {
      const original = model.subject.line === 'original', owned = original ? {Harness: model.runtime.MatInputHarness} : await loadLegacyInputHarness(model, source);
      assert.equal(owned.Harness.hostSelector, '[matInput], input[matNativeControl], textarea[matNativeControl]');
      observations.push({line: model.subject.line, input: await exerciseNativeInput(owned.Harness, {labelFilters: !original}), native_select_and_option: await exerciseNativeSelectAndOption(model),
        adapter: original ? null : {emitted_js_sha256: owned.emitted_js_sha256, constructor_equals_current_parent: owned.Harness === model.runtime.MatInputHarness, current_parent_subtype_preserved: true}});
    }
    const manifest = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, contracts, observations, strict_types: compile ? compileInputHarnessConsumers(subjects.models, root) : null,
      candidate_source_sha256: hash(source), capsule_sha256: subjects.capsule_sha256, rxjs: subjects.rxjs, source_override_used: sourceText !== undefined,
      limits: ['Complete public harness modules execute, but TestElement/LocatorFactory and element property/attribute/option state are protocols.', 'No actual legacy Angular view, native browser, TestbedHarnessEnvironment, packed artifact or full Node/RxJS floor consumer ran.'], g11_claim: 'not-passed'};
  } finally {subjects.dispose();}
}
