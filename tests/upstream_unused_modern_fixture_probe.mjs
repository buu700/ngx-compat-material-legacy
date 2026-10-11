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
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readTestImportSubjects, testImportBatchOk} from '../scripts/upstream-test-import-cleanup-evidence.mjs';
import {UNUSED_FIXTURE_PROFILES, UNUSED_FIXTURE_ORIGINALS, unusedModernFixtureScope} from '../scripts/upstream-unused-modern-fixture-scope.mjs';
const ts = createRequire(import.meta.url)('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = p => readFileSync(resolve(root, p));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = 'compatibility/f10/disposition-ledger/evidence/closeout-thirty-one-test-import-source-review.json';
const body = JSON.parse(read(evidence)), subjects = readTestImportSubjects(read), scopes = [];
assert.ok(testImportBatchOk(body, read, body.line));
for (const sha of Object.keys(UNUSED_FIXTURE_PROFILES)) {
  const subject = subjects.find(s => s.sha === sha), scope = unusedModernFixtureScope(sha, subject, read, body.line);
  assert.deepEqual(body.reviews.find(r => r.sha === sha).individual_retained_test_source_review, scope); scopes.push(scope);
}
assert.equal(scopes.reduce((n, s) => n + s.retained.reduce((n, r) => n + r.original_create_calls.length, 0), 0), 5);
const negative = [], spinner = subjects.find(s => s.sha.startsWith('195260')), toggle = subjects.find(s => s.sha.startsWith('a2a960'));
const reject = (id, subject = spinner, readMember = read, line = body.line) => {
  assert.throws(() => unusedModernFixtureScope(subject.sha, subject, readMember, line), undefined, id); negative.push({id, rejected: true});
};
const change = (text, from, to) => {assert.ok(text.includes(from), from); return text.replace(from, to);};
const modern = (id, subject, mutate) => {const candidate = structuredClone(subject); mutate(candidate.members[0]); reject(id, candidate);};
modern('active-modern-spinner-fixture', spinner, m => {m.before.text += '\nTestBed.createComponent(IndeterminateSpinnerInShadowDom);';});
modern('active-modern-label-fixture', toggle, m => {m.before.text += '\nTestBed.createComponent(SlideToggleProjectedLabel);';});
modern('static-fixture-initializer', spinner, m => {m.before.text = change(m.before.text, 'class IndeterminateSpinnerInShadowDom {', 'class IndeterminateSpinnerInShadowDom { static effect = runEffect();');});
modern('fixture-constructor', spinner, m => {m.before.text = change(m.before.text, 'class IndeterminateSpinnerInShadowDom {', 'class IndeterminateSpinnerInShadowDom { constructor() {}');});
modern('fixture-provider', spinner, m => {m.before.text = change(m.before.text, 'encapsulation: ViewEncapsulation.ShadowDom,', 'encapsulation: ViewEncapsulation.ShadowDom, providers: [Effect],');});
modern('effectful-fixture-import', spinner, m => {m.before.text = change(m.before.text, 'imports: [MatProgressSpinnerModule],\n})\nclass IndeterminateSpinnerInShadowDom', 'imports: [MatProgressSpinnerModule.forRoot()],\n})\nclass IndeterminateSpinnerInShadowDom');});
modern('effectful-property-decorator', spinner, m => {m.before.text = change(m.before.text, '@ViewChild(MatProgressSpinner, {read: ElementRef})', '@OtherDecorator(MatProgressSpinner)');});
modern('remaining-template-selector-edge', toggle, m => {m.before.text += "\nconst otherTemplate='<some-text></some-text>';";m.after.text += "\nconst otherTemplate='<some-text></some-text>';";});
modern('changed-remaining-test', spinner, m => {m.after.text = change(m.after.text, "it('", "it('changed ");});
const incomplete = structuredClone(spinner); incomplete.members.pop(); reject('missing-harness-hunk', incomplete);
const wrongSha = structuredClone(spinner); wrongSha.sha = '0'.repeat(40); reject('wrong-SHA', wrongSha);
reject('wrong-line', spinner, read, body.line === 'main' ? '21.x' : 'main');
reject('changed-tagged-reference', spinner, p => p === UNUSED_FIXTURE_ORIGINALS ? Buffer.concat([read(p), Buffer.from('x')]) : read(p));
const modifyOwned = (path, name, from, to) => p => {
  if (p !== path) return read(p);
  const text = read(p).toString(), file = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true);
  const cls = file.statements.find(n => ts.isClassDeclaration(n) && n.name.text === name); assert.ok(cls);
  const start = cls.getStart(file), end = cls.end;
  return Buffer.from(text.slice(0, start) + change(text.slice(start, end), from, to) + text.slice(end));
};
const spinnerPath = 'projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner.spec.ts';
const togglePath = 'projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.spec.ts';
reject('changed-historical-shadow-template', spinner, modifyOwned(spinnerPath, 'IndeterminateSpinnerInShadowDom', '<mat-progress-spinner', '<changed-spinner'));
reject('changed-historical-encapsulation', spinner, modifyOwned(spinnerPath, 'IndeterminateSpinnerInShadowDom', 'ViewEncapsulation.ShadowDom', 'ViewEncapsulation.None'));
reject('changed-projection-child-selector', toggle, modifyOwned(togglePath, 'TextBindingComponent', "'some-text'", "'other-text'"));
reject('lost-historical-shadow-call', spinner, p => p !== spinnerPath ? read(p) : Buffer.from(change(read(p).toString(), 'TestBed.createComponent(IndeterminateSpinnerInShadowDom)', 'TestBed.createComponent(OtherFixture)')));
reject('lost-historical-label-call', toggle, p => p !== togglePath ? read(p) : Buffer.from(change(read(p).toString(), 'TestBed.createComponent(SlideToggleProjectedLabel)', 'TestBed.createComponent(OtherFixture)')));
for (const [id, reader] of [
  ['warm-cache-still-checks-current-template', modifyOwned(spinnerPath, 'IndeterminateSpinnerInShadowDom', '<mat-progress-spinner', '<changed-spinner')],
  ['warm-cache-still-checks-current-calls', p => p !== spinnerPath ? read(p) : Buffer.from(change(read(p).toString(), 'TestBed.createComponent(IndeterminateSpinnerInShadowDom)', 'TestBed.createComponent(OtherFixture)'))],
]) {
  assert.equal(testImportBatchOk(body, reader, body.line), false, id); negative.push({id, rejected: true});
}
for (const [id, alter] of [
  ['missing-individual-review', r => {delete r.individual_retained_test_source_review;}],
  ['changed-original-call-proof', r => {r.individual_retained_test_source_review.retained[0].original_create_calls = [];}],
  ['changed-individual-patch', r => {r.diff += '\nchanged';}],
]) {
  const candidate = structuredClone(body); alter(candidate.reviews.find(r => r.sha === spinner.sha));
  assert.equal(testImportBatchOk(candidate, read, body.line), false, id); negative.push({id, rejected: true});
}
const inputs = [evidence, UNUSED_FIXTURE_ORIGINALS, 'scripts/upstream-unused-modern-fixture-scope.mjs',
  'scripts/upstream-test-import-cleanup-evidence.mjs', 'tests/upstream_unused_modern_fixture_probe.mjs'];
const report = {schema_version: 1, line: body.line, role: 'Three individual excluded modern fixture removals with original legacy coverage retained',
  node: process.version, individual_SHAs: 3, complete_changed_files: 7, unused_modern_fixtures: 6,
  retained_direct_historical_create_calls: 5, negative_controls: negative, scopes,
  inputs: inputs.map(path => ({path, sha256: hash(read(path))})), native_shadow_DOM_projection_or_packed_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, negative_controls: negative.length, scopes: undefined, inputs: undefined}));
