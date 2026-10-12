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
const worksheet = json('compatibility/rc/table-no-data-cell-worksheet.json');
const proofPath = 'compatibility/rc/table-no-data-cell-source-proof.json', proof = json(proofPath);
const diagnosticPath = 'compatibility/rc/table-no-data-cell-native-diagnostic.json', diagnostic = json(diagnosticPath);
assert.equal(proof.line, worksheet.line);
assert.equal(diagnostic.source.candidate_sha256, hash(read(diagnostic.source.path)));
assert.ok(diagnostic.results.some(r => r.line === worksheet.line && r.variant === 'after'));
assert.equal(proof.source_parent, worksheet.source_parent);
assert.equal(proof.producer_sha256, hash(read('scripts/table-no-data-cell-source-proof.mjs')));
assert.equal(diagnostic.producer_sha256, hash(read('tests/table_no_data_cell_probe.mjs')));
assert.equal(diagnostic.worker_sha256, hash(read('tests/table_no_data_cell_subject.mjs')));
assert.equal(diagnostic.results.filter(r => ['original', 'after'].includes(r.variant)).length, 3); assert.equal(diagnostic.controls.length, 6);
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
const priorPath = 'compatibility/rc/table-no-data-cell-upstream-prior-contexts.json';
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
assert.deepEqual(changed.map(r => r.path).sort(), proof.changed.filter(r => r.path.startsWith('projects/ngx-material-legacy/')).map(r => r.path).sort()); assert.equal(changed.length, 2);
const context = {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  changed: proof.changed, added: [], removed: [], build_inputs_unchanged: before.files.length,
  evidence: [proofPath, diagnosticPath].map(path => ({path, sha256: hash(read(path))})),
  scope: 'Two no-data cell configuration assignments, two strengthened historical assertions and an additive packed consumer predicate. Every other tracked product byte and all builder inputs are unchanged. Prior source-only upstream applicability decisions and authenticated patch membership remain unchanged; no full service/native/AOT/packed/runtime floor execution is reattributed.'};
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
write('compatibility/rc/table-no-data-cell-upstream-context-requalification.json', {...context,
  prior_contexts: {path: priorPath, sha256: hash(read(priorPath))},
  reviews: reports.map(r => ({path: r.path, sha_ids: r.body.reviews.map(v => v.sha)})),
  original_decisions_and_semantic_analyses_unchanged: true, upstream_rows: 49,
  sensitive_build_contexts: [
    {sha: 'b5d4de', finding: 'rulesAngular/compiler-cli patch/rootDir path unchanged; no-data cell configuration changes do not introduce a maintained Bazel/compiler patch path.'},
    {sha: 'ae9678', finding: 'All builder/configuration inputs unchanged. Strengthened assertions retain the entire prior test program; no documentation generator or demo/localize path is introduced.'},
    {sha: '5d27e', finding: 'No-data cell configuration has no relation to highlight.js require/default-import interop; exact builder and dependency inputs are unchanged.'},
    {sha: 'e500a8', finding: 'No Bazel macro/default-merge path changes; all eleven retained builder inputs are identical. No-data DOM repair remains separately scoped by original/minimum native DOM comparison.'}
  ].map(item => ({...item, sha: build.reviews.find(row => row.sha.startsWith(item.sha)).sha})),
  producer_sha256: hash(read('scripts/requalify-table-no-data-cell-upstream-contexts.mjs')),
  full_native_or_packed_qualified: false, g11_claim: 'not-passed'});
console.log(JSON.stringify({line: worksheet.line, upstream_rows: 49, changed_product_files: 2, unchanged_build_inputs: before.files.length}));
