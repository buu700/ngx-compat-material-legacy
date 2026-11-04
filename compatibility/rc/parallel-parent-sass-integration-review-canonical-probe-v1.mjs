/** Exact current canonical-wrapper control flow with substituted source context. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-parent-sass-integration-review-')));
const require=createRequire(join(root,'package.json')),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
function fn(path,name){const text=read(path).toString(),ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);return ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name).getText(ast).replace(/^export /,'');}
const capture=Function('assert',fn('scripts/sass-spinner-snack-c04-source.mjs','captureSpinnerSnackC04Metadata')+';return captureSpinnerSnackC04Metadata;')(assert);
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),results=[];
for(const path of ['scripts/upstream-control-m3-theme-admission.cjs','scripts/upstream-remaining-unthemable-admission.cjs']){
 const actual=require(join(root,path)),reviewPath=actual[Object.keys(actual).find(k=>k.endsWith('_REVIEW'))],image=read(path);
 for(const timing of ['during','late'])for(const target of ['entries','body']){
  const body=JSON.parse(read(reviewPath)),entries=body.reviews.map(row=>structuredClone(ledger.entries.find(e=>e.sha===row.sha))),args={root,body,entries};
  const valid=()=>args.entries.every(entry=>actual.metadataOk({entry,body:args.body,review:args.body.reviews.find(row=>row.sha===entry.sha)}));assert.equal(valid(),true);
  let mutated=false,physicalReads=0;
  const mutate=()=>{mutated=true;if(target==='entries')args.entries=args.entries.map((e,i)=>i===0?{...e,final_disposition:'irrelevant'}:e);else args.body={...body,g11_claim:'passed'};};
  args.read=p=>{physicalReads++;if(timing==='during'&&!mutated)mutate();return read(p);};
  const sourceStub=({read:callback})=>{callback(reviewPath);return {bound:[],assertCurrent(){callback(reviewPath);}};};
  const inspect=Function('assert','metadataOk','ROOT','readFileSync','join','PATCHES','inspectWholeBody','require',fn(path,'inspectCanonicalSource')+';return inspectCanonicalSource;')(
   assert,actual.metadataOk,root,readFileSync,join,Object.fromEntries(entries.map(e=>[e.sha,true])),sourceStub,()=>({captureSpinnerSnackC04Metadata:capture}));
  let constructed=false,reentryAccepted=false;
  try{const ctx=inspect(args);constructed=true;if(timing==='late')mutate();ctx.assertCurrent();reentryAccepted=true;}catch{}
  assert.equal(constructed,true);assert.equal(reentryAccepted,true);assert.equal(mutated,true);assert.equal(valid(),false);assert.ok(physicalReads>0);
  results.push({path,sha256:hash(image),bytes:image.length,timing,target,metadata_before:true,physical_reads:physicalReads,constructed,returned_assertCurrent_accepted:reentryAccepted,live_metadata_after:false,source_context_substituted:true,actual_source_producer_executed:false});
 }
}
const result={schema_version:1,status:'canonical-live-args-replacement-gaps-reproduced',cases:results.length,results,actual_owner_or_compiler_executed:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,cases:results.length}));
