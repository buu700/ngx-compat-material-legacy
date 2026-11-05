/** Independent frozen actual helper/inventory controls. Retained CSS and modeled envelopes; zero compile. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [cutPath,fixturePath,outputPath,mode]=process.argv.slice(2);assert.ok(cutPath&&fixturePath&&outputPath);const helpersOnly=mode==='--helpers-only';assert.ok(mode===undefined||helpersOnly);
const cut=JSON.parse(readFileSync(cutPath)),fixtures=JSON.parse(readFileSync(fixturePath));
const hash=x=>createHash('sha256').update(x).digest('hex');
function frozen(){assert.equal(cut.role,'independent exact input cut');for(const input of fixtures)for(const ref of cut.lines[input.line]){const raw=readFileSync(join(input.root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}}
frozen();const reports=[];
for(const input of fixtures){
 const helper=await import(pathToFileURL(join(input.root,'scripts/sass-spinner-snack-gate-integration.mjs')).href);
 const inventory=helpersOnly?null:await import(pathToFileURL(join(input.root,'scripts/sass-api-inventory.mjs')).href);
 let hook=null,target=null,getters=0;const observed=new Set(),permitted=new Set(cut.lines[input.line].map(r=>r.path));
 const read=path=>{assert.ok(permitted.has(path)&&!cut.forbidden_concurrent_paths?.includes(path));observed.add(path);if(hook&&hook.path===path){hook.count--;if(hook.count===0){const action=hook.action;hook=null;action();}}return path===target?Buffer.from('nonphysical'):readFileSync(join(input.root,path));};
 const context=helper.createSpinnerSnackGateContext({root:input.root,read});
 const descriptor=helper.spinnerSnackGateDescriptor(context);assert.deepEqual(descriptor,input.descriptor);
 const checks=[];const check=(name,fn)=>{fn();checks.push(name);};
 const own='scripts/sass-spinner-snack-gate-integration.mjs';
 const call=body=>body.comparison==='historical-spinner-snack-css-with-positioned-public-tokens'
  ? helper.spinnerSnackGateDirectMatch({context,caseId:body.case_id,original:body.expected,actual:body.actual,identity:body.identity,descriptor:body.current_spinner_snack_bridge})
  : helper.spinnerSnackGateAggregateMatch({context,caseId:body.case_id,original:body.expected??null,actual:body.actual_measurement??body.actual,companion:body.current_companion,descriptor:body.current_spinner_snack_bridge});
 for(const body of input.bodies){
  check('physical helper positive '+body.case_id,()=>assert.equal(call(body),true));
  for(const [name,mutate]of Object.entries({
   'unrelated CSS':b=>{const m=b.actual_measurement??b.actual;m.css+='\n.independent-unrelated { color: red; }\n';m.css_sha256=hash(m.css);m.css_bytes=Buffer.byteLength(m.css);if(b.actual)b.actual=structuredClone(m);},
   'loaded omission':b=>(b.actual_measurement??b.actual).sources.pop(),
   'wrong compiler':b=>(b.actual_measurement??b.actual).sass_version='foreign compiler',
   'wrong program':b=>(b.actual_measurement??b.actual).program_sha256='0'.repeat(64),
   'wrong descriptor':b=>b.current_spinner_snack_bridge.source_line='foreign',
   'unknown case':b=>b.case_id='mixin-css/all-legacy-component-themes',
  })){
   const wrong=structuredClone(body);mutate(wrong);if(wrong.actual_measurement&&wrong.actual)wrong.actual=structuredClone(wrong.actual_measurement);
   check(name+' '+body.case_id,()=>assert.equal(call(wrong),false));
  }
 }
 const directDefault=input.bodies[0],aggregateDefault=input.bodies[15];
 const got=()=>({...structuredClone(directDefault),css:directDefault.actual.css,sha256:directDefault.actual.css_sha256,actual_measurement:structuredClone(directDefault.actual)});
 const methods=[
  ['measurement',helper.spinnerSnackGateMeasurementOk,()=>({context,caseId:directDefault.case_id,actual:structuredClone(directDefault.actual)})],
  ['direct',helper.spinnerSnackGateDirectMatch,()=>({context,caseId:directDefault.case_id,original:structuredClone(directDefault.expected),actual:structuredClone(directDefault.actual),identity:structuredClone(directDefault.identity),descriptor:structuredClone(descriptor)})],
  ['default',helper.spinnerSnackGateDefaultMatch,()=>({context,caseId:directDefault.case_id,got:got()})],
  ['aggregate',helper.spinnerSnackGateAggregateMatch,()=>({context,caseId:aggregateDefault.case_id,actual:structuredClone(aggregateDefault.actual_measurement),companion:structuredClone(aggregateDefault.current_companion),descriptor:structuredClone(descriptor)})],
 ];
 for(const [name,fn,make]of methods){
  check('actual '+name+' baseline',()=>assert.equal(fn(make()),true));
  for(const key of Object.keys(make()))for(const phase of ['first','last']){
   const args=make();hook={path:own,count:phase==='first'?1:2,action:()=>{args[key]=key==='caseId'?'foreign':{};}};
   check('live argument '+phase+' '+name+'/'+key,()=>assert.equal(fn(args),false));assert.equal(hook,null);
   check('restored '+name+'/'+key,()=>assert.equal(fn(make()),true));
  }
  for(const kind of ['symbol','getter','flags','prototype','proxy']){
   const args=make();let value=args;
   if(kind==='symbol')args[Symbol('foreign')]=1;
   if(kind==='getter')Object.defineProperty(args,'caseId',{get(){getters++;return directDefault.case_id;},enumerable:true,configurable:true});
   if(kind==='flags')Object.defineProperty(args,'unknown',{value:true,enumerable:false});
   if(kind==='prototype')Object.setPrototypeOf(args,{});
   if(kind==='proxy')value=new Proxy(args,{get(){getters++;return undefined;}});
   check('cold argument '+kind+' '+name,()=>assert.equal(fn(value),false));
  }
  for(const phase of ['first','last'])for(const kind of ['symbol','getter','flags','prototype']){
   const args=make();hook={path:own,count:phase==='first'?1:2,action:()=>{
    if(kind==='symbol')args[Symbol('foreign')]=1;
    if(kind==='getter')Object.defineProperty(args,'caseId',{get(){getters++;return directDefault.case_id;},enumerable:true,configurable:true});
    if(kind==='flags')Object.defineProperty(args,'caseId',{writable:false});
    if(kind==='prototype')Object.setPrototypeOf(args,{});
   }};
   check('late argument '+phase+' '+kind+' '+name,()=>assert.equal(fn(args),false));assert.equal(hook,null);
  }
 }
 for(const phase of ['cold','first','last'])for(const kind of ['getter','arrayproto','sourceProtoData','symbol']){
  const args={context,caseId:directDefault.case_id,actual:structuredClone(directDefault.actual)};
  const mutate=()=>{
   if(kind==='getter')Object.defineProperty(args.actual.sources[0],'sha256',{get(){getters++;return directDefault.actual.sources[0].sha256;},enumerable:true,configurable:true});
   if(kind==='arrayproto')Object.setPrototypeOf(args.actual.sources,{});
   if(kind==='sourceProtoData')Object.defineProperty(args.actual.sources[0],'__proto__',{value:{injected:true},enumerable:true,configurable:true});
   if(kind==='symbol')args.actual.sources[0][Symbol('foreign')]=1;
  };
  if(phase==='cold')mutate();else hook={path:own,count:phase==='first'?1:2,action:mutate};
  check('recursive '+phase+' '+kind,()=>assert.equal(helper.spinnerSnackGateMeasurementOk(args),false));if(phase!=='cold')assert.equal(hook,null);
 }
 for(const field of ['root','read']){
  const args={root:input.root,read};hook={path:'scripts/sass-spinner-snack-bridge-contract.mjs',count:1,action:()=>{args[field]=field==='root'?'/tmp/foreign':()=>Buffer.from('wrong');}};
  check('factory late '+field,()=>assert.throws(()=>helper.createSpinnerSnackGateContext(args)));assert.equal(hook,null);
 }
 for(const path of [own,'scripts/sass-ripple-color-contract.mjs','scripts/sass-spinner-snack-aggregate-contract.mjs']){
  target=path;check('actual dependency physical guard '+path,()=>assert.equal(call(directDefault),false));target=null;context.assertCurrent();
 }
 if(!helpersOnly){
 const oracle=JSON.parse(readFileSync(join(input.root,'compatibility/rc/oracles/material-16.2.14-sass-api.json')));
 const defaults=input.bodies.filter(b=>b.case_id.startsWith('mixin-css/'));
 const limited={members:{variables:{},functions:{},mixins:Object.fromEntries(defaults.map(b=>[b.case_id.slice(10),structuredClone(oracle.members.mixins[b.case_id.slice(10)])]))}};
 const css=Object.fromEntries(defaults.map(b=>{const m=b.actual_measurement??b.actual;return [b.case_id.slice(10),{...structuredClone(b),css:m.css,sha256:m.css_sha256,actual_measurement:structuredClone(m)}];}));
 const compare=value=>inventory.compareInventory(limited,structuredClone(limited.members),value,{spinnerSnackContext:context});
 check('actual inventory eight finite defaults',()=>assert.equal(compare(css).every(r=>r.result==='pass'),true));
 for(const body of defaults)for(const key of ['css','sha256']){
  const wrong=structuredClone(css),name=body.case_id.slice(10);wrong[name][key]=key==='css'?wrong[name].css+'\n.unrelated { color: red; }\n':'0'.repeat(64);
  check('actual inventory outer '+key+' '+body.case_id,()=>assert.equal(compare(wrong).find(r=>r.case_id===body.case_id).result,'fail'));
 }
 const hashOnly=Object.fromEntries(defaults.map(b=>[b.case_id.slice(10),{css:'',sha256:oracle.members.mixins[b.case_id.slice(10)].invocation.css_sha256}]));
 check('five hash-only direct defaults reject without capsules',()=>assert.deepEqual(compare(hashOnly).filter(r=>r.reason==='finite spinner/snack default contract differs').map(r=>r.case_id).sort(),helper.SPINNER_SNACK_DEFAULT_CASES.slice().sort()));
 check('actual apiDriftNegative preserved',()=>assert.equal(inventory.apiDriftNegative(limited,structuredClone(limited.members),css,{spinnerSnackContext:context}).detected,true));
 }
 const css={};
 check('unproduced default references rejected',()=>assert.throws(()=>helper.attachSpinnerSnackDefaultReferences({context,css,references:{}})));
 let compilerCalls=0;const sass={info:directDefault.identity.sass_version,compileString(){compilerCalls++;throw Error('compiler forbidden');}};
 check('owned candidate cannot supply original defaults',()=>assert.throws(()=>helper.measureSpinnerSnackDefaultReferences({sass,referenceEntry:join(input.root,'projects/ngx-material-legacy/_index.scss'),referenceRoot:input.root,identity:directDefault.identity})));
 assert.equal(compilerCalls,0);assert.equal(getters,0);context.assertCurrent();
 reports.push({line:input.line,checks_passed:checks.length,checks,getter_calls:getters,compiler_calls:compilerCalls,actual_packed_assertions:0,actual_provided_reader_paths:[...observed].sort(),concurrent_mutable_path_intersection:[...observed].filter(p=>cut.forbidden_concurrent_paths?.includes(p))});
}
frozen();assert.equal(existsSync(outputPath),false);const report={schema_version:1,role:'Independent actual frozen helper and optional actual inventory dispatcher, retained CSS plus modeled metadata; no source producer or compiler',helpers_only:helpersOnly,input_cut:cut,lines:reports};writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(reports.map(r=>({line:r.line,checks:r.checks_passed,getters:r.getter_calls,compiles:r.compiler_calls}))));
