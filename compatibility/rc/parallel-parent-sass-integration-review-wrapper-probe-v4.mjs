/** Independent bounded metadata review. No Sass producer or compiler executes. */
import assert from 'node:assert/strict';
import {createRequire,Module} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-parent-sass-integration-review-')));
const require=createRequire(join(root,'package.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(join(root,p));
const packet=JSON.parse(read('compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v3.json'));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const ts=require('typescript');
function functions(text){const result=new Map(),ast=ts.createSourceFile('subject.cjs',text,ts.ScriptTarget.Latest,true);for(const s of ast.statements)if(ts.isFunctionDeclaration(s)&&s.name)result.set(s.name.text,s.getText(ast));return result;}
const results=[];let positives=0,metadataNegatives=0;
for(const row of packet.paths){
 const image=read(row.path);assert.equal(hash(image),row.after_sha256);assert.equal(image.length,row.after_bytes);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1'};for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const old=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show','26ff853a1f88007851a92ff10dd5b5377c0e74b5:'+row.path],{cwd:root,env});
 assert.equal(hash(old),row.before_sha256);assert.equal(old.length,row.before_bytes);assert.equal(old.toString(),row.before_text);assert.equal(image.toString(),row.after_text);
 const beforeFunctions=functions(old.toString()),currentFunctions=functions(image.toString()),pureNames=[...currentFunctions.keys()].filter(n=>/Proof$|MetadataOk$|^metadataOk$/.test(n));
 assert.ok(pureNames.length>=2);for(const name of pureNames)assert.equal(currentFunctions.get(name),beforeFunctions.get(name),'pure function changed '+name);
 const mod=require(join(root,row.path)),reviewName=Object.keys(mod).find(k=>k.endsWith('_REVIEW')&&typeof mod[k]==='string'),body=JSON.parse(read(mod[reviewName]));
 for(const review of body.reviews){
  const entry=ledger.entries.find(e=>e.sha===review.sha),args={entry,body,review,proof:entry.individual_proof};assert.equal(mod.metadataOk(args),true);positives++;
  for(const field of ['reason','final_disposition','evidence_report']){const changed=structuredClone(entry);changed[field]+=' incorrect';assert.equal(mod.metadataOk({...args,entry:changed}),false);metadataNegatives++;}
 }
 results.push({path:row.path,current:{sha256:hash(image),bytes:image.length},git_parent_before_exact:true,pure_function_text_unchanged:pureNames,canonical_metadata_positives:body.reviews.length});
}
const captureText=functions(read('scripts/sass-spinner-snack-c04-source.mjs').toString()).get('captureSpinnerSnackC04Metadata').replace(/^export /,'');
const realCapture=Function('assert',captureText+';return captureSpinnerSnackC04Metadata;')(assert);
const seams=[];
for(const row of packet.paths){
 const actual=require(join(root,row.path)),reviewName=Object.keys(actual).find(k=>k.endsWith('_REVIEW')&&typeof actual[k]==='string'),reviewPath=actual[reviewName];
 for(const target of ['entry','proof','entry-descriptor','entry-replacement','proof-replacement','body-replacement','paired-valid-replacement']){
  const body=JSON.parse(read(reviewPath)),entry=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[0].sha)),args={root,body,entry,review:body.reviews[0],proof:structuredClone(entry.individual_proof)};
  const snapshot=JSON.stringify({entry:args.entry,body:args.body,review:args.review,proof:args.proof});
  let mutated=false,physicalReads=0;args.read=p=>{if(!mutated){mutated=true;
   if(target==='entry')entry.final_disposition='irrelevant';
   else if(target==='proof')args.proof.diff_sha256='0'.repeat(64);
   else if(target==='entry-descriptor')Object.defineProperty(entry,'final_disposition',{value:'irrelevant',enumerable:true,configurable:true,writable:true});
   else if(target==='entry-replacement')args.entry={...entry,final_disposition:'irrelevant'};
   else if(target==='proof-replacement')args.proof={...args.proof,diff_sha256:'0'.repeat(64)};
   else if(target==='body-replacement')args.body={...body,g11_claim:'passed'};
   else if(target==='paired-valid-replacement'){args.entry=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[1].sha));args.review=body.reviews[1];args.proof=structuredClone(args.entry.individual_proof);}
  }physicalReads++;return read(p);};
  assert.equal(actual.metadataOk(args),true);
  let isolated;
  if(/upstream-(?:control-m3-theme|remaining-unthemable)-admission/.test(row.path)){
   const text=functions(read(row.path).toString()).get('inspectSource');assert.ok(text);
   const inspect=Function('assert','metadataOk','ROOT','readFileSync','join','inspectWholeBody','require',text+';return inspectSource;')(assert,actual.metadataOk,root,readFileSync,join,({read:callback})=>{callback(reviewPath);return {bound:[],assertCurrent(){}};},()=>({captureSpinnerSnackC04Metadata:realCapture}));
   isolated=args=>{try{return inspect(args)===true;}catch{return false;}};
  }else if(!row.path.includes('unthemable-token')){
   const filename=join(root,row.path),module=new Module(filename),ordinary=createRequire(filename);
   const archived=JSON.parse(read(body.source_review.path));
   module.filename=filename;module.paths=Module._nodeModulePaths(dirname(filename));
   module.require=name=>{
    if(name==='./sass-spinner-snack-c04-source.mjs')return {captureSpinnerSnackC04Metadata:realCapture,spinnerSnackC04Source:()=>({bound:[],qualify:ref=>ref.path===row.path?{path:row.path,sha256:row.after_sha256,bytes:row.after_bytes}:ref,assertCurrent(){}})};
    if(name.endsWith('-source-review.mjs'))return {reviewThemingInspectionSource:()=>({historical_report:archived,assertCurrent(){}}),reviewInspectionCompatibilitySource:()=>({historical_report:archived,assertCurrent(){}})};
    return ordinary(name);
   };
   module._compile(read(row.path).toString(),filename);isolated=module.exports.sourceOk;
  }else{
   const text=functions(read(row.path).toString()).get('unthemedSourceOk');assert.ok(text);
   isolated=Function('assert','unthemedMetadataOk','ROOT','defaultRead','regular','inspectUnthemedSource','realpathSync','measurements','require',text+';return unthemedSourceOk;')(
    assert,actual.metadataOk,root,read,(_root,p)=>read(p),({read:callback})=>{callback(reviewPath);return {body:JSON.parse(read(reviewPath)),scope:{},scopeHash:'test-scope',currentSource:{},assertCurrent(){}};},
    resolve,new WeakMap(),name=>name==='./measure-unthemable-token-contracts.mjs'?{measureTokenPlacementContracts:()=>({})}:{captureSpinnerSnackC04Metadata:realCapture,assertSpinnerSnackTokenPlacementSuccessor(){}});
  }
  const accepted=isolated(args),validAfter=actual.metadataOk(args);assert.equal(mutated,true);assert.ok(physicalReads>0);assert.equal(accepted,false);assert.equal(validAfter,target==='paired-valid-replacement');assert.notEqual(JSON.stringify({entry:args.entry,body:args.body,review:args.review,proof:args.proof}),snapshot);
  args.entry=structuredClone(ledger.entries.find(e=>e.sha===body.reviews[0].sha));args.body=body;args.review=body.reviews[0];args.proof=structuredClone(args.entry.individual_proof);assert.equal(actual.metadataOk(args),true);
  assert.equal(isolated({...args,read}),true);
  seams.push({path:row.path,target,metadata_before:true,callback_returned_genuine_physical_bytes:true,physical_reads:physicalReads,source_function_returned:accepted,metadata_after:validAfter,live_tuple_changed:true,restored_authentic_positive:true,substituted_dependencies:true,actual_source_producer_executed:false});
 }
}
const result={schema_version:1,scope:'Independent actual pure metadata plus dependency-isolated exact current wrapper control flow; no source producer/compiler',status:'all-five-wrapper-live-snapshot-fixes-confirmed',node:process.version,canonical_metadata_positives:positives,rejected_metadata_mutants:metadataNegatives,git_snapshots:results,dependency_isolated_live_mutations:seams,actual_source_producer_executed:false,actual_compiler_or_owner_executed:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,positives,metadataNegatives,seams:seams.length}));
