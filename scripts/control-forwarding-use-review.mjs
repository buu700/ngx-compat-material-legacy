/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical form-field state classes and public AbstractControlDirective keys. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
import {inspectNgControlContracts} from './ng-control-use-review.mjs';

const require = createRequire(import.meta.url), ts = require('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePath = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts';
const referencePath = 'reference/material-16.2.14/control-forwarding-sources/form-field.ts';
const referenceHash = 'c32e86f1be87568387a09abcd7e6c47e6cb33fd63ea0cff8b224e98073dd1726';
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
function formFieldParts(source, checker) {
  const node = one(source.statements.filter(node => ts.isClassDeclaration(node) &&
    node.name?.text === 'MatLegacyFormField'), 'historical form-field class');
  const method = one(node.members.filter(node => ts.isMethodDeclaration(node) &&
    node.name?.text === '_shouldForward'), 'whole historical forwarding method');
  assert.equal(method.parameters.length, 1);
  assert.equal(method.parameters[0].name.text, 'prop');
  assert.equal(method.type.kind, ts.SyntaxKind.BooleanKeyword);
  assert.ok(!method.modifiers?.some(node =>
    [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.StaticKeyword]
      .includes(node.kind)), 'historical public forwarding method changed');
  const parameter = method.parameters[0].type;
  assert.ok(ts.isTypeOperatorNode(parameter) && parameter.operator === ts.SyntaxKind.KeyOfKeyword &&
    ts.isTypeReferenceNode(parameter.type) && !parameter.type.typeArguments,
  'historical forwarding key type changed');
  const decorator = one(ts.getDecorators(node).filter(decorator =>
    ts.isCallExpression(decorator.expression) && decorator.expression.expression.getText(source) ===
    'Component'), 'actual form-field Component decorator');
  if (checker) {
    const symbol = checker.getSymbolAtLocation(decorator.expression.expression);
    const imported = symbol?.declarations?.find(ts.isImportSpecifier);
    assert.ok(imported && (imported.propertyName || imported.name).text === 'Component' &&
      imported.parent.parent.parent.moduleSpecifier.text === '@angular/core');
  }
  const metadata = decorator.expression.arguments[0];
  assert.ok(ts.isObjectLiteralExpression(metadata));
  const host = one(metadata.properties.filter(node => ts.isPropertyAssignment(node) &&
    node.name.text === 'host'), 'whole host metadata').initializer;
  assert.ok(ts.isObjectLiteralExpression(host));
  const bindings = host.properties.filter(node => ts.isPropertyAssignment(node) &&
    node.name.text.startsWith('[class.ng-')).map(node => {
    assert.ok(ts.isStringLiteral(node.initializer));
    return {host_class: node.name.text, expression: node.initializer.text};
  });
  assert.equal(bindings.length, 7);
  return {method, parameter, bindings};
}

export function scanControlForwardingUse({root = rootDefault, readSource} = {}) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(hash(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const rows = JSON.parse(seed).symbol_uses.filter(row => row.module === '@angular/forms' &&
    row.symbol === 'AbstractControlDirective');
  assert.equal(rows.length, 1); assert.equal(rows[0].file, 'legacy-form-field/form-field.ts');
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const imports = source => source.statements.filter(ts.isImportDeclaration)
    .filter(node => node.moduleSpecifier.text === '@angular/forms' &&
      node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings))
    .flatMap(node => node.importClause.namedBindings.elements.filter(item =>
      (item.propertyName || item.name).text === 'AbstractControlDirective'));
  const paths = execFileSync('rg', ['--files', 'projects/ngx-material-legacy', '-g', '*.ts',
    '-g', '!*.spec.ts'], {cwd: root, encoding: 'utf8'}).trim().split('\n');
  assert.deepEqual(paths.filter(path => imports(parse(path, read(path))).length), [sourcePath]);
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  const absolute = join(root, sourcePath);
  host.readFile = path => path === absolute ? read(sourcePath) : oldRead(path);
  const program = ts.createProgram([absolute], options, host), checker = program.getTypeChecker();
  const source = program.getSourceFile(absolute);
  const imported = one(imports(source), 'missing/ambiguous control directive import');
  const symbol = checker.getSymbolAtLocation(imported.name), references = [];
  const parts = formFieldParts(source, checker);
  function visit(node) {
    if (ts.isIdentifier(node) && node !== imported.name && node !== imported.propertyName &&
        checker.getSymbolAtLocation(node) === symbol) {
      assert.ok(node === parts.parameter.type.typeName, 'unreviewed control directive role');
      references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        role: 'keyof-public-ancestor-state-class-forwarder', context: parts.parameter.getText(source)});
    }
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(references.length, 1);
  const tagged = readFileSync(join(root, referencePath));
  assert.equal(hash(tagged), referenceHash, 'tagged form-field oracle changed');
  const originalSource = parse(referencePath, tagged.toString());
  const original = formFieldParts(originalSource);
  assert.equal(print(parts.method.body, source), print(original.method.body, originalSource),
    'whole forwarding body differs from tagged original');
  assert.deepEqual(parts.bindings, original.bindings, 'historical ng state class bindings changed');
  const keys = parts.bindings.map(binding => {
    const expression = parse('host-binding.ts', binding.expression);
    const call = expression.statements[0].expression;
    assert.ok(ts.isCallExpression(call) && call.expression.text === '_shouldForward' &&
      call.arguments.length === 1 && ts.isStringLiteral(call.arguments[0]));
    return call.arguments[0].text;
  });
  return {case: {file: rows[0].file, module: '@angular/forms', symbol: 'AbstractControlDirective',
    local_name: imported.name.text, candidate_source_sha256: hash(source.text), references},
    bindings: parts.bindings, keys, original_method: print(original.method, originalSource),
    owned_method: print(parts.method, source), source_override_used: !!readSource};
}

export function exerciseControlForwardingRuntime({forms}, payload, change = {}) {
  class Directive extends forms.NgControl {
    current = null;
    get control() { return this.current; }
    viewToModelUpdate() {}
  }
  const results = [];
  for (const [id, text] of [['tagged-original', payload.original_method],
    ['owned-forwarder', change.method ?? payload.owned_method]]) {
    const run = new Function(emit('class Subject {' + text + '}\nreturn Subject;'))()
      .prototype._shouldForward;
    const directive = new Directive();
    assert.ok(directive instanceof forms.AbstractControlDirective);
    const subject = {_control: null}, observations = [];
    const step = label => observations.push({label, values: Object.fromEntries(payload.keys.map(key => {
      const value = run.call(subject, key);
      return [key, {kind: value === null ? 'null' : typeof value, value: value ?? null}];
    }))});
    step('absent-component-control');
    subject._control = {ngControl: null}; step('null-control-directive');
    subject._control = {ngControl: undefined}; step('undefined-control-directive');
    subject._control = {ngControl: directive}; step('directive-without-control');
    const control = new forms.FormControl('', forms.Validators.required);
    directive.current = control; step('invalid-untouched');
    control.markAsTouched(); control.markAsDirty(); step('invalid-touched-dirty');
    control.setValue('valid'); step('valid-touched-dirty');
    control.disable(); step('disabled'); control.enable(); control.markAsPending(); step('pending');
    directive.current = new forms.FormControl('replacement'); step('replaced-valid-pristine');
    directive.current = null; step('replaced-null');
    for (const index of [0, 1, 3, 10]) assert.ok(Object.values(observations[index].values)
      .every(value => value.kind === 'null'));
    assert.ok(Object.values(observations[2].values).every(value => value.kind === 'undefined'));
    const expected = [
      [true, false, true, false, false, true, false],
      [false, true, false, true, false, true, false],
      [false, true, false, true, true, false, false],
      [false, true, false, true, false, false, false],
      [false, true, false, true, false, false, true],
      [true, false, true, false, true, false, false],
    ];
    assert.deepEqual(observations.slice(4, 10).map(row => Object.values(row.values).map(v => v.value)), expected);
    results.push({id, observations});
  }
  assert.deepEqual(results[1].observations, results[0].observations);
  return {results, keys: payload.keys, reads_per_subject: 154,
    actual_public_namespace_and_reactive_controls: true,
    host_control_wrapper_is_protocol: true, native_host_class_application_or_rendering: false};
}

export function compileControlForwardingTypes(models, compilerRoot, method) {
  const path = compilerRoot ? join(compilerRoot, 'lib/typescript.js') : require.resolve('typescript');
  const compiler = require(path), receipts = [];
  const code = `import {AbstractControlDirective,NgControl} from '@angular/forms';
class Forwarder { _control:{ngControl:NgControl|null}|null=null; ${method} }
const forwarder=new Forwarder();for(const key of ['untouched','touched','pristine','dirty','valid','invalid','pending'] as const){const result:boolean=forwarder._shouldForward(key);}
declare const directive:NgControl;const ancestor:AbstractControlDirective=directive;
// @ts-expect-error Unknown state keys remain invalid.
forwarder._shouldForward('missing');
// @ts-expect-error State keys are not numeric.
forwarder._shouldForward(1);
// @ts-expect-error Historical declared method result remains boolean.
const text:string=forwarder._shouldForward('valid');
// @ts-expect-error Public ancestor remains abstract.
new AbstractControlDirective();
// @ts-expect-error A public directive cannot be null.
const missing:AbstractControlDirective=null;
// @ts-expect-error A partial status object is not a genuine public directive.
forwarder._control={ngControl:{invalid:true}};
`;
  for (const model of models) {
    const file = join(model.root, 'control-forwarding-consumer.ts'); writeFileSync(file, code);
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

export function reviewControlForwardingUse({root = rootDefault, subjects, compilerRoot} = {}) {
  const own = !subjects, loaded = subjects ?? prepareMaterialPublicSubjects(root);
  try {
    const scanned = scanControlForwardingUse({root}), runtime = [];
    for (const model of loaded.models) {
      writeFileSync(join(model.root, 'control-forwarding-payload.json'), JSON.stringify(scanned));
      const script = `import {readFileSync} from 'node:fs';
import {exerciseControlForwardingRuntime} from ${JSON.stringify(join(root,'scripts/control-forwarding-use-review.mjs'))};
await import('@angular/compiler');const forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./control-forwarding-payload.json',import.meta.url)));
console.log(JSON.stringify(exerciseControlForwardingRuntime({forms},payload)));`;
      writeFileSync(join(model.root, 'control-forwarding-runtime.mjs'), script);
      runtime.push({line: model.line, ...JSON.parse(execFileSync(process.execPath,
        ['--max-old-space-size=512', join(model.root,'control-forwarding-runtime.mjs')],
        {cwd: model.root, env: process.env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024}))});
    }
    for (const entry of runtime.slice(1)) assert.deepEqual(entry.results, runtime[0].results);
    const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json')))
      .version.startsWith('21.') ? '21.x' : 'main';
    return {schema_version: 1, line, frozen_uses: 1, current_uses: 1,
      ...scanned, contracts: inspectNgControlContracts(loaded), runtime,
      type_compilation: compileControlForwardingTypes(loaded.models, compilerRoot, scanned.original_method),
      reference: {path: referencePath, sha256: referenceHash},
      namespace_capsule_sha256: loaded.capsule_hash, node: process.version, binding_parser: ts.version,
      limits: ['Seven exact historical class bindings and whole helper with genuine public ancestor/reactive control states. The form-field control wrapper is a protocol; no native DOM class application/rendering/AOT/packed/application/full Node/Rx qualification.',
        'Declared Boolean return and historical runtime null/undefined absent-control values both retained. No truthiness normalization or public/private upstream API change.'],
      g11_claim: 'not-passed'};
  } finally { if (own) loaded.dispose(); }
}
