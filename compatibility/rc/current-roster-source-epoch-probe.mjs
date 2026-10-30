/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exercise the real subject and public current-reader unwrap; no full owner traversal. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {currentAuthoredRosterSourceSubject,currentAuthoredRosterRawRead} from '../../scripts/current-authored-roster-source.mjs';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {snackDomRawCurrentRead,dialogTitlePriorMetadataRead} from '../../scripts/snack-dom-source-context.mjs';
const root=process.cwd(),prefix='compatibility/rc/current-roster-source-epoch-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
let altered;const read=path=>{const b=readHistoricalContractRepairOwnerMember(root,path);return path===altered?Buffer.concat([b,Buffer.from('\n/* test mutation */\n')]):b;};
const report={schema_version:1,full_snack_owner_or_shipped_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const s=currentAuthoredRosterSourceSubject({root,read}),controls=[];assert.equal(s.current_graph.frozen,1736);assert.equal(s.current_graph.additional_obligations,317);assert.equal(s.current_graph.live_additional_uses,315);assert.equal(s.historical_metadata_paths.length,2);
 assert.equal(currentAuthoredRosterRawRead({root,read:s.metadataRead}),read);assert.equal(snackDomRawCurrentRead({root,read:s.metadataRead}),read);
 const title=dialogTitlePriorMetadataRead({root,read:s.metadataRead});assert.equal(snackDomRawCurrentRead({root,read:title}),read);assert.equal(hash(snackDomRawCurrentRead({root,read:title})(s.after[1].path)),s.after[1].sha256);
 for(let i=0;i<2;i++){
  const before=s.before[i],after=s.after[i],old=s.metadataRead(before.path);assert.equal(hash(old),before.sha256);assert.equal(hash(s.raw(before.path)),after.sha256);old[0]^=1;assert.equal(hash(s.metadataRead(before.path)),before.sha256);
  for(const side of [before,after]){assert.deepEqual(s.qualify(side),after);assert.deepEqual(s.historicalReference(side),before);for(const bad of [{...side,sha256:'0'.repeat(64)},{...side,bytes:side.bytes+1}]){assert.throws(()=>s.qualify(bad));controls.push({id:'unknown-or-wrong-size-reference',path:side.path,rejected:true});}}
 }
 const source='projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts';assert.ok(s.metadataRead(source).equals(read(source)));assert.equal(s.qualify({path:source,sha256:'0'.repeat(64)}),null);
 for(const path of [s.after[0].path,s.after[1].path,'compatibility/f10/authored-use-reviews/current-repaired-source-integration-v2.json','reference/material-16.2.14/interface-sources/menu-panel.ts',source,'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts','compatibility/rc/current-roster-source-epoch-inputs.json','scripts/current-authored-roster-source.mjs']){altered=path;assert.throws(()=>s.metadataRead(s.before[0].path));altered=undefined;controls.push({id:'late-current-input-change',path,rejected:true});}
 assert.throws(()=>currentAuthoredRosterRawRead({root:root+'/another-checkout',read:s.metadataRead}));controls.push({id:'cross-checkout-reader',rejected:true});
 altered=s.after[1].path;assert.throws(()=>currentAuthoredRosterSourceSubject({root,read}));altered=undefined;controls.push({id:'cold-nonphysical-current-roster',rejected:true});s.assertCurrent();
 Object.assign(report,{status:'pass',line:s.line,current_graph:s.current_graph,before:s.before,after:s.after,bindings:s.bound,controls_rejected:controls.length,controls,historical_buffers_are_copies:true,product_and_program_reads_current:true,public_current_reader_unwraps_registered_epoch:true,nested_title_reader_unwraps_to_original_callback:true});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,controls_rejected:report.controls_rejected,error:report.error}));
