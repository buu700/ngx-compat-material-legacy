/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact packed-fixture handlers with genuine public harness namespaces; no Angular node credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {loadHarnessSubjects} from './component-harness-boundary-review.mjs';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const names = ['read', 'interact', 'touch', 'disabled'];
const basePath = 'projects/ngx-material-legacy/legacy-radio/testing/radio-harness-base.ts';
const leafPath = 'projects/ngx-material-legacy/legacy-radio/testing/radio-harness.ts';

export function radioFixtureHandlers(text) {
  const source = parse('value-accessor-probe.ts', text), matches = [];
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'specs.push') {
      const value = node.arguments[0];
      if (ts.isObjectLiteralExpression(value) && value.properties.some(p => p.name?.getText(source) === 'family' && ts.isStringLiteral(p.initializer) && p.initializer.text === 'radio')) matches.push(value);
    }
    ts.forEachChild(node, visit);
  }; visit(source); assert.equal(matches.length, 1, 'one actual radio fixture spec required');
  const handlers = Object.fromEntries(names.map(name => {
    const members = matches[0].properties.filter(p => p.name?.getText(source) === name);
    assert.equal(members.length, 1); assert.equal(ts.isArrowFunction(members[0].initializer), true);
    return [name, members[0].initializer.getText(source)];
  }));
  const declarations = [];
  const findRadio = node => {if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'radio') declarations.push(node); ts.forEachChild(node, findRadio);};
  findRadio(source); assert.equal(declarations.length, 1);
  assert.equal(declarations[0].initializer.getText(source), "await loader.getHarness(MatLegacyRadioGroupHarness.with({selector:'#cva-radio'}))");
  assert.equal(matches[0].properties.find(p => p.name?.getText(source) === 'harness').initializer.getText(source), 'radio');
  const template = '<mat-radio-group id="cva-radio" [formControl]="radio"><mat-radio-button value="one">One</mat-radio-button><mat-radio-button value="two">Two</mat-radio-button></mat-radio-group>';
  assert.equal(text.includes(template), true, 'independent two-choice template binding changed');
  return {source_sha256: hash(text), handlers, object: '{' + names.map(name => name + ':' + handlers[name]).join(',') + '}'};
}

export async function radioFixtureSubjects(root) {
  const publicHarness = await loadHarnessSubjects(root), publicMaterial = prepareMaterialPublicSubjects(root);
  try {
    const bytes = readFileSync(join(root, 'compatibility/rc/harness-filter-reexport-subjects.json'));
    assert.equal(hash(bytes), '6e7205b69715544f50b1bc50f6d567922437d0d3490555810d017a387b32f290');
    const filters = JSON.parse(bytes), models = [];
    for (const harness of publicHarness.models) {
      const material = publicMaterial.models.find(m => m.line === harness.subject.line);
      const subject = filters.subjects.find(s => s.line === harness.subject.line);
      assert.equal(subject.version, harness.subject.version);
      const readMember = member => {
        const compressed = readFileSync(join(root, member.path)); assert.equal(hash(compressed), member.gzip_sha256);
        const raw = gunzipSync(compressed); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes); return raw.toString();
      };
      const manifestMember = subject.members.find(m => m.archive_member === 'package/package.json');
      const manifest = JSON.parse(readMember(manifestMember));
      assert.equal(manifest.version, subject.version); assert.equal(manifest.name, '@angular/material');
      const filterEntry = manifest.exports['./radio/testing'].types.replace(/^\.\//, '');
      const filterMember = subject.members.find(m => m.archive_member === 'package/' + filterEntry); assert.ok(filterMember);
      const filterText = readMember(filterMember), filterSource = parse(filterEntry, filterText);
      const filter = filterSource.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'RadioButtonHarnessFilters'); assert.ok(filter);
      assert.deepEqual(filter.members.map(n => n.name.text), ['label', 'name', 'checked']);
      for (const node of [filter, ...filter.members]) assert.equal(ts.getJSDocTags(node).some(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)), false);
      const testingSources = new Map(harness.subject.members.filter(m => m.archive_member.endsWith('.d.ts')).map(m => [m.archive_member.slice(8), gunzipSync(readFileSync(join(root, m.path))).toString()]));
      const coercions = [];
      for (const [path, text] of material.sources) if (path.startsWith('@angular/cdk/') && path.endsWith('.mjs')) {
        const source = parse(path, text);
        for (const node of source.statements) if (ts.isFunctionDeclaration(node) && node.name?.text === 'coerceBooleanProperty') coercions.push({path, source, node});
      }
      assert.equal(coercions.length, 1); const coercion = coercions[0];
      const coercionFunction = print(coercion.node, coercion.source);
      assert.equal(coercionFunction, "function coerceBooleanProperty(value) {\n    return value != null && \u0060\u0024{value}\u0060 !== 'false';\n}");
      const coercionTypes = [];
      const declarationCapsule = readFileSync(join(root, 'compatibility/rc/coercion-public-subjects.json'));
      assert.equal(hash(declarationCapsule), 'be5c12b5d9829221410bb9b1ce490f247cf1992059fcd1893a1a5b7f90b86d86');
      const declarationSubject = JSON.parse(declarationCapsule).subjects.find(s => s.line === subject.line);
      assert.equal(declarationSubject.version, subject.version);
      for (const member of declarationSubject.declarations) {
        const bytes = readFileSync(join(root, member.path)); assert.equal(hash(bytes), member.sha256); assert.equal(bytes.length, member.bytes);
        const source = parse(member.path, bytes.toString());
        for (const node of source.statements) if (ts.isFunctionDeclaration(node) && node.name?.text === 'coerceBooleanProperty') coercionTypes.push({path: member.path, text: print(node, source)});
      }
      assert.equal(coercionTypes.length, 1);
      const coerceBooleanProperty = new Function(coercionFunction + ';return coerceBooleanProperty;')();
      models.push({line: subject.line, version: subject.version, testing: harness.runtime, testingSources,
        testingEntry: harness.subject.public_types, filterText, filterEntry,
        filter_sha256: filterMember.sha256, coercionDeclaration: coercionTypes[0].text,
        coercion_function_sha256: hash(coercionFunction), coerceBooleanProperty});
    }
    return {models, borrowed_rxjs: publicHarness.rxjs, dispose: () => publicMaterial.dispose()};
  } catch (error) {publicMaterial.dispose(); throw error;}
}

export function compileRadioFixture({root, model, fixture}) {
  const virtual = join(root, '__radio_fixture_contract__'), files = new Map();
  files.set(join(virtual, 'radio-harness.ts'), readFileSync(join(root, leafPath), 'utf8'));
  files.set(join(virtual, 'radio-harness-base.ts'), readFileSync(join(root, basePath), 'utf8'));
  for (const [path, text] of model.testingSources) files.set(join(virtual, 'cdk', path), text);
  files.set(join(virtual, 'radio-testing.d.ts'), model.filterText);
  files.set(join(virtual, 'coercion.d.ts'), model.coercionDeclaration.replace(/^export /, '') + '\nexport {coerceBooleanProperty};\n');
  const header = "import {MatLegacyRadioGroupHarness} from './radio-harness';\ndeclare const radio:MatLegacyRadioGroupHarness;\n";
  const entry = join(virtual, 'consumer.ts'); files.set(entry, header + 'const actual = ' + fixture.object + ';\n');
  const negatives = join(virtual, 'negative.ts');
  files.set(negatives, header + [
    "radio.getRadioButtons({label:/Two/,name:'group',checked:true,selector:'.radio',ancestor:'.host'});",
    '// @ts-expect-error No public value filter exists.', "radio.checkRadioButton({value:'two'});",
    '// @ts-expect-error A label must be a string or RegExp.', 'radio.getRadioButtons({label:2});',
    '// @ts-expect-error A checked predicate must be a boolean.', "radio.getRadioButtons({checked:'true'});",
    '// @ts-expect-error A name predicate must be a string.', 'radio.getRadioButtons({name:/group/});',
  ].join('\n'));
  const originalBug = join(virtual, 'original-bug.ts');
  const broken = fixture.object.replaceAll("label:'Two'", "value:'two'");
  files.set(originalBug, header + 'const broken = ' + broken + ';\n');
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true, types: []};
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
  host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
  host.directoryExists = path => [...files.keys()].some(f => f.startsWith(path + '/')) || ts.sys.directoryExists(path);
  host.resolveModuleNames = (specs, from) => specs.map(spec => {
    const selected = spec === '@angular/cdk/testing' ? join(virtual, 'cdk', model.testingEntry)
      : spec === '@angular/material/radio/testing' ? join(virtual, 'radio-testing.d.ts')
      : spec === '@angular/cdk/coercion' ? join(virtual, 'coercion.d.ts') : null;
    return selected ? {resolvedFileName: selected, extension: ts.Extension.Dts} : ts.resolveModuleName(spec, from, options, host).resolvedModule;
  });
  const program = ts.createProgram([entry, negatives, originalBug], options, host), diagnostics = ts.getPreEmitDiagnostics(program);
  const baseline = diagnostics.filter(d => d.file?.fileName !== originalBug);
  assert.equal(baseline.length, 0, ts.formatDiagnosticsWithColorAndContext(baseline, {getCanonicalFileName: p => p, getCurrentDirectory: () => virtual, getNewLine: () => '\n'}));
  const reproduced = diagnostics.filter(d => d.file?.fileName === originalBug);
  assert.equal(reproduced.length, 2); assert.deepEqual(reproduced.map(d => d.code), [2353, 2353]);
  return {line: model.line, component_peer: model.version, compiler: ts.version, strict: true,
    skip_lib_check: false, actual_fixture_handlers: names, negative_type_checks: 4,
    original_bug_excess_property_diagnostics: 2, complete_owned_harness_sources: [basePath, leafPath],
    filter_sha256: model.filter_sha256, Angular_AOT_or_packed_control_execution: false};
}

function emit(text, resolve) {
  const output = ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
  const exports = {}; new Function('require', 'exports', output)(resolve, exports); return exports;
}
export function fixtureRadioHarness(root, model) {
  const base = emit(readFileSync(join(root, basePath), 'utf8'), spec => {
    if (spec === '@angular/cdk/testing') return model.testing;
    assert.equal(spec, '@angular/cdk/coercion'); return {coerceBooleanProperty: model.coerceBooleanProperty};
  });
  return emit(readFileSync(join(root, leafPath), 'utf8'), spec => {
    if (spec === '@angular/cdk/testing') return model.testing;
    assert.equal(spec, './radio-harness-base'); return base;
  });
}

/** TestElement/LocatorFactory protocols only: no Angular component or native input. */
export async function exerciseRadioFixture({model, types, fixture, reverse = false}) {
  const order = reverse ? ['two', 'one'] : ['one', 'two'], calls = [], states = new Map();
  const makeLocator = (host, resolve) => ({rootElement: host, locatorFor: q => async () => resolve(q),
    locatorForAll: q => async () => {assert.equal(typeof q.filter, 'function'); return q.filter(order.map(v => states.get(v).harness));},
    locatorForOptional: q => async () => resolve(q), documentRootLocatorFactory() {return this;},
    async forceStabilize() {}, async waitForTasksOutsideAngular() {}});
  for (const value of order) {
    const state = {value, label: value === 'one' ? 'One' : 'Two', checked: value === 'one', disabled: false, focused: false};
    states.set(value, state);
    const input = {
      async getProperty(name) {assert.ok(['checked', 'value'].includes(name)); return state[name];},
      async getAttribute(name) {return name === 'disabled' ? state.disabled ? '' : null : name === 'name' ? 'group' : null;},
      async focus() {state.focused = true; calls.push(['focus', value]);},
      async blur() {state.focused = false; calls.push(['blur', value]);}, async isFocused() {return state.focused;},
    };
    const label = {async text() {return state.label;}, async click() {calls.push(['check', value]); for (const s of states.values()) s.checked = s === state;}};
    const host = {async matchesSelector() {return true;}, async getProperty() {return 'radio-' + value;}};
    state.harness = new types.MatLegacyRadioButtonHarness(makeLocator(host, selector => {
      if (selector === 'input') return input;
      assert.ok(['.mat-radio-label-content', '.mat-radio-label'].includes(selector)); return label;
    }));
  }
  const radio = new types.MatLegacyRadioGroupHarness(makeLocator({async matchesSelector() {return true;}}, () => {throw Error('unused group locator');}));
  const code = ts.transpileModule('return ' + fixture.object + ';', {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  const handlers = new Function('radio', code)(radio);
  assert.equal(await handlers.read(), 'one'); await handlers.interact();
  assert.equal(await handlers.read(), 'two'); assert.deepEqual(calls, [['check', 'two']]);
  await handlers.touch(); assert.deepEqual(calls, [['check', 'two'], ['focus', 'two'], ['blur', 'two']]);
  assert.equal(await handlers.disabled(), false);
  states.get('two').disabled = true; assert.equal(await handlers.disabled(), false);
  states.get('one').disabled = true; assert.equal(await handlers.disabled(), true);
  states.get('one').disabled = false; assert.equal(await handlers.disabled(), false);
  states.get('two').disabled = false; assert.equal(await handlers.disabled(), false);
  return {line: model.line, order, selected: await handlers.read(), calls, disabled_cases: 5,
    genuine_public_testing_namespace: true, actual_owned_harness_definitions: true,
    Angular_control_or_native_execution: false};
}
