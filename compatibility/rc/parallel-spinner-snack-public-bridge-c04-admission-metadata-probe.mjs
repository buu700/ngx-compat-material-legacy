/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Two actual admission routes; coherent metadata swaps and zero-getter controls. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
import {sassInspectionProof,sassInspectionEntrySourceOk,sassInspectionEntryEvidenceOk} from '../../scripts/upstream-sass-inspection-admission.mjs';
const require=createRequire(import.meta.url),modern=require('../../scripts/upstream-modern-control-base-admission.cjs');
const primary=process.cwd(),main='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy',mainSass=await import(pathToFileURL(join(main,'scripts/upstream-sass-inspection-admission.mjs'))),positive=[],rejected=[];let getterCalls=0;
const build=(root,line,body,index,proof,reviewPath)=>{const row=body.reviews[index];const entry={sha:row.sha,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',affected_branches:[line],files:row.frozen_seed_paths,evidence_report:reviewPath,g11_claim:'not-passed',individual_proof:proof(row)};return {root,entry,proof:entry.individual_proof,review:row,body};};
for(const [kind,root,line,path,proof,check,fresh] of [
 ['modern-control-base',primary,'21.x',modern.CONTROL_REVIEW,modern.controlProof,modern.sourceOk,modern.sourceOk],
 ['sass-inspection/21.x',primary,'21.x','compatibility/rc/upstream-sass-inspection-individual-review.json',row=>sassInspectionProof(row,'21.x'),sassInspectionEntrySourceOk,sassInspectionEntryEvidenceOk],
 ['sass-inspection/main',main,'main','compatibility/rc/upstream-sass-inspection-individual-review.json',row=>mainSass.sassInspectionProof(row,'main'),mainSass.sassInspectionEntrySourceOk,mainSass.sassInspectionEntryEvidenceOk],
]){
 const read=p=>readFileSync(join(root,p)),body=JSON.parse(read(path));let action=null,mutated=false;
 const callback=p=>{if(action){const mutate=action;action=null;mutated=true;mutate();}return read(p);};
 const args={...build(root,line,body,0,proof,path),read:callback,...(kind.startsWith('sass-inspection')?{line}:{})};
 assert.equal(fresh(args),true);positive.push(kind+'/actual-fresh-route');
 for(const id of ['coherent-reviewed-entry-swap','entry-field-change','outer-entry-accessor','nested-proof-accessor','optional-argument-deletion','inherited-argument-entry']){
  Object.assign(args,build(root,line,body,0,proof,path));if(kind.startsWith('sass-inspection'))args.line=line;mutated=false;
  if(id==='coherent-reviewed-entry-swap')action=()=>{const next=build(root,line,body,1,proof,path);args.entry=next.entry;args.review=next.review;args.proof=next.proof;};
  if(id==='entry-field-change')action=()=>args.entry.reason+=' changed';
  if(id==='outer-entry-accessor')action=()=>{const saved=args.entry;Object.defineProperty(args,'entry',{configurable:true,enumerable:true,get(){getterCalls++;return saved;}});};
  if(id==='nested-proof-accessor')action=()=>{const saved=args.entry.individual_proof.proof_kind;Object.defineProperty(args.entry.individual_proof,'proof_kind',{configurable:true,enumerable:true,get(){getterCalls++;return saved;}});};
  if(id==='optional-argument-deletion')action=()=>{if(kind.startsWith('sass-inspection'))delete args.root;else delete args.proof;};
  if(id==='inherited-argument-entry'){Object.setPrototypeOf(args,{entry:args.entry});delete args.entry;action=null;}
  assert.equal(check(args),false,kind+'/'+id);if(id!=='inherited-argument-entry')assert.equal(mutated,true);
  if(id==='coherent-reviewed-entry-swap'&&kind==='modern-control-base')assert.equal(modern.metadataOk(args),true,'swap remains semantically valid metadata');
  assert.equal(getterCalls,0,kind+'/'+id);rejected.push(kind+'/'+id);
  if(id==='outer-entry-accessor')delete args.entry;Object.setPrototypeOf(args,Object.prototype);
 }
 Object.assign(args,build(root,line,body,0,proof,path));assert.equal(check(args),true);positive.push(kind+'/restored-authentic-route');
}
const out={schema_version:1,result:'pass',positive,rejected,getter_invocations:getterCalls,fresh_bounded_compiler_execution:true,full_owner_build_browser_matrix_executed:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({positive:positive.length,rejected:rejected.length,getterCalls}));
