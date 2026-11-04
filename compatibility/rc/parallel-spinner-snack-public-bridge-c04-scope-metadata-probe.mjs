/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Final whole-scope live metadata guards against genuine physical callbacks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
const roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},P='compatibility/rc/parallel-spinner-snack-public-bridge-c04-',hash=b=>createHash('sha256').update(b).digest('hex'),results=[];
for(const [line,root]of Object.entries(roots)){
 const read=p=>readFileSync(join(root,p)),decode=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(read(p)):read(p));
 const api=await import(pathToFileURL(join(root,'scripts/measure-sass-inspection-scope.mjs'))),watch=JSON.parse(read('compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json')).paths[0];
 let armed=false,change=null,changed=false;
 const callback=p=>{const bytes=read(p);if(armed&&p===watch){armed=false;changed=true;change();}return bytes;};
 const source=spinnerSnackC04Source({root,read:callback}),realGuard=source.bridge.assertCurrent;
 let historical=decode('compatibility/rc/upstream-sass-inspection-current-scope.json.gz').actual;
 if(line==='main'){const n=await import(pathToFileURL(join(root,'scripts/sass-wrapper-notice-subject.mjs')));historical=n.sassWrapperNoticeSubject({root,read,line:'main'}).qualifySassScope(historical);}
 const current=decode(P+(line==='21.x'?'scope-21-v1.json':'scope-controls-main-v1.json'))[line==='21.x'?'current':'actual'];current.producer.sha256=hash(read(current.producer.path));
 const invoke=(old,now,target=0)=>{let guardCount=0;const bridge={...source.bridge,assertCurrent(){guardCount++;armed=guardCount===target;realGuard();armed=false;}};return api.assertSpinnerSnackInspectionScopeSuccessor({root,historical:old,current:now,bridge});};
 invoke(historical,current);
 for(const side of ['historical','current'])for(const lifecycle of ['cold-getter','first-guard-getter','last-guard-getter','last-guard-value']){
  const old=structuredClone(historical),now=structuredClone(current),selected=side==='historical'?old:now,value=selected.role;let getters=0;changed=false;
  change=()=>{if(lifecycle==='last-guard-value')selected.role=value+' INVALID';else Object.defineProperty(selected,'role',{configurable:true,enumerable:true,get(){getters++;return value;}});};
  if(lifecycle==='cold-getter'){change();changed=true;}
  assert.throws(()=>invoke(old,now,lifecycle==='cold-getter'?0:lifecycle==='first-guard-getter'?1:2));assert.equal(changed,true);assert.equal(getters,0);
  Object.defineProperty(selected,'role',{configurable:true,enumerable:true,writable:true,value});invoke(old,now);source.assertCurrent();
  results.push({line,side,lifecycle,rejected:true,getter_calls:getters,genuine_physical_callback_bytes:true,restored_authentic_positive:true});
 }
}
const out={schema_version:1,result:'pass',routes:2,negative_controls:results.length,results,physical_source_subject_constructed:true,compiler_or_producer_executed:false,retained_scope_receipts_rewritten:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:out.result,rejected:results.length}));
