/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticate every original body/hunk, with no TypeScript or source execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2], out = process.argv[3], read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const {reviewCompleteSingleSpec} = await import(pathToFileURL(resolve(root, 'scripts/authenticated-single-spec-review.mjs')));
const subjects = ['60ad14c1a25aa57d10e8755168bc90b2b3cb4f4d', '1597a2d85049e53e67eabdaa7f37efd1cfaad93e', '42eb7044ca2f27fe81b9b402a6ae3baae73662f7', 'a36374c4ff809ba5c181f74feb26fce232ebb068'];
const originalsPath = 'compatibility/rc/spec-overlay-async-source-subjects.json.gz';
const recordPath = 'compatibility/rc/spec-overlay-async-source-acquisition.json.gz';
const originals = JSON.parse(gunzipSync(read(originalsPath))), acquisition = JSON.parse(gunzipSync(read(recordPath)));
const censusPath = 'compatibility/rc/upstream-complete-patch-census.json.gz', census = JSON.parse(gunzipSync(read(censusPath)));
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
assert.equal(census.line, line); assert.deepEqual(originals.subjects.map(n => n.sha), subjects);
assert.deepEqual(acquisition.subjects, subjects); const rows = [], expectedAcquisitions = [];
for (const packet of [originals, acquisition]) {
  assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
  assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
  const worksheet = JSON.parse(packet.selection.worksheet_text); assert.equal(worksheet.line, line); assert.deepEqual(worksheet.subjects, subjects);
}
assert.equal(originals.source_inventory.path, censusPath); assert.equal(originals.source_inventory.sha256, hash(read(censusPath)));
assert.equal(acquisition.private_temporary_object_view_removed, true);
assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
assert.equal(acquisition.upstream_or_candidate_source_executed, false);
for (const [index, subject] of originals.subjects.entries()) {
  const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit);
  assert.deepEqual(subject.complete_changed_files, original.complete_changed_files);
  assert.deepEqual(subject.members.map(n => n.path), original.complete_changed_files.map(n => n.path));
  assert.equal(subject.members.length, [1, 1, 3, 1][index]); assert.equal(new Set(subject.members.map(n => n.path)).size, subject.members.length);
  assert.equal(hash(subject.diff), subject.diff_sha256); assert.equal(Buffer.byteLength(subject.diff), subject.diff_bytes);
  const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = [];
  assert.equal(parts.length, subject.members.length);
  for (const [i, member] of subject.members.entries()) {
    const identity = original.complete_changed_files[i], diff = parts[i];
    assert.equal(identity.status, 'M'); assert.equal(identity.before_mode, '100644'); assert.equal(identity.after_mode, '100644');
    hunks.push(...reviewCompleteSingleSpec({...subject, members: [member], complete_changed_files: [identity],
      diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, subjects));
    for (const side of ['before', 'after']) expectedAcquisitions.push({commit: subject.sha, path: member.path, side,
      revision: side === 'before' ? subject.parents[0] : subject.sha, git_blob: member[side].git_blob,
      sha256: member[side].sha256, bytes: member[side].bytes});
  }
  assert.equal(hunks.length, subject.original_hunks);
  rows.push({sha: subject.sha, complete_original_files: subject.members.length, complete_original_hunks: hunks.length,
    original_before_after_bytes: subject.members.reduce((n, m) => n + m.before.bytes + m.after.bytes, 0),
    diff_sha256: subject.diff_sha256, raw_commit_sha256: subject.raw_commit_sha256, hunk_records: hunks,
    semantic_applicability_review_complete: false, actual_Angular_native_artifact_or_floor_qualified: false});
}
assert.deepEqual(acquisition.members.map(({source, url, ...identity}) => {
  assert.ok(['existing-cache', 'immutable-upstream-raw'].includes(source));
  assert.equal(source === 'immutable-upstream-raw', typeof url === 'string'); return identity;
}), expectedAcquisitions);
const report = {schema_version: 1, line, rows, complete_original_files: 6,
  complete_original_hunks: rows.reduce((n, r) => n + r.complete_original_hunks, 0),
  original_before_after_bytes: rows.reduce((n, r) => n + r.original_before_after_bytes, 0),
  originals: {path: originalsPath, sha256: hash(read(originalsPath))}, acquisition: {path: recordPath, sha256: hash(read(recordPath))},
  producer: originals.producer, authenticator: {path: 'scripts/authenticated-single-spec-review.mjs', sha256: hash(read('scripts/authenticated-single-spec-review.mjs'))},
  semantic_reviews_pending: 4, source_acquisition_and_hunk_authentication_only: true,
  actual_Angular_native_artifact_or_floor_qualified: false, g11_claim: 'not-passed'};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, rows: rows.map(({hunk_records, ...summary}) => summary)}));
