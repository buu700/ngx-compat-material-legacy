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
import {analyzeTestImportCleanup} from '../scripts/upstream-test-import-cleanup-analysis.mjs';
import {TEST_IMPORT_CAPSULE, readTestImportSubjects, analyzeTestImportSubjects,
  testImportBatchOk, testImportEntryOk} from '../scripts/upstream-test-import-cleanup-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = x => createHash('sha256').update(x).digest('hex');
const evidence = 'compatibility/f10/disposition-ledger/evidence/closeout-thirty-one-test-import-source-review.json';
const body = JSON.parse(read(evidence)), ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const subjects = readTestImportSubjects(read), analysis = analyzeTestImportSubjects(read);
assert.ok(testImportBatchOk(body, read, body.line));
for (const review of body.reviews) assert.ok(testImportEntryOk(body, ledger.entries.find(e => e.sha === review.sha), read, true));
assert.equal(analysis.filter(r => r.accepted).length, 22);
assert.equal(analysis.filter(r => !r.accepted).length, 9);
const negative = [];
const subject = subjects.find(s => s.sha === '08c5e85f9b399c06e1273dad8c28b785bf4290c8');
const member = subject.members.find(m => m.path.startsWith('src/material/'));
const append = text => [member.before.text + '\n' + text, member.after.text + '\n' + text];
const sourceReject = (id, before, after) => {
  assert.throws(() => analyzeTestImportCleanup(member.path, before, after), undefined, id);
  negative.push({id, rejected: true});
};
const change = (text, from, to) => {assert.ok(text.includes(from)); return text.replace(from, to);};
sourceReject('changed-assertion-title', member.before.text, change(member.after.text, "it('", "it('changed "));
sourceReject('changed-fixture-action', member.before.text, change(member.after.text, 'fixture.detectChanges()', 'fixture.destroy()'));
for (const [id, beforeCode, afterCode] of [
  ['changed-provider-value', "TestBed.configureTestingModule({providers:[{provide:'boundary',useValue:1}]});", "TestBed.configureTestingModule({providers:[{provide:'boundary',useValue:2}]});"],
  ['removed-provider', "TestBed.configureTestingModule({providers:[{provide:'boundary',useValue:1}]});", ''],
  ['changed-callback-scheduling', 'beforeEach(fakeAsync(()=>{const boundary=1;}));', 'beforeEach(waitForAsync(()=>{const boundary=1;}));'],
  ['changed-prefix-operator', 'let boundary=1; ++boundary;', 'let boundary=1; --boundary;'],
  ['changed-declaration-kind', 'const boundary=1;', 'let boundary=1;'],
  ['array-elision-is-not-trailing-comma', 'const boundary=[1,,];', 'const boundary=[1];'],
  ['changed-fixture-template', "const boundary='<div class=\"original\"></div>';", "const boundary='<div class=\"changed\"></div>';"],
]) sourceReject(id, member.before.text + '\n' + beforeCode, member.after.text + '\n' + afterCode);
sourceReject('added-import-route', member.before.text, "import {Thing} from './new-route';\n" + member.after.text);
sourceReject('side-effect-import', member.before.text, "import './side-effect';\n" + member.after.text);
sourceReject('added-test-imports', member.before.text, member.after.text + '\nTestBed.configureTestingModule({imports:[Boundary]});');
sourceReject('nontrivial-test-imports', member.before.text + '\nTestBed.configureTestingModule({imports:[Boundary.forRoot()]});', member.after.text);
const [usedBefore, usedAfter] = append('boundary();');
sourceReject('removed-binding-still-used', "import {boundary} from './boundary';\n" + usedBefore, usedAfter);
sourceReject('changed-import-route', member.before.text, member.after.text.replace(/from (['"])[^'"]+\1/, "from './changed-route'"));
const evidenceReject = (id, mutate, readMember = read, line = body.line) => {
  const candidate = structuredClone(body); mutate(candidate);
  assert.equal(testImportBatchOk(candidate, readMember, line), false, id);
  negative.push({id, rejected: true});
};
evidenceReject('wrong-line', () => {}, read, body.line === 'main' ? '21.x' : 'main');
evidenceReject('missing-SHA', b => b.reviews.pop());
evidenceReject('duplicate-SHA', b => {b.reviews[1] = b.reviews[0];});
evidenceReject('missing-recovered-example', b => {const r = b.reviews.find(r => r.source_analysis.recovered_seed_paths.length); r.paths = r.paths.filter(p => !r.source_analysis.recovered_seed_paths.includes(p));});
evidenceReject('wrong-patch-hash', b => {b.reviews[0].diff_sha256 = '0'.repeat(64);});
evidenceReject('broadened-residual', b => {
  const row = b.reviews.find(r => !r.source_analysis.accepted);
  delete row.individual_setup_source_review;
  delete row.individual_retained_test_source_review;
  row.final_disposition = 'not-applicable';
});
evidenceReject('wrong-branch', b => {b.reviews[0].affected_branches = ['main'];});
evidenceReject('changed-token-proof', b => {b.reviews.find(r => r.source_analysis.accepted).source_analysis.members[0].unchanged_test_program_sha256 = '0'.repeat(64);});
evidenceReject('changed-original-capsule', () => {}, p => p === TEST_IMPORT_CAPSULE ? Buffer.concat([read(p), Buffer.from('x')]) : read(p));
evidenceReject('removed-product-spec-exclusion', () => {}, p => {
  if (p !== 'projects/ngx-material-legacy/tsconfig.lib.json') return read(p);
  const config = JSON.parse(read(p)); config.exclude = []; return Buffer.from(JSON.stringify(config));
});
evidenceReject('lost-historical-suite', () => {}, p => {
  if (p !== 'testing/legacy-runner/historical-specs.json') return read(p);
  return Buffer.from(JSON.stringify(JSON.parse(read(p)).slice(1)));
});
for (const [id, alter] of [
  ['row-disposition-drift', r => {r.final_disposition = 'inherited';}],
  ['row-reason-drift', r => {r.reason = 'unrelated assertion';}],
  ['row-path-loss', r => {r.files = [];}],
  ['row-evidence-hash-drift', r => {r.source_check.evidence_report_sha256 = '0'.repeat(64);}],
]) {
  const row = structuredClone(ledger.entries.find(r => r.sha === body.reviews[0].sha)); alter(row);
  assert.equal(testImportEntryOk(body, row, read, true), false, id); negative.push({id, rejected: true});
}
const inputs = [evidence, TEST_IMPORT_CAPSULE, 'scripts/upstream-test-import-cleanup-analysis.mjs',
  'scripts/upstream-test-import-cleanup-evidence.mjs', 'tests/upstream_test_import_cleanup_probe.mjs'];
const report = {schema_version: 1, line: body.line, role: 'Original31 complete-membership test import predicate diagnostics',
  node: process.version, subjects: 31, complete_changed_files: 79, qualified_SHAs: 22, qualified_changed_files: 52,
  residual_SHAs: 9, recovered_seed_paths: 4, negative_controls: negative, inputs: inputs.map(path => ({path, sha256: hash(read(path))})),
  residual_SHAs_scope: 'original import-only predicate; individual follow-up is separate',
  individual_fixture_reviews: body.reviews.filter(r => r.individual_retained_test_source_review).length,
  individual_setup_reviews: body.reviews.filter(r => r.individual_setup_source_review).length,
  pending_in_complete_group: body.reviews.filter(r => r.final_disposition === 'needs-individual-review').length,
  upstream_standalone_setup_or_product_runtime_executed: false, native_or_packed_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, negative_controls: negative.length, inputs: undefined}));
