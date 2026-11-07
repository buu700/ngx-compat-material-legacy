/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {testImportBatchOk, testImportEntryOk, TEST_IMPORT_SHAS} from '../scripts/upstream-test-import-cleanup-evidence.mjs';

const read = path => readFileSync(path);
const currentPath = 'compatibility/rc/c04-b4-test-import-roster-source-v1.json';
const priorPath = 'compatibility/rc/chip-source-scope-requalification-test-import.json';
const inventoryPath = 'testing/legacy-runner/historical-inventory.json';
const current = JSON.parse(read(currentPath));
const prior = JSON.parse(read(priorPath));
const ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const entryFor = sha => {
  const entry = structuredClone(ledger.entries.find(row => row.sha === sha));
  assert.ok(entry);
  entry.evidence_report = currentPath;
  entry.source_check.evidence_report_sha256 = createHash('sha256').update(read(currentPath)).digest('hex');
  return entry;
};
assert.equal(testImportBatchOk(current, read, 'main'), true);
for (const sha of TEST_IMPORT_SHAS) {
  const entry = entryFor(sha);
  assert.equal(testImportEntryOk(current, entry, read, true), true, sha);
}
const candidate = entryFor(TEST_IMPORT_SHAS[0]);
const changedRead = (target, change = b => Buffer.concat([b, Buffer.from(' ')])) =>
  path => path === target ? change(read(path)) : read(path);
let controls = 0;
const rejectBatch = (name, body = current, reader = read, line = 'main') => {
  assert.equal(testImportBatchOk(body, reader, line), false, name); controls++;
};
rejectBatch('changed predecessor', current, changedRead(priorPath));
rejectBatch('changed successor bytes', current, changedRead(currentPath));
const changedReview = structuredClone(current); changedReview.reviews[0].decision += ' changed';
rejectBatch('changed individual review', changedReview);
const broadened = structuredClone(current); broadened.ownership_context.historical_selection++;
rejectBatch('broadened context', broadened);
rejectBatch('wrong line', current, read, '21.x');
const removed = structuredClone(current); delete removed.current_roster_context_successor;
assert.equal(testImportEntryOk(removed, candidate, read, true), false, 'new report missing binding'); controls++;
assert.equal(testImportEntryOk(current, candidate, changedRead(priorPath), true), false, 'entry predecessor mutation'); controls++;
assert.equal(testImportEntryOk(current, candidate, changedRead(currentPath), true), false, 'entry report mutation'); controls++;
const selection = 'testing/legacy-runner/historical-specs.json';
rejectBatch('wrong roster', current, changedRead(selection, b => Buffer.from(JSON.stringify(JSON.parse(b).slice(1)))));
const config = 'projects/ngx-material-legacy/tsconfig.lib.json';
rejectBatch('missing spec exclusion', current, changedRead(config, b => {const value = JSON.parse(b); value.exclude = []; return Buffer.from(JSON.stringify(value));}));
// The genuine predecessor remains valid at its own authenticated inventory epoch.
const priorInventory = execFileSync('git', ['show', 'b6ade2e9d8b441a67ec6f7f52d7d75807db7300c:' + inventoryPath]);
const priorRead = path => path === inventoryPath ? priorInventory : read(path);
assert.equal(testImportBatchOk(prior, priorRead, 'main'), true, 'historical predecessor route');
console.log(JSON.stringify({positive_entries:TEST_IMPORT_SHAS.length, negative_controls:controls, historical_predecessor_passed:true}));
