/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact finite preceding-source projection only. Never a runtime evidence reader. */
import assert from 'node:assert/strict';
import {reverseNativeDatePackedSource,nativeDateRequirementsBefore} from './native-date-packed-source-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = 'compatibility/rc/selection-comparator-packed-inputs.json';
const pins = {"main": "b9f67e8fba3532e63a231146e8c00a84ca4545e0ca36658d31114f997ad45eaf", "21.x": "50f4c8982967e3953ddad006915a64053ed15b4cb321e45fe5edb19cfb70375c"};
const sourcePaths = new Set([
  "scripts/packed-consumer-aot-smoke.mjs",
  "tests/bidi_isolated_packed_probe.mjs",
  "tests/chip_menu_tooltip_packed_contract_probe.mjs",
  "tests/generated_identity_packed_contract_probe.mjs",
  "tests/menu_item_token_packed_contract_probe.mjs",
  "tests/packed_required_contract_admission.mjs",
  "tests/radio_identity_packed_contract_probe.mjs",
  "tests/select_detach_packed_contract_probe.mjs",
  "tests/select_focus_click_packed_contract_probe.mjs",
  "tests/table_onpush_packed_contract_probe.mjs",
  "tests/value_accessor_packed_contract_probe.mjs",
  "scripts/upstream-artifact-behavior-evidence.mjs",
  "scripts/upstream-generated-identity-evidence.mjs",
  "scripts/upstream-bidi-evidence.mjs",
  "scripts/check-upstream-audit-disposition.mjs",
  "scripts/bidi-isolated-packed-source-requalification.mjs",
  "scripts/bidi-isolated-packed-evidence-requalification.mjs",
  "scripts/bidi-peer-source-context.mjs",
  "scripts/bidi-peer-source-judgments.mjs",
  "tests/upstream/bidi-peer-admission.mjs"
]);
const subjectPaths = new Set(['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json']);
const hash = value => createHash('sha256').update(value).digest('hex'), cache = new Map();
export function selectionComparatorSourceContext(readMember = path => readFileSync(resolve(root, path))) {
  const bytes = readMember(inputPath), data = JSON.parse(bytes);
  assert.equal(hash(bytes), pins[data.line], 'selection comparator source inputs changed');
  const stored = readMember(data.prior.path); assert.equal(hash(stored), data.prior.sha256, 'selection comparator preceding archive changed');
  const supplementBytes = readMember(data.supplement.path); assert.equal(hash(supplementBytes), data.supplement.sha256);
  if (cache.has(data.line)) return cache.get(data.line); // All three authenticating byte hashes were checked again.
  const raw = gunzipSync(stored); assert.equal(hash(raw), data.prior.raw_sha256); let prior = JSON.parse(raw);
  assert.equal(prior.line, data.line); assert.equal(prior.source_parent, data.source_parent);
  const supplement = JSON.parse(supplementBytes); assert.equal(supplement.line, data.line); assert.equal(supplement.source_parent, data.source_parent);
  assert.deepEqual(supplement.members.map(row => row.path), ['scripts/bidi-isolated-packed-evidence-requalification.mjs']);
  prior = {...prior, source_paths: [...prior.source_paths, ...supplement.members.map(row => row.path)], members: [...prior.members, ...supplement.members]};
  for (const row of [...prior.members, ...prior.review_subjects]) assert.equal(hash(row.text), row.sha256);
  const result = {data, prior}; cache.set(data.line, result); return result;
}
export function reverseSelectionComparatorSource(path, text, options = {}) {
  if (!sourcePaths.has(path)) return reverseNativeDatePackedSource(path, text, options);
  const {data, prior} = selectionComparatorSourceContext(options.readMember), before = prior.members.find(row => row.path === path);
  assert.ok(before); if (hash(text) === before.sha256) return text;
  text = reverseNativeDatePackedSource(path, text, options);
  if (hash(text) === before.sha256) return text;
  const change = data.source_changes.find(row => row.path === path); assert.ok(change, 'unreviewed selection comparator source path');
  assert.equal(hash(text), change.current_sha256, 'unreviewed selection comparator source change');
  let result = text;
  for (const edit of [...change.edits].reverse()) {
    assert.equal(result.slice(edit.start, edit.end), edit.after, 'inexact selection comparator source edit');
    result = result.slice(0, edit.start) + edit.before + result.slice(edit.end);
  }
  assert.equal(result, before.text, 'complete preceding selection comparator source not recovered'); return result;
}
/** Earlier write-once review tests replay their authenticated preceding subjects;
 * current production readers/CLI and current source admission are tested separately. */
export function readSelectionComparatorBefore(path, readMember) {
  if (!sourcePaths.has(path) && !subjectPaths.has(path)) return readMember(path);
  const {prior} = selectionComparatorSourceContext(readMember);
  if (subjectPaths.has(path)) {
    const row = prior.review_subjects.find(row => row.path === path); assert.ok(row); return Buffer.from(row.text);
  }
  return Buffer.from(reverseSelectionComparatorSource(path, readMember(path).toString(), {readMember}));
}
export function selectionRequirementsBefore(sha, current, line, options = {}) {
  const {data} = selectionComparatorSourceContext(options.readMember);
  const row = data.before_requirements.find(row => row.sha === sha && (row.line === 'any' || row.line === line));
  assert.ok(row, 'unregistered preceding selection context requirements');
  if (JSON.stringify(current) === JSON.stringify(row.definition)) return structuredClone(row.definition);
  current = nativeDateRequirementsBefore(sha, current, line, options);
  if (JSON.stringify(current) === JSON.stringify(row.definition)) return structuredClone(row.definition);
  assert.ok(current && Array.isArray(current.members));
  assert.ok(data.new_dependencies.every(path => current.members.filter(value => value === path).length === 1));
  const reduced = {...current, members: current.members.filter(path => !data.new_dependencies.includes(path))};
  assert.deepEqual(reduced, row.definition, 'preceding runtime requirements changed'); return structuredClone(row.definition);
}
