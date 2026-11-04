/** Current canonical guard late getter controls; actual capture export, no compiler. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-spinner-snack-c04-independent-')));
const require=createRequire(join(root,'package.json')),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
const capture=require(join(root,'scripts/sass-spinner-snack-c04-source.mjs')).captureSpinnerSnackC04Metadata;
const packet=JSON.parse(read('compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v4.json')),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),results=[];
for(const path of ['scripts/upstream-control-m3-theme-admission.cjs','scripts/upstream-remaining-unthemable-admission.cjs']){
 const actual=require(join(root,path)),image=read(path),row=packet.paths.find(r=>r.path===path);assert.equal(hash(image),row.after_sha256);
 const reviewPath=actual[Object.keys(actual).find(k=>k.endsWith('_REVIEW'))],ast=ts.createSourceFile(path,image.toString(),ts.ScriptTarget.Latest,true),text=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='inspectCanonicalSource').getText(ast);
 for(const timing of ['during','late'])for(const target of ['body-reviews','entry-sha','proof-kind']){
  const body=JSON.parse(read(reviewPath)),entries=body.reviews.map(r=>structuredClone(ledger.entries.find(e=>e.sha===r.sha))),args={root,body,entries};
  const selected=target==='body-reviews'?body:target==='entry-sha'?entries[0]:entries[0].individual_proof,key=target==='body-reviews'?'reviews':target==='entry-sha'?'sha':'proof_kind',value=selected[key];
  let mutated=false,getterCalls=0,physicalReads=0,retained;
  const mutate=()=>{mutated=true;Object.defineProperty(selected,key,{get(){getterCalls++;return value;},enumerable:true,configurable:true});};
  args.read=p=>{physicalReads++;if(timing==='during'&&!mutated)mutate();return read(p);};
  const stub=({read:callback})=>{callback(reviewPath);return {bound:[],assertCurrent(){callback(reviewPath);}};};
  const inspect=Function('assert','metadataOk','ROOT','readFileSync','join','PATCHES','inspectWholeBody','require',text+';return inspectCanonicalSource;')(
   assert,actual.metadataOk,root,readFileSync,join,Object.fromEntries(entries.map(e=>[e.sha,true])),stub,()=>({captureSpinnerSnackC04Metadata:capture}));
  let accepted=false;
  try{retained=inspect(args);if(timing==='late')mutate();retained.assertCurrent();accepted=true;}catch{}
  assert.equal(accepted,false);assert.equal(mutated,true);assert.equal(getterCalls,0);assert.ok(physicalReads>0);
  Object.defineProperty(selected,key,{value,enumerable:true,configurable:true,writable:true});
  const restored=inspect({...args,read});restored.assertCurrent();if(retained)retained.assertCurrent();
  results.push({path,sha256:row.after_sha256,bytes:row.after_bytes,timing,target,getter_calls:0,rejected:true,restored_authentic_positive:true,actual_capture_export_used:true,whole_body_source_context_substituted:true,actual_source_producer_executed:false});
 }
}
const result={schema_version:1,status:'canonical-private-metadata-clones-prevent-late-getters',cases:results.length,results,getter_calls:0,actual_compiler_or_owner_executed:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,cases:results.length,getterCalls:0}));
