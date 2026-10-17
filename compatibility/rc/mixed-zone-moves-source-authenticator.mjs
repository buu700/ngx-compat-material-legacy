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
const EXACT_MEMBERS = {"d38798a474278c3d4b1533ae3ad7273786be9372": [{"path": "src/cdk/testing/private/mock-ng-zone.ts", "status": "D", "before_mode": "100644", "after_mode": "000000", "before_blob": "5fa5ff1d072a260f0faa4aa1eb670d9cdfd2bc61", "after_blob": "0000000000000000000000000000000000000000"}, {"path": "src/cdk/testing/private/public-api.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "8474b1560a5ef70bdefa3bca0442345a5c35e40f", "after_blob": "65555053d1ec2d80c583d3a0f1916b9908e50cb5"}, {"path": "src/material/chips/chip-grid.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "fcfeeff6122ce8ed5c5f23dc195fa49ac5b850b6", "after_blob": "4f4a34f8f43f6b434e6edd2d54c5d6ccf4e810db"}, {"path": "src/material/chips/chip-listbox.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "3adc9c01a5abac6c6bf5098f8f3fc5a1bdbe12d8", "after_blob": "a0a41f7614d57ca3441b56a8710a72e26992814c"}, {"path": "tslint.json", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "91f25693a713c63acd0310035db753b1b377d77e", "after_blob": "a31110447e38d2bb7b69eb390568bfdc177d4a54"}, {"path": "yarn.lock", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "2e1b0ad891964cc02023ac815a4ddc968e14f71d", "after_blob": "ef6f88fa3633e4ce1b5b48b2f6893cbfb1d0b55f"}], "16d946e7ef8a0908d3b3b65820f757f832b7d646": [{"path": "src/cdk/overlay/dispatchers/overlay-keyboard-dispatcher.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "c239266135cc9b43e0cdb9d24c2674cb87c3445d", "after_blob": "7a103af0b6b600be07b3d4174459d7703a5284c6"}, {"path": "tslint.json", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "a31110447e38d2bb7b69eb390568bfdc177d4a54", "after_blob": "9f46ae5744a1b375c4664cd28580a230ce70ec07"}], "04d3b63de2fb843beb55836e39e930c3342d26f1": [{"path": "src/cdk/a11y/focus-trap/focus-trap.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "8af57b940bd1ff0c2a9eeaf675c0e74370ae4955", "after_blob": "a0d3b07df439de817b60280c2d821092cee8b0ea"}, {"path": "src/cdk/menu/menu-base.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "4af909003931a9951370147968ae76a4b66b35e9", "after_blob": "031e323abec30c17019c4e09280cbe38810617d1"}, {"path": "src/cdk/menu/menu-trigger.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "00f0a902171af685bd9b9e7629585d3d15286e9b", "after_blob": "a7a681d236e30e358053ec98c4167c9e6c56eace"}, {"path": "src/cdk/menu/menu.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "122d8bef7795b4b957dc98bb0180162945024e55", "after_blob": "ce117ca6bf62ef9f0f2d1828f581b5e956b0222e"}, {"path": "src/cdk/table/table.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "247163a324e1b56e723b7faf3ca0682b26f3059d", "after_blob": "41b3cb86254f517ce236684acf004b08ec91082a"}, {"path": "src/cdk/table/text-column.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "9d0f06f89ae75ca30569fbfaeac54520c99b7bcb", "after_blob": "3bdd9616204fe18b522e105dfbafedf3a9bbc7f7"}, {"path": "src/cdk/text-field/autofill.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "2268559e1ac4f6034f6fa7743b3dfcf56de535ea", "after_blob": "6f14e907430c2fac74a2d02235c4fd094ca608ee"}, {"path": "src/cdk/text-field/autofill.zone.spec.ts", "status": "A", "before_mode": "000000", "after_mode": "100644", "before_blob": "0000000000000000000000000000000000000000", "after_blob": "5efa4704cca551621a763b8ec6805377e868bcc8"}, {"path": "src/cdk/text-field/autosize.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "7338b5dc5faa62e777541ad58c1341a3c35d255d", "after_blob": "ad3b159484d9d497c1916d36bd1d235d26810f47"}, {"path": "src/cdk/tree/tree.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "2e21b1bb1a6223704f09fdfd40fbf47400a85f6a", "after_blob": "db8d9eedbb1518829145ffcefc1e44de034a10fe"}, {"path": "src/cdk/tree/tree.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "2b1ee04a1772662e629dce2432df3886b03e0f2b", "after_blob": "9746981bdf4f6065cb41115886dadc5abe63dadd"}], "df8adda2164bdf5ef10a0d15225d2b22209f3df4": [{"path": "src/cdk/scrolling/scroll-dispatcher.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "228b21b6c428aa9317b5ebfbceb04d971468bce5", "after_blob": "d46f649d366ff8a87a0e5b534d0e19cbeb883381"}, {"path": "src/cdk/scrolling/scroll-dispatcher.zone.spec.ts", "status": "A", "before_mode": "000000", "after_mode": "100644", "before_blob": "0000000000000000000000000000000000000000", "after_blob": "b50d0a6a50993818cac333b53b418a6c99af92f3"}, {"path": "src/cdk/scrolling/viewport-ruler.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "78a87f351dd9f1727a377aabe42d87af50d8b6e3", "after_blob": "1b33803e9c165c93e4784591b51798d6dd009e3f"}, {"path": "src/cdk/scrolling/viewport-ruler.zone.spec.ts", "status": "A", "before_mode": "000000", "after_mode": "100644", "before_blob": "0000000000000000000000000000000000000000", "after_blob": "ef68ae5de9c58118c08dfdb8319a690050de328c"}, {"path": "src/cdk/text-field/autofill.zone.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "5efa4704cca551621a763b8ec6805377e868bcc8", "after_blob": "31a8d5a87b3e39d11148fb48a751f09deffde1fa"}, {"path": "src/dev-app/main.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "19e8d61e4d6f22f9bc78407fbe67d768400419ba", "after_blob": "4766971d7769b95abcd944e2c0723e9695b96a96"}, {"path": "src/material-experimental/popover-edit/popover-edit.spec.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "a66e632b9906eae1f6dd19299bf793b7c3b1180e", "after_blob": "070c3edc673dbeb952dd82a41eb563ed63964092"}, {"path": "tools/tslint-rules/noZoneDependenciesRule.ts", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "a3e888cba2b43b33eab2e5a21a49779f13e05a48", "after_blob": "5f050b9a198c3489703ee1478dbf95cdc06a082c"}, {"path": "tslint.json", "status": "M", "before_mode": "100644", "after_mode": "100644", "before_blob": "0bbce003ac8f0c81e2cf39164d0b478120db9f94", "after_blob": "ee66cbd96d369abba6f9dfc92370b6b756a161a9"}]};
export function reviewCompleteMixedZoneMovesFile(subject, registeredShas) {
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
