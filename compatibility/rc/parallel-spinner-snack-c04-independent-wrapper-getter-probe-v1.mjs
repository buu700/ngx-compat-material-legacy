/** Exact parent wrapper flow, substituted source dependencies; no producer/compile. */
import assert from 'node:assert/strict';
import {createRequire,Module} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-spinner-snack-c04-independent-')));
const require=createRequire(join(root,'package.json')),ts=require('typescript'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const helper=read('scripts/sass-spinner-snack-c04-source.mjs').toString(),ast=ts.createSourceFile('helper.mjs',helper,ts.ScriptTarget.Latest,true),functionText=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='captureSpinnerSnackC04Metadata').getText(ast).replace(/^export /,'');
const capture=Function('assert',functionText+';return captureSpinnerSnackC04Metadata;')(assert);
const packet=JSON.parse(read('compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v3.json')),ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),results=[];
for(const row of packet.paths){
 const currentImage=read(row.path);assert.equal(hash(currentImage),row.after_sha256);assert.equal(currentImage.length,row.after_bytes);
 const actual=require(join(root,row.path)),reviewPath=actual[Object.keys(actual).find(k=>k.endsWith('_REVIEW'))],body=JSON.parse(read(reviewPath)),entry=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[0].sha));
 const args={root,entry,body,review:body.reviews[0],proof:structuredClone(entry.individual_proof)};assert.equal(actual.metadataOk(args),true);
 const originalReviews=body.reviews;let mutated=false,getterCalls=0,physicalReads=0,producerCalls=0;
 args.read=p=>{physicalReads++;if(!mutated){mutated=true;Object.defineProperty(body,'reviews',{get(){getterCalls++;return originalReviews;},enumerable:true,configurable:true});}return read(p);};
 const filename=join(root,row.path),module=new Module(filename),ordinary=createRequire(filename);module.filename=filename;module.paths=Module._nodeModulePaths(dirname(filename));
 const sourceReport=body.source_review?.path,archived=sourceReport?JSON.parse(sourceReport.endsWith('.gz')?gunzipSync(read(sourceReport)):read(sourceReport)):null;
 const fresh=()=>{producerCalls++;return {historical_report:archived,bound:[],assertCurrent(){}};};
 module.require=name=>{
  if(name==='./sass-spinner-snack-c04-source.mjs')return {captureSpinnerSnackC04Metadata:capture,spinnerSnackC04Source:({read:callback})=>{callback(reviewPath);return {bound:[],qualify:ref=>{const image=read(ref.path);return {...ref,sha256:hash(image),bytes:image.length};},assertCurrent(){}};},assertSpinnerSnackTokenPlacementSuccessor(){}};
  if(name.endsWith('-source-review.mjs'))return {reviewThemingInspectionSource:fresh,reviewInspectionCompatibilitySource:fresh,reviewControlM3ThemeSource:fresh,reviewRemainingUnthemableSource:fresh};
  if(name==='./measure-unthemable-token-contracts.mjs')return {measureTokenPlacementContracts:()=>{producerCalls++;return {};}};
  return ordinary(name);
 };
 module._compile(currentImage.toString(),filename);const accepted=module.exports.sourceOk(args);
 assert.equal(accepted,false);assert.equal(mutated,true);assert.ok(getterCalls>0);Object.defineProperty(body,'reviews',{value:originalReviews,enumerable:true,configurable:true,writable:true});assert.equal(actual.metadataOk(args),true);
 results.push({path:row.path,sha256:row.after_sha256,bytes:row.after_bytes,sourceOk_returned:accepted,late_body_reviews_getter_calls:getterCalls,physical_reads:physicalReads,substituted_producer_calls:producerCalls,actual_source_producer_executed:false,restored_authentic_metadata:true});
}
const result={schema_version:1,status:'late-live-body-getter-invoked-before-final-rejection',scope:'Exact parent5wrapper control flow under substituted C04/current source dependencies; not actual current graph qualification',results,actual_source_producer_or_compiler_executed:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,wrappers:results.length,getterCalls:results.reduce((n,r)=>n+r.late_body_reviews_getter_calls,0)}));
