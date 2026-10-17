/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Added/deleted file representations are authenticated as complete byte states. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2], out = process.argv[3], read = p => readFileSync(resolve(root, p));
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), prefix = 'compatibility/rc/mixed-zone-moves-source-';
const {reviewCompleteMixedZoneMovesFile} = await import(pathToFileURL(resolve(root, prefix + 'authenticator.mjs')));
const packet = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))), shas = packet.subjects.map(n => n.sha), cases = [], validated = [];
function reject(id, original, mutate) {const changed = structuredClone(original); mutate(changed);
 changed.diff_sha256 = hash(changed.diff); changed.diff_bytes = Buffer.byteLength(changed.diff);
 assert.throws(() => reviewCompleteMixedZoneMovesFile(changed, shas), undefined, id); cases.push({id, result: 'rejected'});}
for (const subject of packet.subjects) {
 const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean);
 for (const [i, identity] of subject.complete_changed_files.entries()) {
  if (identity.status === 'M') continue;
  const diff = parts[i], original = {...subject, members: [subject.members[i]], complete_changed_files: [identity], diff,
   diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length};
  const hunks = reviewCompleteMixedZoneMovesFile(original, shas); assert.equal(hunks.length, original.original_hunks);
  const added = identity.status === 'A', side = added ? 'before' : 'after';
  assert.equal(original.members[0][side].text, ''); assert.equal(original.members[0][side].git_blob, '0'.repeat(40));
  validated.push({sha: subject.sha, path: identity.path, status: identity.status, absent_side: side, hunks: hunks.length});
  reject(identity.path + ':missing-mode-header', original, n => {const before = n.diff;
   n.diff = n.diff.replace(/^(?:new|deleted) file mode 100644\n/m, ''); assert.notEqual(n.diff, before);});
  reject(identity.path + ':wrong-dev-null', original, n => {const before = n.diff;
   n.diff = n.diff.replace('/dev/null', 'a/unreviewed.ts'); assert.notEqual(n.diff, before);});
  reject(identity.path + ':nonempty-absent-image', original, n => {const raw = n.members[0][side];
   raw.text = 'unreviewed absent-body content\n'; raw.sha256 = hash(raw.text); raw.bytes = Buffer.byteLength(raw.text);});
  reject(identity.path + ':silently-treated-as-M', original, n => {n.complete_changed_files[0].status = 'M';});
  reject(identity.path + ':zero-range-offset-drift', original, n => {const before = n.diff;
   n.diff = added ? n.diff.replace('@@ -0,0 ', '@@ -1,0 ') : n.diff.replace(' +0,0 @@', ' +1,0 @@'); assert.notEqual(n.diff, before);});
 }
}
assert.deepEqual(validated.map(n => n.status).sort(), ['A', 'A', 'A', 'D']); assert.equal(cases.length, 20);
const report = {schema_version: 1, line: packet.line, validated_file_lifecycles: validated, negative_controls: 20, cases,
 producer: {path: prefix + 'lifecycle-controls.mjs', sha256: hash(read(prefix + 'lifecycle-controls.mjs'))},
 authenticator: {path: prefix + 'authenticator.mjs', sha256: hash(read(prefix + 'authenticator.mjs'))},
 original_bytes_changed: false, source_executed: false, semantic_decisions_pending: 4, actual_native_or_floor_qualified: false, g11_claim: 'not-passed'};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: packet.line, lifecycle_members: 4, negative_controls: 20, semantic_decisions_pending: 4}));
