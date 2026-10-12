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
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (p, value) => writeFileSync(join(root, p), JSON.stringify(value, null, 2) + '\n');
const worksheetPath = 'compatibility/rc/table-no-data-cell-worksheet.json', worksheet = json(worksheetPath);
const proofPath = 'compatibility/rc/table-no-data-cell-source-proof.json', proof = json(proofPath);
const nativePath = 'compatibility/rc/table-no-data-cell-native-diagnostic.json', native = json(nativePath);
assert.equal(proof.line, worksheet.line); assert.equal(proof.source_parent, worksheet.source_parent);
assert.equal(proof.producer_sha256, hash(read('scripts/table-no-data-cell-source-proof.mjs')));
assert.equal(native.producer_sha256, hash(read('tests/table_no_data_cell_probe.mjs')));
assert.equal(native.worker_sha256, hash(read('tests/table_no_data_cell_subject.mjs')));
assert.equal(native.source.candidate_sha256, hash(read(native.source.path)));
assert.equal(native.helper.sha256, hash(read(native.helper.path)));
assert.equal(native.types.length, 2); assert.equal(native.controls.length, 6);
assert.equal(native.results.filter(r => ['original', 'after'].includes(r.variant)).length, 3);
assert.equal(proof.unchanged_styles, 409); assert.equal(proof.unchanged_templates, 30);
const changed = new Map(proof.changed.map(r => [r.path, r]));
for (const row of proof.changed) assert.equal(hash(read(row.path)), row.candidate_sha256);
for (const row of proof.unchanged_product_members) assert.equal(hash(read(row.path)), row.sha256);
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json', currentPath = 'compatibility/f10/authored-dependency-current-dispositions.json';
const frozen = json(frozenPath), current = json(currentPath), rows = [...frozen.symbol_uses, ...current.symbol_uses];
const failures = [...authoredUseReviewEvidence(frozen, worksheet.line, read, hash).insufficient_uses,
  ...authoredUseReviewEvidence(current, worksheet.line, read, hash).insufficient_uses];
assert.equal(failures.length, 17);
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const evidence = [proofPath, nativePath, worksheetPath, 'scripts/table-no-data-cell-source-proof.mjs',
  'tests/table_no_data_cell_probe.mjs', 'tests/table_no_data_cell_subject.mjs'].map(path => ({path, sha256: hash(read(path))}));
const priorContexts = [], reviews = [];
for (const failed of failures) {
  const row = rows.find(r => key(r) === key(failed)); assert.ok(row);
  const bytes = read(row.source_review.path); assert.equal(hash(bytes), row.source_review.sha256);
  const prior = JSON.parse(bytes).reviews.find(r => key(r) === key(row)); assert.ok(prior);
  const sourcePath = 'projects/ngx-material-legacy/' + row.file, scope = changed.get(sourcePath);
  assert.equal(prior.candidate_source_sha256, scope ? scope.before_sha256 : hash(read(sourcePath)));
  const refs = prior.independent_evidence.map(ref => {
    const actual = hash(read(ref.path)); if (actual === ref.sha256) return ref;
    const delta = changed.get(ref.path); assert.ok(delta, 'unrelated evidence changed: ' + ref.path);
    assert.equal(ref.sha256, delta.before_sha256); return {...ref, sha256: actual};
  });
  priorContexts.push({file: row.file, module: row.module, symbol: row.symbol,
    prior_source_review: row.source_review, prior_review: prior});
  const reason = row.file === 'legacy-table/row.ts' ?
    ' Scoped current-source requalification: the only product edit adds two public no-data cell settings and explanatory comments after the same borrowed parent construction. All class/component/parameter decorators, enum values, constructor parameters, helpers and other class bodies are byte-identical after reversing that edit. Complete actual no-data constructor and genuine current public parent execute against both floors in Chromium; immutable Original16 renderer DOM and empty/data/empty transitions agree exactly. No full node/factory/packed/floor scope is added.' : row.file === 'legacy-table/internal/public-constructor-context.ts' ?
    ' Scoped caller requalification: the complete borrower helper and thirteen other callers are byte-identical. The changed no-data constructor still has only declare fields, no parameter properties and the same parent/target/value-provider call. Two added field assignments happen explicitly on the returned object; actual genuine current parent/owned construction and peer-default isolation execute in the native proof. Existing six-context/162-case/eighteen-mutant helper execution is retained at its original bytes and scope; it is not reexecuted or relabeled as fourteen full peer callers.' :
    ' Scoped producer requalification: this viewport source and every production dependency are byte-identical. The packed producer changes only one no-data fixture and two no-data booleans/assignments; the complete previous producer is recovered byte-for-byte by four explicit reversals. The viewport constructor/identity/observations code and admission predicates are unchanged. Existing runtime and tagged observations retain their original identities; full packed/native viewport geometry remains a deferred obligation.';
  reviews.push({...prior, candidate_source_sha256: hash(read(sourcePath)),
    prior_source_review: row.source_review, decision: prior.decision + reason,
    independent_evidence: [...refs, ...evidence]});
}
const priorPath = 'compatibility/rc/table-no-data-cell-prior-source-contexts.json';
assert.ok(!existsSync(join(root, priorPath))); write(priorPath, {schema_version: 1, line: worksheet.line,
  source_parent: worksheet.source_parent, contexts: priorContexts, runtime_receipts_not_reexecuted: true});
const peerRow = rows.find(r => r.file === 'legacy-table/row.ts' && r.module === '@angular/cdk/table' && r.symbol === 'CdkNoDataRow');
assert.ok(peerRow && peerRow.disposition === 'open');
reviews.push({file: peerRow.file, module: peerRow.module, symbol: peerRow.symbol,
  candidate_source_sha256: native.source.candidate_sha256, conclusion: 'stable-public-peer', reviewer: 'Codex primary implementer',
  decision: 'CdkNoDataRow is the genuine public parent used by the legacy directive provider, inheritance and borrower construction. Exact SRI/sha256 rehashed complete original16/current CDK archives supply actual namespace exports, not a copied parent or private-token compatibility shim. Both minimum public declarations expose nondeprecated templateRef, _contentClassNames, _cellClassNames and _cellSelector; the whole owned class and helper strictly compile against both complete peer namespaces with skipLibCheck:false using borrowed TS6.0.3, without qualifying compiler floors. Complete owned constructors execute with actual public Core/parent values and native Chromium DOM: required manual template identity, genuine parent/owned prototypes and unchanged peer default settings are observed. Whole untouched original/current table renderer methods are replayed through explicit embedded-view/outlet/change-detector protocols. Seven cases preserve every DOM class/attribute and empty/data/empty transition from immutable Original16. Pre-repair source, missing selector guard and wrong root class fail on each current floor. The repair sets fresh empty cell classes and a no-match cell selector through stable declared public fields; this avoids both added CDK classes and the empty class attribute created by classList.add with zero arguments. Constructors, providers, rendered component templates, 409 stylesheets, other library behavior and consumer source remain unchanged. Actual full CdkTable/owned directive node/factory/AOT/packed application and canonical runtime/compiler/RxJS/browser floors remain final Actions/audit obligations. This closes only this finite public parent/configuration boundary, not the entire table or G11.',
  independent_evidence: evidence});
const reviewPath = 'compatibility/f10/authored-use-reviews/table-no-data-cell-requalified-boundaries.json';
assert.ok(!existsSync(join(root, reviewPath))); write(reviewPath, {schema_version: 1, line: worksheet.line,
  status: 'reviewed', reviews, prior_contexts: {path: priorPath, sha256: hash(read(priorPath))}, g11_claim: 'not-passed'});
for (const review of reviews) {
  const row = rows.find(r => key(r) === key(review)); assert.ok(row);
  if (row.source_review) row.source_review_history = [...(row.source_review_history || []), {
    prior_source_review: row.source_review, recorded_at_utc: new Date().toISOString(),
    reason: 'Exact no-data cell repair / additive packed producer requalification; prior runtime scope retained.'}];
  Object.assign(row, {status: 'reviewed', disposition: 'closed', source_review: {path: reviewPath, sha256: hash(read(reviewPath))}});
}
const snapshot = scanCurrentAuthoredUses({root}), seed = json('compatibility/f10/authored-dependency-inventory-seed.json');
const seedKeys = new Set(seed.symbol_uses.map(key)), additions = snapshot.symbol_uses.filter(r => !seedKeys.has(key(r)));
assert.equal(additions.length, current.symbol_uses.length);
current.source_snapshot_history = [...(current.source_snapshot_history || []), {
  current_source_population_sha256: current.current_source_population_sha256, recorded_at_utc: new Date().toISOString(),
  reason: 'No-data cell constructor field settings only; peer import population unchanged.'}];
for (const row of current.symbol_uses) {const fresh = additions.find(r => key(r) === key(row)); assert.ok(fresh);
  row.candidate_source_sha256 = fresh.candidate_source_sha256; row.occurrences = fresh.occurrences;}
Object.assign(current, {current_source_population_sha256: snapshot.source_population_sha256,
  current_uses: snapshot.symbol_uses.length, current_source_files: snapshot.source_files.length, recorded_at_utc: new Date().toISOString()});
const counts = authoredUseReviewEvidence(frozen, worksheet.line, read, hash), more = authoredUseReviewEvidence(current, worksheet.line, read, hash);
assert.equal(counts.insufficient + more.insufficient, 0); frozen.reviewed_uses = counts.reviewed; frozen.open_uses = frozen.symbol_uses.length - counts.reviewed;
write(frozenPath, frozen); write(currentPath, current);
console.log(JSON.stringify({line: worksheet.line, requalified_roles: 17, public_parent_roles: 1,
  frozen_reviewed: counts.reviewed, frozen_open: frozen.open_uses, current_reviewed: more.reviewed, invalid_closed: 0}));
