import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spinnerSnackC04Source} from '../../scripts/sass-spinner-snack-c04-source.mjs';
const root=process.cwd(),output=process.argv[2],hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(output&&!existsSync(output));
const real=spinnerSnackC04Source({root,read:p=>readFileSync(join(root,p))}),paths=real.bound.map(r=>r.path);
const input=JSON.parse(readFileSync('compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json'));
const branch=input.branches[real.bridge.line],module=branch.modules[0],old=module.tagged.body.replaceAll("'@material/","'../vendor/mdc/");
const fixture=mkdtempSync(join(root,'compatibility/rc/parallel-spinner-snack-gate-integration-c04-physical-fixture-')),results=[];
try{
 for(const p of paths){const target=join(fixture,p);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,p),target);}
 const trace=[];let action=null,index=-1,getters=0;
 const read=p=>{const raw=readFileSync(join(fixture,p));trace.push(p);if(action&&trace.length-1===index)action(p,raw);Object.defineProperty(raw,'equals',{get(){getters++;throw Error('caller Buffer.equals');}});return raw;};
 const context=spinnerSnackC04Source({root:fixture,read});
 results.push({name:'actual C04 constructor exact copied closure',pass:true});
 for(const route of ['assertCurrent','public-assertCurrent','public-qualify','public-assertHistoricalSource','qualify','assertHistoricalSource']){
  const invoke=()=>route==='assertCurrent'?context.assertCurrent():route==='public-assertCurrent'?context.bridge.assertCurrent():route==='public-qualify'?context.bridge.qualify({path:module.path,...module.before}):route==='public-assertHistoricalSource'?context.bridge.assertHistoricalSource(module.path,old):route==='qualify'?context.qualify({path:module.path,...module.before}):context.assertHistoricalSource(module.path,old);
  trace.length=0;invoke();const ordered=trace.slice();assert.ok(ordered.length);
  for(const kind of ['same-final','earlier-member']){
   const trigger=ordered.at(-1),victim=kind==='same-final'?trigger:module.path,before=readFileSync(join(fixture,victim));index=ordered.length-1;let changed=false;
   action=p=>{assert.equal(p,trigger);action=null;changed=true;writeFileSync(join(fixture,victim),Buffer.concat([before,Buffer.from('\n/* copied C04 callback mutation */\n')]));};
   trace.length=0;let rejected=false;try{invoke();}catch{rejected=true;}assert.ok(changed&&rejected);writeFileSync(join(fixture,victim),before);action=null;invoke();results.push({name:route+'/'+kind,rejected,trigger,victim});
  }
 }
 assert.equal(getters,0);
 const refs=['scripts/sass-spinner-snack-c04-source.mjs','scripts/historical-contract-repair-readers.mjs','compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs'].map(path=>{const raw=readFileSync(path);return {path,sha256:hash(raw),bytes:raw.length};});
 writeFileSync(output,JSON.stringify({schema_version:1,role:'Actual C04 accepting functional boundary narrow callback replay on owned copies',line:real.bridge.line,results,copied_paths:paths.length,provided_equals_getters:getters,sources:refs,new_compiles:0,real_inputs_mutated:false,actual_gate_owner_or_packed:false},null,2)+'\n');console.log(JSON.stringify({line:real.bridge.line,checks:results.length,getters}));
}finally{rmSync(fixture,{recursive:true});}
