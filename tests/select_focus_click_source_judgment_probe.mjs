/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real source judgment, synthetic runtime controls; no product qualification. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SELECT_FOCUS_SHA, SELECT_FOCUS_PATCH, SELECT_FOCUS_MEMBERS, ARTIFACT_BEHAVIOR_KIND,
  requiresArtifactBehavior, validateArtifactBehavior} from '../scripts/upstream-artifact-behavior-evidence.mjs';
import {createFixture} from './upstream/artifact-behavior-fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const json = path => JSON.parse(read(path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const manifest = json('projects/ngx-material-legacy/package.json'), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
const entry = json('compatibility/f10/disposition-ledger/ledger.json').entries.find(row => row.sha === SELECT_FOCUS_SHA);
const review = json(entry.evidence_report), proof = entry.individual_proof;
assert.equal(entry.final_disposition, 'already-adapted'); assert.equal(proof.proof_kind, ARTIFACT_BEHAVIOR_KIND);
assert.deepEqual(proof.affected_branches, [line]); assert.equal(review.line, line); assert.equal(review.status, 'reviewed');
assert.equal(review.judgment_stage, 'source-complete-runtime-required'); assert.equal(review.diff_sha256, SELECT_FOCUS_PATCH);
assert.equal(review.semantic_pass, false); assert.equal(review.actual_packed_or_native_executed, false);
assert.equal(review.runtime_qualification.required, true); assert.equal(review.runtime_qualification.qualified_by_this_document, false);
assert.equal(review.g11_claim, 'not-passed'); assert.equal(review.security_clearance, 'not-passed');
assert.deepEqual(proof.artifact_behavior.source_members, review.reviewed_source_members);
assert.deepEqual(review.reviewed_source_members.map(row => row.path), SELECT_FOCUS_MEMBERS);
let bindings = 0;
function bound(record) { assert.equal(hash(read(record.path)), record.sha256, record.path); bindings++; }
for (const ref of [...review.independent_evidence, ...review.reviewed_source_members, ...review.original16.sources, review.prior_pending_record]) bound(ref);
const old = json(review.prior_pending_record.path);
assert.equal(old.status, 'pending'); assert.equal(old.actual_packed_or_native_executed, false);
assert.equal(review.prior_entry.final_disposition, 'needs-individual-review');
assert.equal(review.prior_entry.evidence_report, review.prior_pending_record.path);
const patch = read(review.patch_file).toString(); assert.equal(hash(patch), SELECT_FOCUS_PATCH);
assert.equal(patch.split('\n').filter(row => row.startsWith('diff --git ')).length, 2);
assert.equal(patch.split('\n').filter(row => row.startsWith('@@ ')).length, 4);
assert.deepEqual(review.hunk_reviews.map(row => row.hunk), [1, 2, 3, 4]);
assert.equal(review.original_patch_has_test_hunk, false);
for (const row of review.hunk_reviews) { assert.ok(row.judgment.length > 100); assert.ok(review.complete_original_files.includes(row.file)); }
const auth = json('compatibility/rc/select-focus-source-judgment-authentication.json');
assert.equal(auth.patch.original_git_object_matches, true); assert.equal(auth.patch.sha256, SELECT_FOCUS_PATCH);
assert.equal(auth.actual_peer_or_Angular_packed_or_native_executed, false);
const peer = json('compatibility/rc/select-focus-click-peer-source-review.json');
const capsule = json('compatibility/rc/remaining-identity-public-subjects.json');
assert.equal(hash(read('compatibility/rc/remaining-identity-public-subjects.json')), 'c3600dff7acf9eeb0a0bbd0fd893273e392592fc1bae06110fb792ffe673a8fc');
const material = json('compatibility/rc/material-public-subjects.json');
assert.equal(hash(read('compatibility/rc/material-public-subjects.json')), 'f4e494ce1f71c068e801d086e4017fc86ea721c842d5e7ac161d3d08d1434ae3');
function unpack(member) {
  const stored = read(member.path); assert.equal(hash(stored), member.stored_sha256);
  const bytes = gunzipSync(stored); assert.equal(bytes.length, member.bytes); assert.equal(hash(bytes), member.sha256); return bytes;
}
let floorMethods = 0;
for (const floor of auth.floors) {
  const member = capsule.subjects.find(row => row.line === floor.line).members.find(row => row.key === '@angular/material/fesm2022/select.mjs');
  const source = unpack(member); assert.equal(hash(source), floor.module_sha256);
  const packageMember = material.subjects.find(row => row.line === floor.line).members.find(row => row.package === '@angular/material' && row.module_path === 'package.json');
  const pkg = JSON.parse(unpack(packageMember)); assert.equal(pkg.version, floor.material_version);
  assert.equal(packageMember.sha256, floor.package_manifest_sha256); assert.deepEqual(pkg.exports['./select'], floor.public_route);
  const sf = ts.createSourceFile(member.key, source.toString(), ts.ScriptTarget.Latest, true);
  assert.equal(sf.parseDiagnostics.length, 0); const klass = sf.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MatSelect');
  assert.ok(klass); const prior = peer.models.find(row => row.line === floor.line);
  for (const method of floor.methods) {
    const found = klass.members.filter(node => ts.isMethodDeclaration(node) && node.name?.getText(sf) === method.name);
    assert.equal(found.length, 1); const bytes = found[0].getText(sf);
    assert.equal(hash(bytes), method.sha256); assert.equal(bytes, prior.methods[method.name].source); floorMethods++;
  }
  assert.equal(floor.executed, false);
}
assert.equal(floorMethods, 10); assert.equal(auth.floors.length, 2);
assert.equal(manifest.peerDependencies['@angular/material'], '^' + review.branch_review.minimum_material);
const methodProtocol = json('compatibility/rc/select-focus-click-method-diagnostic.json');
for (const ref of methodProtocol.source_inputs) bound(ref);
assert.equal(hash(read('tests/select_public_open_lifetime_probe.mjs')), methodProtocol.adapter_source_sha256);
assert.equal(methodProtocol.positives.length, 2); assert.equal(methodProtocol.originals.length, 2); assert.equal(methodProtocol.reversions.length, 7);
assert.equal(methodProtocol.actual_constructor_or_Angular_node_or_native_or_packed_executed, false);
assert.equal(requiresArtifactBehavior(entry, proof), true);
const withoutRun = validateArtifactBehavior({root, entry, proof, request: null});
assert.equal(withoutRun.ok, false); assert.match(withoutRun.detail, /missing coordinator run/);

const fixture = createFixture(root, {entry, review}), objects = [fixture.entry, fixture.request, fixture.run, fixture.report, fixture.observation];
const originals = objects.map(value => structuredClone(value));
function reset() {
  for (const [index, target] of objects.entries()) {
    for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[index]));
  }
  fixture.save();
}
const environment = {...process.env, NODE_PATH: dirname(dirname(dirname(createRequire(import.meta.url).resolve('typescript'))))};
for (const key of Object.keys(environment).filter(key => key.startsWith('RC_'))) delete environment[key];
const invocation = 'real-source-synthetic-runtime', outputDir = join(fixture.runDir, 'evidence/upstream-audit-disposition', invocation);
mkdirSync(outputDir, {recursive: true});
const observations = []; let cliCases = 0;
function run(name, mutate, expected, coordinator = true) {
  reset(); mutate?.(); fixture.save();
  fixture.runPut('seed.json', {commits: [{sha: SELECT_FOCUS_SHA}], fixture_only: true});
  fixture.runPut('ledger.json', {entries: [fixture.entry], g11_claim: 'not-passed', fixture_only: true});
  const reportPath = join(fixture.runDir, name + '.json');
  const env = coordinator ? {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: fixture.request.runId,
    RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(fixture.request.binding), RC_ASSERTION_OUTPUT_DIR: outputDir,
    RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(fixture.request.packedConsumerExecution)} : environment;
  const child = spawnSync(process.execPath, [join(fixture.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
    '--seed', join(fixture.runDir, 'seed.json'), '--ledger', join(fixture.runDir, 'ledger.json'),
    '--symbols', join(fixture.root, 'symbols.json'), '--current-symbols', join(fixture.root, 'current.json'), '--report', reportPath],
    {cwd: fixture.root, env, encoding: 'utf8', timeout: 30000});
  assert.ok([0, 1].includes(child.status), child.stderr + String(child.error || ''));
  const report = JSON.parse(readFileSync(reportPath));
  assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(report.artifact_behavior_evidence));
  assert.equal(report.disposition_admission, expected ? 'pass' : 'incomplete'); assert.equal(report.g11_claim, 'not-passed');
  assert.equal(report.authored_use_inventory.expected, 1736); assert.equal(report.authored_use_review_evidence.insufficient, 0);
  assert.equal(report.current_authored_use_inventory.ready, true); cliCases++;
  observations.push({name, exit_code: child.status, synthetic_runtime_only: true});
}
try {
  run('real-source-complete-synthetic-artifact', null, true);
  run('real-source-without-artifact', null, false, false);
  run('failed-coordinator-prerequisite', () => fixture.request.packedConsumerExecution.exit_code = 8, false);
  run('stale-runtime-invocation', () => fixture.report.invocation_id = 'old-run', false);
  run('incomplete-runtime-roster', () => fixture.report.executed_case_ids.pop(), false);
  run('rehashed-focus-regression', () => {
    const selected = fixture.observation.cases.find(row => row.case_id === 'packed-consumer/harness/legacy-select');
    selected.observation.contexts[0].cycles[0].after_click.no_detach = false;
    fixture.observation.extra.harness.selectFocusClick = selected.observation;
  }, false);
  run('renamed-kind', () => fixture.entry.individual_proof.proof_kind = 'source-only-completed', false);
  run('wrong-original-patch', () => fixture.entry.individual_proof.diff_sha256 = 'f'.repeat(64), false);
  run('wrong-branch-review', () => fixture.entry.individual_proof.affected_branches = [line === 'main' ? '21.x' : 'main'], false);
  run('stale-reviewed-source', () => fixture.entry.individual_proof.artifact_behavior.source_members[0].sha256 = 'f'.repeat(64), false);
  run('unfinished-individual-review', () => fixture.entry.individual_proof.status = 'pending', false);
} finally { fixture.dispose(); }
const output = {schema_version: 1, line, role: 'Real individual source judgment; actual CLI synthetic artifact qualification controls only',
  source_member_bindings_checked: bindings, complete_original_hunks: 4, minimum_peer_methods_rehashed: floorMethods,
  actual_cli_cases: cliCases, missing_runtime_rejected: true, complete_synthetic_runtime_fixture_passed: true,
  actual_product_or_packed_or_native_qualified: false, g11_claim: 'not-passed', observations,
  source_judgment: {path: entry.evidence_report, sha256: hash(read(entry.evidence_report))},
  producer_sha256: hash(read('tests/select_focus_click_source_judgment_probe.mjs')),
  shared_fixture_sha256: hash(read('tests/upstream/artifact-behavior-fixture.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...output, observations: undefined}));
