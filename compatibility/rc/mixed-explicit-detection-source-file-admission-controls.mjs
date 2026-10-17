/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Modified-file source admission controls; no original framework/source execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2], out = process.argv[3], prefix = 'compatibility/rc/mixed-explicit-detection-source-';
const read = p => readFileSync(resolve(root, p)), hash = x => createHash('sha256').update(x).digest('hex');
const {reviewCompleteExplicitDetectionFile: review} = await import(pathToFileURL(resolve(root, prefix + 'authenticator.mjs')));
const packet = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))), subject = packet.subjects[0];
assert.equal(packet.subjects.length, 1); assert.equal(subject.members.length, 220);
const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), shas = [subject.sha], cases = [];
function reject(id, source, mutate) {
  const changed = structuredClone(source); mutate(changed);
  changed.diff_sha256 = hash(changed.diff); changed.diff_bytes = Buffer.byteLength(changed.diff);
  assert.throws(() => review(changed, shas), undefined, id); cases.push({id, result: 'rejected'});
}
for (const i of [0, Math.floor(subject.members.length / 2), subject.members.length - 1]) {
  const diff = parts[i], identity = subject.complete_changed_files[i];
  const single = {...subject, members: [subject.members[i]], complete_changed_files: [identity], diff,
    diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length};
  review(single, shas);
  reject(identity.path + ':executable-mode', single, n => {n.complete_changed_files[0].after_mode = '100755';});
  reject(identity.path + ':invented-added-lifecycle', single, n => {n.complete_changed_files[0].status = 'A'; n.complete_changed_files[0].before_mode = '000000';});
  reject(identity.path + ':wrong-hunk-position', single, n => {const old = n.diff; n.diff = n.diff.replace(/^@@ -\d+/m, '@@ -999999'); assert.notEqual(n.diff, old);});
  reject(identity.path + ':rewritten-original-body', single, n => {const raw = n.members[0].after; raw.text += '\n/* rewritten original */\n'; raw.sha256 = hash(raw.text); raw.bytes = Buffer.byteLength(raw.text);});
}
assert.equal(cases.length, 12);
const report = {schema_version: 1, line: packet.line, complete_source_files_authenticated_separately: 220,
  negative_controls: 12, cases, producer: {path: prefix + 'file-admission-controls.mjs', sha256: hash(read(prefix + 'file-admission-controls.mjs'))},
  authenticator: {path: prefix + 'authenticator.mjs', sha256: hash(read(prefix + 'authenticator.mjs'))},
  source_executed: false, semantic_decisions_pending: 1, actual_native_or_floor_qualified: false, g11_claim: 'not-passed'};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: packet.line, complete_files: 220, negative_controls: 12, semantic_decisions_pending: 1}));
