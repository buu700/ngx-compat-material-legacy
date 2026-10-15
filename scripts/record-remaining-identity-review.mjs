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
import {reverseRemainingIdentitySource} from './remaining-identity-construction.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path)), json = path => JSON.parse(read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (path, body) => {
  assert.equal(existsSync(join(root, path)), false);
  writeFileSync(join(root, path), JSON.stringify(body, null, 2) + '\n');
};
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root});
const worksheetPath = 'compatibility/rc/remaining-identity-worksheet.json', worksheet = json(worksheetPath);
const beforePath = 'compatibility/rc/remaining-identity-before-constructor-diagnostic.json', before = json(beforePath);
const diagnosticPath = 'compatibility/rc/remaining-identity-after-constructor-diagnostic.json', diagnostic = json(diagnosticPath);
const proofPath = 'compatibility/rc/remaining-identity-source-proof.json';
for (const report of [before, diagnostic]) assert.equal(report.line, worksheet.line);
for (const [report, prefix] of [[before, 'compatibility/rc/remaining-identity-before-'], [diagnostic, '']]) {
  const paths = prefix ? [prefix + 'remaining_identity_construction_probe.mjs', prefix + 'remaining_identity_construction_subject.mjs', prefix + 'remaining-identity-construction.mjs', prefix + 'remaining-identity-public-subjects.mjs'] : ['tests/remaining_identity_construction_probe.mjs', 'tests/remaining_identity_construction_subject.mjs', 'scripts/remaining-identity-construction.mjs', 'scripts/remaining-identity-public-subjects.mjs'];
  for (const [field, path] of ['producer_sha256', 'worker_sha256', 'compiler_helper_sha256', 'public_subject_loader_sha256'].map((field, i) => [field, paths[i]])) assert.equal(report[field], hash(read(path)));
  assert.equal(report.runtime_capsule.sha256, hash(read(report.runtime_capsule.path)));
  for (const resource of report.resources) assert.equal(hash(read(resource.path)), resource.sha256);
  for (const result of report.results) {
    assert.equal(result.actual_public_peer_constructors, true);
    assert.equal(result.raw_stylesheets_not_compiled_or_rendered, true);
    assert.equal(result.actual_angular_nodes_or_native_or_packed_qualified, false);
    if (result.explicit) assert.equal(result.explicit.preserved, true);
  }
}
assert.equal(before.results.length, 36);
for (const result of before.results) for (const value of result.values) assert.equal(value.unique, result.line === 'original' && value.role !== 'tab-panel');
assert.equal(diagnostic.results.length, 50);
assert.equal(diagnostic.source_requalification_negatives, 13);
assert.equal(diagnostic.type_ownership_negative_controls, 4);
assert.equal(diagnostic.owned_modules.length, 95);
assert.equal(diagnostic.resources.length, 22);
const positive = diagnostic.results.filter(r => r.line !== 'original' && r.variant === 'after');
assert.equal(positive.length, 24);
assert.ok(positive.every(r => r.values.every(value => value.unique)));
const negative = diagnostic.results.filter(r => r.variant !== 'after');
assert.equal(negative.length, 14);
assert.ok(negative.every(r => r.values.filter(value => !value.unique).length === 1));
assert.equal(diagnostic.results.filter(r => r.line === 'original' && r.values.some(v => !v.unique)).length, 2);
const changes = worksheet.subjects.map(row => {
  const current = read(row.path), old = Buffer.from(reverseRemainingIdentitySource(row.path, current.toString()));
  assert.equal(hash(old), row.before_sha256);
  assert.deepEqual(old, git(['show', worksheet.source_parent + ':' + row.path]));
  return {...row, candidate_sha256: hash(current), bytes: current.length, exact_reversal_to_parent: true};
}), changed = new Map(changes.map(row => [row.path, row]));
for (const member of diagnostic.owned_modules) {
  assert.equal(hash(read(member.path)), member.sha256);
  assert.equal(before.owned_modules.find(row => row.path === member.path)?.sha256, changed.get(member.path)?.before_sha256 ?? member.sha256);
}
const members = git(['ls-tree', '-rz', worksheet.source_parent, '--', 'projects/ngx-material-legacy']).toString().split('\0').filter(Boolean).map(text => {
  const [prefix, path] = text.split('\t'), [mode, type, blob] = prefix.split(' ');
  assert.equal(type, 'blob'); assert.ok(['100644', '100755'].includes(mode));
  const candidate = read(path), old = changed.has(path) ? Buffer.from(reverseRemainingIdentitySource(path, candidate.toString())) : candidate;
  assert.equal(createHash('sha1').update('blob ' + old.length + '\0').update(old).digest('hex'), blob, 'unrelated product changed ' + path);
  return {path, sha256: hash(candidate), bytes: candidate.length};
});
assert.equal(members.length, 1140);
assert.deepEqual(members.map(row => row.path), git(['ls-files', 'projects/ngx-material-legacy']).toString().trim().split('\n'));
const cyph = '/home/parallels/cyph';
const consumerPaths = execFileSync('rg', ['-l', '(<mat-(autocomplete|menu|select|snack-bar|tab|option|optgroup)\\b|Mat(Legacy)?(Autocomplete|Menu|Select|SnackBar|Tab)|\\.mat-(autocomplete|menu|select|snack-bar|tab|option|optgroup)\\b)', 'shared', '-g', '*.html', '-g', '*.ts', '-g', '*.scss', '-g', '*.css'], {cwd: cyph, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
write(proofPath, {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent,
  producer_sha256: hash(read('scripts/record-remaining-identity-review.mjs')), helper_sha256: hash(read('scripts/remaining-identity-construction.mjs')),
  changed: changes, unchanged_product_members: members.filter(row => !changed.has(row.path)), product_files: members.length,
  unchanged_styles: members.filter(row => /\.(?:css|scss)$/.test(row.path)).length, unchanged_templates: members.filter(row => row.path.endsWith('.html')).length,
  type_ownership: diagnostic.type_ownership, cyph: {read_only: true, files: consumerPaths.map(path => ({path, sha256: hash(readFileSync(join(cyph, path)))})),
    observations: ['Explicit IDs and all selectors/classes/templates/CSS/SCSS remain unchanged. The internal panel class has no public export or production value caller; its sole input type retains the exact two structural fields.', 'The read-only consumer review is not a consumer build or rendering qualification.']},
  before_receipt: {path: beforePath, sha256: hash(read(beforePath))}, after_receipt: {path: diagnosticPath, sha256: hash(read(diagnosticPath))}, g11_claim: 'not-passed'});
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json', currentPath = 'compatibility/f10/authored-dependency-current-dispositions.json';
const frozen = json(frozenPath), current = json(currentPath), rows = [...frozen.symbol_uses, ...current.symbol_uses];
const key = r => JSON.stringify([r.file, r.module, r.symbol]);
const failures = [...authoredUseReviewEvidence(frozen, worksheet.line, read, hash).insufficient_uses, ...authoredUseReviewEvidence(current, worksheet.line, read, hash).insufficient_uses];
assert.equal(failures.length, 162);
assert.ok(failures.every(r => changed.has('projects/ngx-material-legacy/' + r.file)));
const evidence = [worksheetPath, 'compatibility/rc/remaining-identity-tab-panel-ownership-worksheet.json', 'compatibility/rc/remaining-identity-completion-worksheet.json', proofPath, beforePath, diagnosticPath,
  'scripts/remaining-identity-construction.mjs', 'scripts/remaining-identity-public-subjects.mjs', 'tests/remaining_identity_construction_probe.mjs', 'tests/remaining_identity_construction_subject.mjs',
  'compatibility/rc/remaining-identity-public-subjects.json', 'compatibility/rc/remaining-identity-tab-panel-before-ownership.json',
  ...['remaining-identity-construction.mjs', 'remaining-identity-public-subjects.mjs', 'remaining_identity_construction_probe.mjs', 'remaining_identity_construction_subject.mjs'].map(p => 'compatibility/rc/remaining-identity-before-' + p)].map(path => ({path, sha256: hash(read(path))}));
const priorContexts = [], reviews = [], removed = new Set(['Component', 'ChangeDetectionStrategy', 'ViewEncapsulation']);
for (const failed of failures) {
  const row = rows.find(r => key(r) === key(failed)), bytes = read(row.source_review.path);
  assert.equal(hash(bytes), row.source_review.sha256);
  const prior = JSON.parse(bytes).reviews.find(r => key(r) === key(row)); assert.ok(prior);
  const source = changed.get('projects/ngx-material-legacy/' + row.file);
  assert.equal(prior.candidate_source_sha256, source.before_sha256);
  for (const ref of prior.independent_evidence) assert.equal(hash(read(ref.path)), ref.sha256, 'unrelated prior evidence changed ' + ref.path);
  const erased = row.file === 'legacy-tabs/internal/tab-nav-bar-base.ts' && row.module === '@angular/core' && removed.has(row.symbol);
  priorContexts.push({file: row.file, module: row.module, symbol: row.symbol, prior_source_review: row.source_review, prior_review: prior});
  const decision = erased ? 'This frozen Core binding is now a removed use. Whole-program local symbol resolution over 417 runtime sources proves the internal MatTabNavPanel was only a structural input type, with no production value caller or public export. Replacing its unused ordinary component fork with the exact id:string and _activeTabId?:string interface removes this binding and no live legacy component. The frozen denominator and prior review are retained; the current inventory records the three removals explicitly.' : 'The previous import/API/behavior conclusion is retained only within its original scope. Exact source reversal authenticates the six complete prior product files; changes are seven opaque generated-ID suffixes and removal of the unused internal panel component plus its three now-unused Core bindings. Surviving imported bindings retain their constructor/DI/decorator/type/method roles. The tabPanel input retains the exact historical structural fields and public export names remain unchanged.';
  reviews.push({...prior, conclusion: erased ? 'removed-use' : prior.conclusion, candidate_source_sha256: source.candidate_sha256, prior_source_review: row.source_review,
    decision: decision + ' Genuine tagged/current constructors and the complete 95-module owned leaf graph execute in both creation orders. Twenty-four current positive contexts and fourteen independently reverted field controls isolate all seven collisions. Two tagged tab-panel duplicates are recorded as a pre-existing reference defect. Explicit inputs remain intact. Resource text is served unchanged through a restricted public fetch protocol; raw SCSS is not compiled or rendered. No owned Angular nodes, DOM/ARIA, native/factory/AOT/packed or canonical runtime/compiler/RxJS-floor pass is claimed. Prior independent receipts retain their identities and scope; aggregate packed DOM/ARIA execution remains required before final candidate Actions.',
    independent_evidence: [...prior.independent_evidence, ...evidence]});
}
assert.equal(reviews.filter(r => r.conclusion === 'removed-use' && removed.has(r.symbol)).length, 3);
const priorPath = 'compatibility/rc/remaining-identity-prior-source-contexts.json';
write(priorPath, {schema_version: 1, line: worksheet.line, source_parent: worksheet.source_parent, contexts: priorContexts, prior_runtime_receipts_not_reexecuted: true});
const reviewPath = 'compatibility/f10/authored-use-reviews/remaining-identity-requalified-boundaries.json';
write(reviewPath, {schema_version: 1, line: worksheet.line, status: 'reviewed', reviews, prior_contexts: {path: priorPath, sha256: hash(read(priorPath))}, g11_claim: 'not-passed'});
for (const review of reviews) {
  const row = rows.find(r => key(r) === key(review));
  row.source_review_history = [...(row.source_review_history || []), {prior_source_review: row.source_review, recorded_at_utc: new Date().toISOString(), reason: 'Seven isolated default IDs and an unused structural panel runtime removal; prior receipt scopes retained; three removed Core uses explicitly preserved.'}];
  row.source_review = {path: reviewPath, sha256: hash(read(reviewPath))};
}
const snapshot = scanCurrentAuthoredUses({root}), seed = json('compatibility/f10/authored-dependency-inventory-seed.json'), seedKeys = new Set(seed.symbol_uses.map(key));
const live = new Set(snapshot.symbol_uses.map(key)), additions = snapshot.symbol_uses.filter(r => !seedKeys.has(key(r)));
assert.equal(snapshot.symbol_uses.length, 1951); assert.equal(snapshot.source_files.length, 530);
assert.equal(seed.symbol_uses.filter(r => !live.has(key(r))).length, 86);
assert.equal(additions.length, current.symbol_uses.length);
current.source_snapshot_history = [...(current.source_snapshot_history || []), {current_source_population_sha256: current.current_source_population_sha256, recorded_at_utc: new Date().toISOString(), reason: 'Seven default-ID suffixes and three removed unused internal panel Core imports; frozen denominator unchanged.'}];
for (const row of current.symbol_uses) {
  const fresh = additions.find(r => key(r) === key(row)); assert.ok(fresh);
  row.candidate_source_sha256 = fresh.candidate_source_sha256; row.occurrences = fresh.occurrences;
}
Object.assign(current, {current_source_population_sha256: snapshot.source_population_sha256, current_uses: snapshot.symbol_uses.length, current_source_files: snapshot.source_files.length, recorded_at_utc: new Date().toISOString()});
const counts = authoredUseReviewEvidence(frozen, worksheet.line, read, hash), more = authoredUseReviewEvidence(current, worksheet.line, read, hash);
assert.equal(counts.insufficient + more.insufficient, 0); assert.equal(counts.reviewed, 1444); assert.equal(more.reviewed, 167);
for (const [path, body] of [[frozenPath, frozen], [currentPath, current]]) writeFileSync(join(root, path), JSON.stringify(body, null, 2) + '\n');
console.log(JSON.stringify({line: worksheet.line, requalified_roles: reviews.length, removed_frozen_uses: 3, new_use_or_SHA_closures: 0, frozen_reviewed: counts.reviewed, frozen_open: 1736 - counts.reviewed, additional_reviewed: more.reviewed, additional_open: 301 - more.reviewed, invalid_closed: 0, product_files: members.length, unchanged_styles: 409, unchanged_templates: 30, cyph_sources: consumerPaths.length}));
