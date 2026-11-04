import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(new URL('../..',import.meta.url).pathname),prefix='compatibility/rc/parallel-spinner-snack-public-bridge-source-independent-';
const subjectPath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const packetPath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=path=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};};
const version=process.argv[2]??'v1';assert.match(version,/^[a-z0-9-]+$/);
const sourceBefore=ref(subjectPath),packetBefore=ref(packetPath);
const {currentSpinnerSnackBridgeSourceSubject}=await import(pathToFileURL(join(root,subjectPath)));
const packet=JSON.parse(readFileSync(join(root,packetPath))),module=packet.branches['21.x'].modules[0];
let action=null;
const read=path=>{const raw=readFileSync(join(root,path));if(path===subjectPath&&action){const current=action;action=null;current();}return raw;};
const subject=currentSpinnerSnackBridgeSourceSubject({root,read});
const controls=[];
function run(name,incoming,mutate){
 let accepted=false,result=null,error=null;
 action=()=>mutate(incoming);
 try{result=subject.qualify(incoming);accepted=true;}catch(thrown){error=thrown.message;}
 assert.equal(action,null,'mutation callback was not reached');
 controls.push({name,accepted,result,error,live_descriptors:Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(incoming)).map(([key,value])=>[key,Object.hasOwn(value,'value')?{kind:'data',value:value.value}:{kind:'accessor'}]))});
}
let getterCalls=0;
run('bytes-getter-mutates-already-checked-path',{path:module.path,sha256:module.before.sha256,bytes:module.before.bytes},incoming=>{
 Object.defineProperty(incoming,'bytes',{configurable:true,enumerable:true,get(){getterCalls++;incoming.path='foreign/source.scss';return module.before.bytes;}});
});
run('initially-absent-bytes-added-during-guard',{path:module.path,sha256:module.before.sha256},incoming=>{incoming.bytes=-1;});
run('initially-present-bytes-deleted-during-guard',{path:module.path,sha256:module.before.sha256,bytes:module.before.bytes},incoming=>{delete incoming.bytes;});
run('sha-accessor-added-during-guard',{path:module.path,sha256:module.before.sha256,bytes:module.before.bytes},incoming=>{
 Object.defineProperty(incoming,'sha256',{configurable:true,enumerable:true,get(){getterCalls++;return module.before.sha256;}});
});
const authentic={path:module.path,sha256:module.before.sha256,bytes:module.before.bytes};
assert.deepEqual(subject.qualify(authentic),module.current);
subject.assertCurrent();
assert.deepEqual(ref(subjectPath),sourceBefore,'subject source changed while probe ran');
assert.deepEqual(ref(packetPath),packetBefore,'packet changed while probe ran');
const result={schema_version:1,status:controls.some(row=>row.accepted)?'live-reference-mutation-reproduced':'all-live-reference-mutation-controls-rejected',
 source:sourceBefore,packet:packetBefore,controls,getter_calls_during_post_callback_validation:getterCalls,restored_authentic_reference_accepted:true,
 executed:'Current public source-subject constructor, its cached receipt/Git/source bindings and live qualifier only; no Sass/compiler/build/browser/fullowner execution.',
 existing_files_edited:false};
const output=prefix+'live-reference-result-'+version+'.json';writeFileSync(join(root,output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:ref(output),status:result.status,controls:controls.map(({name,accepted})=>({name,accepted})),getter_calls:getterCalls}));
