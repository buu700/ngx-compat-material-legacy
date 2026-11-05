# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact title reference controls using authenticated historical DATA.

The callbacks are pure DATA fixtures; this test does not construct or qualify
the actual private source lane or grant source-owner admission.
"""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

NODE_PROBE = r"""
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ts = require('typescript');
const root = process.argv[1];
const hash = raw => crypto.createHash('sha256').update(raw).digest('hex');
const verifyImage = (ref, raw) => { assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256); };
const inventoryPath = 'compatibility/rc/c04-inventory-owner-inputs.json';
const titlePath = 'compatibility/rc/21x-c04-dialog-title-replacement-canonical-admitted-transition.json';
const inventoryRaw = fs.readFileSync(root + '/' + inventoryPath);
const titleRaw = fs.readFileSync(root + '/' + titlePath);
assert.equal(inventoryRaw.length, 12144);
assert.equal(hash(inventoryRaw), '0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc');
assert.equal(titleRaw.length, 4410);
assert.equal(hash(titleRaw), '87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea');
const inventory = JSON.parse(inventoryRaw);
const title = JSON.parse(titleRaw);
assert.equal(inventory.line, '21.x');
assert.equal(title.line, '21.x');
const allowed = [
  'scripts/upstream-dialog-title-admission.cjs',
  'scripts/upstream-dialog-title-native-evidence.mjs',
];
const oldRefs = new Map(title.source_members.map(row => [row.path, row]));
const newRefs = new Map(inventory.source_members.map(row => [row.path, row]));
const transitions = inventory.historical_handler_metadata;
assert.equal(transitions.length, 2);
assert.deepEqual(transitions.map(row => row.before.path), allowed);
assert.deepEqual([...oldRefs.keys()].filter(path => allowed.includes(path)).sort(), [...allowed].sort());

// Authenticate only the two immutable Git before blobs as bytes. No historic
// handler/program is imported or evaluated.
const gitEnv = {...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'};
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete gitEnv[key];
const gitInput = transitions.map(row => row.before_parent + ':' + row.before.path).join('\n') + '\n';
const batch = cp.execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c',
  'maintenance.auto=0', 'cat-file', '--batch'], {cwd: root, env: gitEnv, input: gitInput});
let cursor = 0;
const beforeImages = new Map();
for (const row of transitions) {
  assert.equal(row.before_parent, '8432c416934b3592581b526125a0df97077bb4cf');
  const headerEnd = batch.indexOf(10, cursor);
  assert.ok(headerEnd > cursor);
  const fields = batch.subarray(cursor, headerEnd).toString().split(' ');
  assert.equal(fields.length, 3);
  const [blob, kind, sizeText] = fields;
  assert.match(blob, /^[0-9a-f]{40}$/);
  assert.equal(kind, 'blob');
  assert.match(sizeText, /^(?:0|[1-9][0-9]*)$/);
  const size = Number(sizeText);
  assert.equal(size, row.before.bytes);
  const before = batch.subarray(headerEnd + 1, headerEnd + 1 + size);
  assert.equal(before.length, size);
  assert.equal(batch[headerEnd + 1 + size], 10);
  assert.equal(crypto.createHash('sha1').update('blob ' + size + '\0').update(before).digest('hex'), blob);
  assert.equal(hash(before), row.before.sha256);
  assert.deepEqual(row.before, oldRefs.get(row.before.path));
  cursor = headerEnd + size + 2;

  let afterText = before.toString('utf8');
  assert.equal(Buffer.from(afterText).compare(before), 0, 'before image must be UTF-8 text');
  assert.ok(Array.isArray(row.literal_edits) && row.literal_edits.length > 0);
  for (const edit of row.literal_edits) {
    assert.equal(afterText.split(edit.before).length, 2, 'literal edit must match exactly once');
    afterText = afterText.replace(edit.before, edit.after);
  }
  const after = Buffer.from(afterText);
  const computedAfter = {path: row.before.path, sha256: hash(after), bytes: after.length};
  verifyImage(row.after, after);
  assert.deepEqual(row.after, computedAfter);
  assert.deepEqual(newRefs.get(row.after.path), computedAfter);
  const physicalAfter = fs.readFileSync(root + '/' + row.after.path);
  assert.deepEqual({path: row.after.path, sha256: hash(physicalAfter), bytes: physicalAfter.length}, computedAfter);
  assert.deepEqual(physicalAfter, after, 'current physical title handler must equal authenticated literal afterimage');
  beforeImages.set(row.before.path, before);
}
assert.equal(cursor, batch.length, 'consume the complete Git DATA batch');

// AST-extract the exact private helper, with no module imports or owner setup.
const ownerPath = root + '/scripts/packed-upstream-ledger-epoch.mjs';
const ownerText = fs.readFileSync(ownerPath, 'utf8');
const ownerAst = ts.createSourceFile(ownerPath, ownerText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ownerAst.parseDiagnostics.length, 0);
const declarations = ownerAst.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'titleOwnerPhysicalReference');
assert.equal(declarations.length, 1, 'exact maintained private helper declaration');
const callsites = [];
const visit = node => {
  if (ts.isCallExpression(node) && node.expression.getText(ownerAst) === 'titleOwnerPhysicalReference') {
    assert.equal(node.arguments[1]?.getText(ownerAst), 'sourceLane');
    callsites.push(node);
  }
  ts.forEachChild(node, visit);
};
visit(ownerAst);
assert.equal(callsites.length, 2, 'physical bridge is present in both bound-reference routes');
for (const call of callsites) {
  const lineStart = ownerText.lastIndexOf('\n', call.getStart(ownerAst)) + 1;
  const lineEnd = ownerText.indexOf('\n', call.end);
  const line = ownerText.slice(lineStart, lineEnd < 0 ? ownerText.length : lineEnd);
  const qualify = line.indexOf('.map(ref=>repairs.qualify(ref)??ref)');
  const bridge = line.indexOf('.map(ref=>titleOwnerPhysicalReference(ref,sourceLane))');
  const deduplicate = line.indexOf('.map(ref=>[ref.path,ref])');
  assert.ok(qualify >= 0 && qualify < bridge && bridge < deduplicate,
    'bridge must follow qualify and precede Map deduplication');
}
let identityCalls = 0;
const helper = Function('assert', 'Buffer', 'hash', 'assertBaseClassRemovalSourceInspectorIdentity',
  'return (' + declarations[0].getText(ownerAst) + ');')(
    assert, Buffer, hash, () => { identityCalls++; });
const afterImages = new Map(transitions.map(row => [row.after.path, fs.readFileSync(root + '/' + row.after.path)]));
const beforeByPath = new Map(transitions.map(row => [row.before.path, row.before]));
const afterByPath = new Map(transitions.map(row => [row.after.path, row.after]));
const makeLane = (readOverride, compareOverride) => {
  const calls = {read: 0, compare: 0, compared: []};
  return {
    calls,
    read(path) {
      calls.read++;
      return readOverride ? readOverride(path) : Buffer.from(afterImages.get(path));
    },
    comparisonReference(current) {
      calls.compare++;
      calls.compared.push({...current});
      if (compareOverride) return compareOverride(current);
      const expected = afterByPath.get(current.path);
      assert.ok(expected, 'no registered physical current title identity');
      assert.deepEqual(current, expected, 'comparison callback receives exact current physical identity');
      return beforeByPath.get(current.path);
    },
  };
};
const ref = row => ({...row, role: 'retained-binding'});

// Both changed physical handlers bridge only to their authenticated old refs.
for (const row of transitions) {
  identityCalls = 0;
  const lane = makeLane();
  const original = ref(row.before);
  const result = helper(original, lane);
  assert.deepEqual(result, {...original, ...row.after});
  assert.notStrictEqual(result, original);
  assert.equal(identityCalls, 1);
  assert.equal(lane.calls.read, 1);
  assert.equal(lane.calls.compare, 1);
  assert.deepEqual(lane.calls.compared, [row.after]);
}

// Same physical identity returns the caller reference without history lookup.
{
  const row = transitions[0];
  const lane = makeLane();
  const currentRef = ref(row.after);
  assert.strictEqual(helper(currentRef, lane), currentRef);
  assert.equal(lane.calls.read, 1);
  assert.equal(lane.calls.compare, 0);
}

// Old-reference hash, size, and returned comparison path are all exact gates.
{
  const row = transitions[0];
  const lane = makeLane();
  assert.throws(() => helper(ref({...row.before, sha256: '1'.repeat(64)}), lane));
}
{
  const row = transitions[0];
  const lane = makeLane();
  assert.throws(() => helper(ref({...row.before, bytes: row.before.bytes + 1}), lane));
}
{
  const row = transitions[0];
  const lane = makeLane(null, current => ({...beforeByPath.get(current.path), path: 'scripts/wrong-title-handler.mjs'}));
  assert.throws(() => helper(ref(row.before), lane));
}

// An unregistered comparison identity cannot translate an old binding.
{
  const row = transitions[0];
  const lane = makeLane(null, current => current);
  assert.throws(() => helper(ref(row.before), lane));
}

// Changed current bytes are rejected by the pure DATA mapping callback.
{
  const row = transitions[0];
  const lane = makeLane(path => {
    const bytes = Buffer.from(afterImages.get(path));
    bytes[0] ^= 1;
    return bytes;
  });
  assert.throws(() => helper(ref(row.before), lane), /comparison callback receives exact current physical identity/);
  assert.equal(lane.calls.compare, 1);
}

// A corrupted afterimage fails its independently authenticated SHA/size.
{
  const row = transitions[0];
  const corrupted = Buffer.from(afterImages.get(row.after.path));
  corrupted[0] ^= 1;
  assert.throws(() => verifyImage(row.after, corrupted));
}

// Non-Buffer read output is refused before comparison.
{
  const row = transitions[0];
  const lane = makeLane(() => new Uint8Array(afterImages.get(row.after.path)));
  assert.throws(() => helper(ref(row.before), lane));
  assert.equal(lane.calls.compare, 0);
}

// Paths outside the two fixed handlers pass through without identity or reads.
{
  identityCalls = 0;
  const lane = makeLane(() => { throw new Error('unowned path read'); }, () => { throw new Error('unowned path comparison'); });
  const unowned = {path: 'scripts/unowned.mjs', sha256: 'a'.repeat(64), bytes: 7};
  assert.strictEqual(helper(unowned, lane), unowned);
  assert.equal(identityCalls, 0);
  assert.deepEqual(lane.calls, {read: 0, compare: 0, compared: []});
}

// Pure ordering control: identity guard failure occurs before either DATA callback.
{
  const row = transitions[0];
  const sentinel = new Error('identity guard sentinel');
  const lane = makeLane();
  const cold = Function('assert', 'Buffer', 'hash', 'assertBaseClassRemovalSourceInspectorIdentity',
    'return (' + declarations[0].getText(ownerAst) + ');')(
      assert, Buffer, hash, () => { throw sentinel; });
  assert.throws(() => cold(ref(row.before), lane), error => error === sentinel);
  assert.deepEqual(lane.calls, {read: 0, compare: 0, compared: []});
}
"""


class TitleOwnerPhysicalReferenceTests(unittest.TestCase):
    def test_pure_data_controls_for_exact_private_helper(self):
        result = subprocess.run(
            ['node', '-e', NODE_PROBE, str(ROOT)],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
