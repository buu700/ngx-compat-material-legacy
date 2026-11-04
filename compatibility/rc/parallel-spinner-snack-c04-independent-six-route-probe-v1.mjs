/** All6 actual matcher routes; modeled authenticated data, no source producer or Sass. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spinnerSnackC04Source,assertSpinnerSnackRetentionSuccessor,assertSpinnerSnackTokenPlacementSuccessor} from '../../scripts/sass-spinner-snack-c04-source.mjs';
import {modeledC04Reports} from './parallel-spinner-snack-c04-independent-modeled-reports-v1.mjs';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-spinner-snack-c04-independent-')));
const read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),watch='compatibility/rc/21x-c04-theming-inspection-source-review.json';
let trigger=null,reads=0;
const callback=p=>{if(trigger&&p===watch){reads++;if(reads===trigger.at){const change=trigger.change;trigger=null;change();}}return read(p);};
const source=spinnerSnackC04Source({root,read:callback}),models=modeledC04Reports(root,source),results=[];
const invoke=(model,historical,current)=>model.kind==='report'?source.assertReportSuccessor(model.id,current):model.id==='legacy-retention'?assertSpinnerSnackRetentionSuccessor({historical,current,source}):assertSpinnerSnackTokenPlacementSuccessor({historical,current,source});
for(const model of models){
 invoke(model,model.historical,model.current);
 for(const side of model.kind==='report'?['current']:['historical','current']){
  for(const lifecycle of ['cold-getter','first-guard-getter','last-guard-getter','last-guard-value']){
   const historical=structuredClone(model.historical),current=structuredClone(model.current),selected=side==='current'?current:historical,key=model.kind==='report'?'role':'line',value=selected[key];assert.equal(typeof value,'string');
   let getterCalls=0,changed=false;
   const change=()=>{changed=true;if(lifecycle==='last-guard-value')selected[key]=value+' INVALID-LATE';else Object.defineProperty(selected,key,{get(){getterCalls++;return value;},enumerable:true,configurable:true});};
   reads=0;if(lifecycle==='cold-getter')change();else trigger={at:lifecycle==='first-guard-getter'?1:2,change};
   let accepted=false;try{invoke(model,historical,current);accepted=true;}catch{}
   trigger=null;assert.equal(changed,true,model.id+'/'+side+'/'+lifecycle+' callback did not run');assert.equal(accepted,false,model.id+'/'+side+'/'+lifecycle+' accepted');assert.equal(getterCalls,0,model.id+'/'+side+'/'+lifecycle+' getter invoked');
   Object.defineProperty(selected,key,{value,enumerable:true,configurable:true,writable:true});invoke(model,historical,current);source.assertCurrent();
   results.push({route:model.id,side,lifecycle,rejected:true,getter_calls:getterCalls,callback_returned_genuine_physical_bytes:true,restored_authentic_positive:true});
  }
 }
}
const result={schema_version:1,status:'six-physical-matcher-routes-live-metadata-controls-pass',helper:{path:'scripts/sass-spinner-snack-c04-source.mjs',sha256:hash(read('scripts/sass-spinner-snack-c04-source.mjs'))},routes:models.length,negative_controls:results.length,positive_modeled_reports:models.length,results,actual_physical_source_subject_constructed:true,source_producer_or_compiler_executed:false,source_or_report_files_edited:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,routes:models.length,rejected:results.length}));
