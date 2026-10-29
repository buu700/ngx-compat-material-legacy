/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Four tiny strict compiler cells; no historical program is executed or emitted. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root = process.cwd();
const prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const gitBlob = raw => createHash('sha1').update('blob ' + Buffer.byteLength(raw) + '\0').update(raw).digest('hex');
const bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path);
  const raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref);
  else bound.set(absolute, ref);
  return raw;
}
readBound(fileURLToPath(import.meta.url));
assert.equal(process.version, 'v24.21.0');
assert.equal(ts.version, '5.9.2');
const versions = {};
for (const [name, version] of [
  ['typescript', '5.9.2'], ['@angular/core', '21.2.23'],
  ['@angular/cdk', '21.2.14'], ['@angular/material', '21.2.14'],
]) {
  const path = 'node_modules/' + name + '/package.json';
  const actual = JSON.parse(readBound(path));
  assert.equal(actual.version, version);
  versions[name] = actual.version;
}
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz',
  '3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a')));
const taggedPaths = [
  ['src/material/form-field/testing/error-harness.ts', '759763a1be66b3f5d43dd781f26406ae8a75786c', '532622980f23259e6647f560bb1421938c222942274af95fda010bcad5dcc65c'],
  ['src/material/legacy-form-field/testing/error-harness.ts', '639e340440fb40852133fa3d0176a5673c1d2be6', '558c62ee22278b8d5499ed3b2c99e967cbe8e06590f61c09a75405a753c4fd70'],
];
const tagged = taggedPaths.map(([path, blob, sha256]) => {
  const member = original.tagged_reference.members.find(member => member.path === path);
  assert.ok(member);
  assert.equal(gitBlob(member.body), blob);
  assert.equal(member.blob, blob);
  assert.equal(hash(member.body), sha256);
  assert.equal(member.sha256, sha256);
  return member;
});
const worksheet = JSON.parse(readBound(prefix + 'worksheet.json',
  'a7459210660b5eea641d1239ef0a2c8fb329df8a4c2ef8c8a89a123353b1dace'));
for (const key of ['protected_ledger', 'protected_registry', 'protected_roster', 'prior_source_admission']) {
  const ref = worksheet[key];
  const raw = readBound(ref.path, ref.sha256);
  assert.equal(raw.length, ref.bytes);
}
const ownedPath = 'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts';
const ownedText = readBound(ownedPath).toString();
readBound('compatibility/rc/api/signature-differences.json');

const virtualPrefix = join(root, prefix + 'virtual-');
const taggedBasePath = virtualPrefix + 'tagged-error-base.ts';
const taggedLegacyPath = virtualPrefix + 'tagged-legacy-error.ts';
const oldSpecifier = "'@angular/material/form-field/testing'";
assert.equal(tagged[1].body.split(oldSpecifier).length, 2);
const newSpecifier = "'./" + prefix.split('/').at(-1) + "virtual-tagged-error-base'";
const taggedLegacyText = tagged[1].body.replace(oldSpecifier, newSpecifier);
assert.equal(taggedLegacyText.replace(newSpecifier, oldSpecifier), tagged[1].body);
const options = {
  strict: true, skipLibCheck: false, noEmit: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [],
  noErrorTruncation: true,
};
const receipts = [];
let taggedProgram;
let ownedProgram;
for (const implementation of ['tagged', 'owned']) {
  for (const contract of ['with', 'inherited-protected-helper']) {
    const consumerPath = virtualPrefix + implementation + '-' + contract + '.ts';
    const target = implementation === 'tagged'
      ? './' + prefix.split('/').at(-1) + 'virtual-tagged-legacy-error'
      : '../../' + ownedPath.slice(0, -3);
    const consumer = 'import {MatLegacyErrorHarness} from ' + JSON.stringify(target) + ';\n' + (
      contract === 'with'
        ? "export const predicate = MatLegacyErrorHarness.with({text: 'Required'});\n"
        : "export class DerivedErrorHarness extends MatLegacyErrorHarness {\n" +
          "  static inheritedPredicate() {\n" +
          "    return super._getErrorPredicate(DerivedErrorHarness, {text: 'Required'});\n" +
          "  }\n" +
          "}\n"
    );
    const virtual = new Map([[resolve(consumerPath), consumer]]);
    if (implementation === 'tagged') {
      virtual.set(resolve(taggedBasePath), tagged[0].body);
      virtual.set(resolve(taggedLegacyPath), taggedLegacyText);
    }
    const host = ts.createCompilerHost(options);
    const actualRead = host.readFile.bind(host);
    const actualExists = host.fileExists.bind(host);
    host.getCurrentDirectory = () => root;
    host.fileExists = path => virtual.has(resolve(path)) || actualExists(path);
    host.readFile = path => virtual.get(resolve(path)) ?? actualRead(path);
    host.getSourceFile = (path, languageVersion, onError) => {
      const source = host.readFile(path);
      if (source === undefined) {
        onError?.('Missing compiler input ' + path);
        return undefined;
      }
      return ts.createSourceFile(path, source, languageVersion, true);
    };
    host.writeFile = () => assert.fail('Compiler cell must not emit files');
    const start = performance.now();
    const program = ts.createProgram([consumerPath], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      file: diagnostic.file ? relative(root, diagnostic.file.fileName) : null,
      start: diagnostic.start ?? null,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    }));
    const expectedMissing = implementation === 'owned' && contract === 'inherited-protected-helper';
    if (expectedMissing) {
      assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
      assert.equal(diagnostics[0].code, 2339, JSON.stringify(diagnostics));
      assert.equal(diagnostics[0].file, relative(root, consumerPath));
      assert.match(diagnostics[0].message, /Property '_getErrorPredicate' does not exist/);
    } else {
      assert.deepEqual(diagnostics, []);
    }
    const inputRefs = program.getSourceFiles().map(source => {
      if (virtual.has(resolve(source.fileName))) return {
        path: relative(root, source.fileName), virtual: true,
        sha256: hash(source.text), bytes: Buffer.byteLength(source.text),
      };
      const raw = readBound(source.fileName);
      assert.equal(raw.toString(), source.text);
      return {...bound.get(resolve(source.fileName)), virtual: false};
    });
    receipts.push({
      implementation, contract, expected_result: expectedMissing ? 'missing-inherited-helper' : 'pass',
      diagnostics, seconds: (performance.now() - start) / 1000,
      strict: true, skipLibCheck: false, noEmit: true,
      virtual_sources: [...virtual].map(([path, body]) => ({path: relative(root, path), body, sha256: hash(body)})),
      compiler_inputs: inputRefs,
    });
    if (implementation === 'tagged') taggedProgram = program;
    else ownedProgram = program;
  }
}

function method(program, path, className, name) {
  const source = program.getSourceFile(path);
  assert.ok(source, path);
  const declaration = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === className);
  assert.ok(declaration, className);
  const found = declaration.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(source) === name);
  assert.ok(found, name);
  return {source, declaration, found};
}
const originalHelper = method(taggedProgram, taggedBasePath, '_MatErrorHarnessBase', '_getErrorPredicate');
const ownedWith = method(ownedProgram, resolve(root, ownedPath), 'MatLegacyErrorHarness', 'with');
assert.ok(originalHelper.found.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ProtectedKeyword));
assert.ok(originalHelper.found.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword));
assert.equal(originalHelper.found.body.statements.length, 1);
assert.equal(ownedWith.found.body.statements.length, 1);
const oldReturn = originalHelper.found.body.statements[0];
const ownedReturn = ownedWith.found.body.statements[0];
assert.ok(ts.isReturnStatement(oldReturn) && ts.isReturnStatement(ownedReturn));
const checker = taggedProgram.getTypeChecker();
const typeParameter = checker.getSymbolAtLocation(originalHelper.found.parameters[0].name);
assert.ok(typeParameter);
let replacements = 0;
const transformed = ts.transform(oldReturn.expression, [context => node => {
  const visit = current => {
    if (ts.isIdentifier(current) && checker.getSymbolAtLocation(current) === typeParameter) {
      replacements++;
      return ts.factory.createThis();
    }
    return ts.visitEachChild(current, visit, context);
  };
  return ts.visitNode(node, visit);
}]);
assert.equal(replacements, 1);
const printer = ts.createPrinter({removeComments: true});
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const result = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    result.push([token, scanner.getTokenText()]);
  }
  return result;
}
const adaptedExpression = printer.printNode(ts.EmitHint.Expression, transformed.transformed[0], originalHelper.source);
const ownedExpression = printer.printNode(ts.EmitHint.Expression, ownedReturn.expression, ownedWith.source);
assert.deepEqual(tokens(adaptedExpression), tokens(ownedExpression));
transformed.dispose();
const originalGetText = method(taggedProgram, taggedBasePath, '_MatErrorHarnessBase', 'getText');
const ownedGetText = method(ownedProgram, resolve(root, ownedPath), 'MatLegacyErrorHarness', 'getText');
assert.deepEqual(tokens(originalGetText.found.body.getText(originalGetText.source)), tokens(ownedGetText.found.body.getText(ownedGetText.source)));
for (const [absolute, ref] of bound) {
  const raw = readFileSync(absolute);
  assert.equal(hash(raw), ref.sha256, 'Late compiler input change ' + ref.path);
  assert.equal(raw.length, ref.bytes);
}
assert.equal(readFileSync(join(root, ownedPath)).toString(), ownedText);
const report = {
  schema_version: 1, line: '21.x', sha: original.sha,
  scope: 'One historical error-harness static factory and inherited protected-helper contract at supported21 minimum;not whole-family or whole-SHA qualification',
  node: process.version, versions,
  tagged_members: tagged.map(({path, blob, sha256, bytes}) => ({path, blob, sha256, bytes})),
  tagged_module_binding_adapter: {old_specifier: oldSpecifier, new_specifier: newSpecifier, replacements: 1, other_tagged_source_edits: 0},
  cells: receipts,
  positive_compiler_cells: 3, reproduced_missing_helper_cells: 1,
  factory_return_expression_identity: {symbol_bound_parameter_to_this_replacements: replacements, identical_after_that_single_binding_adapter: true},
  getText_body_tokens_identical: true,
  recommended_followup: 'Restore a locally owned protected predicate helper and delegate with() to it,retaining legacy selectors. Preserving the subclass contract requires only a small local TypeScript change;use a separately bounded repair worksheet after source assessment.',
  source_bindings: [...bound.values()],
  historical_code_executed: false, emitted_files: 0,
  product_changes: 0, canonical_dispositions_changed: 0,
  substantive_whole_SHA_review_complete: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed',
};
assert.equal(process.argv.length, 3);
writeFileSync(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({
  result: 'error-harness-contract-diagnostic-complete', positive_compiler_cells: 3,
  missing_inherited_helper_reproduced: true, factory_return_expression_identity: true,
  source_bindings: bound.size, substantive_whole_SHA_review_complete: false,
}));
