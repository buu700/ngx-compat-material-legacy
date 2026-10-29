/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Verify exact applied repairs,actual source compilation and genuine content-token injection. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-repair-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref); else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const worksheet = JSON.parse(readBound(prefix + 'worksheet.json'));
const old = JSON.parse(readBound(worksheet.source_review.path, worksheet.source_review.sha256));
assert.equal(old.source_review_complete, true); assert.equal(old.canonical_admission_ready, false);
const changed = new Set([...worksheet.repairs.map(r => r.path), worksheet.api_exception_narrowing.path]);
const baseline = new Map();
const gitEnv = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete gitEnv[name];
for (const path of changed) baseline.set(path, execFileSync('git', ['--no-replace-objects',
  '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', worksheet.baseline_commit + ':' + path],
  {cwd: root, env: gitEnv, maxBuffer: 1024 * 1024}));
for (const ref of old.source_bindings) {
  const raw = baseline.get(ref.path) || readBound(ref.path, ref.sha256);
  assert.equal(hash(raw), ref.sha256, ref.path); assert.equal(raw.length, ref.bytes);
}
const applied = [];
for (const repair of worksheet.repairs) {
  assert.equal(hash(baseline.get(repair.path)), repair.before.sha256);
  const proposal = JSON.parse(readBound(repair.proposal.path, repair.proposal.sha256));
  readBound(repair.patch.path, repair.patch.sha256);
  const candidate = proposal.candidate_source || proposal.proposed_source;
  const raw = readBound(repair.path, repair.after_sha256);
  assert.equal(raw.toString(), candidate); assert.equal(raw.length, repair.after_bytes);
  applied.push({id: repair.id, path: repair.path, before_sha256: repair.before.sha256,
    after_sha256: repair.after_sha256, equals_qualified_proposal: true});
}
const exception = worksheet.api_exception_narrowing;
const previousApi = JSON.parse(baseline.get(exception.path));
assert.equal(previousApi.differences.length, exception.before_rows);
assert.equal(previousApi.differences.filter(r => JSON.stringify(r) === JSON.stringify(exception.remove_exact_entry)).length, 1);
previousApi.differences = previousApi.differences.filter(r => JSON.stringify(r) !== JSON.stringify(exception.remove_exact_entry));
const api = readBound(exception.path, exception.after_sha256);
assert.equal(api.toString(), JSON.stringify(previousApi, null, 2) + '\n');
assert.equal(previousApi.differences.length, exception.after_rows);
for (const ref of Object.values(worksheet.protected_inputs)) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);

const errorPath = worksheet.repairs.find(r => r.id === 'error').path;
const servicePath = worksheet.repairs.find(r => r.id === 'snack').path;
const intro = `import {HarnessPredicate,ComponentHarnessConstructor} from '@angular/cdk/testing';
import {MatErrorHarness as Peer,ErrorHarnessFilters} from '@angular/material/form-field/testing';
import {MatLegacyErrorHarness as Owned} from '../../${errorPath.replace(/\.ts$/, '')}';
class Derived extends Owned {static predicate(){return super._getErrorPredicate(Derived,{text:/legacy/});}}
class Domain extends Owned {static predicateFor<T extends Peer>(type:ComponentHarnessConstructor<T>,options:ErrorHarnessFilters={}){
 return super._getErrorPredicate(type,options);}}
const one:HarnessPredicate<Owned>=Owned.with({text:'legacy'});
const two:HarnessPredicate<Derived>=Derived.with({text:/legacy/});
Derived.predicate();Domain.predicateFor(Peer);Domain.predicateFor(Owned);Domain.predicateFor(Derived);
`;
const options = {strict: true, strictPropertyInitialization: false, experimentalDecorators: true,
  skipLibCheck: false, noEmit: true, types: [], target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts']};
const compilerCells = [];
for (const visibility of ['historical-protected-domain', 'outside-protected-control']) {
  const path = join(root, prefix + 'virtual-consumer.ts');
  const body = intro + (visibility === 'outside-protected-control' ? '\nOwned._getErrorPredicate(Owned,{});\n' : '');
  const host = ts.createCompilerHost(options), actualRead = host.readFile.bind(host), actualExists = host.fileExists.bind(host);
  host.readFile = file => resolve(file) === path ? body : actualRead(file);
  host.fileExists = file => resolve(file) === path || actualExists(file);
  host.getSourceFile = (file, languageVersion) => {
    const text = host.readFile(file); return text === undefined ? undefined : ts.createSourceFile(file, text, languageVersion, true);
  };
  host.writeFile = () => assert.fail('Actual source compilation must not emit');
  const started = performance.now(), program = ts.createProgram([path, resolve(root, servicePath)], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({code: d.code,
    file: d.file ? relative(root, d.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}));
  if (visibility === 'historical-protected-domain') assert.deepEqual(diagnostics, [], JSON.stringify(diagnostics));
  else {
    assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics)); assert.equal(diagnostics[0].code, 2445);
    assert.equal(diagnostics[0].file, relative(root, path));
  }
  for (const source of program.getSourceFiles()) if (resolve(source.fileName) !== path)
    assert.equal(readBound(source.fileName).toString(), source.text);
  compilerCells.push({visibility, actual_owned_files: [errorPath, servicePath], consumer: body,
    seconds: (performance.now() - started) / 1000, diagnostics});
}
const emittedError = ts.transpileModule(readBound(errorPath).toString(), {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
}}).outputText;
assert.doesNotMatch(emittedError, /@angular\/material\/form-field\/testing/);
for (const specifier of ['@angular/compiler', '@angular/core', '@angular/material/snack-bar', 'rxjs'])
  readBound(fileURLToPath(import.meta.resolve(specifier)));
await import('@angular/compiler');
const {Injector} = await import('@angular/core');
const {MatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA} = await import('@angular/material/snack-bar');
const {Subject} = await import('rxjs');
function classReplay(text, name, dependencies) {
  const source = ts.createSourceFile('subject.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  const node = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === name); assert.ok(node);
  const result = ts.transform(node, [context => current => {
    const visit = n => ts.isDecorator(n) ? undefined : ts.visitEachChild(n, visit, context);
    return ts.visitNode(current, visit);
  }]);
  let textOnly;
  try {textOnly = ts.createPrinter({removeComments: true}).printNode(ts.EmitHint.Unspecified, result.transformed[0], source);}
  finally {result.dispose();}
  const js = ts.transpileModule(textOnly.replace(/^export /, ''), {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
  }}).outputText;
  return new Function(...Object.keys(dependencies), js + ';return ' + name)(...Object.values(dependencies));
}
const localText = readBound('projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref.ts').toString();
const LocalRef = classReplay(localText, 'MatSnackBarRef', {Subject});
assert.notEqual(LocalRef, PeerRef);
const actualService = readBound(servicePath).toString();
function injectors(text) {
  const Service = classReplay(text, '_MatSnackBarBase', {Injector, MatSnackBarRef: LocalRef,
    PeerMatSnackBarRef: PeerRef, MAT_SNACK_BAR_DATA});
  return [false, true].map(inherited => {
    const unrelated = {modern: true}, marker = {legacy: true}, data = {message: 'legacy'};
    const parent = Injector.create({providers: inherited ? [{provide: PeerRef, useValue: unrelated}] : []});
    const service = new Service(null, null, parent, null, null, {});
    const content = service._createInjector({data}, marker);
    try {
      assert.equal(content.get(LocalRef), marker); assert.equal(content.get(PeerRef, null), marker);
      assert.equal(content.get(MAT_SNACK_BAR_DATA), data);
      return {inherited_modern_ref: inherited, both_tokens_resolve_owned_ref: true, data_identity_retained: true};
    } finally {content.destroy(); parent.destroy();}
  });
}
const injectorCases = injectors(actualService);
const provider = '{provide: PeerMatSnackBarRef, useValue: snackBarRef},';
assert.equal(actualService.split(provider).length, 2);
assert.throws(() => injectors(actualService.replace(provider, '')), {name: 'AssertionError'});
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {schema_version: 1, line: '21.x', sha: worksheet.upstream_sha,
  baseline_commit: worksheet.baseline_commit, source_review: worksheet.source_review, applied,
  earlier_review_inputs_verified: old.source_bindings.length,
  changed_inputs_verified_against_frozen_baseline_Git: [...changed],
  API_exception_rows: {before: exception.before_rows, after: exception.after_rows, exact_obsolete_row_removed: true},
  compiler: ts.version, node: process.version, options, actual_source_compiler_cells: compilerCells,
  actual_protected_visibility_control_rejected: true, new_error_type_import_erased: true,
  actual_owned_service_public_injector_cases: injectorCases, missing_provider_control_rejected: true,
  prior_virtual_nav_menu_and_lifetime_probes_reexecuted: false,
  actual_nav_menu_sources_equal_independently_qualified_exact_tag_restorations: true,
  source_bindings: [...bound.values()], product_files_changed: 4, canonical_dispositions_changed: 0,
  main_port_complete: false, source_owner_reconciliation_complete: false, canonical_admission_ready: false,
  scope: 'Four exact previously qualified proposals applied;actual helper/service TS sources compiled and current service class body replayed with genuine public Injector/token values. Only consumer source is virtual for compilation;Angular decorators are removed for runtime class replay. Fields/parent services are protocols. No native Angular node,DOM propagation,layout,motion frames,packed,AOT,consumer build or full floors.',
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
writeFileSync(prefix + 'qualified.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({result: 'four-exact-historical-repairs-verified-on-21', actual_source_compiler_cells: 2,
  protected_visibility_control_rejected: true, actual_service_injector_cases: injectorCases.length,
  missing_provider_control_rejected: true, obsolete_API_exception_removed: true,
  source_owner_reconciliation_pending: true, main_port_pending: true, native_or_packed_qualified: false}));
