/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current canonical admission and historical metadata are different readers. */
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter} from 'node:path';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {preparePackedUpstreamLedger, packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {snackDomSourceContext, snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const inputPath = 'compatibility/rc/packed-upstream-source-inputs.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const owner = 'scripts/snack-dom-source-context.mjs';
const style = 'projects/ngx-material-legacy/styles/button/_button-theme.scss';
const input = JSON.parse(read(inputPath)), cases = [], rejected = [];
const prepared = preparePackedUpstreamLedger({root, read});
assert.equal(prepared.entries_changed, 85); assert.equal(prepared.scalar_tokens_changed, 179);
assert.equal(read(ledgerPath).equals(prepared.after), true);
assert.equal(JSON.parse(read(ledgerPath)).entries.length, 1697);
cases.push('actual-canonical-ledger-is-exact-qualified179-token-after-image');
const epoch = packedUpstreamLedgerEpoch({root, read}); assert.equal(epoch.applied, true);
assert.equal(epoch.raw, read); assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.deepEqual(epoch.projected_metadata_paths, [ledgerPath]);
assert.equal(snackDomRawCurrentRead({root, read: epoch.read})(ledgerPath).equals(prepared.after), true);
assert.equal(packedUpstreamLedgerEpoch({root, read: epoch.read}).applied, true);
for (const member of [style, owner, input.reports[0].after.path, 'projects/ngx-material-legacy/legacy-chips/chip.ts'])
  assert.equal(epoch.read(member).equals(read(member)), true);
assert.equal(epoch.current_native_packed_or_floor_or_g11_credit, false);
cases.push('only-one-historical-ledger-projected-all-current-product-code-and-reports-raw');
const before = packedUpstreamLedgerEpoch({root, read: path => path === ledgerPath ? prepared.before : read(path)});
assert.equal(before.applied, false); assert.deepEqual(before.projected_metadata_paths, []);
assert.equal(before.read(ledgerPath).equals(prepared.before), true);
cases.push('unapplied-exact-before-state-does-not-claim-admission-or-project-product');
epoch.applied = false; epoch.projected_metadata_paths.push(style);
assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.equal(epoch.read(style).equals(read(style)), true);
cases.push('public-metadata-cannot-change-private-reader-state-or-projection-scope');

function rejects(id, corrupt) {
  assert.throws(() => packedUpstreamLedgerEpoch({root, read: corrupt}), undefined, id); rejected.push(id);
}
rejects('changed-qualified-inputs', path => path === inputPath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
const wrongLine = {...input, line: input.line === 'main' ? '21.x' : 'main'};
rejects('wrong-line-inputs', path => path === inputPath ? bytes(wrongLine) : read(path));
const ledger = JSON.parse(prepared.after), selected = new Set(input.reports.map(row => row.after.path));
const unrelated = ledger.entries.find(row => !selected.has(row.evidence_report));
assert.ok(unrelated); unrelated.reason += ' Unrelated change.';
rejects('unrelated-canonical-entry-change', path => path === ledgerPath ? bytes(ledger) : read(path));
const mixed = JSON.parse(prepared.after), original = JSON.parse(prepared.before);
const index = mixed.entries.findIndex(row => selected.has(row.evidence_report));
mixed.entries[index] = original.entries[index];
rejects('mixed-before-and-after-canonical-ledger', path => path === ledgerPath ? bytes(mixed) : read(path));
const reportPath = input.reports[0].after.path;
rejects('changed-current-report', path => path === reportPath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('changed-original-report', path => path === input.reports[0].before.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('changed-validation-proof', path => path === input.validation.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('unrelated-product-style', path => path === style ? Buffer.concat([read(path), Buffer.from('\n// changed\n')]) : read(path));
rejects('unqualified-source-owner', path => path === owner ? Buffer.concat([read(path), Buffer.from('\n// changed\n')]) : read(path));
const oldOwner = read(owner).toString().replace("\nimport {packedUpstreamLedgerEpoch,packedUpstreamLedgerRawRead} from './packed-upstream-ledger-epoch.mjs';", '')
  .replace('const rawCurrent=read,upstreamEpoch=packedUpstreamLedgerEpoch({root,read}),focusEpoch=packedUpstreamFocusMetadataEpoch({root,read:upstreamEpoch.read}),',
    'const rawCurrent=read,focusEpoch=packedUpstreamFocusMetadataEpoch({root,read}),');
assert.notEqual(oldOwner, read(owner).toString());
rejects('source-owner-before-integration', path => path === owner ? Buffer.from(oldOwner) : read(path));
assert.throws(() => snackDomRawCurrentRead({root: root + '/wrong-context', read: epoch.read}));
rejected.push('historical-ledger-reader-root-mismatch');
const liveRuntime = packedUpstreamLedgerEpoch({root, read});
const fakeBin = mkdtempSync(join(tmpdir(), 'ngx-ledger-python-'));
const fakePython = join(fakeBin, 'python3'), previousPath = process.env.PATH;
writeFileSync(fakePython, '#!/bin/sh\nprintf "0.0.0\\n"\n', {mode: 0o755});
try {
  process.env.PATH = fakeBin + delimiter + previousPath;
  assert.throws(() => packedUpstreamLedgerEpoch({root, read}), /changed source-analysis Python/);
  rejected.push('wrong-source-analysis-python');
  assert.throws(() => liveRuntime.read(ledgerPath), /late source-analysis Python change/);
  rejected.push('late-source-analysis-python-change');
} finally {process.env.PATH = previousPath; unlinkSync(fakePython); rmdirSync(fakeBin);}
for (const [id, path, changed] of [
  ['late-canonical-reversion', ledgerPath, prepared.before],
  ['late-input-change', inputPath, Buffer.concat([read(inputPath), Buffer.from(' ')])],
  ['late-current-report-change', reportPath, Buffer.concat([read(reportPath), Buffer.from(' ')])],
  ['late-product-style-change', style, Buffer.concat([read(style), Buffer.from('\n// changed\n')])],
]) {
  let late = false;
  const live = packedUpstreamLedgerEpoch({root, read: member => late && member === path ? changed : read(member)});
  late = true; assert.throws(() => live.read(ledgerPath), undefined, id); rejected.push(id);
}
const context = snackDomSourceContext({root, read: epoch.read});
assert.equal(context.members, 20); assert.equal(context.packed_repair_epoch_members, 16);
assert.equal(context.current_successors, 25);
assert.equal(context.raw(ledgerPath).equals(prepared.after), true);
assert.equal(snackDomRawCurrentRead({root, read: context.read})(ledgerPath).equals(prepared.after), true);
cases.push('complete-existing-historical-context-and-native-unwrapping-use-correct-ledger-epochs');

console.log(JSON.stringify({line: input.line, result: 'pass', cases, rejected,
  canonical_entries: 1697, qualified_source_entries: 85, changed_scalar_tokens: 179,
  source_context_members: 20, packed_epoch_members: 16, original_dispositions_changed: 0,
  analysis_python_version: prepared.analysis_python_version,
  actual_current_canonical_after_sha256: hash(read(ledgerPath)), historical_before_sha256: hash(prepared.before),
  source_owner_sha256: hash(read(owner)), producer_sha256: hash(read('tests/packed_upstream_ledger_epoch_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false}));
