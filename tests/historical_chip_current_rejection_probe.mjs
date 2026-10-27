/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Reject projected historical bytes at the current-subject boundary. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {historicalChipCurrentSubject} from '../scripts/historical-chip-current-subject.mjs';
import {chipRepairPair,CHIP_SOURCE,CHIP_SPEC} from '../scripts/spec-stability-chip-repair.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const pair=chipRepairPair({root}),rejected=[];
for(const row of pair.rows){
  const historical=row.path===CHIP_SOURCE?row.after:row.before;
  assert.notEqual(read(row.path).toString(),historical,'historical/current boundary test requires different authenticated bytes');
  assert.throws(()=>historicalChipCurrentSubject({root,read:p=>p===row.path?Buffer.from(historical):read(p)}),
    /historical source presented as current/);
  rejected.push('unbranded-historical-source/'+row.path);
}
for(const path of [CHIP_SOURCE,CHIP_SPEC]){
  assert.throws(()=>historicalChipCurrentSubject({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n// unreviewed\n')]):read(p)}),
    /historical source presented as current/);
  rejected.push('unreviewed-current-source/'+path);
}
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const report={schema_version:1,line:pair.line,rejected,
  producer:{path:'tests/historical_chip_current_rejection_probe.mjs',sha256:hash(read('tests/historical_chip_current_rejection_probe.mjs'))},
  actual_Angular_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:pair.line,historical_or_unreviewed_current_sources_rejected:rejected.length,native_or_G11_qualified:false}));
