/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent source/decision receipt guards; original populations and native gates remain. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
import {qualifiedA11yCallerRuntime} from '../scripts/a11y-caller-runtime-evidence.mjs';
import {inspectA11yCallerReview, A11Y_CALLER_REVIEW, A11Y_CALLER_CURRENT_REVIEW} from '../scripts/a11y-caller-reviews.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const q = qualifiedA11yCallerRuntime({root}), review = inspectA11yCallerReview({root});
assert.equal(review.reviews.length, 16);
assert.equal(review.frozen_prepared, 7);
assert.equal(review.additional_prepared, 9);
assert.equal(review.reviews.filter(row => row.conclusion === 'stable-public-peer').length, 16);
assert.equal(review.reviews.filter(row => row.unused_import).length, 0);
const controls = [...new Set([A11Y_CALLER_REVIEW, A11Y_CALLER_CURRENT_REVIEW, ...review.reviews[0].independent_evidence.map(m => m.path),
  'tests/a11y_caller_runtime_probe.mjs', 'tests/a11y_caller_runtime_subject.mjs',
  'tests/a11y_caller_node_protocol.mjs', 'compatibility/rc/api/export-name-allowlist.json',
  ...q.source.prior.sources.map(m => m.path)])];
for (const path of controls) {
  assert.throws(() => inspectA11yCallerReview({root,
    read: member => member === path ? Buffer.concat([read(member), Buffer.from('\n')]) : read(member),
  }), error => error?.code === 'ERR_ASSERTION', path);
}
let changed = null;
const late = path => path === changed ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
inspectA11yCallerReview({root, read: late});
for (changed of ['projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts', q.ref.path]) {
  assert.throws(() => inspectA11yCallerReview({root, read: late}), error => error?.code === 'ERR_ASSERTION');
}
for (const field of ['decision', 'candidate_source_sha256', 'conclusion']) {
  const bad = structuredClone(review);
  bad.reviews[0][field] = 'invalid';
  const bytes = Buffer.from(JSON.stringify(bad, null, 2) + '\n');
  assert.throws(() => inspectA11yCallerReview({root,
    read: path => path === A11Y_CALLER_CURRENT_REVIEW ? bytes : read(path),
  }), /changed prepared individual accessibility review/);
}
const ledgers = new Map(q.source.prior.ledgers.map(m => [m.path, JSON.parse(read(m.path))]));
const a11ySuccessorPath = 'compatibility/f10/authored-use-reviews/a11y-callers-current-source-successor-v1.json';
const a11ySuccessorBytes = read(a11ySuccessorPath), a11ySuccessorHash = hash(a11ySuccessorBytes);
const a11ySuccessor = JSON.parse(a11ySuccessorBytes);
const a11yPredecessor = 'f689fec16f012cac75909849d957390c438efc27';
assert.equal(a11ySuccessor.reviews.length, 7);
execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
  'merge-base', '--is-ancestor', a11yPredecessor, 'HEAD'], {cwd: root, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
const successorRows = new Map(a11ySuccessor.reviews.map(item => [JSON.stringify([item.prior_case.ledger, item.prior_case.prior_current_row.file, item.prior_case.prior_current_row.module, item.prior_case.prior_current_row.symbol]), item]));
const headLedgers = new Map([...ledgers.keys()].map(path => [path, JSON.parse(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', 'HEAD:' + path], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}))]));
const rowKey = row => JSON.stringify([row.file, row.module, row.symbol]);
const selectedReceipt = {path: a11ySuccessorPath, sha256: a11ySuccessorHash};
const sourceReviewProjectionBytes = (path, headBytes) => {
  const text = headBytes.toString('utf8'), source = ts.parseJsonText(path, text);
  assert.equal(source.parseDiagnostics.length, 0, 'invalid committed ledger JSON');
  const rootObject = source.statements[0].expression;
  const rootProps = new Map(rootObject.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, p]));
  const usesProperty = rootProps.get('symbol_uses');
  if (!usesProperty) return headBytes;
  const replace = [];
  for (const item of successorRows.values()) if (item.prior_case.ledger === path) {
    const prior = item.prior_case.prior_current_row;
    const rowNode = usesProperty.initializer.elements.find(node => {
      const props = new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, p]));
      return props.get('file')?.initializer.text === prior.file && props.get('module')?.initializer.text === prior.module && props.get('symbol')?.initializer.text === prior.symbol;
    });
    assert.ok(rowNode, 'selected row missing from committed ledger');
    const rowProps = new Map(rowNode.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, p]));
    const reviewNode = rowProps.get('source_review');
    const reviewProps = new Map(reviewNode.initializer.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, p]));
    const pathNode = reviewProps.get('path').initializer, hashNode = reviewProps.get('sha256').initializer;
    const currentRef = {path: pathNode.text, sha256: hashNode.text};
    assert.ok(JSON.stringify(currentRef) === JSON.stringify(prior.source_review) || JSON.stringify(currentRef) === JSON.stringify(selectedReceipt), 'committed selected receipt epoch changed');
    if (JSON.stringify(currentRef) === JSON.stringify(prior.source_review)) {
      replace.push({start: pathNode.getStart(source), end: pathNode.end, value: JSON.stringify(selectedReceipt.path)});
      replace.push({start: hashNode.getStart(source), end: hashNode.end, value: JSON.stringify(selectedReceipt.sha256)});
    }
  }
  let projected = text;
  for (const item of replace.sort((a,b) => b.start-a.start)) projected = projected.slice(0,item.start)+item.value+projected.slice(item.end);
  return Buffer.from(projected);
};
const assertLedgerByteProjection = (path, bytes) => assert.deepEqual(bytes, sourceReviewProjectionBytes(path, readFileSync(join(root, path)) && Buffer.from(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', 'HEAD:' + path], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}))), 'unreviewed ledger bytes changed: ' + path);
const projectedHead = path => {
  const expected = structuredClone(headLedgers.get(path));
  if (!expected.symbol_uses) return expected;
  for (const item of successorRows.values()) if (item.prior_case.ledger === path) {
    const prior = item.prior_case.prior_current_row;
    const before = JSON.parse(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', `${a11yPredecessor}:${path}`], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}})).symbol_uses.find(r => rowKey(r) === rowKey(prior));
    assert.deepEqual(before, prior, 'immutable predecessor row mismatch');
    const headRow = expected.symbol_uses.find(r => rowKey(r) === rowKey(prior));
    assert.ok(headRow, 'selected row absent from committed ledger');
    const after = {...prior, source_review: {path: a11ySuccessorPath, sha256: a11ySuccessorHash}};
    assert.ok(JSON.stringify(headRow) === JSON.stringify(prior) || JSON.stringify(headRow) === JSON.stringify(after), 'unexpected committed selected-row epoch');
    Object.assign(headRow, after);
  }
  return expected;
};
const assertLedgerProjection = (path, actual) => assert.deepEqual(actual, projectedHead(path), 'unreviewed ledger row or envelope change: ' + path);
let sharedClosures = 0, rolledForward = 0;
for (const selected of q.source.prior.selected) {
  const old = selected.original_row, row = ledgers.get(selected.ledger).symbol_uses.find(r =>
    r.file === old.file && r.module === old.module && r.symbol === old.symbol);
  const key = JSON.stringify([selected.ledger, old.file, old.module, old.symbol]), successor = successorRows.get(key);
  assert.ok(row);
  if (successor) {
    assert.deepEqual(successor.prior_case.prior_current_row,
      JSON.parse(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', `show`, `${a11yPredecessor}:${selected.ledger}`], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}})).symbol_uses.find(r => r.file === old.file && r.module === old.module && r.symbol === old.symbol), 'full f689 predecessor row was not preserved');
    assert.deepEqual(row, {...successor.prior_case.prior_current_row, source_review: {path: a11ySuccessorPath, sha256: a11ySuccessorHash}}, 'selected A11y source_review rollforward changed unrelated row data');
    rolledForward++;
  }
  assert.equal(row.disposition, 'closed');
  assert.equal(row.status, 'reviewed');
  assert.ok(row.source_review?.path && /^[0-9a-f]{64}$/.test(row.source_review.sha256));
  assert.equal(hash(read(row.source_review.path)), row.source_review.sha256, 'existing source receipt changed');
  if (successor) assert.equal(row.source_review.path, a11ySuccessorPath);
}
assert.equal(sharedClosures, 0);
assert.equal(rolledForward, 7);
for (const path of ledgers.keys()) {
  assertLedgerProjection(path, ledgers.get(path));
  assertLedgerByteProjection(path, read(path));
  assert.throws(() => assertLedgerByteProjection(path, Buffer.concat([read(path), Buffer.from(' ')])), /unreviewed ledger bytes changed/);
  const corrupted = structuredClone(ledgers.get(path));
  if (corrupted.symbol_uses) {
    const unselected = corrupted.symbol_uses.find(row => !successorRows.has(JSON.stringify([path, row.file, row.module, row.symbol])));
    assert.ok(unselected);
    unselected.status = 'unreviewed-tamper';
  } else corrupted.unreviewed_envelope_tamper = true;
  assert.throws(() => assertLedgerProjection(path, corrupted), /unreviewed ledger row or envelope change/);
}
const selectedTamper = structuredClone(ledgers.get('compatibility/f10/authored-dependency-dispositions.json'));
const oneSuccessor = [...successorRows.values()].find(item => item.prior_case.ledger === 'compatibility/f10/authored-dependency-dispositions.json');
const selectedPhysical = selectedTamper.symbol_uses.find(row => row.file === oneSuccessor.file && row.module === oneSuccessor.module && row.symbol === oneSuccessor.symbol);
selectedPhysical.source_review.sha256 = '0'.repeat(64);
assert.throws(() => assertLedgerProjection('compatibility/f10/authored-dependency-dispositions.json', selectedTamper), /unreviewed ledger row or envelope change/);
const frozen = ledgers.get('compatibility/f10/authored-dependency-dispositions.json');
const added = ledgers.get('compatibility/f10/authored-dependency-current-dispositions.json');
assert.equal(frozen.symbol_uses.length, 1736);
const historicalAdded = JSON.parse(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', '629e2fc27b2580131310011a0ca4572223eabb1b:compatibility/f10/authored-dependency-current-dispositions.json'], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}}));
assert.equal(historicalAdded.symbol_uses.length, 315);
assert.equal(historicalAdded.live_symbol_use_count, 314);
assert.equal(historicalAdded.retained_removed_additional_uses.length, 1);
assert.equal(added.symbol_uses.length, 336);
assert.equal(added.live_symbol_use_count, 333);
assert.equal(added.retained_removed_additional_uses.length, 3);
const oldIds = new Set(historicalAdded.symbol_uses.map(row => JSON.stringify([row.file, row.module, row.symbol])));
const currentIds = new Set(added.symbol_uses.map(row => JSON.stringify([row.file, row.module, row.symbol])));
assert.equal([...oldIds].filter(id => !currentIds.has(id)).length, 0, 'current global successor removed historical obligations');
assert.equal(currentIds.size - oldIds.size, 21, 'unexpected global current-source successor population');
assert.equal(ledgers.get('compatibility/f10/disposition-ledger/ledger.json').entries.length, 1697);
const historicalCva = JSON.parse(execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', '629e2fc27b2580131310011a0ca4572223eabb1b:compatibility/f10/authored-dependency-dispositions.json'], {cwd: root, maxBuffer: 24 * 1024 * 1024, env: {...process.env, GIT_NO_LAZY_FETCH: '1'}})).symbol_uses.filter(row => row.module === '@angular/forms' && row.symbol === 'NG_VALUE_ACCESSOR' && row.disposition === 'open');
assert.equal(historicalCva.length, 6);
const packedCvaPath = 'compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json';
const packedCvaRef = {path: packedCvaPath, sha256: hash(read(packedCvaPath))};
for (const old of historicalCva) {
  const current = frozen.symbol_uses.find(row => row.file === old.file && row.module === old.module && row.symbol === old.symbol);
  assert.ok(current, 'historical packed CVA obligation disappeared');
  assert.equal(current.disposition, 'closed');
  assert.equal(current.status, 'reviewed');
  assert.deepEqual(current.source_review, packedCvaRef, 'packed CVA obligation lost its dedicated evidence');
}
assert.equal(added.live_symbol_use_count, 333);
assert.equal(added.retained_removed_additional_uses.length, 3);
const report = {line: review.line, individual_routes: 16, frozen: 7, additional: 9,
  runtime_contexts: 6, runtime_cases: 74, actual_source_mutants_rejected: 6,
  source_and_proof_corruptions_rejected: controls.length, late_changes_rejected: 2,
  review_row_corruptions_rejected: 3, historical_a11y_receipt_rows: 5, a11y_source_review_successor_rows: rolledForward, a11y_current_review_integrated: 7, canonical_closures_integrated: 0,
  original1697_1736_315_and_six_packed_CVA_obligations_retained: true,
  actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
