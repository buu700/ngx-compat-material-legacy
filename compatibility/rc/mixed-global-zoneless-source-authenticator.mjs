/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact finite M/A/D file lifecycle and complete-byte hunk authentication; no source execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const hash = value => createHash('sha256').update(value).digest('hex');
const gitHash = (kind, value) => createHash('sha1').update(kind + ' ' + Buffer.byteLength(value) + '\0').update(value).digest('hex');
const populationRaw = readFileSync(new URL('./mixed-global-zoneless-source-population.json', import.meta.url));
assert.equal(hash(populationRaw), 'e9a30722766401c8c526ed4aae7a05b7da9f21ea66c11bae2e2bb9d476e2629d');
const EXACT_MEMBERS = JSON.parse(populationRaw);
export function reviewCompleteGlobalZonelessFile(subject, registeredShas) {
  assert.deepEqual(registeredShas, Object.keys(EXACT_MEMBERS)); assert.ok(registeredShas.includes(subject.sha));
  assert.equal(gitHash('commit', subject.raw_commit), subject.sha); assert.equal(hash(subject.raw_commit), subject.raw_commit_sha256);
  const metadata = subject.raw_commit.split('\n\n')[0].split('\n');
  assert.deepEqual(metadata.filter(n => n.startsWith('parent ')).map(n => n.slice(7)), subject.parents);
  assert.ok(metadata.includes('tree ' + subject.tree));
  assert.equal(subject.members.length, 1); assert.equal(subject.complete_changed_files.length, 1);
  const member = subject.members[0], identity = subject.complete_changed_files[0], expected = EXACT_MEMBERS[subject.sha].find(n => n.path === member.path);
  assert.ok(expected); assert.deepEqual(identity, expected); assert.equal(member.path, identity.path);
  const zero = '0'.repeat(40);
  for (const side of ['before', 'after']) {
    const raw = member[side], absent = identity[side + '_mode'] === '000000';
    assert.equal(raw.git_blob, identity[side + '_blob']); assert.equal(hash(raw.text), raw.sha256); assert.equal(Buffer.byteLength(raw.text), raw.bytes);
    if (absent) {assert.equal(raw.git_blob, zero); assert.equal(raw.text, ''); assert.equal(raw.bytes, 0);}
    else {assert.equal(identity[side + '_mode'], '100644'); assert.equal(gitHash('blob', raw.text), raw.git_blob);}
  }
  assert.equal(hash(subject.diff), subject.diff_sha256); assert.equal(Buffer.byteLength(subject.diff), subject.diff_bytes);
  const lines = subject.diff.split('\n'); assert.equal(lines.at(-1), ''); assert.equal(lines[0], `diff --git a/${member.path} b/${member.path}`);
  let at;
  if (identity.status === 'M') {
    assert.deepEqual(lines.slice(1, 4), [`index ${member.before.git_blob}..${member.after.git_blob} 100644`, '--- a/' + member.path, '+++ b/' + member.path]); at = 4;
  } else {
    assert.ok(['A', 'D'].includes(identity.status));
    const added = identity.status === 'A';
    assert.deepEqual(lines.slice(1, 5), [added ? 'new file mode 100644' : 'deleted file mode 100644',
      `index ${member.before.git_blob}..${member.after.git_blob}`, added ? '--- /dev/null' : '--- a/' + member.path,
      added ? '+++ b/' + member.path : '+++ /dev/null']); at = 5;
  }
  const tokenize = text => {if (!text) return []; const terminated = text.endsWith('\n'), rows = text.split('\n');
    if (terminated) rows.pop(); return rows.map((text, i) => ({text, terminated: terminated || i < rows.length - 1}));};
  const before = tokenize(member.before.text), result = [], hunks = [], marker = '\\ No newline at end of file'; let cursor = 0;
  while (at < lines.length - 1) {
    const start = at, header = lines[at++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/); assert.ok(header);
    const oldCount = header[2] === undefined ? 1 : Number(header[2]), newCount = header[4] === undefined ? 1 : Number(header[4]);
    const offset = Number(header[1]) - (oldCount ? 1 : 0), newOffset = Number(header[3]) - (newCount ? 1 : 0);
    assert.ok(offset >= cursor && offset <= before.length); result.push(...before.slice(cursor, offset)); cursor = offset;
    assert.equal(result.length, newOffset); let removed = 0, added = 0;
    while (at < lines.length - 1 && !lines[at].startsWith('@@ ')) {
      const kind = lines[at][0], text = lines[at].slice(1), unterminated = lines[at + 1] === marker; assert.ok([' ', '-', '+'].includes(kind));
      if (kind !== '+') {const row = before[cursor++]; assert.ok(row); assert.equal(row.text, text); assert.equal(row.terminated, !unterminated); removed++;}
      if (kind !== '-') {result.push({text, terminated: !unterminated}); added++;}
      at += unterminated ? 2 : 1;
    }
    assert.equal(removed, oldCount); assert.equal(added, newCount);
    hunks.push({path: member.path, status: identity.status, header: lines[start], sha256: hash(lines.slice(start, at).join('\n') + '\n')});
  }
  result.push(...before.slice(cursor)); assert.ok(result.every((row, i) => row.terminated || i === result.length - 1));
  assert.equal(result.map(n => n.text + (n.terminated ? '\n' : '')).join(''), member.after.text);
  assert.equal(hunks.length, subject.original_hunks); return hunks;
}
