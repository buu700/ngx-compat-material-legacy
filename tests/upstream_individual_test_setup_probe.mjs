/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTestImportSubjects, testImportBatchOk} from '../scripts/upstream-test-import-cleanup-evidence.mjs';
import {TEST_SETUP_PROFILES, TEST_SETUP_PEERS, individualTestSetupScope, analyzeIndividualTestSetup} from '../scripts/upstream-individual-test-setup-scope.mjs';
import {analyzeExplicitTestEdits} from '../scripts/upstream-test-import-cleanup-analysis.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(resolve(root, p)), hash = b => createHash('sha256').update(b).digest('hex');
const evidence = 'compatibility/f10/disposition-ledger/evidence/closeout-thirty-one-test-import-source-review.json';
const body = JSON.parse(read(evidence)), subjects = readTestImportSubjects(read), scopes = [];
assert.ok(testImportBatchOk(body, read, body.line));
for (const sha of Object.keys(TEST_SETUP_PROFILES)) {
  const subject = subjects.find(s => s.sha === sha), scope = individualTestSetupScope(sha, subject, read, body.line);
  assert.deepEqual(body.reviews.find(r => r.sha === sha).individual_setup_source_review, scope); scopes.push(scope);
}
const byKind = kind => subjects.find(s => TEST_SETUP_PROFILES[s.sha]?.kind === kind);
const negative = [], replace = (text, from, to) => {assert.ok(text.includes(from), from); return text.replace(from, to);};
const sourceReject = (id, kind, mutate) => {
  const candidate = structuredClone(byKind(kind)); mutate(candidate);
  assert.throws(() => analyzeIndividualTestSetup(candidate.sha, candidate), undefined, id); negative.push({id, rejected: true});
};
sourceReject('aria-provider-argument', 'aria-root-provider', s => {s.members[0].before.text += '\ncreateFixture([OtherProvider]);';});
sourceReject('aria-changed-provider', 'aria-root-provider', s => {s.members[0].before.text = replace(s.members[0].before.text, 'providers: [AriaDescriber, ...providers]', 'providers: [OtherService, ...providers]');});
sourceReject('aria-helper-effect', 'aria-root-provider', s => {s.members[0].before.text = replace(s.members[0].before.text, 'function createFixture(providers: Provider[] = []) {', 'function createFixture(providers: Provider[] = []) { runEffect();');});
sourceReject('scrolling-scheduling-change', 'scrolling-fixture-scheduling', s => {s.members[0].after.text = replace(s.members[0].after.text, 'beforeEach(() => {', 'beforeEach(fakeAsync(() => {').replace('scroll = TestBed.inject(ScrollDispatcher);\n  });', 'scroll = TestBed.inject(ScrollDispatcher);\n  }));');});
sourceReject('scrolling-zone-provider-loss', 'scrolling-fixture-scheduling', s => {s.members[1].after.text = replace(s.members[1].after.text, 'providers: [provideZoneChangeDetection()]', 'providers: []');});
sourceReject('scrolling-wrong-child-import', 'scrolling-fixture-scheduling', s => {s.members[3].after.text = replace(s.members[3].after.text, 'imports: [InjectsViewContainer, ScrollingModule]', 'imports: [OtherChild, ScrollingModule]');});
sourceReject('icon-sanitizer-change', 'icon-retained-setup', s => {s.members[0].after.text = replace(s.members[0].after.text, 'sanitizer.bypassSecurityTrustHtml(', 'sanitizer.otherTrustFunction(');});
sourceReject('icon-HTTP-provider-change', 'icon-retained-setup', s => {s.members[1].after.text = replace(s.members[1].after.text, 'provideHttpClientTesting()', 'otherHttpClient()');});
sourceReject('checkbox-helper-effect', 'checkbox-helper-inlining', s => {s.members[0].before.text = replace(s.members[0].before.text, 'function createComponent<T>(componentType: Type<T>) {', 'function createComponent<T>(componentType: Type<T>) { runEffect();');});
sourceReject('checkbox-helper-extra-argument', 'checkbox-helper-inlining', s => {s.members[0].before.text = replace(s.members[0].before.text, 'createComponent(SingleCheckbox)', 'createComponent(SingleCheckbox, Other)');});
sourceReject('checkbox-noop-provider-change', 'checkbox-helper-inlining', s => {s.members[0].after.text = replace(s.members[0].after.text, "clickAction: 'noop'", "clickAction: 'check'");});
sourceReject('datepicker-new-module', 'datepicker-partial-imports', s => {s.members[1].after.text = replace(s.members[1].after.text, 'imports: [MatNativeDateModule, MatDatepickerModule]', 'imports: [OtherModule, MatDatepickerModule]');});
sourceReject('datepicker-date-filter-change', 'datepicker-partial-imports', s => {s.members[2].after.text = replace(s.members[2].after.text, "it('", "it('changed ");});
sourceReject('tab-motion-provider-change', 'tab-viewport-test-provider', s => {s.members[1].after.text = replace(s.members[1].after.text, 'animationsDisabled: true', 'animationsDisabled: false');});
sourceReject('tab-extra-viewport-provider', 'tab-viewport-test-provider', s => {s.members[2].before.text = replace(s.members[2].before.text, 'providers: [ViewportRuler]', 'providers: [ViewportRuler, Other]');});
const badReader = (path, from, to) => p => p === path ? Buffer.from(replace(read(p).toString(), from, to)) : read(p);
for (const [id, kind, reader] of [
  ['owned-checkbox-declarations-loss', 'checkbox-helper-inlining', badReader('projects/ngx-material-legacy/legacy-checkbox/checkbox.spec.ts', 'declarations: [componentType, ...extraDeclarations]', 'declarations: [componentType]')],
  ['owned-viewport-provider-loss', 'tab-viewport-test-provider', badReader('projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts', 'providers: [ViewportRuler]', 'providers: []')],
  ['changed-peer-capsule', 'aria-root-provider', p => p === TEST_SETUP_PEERS ? Buffer.concat([read(p), Buffer.from('x')]) : read(p)],
]) {
  const subject = byKind(kind); assert.throws(() => individualTestSetupScope(subject.sha, subject, reader, body.line), undefined, id); negative.push({id, rejected: true});
  assert.equal(testImportBatchOk(body, reader, body.line), false, id + '-admission');
}
const synthetic = 'const n=1; const text=`value:${n}`; const assertion=true;';
assert.ok(analyzeExplicitTestEdits('template.ts', synthetic, synthetic, []));
for (const [id, before, after] of [
  ['template-expression-operator', synthetic, synthetic.replace('${n}', '${n+1}')],
  ['statement-after-template', synthetic, synthetic.replace('assertion=true', 'assertion=false')],
  ['array-elision', 'const values=[1,,];', 'const values=[1];'],
  ['unary-operator', 'let n=1; ++n;', 'let n=1; --n;'],
]) {assert.throws(() => analyzeExplicitTestEdits('mutation.ts', before, after, []), undefined, id);negative.push({id, rejected: true});}
for (const [id, alter] of [
  ['missing-individual-setup-proof', r => {delete r.individual_setup_source_review;}],
  ['changed-setup-program-hash', r => {r.individual_setup_source_review.source_operations[0].source.unchanged_remaining_test_program_sha256 = '0'.repeat(64);}],
  ['forged-provider-declaration-kind', r => {r.individual_setup_source_review.minimum_peer_boundary.aria_provider_declaration_source.declaration_kind = 'root-same-on-both';}],
  ['wrong-peer-member-population', r => {r.individual_setup_source_review.minimum_peer_boundary.packages[0].published_members--; }],
]) {const candidate = structuredClone(body); alter(candidate.reviews.find(r => r.individual_setup_source_review));assert.equal(testImportBatchOk(candidate, read, body.line), false, id);negative.push({id, rejected: true});}
const inputs = [evidence, TEST_SETUP_PEERS, 'scripts/upstream-individual-test-setup-scope.mjs', 'scripts/upstream-test-import-cleanup-analysis.mjs', 'scripts/upstream-test-import-cleanup-evidence.mjs', 'tests/upstream_individual_test_setup_probe.mjs'];
const report = {schema_version: 1, line: body.line, role: 'Six individual excluded test setup reviews with explicit provider/scheduling/helper operations', node: process.version,
  individual_SHAs: 6, complete_changed_files: 20, checkbox_helper_calls: 27, callback_wrappers: 3, negative_controls: negative, scopes,
  minimum_CDK_Material_versions: scopes[0].minimum_peer_boundary.packages.map(p => ({name: p.name, version: p.version})),
  inputs: inputs.map(path => ({path, sha256: hash(read(path))})), native_peer_setup_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, negative_controls: negative.length, scopes: undefined, inputs: undefined}));
