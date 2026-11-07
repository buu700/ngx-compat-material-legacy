/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {reverseFixedReportCapturePackedSource} from './fixed-report-capture-packed-source-successor.mjs';
import {reverseBidiIsolatedPackedSource} from './bidi-isolated-packed-source-requalification.mjs';
import assert from 'node:assert/strict';
import {reverseNativeDatePackedSource} from './native-date-packed-source-context.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path='compatibility/rc/chip-menu-tooltip-packed-source-inputs.json';
const pins={main:'4147ee11af9affe20cf5611544bada1d3e0181310d31bf17b9d21de779bc9638',
 '21.x':'d40f82b76e481eba9b16969b42d9de9269e7523c48d308a3167557512977679c'};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
let cached;
/** Compose before the unchanged earlier guards; never admit a runtime result. */
export function reverseChipMenuTooltipPackedSource(member,raw,line,{readMember,root:providedRoot=root}={}){
 assert.ok(Object.hasOwn(pins,line),'unknown packed observation source line');
 const read=readMember||((p)=>readFileSync(resolve(providedRoot,p)));
 const input=read(path);assert.equal(hash(input),pins[line],'packed observation source inputs changed');
 let capsule;
 if(!readMember&&resolve(providedRoot)===root&&cached)capsule=cached;
 else{
  capsule=JSON.parse(input);assert.equal(capsule.schema_version,1);assert.equal(capsule.line,line);assert.equal(capsule.members.length,17);
  const stored=read(capsule.preimages.path);assert.equal(hash(stored),capsule.preimages.sha256,'packed observation preimages changed');
  const original=gunzipSync(stored);assert.equal(hash(original),capsule.preimages.raw_sha256);const prior=JSON.parse(original);
  assert.equal(prior.line,line);assert.equal(prior.source_parent,capsule.source_parent);
  assert.equal(new Set(capsule.members.map(m=>m.path)).size,capsule.members.length);
  for(const record of prior.members){assert.equal(hash(record.text),record.sha256);
   assert.equal(capsule.members.find(m=>m.path===record.path)?.before_sha256,record.sha256);}
  if(!readMember&&resolve(providedRoot)===root)cached=capsule;
 }
 const record=capsule.members.find(m=>m.path===member);assert.ok(record,'foreign packed observation source path');
 raw=reverseFixedReportCapturePackedSource(member,raw,line,{readMember,root:providedRoot});
 if(hash(raw)!==record.current_sha256){raw=reverseNativeDatePackedSource(member,raw,{readMember});raw=reverseBidiIsolatedPackedSource(member,raw,line,{readMember});}
 assert.equal(typeof raw,'string');assert.equal(hash(raw),record.current_sha256,'unreviewed packed observation source change');
 let restored=raw;
 for(const [before,after]of [...record.edits].reverse()){
  assert.equal(restored.split(after).length,2,'missing/ambiguous packed observation edit');restored=restored.replace(after,()=>before);
 }
 assert.equal(hash(restored),record.before_sha256,'preceding packed source not recovered');
 // The older packed guard predates two independently committed context changes.
 // Reconstruct its exact subject without changing the live matrix or test policy.
 if(record.historical_delta){
  const matrix=JSON.parse(restored);assert.equal(restored,JSON.stringify(matrix,null,2)+'\n');
  const group=matrix.checks.find(c=>c.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line];
  const delta=record.historical_delta;assert.equal(delta.added.length,68);assert.equal(new Set(delta.added).size,68);
  assert.equal(Object.values(group).flat().length,2225);assert.ok(delta.added.every(id=>group[delta.case_group].includes(id)));
  group[delta.case_group]=group[delta.case_group].filter(id=>!delta.added.includes(id));
  assert.equal(Object.values(group).flat().length,2157);restored=JSON.stringify(matrix,null,2)+'\n';
 }
 for(const [before,after]of [...(record.carry_forward_edits||[])].reverse()){
  assert.equal(restored.split(after).length,2,'changed conditional review context');restored=restored.replace(after,()=>before);
 }
 assert.equal(hash(restored),record.guard_preimage_sha256||record.before_sha256,'older packed guard context not recovered');return restored;
}
