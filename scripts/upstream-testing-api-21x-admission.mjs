/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Seven bounded individual reviews; record-backed execution is not browser credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dialogTitleProductSubject} from './dialog-title-source-context.mjs';
import {autocompleteSelectionSpecSubject} from './autocomplete-selection-spec-subject.mjs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';

const reviewRef = {path: 'compatibility/rc/upstream-testing-api-21x-individual-admission.json',
  sha256: '38ae3242afbf30852fa06e16bfd041b62827d3ff6002e89ec4e420ec55191b18'};
const inheritedSha = '4de7c0fb2d033bd81074764a52cc46edd02e6774';
const patches = {
  '422e85d1524f8eeff2425e403702fbfc23a2cc2e': '981e03d36244ac78ac3950c1038ac029694837dc4023eb0450009ed9432919b9',
  '4de7c0fb2d033bd81074764a52cc46edd02e6774': '789e84d9089de9fe4f45a5297d6afc944dd3fadf3fab2de9293e2e0cd50c1879',
  '54d514df66b9a1ea544df0aacc7069defcd78dcd': 'd257a644e34595668af3a4f4da4c7e2efff1fc4229dcd494456929f527c94ec1',
  '3619903fa26910a784f01bee627e30d922b9b525': '313e0b12a7ae53865d2352540c46b389eb4a80a9d98bc1e91f4fedfcf5ad2355',
  '85f596b3c32d22541c3825da3479b67832a2f4da': 'b3e350158631e54b258becfd29ffedb4e4204766d375542050a72a2351983a48',
  '9cf15019d9d82bcb7460df5febd898a1b1eec59b': '32277eb9848681e7cdceaf2c6e22a4cb3047c1ad6d8560758b7cf66f0a9bdfd0',
  '3ef56a682fa797563d3269f18769ddceda05f760': '967da3c19a9e8fc4b6f1145e52be6f02f3377d544c60b1559119bb3bf547c9ec',
};
const hash = value => createHash('sha256').update(value).digest('hex');
const objectHash = (kind, text) => createHash('sha1').update(kind + ' ' + Buffer.byteLength(text) + '\0').update(text).digest('hex');
function readMember(read, ref) {const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'changed testing API subject ' + ref.path); return raw;}
function corpus(read) {
  const body = JSON.parse(readMember(read, reviewRef));
  assert.equal(body.line, '21.x'); assert.equal(body.status, 'reviewed'); assert.equal(body.reviews.length, 7);
  assert.equal(body.original_hunks_reviewed, 76); assert.equal(body.original_file_occurrences, 38);
  assert.equal(body.actual_native_packed_or_floor_qualified, false);
  const original = body.original_subjects.flatMap(ref => {
    const packet = JSON.parse(gunzipSync(readMember(read, ref))); return packet.subjects ?? [packet];
  });
  assert.equal(original.length, 7);
  for (const row of body.reviews) {
    const subject = original.find(item => item.sha === row.sha); assert.ok(subject);
    assert.equal(objectHash('commit', subject.raw_commit), row.sha);
    assert.equal(hash(subject.diff), patches[row.sha]); assert.equal(row.diff, subject.diff);
    assert.equal(row.diff_sha256, patches[row.sha]);
    assert.deepEqual(row.complete_original_paths, subject.members.map(member => member.path));
    const hunks = subject.diff.split('diff --git ').slice(1).flatMap(part => {
      const lines = part.split(/(?<=\n)/), path = lines[0].trim().split(' b/')[1];
      const starts = lines.flatMap((line, index) => line.startsWith('@@') ? [index] : []);
      return starts.map((start, index) => ({path, hunk_index: index + 1, header: lines[start].trim(),
        hunk_sha256: hash(lines.slice(start, starts[index + 1] ?? lines.length).join(''))}));
    });
    assert.equal(row.whole_original_hunk_reviews.length, hunks.length);
    row.whole_original_hunk_reviews.forEach((review, index) => {
      for (const key of Object.keys(hunks[index])) assert.deepEqual(review[key], hunks[index][key]);
      assert.ok(review.decision.length > 80); assert.equal(review.upstream_original_suite_executed, false);
    });
  }
  return body;
}
export function testingApi21xSourceProof(row) {
  assert.ok(Object.hasOwn(patches, row.sha));
  const inherited = row.sha === inheritedSha;
  return {proof_kind: inherited ? 'executed-minimum-public-harness-protocol' : 'individual-owned-testing-api-exclusion',
    diff_sha256: patches[row.sha], review_depth: 'individual-compatibility', affected_branches: ['21.x'], decision: row.decision,
    testing_api_21x: {sha: row.sha, review: reviewRef, source_scope_only: true,
      actual_native_packed_or_floor_qualified: false},
    ...(inherited ? {reachable_behavior: {kind: 'executed-delegation', id: 'source/testing-api-21x/' + inheritedSha}} : {})};
}
export function requiresTestingApi21xProof(proof, read) {
  if (proof?.testing_api_21x !== undefined) return true;
  if (!Object.values(patches).includes(proof?.diff_sha256)) return false;
  try {return JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.');}
  catch {return true;}
}
/** The real SHA selects this contract even when all optional markers are erased. */
export function requiresTestingApi21xEntry(entry, line, read) {
  if (entry?.individual_proof?.testing_api_21x !== undefined) return true;
  if (!Object.hasOwn(patches, entry?.sha)) return false;
  if (line === '21.x') return true;
  try {return JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.');}
  catch {return true;}
}
export function testingApi21xEntryEvidenceOk({entry, body, read, productPaths, line}) {
  try {
    assert.equal(line, '21.x');
    const review = corpus(read), row = review.reviews.find(item => item.sha === entry.sha); assert.ok(row);
    assert.deepEqual(body, review); assert.equal(entry.evidence_report, reviewRef.path);
    assert.equal(entry.final_disposition, row.final_disposition); assert.equal(entry.reason, row.decision);
    assert.equal(entry.review_depth, row.review_depth); assert.deepEqual(entry.affected_branches, row.affected_branches);
    assert.deepEqual(entry.files, row.frozen_seed_files); assert.equal(entry.g11_claim, 'not-passed');
    return testingApi21xSourceEvidenceOk(entry.individual_proof, read, productPaths);
  } catch {return false;}
}

export function testingApi21xSourceEvidenceOk(proof, read, productPaths) {
  try {
    assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'), true);
    const body = corpus(read), row = body.reviews.find(item => item.sha === proof.testing_api_21x?.sha); assert.ok(row);
    assert.deepEqual(proof, testingApi21xSourceProof(row));
    const snapshot = JSON.parse(gunzipSync(readMember(read, body.current_product)));
    assert.equal(snapshot.line, '21.x'); assert.equal(snapshot.members.length, 1142);
    const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),spec=autocompleteSelectionSpecSubject({root,read,line:'21.x'}),title=dialogTitleProductSubject({root,read,line:'21.x'});
    for (const member of snapshot.members) {
      let current=title.qualify(member)??member;
      if(member.path===spec.path){assert.equal(member.sha256,spec.before.sha256);assert.equal(member.bytes,spec.before.bytes);current={...member,...spec.after};}
      const raw=readMember(read,current);assert.equal(raw.length,current.bytes);
    }
    title.assertCurrent();
    const sourcePaths = snapshot.members.map(member => member.path).filter(path => /\.(ts|scss|css|html)$/.test(path)).sort();
    assert.deepEqual(productPaths().sort(), sourcePaths);
    for (const ref of body.prior_reviews) readMember(read, ref);
    readMember(read, body.public_sdk_subject);
    for (const ref of body.current_observations) {
      const observation = JSON.parse(gunzipSync(readMember(read, ref)));
      assert.equal(observation.line, '21.x'); assert.equal(observation.result, 'pass');
      assert.equal(observation.cases.length, ref.kind === 'option' ? 26 : 55);
      readMember(read, observation.producer);
    }
    return true;
  } catch {return false;}
}

/** Execute the fixed minimum-peer producer again for the inherited subscopes. */
export function validateTestingApi21xInheritedExecution({root, entry, proof, line}) {
  let temporary, out, runFile, libraryFile;
  try {
    assert.equal(line, '21.x'); assert.equal(entry.sha, inheritedSha); assert.equal(entry.final_disposition, 'inherited');
    const read = path => readFileSync(join(root, path)), body = corpus(read), row = body.reviews.find(item => item.sha === inheritedSha);
    assert.deepEqual(proof, testingApi21xSourceProof(row));
    const retained = JSON.parse(gunzipSync(readMember(read, body.current_observations.find(ref => ref.kind === 'testing'))));
    readMember(read, retained.producer);
    temporary = mkdtempSync(join(tmpdir(), 'legacy-testing-api-admission-')); out = join(temporary, 'observation.json');
    const runBytes = gunzipSync(readMember(read, retained.retained_packed_evidence.run));
    assert.equal(hash(runBytes), retained.retained_packed_evidence.run.raw_sha256);
    const run = JSON.parse(runBytes), artifact = run.artifacts.find(item => item.id === 'library');
    assert.equal(artifact.sha256, 'b22cc5742c078ef3e61d6d1817da9f7f8e0872cd06c4190ceef73bdb40c044fc');
    assert.equal(artifact.path, 'ngx-compat-material-legacy-21.0.0-rc.0.tgz');
    const library = read('compatibility/rc/upstream-testing-api-21x-library.tgz');
    assert.equal(hash(library), artifact.sha256); assert.equal(library.length, artifact.bytes);
    runFile = join(temporary, 'run.json'); libraryFile = join(temporary, artifact.path);
    writeFileSync(runFile, runBytes, {flag: 'wx'}); writeFileSync(libraryFile, library, {flag: 'wx'});
    const child = spawnSync(process.execPath, ['tests/upstream_testing_api_21x_probe.mjs', '--run',
      runFile, '--out', out],
    {cwd: root, env: process.env, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024});
    assert.equal(child.status, 0, (child.error?.message ?? child.stderr).slice(-1000)); assert.equal(child.signal, null);
    const bytes = readFileSync(out), actual = JSON.parse(bytes);
    assert.equal(actual.line, '21.x'); assert.equal(actual.result, 'pass');
    assert.deepEqual(actual.cases, retained.cases); assert.equal(actual.cases.length, 55);
    assert.deepEqual(actual.semantic_reversions_rejected, retained.semantic_reversions_rejected);
    assert.equal(actual.semantic_reversions_rejected.length, 5);
    assert.deepEqual(actual.source_members, retained.source_members);
    const {run: actualLocation, ...actualArtifact} = actual.actual_library_artifact;
    const {run: retainedLocation, ...retainedArtifact} = retained.actual_library_artifact;
    assert.deepEqual(actualArtifact, retainedArtifact); assert.equal(actualLocation.sha256, retainedLocation.sha256);
    assert.deepEqual(actual.current_product_identity, retained.current_product_identity);
    assert.deepEqual(actual.public_stable_declarations, retained.public_stable_declarations);
    assert.equal(actual.current_product_identity.members, 1142);
    assert.equal(actual.current_product_identity.all_current_file_bytes_equal_actual_packed_source, true);
    return {ok: true, detail: 'Fixed packed harness and current minimum public-peer protocols executed; browser/native/floor qualification remains separate.',
      observation_sha256: hash(bytes), executed_case_ids: actual.cases,
      execution: 'packed-harness-and-minimum-public-record-environment-protocol', actual_native_packed_or_floor_qualified: false};
  } catch (error) {return {ok: false, detail: error.message};}
  finally {if (temporary) {for (const path of [out, runFile, libraryFile]) {try {if (path) unlinkSync(path);} catch {}} rmdirSync(temporary);}}
}
