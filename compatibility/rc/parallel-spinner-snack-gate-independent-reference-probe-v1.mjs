/** Exact reference-transport mutation controls using cached untouched-default CSS, zero real compiles. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [cutPath,fixturePath,outputPath]=process.argv.slice(2);assert.ok(cutPath&&fixturePath&&outputPath);
const cut=JSON.parse(readFileSync(cutPath)),inputs=JSON.parse(readFileSync(fixturePath));
const hash=x=>createHash('sha256').update(x).digest('hex');
function frozen(){for(const input of inputs)for(const ref of cut.lines[input.line]){const raw=readFileSync(join(input.root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}}
frozen();const reports=[];
for(const input of inputs){
 const helper=await import(pathToFileURL(join(input.root,'scripts/sass-spinner-snack-gate-integration.mjs')).href);
 const preflightPath='compatibility/rc/parallel-spinner-snack-gate-integration-original16-source-view-preflight-v1.json';
 const preflightOrigin=inputs[0].root,preflightRaw=readFileSync(join(preflightOrigin,preflightPath)),preflight=JSON.parse(preflightRaw);
 const referenceRoot=realpathSync(preflight.referenceRoot),referenceEntry=realpathSync(preflight.referenceEntry),loaded=[];
 for(const member of preflight.loaded_members){assert.equal(member.root,0);const absolute=realpathSync(join(referenceRoot,member.path)),raw=readFileSync(absolute);assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);loaded.push(pathToFileURL(absolute));}
 assert.equal(loaded.length,286);const defaults=input.bodies.filter(b=>helper.SPINNER_SNACK_DEFAULT_CASES.includes(b.case_id));assert.equal(defaults.length,5);
 let getterCalls=0,cachedCalls=0;const checks=[];
 const check=(name,fn)=>{fn();checks.push(name);};
 function make(mutation,when=1){
  let index=0;const sass={info:defaults[0].identity.sass_version};
  const compileString=function(){const row=defaults[index++];cachedCalls++;if(mutation&&index===when)mutation({sass,args,index});assert.ok(row);return {css:row.expected.css,loadedUrls:loaded.slice()};};
  sass.compileString=compileString;
  const args={sass,referenceEntry,referenceRoot,identity:structuredClone(defaults[0].identity)};
  return {args,sass,compileString,count:()=>index};
 }
 const valid=make();const measured=helper.measureSpinnerSnackDefaultReferences(valid.args);assert.equal(valid.count(),5);assert.deepEqual(Object.keys(measured),helper.SPINNER_SNACK_DEFAULT_CASES);
 check('cached source-view transport baseline only',()=>assert.ok(measured));
 for(const when of [1,5])for(const field of ['info','compileString'])for(const kind of ['getter','value','flags','delete']){
  const current=make(({sass})=>{
   if(kind==='getter')Object.defineProperty(sass,field,{get(){getterCalls++;return field==='info'?defaults[0].identity.sass_version:()=>{};},enumerable:true,configurable:true});
   if(kind==='value')sass[field]=field==='info'?'foreign compiler':()=>{};
   if(kind==='flags')Object.defineProperty(sass,field,{writable:false});
   if(kind==='delete')delete sass[field];
  },when);
  check('late compiler slot '+when+'/'+field+'/'+kind,()=>assert.throws(()=>helper.measureSpinnerSnackDefaultReferences(current.args)));
 }
 for(const field of ['info','compileString']){
  const current=make();Object.defineProperty(current.sass,field,{get(){getterCalls++;return field==='info'?defaults[0].identity.sass_version:current.compileString;},enumerable:true,configurable:true});
  check('cold compiler slot getter '+field,()=>assert.throws(()=>helper.measureSpinnerSnackDefaultReferences(current.args)));assert.equal(current.count(),0);
 }
 for(const field of ['sass','referenceEntry','referenceRoot','identity'])for(const when of [1,5]){
  const current=make(({args})=>{args[field]=field==='sass'||field==='identity'?{}:'/tmp/foreign';},when);
  check('late reference argument '+when+'/'+field,()=>assert.throws(()=>helper.measureSpinnerSnackDefaultReferences(current.args)));
 }
 for(const when of [1,5]){
  const current=make(({args})=>Object.defineProperty(args.identity,'material_version',{get(){getterCalls++;return '16.2.14';},enumerable:true,configurable:true}),when);
  check('late nested identity getter '+when,()=>assert.throws(()=>helper.measureSpinnerSnackDefaultReferences(current.args)));
 }
 const restored=make();check('cached source-view transport restored',()=>assert.ok(helper.measureSpinnerSnackDefaultReferences(restored.args)));assert.equal(restored.count(),5);assert.equal(getterCalls,0);
 reports.push({line:input.line,checks_passed:checks.length,checks,getter_calls:getterCalls,cached_adapter_calls:cachedCalls,source_view_members_rehashed:loaded.length,
  source_view_preflight:{root:preflightOrigin,path:preflightPath,sha256:hash(preflightRaw),bytes:preflightRaw.length},actual_compiler_calls:0,actual_installed_reference_producer_executions:0,packed_gate_or_artifact_credit:false});
}
frozen();assert.equal(existsSync(outputPath),false);writeFileSync(outputPath,JSON.stringify({schema_version:1,role:'Independent descriptor checks of reference adapter; cached authenticated defaults and existing physical Sass source view only, no real compiler/installer/packed producer',input_cut:cut,lines:reports},null,2)+'\n');console.log(JSON.stringify(reports.map(r=>({line:r.line,checks:r.checks_passed,getters:r.getter_calls,actual_compiles:r.actual_compiler_calls}))));
