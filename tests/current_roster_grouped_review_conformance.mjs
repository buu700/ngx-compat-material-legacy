/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 *
 * Pure synthetic metadata conformance. This is not a current-owner or product gate.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const root = resolve(fileURLToPath(new URL('..',import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ORIGINAL_REVIEW_HELPER_FILE_SHA256 = '220eff0630e5c7a890696030fd4dc67360473ac32be0272a38489f2a4f94a534';
const REVIEW_ROOT = 'compatibility/f10/authored-use-reviews/';
const SOURCE_ROOT = 'projects/ngx-material-legacy/';
const LINE = 'main';
const legacyModule = await import(pathToFileURL(root + '/scripts/authored-use-inventory.mjs'));
const rosterModule = await import(pathToFileURL(root + '/scripts/current-authored-roster-source.mjs'));
const groupedReview = rosterModule.reviewCurrentRosterEvidenceByDocument;
const legacyReview = legacyModule.authoredUseReviewEvidence;
assert.equal(typeof groupedReview, 'function');
assert.equal(typeof legacyReview, 'function');

const bytes = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
const row = (file, module, symbol, path, docBytes) => ({
  file, module, symbol, disposition: 'closed', status: 'reviewed',
  source_review: {path, sha256: digest(docBytes)},
});
const review = (r, sourceBytes, evidencePath, evidenceBytes, extra = {}) => ({
  file: r.file, module: r.module, symbol: r.symbol,
  conclusion: 'stable-public-peer',
  decision: 'The recorded source and behavior checks support preserving this use against the stable public peer API.',
  reviewer: 'independent reviewer',
  candidate_source_sha256: digest(sourceBytes),
  independent_evidence: [{path: evidencePath, sha256: digest(evidenceBytes)}],
  ...extra,
});
const doc = reviews => ({schema_version: 1, line: LINE, status: 'reviewed', reviews});
const stableComparison = f => {
  const oldResult = legacyReview(f.candidate, LINE, path => f.readMember(path), digest);
  f.reads.clear();
  const newResult = groupedReview(f.candidate, LINE, path => f.readMember(path), digest);
  assert.deepEqual(newResult, oldResult);
  return newResult;
};
const fixture = (rows, bodies, sources, evidence) => {
  const members = new Map();
  for (const [path, value] of bodies) members.set(path, Buffer.from(value));
  for (const [path, value] of sources) members.set(SOURCE_ROOT + path, Buffer.from(value));
  for (const [path, value] of evidence) members.set(path, Buffer.from(value));
  const reads = new Map();
  return {
    candidate: {symbol_uses: rows}, members, reads,
    readMember(path) {
      reads.set(path, (reads.get(path) || 0) + 1);
      const value = members.get(path);
      return value && Buffer.from(value);
    },
  };
};
const mutateWithoutThrow = (f, triggerPath, targetPath, value) => {
  const prior = f.readMember;
  f.readMember = p => {
    const result = prior(p);
    if (p === triggerPath) f.members.set(targetPath, Buffer.from(value));
    return result;
  };
};
const invoke = (f) => groupedReview(f.candidate, LINE, p => f.readMember(p), digest);
const assertOneValid = result => assert.deepEqual(result, {reviewed: 1, insufficient: 0, insufficient_uses: []});
const assertInsufficient = (result, uses) => {
  assert.equal(result.reviewed, 0);
  assert.equal(result.insufficient, uses.length);
  assert.deepEqual(result.insufficient_uses, uses.map(({file, module, symbol}) => ({file, module, symbol})));
};

test('untouched legacy review helper remains pinned to its actual source file', async () => {
  const actual = await readFile(root + '/scripts/authored-use-inventory.mjs');
  assert.equal(digest(actual), ORIGINAL_REVIEW_HELPER_FILE_SHA256);
});

test('new export accepts a valid row and keeps exact source/evidence binding', async () => {
  const source = bytes('authored source');
  const evidence = bytes('independent API evidence');
  const path = REVIEW_ROOT + 'review-a.json';
  const r = {file: 'button.ts', module: 'button', symbol: 'Button'};
  const reviewDoc = bytes(doc([review(r, source, 'evidence/a.txt', evidence)]));
  const f = fixture([row(r.file, r.module, r.symbol, path, reviewDoc)], [[path, reviewDoc]],
    [[r.file, source]], [['evidence/a.txt', evidence]]);
  assertOneValid(stableComparison(f));
});

test('public helper ignores an attempted extra source-reference override', () => {
  const original = bytes('original source'), changed = bytes('changed source'), evidence = bytes('evidence');
  const path = REVIEW_ROOT + 'strict.json', item = {file: 'button.ts', module: '@angular/core', symbol: 'Directive'};
  const reviewDoc = bytes(doc([review(item, original, 'evidence/strict.txt', evidence)]));
  const candidate = row(item.file, item.module, item.symbol, path, reviewDoc);
  const f = fixture([candidate], [[path, reviewDoc]], [[item.file, changed]], [['evidence/strict.txt', evidence]]);
  let invoked = false;
  const result = groupedReview(f.candidate, LINE, p => f.readMember(p), digest, () => { invoked = true; return digest(changed); });
  assert.equal(invoked, false);
  assertInsufficient(result, [item]);
  assert.deepEqual(result, legacyReview(f.candidate, LINE, p => f.readMember(p), digest));
});

test('interleaved references group by path, retain row order, and count duplicate candidate uses separately', async () => {
  const srcA = bytes('source A'), srcB = bytes('source B'), evA = bytes('evidence A'), evB = bytes('evidence B');
  const pathA = REVIEW_ROOT + 'a.json', pathB = REVIEW_ROOT + 'b.json';
  const specs = [
    {file: 'a.ts', module: 'a', symbol: 'A', path: pathA, source: srcA, evidence: evA, ep: 'e/a'},
    {file: 'b.ts', module: 'b', symbol: 'B', path: pathB, source: srcB, evidence: evB, ep: 'e/b'},
  ];
  const bodyA = bytes(doc([review(specs[0], srcA, specs[0].ep, evA)]));
  const bodyB = bytes(doc([review(specs[1], srcB, specs[1].ep, evB)]));
  const rows = [row('a.ts', 'a', 'A', pathA, bodyA), row('b.ts', 'b', 'B', pathB, bodyB), row('a.ts', 'a', 'A', pathA, bodyA)];
  const f = fixture(rows, [[pathA, bodyA], [pathB, bodyB]], [['a.ts', srcA], ['b.ts', srcB]], [['e/a', evA], ['e/b', evB]]);
  const result = stableComparison(f);
  assert.deepEqual(result, {reviewed: 3, insufficient: 0, insufficient_uses: []});
  assert.equal(f.reads.get(pathA), 2, 'one grouped read plus one fresh post-group read');
  assert.equal(f.reads.get(pathB), 2, 'one grouped read plus one fresh post-group read');
  assert.equal(f.reads.get(SOURCE_ROOT + 'a.ts'), 2, 'source read remains fresh per candidate row');
  assert.equal(f.reads.get('e/a'), 2, 'evidence read remains fresh per candidate row');
});

test('all recorded conclusions and non-reviewed row selection match the original helper', () => {
  const path = REVIEW_ROOT + 'conclusions.json';
  const specs = [
    {file: 'peer.ts', module: 'peer', symbol: 'Peer', conclusion: 'stable-public-peer'},
    {file: 'owned.ts', module: 'owned', symbol: 'Owned', conclusion: 'owned-replacement'},
    {file: 'removed.ts', module: 'removed', symbol: 'Removed', conclusion: 'removed-use'},
    {file: 'testing/widget.spec.ts', module: 'widget', symbol: 'Widget', conclusion: 'test-only'},
  ];
  const sources = [], evidenceMembers = [], records = [], rows = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i], source = bytes(`source-${i}`), evidence = bytes(`evidence-${i}`), ep = `e/conclusion-${i}`;
    sources.push([s.file, source]); evidenceMembers.push([ep, evidence]);
    records.push(review(s, source, ep, evidence, {conclusion: s.conclusion}));
  }
  const body = bytes(doc(records));
  for (const s of specs) rows.push(row(s.file, s.module, s.symbol, path, body));
  rows.push({file: 'open.ts', module: 'open', symbol: 'Open', disposition: 'open', status: 'pending'});
  const f = fixture(rows, [[path, body]], sources, evidenceMembers);
  assert.deepEqual(stableComparison(f), {reviewed: 4, insufficient: 0, insufficient_uses: []});
  assert.equal(f.reads.get(SOURCE_ROOT + 'open.ts'), undefined, 'unreviewed rows are skipped before member reads');
});

test('interleaved failures preserve candidate order in insufficient_uses', () => {
  const pathA = REVIEW_ROOT + 'missing-match.json', pathB = REVIEW_ROOT + 'other-missing-match.json';
  const bodyA = bytes(doc([])), bodyB = bytes(doc([]));
  const uses = [
    {file: 'first.ts', module: 'first', symbol: 'First'},
    {file: 'middle.ts', module: 'middle', symbol: 'Middle'},
    {file: 'last.ts', module: 'last', symbol: 'Last'},
  ];
  const rows = [
    row(uses[0].file, uses[0].module, uses[0].symbol, pathA, bodyA),
    row(uses[1].file, uses[1].module, uses[1].symbol, pathB, bodyB),
    row(uses[2].file, uses[2].module, uses[2].symbol, pathA, bodyA),
  ];
  const f = fixture(rows, [[pathA, bodyA], [pathB, bodyB]], [], []);
  assertInsufficient(stableComparison(f), uses);
  assert.equal(f.reads.get(pathA), 2);
  assert.equal(f.reads.get(pathB), 2);
});

test('same document path with stale and valid claimed SHAs judges each reference independently', async () => {
  const source = bytes('src'), evidence = bytes('ev'), path = REVIEW_ROOT + 'same.json';
  const r = {file: 'x.ts', module: 'x', symbol: 'X'};
  const body = bytes(doc([review(r, source, 'e/x', evidence)]));
  const good = row(r.file, r.module, r.symbol, path, body);
  const stale = {...good, source_review: {...good.source_review, sha256: '0'.repeat(64)}};
  const f = fixture([stale, good], [[path, body]], [[r.file, source]], [['e/x', evidence]]);
  const result = stableComparison(f);
  assert.equal(result.reviewed, 1);
  assert.equal(result.insufficient, 1);
  assert.deepEqual(result.insufficient_uses, [{file: r.file, module: r.module, symbol: r.symbol}]);
});

test('bad metadata, body, source, and evidence match the original helper verdict row by row', () => {
  const source = bytes('source'), evidence = bytes('evidence'), path = REVIEW_ROOT + 'invalid.json';
  const r = {file: 'invalid.ts', module: 'invalid', symbol: 'Invalid'};
  const goodReview = review(r, source, 'e/invalid', evidence);
  const baseDoc = doc([goodReview]);
  const make = (body, ref, sourceValue = source, evidenceValue = evidence) => {
    const f = fixture([row(r.file, r.module, r.symbol, path, bytes(baseDoc))], [[path, bytes(body)]],
      [[r.file, sourceValue]], [['e/invalid', evidenceValue]]);
    f.candidate.symbol_uses[0].source_review = ref === undefined
      ? {path, sha256: digest(bytes(body))} : ref;
    return f;
  };
  const reject = f => assertInsufficient(stableComparison(f), [r]);
  const checks = [
    ['missing reference', make(baseDoc, null)],
    ['missing document path', make(baseDoc, {sha256: digest(bytes(baseDoc))})],
    ['bad reference SHA', make(baseDoc, {path, sha256: 'bad'})],
    ['malformed JSON', make('{')],
    ['wrong schema version', make({...baseDoc, schema_version: 2})],
    ['wrong line', make({...baseDoc, line: 'other'})],
    ['wrong document status', make({...baseDoc, status: 'draft'})],
    ['reviews is not an array', make({...baseDoc, reviews: {}})],
    ['no exact matching review', make(doc([{...goodReview, symbol: 'Other'}]))],
    ['duplicate exact matching review', make(doc([goodReview, goodReview]))],
    ['missing conclusion', make(doc([{...goodReview, conclusion: undefined}]))],
    ['decision under 80 trimmed characters', make(doc([{...goodReview, decision: 'too short'}]))],
    ['missing reviewer', make(doc([{...goodReview, reviewer: '  '}]))],
    ['missing independent evidence', make(doc([{...goodReview, independent_evidence: []}]))],
    ['stale public source bytes', make(baseDoc, undefined, bytes('changed source'))],
    ['test-only conclusion on production source', make(doc([{...goodReview, conclusion: 'test-only'}]))],
    ['evidence aliases review document', make(doc([{...goodReview, independent_evidence: [{path, sha256: digest(bytes(baseDoc))}]}]))],
    ['evidence aliases candidate source', make(doc([{...goodReview, independent_evidence: [{path: SOURCE_ROOT + r.file, sha256: digest(source)}]}]))],
    ['malformed evidence SHA', make(doc([{...goodReview, independent_evidence: [{path: 'e/invalid', sha256: 'bad'}]}]))],
    ['changed evidence bytes', make(baseDoc, undefined, source, bytes('changed evidence'))],
  ];
  for (const [name, f] of checks) {
    try { reject(f); } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
  }
});

test('one call cannot reuse review/source/evidence verdicts from an earlier call', async () => {
  const source = bytes('source'), evidence = bytes('evidence'), path = REVIEW_ROOT + 'fresh.json';
  const r = {file: 'fresh.ts', module: 'fresh', symbol: 'Fresh'};
  const body = bytes(doc([review(r, source, 'e/fresh', evidence)]));
  const f = fixture([row(r.file, r.module, r.symbol, path, body)], [[path, body]], [[r.file, source]], [['e/fresh', evidence]]);
  assertOneValid(stableComparison(f));
  f.members.set('e/fresh', bytes('changed evidence'));
  assertInsufficient(stableComparison(f), [r]);
});

test('new invocations reread review documents and candidate source bytes', async () => {
  const source = bytes('source'), evidence = bytes('evidence'), path = REVIEW_ROOT + 'refresh.json';
  const r = {file: 'refresh.ts', module: 'refresh', symbol: 'Refresh'};
  const body = bytes(doc([review(r, source, 'e/refresh', evidence)]));
  const f = fixture([row(r.file, r.module, r.symbol, path, body)], [[path, body]], [[r.file, source]], [['e/refresh', evidence]]);
  assertOneValid(stableComparison(f));
  f.members.set(path, bytes('{'));
  assertInsufficient(stableComparison(f), [r]);
  f.members.set(path, body);
  assertOneValid(stableComparison(f));
  f.members.set(SOURCE_ROOT + r.file, bytes('changed source'));
  assertInsufficient(stableComparison(f), [r]);
});

test('document drift during a grouped callback invalidates the whole affected group', async () => {
  const source = bytes('source'), evidence = bytes('evidence'), path = REVIEW_ROOT + 'drift.json';
  const r = {file: 'drift.ts', module: 'drift', symbol: 'Drift'};
  const second = {file: 'second.ts', module: 'second', symbol: 'Second'};
  const body = bytes(doc([review(r, source, 'e/drift', evidence),review(second,source,'e/drift',evidence)]));
  const f = fixture([r,second].map(use=>row(use.file,use.module,use.symbol,path,body)), [[path, body]], [[r.file, source],[second.file,source]], [['e/drift', evidence]]);
  mutateWithoutThrow(f, SOURCE_ROOT + r.file, path, bytes('changed document'));
  assertInsufficient(invoke(f), [r,second]);
});

test('malformed candidates contribute no reviewed rows in either helper', () => {
  const f = {candidate: null, reads: new Map(), readMember() { throw Error('unexpected read'); }};
  assert.deepEqual(stableComparison(f), {reviewed: 0, insufficient: 0, insufficient_uses: []});
  f.candidate = {symbol_uses: 'not-an-array'};
  assert.deepEqual(stableComparison(f), {reviewed: 0, insufficient: 0, insufficient_uses: []});
});

test('reader exception identity propagates immediately and prevents later callbacks', async () => {
  const source = bytes('source'), evidence = bytes('evidence'), path = REVIEW_ROOT + 'throw.json';
  const r = {file: 'throw.ts', module: 'throw', symbol: 'Throw'};
  const body = bytes(doc([review(r, source, 'e/throw', evidence)]));
  const f = fixture([row(r.file, r.module, r.symbol, path, body)], [[path, body]], [[r.file, source]], [['e/throw', evidence]]);
  const original = new Error('reader sentinel');
  const calls = [];
  assert.throws(() => groupedReview(f.candidate, LINE, p => {
    calls.push(p);
    if (p === SOURCE_ROOT + r.file) throw original;
    return f.members.get(p);
  }, digest), error => error === original);
  assert.deepEqual(calls, [path, SOURCE_ROOT + r.file]);
});
