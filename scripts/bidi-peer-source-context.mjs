/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact additive dispatch projection for earlier immutable source reviews. */
import assert from 'node:assert/strict';
import {nativeDateCurrentRead,nativeDateSourceContext} from './native-date-packed-source-context.mjs';
import {reverseSelectionComparatorSource, readSelectionComparatorBefore} from './selection-comparator-packed-source-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = 'compatibility/rc/bidi-peer-admission-inputs.json';
const pins = {"main": "40f7ddf541ec2d7b21a6e5078921208bc2cfe818a014ce1fe483507402be657f", "21.x": "03c5b43e8f231363cc09c0fdcf9c513f8feb3db22f790618bc723686c41ac833"};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = new Map();
const reviewSubjectPaths = new Set([
  'scripts/check-upstream-audit-disposition.mjs', 'tests/upstream/identity-source-context.mjs',
  'tests/bidi_isolated_requalification_probe.mjs', 'compatibility/f10/disposition-ledger/ledger.json',
  'compatibility/f10/authored-dependency-dispositions.json', 'compatibility/f10/authored-dependency-current-dispositions.json',
]);
export function bidiPeerSourceContext(readMember = path => readFileSync(resolve(root, path))) {
  const bytes = readMember(inputPath), inputs = JSON.parse(bytes);
  assert.equal(hash(bytes), pins[inputs.line], 'public bidi source inputs changed');
  const stored = readMember(inputs.prior.path); assert.equal(hash(stored), inputs.prior.sha256, 'public bidi source archive changed');
  if (cache.has(inputs.line)) return cache.get(inputs.line); // Both pinned byte hashes were checked again.
  const raw = gunzipSync(stored); assert.equal(hash(raw), inputs.prior.raw_sha256);
  const prior = JSON.parse(raw); assert.equal(prior.line, inputs.line); assert.equal(prior.source_parent, inputs.source_parent);
  for (const member of prior.members) assert.equal(hash(member.text), member.sha256);
  const result = {inputs, prior}; cache.set(inputs.line, result); return result;
}
export function reverseBidiPeerSource(path, text, readMember) {
  const {inputs, prior} = bidiPeerSourceContext(readMember), row = inputs.source_changes.find(row => row.path === path);
  assert.ok(row, 'foreign public bidi context path'); const before = prior.members.find(row => row.path === path); assert.ok(before);
  if (hash(text) === before.sha256) return text;
  text = reverseSelectionComparatorSource(path, text, {readMember});
  assert.equal(hash(text), row.current_sha256, 'unreviewed public bidi context change');
  let result = text;
  for (const [old, current] of [...row.edits].reverse()) {
    assert.equal(result.split(current).length, 2, 'inexact public bidi context edit'); result = result.replace(current, () => old);
  }
  assert.equal(result, before.text, 'complete preceding public bidi context not recovered'); return result;
}
export function reverseBidiPeerChecker(text, options = {}) {
  return reverseBidiPeerSource('scripts/check-upstream-audit-disposition.mjs', text, options.readMember);
}
/** Only for replaying the previous write-once source review's own subject.
 * Current production/CLI readers are tested separately against current files. */
export function readBidiPeerReviewSubject(path, readMember) {
  readMember = nativeDateCurrentRead(readMember);
  if(path==='scripts/check-upstream-audit-disposition.mjs'){
    const supplied=readMember(path),native=nativeDateSourceContext(readMember);
    const previous=native.before.sources.find(row=>row.path===path),current=native.data.changes.find(row=>row.path===path);
    if([previous.sha256,current.current_sha256].includes(hash(supplied))){
      const {prior}=bidiPeerSourceContext(readMember),subject=prior.members.find(row=>row.path===path);
      assert.ok(subject);assert.equal(hash(subject.text),subject.sha256);return Buffer.from(subject.text);
    }
  }
  const precedingRead = target => readSelectionComparatorBefore(target, readMember);
  if (!reviewSubjectPaths.has(path)) return precedingRead(path);
  const {inputs, prior} = bidiPeerSourceContext(precedingRead);
  const subject = prior.review_subjects.find(row => row.path === path);
  if (subject) {assert.equal(hash(subject.text), subject.sha256); return Buffer.from(subject.text);}
  const bytes = precedingRead(path);
  return inputs.source_changes.some(row => row.path === path) ? Buffer.from(reverseBidiPeerSource(path, bytes.toString(), precedingRead)) : bytes;
}
