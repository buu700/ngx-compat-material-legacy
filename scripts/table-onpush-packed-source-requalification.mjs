/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Immutable pre-addition identities. These do not replace the older npm guard preimages.
export const TABLE_ONPUSH_SOURCE_PREIMAGES = {
  main: {commit:'863f2fe49a3637213c6c556436872a31c2be1e60',
    producer:'f2a7fd46d4edb31b78fe7c80c38dd5eea3ce3ca1513eb8cc0c019499a9e403ea',
    evidence:'c22371359e18c91f5a42c1330da0540d5fe60a8548e097b4401b6cac56ad70c6',
    matrix:'81e830efb051a82ffe72c65979c705d04b76c3c4ff59f8ede01b54095bd94691'},
  '21.x': {commit:'6486e9eecb0d038ec5edee8911c5577abcc95dc5',
    producer:'bf774f8152deca433b700706a27c060580c30d25de2c90df2e154d43b5ab2011',
    evidence:'66cb5ba026105aa7edc9c0ae8a1c8533062b4d1b9a3afda0d652db20b6ed9ea1',
    matrix:'221c7ae914900667de660da2df2a2e9af4e07271c68662e08c7bd57589197d98'},
};
export const TABLE_ONPUSH_SOURCE_EDITS = [
  ["import {packedValueAccessorCases} from './value-accessor-packed-contract.mjs';",
    "import {packedValueAccessorCases} from './value-accessor-packed-contract.mjs';\nimport {tableOnPushPackedFixture} from './table-onpush-packed-fixture.mjs';\nimport {packedTableOnPushCase} from './table-onpush-packed-contract.mjs';"],
  ['  const valueAccessorCases = new Map(packedValueAccessorCases(parsed.valueAccessorRegistration).map(row => [row.case_id, row]));',
    '  const valueAccessorCases = new Map(packedValueAccessorCases(parsed.valueAccessorRegistration).map(row => [row.case_id, row]));\n  const tableOnPushCase = packedTableOnPushCase(parsed.tableOnPushRendering);'],
  ['    if (valueAccessorCases.has(caseId)) return valueAccessorCases.get(caseId);',
    '    if (valueAccessorCases.has(caseId)) return valueAccessorCases.get(caseId);\n    if (caseId === tableOnPushCase.case_id) return tableOnPushCase;'],
  ["    writeFileSync(join(consumer, 'src/value-accessor-contract.mjs'), readFileSync(join(root, 'scripts/value-accessor-packed-contract.mjs')));",
    "    writeFileSync(join(consumer, 'src/value-accessor-contract.mjs'), readFileSync(join(root, 'scripts/value-accessor-packed-contract.mjs')));\n    writeFileSync(join(consumer, 'src/table-onpush-probe.ts'), tableOnPushPackedFixture());\n    writeFileSync(join(consumer, 'src/table-onpush-contract.mjs'), readFileSync(join(root, 'scripts/table-onpush-packed-contract.mjs')));"],
  ["import {observePackedValueAccessors} from './value-accessor-probe';",
    "import {observePackedValueAccessors} from './value-accessor-probe';\nimport {PackedOnPushTableHost, observePackedTableOnPush} from './table-onpush-probe';"],
  ['    imports: [HarnessHost, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule],',
    '    imports: [HarnessHost, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule, PackedOnPushTableHost],'],
  ['  const valueAccessors=await observePackedValueAccessors();',
    '  const valueAccessors=await observePackedValueAccessors();\n  const tableOnPush=await observePackedTableOnPush();'],
  ['    valueAccessorRegistration:valueAccessors.rows,',
    '    valueAccessorRegistration:valueAccessors.rows,\n    tableOnPushRendering:tableOnPush.observed,'],
  ['&& tabLabelOriginalConstructor && valueAccessors.okay && engineFreeAnimationPolicy,',
    '&& tabLabelOriginalConstructor && tableOnPush.okay && valueAccessors.okay && engineFreeAnimationPolicy,'],
];
const hash = raw => createHash('sha256').update(raw).digest('hex');
function exactlyOnce(raw, from, to) {
  assert.equal(raw.split(from).length - 1, 1, 'Missing, mutated or duplicate bounded source addition');
  return raw.replace(from, to);
}

/** Undo only this finite addition, then authenticate the entire recovered old program. */
export function reverseTableOnPushPackedSource(path, raw, line) {
  const preimage=TABLE_ONPUSH_SOURCE_PREIMAGES[line];assert.ok(preimage, 'Unknown source line');
  const id='packed-consumer/harness/table-no-data-row-on-push-rendering';
  let restored, digest;
  if(path==='scripts/packed-consumer-aot-smoke.mjs') {
    restored=TABLE_ONPUSH_SOURCE_EDITS.reduce((source,[before,after])=>exactlyOnce(source,after,before),raw);
    digest=preimage.producer;
  } else if(path==='scripts/packed-consumer-evidence.mjs') {
    restored=exactlyOnce(raw,"  '"+id+"',\n",'');digest=preimage.evidence;
  } else if(path==='compatibility/rc/matrices/full-verify.json') {
    const matrix=JSON.parse(raw);assert.equal(raw,JSON.stringify(matrix,null,2)+'\n','Noncanonical matrix bytes');
    const check=matrix.checks.find(row=>row.check_id==='packed-consumer');assert.ok(check);
    assert.ok(Array.isArray(check.acceptance.cases_by_line[line].harness));
    for(const branch of ['main','21.x']) {
      const roster=check.acceptance.cases_by_line[branch].harness;
      if(roster===null)continue;
      assert.equal(roster.filter(value=>value===id).length,1);
      check.acceptance.cases_by_line[branch].harness=roster.filter(value=>value!==id);
    }
    restored=JSON.stringify(matrix,null,2)+'\n';digest=preimage.matrix;
  } else throw Error('Foreign source-requalification path');
  assert.equal(hash(restored),digest,'Unrelated old source changed');
  return restored;
}
