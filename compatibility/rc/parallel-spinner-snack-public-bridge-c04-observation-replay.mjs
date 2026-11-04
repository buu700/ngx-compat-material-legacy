/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Revalidate immutable actual compiler observations. Does not invoke a compiler. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
import {modeledC04Reports} from './parallel-spinner-snack-c04-independent-modeled-reports-v1.mjs';
const roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},prefix='compatibility/rc/parallel-spinner-snack-public-bridge-c04-',hash=b=>createHash('sha256').update(b).digest('hex');
const read=(root,p)=>readFileSync(join(root,p)),decode=(root,p)=>JSON.parse(p.endsWith('.gz')?gunzipSync(read(root,p)):read(root,p)),ref=(root,path)=>{const raw=read(root,path);return {path,sha256:hash(raw),bytes:raw.length};};
const frozen=decode(roots['21.x'],prefix+'frozen-inputs-v2.json'),rows=[],rehashed=new Map(),virtual=[];
for(const [line,root] of Object.entries(roots))for(const row of [...frozen.branches[line].physical_inputs,...frozen.branches[line].unchanged_historical_comparisons])assert.deepEqual(ref(root,row.path),row);
const verify=(root,row,path=row.path)=>{const raw=read(root,path);assert.equal(hash(raw),row.sha256,path);if(Object.hasOwn(row,'bytes'))assert.equal(raw.length,row.bytes,path);rehashed.set(root+'\0'+path,{line:root===roots.main?'main':'21.x',path,sha256:row.sha256,bytes:raw.length});};
for(const [line,root] of Object.entries(roots)){
 const module=await import(pathToFileURL(join(root,'scripts/measure-sass-inspection-scope.mjs'))),source=spinnerSnackC04Source({root,read:p=>read(root,p)});
 const receipt=prefix+(line==='21.x'?'scope-21-v1.json':'scope-controls-main-v1.json'),prior=decode(root,receipt),actual=structuredClone(prior[line==='21.x'?'current':'actual']);
 // Exact old receipt remains untouched; only authenticated metadata successor
 // projection changes the producer digest, whose executable compiler entry is exact.
 assert.equal(actual.producer.path,'scripts/measure-sass-inspection-scope.mjs');actual.producer.sha256=ref(root,actual.producer.path).sha256;
 let historical=decode(root,'compatibility/rc/upstream-sass-inspection-current-scope.json.gz').actual,notice=null;
 if(line==='main'){const api=await import(pathToFileURL(join(root,'scripts/sass-wrapper-notice-subject.mjs')));notice=api.sassWrapperNoticeSubject({root,read:p=>read(root,p),line:'main'});historical=notice.qualifySassScope(historical);}
 module.assertSpinnerSnackInspectionScopeSuccessor({root,historical,current:actual,bridge:source.bridge});notice?.assertCurrent();
 for(const r of actual.owned_scss_population)verify(root,r);
 for(const [key,bases]of [['candidate',['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/']],['current',['node_modules/@angular/material/','node_modules/@angular/cdk/']]])for(const r of actual[key].loaded_sources)verify(root,r,bases[r.root]+r.path);
 source.assertCurrent();rows.push({line,receipt:ref(root,receipt),kind:'scope',historical_rows:409,old_boundaries:4,current_boundaries:6,public_override_mixins:18,only_projected_field:'producer.sha256',matcher_pass:true,existing_main_notice_subject_composed:line==='main'});
}
const root=roots['21.x'],source=spinnerSnackC04Source({root,read:p=>read(root,p)}),models=modeledC04Reports(root,source);
for(const [id,name,key]of [['control-m3-theme','control-source-21-v2.json','control_measurement'],['remaining-unthemable','remaining-source-21-v1.json','argument_measurement']]){
 const path=prefix+name,actual=decode(root,path),expected=models.find(m=>m.id===id).current;assert.deepEqual(actual[key],expected[key]);
 for(const r of actual.compiler_inputs)verify(root,r);
 for(const row of actual[key].cases)for(const side of ['actual','peer'])if(row[side])for(const r of row[side].loaded_sources){
  if(r.path==='/owned/material/_selected-control-entry.scss'||r.path==='/owned/material/_remaining-selected.scss'){
   const body=row.finite_family_forward_harness??row.harness;assert.equal(hash(body),r.sha256);assert.equal(Buffer.byteLength(body),r.bytes);virtual.push({case_id:row.case_id,path:r.path,sha256:r.sha256,bytes:r.bytes});
  }else if(r.path.startsWith('/owned/material/'))verify(root,r,'projects/ngx-material-legacy/styles/'+r.path.slice('/owned/material/'.length));
  else if(r.path.startsWith('/@angular/'))verify(root,r,'node_modules'+r.path);
  else assert.fail('unknown current loaded source '+r.path);
 }
 rows.push({line:'21.x',receipt:ref(root,path),kind:id,case_count:actual[key].case_count,whole_measurement_equal:true,compiler_inputs_rehashed:actual.compiler_inputs.length});
}
for(const [id,name]of [['legacy-retention','modern-control-base-21-v1.json'],['token-placement','token-placement-21-v1.json']]){
 const path=prefix+name,actual=decode(root,path).current,expected=models.find(m=>m.id===id).current;
 const retained=structuredClone(actual),projection=structuredClone(expected);for(const key of ['input_members','current_public_bridge']){delete retained[key];delete projection[key];}assert.deepEqual(retained,projection);
 for(const r of actual.loaded_sources)verify(root,r);
 rows.push({line:'21.x',receipt:ref(root,path),kind:id,whole_measurement_except_current_guard_appendix_equal:true,public_legacy_default_cases:actual.public_legacy_default_CSS_cases.length,direct_original_legacy_color_cases:actual.direct_original_legacy_color_cases.length,loaded_source_count:actual.loaded_sources.length});
}
source.assertCurrent();
const result={schema_version:1,result:'pass',role:'Rehash and replay actual immutable compiler observations under exact tool-only metadata successor; no fresh compiler or full producer execution',cut:ref(root,prefix+'frozen-inputs-v2.json'),tool_only_successor:ref(root,prefix+'metadata-successor-v2.json.gz'),review_model:ref(root,'compatibility/rc/parallel-spinner-snack-c04-independent-modeled-reports-v1.mjs'),observations:rows,physical_current_sass_and_compiler_files_rehashed:rehashed.size,physical_current_sass_and_compiler_inputs:[...rehashed.values()],virtual_forward_harness_rows_rehashed:virtual.length,virtual_forward_harnesses:virtual,fresh_compiler_executed:false,full_producers_or_owner_executed:false,original_receipt_report_goldens_rewritten:false,current_native_packed_browser_floor_or_full_audit_qualified:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:result.result,observations:rows.length,physical_files:rehashed.size,virtual_harness_rows:virtual.length}));
