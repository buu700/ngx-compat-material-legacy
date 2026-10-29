/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Prepare and compile a minimal restoration without changing the product file. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root = process.cwd();
const prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
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
readBound(require.resolve('typescript'));
assert.equal(process.version, 'v24.21.0');
assert.equal(ts.version, '5.9.2');
const baseline = JSON.parse(readBound(prefix + 'error-harness-minimum-diagnostic.json',
  '6fcddb9ae9c4ef70065fa8e052f58146c784f4406965efb375ff286433f31c95'));
assert.equal(baseline.positive_compiler_cells, 3);
assert.equal(baseline.reproduced_missing_helper_cells, 1);
for (const ref of baseline.source_bindings) {
  const raw = readBound(ref.path, ref.sha256);
  assert.equal(raw.length, ref.bytes);
}
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz')));
const tag = original.tagged_reference.members.find(member => member.path === 'src/material/form-field/testing/error-harness.ts');
assert.ok(tag);
const ownedPath = 'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts';
const before = readBound(ownedPath).toString();
function parse(text, name = 'subject.ts') {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  assert.deepEqual(source.parseDiagnostics, []);
  return source;
}
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const values = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    values.push([token, scanner.getTokenText()]);
  }
  return values;
}
function declaration(source, name) {
  const found = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
  assert.ok(found, name);
  return found;
}
function member(declaration, source, name) {
  const found = declaration.members.find(node => node.name?.getText(source) === name);
  assert.ok(found, name);
  return found;
}
const oldSource = parse(tag.body);
const oldClass = declaration(oldSource, '_MatErrorHarnessBase');
const oldHelper = member(oldClass, oldSource, '_getErrorPredicate');
const oldHelperText = oldHelper.getText(oldSource);
const beforeSource = parse(before);
const beforeClass = declaration(beforeSource, 'MatLegacyErrorHarness');
const beforeWith = member(beforeClass, beforeSource, 'with');
const oldImport = "import {ErrorHarnessFilters} from '@angular/material/form-field/testing';";
const newImport = "import {ErrorHarnessFilters, type MatErrorHarness} from '@angular/material/form-field/testing';";
const importAt = before.indexOf(oldImport);
assert.ok(importAt >= 0);
assert.equal(before.split(oldImport).length, 2);
const delegation = '{\n    return MatLegacyErrorHarness._getErrorPredicate(this, options);\n  }';
const edits = [
  {start: importAt, end: importAt + oldImport.length, text: newImport},
  {start: beforeWith.body.getStart(beforeSource), end: beforeWith.body.end, text: delegation},
  {start: beforeWith.end, end: beforeWith.end, text: '\n\n  ' + oldHelperText},
].sort((a, b) => b.start - a.start);
let proposed = before;
for (const edit of edits) proposed = proposed.slice(0, edit.start) + edit.text + proposed.slice(edit.end);

function verifyScope(text) {
  const source = parse(text);
  const nextClass = declaration(source, 'MatLegacyErrorHarness');
  assert.equal(source.statements.length, beforeSource.statements.length);
  assert.equal(nextClass.members.length, beforeClass.members.length + 1);
  assert.equal(nextClass.heritageClauses[0].getText(source), beforeClass.heritageClauses[0].getText(beforeSource));
  for (let i = 0; i < beforeSource.statements.length; i++) {
    const a = beforeSource.statements[i], b = source.statements[i];
    if (a === beforeClass) continue;
    assert.equal(b.getText(source), a.getText(beforeSource) === oldImport ? newImport : a.getText(beforeSource));
  }
  for (const originalMember of beforeClass.members) {
    const name = originalMember.name.getText(beforeSource);
    const current = member(nextClass, source, name);
    if (name === 'with') {
      assert.equal(current.getText(source).slice(0, current.body.getStart(source) - current.getStart(source)),
        originalMember.getText(beforeSource).slice(0, originalMember.body.getStart(beforeSource) - originalMember.getStart(beforeSource)));
      assert.equal(current.body.getText(source), delegation);
    } else {
      assert.equal(current.getText(source), originalMember.getText(beforeSource));
    }
  }
  const restored = member(nextClass, source, '_getErrorPredicate');
  assert.deepEqual(tokens(restored.getText(source)), tokens(oldHelperText));
  assert.equal(restored.body.getText(source), oldHelper.body.getText(oldSource));
  return source;
}
verifyScope(proposed);
let scopeControls = 0;
for (const mutation of [
  text => text.replace("'.mat-error'", "'.mat-mdc-form-field-error'"),
  text => text.replace('return (await this.host()).text();', 'return (await this.host()).getAttribute("class");'),
  text => text.replace('protected static _getErrorPredicate', 'private static _getErrorPredicate'),
  text => text.replace("addOption('text', options.text,", "addOption('text', undefined,"),
]) {
  const changed = mutation(proposed);
  assert.notEqual(changed, proposed);
  assert.throws(() => verifyScope(changed));
  scopeControls++;
}
const commonOptions = {
  strict: true, skipLibCheck: false, noEmit: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [], noErrorTruncation: true,
};
const consumers = baseline.cells.filter(cell => cell.implementation === 'owned').map(cell => ({
  name: cell.contract,
  ...cell.virtual_sources.find(source => source.path.includes('virtual-owned-')),
}));
consumers.push({
  name: 'historical-generic-domain', path: prefix + 'virtual-proposed-generic-domain.ts',
  body: "import {MatLegacyErrorHarness} from '../../projects/ngx-material-legacy/legacy-form-field/testing/error-harness';\n" +
    "import {MatErrorHarness, ErrorHarnessFilters} from '@angular/material/form-field/testing';\n" +
    "import {ComponentHarnessConstructor} from '@angular/cdk/testing';\n" +
    "export class ExposedErrorHarness extends MatLegacyErrorHarness {\n" +
    "  static forType<T extends MatErrorHarness>(type: ComponentHarnessConstructor<T>, options: ErrorHarnessFilters) {\n" +
    "    return this._getErrorPredicate(type, options);\n" +
    "  }\n" +
    "}\n" +
    "export const legacy = ExposedErrorHarness.forType(MatLegacyErrorHarness, {});\n" +
    "export const modern = ExposedErrorHarness.forType(MatErrorHarness, {});\n" +
    "export const derived = ExposedErrorHarness.forType(ExposedErrorHarness, {});\n",
});
const receipts = [];
function compile(consumer, candidate, expectedPrivate = false) {
  const virtual = new Map([[resolve(root, ownedPath), candidate], [resolve(root, consumer.path), consumer.body]]);
  const host = ts.createCompilerHost(commonOptions);
  const fileExists = host.fileExists.bind(host), readFile = host.readFile.bind(host);
  host.getCurrentDirectory = () => root;
  host.fileExists = path => virtual.has(resolve(path)) || fileExists(path);
  host.readFile = path => virtual.get(resolve(path)) ?? readFile(path);
  host.getSourceFile = (path, languageVersion, onError) => {
    const text = host.readFile(path);
    if (text === undefined) {onError?.('Missing compiler input ' + path); return undefined;}
    return ts.createSourceFile(path, text, languageVersion, true);
  };
  host.writeFile = () => assert.fail('Proposal compiler must not write files');
  const start = performance.now();
  const program = ts.createProgram([resolve(root, consumer.path)], commonOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(item => ({
    code: item.code, file: item.file ? relative(root, item.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
  }));
  if (expectedPrivate) {
    assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
    assert.equal(diagnostics[0].code, 2341, JSON.stringify(diagnostics));
    assert.match(diagnostics[0].message, /'_getErrorPredicate' is private/);
  } else assert.deepEqual(diagnostics, []);
  const compilerInputs = program.getSourceFiles().map(source => {
    if (virtual.has(resolve(source.fileName))) return {path: relative(root, source.fileName), virtual: true, sha256: hash(source.text), bytes: Buffer.byteLength(source.text)};
    const raw = readBound(source.fileName);
    assert.equal(raw.toString(), source.text);
    return {...bound.get(resolve(source.fileName)), virtual: false};
  });
  receipts.push({name: consumer.name, expected_result: expectedPrivate ? 'reject-private-helper' : 'pass', strict: true, skipLibCheck: false, noEmit: true, diagnostics, seconds: (performance.now() - start) / 1000, consumer, candidate_sha256: hash(candidate), compiler_inputs: compilerInputs});
}
for (const consumer of consumers) compile(consumer, proposed);
compile(consumers.find(consumer => consumer.name === 'inherited-protected-helper'),
  proposed.replace('protected static _getErrorPredicate', 'private static _getErrorPredicate'), true);

const outputOptions = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext};
const beforeOutput = ts.transpileModule(before, {compilerOptions: outputOptions}).outputText;
const proposedOutput = ts.transpileModule(proposed, {compilerOptions: outputOptions}).outputText;
function imports(text) {
  return parse(text).statements.filter(ts.isImportDeclaration).map(node => node.getText());
}
assert.deepEqual(imports(proposedOutput), imports(beforeOutput));
assert.doesNotMatch(proposedOutput, /\bMatErrorHarness\b/);
const child = spawnSync('/nix/store/lfh101cfjj8p8npcari9hk0lbqi33yvh-python3-3.14.7/bin/python3', ['-c',
  'import difflib,json,sys\nd=json.load(sys.stdin)\nsys.stdout.write("diff --git a/"+d["path"]+" b/"+d["path"]+"\\n")\nsys.stdout.writelines(difflib.unified_diff(d["before"].splitlines(True),d["after"].splitlines(True),fromfile="a/"+d["path"],tofile="b/"+d["path"]))'],
{input: JSON.stringify({path: ownedPath, before, after: proposed}), encoding: 'utf8'});
assert.equal(child.status, 0, child.stderr);
assert.ok(child.stdout.includes('protected static _getErrorPredicate'));
for (const [absolute, ref] of bound) {
  const raw = readFileSync(absolute);
  assert.equal(hash(raw), ref.sha256, 'Late proposal input change ' + ref.path);
  assert.equal(raw.length, ref.bytes);
}
assert.equal(readFileSync(join(root, ownedPath)).toString(), before);
const report = {
  schema_version: 1, line: '21.x', sha: original.sha,
  role: 'Concrete un-applied local TypeScript repair proposal for one reproduced protected harness API gap;not whole-SHA source qualification',
  versions: baseline.versions, node: process.version,
  baseline_diagnostic: {path: prefix + 'error-harness-minimum-diagnostic.json', sha256: '6fcddb9ae9c4ef70065fa8e052f58146c784f4406965efb375ff286433f31c95'},
  product_path: ownedPath, before_sha256: hash(before), proposed_sha256: hash(proposed),
  proposed_source: proposed,
  exact_historical_helper_signature_and_body_retained: true,
  existing_with_signature_getText_host_selector_and_parent_unchanged: true,
  new_MatErrorHarness_import_is_type_only_and_erased: true,
  runtime_imports_unchanged: imports(proposedOutput),
  scope_faults_rejected: scopeControls, positive_compiler_cells: 3, private_visibility_compiler_control_rejected: true,
  cells: receipts, source_bindings: [...bound.values()],
  patch: {path: prefix + 'error-harness-proposed.patch', sha256: hash(child.stdout), bytes: Buffer.byteLength(child.stdout)},
  historical_code_executed: false, emitted_files: 0, product_changes: 0,
  canonical_dispositions_changed: 0, exceptions_changed: 0,
  substantive_whole_SHA_review_complete: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed',
};
assert.equal(process.argv.length, 3);
writeFileSync(join(root, report.patch.path), child.stdout, {flag: 'wx'});
writeFileSync(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'protected-error-helper-repair-proposal-qualified', positive_compiler_cells: 3, scope_faults_rejected: scopeControls, private_visibility_control_rejected: true, product_changes: 0, whole_SHA_qualified: false}));
