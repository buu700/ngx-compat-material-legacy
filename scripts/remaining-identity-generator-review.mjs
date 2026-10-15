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
import {prepareRemainingIdentitySubjects} from './remaining-identity-public-subjects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (path, value) => {assert.ok(!existsSync(join(root, path))); writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');};
const worksheetPath = 'compatibility/rc/remaining-identity-generator-worksheet.json', worksheet = json(worksheetPath);
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json', ledger = json(ledgerPath);
const sourceProof = 'compatibility/rc/remaining-identity-source-proof.json', proof = json(sourceProof);
assert.equal(proof.line, worksheet.line); assert.equal(proof.source_parent, worksheet.source_parent);
for (const row of proof.changed) assert.equal(hash(read(row.path)), row.candidate_sha256);
const loaded = prepareRemainingIdentitySubjects(root), peerSources = [];
try {
  for (const model of loaded.models.filter(m => m.line !== 'original')) {
    const path = '@angular/cdk/fesm2022/_id-generator-chunk.mjs', text = model.sources.get(path);
    assert.equal(typeof text, 'string'); assert.ok(text.includes('class _IdGenerator'));
    peerSources.push({line: model.line, path, sha256: hash(text), bytes: Buffer.byteLength(text), actual_source: text,
      semantics: model.line === 'main' ? 'Actual main floor uses a module Map keyed by prefix, optional application-ID prefix and optional random infix; getId still ends in an incrementing decimal count.' : 'Actual 21.x floor uses a module object keyed by prefix, optional application-ID prefix and optional random infix; getId still ends in an incrementing decimal count.'});
  }
} finally {loaded.dispose();}
const subjects = [
  {sha: '938f478efdc96ef0de1217e806f98939beb027cd', files: ['src/cdk/a11y/id-generator.ts', 'src/cdk/a11y/public-api.ts', 'tools/public_api_guard/cdk/a11y.md'],
    analysis: 'All three original files were read: a root injectable takes APP_ID, keeps module counters per prefix and omits the default ng application ID; the root public barrel and API guard expose the underscore helper. Current exact main and 21.x implementations are retained separately, including their later optional random infix and differing counter storage. Peer ancestry shows the service exists, but owned historical counters do not invoke it or share its counters. Actual public peer component construction therefore does not inherit uniqueness for the separate owned defaults. The original inherited disposition lacked this caller proof and is reopened. Product code must not import this private underscore surface. A separately owned legacy ID suffix preserves manual construction and the historical global-counter model. Constructor uniqueness evidence is useful but cannot close the broader DOM/ARIA, application and reference contract review.'},
  {sha: 'ea0aed5a0cba3288d89e7448073e0a5556487313', files: ['src/material/menu/menu.ts'],
    analysis: 'The complete original menu hunk removes menuPanelUid, adds the underscore ID-generator import and changes panelId initialization to injected getId(mat-menu-panel-). No template, method or style changes occur in this patch. Owned menu retains its historical counter and constructor contract, while the actual current peer uses a separate service counter. Real constructor contexts reproduce a duplicate panel ID before the suffix repair in both creation orders at both floors. Counter retention therefore demonstrates the applicability risk rather than making the upstream change irrelevant. The legacy suffix separates the generated defaults while preserving the historical API and every template/style byte. Packed menu trigger aria-controls/expanded state and panel resolution, overlay lifecycle and explicit identities remain required; the old not-applicable decision is reopened rather than replaced by a constructor-only pass.'},
  {sha: '69968510fb0222ee565f57171640a99768efa972', files: ['src/material/snack-bar/snack-bar-container.ts'],
    analysis: 'The complete original snack-bar hunk removes uniqueId, adds the underscore ID-generator import and changes the live-element ID initialization to injected getId(mat-snack-bar-container-live-). This is the target referenced by the snack-bar live/description contract, not an irrelevant internal number. Owned historical and genuine current constructors use separate counters; both orders at both floors reproduce the same default live-element ID before repair. The suffix isolates that target while leaving all templates/styles and explicit content/config inputs unchanged. The old local-counter not-applicable reason is contradicted by actual construction and is reopened. Real packed aria-describedby resolution, announcement/lifecycle behavior and DOM uniqueness still need execution; constructor-only results are not an accessibility or runtime completion claim.'},
];
const reportPath = 'compatibility/f10/disposition-ledger/evidence/closeout-remaining-identity-generator-review.json';
const reviews = subjects.map(subject => {
  const entry = ledger.entries.find(e => e.sha === subject.sha); assert.ok(entry);
  assert.ok(worksheet.shas.includes(subject.sha));
  const bytes = execFileSync('git', ['-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=', '-c', 'gc.auto=0', '--git-dir=/home/parallels/.cache/angular-components.git', 'show', '--format=', subject.sha], {maxBuffer: 1024 * 1024});
  const patch = bytes.toString(), files = [...patch.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)].map(m => {assert.equal(m[1], m[2]); return m[1];});
  assert.deepEqual(files, subject.files);
  const path = 'compatibility/rc/remaining-identity-' + subject.sha + '.diff'; write(path, patch);
  return {...subject, line: worksheet.line, final_disposition: 'needs-individual-review', status: 'pending',
    original_patch: {path, sha256: hash(bytes), complete_files: files, all_hunks_read: true}, prior_entry: {...entry},
    required_remaining_evidence: ['Actual packed DOM/ARIA identities and target resolution in both peer generations and creation orders.', 'Review explicit/application-ID semantics and preserve historical constructor/input contracts; no private helper dependency.', 'Cross-link resulting packed assertions and branch-native execution before any final closure.']};
});
write(reportPath, {schema_version: 1, line: worksheet.line, status: 'pending', source_parent: worksheet.source_parent,
  worksheet: {path: worksheetPath, sha256: hash(read(worksheetPath))}, producer_sha256: hash(read('scripts/remaining-identity-generator-review.mjs')),
  source_proof: {path: sourceProof, sha256: hash(read(sourceProof))}, runtime_capsule: loaded.runtime_capsule,
  peer_sources: peerSources, reviews, native_or_packed_executed: false, new_SHA_closures: 0, g11_claim: 'not-passed'});
for (const review of reviews) {
  const entry = ledger.entries.find(e => e.sha === review.sha);
  entry.disposition_history = [...(entry.disposition_history || []), {recorded_at_utc: new Date().toISOString(), prior_entry: review.prior_entry,
    reason: 'Individual whole-patch/caller review and real constructor collisions disprove closure by peer ancestry or local-counter retention. Packed DOM/ARIA evidence remains pending.'}];
  entry.final_disposition = 'needs-individual-review'; entry.read_note_disposition = 'individually-reopened-pending-packed-identity';
  entry.reason = review.analysis; entry.files = review.files; entry.evidence_report = reportPath;
  entry.g11_claim = 'not-passed'; delete entry.source_check; delete entry.peer_floor; delete entry.batch_id;
}
writeFileSync(join(root, ledgerPath), JSON.stringify(ledger, null, 2) + '\n');
console.log(JSON.stringify({line: worksheet.line, individual_patches_read: reviews.length, newly_reopened: reviews.filter(r => r.prior_entry.final_disposition !== 'needs-individual-review').length, new_SHA_closures: 0, packed_execution_pending: true}));
