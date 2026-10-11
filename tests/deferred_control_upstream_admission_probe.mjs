/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScopeEvidenceOk} from '../scripts/upstream-build-scope-evidence.mjs';
import {testConsolidationBatchOk, testConsolidationEntryOk} from '../scripts/upstream-test-consolidation-evidence.mjs';
import {testImportBatchOk, testImportEntryOk} from '../scripts/upstream-test-import-cleanup-evidence.mjs';
import {sliderInputScopeEvidenceOk} from '../scripts/upstream-slider-input-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ledger = JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const tracked = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-files', 'projects/ngx-material-legacy'],
  {cwd: root, encoding: 'utf8'}).trim().split('\n');
const groups = ['closeout-fourteen-build-scope-review', 'closeout-test-consolidation-source-review',
  'closeout-thirty-one-test-import-source-review', 'closeout-three-slider-input-source-review']
  .map(name => 'compatibility/f10/disposition-ledger/evidence/' + name + '.json');
const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
function check(index, body, entry, readMember = read) {
  if (index === 0) return buildScopeEvidenceOk(body, entry, readMember, tracked);
  if (index === 1) return testConsolidationEntryOk(body, entry, readMember,
    testConsolidationBatchOk(body, readMember, tracked));
  if (index === 2) return testImportEntryOk(body, entry, readMember, testImportBatchOk(body, readMember, line));
  return sliderInputScopeEvidenceOk(body, entry, readMember, () => candidateProductSourcePaths(root), line);
}
const controls = [], positive = [];
for (const [index, path] of groups.entries()) {
  const body = JSON.parse(read(path)), rows = ledger.entries.filter(row => row.evidence_report === path);
  assert.equal(rows.length, [14, 32, 31, 3][index]);
  const batchValid = index === 1 ? testConsolidationBatchOk(body, read, tracked)
    : index === 2 ? testImportBatchOk(body, read, line) : null;
  if (batchValid !== null) assert.equal(batchValid, true);
  for (const row of rows) {
    const valid = index === 1 ? testConsolidationEntryOk(body, row, read, batchValid)
      : index === 2 ? testImportEntryOk(body, row, read, batchValid) : check(index, body, row);
    assert.equal(valid, true, row.sha);
  }
  positive.push({path, reviewed_sha_ids: rows.map(row => row.sha)});
  const reject = (id, change) => {
    const changed = structuredClone(body), row = structuredClone(rows[0]); change(changed);
    const bytes = Buffer.from(JSON.stringify(changed));
    if (row.source_check) row.source_check.evidence_report_sha256 = hash(bytes);
    assert.equal(check(index, changed, row, p => p === path ? bytes : read(p)), false, id);
    controls.push({group: index, id, rejected: true});
  };
  reject('self-rehashed-wrong-line', changed => changed.line = line === 'main' ? '21.x' : 'main');
  reject('self-rehashed-missing-SHA', changed => changed.reviews.pop());
  reject('self-rehashed-duplicate-SHA', changed => changed.reviews[1] = changed.reviews[0]);
}
const report = {schema_version: 1, line, positive, reviewed_SHAs: 80, controls,
  native_or_packed_or_full_floors_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line, reviewed_SHAs: 80, negative_controls: controls.length,
  native_or_packed_qualified: false}));
