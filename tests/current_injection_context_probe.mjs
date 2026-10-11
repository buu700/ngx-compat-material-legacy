/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {prepareCurrentInjectionContexts, reviewCurrentInjectionContexts} from '../scripts/current-injection-context-review.mjs';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), ts = createRequire(import.meta.url)('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
const read = p => readFileSync(join(root, p), 'utf8');
const model = prepareCurrentInjectionContexts({root}), review = reviewCurrentInjectionContexts({root, model});
const sourceControls = [];
const rejected = (id, path, before, after) => {
  assert.notEqual(after, before, id + ': unapplied source mutation');
  assert.throws(() => reviewCurrentInjectionContexts({root, model, readSource: p => p === path ? after : read(p)}), undefined, id);
  sourceControls.push({id, rejected: true});
};
for (const item of review.cases.filter(r => r.symbol === 'assertInInjectionContext')) {
  const path = 'projects/ngx-material-legacy/' + item.file, raw = read(path), expression = item.references[0].expression;
  rejected('missing-guard:' + item.file, path, raw, raw.replace(expression + ';', ''));
  rejected('wrong-debug-owner:' + item.file, path, raw, raw.replace(expression, 'assertInInjectionContext(() => {})'));
  if (item.manual_fallback !== 'strict DI-only boundary') {
    const before = item.manual_fallback === 'inContext = false;' ? item.manual_fallback : 'return ' + item.manual_fallback + ';';
    const after = item.manual_fallback === 'inContext = false;' ? 'inContext = true;' : 'return true;';
    rejected('changed-manual-fallback:' + item.file, path, raw, raw.replace(before, after));
  }
}
const ambientPath = 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts', ambient = read(ambientPath);
rejected('required-instead-of-optional-ambient', ambientPath, ambient, ambient.replace('inject(token, {optional: true})', 'inject(token)'));
rejected('numeric-inject-flags', ambientPath, ambient, ambient.replace('inject(token, {optional: true})', 'inject(token, 8)'));
rejected('shadowed-public-guard', ambientPath, ambient, ambient.replace('token: ProviderToken<T>', 'token: ProviderToken<T>, assertInInjectionContext: Function'));
const headerPath = 'projects/ngx-material-legacy/legacy-tabs/internal/after-tab-header-render.ts', header = read(headerPath);
rejected('wrong-captured-token', headerPath, header, header.replace('return inject(Injector)', 'return inject(ApplicationRef)'));
rejected('escaped-guard-reference', headerPath, header, header + '\nexport const escaped = assertInInjectionContext;\n');
const unrelated = 'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-location.ts', unrelatedRaw = read(unrelated);
rejected('changed-unreviewed-caller', unrelated, unrelatedRaw, unrelatedRaw + '\n// independent source change\n');
const aliased = header.replaceAll('assertInInjectionContext', 'guardContext').replace('guardContext,', 'assertInInjectionContext as guardContext,');
assert.notEqual(aliased, header);
assert.equal(reviewCurrentInjectionContexts({root, model, readSource: p => p === headerPath ? aliased : read(p)}).cases.length, 9);

const fixture = `import {assertInInjectionContext,inject,InjectionToken,Injector,NgZone,runInInjectionContext} from '@angular/core';
function guard() {assertInInjectionContext(guard);}
const token=new InjectionToken<{marker:string}>('scoped-value');
const root=Injector.create({providers:[{provide:token,useValue:{marker:'caller'}}]});
runInInjectionContext(root,()=>{guard();const value:{marker:string}=inject(token);const optional:{marker:string}|null=inject(token,{optional:true});const injector:Injector=inject(Injector);const zone:NgZone|null=inject(NgZone,{optional:true});void [value,optional,injector,zone];});
// @ts-expect-error The debug owner is a function or constructor, not a string.
assertInInjectionContext('owner');
// @ts-expect-error Optional has a Boolean domain.
inject(token,{optional:'true'});
// @ts-expect-error Optional injection may return null.
const required:{marker:string}=inject(token,{optional:true});
// @ts-expect-error The token's value type is not erased.
const wrong:number=inject(token);
`;
const worker = read('tests/current_injection_context_subject.mjs');
const declarations = [], typeChecks = [], results = [], runtimeControls = [];
const subjects = prepareMaterialPublicSubjects(root);
const preamble = `import * as core from '@angular/core';
const {assertInInjectionContext,inject,Injector,NgZone,ANIMATION_MODULE_TYPE,Inject,Optional}=core;
export const LEGACY_ANIMATIONS_TEST_OVERRIDE=new core.InjectionToken('owned-override-protocol');
const MATERIAL_ANIMATIONS=new core.InjectionToken('material-policy-protocol');
class MediaMatcher {}
export const counts={table:0};
class ContextParent {constructor(){counts.table++;}}
`;
const exportNames = Object.keys(review.snippets).filter(n => n !== 'getLegacyAnimationsState');
const bundleText = preamble + Object.values(review.snippets).join('\n') + '\nexport {' + exportNames.join(',') + '};\n';
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true}}).outputText;
try {
  for (const subject of subjects.models) {
    const fixturePath = join(subject.root, 'current-injection-context-types.mts'); writeFileSync(fixturePath, fixture);
    const options = {strict: true, noEmit: true, skipLibCheck: false, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext};
    const program = ts.createProgram([fixturePath], options), diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => subject.root, getNewLine: () => '\n'}));
    const source = program.getSourceFile(fixturePath), checker = program.getTypeChecker();
    const imports = source.statements[0].importClause.namedBindings.elements;
    for (const name of ['assertInInjectionContext', 'inject']) {
      const binding = imports.find(n => n.name.text === name), target = checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name));
      assert.ok(target.declarations.length > 0);
      for (const declaration of target.declarations) {
        assert.ok(ts.isFunctionDeclaration(declaration));
        const unstable = ts.getJSDocTags(declaration).filter(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text));
        if (unstable.length) {
          // Retain the complete historical namespace, including its deprecated
          // numeric-flags overload. No selected call may resolve to that overload.
          assert.equal(subject.line, 'original'); assert.equal(name, 'inject');
          assert.deepEqual(unstable.map(t => [t.tagName.text, t.comment]), [['deprecated', 'prefer an options object instead of `InjectFlags`']]);
          assert.equal(declaration.parameters[1].type.getText(declaration.getSourceFile()), 'InjectFlags');
        }
        const path = declaration.getSourceFile().fileName, key = '@angular/core/' + path.split('/node_modules/@angular/core/')[1];
        assert.ok(subject.sources.has(key), 'borrowed rather than authenticated Core declaration');
        declarations.push({line: subject.line, symbol: name, path: key, source_sha256: hash(subject.sources.get(key)), declaration: declaration.getText(declaration.getSourceFile()), deprecated_not_selected: unstable.length > 0});
      }
    }
    const selected = [];
    const visit = n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['assertInInjectionContext', 'inject'].includes(n.expression.text)) {
        let statement = n; while (statement.parent && !ts.isStatement(statement)) statement = statement.parent;
        if (!statement.getFullText().includes('@ts-expect-error')) {
          const signature = checker.getResolvedSignature(n); assert.ok(signature);
          assert.ok(!signature.getJsDocTags().some(t => t.name === 'deprecated'));
          selected.push(n.getText(source));
        }
      }
      ts.forEachChild(n, visit);
    }; visit(source); assert.equal(selected.length, 5);
    typeChecks.push({line: subject.line, strict: true, skipLibCheck: false, compiler: ts.version, diagnostics: 0, nondeprecated_selected_calls: selected, expected_negative_types: 4, fixture_sha256: hash(fixture)});
    const bundle = join(subject.root, 'current-injection-context-scopes.mjs'), workerPath = join(subject.root, 'current-injection-context-subject.mjs');
    writeFileSync(bundle, emit(bundleText)); writeFileSync(workerPath, worker);
    for (const mode of ['development', 'production']) {
      const stdout = execFileSync(process.execPath, [workerPath, subject.line, mode, pathToFileURL(bundle).href], {cwd: subject.root, encoding: 'utf8', timeout: 10000});
      results.push({...JSON.parse(stdout.trim().split('\n').at(-1)), borrowed: subject.borrowed, emitted_scope_sha256: hash(emit(bundleText))});
    }
    for (const [id, text] of [
      ['public-guard-becomes-noop', bundleText.replace('assertInInjectionContext,', '').replace('export const LEGACY_', 'const assertInInjectionContext=()=>{};\nexport const LEGACY_')],
      ['optional-ambient-becomes-required', bundleText.replace('inject(token, { optional: true })', 'inject(token)')],
      ['capture-wrong-current-injector', bundleText.replace('return inject(Injector);', 'return inject(NgZone, {optional:true});')],
      ['swallow-ambient-provider-error', bundleText.replace(/function ambientService<T>\(token: ProviderToken<T>\): T \| null \{[\s\S]*?\n\}/, 'function ambientService<T>(token: ProviderToken<T>): T | null {try {assertInInjectionContext(ambientService);return inject(token,{optional:true});}catch {return null;}}')],
    ]) {
      assert.notEqual(text, bundleText, id + ': unapplied runtime control'); writeFileSync(bundle, emit(text));
      const result = spawnSync(process.execPath, [workerPath, subject.line, 'production', pathToFileURL(bundle).href], {cwd: subject.root, encoding: 'utf8', timeout: 10000});
      assert.notEqual(result.status, 0, id + ': mutation escaped');
      assert.match(result.stderr, /AssertionError|NG0203|NG0201|NullInjectorError: No provider for InjectionToken missing-ambient|injection context/, id + ': did not reach scope assertions');
      runtimeControls.push({line: subject.line, id, rejected: true});
    }
    writeFileSync(bundle, emit(bundleText));
  }
  const report = {schema_version: 1, line: review.line, role: 'Nine current public DI import boundaries; actual owned guard scopes against genuine original and minimum Core namespaces',
    node: process.version, compiler: ts.version, source_review: review, public_namespace_capsule_sha256: subjects.capsule_hash,
    declarations, typeChecks, results, source_negative_controls: sourceControls, alias_positive_controls: 1, runtime_controls: runtimeControls,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(worker), source_checker_sha256: hash(read('scripts/current-injection-context-review.mjs')),
    limits: ['Selected actual constructor/helper scopes execute, not complete decorated components. Parent construction, motion policy tokens, NgZone/services and values are explicit protocols; genuine complete Core/Compiler runtime and declarations are authenticated.',
      'Two ambient inject imports are bound to their real token expressions and optional/required public overloads. Three other current inject imports remain pending; the existing tab-body inject import is not a new closure.',
      'No automatic node/application/root graphs, real peer parent execution, templates/styles, motion lifecycle, packed/AOT/native, Cyph build, full Node/RxJS/compiler floors or complete G02/G11 qualification.'], g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({current_uses: 9, guarded_scopes: 7, namespaces: 3, development_production_contexts: results.length, cases: results.reduce((n, r) => n + r.cases.length, 0), strict_subjects: typeChecks.length, negative_types_per_subject: 4, source_negative_controls: sourceControls.length, runtime_control_rejections: runtimeControls.length, full_product_qualification: false}));
} finally {subjects.dispose();}
