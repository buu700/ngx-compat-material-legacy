/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), hash = b => createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(read(p)), write = (p, value) => writeFileSync(join(root, p), JSON.stringify(value, null, 2) + '\n');
const worksheetPath = 'compatibility/rc/table-data-source-worksheet.json', worksheet = json(worksheetPath);
const proofPath = 'compatibility/rc/table-data-source-source-proof.json', proof = json(proofPath);
const runtimePath = 'compatibility/rc/table-data-source-runtime-diagnostic.json', runtime = json(runtimePath);
assert.equal(proof.line, worksheet.line); assert.equal(proof.source_parent, worksheet.source_parent);
assert.equal(proof.producer_sha256, hash(read('scripts/table-data-source-source-proof.mjs')));
assert.equal(runtime.producer_sha256, hash(read('tests/table_data_source_probe.mjs')));
assert.equal(runtime.worker_sha256, hash(read('tests/table_data_source_subject.mjs')));
assert.equal(runtime.rxjs_subjects_sha256, hash(read('compatibility/rc/table-data-source-rxjs-subjects.json')));
assert.deepEqual(runtime.rxjs_subjects.map(r => r.version), ['6.5.3', '7.5.5']);
assert.equal(runtime.complete_historical_logic_identical, true); assert.equal(runtime.numeric_helper_body_identical, true);
for (const source of runtime.sources) assert.equal(hash(read(source.path)), source.sha256);
for (const source of proof.unchanged_product_members) assert.equal(hash(read(source.path)), source.sha256);
assert.equal(proof.unchanged_styles, 409); assert.equal(proof.unchanged_templates, 30);
assert.equal(runtime.results.length, 6); assert.equal(runtime.types.length, 4); assert.equal(runtime.controls.length, 20);
for (const rxjs of ['6.5.3', '7.5.5']) {
  const historical = runtime.results.filter(r => r.line === 'original' && r.rxjs === rxjs);
  assert.equal(historical.length, 1); assert.equal(historical[0].results.length, 25);
  for (const line of ['main', '21.x']) {
    const owned = runtime.results.filter(r => r.line === line && r.rxjs === rxjs);
    assert.equal(owned.length, 1); assert.deepEqual(owned[0].results, historical[0].results);
    const types = runtime.types.filter(r => r.line === line && r.rxjs === rxjs);
    assert.equal(types.length, 1); assert.equal(types[0].diagnostics, 0);
    assert.equal(types[0].skipLibCheck, false); assert.equal(types[0].source_strictPropertyInitialization, false);
    assert.equal(types[0].consumer_strictPropertyInitialization, true); assert.equal(types[0].consumer_declarations, true);
    assert.equal(types[0].selectedCalls.length, 10); assert.equal(types[0].compiler_floor_qualified, false);
    assert.deepEqual(runtime.controls.filter(r => r.line === line && r.rxjs === rxjs).map(r => r.variant).sort(),
      ['filter-delimiter', 'numeric-null', 'page-clamp', 'in-place-sort', 'leaked-subscription'].sort());
  }
}
assert.ok(runtime.controls.every(r => r.rejected === true));
const inventoryPath = 'compatibility/f10/authored-dependency-dispositions.json', inventory = json(inventoryPath);
assert.equal(inventory.line, worksheet.line);
const file = 'legacy-table/internal/table-data-source-base.ts';
const roles = [['@angular/cdk/collections', 'DataSource'], ['@angular/material/sort', 'MatSort'], ['@angular/material/sort', 'Sort']];
const evidence = [worksheetPath, proofPath, runtimePath, 'compatibility/rc/table-data-source-rxjs-subjects.json',
  'reference/material-16.2.14/table-data-source/provenance.json', 'scripts/table-data-source-source-proof.mjs',
  'tests/table_data_source_probe.mjs', 'tests/table_data_source_subject.mjs'].map(path => ({path, sha256: hash(read(path))}));
const reviewPath = 'compatibility/f10/authored-use-reviews/table-data-source-public-boundaries.json';
const reviews = roles.map(([module, symbol]) => {
  const row = inventory.symbol_uses.find(r => r.file === file && r.module === module && r.symbol === symbol);
  assert.ok(row); assert.equal(row.disposition, 'open');
  for (const types of runtime.types) assert.ok(types.imports.some(r => r.module === module && r.symbol === symbol));
  return {file, module, symbol, conclusion: 'stable-public-peer', reviewer: 'Codex primary implementer',
    candidate_source_sha256: hash(read('projects/ngx-material-legacy/' + file)),
    decision: 'This finite boundary retains the complete untouched Material16 paginator interfaces and data-source algorithm, rather than inheriting the current Material data source coupled to its paginator. Whole-class/interface AST identity and authentic tagged numeric-recognition body identity are checked. Complete genuine public original/current CDK DataSource and both actual advertised RxJS6.5.3/7.5.5 run the entire original/owned class through the original/owned public legacy facade, preserving parent identity. All 150 observations agree across six subjects: initial streams, trimmed/case/cross-property filtering, numeric/null/unsafe-integer access, stable ascending/descending/disabled sort, delayed/replayed initialization, paging and filtered-page clamps, custom filter/accessor/sort, immutable sort input, detached-control unsubscription and disconnect/reconnect. Twenty effective runtime mutants are rejected. Entire current source/dependency declarations compile at both peer minima and RxJS minima with the repository strictPropertyInitialization:false and skipLibCheck:false; emitted declarations are consumed with fully strict:true. Resolved overloads used by the actual RxJS calls are nondeprecated; unused deprecated overloads do not authorize their use. MatSort active/direction/sortChange/initialized and public DataSource connect/disconnect members resolve as stable public declarations, with public Sort providing the event shape. MatSort/paginator values are explicit stream/property protocols, not actual Angular nodes. All 1140 tracked product bytes, 409 styles and 30 templates are unchanged; the read-only Cyph caller constructs rows and later attaches public sort/paginator. No public API change is needed. Borrowed Node22.23.3/TS6.0.3 does not qualify runtime/compiler floors. Full Angular table/node/AOT/harness/packed declaration and facade integration, whole G11 and independent audit remain open.',
    independent_evidence: evidence};
});
write(reviewPath, {schema_version: 1, line: worksheet.line, status: 'reviewed', reviews, g11_claim: 'not-passed'});
for (const review of reviews) {
  const row = inventory.symbol_uses.find(r => r.file === review.file && r.module === review.module && r.symbol === review.symbol);
  Object.assign(row, {status: 'reviewed', disposition: 'closed', source_review: {path: reviewPath, sha256: hash(read(reviewPath))}});
}
const counts = authoredUseReviewEvidence(inventory, worksheet.line, read, hash); assert.equal(counts.insufficient, 0);
inventory.reviewed_uses = counts.reviewed; inventory.open_uses = inventory.symbol_uses.length - counts.reviewed;
write(inventoryPath, inventory);
console.log(JSON.stringify({line: worksheet.line, finite_public_roles: reviews.length, frozen_reviewed: counts.reviewed,
  frozen_open: inventory.open_uses, invalid_closed: 0}));
