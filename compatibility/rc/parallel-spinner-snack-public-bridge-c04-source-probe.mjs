/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Physical C04 references and strict report successors; no compiler invocation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {captureSpinnerSnackC04Metadata,spinnerSnackC04Source,assertSpinnerSnackRetentionSuccessor,assertSpinnerSnackTokenPlacementSuccessor} from '../../scripts/sass-spinner-snack-c04-source.mjs';
import {reviewThemingInspectionSource} from '../../scripts/upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from '../../scripts/upstream-inspection-compatibility-source-review.mjs';
const roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},positive=[],rejected=[];
const hash=b=>createHash('sha256').update(b).digest('hex'),prefix='compatibility/rc/parallel-spinner-snack-public-bridge-c04-';
let metadataGetters=0;
for(const [id,value,fields] of [
 ['outer-accessor',Object.defineProperty({},'entry',{get(){metadataGetters++;return {};}}),['entry']],
 ['nested-accessor',{entry:Object.defineProperty({},'sha',{get(){metadataGetters++;return 'valid';}})},undefined],
 ['inherited-argument',Object.create({entry:{sha:'valid'}}),['entry']],
 ['symbol',Object.defineProperty({},Symbol('hidden'),{value:'unexpected'}),undefined],
]){assert.throws(()=>captureSpinnerSnackC04Metadata(value,fields));rejected.push('metadata/'+id);}
assert.equal(metadataGetters,0);positive.push('metadata/no-getter-execution');
for(const [id,change] of [
 ['valid-entry-swap',v=>v.entry={sha:'another-valid'}],['absent-to-undefined',v=>v.proof=undefined],
 ['nested-change',v=>v.entry.sha='another-valid'],['array-length',v=>v.files.length=3],
]){const value={entry:{sha:'original-valid'},files:['a']},before=captureSpinnerSnackC04Metadata(value);change(value);assert.notDeepEqual(captureSpinnerSnackC04Metadata(value),before);rejected.push('metadata/'+id);}
const metadataValue={entry:{sha:'valid'},proof:undefined},metadataSnapshot=captureSpinnerSnackC04Metadata(metadataValue,['entry','proof']);assert.equal(Object.hasOwn(metadataSnapshot,'proof'),true);metadataSnapshot.entry.sha='changed';assert.equal(metadataValue.entry.sha,'valid');positive.push('metadata/presence-and-clone');

for(const [line,root] of Object.entries(roots)){
 const read=p=>readFileSync(join(root,p)),packet=JSON.parse(read('compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json')),mf=JSON.parse(read('compatibility/rc/historical-contract-repair-reader-inputs.json'));
 let late=null,mutation=null;
 const callback=p=>{if(mutation&&p===mutation.path){const fn=mutation.fn;mutation=null;fn();}const b=read(p);return p===late?Buffer.concat([b,Buffer.from('\n')]):b;};
 const source=spinnerSnackC04Source({root,read:callback});positive.push(line+'/constructor');
 assert.equal(mf.tool_transitions.length,line==='21.x'?39:11);
 for(const m of packet.branches[line].modules){
  const before=m.tagged.body.replaceAll("'@material/","'../vendor/mdc/");assert.equal(hash(before),m.before.sha256);
  for(const side of ['before','current'])for(const size of [true,false]){
   const input={path:m.path,sha256:m[side].sha256,...(size?{bytes:m[side].bytes}:{}),root:0,role:'historical-comparison',nested:{preserved:true}},saved=structuredClone(input),out=source.qualify(input);
   assert.deepEqual(out,{...saved,sha256:m.current.sha256,...(size?{bytes:m.current.bytes}:{})});assert.deepEqual(input,saved);positive.push(line+'/'+m.family+'/'+side+'/'+size);
  }
  assert.equal(source.assertHistoricalSource(m.path,before).exact_historical_comparison,true);positive.push(line+'/'+m.family+'/historical-source');
  assert.throws(()=>source.assertHistoricalSource(m.path,before+'\n'));rejected.push(line+'/'+m.family+'/changed-historical-source');
  for(const bad of [{sha256:'0'.repeat(64)},{bytes:m.before.bytes+1}]){assert.throws(()=>source.qualify({path:m.path,...m.before,...bad}));rejected.push(line+'/'+m.family+'/wrong-ref/'+Object.keys(bad)[0]);}
  assert.throws(()=>spinnerSnackC04Source({root,read:p=>p===m.path?Buffer.from(before):read(p)}));rejected.push(line+'/'+m.family+'/cold-old-product-callback');
 }
 for(const row of mf.tool_transitions){for(const side of ['before','after']){const ref={path:row.path,...row[side],root:4,role:'historical-tool-reference'},out=source.qualify(ref);assert.deepEqual(out,{...ref,...row.after});positive.push(line+'/tool/'+row.path+'/'+side);}}
 const unknown={path:'projects/ngx-material-legacy/styles/legacy-snack-bar/_snack-bar-theme.scss',sha256:'0'.repeat(64),root:0,role:'unknown-ref'};assert.deepEqual(source.qualify(unknown),unknown);positive.push(line+'/unknown-not-qualified');
 for(const ref of mf.support_inputs){assert.throws(()=>spinnerSnackC04Source({root,read:p=>p===ref.path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}));rejected.push(line+'/cold-support/'+ref.path);}
 for(const path of [...packet.paths,...mf.support_inputs.map(r=>r.path),'compatibility/rc/historical-contract-repair-reader-inputs.json','scripts/measure-sass-inspection-scope.mjs']){late=path;assert.throws(source.assertCurrent);late=null;source.assertCurrent();rejected.push(line+'/late/'+path);}
 for(const [kind,path,ref] of [['product',packet.paths[0],{path:packet.paths[0],...packet.branches[line].modules[0].before}],['tool',mf.tool_transitions.at(-1).path,{path:mf.tool_transitions.at(-1).path,...mf.tool_transitions.at(-1).before}]]){
  let nestedGetters=0;const cold={...ref,nested:Object.defineProperty({},'value',{get(){nestedGetters++;return true;}})};assert.throws(()=>source.qualify(cold));assert.equal(nestedGetters,0);rejected.push(line+'/'+kind+'/cold-reference/nested-accessor');
  for(const change of ['bytes-accessor','bytes-added','bytes-deleted','sha-accessor']){
   const incoming={...ref};if(change==='bytes-added')delete incoming.bytes;let getters=0;
   mutation={path,fn(){if(change==='bytes-accessor')Object.defineProperty(incoming,'bytes',{configurable:true,get(){getters++;incoming.path='foreign.scss';return ref.bytes;}});if(change==='bytes-added')incoming.bytes=ref.bytes;if(change==='bytes-deleted')delete incoming.bytes;if(change==='sha-accessor')Object.defineProperty(incoming,'sha256',{configurable:true,get(){getters++;return ref.sha256;}});}};
   assert.throws(()=>source.qualify(incoming));assert.equal(getters,0);assert.equal(mutation,null);rejected.push(line+'/'+kind+'/late-reference/'+change);
  }
  const nested={...ref,nested:{value:true}};mutation={path,fn(){Object.defineProperty(nested.nested,'value',{get(){nestedGetters++;return true;}});}};assert.throws(()=>source.qualify(nested));assert.equal(nestedGetters,0);assert.equal(mutation,null);rejected.push(line+'/'+kind+'/late-reference/nested-accessor');
 }
 source.bound.length=0;source.summary.sources.length=0;source.bridge.transitions[0].path='foreign.scss';source.assertCurrent();positive.push(line+'/returned-metadata-clones');
 source.bridge.bound[0].sha256='0'.repeat(64);source.bridge.assertCurrent=()=>{};source.bridge.qualify=()=>({path:'foreign.scss',sha256:'0'.repeat(64)});
 late=packet.paths[0];assert.throws(source.assertCurrent);assert.throws(()=>source.qualify({path:packet.paths[0],...packet.branches[line].modules[0].before}));late=null;source.assertCurrent();assert.equal(source.qualify({path:packet.paths[0],...packet.branches[line].modules[0].before}).sha256,packet.branches[line].modules[0].current.sha256);rejected.push(line+'/public-bridge-replacement-cannot-weaken-private-guards');positive.push(line+'/public-bridge-bound-is-private-copy');

 const report={};assert.throws(()=>assertSpinnerSnackRetentionSuccessor({historical:report,current:report,source:{}}));assert.throws(()=>assertSpinnerSnackTokenPlacementSuccessor({historical:report,current:report,source:{}}));rejected.push(line+'/forged-source-subject');
 for(const method of ['read','raw','beforeBytes','comparisonBytes'])assert.equal(source[method],undefined);positive.push(line+'/no-old-product-reader');
}
const subject=spinnerSnackC04Source({root:roots['21.x'],read:p=>readFileSync(join(roots['21.x'],p))});
for(const [kind,fn] of [['theming-inspection',reviewThemingInspectionSource],['inspection-compatibility',reviewInspectionCompatibilitySource]]){
 const reviewed=fn();subject.assertReportSuccessor(kind,reviewed.report);positive.push('report/'+kind+'/strict-current-successor');
 for(const [id,mutate] of [['unrelated-role',r=>r.role+=' changed'],['boundary-count',r=>r.public_override_boundaries++],['drop-binding',r=>r.current_source_bindings.pop()],['foreign-binding',r=>r.current_source_bindings.push({path:'foreign.scss',sha256:'0'.repeat(64),bytes:1})],['wrong-current-ref',r=>r.current_source_bindings.find(x=>x.path.endsWith('progress-spinner/_progress-spinner-theme.scss')).sha256='0'.repeat(64)],['false-rendering-claim',r=>r.current_public_bridge.current_native_packed_browser_floor_or_full_audit_qualified=true]]){const mutant=structuredClone(reviewed.report);mutate(mutant);assert.throws(()=>subject.assertReportSuccessor(kind,mutant));rejected.push('report/'+kind+'/'+id);}
}
const out={schema_version:1,result:'pass',positive,rejected,counts:{positive:positive.length,rejected:rejected.length},compiler_execution:false,metadata_getter_invocations:metadataGetters,original_report_bytes_rewritten:false,old_product_bytes_returned_as_current:false,canonical_dispositions_changed:0,native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out.counts));
