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
const worksheetPath = 'compatibility/rc/table-column-class-worksheet.json', worksheet = json(worksheetPath);
const proofPath = 'compatibility/rc/table-column-class-source-proof.json', proof = json(proofPath);
const nativePath = 'compatibility/rc/table-column-class-native-diagnostic.json', native = json(nativePath);
assert.equal(proof.line, worksheet.line); assert.equal(proof.source_parent, worksheet.source_parent);
assert.equal(proof.producer_sha256, hash(read('scripts/table-column-class-source-proof.mjs')));
assert.equal(native.producer_sha256, hash(read('tests/table_column_class_probe.mjs')));
assert.equal(native.worker_sha256, hash(read('tests/table_column_class_subject.mjs')));
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
assert.equal(failures.length, 13);
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const evidence = [proofPath, nativePath, worksheetPath, 'scripts/table-column-class-source-proof.mjs',
  'tests/table_column_class_probe.mjs', 'tests/table_column_class_subject.mjs'].map(path => ({path, sha256: hash(read(path))}));
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
  const reason = ['legacy-table/cell.ts','legacy-table/table-module.ts'].includes(row.file) ?
    ' Scoped current-source requalification: the column/cell repair keeps all prior class/parameter decorators and constructor arguments. Sticky code is unchanged; the module adds only one private bridge declaration/export/import. Former private CDK class-array/name hooks are removed. Public name/cssClassFriendlyName and complete actual owned/current parent construction preserve authentic16 final classes in 288 native comparison cases. The bridge is manually constructed; actual node/module/packed integration is deferred. No full node/factory/packed/floor scope is added.' : row.file === 'legacy-table/internal/public-constructor-context.ts' ?
    ' Scoped caller requalification: the complete borrower helper and ten other callers are byte-identical. Four changed column/cell constructors keep the same parent/target/value-provider call, no emitted owned fields and no parameter properties. The column is weakly registered and each owned cell adds its historical class after real parent construction. Genuine original/current parents and complete owned constructors execute in the native class proof; raw peer columns remain unmodified. Existing six-context/162-case/eighteen-mutant helper execution is retained at its original bytes and scope; it is not reexecuted or relabeled as fourteen full peer callers.' :
    ' Scoped producer requalification: this viewport source and every production dependency are byte-identical. The packed producer changes only one no-data fixture and two no-data booleans/assignments; the complete previous producer is recovered byte-for-byte by four explicit reversals. The viewport constructor/identity/observations code and admission predicates are unchanged. Existing runtime and tagged observations retain their original identities; full packed/native viewport geometry remains a deferred obligation.';
  reviews.push({...prior, candidate_source_sha256: hash(read(sourcePath)),
    prior_source_review: row.source_review, decision: prior.decision + reason,
    independent_evidence: [...refs, ...evidence]});
}
const priorPath = 'compatibility/rc/table-column-class-prior-source-contexts.json';
assert.ok(!existsSync(join(root, priorPath))); write(priorPath, {schema_version: 1, line: worksheet.line,
  source_parent: worksheet.source_parent, contexts: priorContexts, runtime_receipts_not_reexecuted: true});
const newRoles = [
  ...['CdkColumnDef','CdkCell','CdkHeaderCell','CdkFooterCell'].map(symbol => ({file:'legacy-table/cell.ts',module:'@angular/cdk/table',symbol})),
  ...['Directive','ElementRef','Inject','Optional'].map(symbol => ({file:'legacy-table/internal/column-classes.ts',module:'@angular/core',symbol})),
  {file:'legacy-table/internal/column-classes.ts',module:'@angular/cdk/table',symbol:'CdkColumnDef'},
];
for (const role of newRoles) {
  for (const model of native.types) assert.ok(model.publicImports.some(r => r.file === 'projects/ngx-material-legacy/'+role.file && r.module === role.module && r.symbol === role.symbol));
  reviews.push({...role, candidate_source_sha256:hash(read('projects/ngx-material-legacy/'+role.file)),
    conclusion:'stable-public-peer',reviewer:'Codex primary implementer',
    decision:'This finite public import belongs to the column/cell constructor or private interop bridge. Complete SRI/sha256 rehashed original/current CDK packages supply genuine public namespace values; complete original/owned modules execute in Chromium with actual public Core decorators, public CDK parent constructors and the complete borrower helper. Two full current peer declaration namespaces strictly compile the complete cell and class-helper modules with skipLibCheck:false and verify every imported public declaration plus public name/cssClassFriendlyName/sticky/table members as nondeprecated and not docs-private. Borrowed TS6 does not qualify compiler floors. All 288 original/main/21.x final class comparisons agree: owned and mixed-CDK header/data/footer/native/flex cells, sanitized and renamed names, and raw CDK columns. Six true native mutations reject missing weak ownership, absent mixed bridge and absent owned cell handling. The new helper uses a weak ownership set and public cssClassFriendlyName; it never reads/mutates current private class arrays or calls private name/class hooks. Constructor arguments, current public parent/owned prototypes and supplied table identity are retained. Existing public selectors/providers and product CSS/SCSS/HTML are unchanged; Cyph has no private-hook or column subclass uses. The private bridge matches public CDK cell selectors only to preserve historical mixed-cell behavior and exports no modern API mirror. Actual Angular node/module/factory/AOT/packed integration and supported runtime/compiler/RxJS/browser floors remain deferred; only this finite source/public-construction/class-output boundary is admitted, not the whole table or G11.',
    independent_evidence:evidence});
}
const reviewPath = 'compatibility/f10/authored-use-reviews/table-column-class-requalified-boundaries.json';
assert.ok(!existsSync(join(root, reviewPath))); write(reviewPath, {schema_version: 1, line: worksheet.line,
  status: 'reviewed', reviews, prior_contexts: {path: priorPath, sha256: hash(read(priorPath))}, g11_claim: 'not-passed'});
const snapshot = scanCurrentAuthoredUses({root}), seed = json('compatibility/f10/authored-dependency-inventory-seed.json');
const seedKeys = new Set(seed.symbol_uses.map(key)), additions = snapshot.symbol_uses.filter(r => !seedKeys.has(key(r)));
assert.equal(additions.length, current.symbol_uses.length + 5);
for (const fresh of additions) {
  let row = current.symbol_uses.find(r => key(r) === key(fresh));
  if (!row) {row = {...fresh,status:'unreviewed-current-use',disposition:'open'};current.symbol_uses.push(row);rows.push(row);}
  row.candidate_source_sha256=fresh.candidate_source_sha256;row.occurrences=fresh.occurrences;
}
for (const review of reviews) {
  const row = rows.find(r => key(r) === key(review)); assert.ok(row);
  if (row.source_review) row.source_review_history = [...(row.source_review_history || []), {
    prior_source_review: row.source_review, recorded_at_utc: new Date().toISOString(),
    reason: 'Public column-class repair / scoped caller and module requalification; prior runtime scope retained.'}];
  Object.assign(row, {status: 'reviewed', disposition: 'closed', source_review: {path: reviewPath, sha256: hash(read(reviewPath))}});
}
current.source_snapshot_history = [...(current.source_snapshot_history || []), {
  current_source_population_sha256:current.current_source_population_sha256,recorded_at_utc:new Date().toISOString(),
  reason:'Private column-class hooks removed; new private helper adds five public import roles.'}];
Object.assign(current,{current_source_population_sha256:snapshot.source_population_sha256,
  current_uses:snapshot.symbol_uses.length,current_source_files:snapshot.source_files.length,
  symbol_use_count:current.symbol_uses.length,recorded_at_utc:new Date().toISOString()});
const counts = authoredUseReviewEvidence(frozen, worksheet.line, read, hash), more = authoredUseReviewEvidence(current, worksheet.line, read, hash);
assert.equal(counts.insufficient + more.insufficient, 0); frozen.reviewed_uses = counts.reviewed; frozen.open_uses = frozen.symbol_uses.length - counts.reviewed;
write(frozenPath, frozen); write(currentPath, current);
console.log(JSON.stringify({line: worksheet.line, requalified_roles: 13, finite_public_roles: 9,
  frozen_reviewed: counts.reviewed, frozen_open: frozen.open_uses, current_reviewed: more.reviewed, invalid_closed: 0}));
