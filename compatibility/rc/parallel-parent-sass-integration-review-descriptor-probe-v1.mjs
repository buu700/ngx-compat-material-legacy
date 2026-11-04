/** Cold descriptor/prototype controls; exact helper and current wrapper flow. */
import assert from 'node:assert/strict';
import {createRequire,Module} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-parent-sass-integration-review-')));
const require=createRequire(join(root,'package.json')),ts=require('typescript'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
function fn(path,name){const ast=ts.createSourceFile(path,read(path).toString(),ts.ScriptTarget.Latest,true);return ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name).getText(ast).replace(/^export /,'');}
const capture=Function('assert',fn('scripts/sass-spinner-snack-c04-source.mjs','captureSpinnerSnackC04Metadata')+';return captureSpinnerSnackC04Metadata;')(assert),fields=['entry','body','review','proof','root'];
const packet=JSON.parse(read('compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v3.json')),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const getterControls=[];let getterCalls=0;
for(const row of packet.paths){
 const actual=require(join(root,row.path)),reviewPath=actual[Object.keys(actual).find(k=>k.endsWith('_REVIEW'))],body=JSON.parse(read(reviewPath));
 const baseline={entry:structuredClone(ledger.entries.find(e=>e.sha===body.reviews[0].sha)),body,review:body.reviews[0]};baseline.proof=structuredClone(baseline.entry.individual_proof);baseline.root=root;
 assert.deepEqual(capture(baseline,fields),baseline);
 for(const target of ['entry','body','review','proof']){
  const args=structuredClone(baseline),authentic=args[target];Object.defineProperty(args,target,{get(){getterCalls++;return authentic;},enumerable:true});
  assert.throws(()=>capture(args,fields));assert.equal(getterCalls,0);
  const nested=structuredClone(baseline),key=target==='entry'?'reason':target==='body'?'line':target==='review'?'sha':'diff_sha256',value=nested[target][key];
  Object.defineProperty(nested[target],key,{get(){getterCalls++;return value;},enumerable:true});assert.throws(()=>capture(nested,fields));assert.equal(getterCalls,0);
  const proto=structuredClone(baseline);Object.setPrototypeOf(proto[target],{marker:true});assert.throws(()=>capture(proto,fields));
  getterControls.push({path:row.path,target,top_level_getter_rejected:true,nested_getter_rejected:true,nested_foreign_prototype_rejected:true,getter_calls:0});
 }
}
const inherited=[];
for(const row of packet.paths.filter(r=>r.path.includes('theming-inspection'))){
 const actual=require(join(root,row.path)),reviewPath=actual.THEMING_REVIEW,body=JSON.parse(read(reviewPath)),first=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[0].sha));
 const proto={entry:first,body,review:body.reviews[0],proof:structuredClone(first.individual_proof),root},args=Object.create(proto);
 const before=capture(args,fields);assert.deepEqual(before,{});assert.equal(actual.metadataOk(args),true);
 let mutated=false,physicalReads=0;args.read=p=>{if(!mutated){mutated=true;proto.entry=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[1].sha));proto.review=body.reviews[1];proto.proof=structuredClone(proto.entry.individual_proof);}physicalReads++;return read(p);};
 const filename=join(root,row.path),module=new Module(filename),ordinary=createRequire(filename),archived=JSON.parse(read(body.source_review.path));module.filename=filename;module.paths=Module._nodeModulePaths(dirname(filename));
 module.require=name=>name==='./sass-spinner-snack-c04-source.mjs'?{captureSpinnerSnackC04Metadata:capture,spinnerSnackC04Source:()=>({bound:[],qualify:ref=>ref.path===row.path?{path:row.path,sha256:row.after_sha256,bytes:row.after_bytes}:ref,assertCurrent(){}})}:name.endsWith('-source-review.mjs')?{reviewThemingInspectionSource:()=>({historical_report:archived,assertCurrent(){}})}:ordinary(name);
 module._compile(read(row.path).toString(),filename);
 const accepted=module.exports.sourceOk(args);assert.equal(accepted,true);assert.equal(mutated,true);assert.ok(physicalReads>0);assert.equal(actual.metadataOk(args),true);assert.deepEqual(capture(args,fields),before);
 inherited.push({path:row.path,route:'inherited-selected-fields-valid-tuple-swap',physical_reads:physicalReads,initial_snapshot:{},final_snapshot:{},source_function_returned:accepted,live_metadata_after:true,intended_entry_changed:first.sha!==args.entry.sha,actual_source_producer_executed:false});
}
for(const path of ['scripts/upstream-control-m3-theme-admission.cjs','scripts/upstream-remaining-unthemable-admission.cjs']){
 const actual=require(join(root,path)),reviewPath=actual[Object.keys(actual).find(k=>k.endsWith('_REVIEW'))],body=JSON.parse(read(reviewPath)),entries=body.reviews.map(r=>structuredClone(ledger.entries.find(e=>e.sha===r.sha))),proto={entries,body,root},args=Object.create(proto);
 assert.deepEqual(capture(args,['entries','body','root']),{});let mutated=false,physicalReads=0;args.read=p=>{if(!mutated){mutated=true;proto.entries=entries.map((e,i)=>i?e:{...e,final_disposition:'irrelevant'});}physicalReads++;return read(p);};
 const stub=({read:callback})=>{callback(reviewPath);return {bound:[],assertCurrent(){callback(reviewPath);}};};
 const inspect=Function('assert','metadataOk','ROOT','readFileSync','join','PATCHES','inspectWholeBody','require',fn(path,'inspectCanonicalSource')+';return inspectCanonicalSource;')(assert,actual.metadataOk,root,readFileSync,join,Object.fromEntries(entries.map(e=>[e.sha,true])),stub,()=>({captureSpinnerSnackC04Metadata:capture}));
 const ctx=inspect(args);ctx.assertCurrent();assert.equal(mutated,true);assert.ok(physicalReads>0);assert.equal(actual.metadataOk({entry:args.entries[0],body:args.body,review:args.body.reviews[0]}),false);
 inherited.push({path,route:'inherited-selected-fields-invalid-canonical-entries',physical_reads:physicalReads,initial_snapshot:{},final_snapshot:{},returned_assertCurrent_accepted:true,live_metadata_after:false,actual_source_producer_executed:false});
}
const result={schema_version:1,status:'nested-descriptor-controls-pass-inherited-outer-args-gap-reproduced',helper:{path:'scripts/sass-spinner-snack-c04-source.mjs',sha256:hash(read('scripts/sass-spinner-snack-c04-source.mjs'))},getter_or_nested_prototype_controls:getterControls.length*3,getter_calls:getterCalls,controls:getterControls,inherited_outer_args_reproductions:inherited,source_contexts_substituted:true,actual_compiler_or_owner_executed:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,coldControls:result.getter_or_nested_prototype_controls,inheritedGaps:inherited.length}));
