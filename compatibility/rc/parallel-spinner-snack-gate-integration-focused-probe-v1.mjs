/** NEW helper-only existing CSS replay; input envelopes are explicitly modeled. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const inputs=JSON.parse(readFileSync(0,'utf8')),hash=s=>createHash('sha256').update(s).digest('hex'),reports=[];
for(const input of inputs){
 const {createSpinnerSnackGateContext,spinnerSnackGateDescriptor,spinnerSnackGateMeasurementOk,spinnerSnackGateDirectMatch,spinnerSnackGateDefaultMatch,spinnerSnackGateAggregateMatch,attachSpinnerSnackDefaultReferences,measureSpinnerSnackDefaultReferences}=await import(pathToFileURL(join(input.root,'scripts/sass-spinner-snack-gate-integration.mjs')).href);
 let hook=null,target=null,getters=0;const read=path=>{if(hook){const fn=hook;hook=null;fn();}return path===target?Buffer.from('fault'):readFileSync(join(input.root,path));};
 const context=createSpinnerSnackGateContext({root:input.root,read}),descriptor=spinnerSnackGateDescriptor(context),checks=[];
 assert.deepEqual(descriptor,input.descriptor);
 const direct=body=>body.comparison==='historical-spinner-snack-css-with-positioned-public-tokens';
 const match=body=>direct(body)?spinnerSnackGateDirectMatch({context,caseId:body.case_id,original:body.expected,actual:body.actual,identity:body.identity,descriptor:body.current_spinner_snack_bridge}):spinnerSnackGateAggregateMatch({context,caseId:body.case_id,original:body.expected??null,actual:body.actual_measurement??body.actual,companion:body.current_companion,descriptor:body.current_spinner_snack_bridge});
 const check=(name,fn)=>{fn();checks.push(name);};
 for(const body of input.bodies){
  check('prepared helper positive '+body.case_id,()=>assert.ok(match(body),body.case_id));
  const changed=structuredClone(body),actual=direct(changed)?changed.actual:(changed.actual_measurement??changed.actual);actual.css+='\n.unrelated { color: red; }\n';actual.css_sha256=hash(actual.css);actual.css_bytes=Buffer.byteLength(actual.css);
  check('whole CSS mutation '+body.case_id,()=>assert.equal(match(changed),false));
  const missing=structuredClone(body);missing.current_spinner_snack_bridge=null;check('bridge metadata missing '+body.case_id,()=>assert.equal(match(missing),false));
 }
 check('unproduced default references reject',()=>assert.throws(()=>attachSpinnerSnackDefaultReferences({context,css:{},references:{}})));
 for(const body of input.bodies.filter(b=>direct(b)&&b.case_id.startsWith('mixin-css/'))){
  const got={...structuredClone(body),css:body.actual.css,sha256:body.actual.css_sha256,actual_measurement:structuredClone(body.actual)};
  check('default API capsule '+body.case_id,()=>assert.ok(spinnerSnackGateDefaultMatch({context,caseId:body.case_id,got})));
  for(const[name,mutate]of Object.entries({comparison:g=>g.comparison='historical-exact',call:g=>g.call+=' ',mutation:g=>g.mutation.css+='wrong',conflict:g=>g.current_companion=null,identity:g=>g.identity.expected_source='owned'})){
   const wrong=structuredClone(got);mutate(wrong);check('default API '+name+' '+body.case_id,()=>assert.equal(spinnerSnackGateDefaultMatch({context,caseId:body.case_id,got:wrong}),false));
  }
 }
 let compilerCalls=0;
 const identity=input.bodies[0].identity,sass={info:identity.sass_version,compileString(){compilerCalls++;throw new Error('unexpected compiler call');}},referenceEntry=join(input.root,'projects/ngx-material-legacy/_index.scss');
 check('before owned facade cannot become untouched16 reference',()=>assert.throws(()=>measureSpinnerSnackDefaultReferences({sass,referenceEntry,referenceRoot:input.root,identity})));
 check('wrong original identity rejects before compile',()=>assert.throws(()=>measureSpinnerSnackDefaultReferences({sass,referenceEntry,referenceRoot:input.root,identity:{...identity,material_version:'21.2.14'}})));
 assert.equal(compilerCalls,0);
 const selectedDefault=input.bodies.find(b=>direct(b)&&b.case_id.startsWith('mixin-css/')),selectedAggregate=input.bodies.find(b=>b.case_id==='mixin-css/all-component-colors');
 const defaultGot=()=>({...structuredClone(selectedDefault),css:selectedDefault.actual.css,sha256:selectedDefault.actual.css_sha256,actual_measurement:structuredClone(selectedDefault.actual)});
 const methods=[
  ['measurement',spinnerSnackGateMeasurementOk,()=>({context,caseId:selectedDefault.case_id,actual:structuredClone(selectedDefault.actual)})],
  ['direct',spinnerSnackGateDirectMatch,()=>({context,caseId:selectedDefault.case_id,original:structuredClone(selectedDefault.expected),actual:structuredClone(selectedDefault.actual),identity:structuredClone(selectedDefault.identity),descriptor:structuredClone(descriptor)})],
  ['default',spinnerSnackGateDefaultMatch,()=>({context,caseId:selectedDefault.case_id,got:defaultGot()})],
  ['aggregate',spinnerSnackGateAggregateMatch,()=>({context,caseId:selectedAggregate.case_id,actual:structuredClone(selectedAggregate.actual_measurement),companion:structuredClone(selectedAggregate.current_companion),descriptor:structuredClone(descriptor)})],
 ];
 for(const[name,fn,make]of methods){
  for(const field of Object.keys(make())){const args=make();hook=()=>{args[field]=field==='caseId'?'foreign':{};};check('live outer replacement '+name+'/'+field,()=>assert.equal(fn(args),false));}
  for(const kind of ['extra','symbol','getter','flags']){const args=make();hook=()=>{if(kind==='extra')args.foreign=true;else if(kind==='symbol')args[Symbol('foreign')]=true;else if(kind==='getter')Object.defineProperty(args,'caseId',{get(){getters++;return 'foreign';},enumerable:true,configurable:true});else Object.defineProperty(args,'caseId',{writable:false});};check('live outer descriptor '+name+'/'+kind,()=>assert.equal(fn(args),false));}
 }
 for(const field of ['root','read']){const args={root:input.root,read:path=>{if(hook){const fn=hook;hook=null;fn();}return readFileSync(join(input.root,path));}};hook=()=>{args[field]=field==='root'?'/tmp/foreign-root':()=>Buffer.from('foreign');};check('factory live outer '+field,()=>assert.throws(()=>createSpinnerSnackGateContext(args)));}
 const inventory=await import('./parallel-spinner-snack-gate-integration-inventory-afterimage-'+(input.line==='21.x'?'21':'main')+'-v3.mjs');
 const oracle=JSON.parse(readFileSync(join(input.root,'compatibility/rc/oracles/material-16.2.14-sass-api.json'))),names=input.bodies.filter(b=>b.case_id.startsWith('mixin-css/')).map(b=>b.case_id.slice(10));
 const limited={members:{variables:{},functions:{},mixins:Object.fromEntries(names.map(n=>[n,structuredClone(oracle.members.mixins[n])]))}},candidate=structuredClone(limited.members),css={};
 for(const b of input.bodies.filter(b=>b.case_id.startsWith('mixin-css/'))){const actual=b.actual_measurement??b.actual;css[b.case_id.slice(10)]={...structuredClone(b),css:actual.css,sha256:actual.css_sha256,actual_measurement:structuredClone(actual)};}
 const compare=value=>inventory.compareInventory(limited,candidate,value,{spinnerSnackContext:context});
 check('exact proposed compareInventory eight defaults',()=>assert.ok(compare(css).every(r=>r.result==='pass'),JSON.stringify(compare(css).filter(r=>r.result!=='pass').map(r=>({case_id:r.case_id,reason:r.reason})))));
 for(const name of names.filter(n=>n.startsWith('all-component-'))){for(const field of ['css','sha256']){const changed=structuredClone(css);changed[name][field]=field==='css'?changed[name].css+'\n.foreign { color: red; }\n':'0'.repeat(64);check('actual compareInventory outer '+name+'/'+field,()=>assert.equal(compare(changed).find(r=>r.case_id==='mixin-css/'+name).result,'fail'));}}
 check('exact proposed apiDriftNegative outer digest',()=>{const result=inventory.apiDriftNegative(limited,candidate,css,{spinnerSnackContext:context});assert.ok(result.detected);assert.ok(result.mutated.includes('mixin-css/all-component-colors'));assert.ok(result.newly_failed.includes('mixin-css/all-component-colors'));});
 for(const body of [input.bodies[0],input.bodies.find(b=>b.case_id==='mixin-css/all-component-colors'),input.bodies.find(b=>b.case_id==='mixin-argument/all-component-colors/custom-full-theme')]){
  const live=structuredClone(body);hook=()=>{Object.defineProperty(direct(live)?live.actual:(live.actual_measurement??live.actual),'css',{get(){getters++;return (direct(body)?body.actual:(body.actual_measurement??body.actual)).css;},enumerable:true,configurable:true});};
  check('late CSS accessor '+body.case_id,()=>assert.equal(match(live),false));
  target='scripts/sass-spinner-snack-gate-integration.mjs';check('late helper source '+body.case_id,()=>assert.equal(match(body),false));target=null;context.assertCurrent();
 }
 assert.equal(getters,0);check('restoration',()=>assert.ok(match(input.bodies[0])));
 reports.push({line:input.line,checks:checks.length,modeled_CSS_positives:24,getter_calls:getters,fresh_compiles:0,actual_packed_assertions:0});
}
console.log(JSON.stringify(reports));
