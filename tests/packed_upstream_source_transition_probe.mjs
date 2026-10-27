/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independently parse the proposed token patch; keep unrelated ledger bytes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const input = JSON.parse(read('compatibility/rc/packed-upstream-source-inputs.json'));
const version = JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
assert.equal(input.line, version.startsWith('21.') ? '21.x' : 'main');
const stored = read(input.transition.path); assert.equal(hash(stored), input.transition.sha256);
const packet = JSON.parse(gunzipSync(stored)); assert.equal(packet.line, input.line);
const beforeBytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'show', input.before_ledger.source_parent + ':' + input.before_ledger.path], {cwd: root, maxBuffer: 16 * 1024 * 1024,
  env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
assert.equal(hash(beforeBytes), input.before_ledger.sha256);
const text = beforeBytes.toString(), source = ts.parseJsonText('ledger.json', text);
assert.equal(source.parseDiagnostics.length, 0);
const object = source.statements[0].expression;
function property(node, key) {
  assert.ok(ts.isObjectLiteralExpression(node));
  const members = node.properties.filter(member => member.name?.text === key);
  assert.equal(members.length, 1); return members[0].initializer;
}
const entries = property(object, 'entries'); assert.ok(ts.isArrayLiteralExpression(entries));
assert.equal(entries.elements.length, 1697);
const bySha = new Map(entries.elements.map(node => [JSON.parse(property(node, 'sha').getText(source)), node]));
assert.equal(bySha.size, 1697);
const allowed = new Set(['evidence_report', 'source_check/evidence_report_sha256',
  ...['modern_chip', 'chip_lifecycle', 'chip_modernization', 'chip_input_api', 'chip_edit']
    .map(name => 'individual_proof/' + name + '_source_scope/source_context_sha256')]);
function apply(updates) {
  const edits = [];
  for (const update of updates) {
    const path = update.path.join('/');
    assert.ok(allowed.has(path) || /^individual_proof\/historical_behavior\/source_members\/\d+\/sha256$/.test(path),
      'unexpected ledger field ' + path);
    let node = bySha.get(update.sha); assert.ok(node);
    for (const part of update.path) node = typeof part === 'number' ? node.elements[part] : property(node, part);
    assert.equal(JSON.parse(node.getText(source)), update.before);
    edits.push({start: node.getStart(source), end: node.end, text: JSON.stringify(update.after)});
  }
  edits.sort((a, b) => a.start - b.start);
  const chunks = []; let end = 0;
  for (const edit of edits) {assert.ok(edit.start >= end); chunks.push(text.slice(end, edit.start), edit.text); end = edit.end;}
  chunks.push(text.slice(end)); return Buffer.from(chunks.join(''));
}
assert.equal(packet.entries.length, 85); assert.equal(packet.literal_token_updates.length, 179);
const after = apply(packet.literal_token_updates);
assert.equal(hash(after), input.after_ledger_sha256, 'independent Node/Python patch observations differ');
const expected = JSON.parse(beforeBytes), actual = JSON.parse(after);
for (const row of packet.entries) {
  const index = expected.entries.findIndex(entry => entry.sha === row.sha), previous = expected.entries[index];
  assert.equal(hash(JSON.stringify(previous, null, 2) + '\n'), row.before_entry_sha256);
  for (const field of ['sha', 'final_disposition', 'reason', 'files', 'review_depth', 'affected_branches'])
    assert.deepEqual(row.after_entry[field], previous[field], 'changed original judgment ' + field);
  expected.entries[index] = row.after_entry;
}
assert.deepEqual(actual, expected);
const rejected = [];
const wrongBefore = structuredClone(packet.literal_token_updates); wrongBefore[0].before = 'wrong value';
assert.throws(() => apply(wrongBefore)); rejected.push('wrong-before-token');
const judgment = structuredClone(packet.literal_token_updates);
judgment.push({sha: packet.entries[0].sha, path: ['final_disposition'], before: 'not-applicable', after: 'inherited'});
assert.throws(() => apply(judgment)); rejected.push('judgment-field-change');
const overlapping = [...packet.literal_token_updates, packet.literal_token_updates[0]];
assert.throws(() => apply(overlapping)); rejected.push('overlapping-token-edits');
const canonicalHash = hash(read(input.before_ledger.path));
assert.ok([input.before_ledger.sha256, input.after_ledger_sha256].includes(canonicalHash), 'unrelated canonical ledger edit');
console.log(JSON.stringify({line: input.line, result: 'pass', proposed_entries: 85, changed_scalar_tokens: 179,
  complete_ledger_entries: 1697, rejected, independent_Node_Python_after_bytes_equal: true,
  unrelated_ledger_bytes_and_all_original_judgments_preserved: true,
  canonical_state_is_exact_before_or_after: true, canonical_applied: canonicalHash === input.after_ledger_sha256,
  producer_sha256: hash(read('tests/packed_upstream_source_transition_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false}));
