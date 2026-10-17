/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact unterminated-before / terminated-after hunk representation, not Sass execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2], out = process.argv[3], read = p => readFileSync(resolve(root, p));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = text => createHash('sha1').update('blob ' + Buffer.byteLength(text) + '\0').update(text).digest('hex');
const prefix = 'compatibility/rc/mixed-theming-source-';
const {reviewCompleteMixedThemingFile} = await import(pathToFileURL(resolve(root, prefix + 'authenticator.mjs')));
const packet = JSON.parse(gunzipSync(read(prefix + 'subjects.json.gz'))), shas = packet.subjects.map(n => n.sha);
const subject = packet.subjects.find(n => n.sha === 'a28b5b0ace56e005d6e9100bbd76d87c33d254ac');
const index = subject.members.findIndex(n => n.path === 'integration/harness-e2e-cli/src/styles.scss');
const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean);
const original = {...subject, members: [subject.members[index]], complete_changed_files: [subject.complete_changed_files[index]],
  diff: parts[index], diff_sha256: hash(parts[index]), diff_bytes: Buffer.byteLength(parts[index]), original_hunks: (parts[index].match(/^@@ /gm) || []).length};
const marker = '\\ No newline at end of file';
assert.equal(original.members[0].before.text.endsWith('\n'), false); assert.equal(original.members[0].after.text.endsWith('\n'), true);
const valid = reviewCompleteMixedThemingFile(original, shas); assert.equal(valid.length, original.original_hunks);
const cases = [];
function reject(id, mutate) {const changed = structuredClone(original); mutate(changed);
  changed.diff_sha256 = hash(changed.diff); changed.diff_bytes = Buffer.byteLength(changed.diff);
  assert.throws(() => reviewCompleteMixedThemingFile(changed, shas), undefined, id); cases.push({id, result: 'rejected'});}
reject('missing-marker', n => {n.diff = n.diff.replace(marker + '\n', '');});
reject('duplicate-marker', n => {n.diff = n.diff.replace(marker, marker + '\n' + marker);});
reject('unknown-marker-text', n => {n.diff = n.diff.replace(marker, '\\ Missing newline');});
reject('marker-after-header', n => {n.diff = n.diff.replace(marker + '\n', '').replace(/(@@[^\n]+\n)/, '$1' + marker + '\n');});
reject('marker-after-added-line', n => {n.diff = n.diff.replace(marker + '\n', '').replace(/(^\+[^+][^\n]*\n)/m, '$1' + marker + '\n');});
reject('marker-before-first-hunk', n => {n.diff = n.diff.replace(marker + '\n', '').replace(/^@@ /m, marker + '\n@@ ');});
function rebind(n, side, text) {const row = n.members[0][side]; row.text = text; row.sha256 = hash(text);
  row.bytes = Buffer.byteLength(text); row.git_blob = gitBlob(text); n.complete_changed_files[0][side + '_blob'] = row.git_blob;
  n.diff = n.diff.replace(/^index [^\n]+/m, 'index ' + n.members[0].before.git_blob + '..' + n.members[0].after.git_blob + ' 100644');}
reject('fabricated-original-final-newline-with-rebound-blob', n => rebind(n, 'before', n.members[0].before.text + '\n'));
reject('removed-after-final-newline-with-rebound-blob', n => rebind(n, 'after', n.members[0].after.text.slice(0, -1)));
assert.equal(cases.length, 8);
const report = {schema_version: 1, line: packet.line, complete_original_member_authenticated: original.members[0].path,
  original_before_terminated: false, original_after_terminated: true, original_hunks_authenticated: valid.length,
  negative_controls: 8, cases, authenticator: {path: prefix + 'authenticator.mjs', sha256: hash(read(prefix + 'authenticator.mjs'))},
  producer: {path: prefix + 'eof-controls.mjs', sha256: hash(read(prefix + 'eof-controls.mjs'))},
  original_bytes_changed: false, upstream_or_candidate_source_executed: false, semantic_reviews_pending: 4,
  actual_native_or_floor_qualified: false, g11_claim: 'not-passed'};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: packet.line, negative_controls: 8, original_bytes_changed: false}));
