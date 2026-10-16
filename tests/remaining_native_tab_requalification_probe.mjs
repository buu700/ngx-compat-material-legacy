/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** One actual source pipeline; cache only its immutable subjects for metadata corruption controls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectTabRepairSourceRequalification,assertRemainingNativeMetadataState} from '../scripts/remaining-native-tab-repair-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=inspectTabRepairSourceRequalification({root}),{previous,writes}=result,cases=[];
assert.equal(result.source_scope_rows,52);assert.equal(result.authored_rows,13);assert.equal(result.runtime_contexts,17);assert.equal(writes.size,28);
const ledger='compatibility/f10/disposition-ledger/ledger.json',oldLedger=JSON.parse(previous.get(ledger)),newLedger=JSON.parse(writes.get(ledger));
assert.equal(oldLedger.entries.length,1697);assert.equal(newLedger.entries.length,1697);
for(let index=0;index<oldLedger.entries.length;index++)for(const field of ['sha','bucket','final_disposition','review_depth','subject','affected_branches'])assert.deepEqual(newLedger.entries[index][field],oldLedger.entries[index][field]);
const frozen='compatibility/f10/authored-dependency-dispositions.json',current='compatibility/f10/authored-dependency-current-dispositions.json';
for(const path of [frozen,current]){
 const before=JSON.parse(previous.get(path)).symbol_uses,after=JSON.parse(writes.get(path)).symbol_uses;assert.equal(before.length,after.length);
 for(let index=0;index<before.length;index++)for(const field of ['file','module','symbol','status','disposition'])assert.deepEqual(after[index][field],before[index][field]);
}
assert.equal(result.frozenEvidence.insufficient,0);assert.equal(result.frozenEvidence.reviewed,1446);assert.equal(result.currentAdmission.source_snapshot_valid,true);assert.equal(result.currentAdmission.review_evidence.insufficient,0);assert.equal(result.currentAdmission.review_evidence.reviewed,178);
const directory=mkdtempSync(resolve(tmpdir(),'ngx-tab-context-controls-'));
try{
 const paths=[...new Set([...previous.keys(),...writes.keys()])].filter(path=>path.startsWith('compatibility/'));
 // Materialize only owned existence sentinels. Every byte comparison below reads
 // the actual pipeline's cached before/proposed subjects, never these sentinels.
 for(const path of paths)if(!previous.has(path)){const file=resolve(directory,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,'existence sentinel');}
 for(const state of ['preceding','proposed']){
  const subjects=new Map(paths.map(path=>[path,state==='preceding'?(previous.get(path)||writes.get(path)):(writes.get(path)||previous.get(path))]));
  const readMember=path=>subjects.get(path)||read(path);
  assertRemainingNativeMetadataState({root:directory,previous,writes,read:readMember});
  for(const path of paths){const damaged=Buffer.concat([subjects.get(path),Buffer.from('\n ')]);
   assert.throws(()=>assertRemainingNativeMetadataState({root:directory,previous,writes,read:name=>name===path?damaged:readMember(name)}),/changed/);
   cases.push({id:state+'-caller-corruption-'+path,result:'rejected'});
  }
 }
}finally{rmSync(directory,{recursive:true,force:true});}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schema_version:1,line:result.line,scope:'One real readonly preceding/current source pipeline plus cached actual before/proposed metadata controls. No historical assertion, disposition or use closure changed.',actual_readonly_pipeline:true,source_scope_rows:52,existing_roles:13,existing_runtime_requirements:17,proposed_writes:28,metadata_corruption_controls:cases.length,cases,all1697_dispositions_and_all_authored_statuses_preserved:true,frozen_reviewed:1446,frozen_insufficient:0,current_delta_reviewed:178,current_delta_insufficient:0,current_source_snapshot_valid:true,producer:{path:'scripts/remaining-native-tab-repair-requalification.mjs',sha256:hash(read('scripts/remaining-native-tab-repair-requalification.mjs'))},test_producer_sha256:hash(read('tests/remaining_native_tab_requalification_probe.mjs')),actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,source_scope_rows:52,existing_roles:13,existing_runtime_requirements:17,metadata_corruption_controls:cases.length,actual_native_packed_or_floor_qualified:false}));
