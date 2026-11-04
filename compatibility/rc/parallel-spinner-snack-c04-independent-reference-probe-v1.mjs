/** Actual physical subjects and recursive reference/private guard controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
import {qualifySpinnerSnackSourceRef} from '../../scripts/measure-sass-inspection-scope.mjs';
const root=resolve(process.argv[2]),cutPath=process.argv[3],cutSha=process.argv[4],output=resolve(process.argv[5]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-spinner-snack-c04-independent-')));
const hash=b=>createHash('sha256').update(b).digest('hex'),cutRaw=readFileSync(join(root,cutPath));assert.equal(hash(cutRaw),cutSha);const cut=JSON.parse(cutRaw),results=[];
function assertCut(){for(const branch of Object.values(cut.branches))for(const ref of [...branch.physical_inputs,...branch.unchanged_historical_comparisons]){const b=readFileSync(join(branch.root,ref.path));assert.equal(hash(b),ref.sha256);assert.equal(b.length,ref.bytes);}}
assertCut();
for(const[line,branch]of Object.entries(cut.branches)){
 const read=p=>readFileSync(join(branch.root,p)),packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json')),module=packet.branches[line].modules[0];
 let mutation=null,nonphysical=false,callbackReads=0,watchedPath=module.path;
 const callback=p=>{if(p===watchedPath){callbackReads++;if(mutation){const change=mutation;mutation=null;change();}if(nonphysical)return Buffer.concat([read(p),Buffer.from('\n')]);}return read(p);};
 const source=spinnerSnackC04Source({root:branch.root,read:callback});
 const mf=JSON.parse(read('compatibility/rc/historical-contract-repair-reader-inputs.json'));
 for(const[route,qualify]of [['C04',incoming=>source.qualify(incoming)],['scope',incoming=>qualifySpinnerSnackSourceRef(source.bridge,incoming)],['C04tool',incoming=>source.qualify(incoming)]]){
  const selected=route==='C04tool'?mf.tool_transitions.at(-1):module,after=selected.current??selected.after;watchedPath=selected.path;
  const plain=()=>({path:selected.path,sha256:selected.before.sha256,bytes:selected.before.bytes,root:7,role:'historical-comparison',metadata:{records:[{role:'preserved'}]}});
  const incoming=plain(),qualified=qualify(incoming);assert.deepEqual(qualified,{...incoming,sha256:after.sha256,bytes:after.bytes});assert.equal(incoming.sha256,selected.before.sha256);
  for(const lifecycle of ['cold','late'])for(const shape of ['nested-getter','nested-foreign-prototype','nested-value-change']){
   const ref=plain(),item=ref.metadata.records[0];let getters=0,changed=false;
   const change=()=>{changed=true;if(shape==='nested-getter')Object.defineProperty(item,'role',{get(){getters++;return 'preserved';},enumerable:true,configurable:true});else if(shape==='nested-foreign-prototype')Object.setPrototypeOf(item,{unexpected:true});else item.role='changed';};
   if(lifecycle==='cold'){
    if(shape==='nested-value-change')continue;
    change();
   }else mutation=change;
   assert.throws(()=>qualify(ref),line+'/'+route+'/'+lifecycle+'/'+shape);assert.equal(changed,true);assert.equal(getters,0);mutation=null;source.assertCurrent();
   results.push({line,route,lifecycle,shape,rejected:true,getter_calls:0,actual_physical_subject:true});
  }
  const unknown={path:'projects/ngx-material-legacy/styles/legacy-snack-bar/_snack-bar-theme.scss',sha256:'0'.repeat(64),metadata:{role:'unknown'}};assert.deepEqual(qualify(unknown),unknown);
 }
 // Preserve the original C04 closure while overwriting every exposed child API
 // and mutating every exposed child metadata view. Its product guard must live.
 const retainedAssert=source.assertCurrent,retainedQualify=source.qualify;watchedPath=module.path;
 source.bridge.assertCurrent=()=>{};source.bridge.qualify=()=>({path:'forged.scss',sha256:'0'.repeat(64),bytes:1});source.bridge.bound.length=0;source.bridge.transitions.length=0;source.bound.length=0;source.summary.sources.length=0;
 nonphysical=true;assert.throws(retainedAssert);assert.throws(()=>retainedQualify({path:module.path,...module.before}));nonphysical=false;retainedAssert();assert.equal(retainedQualify({path:module.path,...module.before}).sha256,module.current.sha256);
 results.push({line,route:'retained-private-C04-guards',public_child_methods_and_metadata_overwritten:true,nonphysical_provided_callback_rejected:true,restored_physical_positive:true});
 for(const name of ['read','raw','beforeBytes','comparisonBytes'])assert.equal(source[name],undefined);
}
assertCut();const result={schema_version:1,status:'recursive-reference-and-private-bridge-guards-pass',frozen_cut:{path:cutPath,sha256:cutSha},results,recursive_reference_rejections:results.filter(r=>r.rejected).length,retained_private_bridge_cases:results.filter(r=>r.public_child_methods_and_metadata_overwritten).length,actual_physical_subjects_constructed:2,current_producer_or_compiler_executed:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,rejected:result.recursive_reference_rejections,privateGuards:result.retained_private_bridge_cases}));
