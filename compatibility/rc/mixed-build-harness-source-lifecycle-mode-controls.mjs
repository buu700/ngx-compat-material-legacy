/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact complete added/deleted bodies and registered executable modes; execute no original source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2], out = process.argv[3], read = p => readFileSync(resolve(root, p));
const hash = x => createHash('sha256').update(x).digest('hex'), prefix = 'compatibility/rc/mixed-build-harness-source-';
const {reviewCompleteMixedBuildHarnessFile} = await import(pathToFileURL(resolve(root, prefix + 'authenticator.mjs')));
const packet = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))), shas = packet.subjects.map(n => n.sha), cases = [], validated = [];
function reject(id, original, mutate) {
  const changed = structuredClone(original); mutate(changed);
  changed.diff_sha256 = hash(changed.diff); changed.diff_bytes = Buffer.byteLength(changed.diff);
  assert.throws(() => reviewCompleteMixedBuildHarnessFile(changed, shas), undefined, id); cases.push({id, result: 'rejected'});
}
for (const subject of packet.subjects) {
  const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean);
  for (const [i, identity] of subject.complete_changed_files.entries()) {
    const executable = [identity.before_mode, identity.after_mode].includes('100755');
    if (identity.status === 'M' && !executable) continue;
    const diff = parts[i], original = {...subject, members: [subject.members[i]], complete_changed_files: [identity], diff,
      diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length};
    const hunks = reviewCompleteMixedBuildHarnessFile(original, shas); assert.equal(hunks.length, original.original_hunks);
    validated.push({sha: subject.sha, path: identity.path, status: identity.status, before_mode: identity.before_mode, after_mode: identity.after_mode, hunks: hunks.length});
    if (identity.status !== 'M') {
      const added = identity.status === 'A', side = added ? 'before' : 'after';
      assert.equal(original.members[0][side].text, ''); assert.equal(original.members[0][side].git_blob, '0'.repeat(40));
      reject(identity.path + ':missing-mode-header', original, n => {const before = n.diff;
        n.diff = n.diff.replace(/^(?:new|deleted) file mode (?:100644|100755)\n/m, ''); assert.notEqual(n.diff, before);});
      reject(identity.path + ':wrong-dev-null', original, n => {const before = n.diff;
        n.diff = n.diff.replace('/dev/null', 'a/unreviewed.ts'); assert.notEqual(n.diff, before);});
      reject(identity.path + ':nonempty-absent-image', original, n => {const raw = n.members[0][side];
        raw.text = 'unreviewed absent-body content\n'; raw.sha256 = hash(raw.text); raw.bytes = Buffer.byteLength(raw.text);});
      reject(identity.path + ':silently-treated-as-M', original, n => {n.complete_changed_files[0].status = 'M';});
      reject(identity.path + ':zero-range-offset-drift', original, n => {const before = n.diff;
        n.diff = added ? n.diff.replace('@@ -0,0 ', '@@ -1,0 ') : n.diff.replace(' +0,0 @@', ' +1,0 @@'); assert.notEqual(n.diff, before);});
    }
    if (executable) {
      reject(identity.path + ':executable-diff-mode-stripped', original, n => {const before = n.diff;
        const boundary = n.diff.indexOf('\n@@ '); assert.ok(boundary > 0);
        n.diff = n.diff.slice(0, boundary).replaceAll('100755', '100644') + n.diff.slice(boundary); assert.notEqual(n.diff, before);});
      reject(identity.path + ':executable-identity-and-header-stripped', original, n => {
        for (const side of ['before', 'after']) if (n.complete_changed_files[0][side + '_mode'] === '100755') n.complete_changed_files[0][side + '_mode'] = '100644';
        const boundary = n.diff.indexOf('\n@@ '); assert.ok(boundary > 0);
        n.diff = n.diff.slice(0, boundary).replaceAll('100755', '100644') + n.diff.slice(boundary);
      });
    }
  }
}
assert.deepEqual(validated.map(n => n.status).sort(), ['A', 'A', 'D', 'D', 'D', 'M']);
assert.equal(validated.filter(n => [n.before_mode, n.after_mode].includes('100755')).length, 3); assert.equal(cases.length, 31);
const report = {schema_version: 1, line: packet.line, validated_original_file_states: validated, negative_controls: cases.length, cases,
  producer: {path: prefix + 'lifecycle-mode-controls.mjs', sha256: hash(read(prefix + 'lifecycle-mode-controls.mjs'))},
  authenticator: {path: prefix + 'authenticator.mjs', sha256: hash(read(prefix + 'authenticator.mjs'))},
  original_bytes_changed: false, source_executed: false, semantic_decisions_pending: 4, actual_native_or_floor_qualified: false, g11_claim: 'not-passed'};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: packet.line, lifecycle_members: 5, executable_files: 3, negative_controls: 31, semantic_decisions_pending: 4}));
