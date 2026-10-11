/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded refresh of four source-only groups after the exact guarded-control patch. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {testImportOwnershipContext, readTestImportSubjects} from './upstream-test-import-cleanup-evidence.mjs';
import {individualTestSetupScope} from './upstream-individual-test-setup-scope.mjs';
import {unusedModernFixtureScope} from './upstream-unused-modern-fixture-scope.mjs';
import {reviewSliderInputScope} from './upstream-slider-input-scope.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(read(path));
const write = (path, value) => writeFileSync(resolve(root, path), JSON.stringify(value, null, 2) + '\n');
const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root});
const names = ['closeout-fourteen-build-scope-review', 'closeout-test-consolidation-source-review',
  'closeout-thirty-one-test-import-source-review', 'closeout-three-slider-input-source-review'];
const paths = names.map(name => 'compatibility/f10/disposition-ledger/evidence/' + name + '.json');
const priorPath = 'compatibility/rc/deferred-control-upstream-prior-contexts.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const proofPath = 'compatibility/rc/deferred-control-lifetime-source-proof.json';
const proof = json(proofPath), line = json('projects/ngx-material-legacy/package.json').version.startsWith('21.') ? '21.x' : 'main';
assert.equal(proof.line, line);
for (const source of proof.candidate_sources) assert.equal(hash(read(source.path)), source.sha256);
for (const resource of proof.resources_unchanged) assert.equal(hash(read(resource.path)), resource.sha256);
for (const cap of proof.caps) assert.equal(hash(read(cap.path)), cap.sha256);
const currentLedger = json(ledgerPath);
const prior = existsSync(resolve(root, priorPath)) ? json(priorPath) : {
  schema_version: 1, line, reports: paths.map(path => ({path, sha256: hash(read(path)), body: json(path)})),
  entries: currentLedger.entries.filter(row => paths.includes(row.evidence_report)),
};
assert.equal(prior.line, line); assert.equal(prior.reports.length, 4); assert.equal(prior.entries.length, 80);
assert.deepEqual(prior.reports.map(r => r.path), paths);
assert.equal(new Set(prior.entries.map(entry => entry.sha)).size, 80);
for (const report of prior.reports) {
  const original = git(['show', proof.source_parent + ':' + report.path]);
  assert.equal(hash(original), report.sha256, 'prior report does not match the actual pre-guard commit');
  assert.deepEqual(JSON.parse(original), report.body);
}
const bodies = prior.reports.map(({body}) => structuredClone(body));
const before = bodies[0].candidate_context;
const productPaths = git(['ls-files', 'projects/ngx-material-legacy']).toString().trim().split('\n');
assert.deepEqual(productPaths, before.tracked_product_paths);
for (const item of before.files) {const bytes = read(item.path); assert.equal(hash(bytes), item.sha256); assert.equal(bytes.length, item.bytes);}
const changed = before.product_members.filter(item => hash(read(item.path)) !== item.sha256);
const expected = ['projects/ngx-material-legacy/legacy-checkbox/checkbox.spec.ts',
  'projects/ngx-material-legacy/legacy-checkbox/internal/checkbox-base.ts',
  'projects/ngx-material-legacy/legacy-slide-toggle/internal/slide-toggle-base.ts',
  'projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.spec.ts'];
assert.deepEqual(changed.map(row => row.path).sort(), expected.sort());
for (const item of changed) assert.equal(hash(git(['show', proof.source_parent + ':' + item.path])), item.sha256);
const newCases = {
  'projects/ngx-material-legacy/legacy-checkbox/checkbox.spec.ts': [
    'should cancel deferred blur work when destroyed',
    'should stop deferred view work if touching the form destroys it',
    'should cancel a queued indeterminate reset when destroyed',
  ],
  'projects/ngx-material-legacy/legacy-slide-toggle/slide-toggle.spec.ts': [
    'should cancel deferred blur work when destroyed',
    'should stop deferred view work if touching the form destroys it',
  ],
};
const printer = ts.createPrinter({removeComments: true});
for (const [path, titles] of Object.entries(newCases)) {
  const parent = git(['show', proof.source_parent + ':' + path]).toString();
  const text = read(path).toString(), source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true), matches = [];
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'it'
      && ts.isStringLiteralLike(node.arguments[0]) && titles.includes(node.arguments[0].text)) {
      assert.ok(ts.isExpressionStatement(node.parent));
      matches.push({title: node.arguments[0].text, start: node.parent.getFullStart(), end: node.parent.end});
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.deepEqual(matches.map(item => item.title).sort(), [...titles].sort());
  let retained = text;
  for (const item of matches.sort((a, b) => b.start - a.start)) retained = retained.slice(0, item.start) + retained.slice(item.end);
  const normalize = value => printer.printFile(ts.createSourceFile(path, value, ts.ScriptTarget.Latest, true));
  assert.equal(normalize(retained), normalize(parent), 'existing component test program changed outside the five new regressions');
}
const sourceCommit = git(['rev-parse', 'HEAD']).toString().trim(), sourceTree = git(['rev-parse', 'HEAD^{tree}']).toString().trim();
const refresh = {schema_version: 1, line, source_commit: sourceCommit, source_tree: sourceTree,
  original_control_parent: proof.source_parent, changed: changed.map(item => ({path: item.path,
    prior_sha256: item.sha256, current_sha256: hash(read(item.path))})), added: [], removed: [],
  build_inputs_unchanged: before.files.length, proof: {path: proofPath, sha256: hash(read(proofPath))},
  scope: 'Only two tested lifetime-guard source edits and five new component regression cases. Source applicability only; no original/native/packed/floor execution is rebound.'};
if (!existsSync(resolve(root, priorPath))) write(priorPath, prior);
// Updating the build report first is required by the historical consolidation validator.
const build = bodies[0]; build.candidate_context = {...before, source_commit: sourceCommit, source_tree: sourceTree,
  product_members: productPaths.map(path => {const bytes = read(path); return {path, sha256: hash(bytes), bytes: bytes.length};})};
build.context_updates = [...(build.context_updates || []), refresh]; write(paths[0], build);
const bind = (path, body) => {
  const sha = hash(read(path));
  for (const row of currentLedger.entries.filter(row => row.evidence_report === path)) {
    if (row.source_check) row.source_check.evidence_report_sha256 = sha;
    else assert.equal(path, paths[3], 'only the slider source-scope validator omits report-hash entry metadata');
  }
  write(ledgerPath, currentLedger);
};
bind(paths[0], build);
const consolidation = bodies[1];
consolidation.candidate_context.sha256 = hash(read(paths[0]));
consolidation.context_updates = [...(consolidation.context_updates || []), refresh]; write(paths[1], consolidation); bind(paths[1], consolidation);
const imports = bodies[2], subjects = readTestImportSubjects(read);
assert.deepEqual(imports.ownership_context, testImportOwnershipContext(read, line));
const individualComparisons = [];
for (const review of imports.reviews) {
  const subject = subjects.find(s => s.sha === review.sha); assert.ok(subject);
  if (review.individual_setup_source_review) {
    const old = review.individual_setup_source_review;
    const current = individualTestSetupScope(review.sha, subject, read, line);
    const strip = value => ({...value, owned_context: value.owned_context.map(({sha256, ...item}) => item)});
    assert.deepEqual(strip(current), strip(old));
    individualComparisons.push({sha: review.sha, role: 'individual-setup', before: old, after: current});
    review.individual_setup_source_review = current;
  }
  if (review.individual_retained_test_source_review) {
    const old = review.individual_retained_test_source_review;
    const current = unusedModernFixtureScope(review.sha, subject, read, line);
    const strip = value => ({...value, retained_historical_member: {path: value.retained_historical_member.path},
      retained: value.retained.map(item => ({...item,
        current_create_calls: item.current_create_calls.map(({line, ...call}) => call)}))});
    assert.deepEqual(strip(current), strip(old));
    individualComparisons.push({sha: review.sha, role: 'retained-fixture', before: old, after: current});
    review.individual_retained_test_source_review = current;
  }
}
assert.equal(individualComparisons.length, 9);
imports.context_requalification = refresh; write(paths[2], imports); bind(paths[2], imports);
const slider = bodies[3], freshSlider = reviewSliderInputScope(read, () => candidateProductSourcePaths(root), line);
const stripSlider = value => {const {product_source_population_sha256, ...rest} = value; return rest;};
assert.deepEqual(stripSlider(freshSlider), stripSlider(slider.source_scope));
slider.source_scope = freshSlider; slider.source_context_requalification = refresh; write(paths[3], slider); bind(paths[3], slider);
const diagnostic = {...refresh, prior_contexts: {path: priorPath, sha256: hash(read(priorPath))},
  reviewed_membership: prior.reports.map(({path, body}) => ({path, sha_ids: body.reviews.map(r => r.sha)})),
  individual_import_comparisons: individualComparisons,
  unchanged_original_membership_decisions_and_source_analyses: true,
  original_frozen_denominators: {upstream_SHAs: 1697, authored_uses: 1736},
  native_or_packed_or_full_floors_qualified: false, g11_claim: 'not-passed'};
write('compatibility/rc/deferred-control-upstream-context-requalification.json', diagnostic);
console.log(JSON.stringify({line, source_rows: 80, changed_product_files: 4,
  build_inputs_unchanged: before.files.length, individual_import_reviews: 9,
  native_or_packed_qualified: false}));
