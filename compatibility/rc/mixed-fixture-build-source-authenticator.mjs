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
const hash = value => createHash('sha256').update(value).digest('hex');
const gitHash = (kind, value) => createHash('sha1').update(kind + ' ' + Buffer.byteLength(value) + '\0').update(value).digest('hex');
const EXACT_MEMBERS = {"a0eb8b06917b6fc83e13578a8a7358e008844c6f": [{"path": "package.json", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "f45df62abe7394020a72aed1c7e7051709fb248c", "after_blob": "54f9fec63e6ca00c3e2d5e85d1fb48f62f936a74"}, {"path": "src/cdk/portal/portal.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "202f17a0a8a77331dafdab987efcabaaca0c4c4a", "after_blob": "e30197d4b78a2171844bf7cb85378ea6e1ce60c5"}, {"path": "yarn.lock", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "56334fff5cb5b75155c9152e7bb42b5621be18d4", "after_blob": "36c886305d16e06ef60167fc7992293083ab9746"}], "dc3bfc34ebc4ef733a7fedfe341efc0b5e25c4d7": [{"path": "src/cdk/table/table.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "e7604ccd9c0b51c7f12ed82f0556813cd2dd788a", "after_blob": "08b7928386943c8423ccccaf9a1981dfa05623b5"}, {"path": "tslint.json", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "a4b39f1a8481f06387b60f0c83e493cab32327ab", "after_blob": "156971b3c5e4fd4304cc20b4124635896dc7a867"}], "544257ad0f58e70688abe0d80eccaa73d25ba5d8": [{"path": "guides/using-component-harnesses.md", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "f763722e190d5984cdd26698b0bd68a0a3c1b043", "after_blob": "1999b710a69c554a4f5ea70afc7edb4104b382d2"}, {"path": "src/cdk-experimental/accordion/accordion.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "e7700c6de7b12ef6cf2c3e1bccf5c439f536dc36", "after_blob": "60f721d72ee166a7599e0f290aa2be9fa48d217e"}, {"path": "src/cdk-experimental/listbox/listbox.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "1a5ce3d785b69d8b5553cd457310de3e0f00424a", "after_blob": "0d89b5705c17600bd86af6f3428c2c226cfc6a3f"}, {"path": "src/cdk-experimental/radio/radio.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "cf7300521dabd65d0ea09616e5536773b941de2a", "after_blob": "639962e8588955ea93ad45eb7b423ae3ee261fbc"}, {"path": "src/cdk/overlay/overlay.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "8d6740c1e254e9a0ac21b63fa8439114f606afed", "after_blob": "b63cefa746ef1d956a9ed5c46ae22626c52d10bd"}], "2b82d638c90df83d44613b81c2eeeab24821e8b2": [{"path": "goldens/material/chips/index.api.md", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "03eaadd8b43d1421084c46768aab545c9ffa9f8a", "after_blob": "bc2fceff84cb096ea41792d9d4e6efe4b2ef4a45"}, {"path": "src/material/chips/chip-grid.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "2fae033dcc220697a7fffab6ffbcee6892c8bcf2", "after_blob": "ba85583bb7b4c6129220f71d030ae6526a3658b4"}]};
export function reviewCompleteMixedFixtureBuildFile(subject, registeredShas) {
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
