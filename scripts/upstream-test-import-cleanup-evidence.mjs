/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {analyzeTestImportCleanup} from './upstream-test-import-cleanup-analysis.mjs';
import {UNUSED_FIXTURE_PROFILES, unusedModernFixtureScope} from './upstream-unused-modern-fixture-scope.mjs';
import {TEST_SETUP_PROFILES, individualTestSetupScope} from './upstream-individual-test-setup-scope.mjs';
export const TEST_IMPORT_ROLE = 'C04 complete31 test import cleanup predicate and residual reviews';
export const TEST_IMPORT_CAPSULE = 'compatibility/rc/upstream-test-import-cleanup-subjects.json.gz';
export const TEST_IMPORT_SHAS = Object.freeze([
  "1c605257faf3f2bb2f19ce31ef26be55794c834a",
  "0be125bba77b30979a65742b1e96e5bcc0d6606b",
  "fc137406bee2215c3ce3b269258d76a7701b2802",
  "41d618a1f99d204085408dde35a6f5257d7b3d5c",
  "08c5e85f9b399c06e1273dad8c28b785bf4290c8",
  "56ab9da78bbca03556c97fd3784c09347cf2f428",
  "138729677d59d38485dc9a839b3bf13eed29450e",
  "0a93106b35347418657c98aff81def14b63478dd",
  "22e6b5d99954d7696ca63befc52ae4f632fbcb5a",
  "72ccf0b39930ff06d01eded934e6345b208c5ded",
  "a2a34f787ec2d3620d3cb0e4b3549f503cc54dd3",
  "750b35cc09b55e88fe640c29a7ae0f5760707622",
  "9310a98726139c49cbb425f66eab3809228080b2",
  "678e93e3c085d0919478a07a5a5fa31b5570f7f4",
  "c3ba13317df4019926ab3f16c1ced544928dd858",
  "d2511172d6b414cb5a1fef16eabe8b874df0444a",
  "4fce6e317b51eab7e78d1fef355286d3ad66f488",
  "210493675807bf10bf82fae9a1422bb93826ab98",
  "8f0bde9c3976175e62685a5c0764b5d5626accbd",
  "76f1bc1a8fe0ad1b8b7198a69169fb2e53811e30",
  "195260b58ba90de63ff69c2ceed6af9d45c57b82",
  "459136f8b57267701f7a5eff64d8c6418389d802",
  "dd44d8663809c7bd563b316b63d7e8326cc94228",
  "a2a960a690e4d9dbb4f862585121eb150c280923",
  "48d92c8ca699118524d82ab2b0b51d9848b7a7b4",
  "5a33fda92ca8dbaf4dc09389bf8631a6fa946e5e",
  "2638169963689dd74cb485b9d76740ab98bcad49",
  "c07b524e34e8b3978645d698ebe40812f6701349",
  "8cda5c5f1dfb17cf0a7756ce7906e8deee793560",
  "a960163f2f9b32441e688e50791f7832e9044806",
  "b9d5a95b93b030a4f95c6ee56b1182fcebdc050d"
]);
export const TEST_IMPORT_QUALIFIED = Object.freeze([
  "fc137406bee2215c3ce3b269258d76a7701b2802",
  "08c5e85f9b399c06e1273dad8c28b785bf4290c8",
  "56ab9da78bbca03556c97fd3784c09347cf2f428",
  "138729677d59d38485dc9a839b3bf13eed29450e",
  "0a93106b35347418657c98aff81def14b63478dd",
  "22e6b5d99954d7696ca63befc52ae4f632fbcb5a",
  "72ccf0b39930ff06d01eded934e6345b208c5ded",
  "750b35cc09b55e88fe640c29a7ae0f5760707622",
  "9310a98726139c49cbb425f66eab3809228080b2",
  "678e93e3c085d0919478a07a5a5fa31b5570f7f4",
  "d2511172d6b414cb5a1fef16eabe8b874df0444a",
  "4fce6e317b51eab7e78d1fef355286d3ad66f488",
  "210493675807bf10bf82fae9a1422bb93826ab98",
  "76f1bc1a8fe0ad1b8b7198a69169fb2e53811e30",
  "459136f8b57267701f7a5eff64d8c6418389d802",
  "dd44d8663809c7bd563b316b63d7e8326cc94228",
  "48d92c8ca699118524d82ab2b0b51d9848b7a7b4",
  "5a33fda92ca8dbaf4dc09389bf8631a6fa946e5e",
  "2638169963689dd74cb485b9d76740ab98bcad49",
  "8cda5c5f1dfb17cf0a7756ce7906e8deee793560",
  "a960163f2f9b32441e688e50791f7832e9044806",
  "b9d5a95b93b030a4f95c6ee56b1182fcebdc050d"
]);
const hash = x => createHash('sha256').update(x).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const contextPaths = ['projects/ngx-material-legacy/tsconfig.lib.json', 'projects/ngx-material-legacy/ng-package.json',
  'testing/legacy-runner/historical-inventory.json', 'testing/legacy-runner/historical-specs.json', 'scripts/run-legacy-artifact-suite.mjs'];

/** Full immutable commit/patch/blob membership, including example and zone specs. */
export function readTestImportSubjects(readMember) {
  const stored = readMember(TEST_IMPORT_CAPSULE);
  assert.equal(hash(stored), '526d1b0bed65cf20ba3e2cd6ee980c595d2f5181b0b17f229a0942d953a995de');
  const raw = gunzipSync(stored); assert.equal(hash(raw), '185c22c3c5e7b29c2f748f8a86ca273faf511f22b3f24c2cbb671cd8603b2621');
  const packet = JSON.parse(raw); assert.equal(packet.schema_version, 1);
  assert.deepEqual(packet.subjects.map(s => s.sha), TEST_IMPORT_SHAS);
  for (const subject of packet.subjects) {
    assert.equal(gitHash('commit', subject.raw_commit), subject.sha);
    assert.deepEqual(subject.raw_commit.split('\n').filter(x => x.startsWith('parent ')), ['parent ' + subject.parent]);
    assert.equal(hash(subject.diff), subject.diff_sha256);
    const paths = subject.diff.split('\n').filter(x => x.startsWith('diff --git ')).map(x => x.split(' b/')[1]);
    assert.deepEqual(paths, subject.members.map(m => m.path));
    assert.ok(paths.length && paths.every(p => p.startsWith('src/') && p.endsWith('.spec.ts')));
    for (const member of subject.members) {
      for (const side of ['before', 'after']) {
        assert.equal(gitHash('blob', member[side].text), member[side].git_blob);
        assert.equal(hash(member[side].text), member[side].sha256);
      }
      assert.ok(subject.diff.includes('index ' + member.before.git_blob + '..' + member.after.git_blob));
    }
  }
  assert.equal(packet.subjects.reduce((n, s) => n + s.members.length, 0), 79);
  return packet.subjects;
}

/** Import-only closure never covers providers, retained callbacks, fixture changes or assertions. */
let immutableSourceAnalysis;
export function analyzeTestImportSubjects(readMember) {
  // Authenticate on every read. Only immutable upstream analysis is reused;
  // current branch ownership and retained fixture contexts are always rechecked.
  const subjects = readTestImportSubjects(readMember);
  if (immutableSourceAnalysis) return structuredClone(immutableSourceAnalysis);
  immutableSourceAnalysis = subjects.map(s => {
    const members = s.members.map(m => {
      try {return {accepted: true, ...analyzeTestImportCleanup(m.path, m.before.text, m.after.text)};}
      catch (error) {return {path: m.path, accepted: false, reason: error.message.split('\n')[0]};}
    });
    const accepted = members.every(m => m.accepted);
    assert.equal(accepted, TEST_IMPORT_QUALIFIED.includes(s.sha), 'finite predicate partition changed');
    return {sha: s.sha, subject: s.subject, paths: s.members.map(m => m.path), diff_sha256: s.diff_sha256,
      recovered_seed_paths: s.members.map(m => m.path).filter(p => !s.seed_paths.includes(p)), accepted, members};
  });
  return structuredClone(immutableSourceAnalysis);
}

/** Product compile exclusion and the separate original57 historical selection are bounded context. */
export function testImportOwnershipContext(readMember, line) {
  assert.ok(['main', '21.x'].includes(line));
  const pkg = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  assert.equal(pkg.version.startsWith('21.') ? '21.x' : 'main', line);
  const config = JSON.parse(readMember(contextPaths[0])), packageConfig = JSON.parse(readMember(contextPaths[1]));
  assert.ok(config.exclude.includes('**/*.spec.ts'));
  assert.equal(packageConfig.lib.entryFile, 'src/public-api.ts');
  const inventory = JSON.parse(readMember(contextPaths[2])), selection = JSON.parse(readMember(contextPaths[3]));
  assert.equal(inventory.denominator, 57); assert.equal(inventory.historical_tag, '16.2.14');
  assert.equal(inventory.rows.length, 57); assert.equal(selection.length, 57);
  assert.equal(inventory.runner_selection, contextPaths[3]);
  assert.deepEqual(inventory.rows.map(r => r.historical_path).sort(), selection.map(r => r.historical_path).sort());
  assert.ok(selection.every(s => s.historical_path.startsWith('src/material/legacy-') && s.candidate.startsWith('projects/ngx-material-legacy/legacy-')));
  return {line, product_spec_exclusion: '**/*.spec.ts', historical_tag: '16.2.14', historical_selection: 57,
    inputs: contextPaths.map(path => ({path, sha256: hash(readMember(path))})),
    source_only: true, upstream_standalone_setup_or_product_runtime_executed: false};
}

// This successor is deliberately finite. Historical reports keep their own route.
const ROSTER_SUCCESSOR = 'compatibility/rc/c04-b4-test-import-roster-source-v1.json';
const ROSTER_SUCCESSOR_SHA = '938b5fbb5151ad8fa2037f955ef26972404d0085060773182e29b529fd216eea';
const ROSTER_PREDECESSOR = 'compatibility/rc/chip-source-scope-requalification-test-import.json';
const ROSTER_PREDECESSOR_SHA = 'f356923cce2f46158d6fb2a6ec3a9e066044b6b1e8f0664a392b3f0f6bdbde12';
function rosterSuccessorBound(body, readMember, line) {
  try {
    assert.equal(line, 'main');
    const currentRaw = readMember(ROSTER_SUCCESSOR), priorRaw = readMember(ROSTER_PREDECESSOR);
    assert.equal(hash(currentRaw), ROSTER_SUCCESSOR_SHA);
    assert.equal(hash(priorRaw), ROSTER_PREDECESSOR_SHA);
    assert.deepEqual(body, JSON.parse(currentRaw));
    const prior = JSON.parse(priorRaw);
    const {ownership_context: currentContext, current_roster_context_successor: metadata, ...unchanged} = body;
    const {ownership_context: priorContext, ...priorUnchanged} = prior;
    assert.deepEqual(unchanged, priorUnchanged);
    assert.deepEqual(currentContext, testImportOwnershipContext(readMember, line));
    assert.deepEqual(metadata, {
      role: 'main-only source roster context successor; historical inventory candidate and execution data are retained capture, not current source proof',
      previous_report: {path: ROSTER_PREDECESSOR, sha256: ROSTER_PREDECESSOR_SHA, bytes: priorRaw.length},
      source_commit: 'b4f75d6044a61e28504afd9a018fdaf7dd2ca4b4',
      historical_inventory_capture_not_current_source_authority: true,
      current_historical_candidate_bytes_or_runtime_execution_qualified: false,
      source_only: true, g11_claim: 'not-passed',
    });
    assert.ok(priorContext);
    return true;
  } catch { return false; }
}

export function testImportBatchOk(body, readMember, line) {
  try {
    assert.equal(body.role, TEST_IMPORT_ROLE); assert.equal(body.line, line); assert.equal(body.g11_claim, 'not-passed');
    if (Object.hasOwn(body, 'current_roster_context_successor')) assert.ok(rosterSuccessorBound(body, readMember, line));
    assert.deepEqual(body.scope_sha_ids, TEST_IMPORT_SHAS);
    assert.deepEqual(body.ownership_context, testImportOwnershipContext(readMember, line));
    const actual = analyzeTestImportSubjects(readMember);
    const subjects = readTestImportSubjects(readMember);
    assert.equal(body.reviews.length, 31); assert.deepEqual(body.reviews.map(r => r.sha), TEST_IMPORT_SHAS);
    for (const [i, source] of actual.entries()) {
      const review = body.reviews[i]; assert.deepEqual(review.source_analysis, source);
      assert.equal(review.diff_sha256, source.diff_sha256); assert.deepEqual(review.paths, source.paths);
      if (review.individual_setup_source_review) {
        assert.ok(!source.accepted && TEST_SETUP_PROFILES[source.sha] && !review.individual_retained_test_source_review);
        const subject = subjects[i];
        assert.deepEqual(review.individual_setup_source_review, individualTestSetupScope(source.sha, subject, readMember, line));
        assert.equal(review.diff, subject.diff);
        assert.equal(review.final_disposition, 'not-applicable');
        assert.equal(review.review_depth, 'individual-compatibility');
      } else if (review.individual_retained_test_source_review) {
        assert.ok(!source.accepted && UNUSED_FIXTURE_PROFILES[source.sha]);
        const subject = subjects[i];
        assert.deepEqual(review.individual_retained_test_source_review, unusedModernFixtureScope(source.sha, subject, readMember, line));
        assert.equal(review.diff, subject.diff);
        assert.equal(review.final_disposition, 'not-applicable');
        assert.equal(review.review_depth, 'individual-compatibility');
      } else {
        assert.equal(review.final_disposition, source.accepted ? 'not-applicable' : 'needs-individual-review');
        assert.equal(review.review_depth, source.accepted ? 'bounded-exact-test-import-cleanup' : 'outside-import-cleanup-predicate');
      }
      assert.deepEqual(review.affected_branches, ['main', '21.x']); assert.ok(review.decision.length > 120);
    }
    return true;
  } catch {return false;}
}

export function testImportEntryOk(body, entry, readMember, batchValid) {
  try {
    assert.equal(batchValid, true);
    if (entry.evidence_report === ROSTER_SUCCESSOR) assert.ok(rosterSuccessorBound(body, readMember, body.line));
    const review = body.reviews.find(r => r.sha === entry.sha); assert.ok(review);
    assert.equal(entry.final_disposition, review.final_disposition); assert.equal(entry.reason, review.decision);
    assert.deepEqual(entry.files, review.paths); assert.deepEqual(entry.affected_branches, review.affected_branches);
    assert.equal(entry.review_depth, review.review_depth);
    assert.equal(entry.source_check.evidence_report_sha256, hash(readMember(entry.evidence_report)));
    assert.equal(entry.source_check.diff_sha256, review.diff_sha256);
    assert.equal(entry.source_check.review_membership, review.sha);
    return true;
  } catch {return false;}
}
