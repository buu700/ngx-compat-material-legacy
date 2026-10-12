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
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (p, value) => writeFileSync(join(root, p), JSON.stringify(value, null, 2) + '\n');
const diagnosticPath = 'compatibility/rc/injectable-service-scope-diagnostic.json';
const sourcePath = 'compatibility/rc/injectable-service-source-proof.json';
const worksheetPath = 'compatibility/rc/injectable-service-scope-worksheet.json';
const diagnostic = json(diagnosticPath), source = json(sourcePath), worksheet = json(worksheetPath);
assert.equal(diagnostic.line, worksheet.line); assert.equal(source.line, worksheet.line);
assert.equal(diagnostic.producer_sha256, hash(read('tests/injectable_service_scope_probe.mjs')));
assert.equal(diagnostic.worker_sha256, hash(read('tests/injectable_service_scope_subject.mjs')));
assert.equal(source.producer_sha256, hash(read('scripts/injectable-service-source-proof.mjs')));
assert.equal(diagnostic.cases.length, 5); assert.equal(diagnostic.results.length, 3);
assert.equal(diagnostic.declarations.length, 3); assert.equal(diagnostic.source_negative_controls.length, 6);
assert.equal(diagnostic.actual_scope_negative_controls.length, 6);
assert.equal(source.changed.length, 3); assert.equal(source.unchanged_styles, 409); assert.equal(source.unchanged_templates, 30);
for (const row of [...source.changed, ...source.unchanged_product_members]) assert.equal(hash(read(row.path)), row.candidate_sha256);
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json';
const currentPath = 'compatibility/f10/authored-dependency-current-dispositions.json';
const frozen = json(frozenPath), current = json(currentPath), seed = json('compatibility/f10/authored-dependency-inventory-seed.json');
const rows = [...frozen.symbol_uses, ...current.symbol_uses];
const evidence = [diagnosticPath, sourcePath, worksheetPath, 'tests/injectable_service_scope_probe.mjs',
  'tests/injectable_service_scope_subject.mjs', 'scripts/injectable-service-source-proof.mjs'].map(path => ({path, sha256: hash(read(path))}));
const reviews = diagnostic.cases.map(recorded_case => ({...recorded_case, recorded_case,
  conclusion: 'stable-public-peer', reviewer: 'Codex primary implementer',
  decision: recorded_case.file === 'legacy-snack-bar/snack-bar.ts' ?
    'The exact public Injectable annotation changes from deprecated module-valued providedIn to Injectable() plus an explicit MatLegacySnackBarModule provider. Untouched Material16 used the module-valued association; genuine original16 and both minimum public injector factories compare module ownership, singleton retrieval, inherited and imported child scopes, parent delegation, value/factory overrides and owner destruction. Missing-provider and parent-reuse faults fail each real peer model. The entire six-argument constructor and service body are byte-identical after reversing only metadata/import edits. Public declarations and the exact metadata/provider types compile strictly against full genuine peer namespaces with borrowed TS6. No public constructor or CSS/HTML/SCSS change; the actual owned lazy-module/rendering regression is added but unexecuted pending final Actions. This review qualifies only the annotation/provider scope; complete service DI, native rendering, AOT, packed and runtime/compiler floors remain separate.' :
    'The checker binds this single public Injectable import to the exact owned service annotation and no other value/type route. This caller is unchanged from the worksheet parent: dialog and dialog-base remain explicitly provided, the date adapter remains explicitly provided, and the viewport keeps stable root scope. Complete original16 and both minimum public declaration export routes contain nondeprecated Injectable; exact annotation expressions type-check with full peer declarations, strict mode and skipLibCheck:false using borrowed TS6. The module-valued deprecated option is absent from these callers. Public scope protocol executions support only the changed snack-bar ownership contract; they do not substitute for the behavior of this service or its dependencies. Whole component/service factory, AOT, packed, browser and advertised runtime/compiler floor qualification remain separate.',
  independent_evidence: evidence}));
const changedFiles = new Set(source.changed.filter(r => r.path.endsWith('.ts') && !r.path.endsWith('.spec.ts')).map(r => r.path.slice('projects/ngx-material-legacy/'.length)));
for (const row of rows.filter(r => changedFiles.has(r.file) && r.status === 'reviewed' && r.disposition === 'closed')) {
  const priorBytes = read(row.source_review.path); assert.equal(hash(priorBytes), row.source_review.sha256);
  const priorBody = JSON.parse(priorBytes), prior = priorBody.reviews.find(r => r.file === row.file && r.module === row.module && r.symbol === row.symbol);
  assert.ok(prior); assert.equal(priorBody.line, worksheet.line);
  const before = source.changed.find(r => r.path === 'projects/ngx-material-legacy/' + row.file);
  assert.equal(prior.candidate_source_sha256, before.before_sha256);
  for (const ref of prior.independent_evidence) assert.equal(hash(read(ref.path)), ref.sha256);
  const ownsProvider = row.symbol === 'NgModule';
  reviews.push({...prior, candidate_source_sha256: before.candidate_sha256,
    prior_source_review: row.source_review,
    decision: prior.decision + (ownsProvider ?
      ' Scoped requalification: the owning NgModule now provides the unchanged legacy service explicitly. Public original/minimum factory scope comparison proves the historical module-valued provider association and new provider equivalent for the tested hierarchical ownership/override/destruction contracts. All other module metadata and default-option provider are byte-identical; full owned factory/rendering remains deferred.' :
      ' Scoped requalification: removing the leaf-to-module import and moving service provider ownership changes no use of this imported symbol. The entire constructor/body or module imports remains byte-identical after reversing the two exact source edits. Prior public boundary evidence is preserved with its original scope; the new source proof binds unchanged caller behavior to current bytes. No whole-service/native/floor claim is added.'),
    independent_evidence: [...prior.independent_evidence, ...evidence]});
}
assert.equal(reviews.length, 11);
const reviewPath = 'compatibility/f10/authored-use-reviews/public-injectable-service-scope-boundary.json';
assert.ok(!existsSync(join(root, reviewPath)), 'review already exists; do not reattribute prior closure');
write(reviewPath, {schema_version: 1, line: worksheet.line, status: 'reviewed', reviews,
  scope: 'Five public Injectable annotation roles and six exact changed-source boundary requalifications only.', g11_claim: 'not-passed'});
const key = r => JSON.stringify([r.file, r.module, r.symbol]);
for (const review of reviews) {
  const matches = rows.filter(r => key(r) === key(review)); assert.equal(matches.length, 1);
  const row = matches[0];
  if (row.source_review) row.source_review_history = [...(row.source_review_history || []), {
    recorded_at_utc: new Date().toISOString(), prior_source_review: row.source_review,
    reason: 'Exact source requalification after deprecated Injectable module-scope repair; prior evidence and behavior scope preserved.'}];
  Object.assign(row, {status: 'reviewed', disposition: 'closed', source_review: {path: reviewPath, sha256: hash(read(reviewPath))}});
}
const snapshot = scanCurrentAuthoredUses({root});
const additions = snapshot.symbol_uses.filter(r => !new Set(seed.symbol_uses.map(key)).has(key(r)));
assert.equal(additions.length, current.symbol_uses.length);
current.source_snapshot_history = [...(current.source_snapshot_history || []), {
  recorded_at_utc: new Date().toISOString(), current_source_population_sha256: current.current_source_population_sha256,
  reason: 'Two exact snack-bar provider/import edits; no added or removed public peer import roles.'}];
for (const row of current.symbol_uses) { const actual = additions.find(r => key(r) === key(row)); assert.ok(actual);
  row.candidate_source_sha256 = actual.candidate_source_sha256; row.occurrences = actual.occurrences; }
Object.assign(current, {current_source_population_sha256: snapshot.source_population_sha256,
  current_uses: snapshot.symbol_uses.length, current_source_files: snapshot.source_files.length, recorded_at_utc: new Date().toISOString()});
const counts = authoredUseReviewEvidence(frozen, worksheet.line, read, hash);
frozen.reviewed_uses = counts.reviewed; frozen.open_uses = frozen.symbol_uses.length - counts.reviewed;
write(frozenPath, frozen); write(currentPath, current);
const currentCounts = authoredUseReviewEvidence(current, worksheet.line, read, hash);
assert.equal(counts.insufficient + currentCounts.insufficient, 0);
console.log(JSON.stringify({line: worksheet.line, public_roles: 5, changed_source_requalifications: 6,
  frozen_reviewed: counts.reviewed, frozen_open: frozen.open_uses, current_reviewed: currentCounts.reviewed,
  current_open: current.symbol_uses.length - currentCounts.reviewed, invalid_closed: 0}));
