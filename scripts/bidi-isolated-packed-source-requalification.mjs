/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact reviewed source projection only; never product/runtime qualification. */
import assert from 'node:assert/strict';
import {reverseSelectionComparatorSource, selectionRequirementsBefore} from './selection-comparator-packed-source-context.mjs';
import {readBidiPeerReviewSubject} from './bidi-peer-source-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = 'compatibility/rc/bidi-isolated-packed-source-inputs.json';
const pins = {"main": "da2290545c4352ca80923c7f8c0a83a1e776c30089b6df2df24917367261021f", "21.x": "15f1fd1b29ff25ebf4ec78345c11b62b8f8867aa8dda25c46a2f7c350776ab00"};
const cache = new Map();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const newDependencies = ['scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs'];
function load(line, readMember) {
  assert.ok(Object.hasOwn(pins, line), 'unknown isolated bidi source line');
  const read = readMember || (path => readFileSync(resolve(root, path))), input = read(inputPath);
  assert.equal(hash(input), pins[line], 'isolated bidi source inputs changed');
  const priorCache = cache.get(line), data = priorCache?.data || JSON.parse(input);
  assert.equal(data.line, line); const stored = read(data.prior.path); assert.equal(hash(stored), data.prior.sha256);
  if (priorCache) return priorCache; // Both authenticating byte hashes were checked again.
  const raw = gunzipSync(stored); assert.equal(hash(raw), data.prior.raw_sha256); const before = JSON.parse(raw);
  assert.equal(before.line, line); assert.equal(before.source_parent, data.source_parent);
  for (const member of before.members) assert.equal(hash(member.text), member.sha256);
  const result = {data, before}; cache.set(line, result); return result;
}
/** Reconstruct the complete predecessor only after checking the entire current
 * subject and every exact edited span. No live file or expected hash is changed. */
export function reverseBidiIsolatedPackedSource(path, text, line, options = {}) {
  const {data, before} = load(line, options.readMember), change = data.changes.find(row => row.path === path);
  if (!change) return text; // Unrelated paths retain the older finite reader's pass-through contract.
  const original = change && before.members.find(row => row.path === path);
  if (original && hash(text) === original.sha256) return text; // The older review already projected its own subject.
  try {text = reverseSelectionComparatorSource(path, text, options);}
  catch (cause) {throw new Error('unreviewed isolated bidi source change', {cause});}
  const previous = before.members.find(row => row.path === path); assert.ok(previous);
  if (hash(text) === previous.sha256) return text; // An already-authenticated earlier projection.
  assert.equal(hash(text), change.current_sha256, 'unreviewed isolated bidi source change');
  let restored = text;
  for (const edit of [...change.edits].reverse()) {
    assert.equal(restored.slice(edit.start, edit.end), edit.after, 'inexact isolated bidi edit');
    restored = restored.slice(0, edit.start) + edit.before + restored.slice(edit.end);
  }
  assert.equal(restored, previous.text, 'complete preceding source not recovered');
  assert.equal(hash(restored), previous.sha256); return restored;
}
/** Old review generators inspect their immutable subjects, then current tests
 * separately bind the current production reader and all current dependencies. */
export function readBidiIsolatedBefore(path, readMember) {
  const bytes = readMember(path);
  if (!path.startsWith('scripts/') && !path.startsWith('tests/')) return bytes;
  const pkg = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  const line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  return Buffer.from(reverseBidiIsolatedPackedSource(path, bytes.toString(), line, {readMember}));
}
export function bidiRequirementsBefore(sha, current, line, options = {}) {
  current = selectionRequirementsBefore(sha, current, line, options);
  const {before} = load(line, options.readMember), row = before.before_requirements.find(row => row.sha === sha);
  assert.ok(row, 'unregistered preceding bidi-context requirement'); const previous = row.requirements;
  const reduced = {...current, members: current.members.filter(path => !newDependencies.includes(path))};
  assert.deepEqual(reduced, previous, 'earlier behavior requirement changed');
  assert.ok(newDependencies.every(path => current.members.filter(value => value === path).length === 1));
  return structuredClone(previous);
}
export function bidiChipSourceLedger(readMember) {
  const pkg = JSON.parse(readMember('projects/ngx-material-legacy/package.json')), line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  const {before} = load(line, readMember), subject = before.chip_source_subject;
  assert.equal(hash(subject.text), subject.sha256); return Buffer.from(subject.text);
}
/** Replay the earlier authored-use test's exact review subject. Current stores
 * may differ only by this worksheet's review pointer and one history receipt. */
export function readBidiIsolatedReviewBefore(path, readMember) {
  const isStore = ['compatibility/f10/authored-dependency-dispositions.json',
    'compatibility/f10/authored-dependency-current-dispositions.json'].includes(path);
  const supplied = readMember(path);
  // The older test also supplies its own freshly generated review subject and
  // corruptions. Preserve those bytes so every original drift assertion runs.
  const laterReview = isStore && JSON.parse(supplied).symbol_uses.some(row =>
    ['compatibility/f10/authored-use-reviews/bidi-peer-source-context-requalified-boundaries.json',
      'compatibility/f10/authored-use-reviews/selection-comparator-packed-requalified-boundaries.json'].includes(row.source_review?.path));
  const bytes = laterReview ? readBidiPeerReviewSubject(path, readMember) : readBidiIsolatedBefore(path, readMember);
  if (!['compatibility/f10/authored-dependency-dispositions.json',
    'compatibility/f10/authored-dependency-current-dispositions.json'].includes(path)) return bytes;
  const pkg = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  const line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  const {data} = load(line, readMember), stored = readMember(data.roles.path);
  assert.equal(hash(stored), data.roles.sha256);
  const raw = gunzipSync(stored); assert.equal(hash(raw), data.roles.raw_sha256);
  const prior = JSON.parse(raw), member = prior.stores.find(row => row.path === path);
  assert.ok(member); assert.equal(hash(member.text), member.sha256);
  if (hash(bytes) === member.sha256) return Buffer.from(member.text);
  const current = JSON.parse(bytes), before = JSON.parse(member.text);
  const key = row => JSON.stringify([row.file, row.module, row.symbol]);
  const affected = new Set(prior.affected.filter(row => row.store === path).map(row => JSON.stringify(row.key)));
  for (const row of current.symbol_uses) if (affected.has(key(row))) {
    const old = before.symbol_uses.find(value => key(value) === key(row)); assert.ok(old);
    const reviewPath = 'compatibility/f10/authored-use-reviews/bidi-isolated-packed-requalified-boundaries.json';
    assert.equal(row.source_review.path, reviewPath);
    assert.equal(row.source_review.sha256, hash(readMember(reviewPath)));
    assert.deepEqual(row.source_review_history.at(-1), {source_parent: data.source_parent,
      prior_source_review: old.source_review, reason: 'Exact isolated bidi tooling requalification; original role conclusions and runtime scopes retained.'});
    row.source_review = old.source_review;
    if (Object.hasOwn(old, 'source_review_history')) row.source_review_history = old.source_review_history;
    else delete row.source_review_history;
  }
  assert.deepEqual(current, before, 'live disposition drift');
  return Buffer.from(member.text);
}
