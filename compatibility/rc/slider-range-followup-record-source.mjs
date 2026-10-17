/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// New-only task recorder. No installers, runtime suites or remote operations.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {gzipSync, gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as review from '../../scripts/upstream-slider-range-followups.mjs';
import {candidateProductSourcePaths} from '../../scripts/upstream-candidate-source-evidence.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p)), encode = value => JSON.stringify(value, null, 2) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
const scope = review.reviewSliderRangeScope(read, () => candidateProductSourcePaths(root), line);
const {packet} = review.analyzeSliderRangeSubjects(read, line);
const prior = JSON.parse(read('compatibility/rc/slider-range-followup-prior.json'));
const reviews = packet.subjects.map((subject, index) => ({sha: subject.sha, status: 'reviewed',
  review_depth: 'individual-compatibility', affected_branches: [line], final_disposition: 'not-applicable',
  decision: review.SLIDER_RANGE_DECISIONS[index], diff_sha256: subject.diff_sha256,
  patch_file: 'compatibility/rc/slider-range-followup-' + subject.sha + '.original.patch',
  paths: subject.complete_changed_files.map(row => row.path), hunk_reviews: review.sliderRangeHunkReviews(subject),
  prior_entry: prior.entries[index], source_only: true, actual_native_packed_or_floor_qualified: false}));
const reportPath = 'compatibility/f10/disposition-ledger/evidence/closeout-slider-range-followup-source-review.json';
const body = {schema_version: 1, line, role: review.SLIDER_RANGE_ROLE, status: 'reviewed', source_parent: prior.source_parent,
  reviewer: 'Codex primary implementer; independent complete audit remains separate', scope_sha_ids: review.SLIDER_RANGE_SHAS,
  source_scope: scope, reviews, prior: {path: 'compatibility/rc/slider-range-followup-prior.json',
    sha256: hash(read('compatibility/rc/slider-range-followup-prior.json'))}, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
const writes = new Map([[reportPath, Buffer.from(encode(body))]]);
for (const [i, subject] of packet.subjects.entries()) writes.set(reviews[i].patch_file, Buffer.from(subject.diff));
const entries = reviews.map((row, index) => {
  const next = {...prior.entries[index], files: row.paths, diff_sha256: row.diff_sha256, final_disposition: 'not-applicable', reason: row.decision,
    evidence_report: reportPath, read_note_disposition: 'individually-source-reviewed-on-' + line, affected_branches: [line],
    individual_proof: {proof_kind: review.SLIDER_RANGE_KIND, diff_sha256: row.diff_sha256,
      review_depth: 'individual-compatibility', affected_branches: [line], decision: row.decision},
    source_check: {evidence_report_sha256: hash(writes.get(reportPath)), review_membership: row.sha}};
  delete next.batch_id; return next;
});
for (const entry of entries) assert.equal(review.sliderRangeEvidenceOk(body, entry, p => writes.get(p) || read(p), () => candidateProductSourcePaths(root), line), true, entry.sha);
const native = await review.qualifySliderRangeNativeContext({root, read}); writes.set(native.path, Buffer.from(encode(native.body)));
// Keep the existing per-SHA document interface for the native source probes.
// The complete grouped context remains a retained source-qualification record.
for (const [index, entry] of native.entries.entries()) {
  const document = structuredClone(native.body.reviews[index]);
  entry.evidence_report = 'compatibility/f10/disposition-ledger/evidence/closeout-slider-range-followup-native-' + entry.sha + '.json';
  document.slider_range_followup_native_context_materialization = {group: {path: native.path,
    sha256: hash(writes.get(native.path))}, individual_document_interface_preserved: true};
  writes.set(entry.evidence_report, Buffer.from(encode(document)));
}
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json', ledger = JSON.parse(read(ledgerPath));
const updates = new Map([...entries, ...native.entries].map(row => [row.sha, row])); assert.equal(updates.size, 19);
const oldNative = JSON.parse(gunzipSync(read('compatibility/rc/slider-range-followup-native-prior.json.gz'))).rows;
for (const old of [...prior.entries, ...oldNative.map(row => row.entry)]) assert.deepEqual(ledger.entries.find(row => row.sha === old.sha), old);
const next = {...ledger, entries: ledger.entries.map(row => updates.get(row.sha) || row)};
assert.deepEqual(next.entries.filter(row => !updates.has(row.sha)), ledger.entries.filter(row => !updates.has(row.sha)));
writes.set(ledgerPath, Buffer.from(encode(next)));
const diagnostic = {schema_version: 1, line, source_parent: prior.source_parent, node: process.version,
  compiler: createRequire(import.meta.url)('typescript').version, source_scope: scope, native_transitions: native.transitions,
  native_scopes_unchanged: 6, native_source_bindings_requalified: 15, native_scopes_still_require_run: 21,
  original_files: 9, original_hunks: 15, individual_source_decisions: 4, other1678_entries_unchanged: true,
  new_authored_use_closures: 0, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
writes.set('compatibility/rc/slider-range-followup-source-diagnostic.json.gz', gzipSync(Buffer.from(encode(diagnostic))));
// Validate every target before the first write. The old ledger must be exactly
// the inspected task context; all other outputs are fresh, never overwritten.
for (const [p] of writes) if (p !== ledgerPath) assert.equal(fs.existsSync(path.join(root, p)), false, 'new-only output ' + p);
for (const [p, bytes] of writes) fs.writeFileSync(path.join(root, p), bytes);
console.log(JSON.stringify({line, compiler: diagnostic.compiler, original_files: 9, hunks: 15,
  individual_source_decisions: 4, tagged_owned_methods: 16, native_bindings_requalified: 15, native_run_still_required: 21}));
