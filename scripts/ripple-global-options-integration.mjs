/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A finite ledger admission and a separate, test-only historical reader. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
export const RIPPLE_INTEGRATION_PRIOR = 'compatibility/rc/ripple-global-options-integration-prior.json.gz';
export const RIPPLE_INTEGRATION_INPUTS = 'compatibility/rc/ripple-global-options-integration-inputs.json';
export const RIPPLE_AUTHORED_LEDGER = 'compatibility/f10/authored-dependency-dispositions.json';
const priorPins = {main: 'db2dfef8aae2af08c065a648cab2db3442ef5acbba794075bdee1f84a58a8e82',
  '21.x': '0a28eaf31c5f795ac867af0cf265800effbdb3b78377b350886047a7a4718a4d'};
const inputPins = {main: 'c9af788ae5cd8cd6f1191646f582a610c67dff38feefe1a37b7a36457ef63a05', '21.x': 'c6751a194de3af3c42006458b1ba483fb5f0a5e4a292667f969bd89748e5fcc3'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = body => JSON.stringify(body, null, 2) + '\n';
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const expectedKeys = ['legacy-chips/chip.ts', 'legacy-tabs/internal/tab-nav-bar-base.ts',
  'legacy-tabs/tab-nav-bar/tab-nav-bar.ts'].flatMap(file => ['MAT_RIPPLE_GLOBAL_OPTIONS', 'RippleGlobalOptions']
    .map(symbol => key({file, module: '@angular/material/core', symbol}))).sort();

export function rippleIntegrationPrior({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const packed = read(RIPPLE_INTEGRATION_PRIOR), prior = JSON.parse(gunzipSync(packed));
  assert.equal(hash(packed), priorPins[prior.line], 'changed ripple integration preimages');
  assert.equal(prior.schema_version, 1); assert.equal(prior.ledger.path, RIPPLE_AUTHORED_LEDGER);
  assert.equal(hash(prior.ledger.text), prior.ledger.sha256);
  assert.deepEqual(prior.selected.map(key).sort(), expectedKeys);
  const raw = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', prior.source_parent + ':' + RIPPLE_AUTHORED_LEDGER], {cwd: root, maxBuffer: 4 * 1024 * 1024,
    env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
  assert.equal(hash(raw), prior.ledger.sha256, 'ledger preimage differs from its original commit');
  return prior;
}

export function expectedRippleIntegratedLedger(prior) {
  const before = JSON.parse(prior.ledger.text); assert.equal(json(before), prior.ledger.text);
  assert.equal(before.reviewed_uses, 1446); assert.equal(before.open_uses, 290);
  const wanted = new Set(expectedKeys); let changed = 0;
  for (const row of before.symbol_uses) if (wanted.has(key(row))) {
    assert.equal(row.status, 'inventory-seed'); assert.equal(row.disposition, 'open');
    assert.equal(row.source_review, undefined);
    row.status = 'reviewed'; row.disposition = 'closed'; row.source_review = {...prior.review}; changed++;
  }
  assert.equal(changed, 6); before.reviewed_uses = 1452; before.open_uses = 284;
  before.note = 'Frozen1736-use denominator retained. Six exact chip/tab ripple token/type source reviews admitted; prior receipts and source epochs are preserved. Current valid reviewed labels: 1452; open: 284. Native, packed and full floor qualification remain separate; G11 not-passed.';
  return Buffer.from(json(before));
}

export function inspectRippleOptionsIntegration({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const prior = rippleIntegrationPrior({root, read}), inputsBytes = read(RIPPLE_INTEGRATION_INPUTS);
  assert.equal(hash(inputsBytes), inputPins[prior.line], 'changed finite integration inputs');
  const inputs = JSON.parse(inputsBytes);
  assert.equal(inputs.line, prior.line); assert.equal(inputs.prior_sha256, priorPins[prior.line]);
  const current = read(RIPPLE_AUTHORED_LEDGER), expected = expectedRippleIntegratedLedger(prior);
  assert.equal(current.equals(expected), true, 'ledger change exceeds the six reviewed roles and exact metadata update');
  for (const member of [prior.review, ...prior.independent_evidence, ...prior.source_members]) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed reviewed boundary: ' + member.path);
  }
  const review = JSON.parse(read(prior.review.path));
  assert.equal(review.line, prior.line); assert.deepEqual(review.reviews.map(key).sort(), expectedKeys);
  const all = JSON.parse(current), selected = {...all, symbol_uses: all.symbol_uses.filter(row => expectedKeys.includes(key(row)))};
  assert.deepEqual(authoredUseReviewEvidence(selected, prior.line, read, hash),
    {reviewed: 6, insufficient: 0, insufficient_uses: []});
  for (const edit of inputs.test_context_edits) {
    const before = prior.test_preimages.find(member => member.path === edit.path); assert.ok(before);
    assert.equal(hash(before.text), before.sha256); let after = before.text;
    for (const [from, to] of edit.substitutions) {
      assert.equal(after.split(from).length, 2, 'ambiguous historical context edit'); after = after.replace(from, to);
    }
    assert.equal(hash(after), edit.after_sha256); assert.equal(read(edit.path).toString(), after,
      'unknown test context bytes: ' + edit.path);
  }
  assert.deepEqual(inputs.test_context_edits.map(edit => edit.path).sort(), prior.test_preimages.map(member => member.path).sort());
  return {schema_version: 1, line: prior.line, selected_roles_admitted: 6,
    ledger_sha256: hash(current), before_ledger_sha256: prior.ledger.sha256,
    frozen_uses: 1736, reviewed: 1452, open: 284, admitted_review_evidence: 6,
    unrelated_rows_preserved: 1730, test_context_edits: inputs.test_context_edits.length,
    current_source_and_review_bytes_rechecked: true, historical_reader_is_not_runtime_admission: true,
    actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
}

/** Only old task-preservation assertions use this view. All other bytes are raw.
 * Unknown current ledger, source, evidence or test bytes are rejected first.
 * Live upstream source/native validators never import this function. */
export function historicalRippleAuthoredReader({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  inspectRippleOptionsIntegration({root, read});
  const prior = rippleIntegrationPrior({root, read});
  return path => path === RIPPLE_AUTHORED_LEDGER ? Buffer.from(prior.ledger.text) : read(path);
}
