/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewSliderInputScope} from './upstream-slider-input-scope.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (p, value) => writeFileSync(join(root, p), JSON.stringify(value, null, 2) + '\n');
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root});
const worksheet = json('compatibility/rc/radio-identity-namespace-worksheet.json');
const proofPath = 'compatibility/rc/radio-identity-source-proof.json', proof = json(proofPath);
const diagnosticPath = 'compatibility/rc/radio-identity-constructor-diagnostic.json', diagnostic = json(diagnosticPath);
assert.equal(proof.line, worksheet.line);
assert.equal(diagnostic.source.candidate_sha256, hash(read(diagnostic.source.path)));
assert.ok(diagnostic.results.some(r => r.line === worksheet.line && r.variant === 'after' && r.failures.length === 0));
assert.equal(proof.source_parent, worksheet.source_parent);
assert.equal(proof.producer_sha256, hash(read('scripts/radio-identity-source-proof.mjs')));
assert.equal(diagnostic.producer_sha256, hash(read('tests/radio_identity_namespace_probe.mjs')));
assert.equal(diagnostic.worker_sha256, hash(read('tests/radio_identity_namespace_subject.mjs')));
assert.equal(diagnostic.results.filter(r => r.variant === 'after').length, 3); assert.equal(diagnostic.results.filter(r => r.variant !== 'after').length, 6);
const paths = ['closeout-fourteen-build-scope-review', 'closeout-test-consolidation-source-review',
  'closeout-three-slider-input-source-review'].map(n => 'compatibility/f10/disposition-ledger/evidence/' + n + '.json');
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json', ledger = json(ledgerPath);
const reports = paths.map(path => {
  const bytes = read(path); assert.deepEqual(bytes, git(['show', worksheet.source_parent + ':' + path]));
  return {path, sha256: hash(bytes), body: JSON.parse(bytes)};
});
const prior = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  reports: reports.map(({body, ...ref}) => ref), entries: ledger.entries.filter(e => paths.includes(e.evidence_report))};
assert.equal(prior.entries.length, 49);
const priorPath = 'compatibility/rc/radio-identity-upstream-prior-contexts.json';
assert.ok(!existsSync(join(root, priorPath))); write(priorPath, prior);
const [build, consolidation, slider] = reports.map(r => r.body), before = build.candidate_context;
const tracked = git(['ls-files', 'projects/ngx-material-legacy']).toString().trim().split('\n');
assert.deepEqual(tracked, before.tracked_product_paths);
for (const row of before.files) { const bytes = read(row.path); assert.equal(hash(bytes), row.sha256); assert.equal(bytes.length, row.bytes); }
const members = [...proof.changed.filter(r => r.path.startsWith('projects/ngx-material-legacy/')), ...proof.unchanged_product_members.map(r => ({...r, before_sha256:r.sha256, candidate_sha256:r.sha256}))];
assert.equal(members.length, before.product_members.length);
for (const row of before.product_members) {
  const proofRow = members.find(p => p.path === row.path); assert.ok(proofRow);
  assert.equal(row.sha256, proofRow.before_sha256); assert.equal(hash(read(row.path)), proofRow.candidate_sha256);
}
const changed = before.product_members.filter(row => hash(read(row.path)) !== row.sha256);
assert.deepEqual(changed.map(r => r.path).sort(), proof.changed.filter(r => r.path.startsWith('projects/ngx-material-legacy/')).map(r => r.path).sort()); assert.equal(changed.length, 1);
const context = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  changed: proof.changed, added: [], removed: [], build_inputs_unchanged: before.files.length,
  evidence: [proofPath, diagnosticPath].map(path => ({path, sha256: hash(read(path))})),
  scope: 'Two radio generated-name/ID literal suffix additions in exactly one product source file. Exact reversal recovers the previous complete source; every other product byte and all builder inputs are unchanged. Prior source-only applicability decisions and authenticated patch membership remain unchanged; no original lifecycle receipts are relabeled as current full component/native/AOT/packed/floor execution.'};
const bind = path => { const sha256 = hash(read(path));
  for (const entry of ledger.entries.filter(e => e.evidence_report === path)) {
    if (entry.source_check) entry.source_check.evidence_report_sha256 = sha256;
    else assert.equal(path, paths[2]);
  }
};
build.candidate_context = {...before, source_commit: worksheet.source_parent,
  source_tree: git(['rev-parse', worksheet.source_parent + '^{tree}']).toString().trim(),
  tracked_product_paths: tracked, tracked_product_paths_sha256: hash(Buffer.from(tracked.join('\n') + '\n')),
  product_members: tracked.map(path => {const bytes = read(path); return {path, sha256: hash(bytes), bytes: bytes.length};})};
build.context_updates = [...(build.context_updates || []), context]; write(paths[0], build); bind(paths[0]);
consolidation.candidate_context.sha256 = hash(read(paths[0]));
consolidation.context_updates = [...(consolidation.context_updates || []), context]; write(paths[1], consolidation); bind(paths[1]);
const fresh = reviewSliderInputScope(read, () => candidateProductSourcePaths(root), worksheet.line);
const strip = o => {const {product_source_population_sha256, ...rest} = o; return rest;};
assert.deepEqual(strip(fresh), strip(slider.source_scope)); slider.source_scope = fresh;
slider.source_context_requalification = context; write(paths[2], slider); bind(paths[2]); write(ledgerPath, ledger);
write('compatibility/rc/radio-identity-upstream-context-requalification.json', {...context,
  prior_contexts: {path: priorPath, sha256: hash(read(priorPath))},
  reviews: reports.map(r => ({path: r.path, sha_ids: r.body.reviews.map(v => v.sha)})),
  original_decisions_and_semantic_analyses_unchanged: true, upstream_rows: 49,
  sensitive_build_contexts: [
    {sha: 'b5d4de', finding: 'rulesAngular/compiler-cli patch/rootDir path unchanged; radio generated-name/ID suffix changes do not introduce a maintained Bazel/compiler patch path.'},
    {sha: 'ae9678', finding: 'All builder/configuration inputs unchanged. Every prior test byte is unchanged; no documentation generator or demo/localize path is introduced.'},
    {sha: '5d27e', finding: 'Radio identity literals have no relation to highlight.js require/default-import interop; exact builder and dependency inputs are unchanged.'},
    {sha: 'e500a8', finding: 'No Bazel macro/default-merge path changes; all eleven retained builder inputs are identical. Radio identity repair remains separately scoped by original/minimum actual constructor/selection comparison with explicit server/document/renderer protocols.'}
  ].map(item => ({...item, sha: build.reviews.find(row => row.sha.startsWith(item.sha)).sha})),
  producer_sha256: hash(read('scripts/requalify-radio-identity-upstream-contexts.mjs')),
  full_native_or_packed_qualified: false, g11_claim: 'not-passed'});
const radioReportPath='compatibility/f10/disposition-ledger/evidence/closeout-radio-touch-and-early-destroy-review.json';
assert.deepEqual(read(radioReportPath),git(['show',worksheet.source_parent+':'+radioReportPath]));
const radioReport=json(radioReportPath),source=proof.changed[0],individual=[];
for(const [sha,finding] of [
 ['e3abc65d7d191f2adf1c294bdb84f532d4eac05c','The entire _touch body and FocusMonitor blur caller are byte-identical after exact initializer reversal; callback-before-mark and its guard remain unchanged. The old OnPush rendering obligation remains pending.'],
 ['fd47a0e60dd9ab50d9f923713ca60a7fd21ccc16','The complete destroy-before-view/selection-cleanup and touch-target guard methods are byte-identical after exact initializer reversal. New actual owned construction/cleanup observations are separately bounded and do not reexecute the old seven-case lifecycle receipt.']]){
 const entry=ledger.entries.find(e=>e.sha===sha),review=radioReport.reviews.find(r=>r.sha===sha);assert.ok(entry&&review);assert.equal(entry.evidence_report,radioReportPath);assert.equal(entry.source_check.sha256,source.before_sha256);assert.equal(review.owned_source_sha256,source.before_sha256);
 const previous=structuredClone(entry.source_check);entry.source_check_history=[...(entry.source_check_history||[]),{source_check:previous,reason:'Exact two radio identity literal suffix additions; original lifecycle receipt remains unchanged.'}];
 entry.source_check={...previous,sha256:source.candidate_sha256,current_source_requalification:{path:proofPath,sha256:hash(read(proofPath))},original_executed_source_sha256:source.before_sha256};
 individual.push({sha,prior_source_check:previous,original_report:{path:radioReportPath,sha256:hash(read(radioReportPath))},original_diff_sha256:review.diff_sha256,source, finding,original_runtime_receipt_not_reexecuted:true});
}
write(ledgerPath,ledger);
write('compatibility/rc/radio-identity-individual-upstream-contexts.json',{schema_version:1,line:worksheet.line,source_parent:worksheet.source_parent,reviews:individual,evidence:[proofPath,diagnosticPath].map(path=>({path,sha256:hash(read(path))})),no_new_upstream_closures:true,g11_claim:'not-passed'});
console.log(JSON.stringify({line:worksheet.line,upstream_rows:49,individual_radio_contexts:2,changed_product_files:1,unchanged_build_inputs:before.files.length}));
