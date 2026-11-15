/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact workflow transition and isolated physical/callback controls. No Actions execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryFiniteToolSuccessor} from '../scripts/inventory-finite-tool-successor.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':'main';
const sha=b=>createHash('sha256').update(b).digest('hex');
const subject=inventoryFiniteToolSuccessor({root,line,read});const workflow=subject.workflow;
assert.equal(workflow.full_Actions_execution_qualified,false);
assert.deepEqual(subject.qualify(workflow.before),workflow.current);
assert.deepEqual(subject.qualify(workflow.current),workflow.current);
assert.deepEqual(subject.qualify(workflow.helper_test.before),workflow.helper_test.current);
assert.deepEqual(subject.qualify(workflow.helper_test.current),workflow.helper_test.current);
assert.throws(()=>subject.qualify({...workflow.helper_test.before,sha256:'0'.repeat(64)}));
assert.equal(subject.qualify({path:'scripts/unrelated.mjs',sha256:'0'.repeat(64)}),null);
assert.throws(()=>subject.qualify({...workflow.before,sha256:'0'.repeat(64)}));
assert.throws(()=>subject.qualify({...workflow.before,bytes:workflow.before.bytes+1}));
const outputs=workflow.source_test_expectations.map(expected=>{
 const output=JSON.parse(execFileSync(process.execPath,[expected.path],{cwd:root,encoding:'utf8'}));
 assert.equal(output.cases,expected.cases);assert.equal(output.mutants_rejected,expected.mutants_rejected);
 return {path:expected.path,cases:output.cases,mutants_rejected:output.mutants_rejected};
});
const temp=mkdtempSync(join(tmpdir(),'inventory-workflow-'));
try{
 const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
 writeFileSync(join(temp,'.git'),'gitdir: '+gitDir+'\n');
 for(const ref of subject.bound){const target=join(temp,ref.path);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(root,ref.path),target);}
 const tempRead=path=>readFileSync(join(temp,path));
 const isolated=inventoryFiniteToolSuccessor({root:temp,line,read:tempRead});isolated.assertCurrent();
 const workflowPath=join(temp,workflow.current.path),before=readFileSync(workflowPath);
 try{writeFileSync(workflowPath,Buffer.concat([before,Buffer.from('\n')]));assert.throws(()=>isolated.assertCurrent());}
 finally{writeFileSync(workflowPath,before);}
 isolated.assertCurrent();
 if(line==='main'){
  const inventoryFrame=JSON.parse(tempRead('compatibility/rc/parent-main-inventory-reference-current-source-v1.json'));
  const finalInventory=JSON.parse(tempRead('compatibility/rc/current-tool-matrix-final-product-v1.json')).structural_transitions[1];
  assert.deepEqual(finalInventory.before,inventoryFrame.inventory_transitions.at(-1).after);const currentInventory=isolated.qualify(finalInventory.after);assert.equal(currentInventory.sha256,'c15f9b3b21f0ae6001246243e85be4e61155e60af50c86c9272dd6289514504b');
  for(const transition of inventoryFrame.inventory_transitions){
   const old=isolated.inventoryHistoricalBytes(transition.before);assert.equal(sha(old),transition.before.sha256);assert.equal(old.length,transition.before.bytes);
   assert.deepEqual(isolated.qualify(transition.before),currentInventory);
  }
  assert.deepEqual(isolated.qualify(finalInventory.after),currentInventory);
  const historicalRef=inventoryFrame.inventory_transitions[0].before;
  assert.throws(()=>isolated.inventoryHistoricalBytes({...historicalRef,bytes:historicalRef.bytes+1}));
  let getterCalled=false;const forged={path:historicalRef.path,bytes:historicalRef.bytes,get sha256(){getterCalled=true;return historicalRef.sha256;}};
  assert.throws(()=>isolated.inventoryHistoricalBytes(forged));assert.equal(getterCalled,false);
  const inventoryPath=join(temp,historicalRef.path),inventoryBytes=readFileSync(inventoryPath);
  try{writeFileSync(inventoryPath,Buffer.concat([inventoryBytes,Buffer.from('\n')]));assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:tempRead}));assert.throws(()=>isolated.inventoryHistoricalBytes(historicalRef));}
  finally{writeFileSync(inventoryPath,inventoryBytes);}isolated.assertCurrent();
  let reentered=false;assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:path=>{if(!reentered){reentered=true;try{inventoryFiniteToolSuccessor({root:temp,line,read:tempRead});}catch{}}return tempRead(path);}}),/reentrant/);assert.equal(reentered,true);isolated.assertCurrent();
  let armed=false,nested=false;const guardedRead=path=>{const raw=tempRead(path);if(armed&&!nested){nested=true;try{liveGuard.assertCurrent();}catch{}}return raw;};const liveGuard=inventoryFiniteToolSuccessor({root:temp,line,read:guardedRead});armed=true;assert.throws(()=>liveGuard.assertCurrent(),/reentrant/);assert.equal(nested,true);armed=false;liveGuard.assertCurrent();
  const recovered=inventoryFiniteToolSuccessor({root:temp,line,read:tempRead});recovered.assertCurrent();
  let mutated=false;try{assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:path=>{if(!mutated){mutated=true;writeFileSync(inventoryPath,Buffer.concat([inventoryBytes,Buffer.from('\n')]));}return tempRead(path);}}));assert.equal(mutated,true);}finally{writeFileSync(inventoryPath,inventoryBytes);}isolated.assertCurrent();
  assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line:'21.x',read:tempRead}));
  for(const [path,change] of [
   [workflow.current.path,s=>s.replace('          just chainman exec -- node scripts/dialog-motion-source-test.mjs\n','')],
   [workflow.current.path,s=>s.replace('expected_chrome_sha=dbc8b199','expected_chrome_sha=00000000')],
   [workflow.targets[0].path,s=>s+'\n// wrong source\n'],
   ['compatibility/rc/parent-main-inventory-reference-current-source-v1.json',s=>s.replace('a3ebe782d8757db92b392c9c5ced70de7f25cca550a705363ccab825037d6403','0'.repeat(64))],
   ['compatibility/rc/parent-main-ci-browser-pin-source-successor-v1.json',s=>s.replace('"source_scope_only": true','"source_scope_only": false')],
   ['compatibility/rc/parent-main-ci-browser-pin-source-successor-v1.json',s=>s.replace('4b4893f56cbb5ce91cf698ec75449ba5e5e10943','0000000000000000000000000000000000000000')],
  ]){
   const target=join(temp,path),original=readFileSync(target),changed=Buffer.from(change(original.toString()));
   assert.ok(!changed.equals(original));
   try{writeFileSync(target,changed);assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:tempRead}));assert.throws(()=>isolated.assertCurrent());}
   finally{writeFileSync(target,original);}
   isolated.assertCurrent();
  }
 }
 let touched=false;
 assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:path=>{
  if(!touched){writeFileSync(workflowPath,Buffer.concat([before,Buffer.from('\n')]));touched=true;}
  return tempRead(path);
 }}));assert.equal(touched,true);writeFileSync(workflowPath,before);
 isolated.assertCurrent();
 for(const path of ['scripts/inventory-finite-tool-successor.mjs','compatibility/rc/parent-inventory-current-workflow-successor-v1.json','compatibility/rc/parent-inventory-current-workflow-helper-test-successor-v2.json']){
  const target=join(temp,path),original=readFileSync(target);
  try{writeFileSync(target,Buffer.concat([original,Buffer.from('\n')]));assert.throws(()=>isolated.assertCurrent());}
  finally{writeFileSync(target,original);}
  isolated.assertCurrent();
 }
 const helperTestPath=join(temp,workflow.helper_test.current.path),helperTestBytes=readFileSync(helperTestPath);
 try{writeFileSync(helperTestPath,Buffer.concat([helperTestBytes,Buffer.from('\n')]));assert.throws(()=>isolated.assertCurrent());}
 finally{writeFileSync(helperTestPath,helperTestBytes);}
 isolated.assertCurrent();
 assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:path=>path===workflow.helper_test.current.path?Buffer.concat([tempRead(path),Buffer.from('\n')]):tempRead(path)}));
 for(const target of workflow.targets){
  assert.equal(sha(read(target.path)),target.sha256);
  assert.throws(()=>inventoryFiniteToolSuccessor({root:temp,line,read:path=>path===target.path?Buffer.concat([tempRead(path),Buffer.from('\n')]):tempRead(path)}));
 }
}finally{rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({line,workflow_current:workflow.current,source_regressions:outputs,unknown_sha_rejected:true,unknown_path_excluded:true,late_physical_and_callback_mutations_rejected:true,loaded_image_and_packet_mutations_rejected:true,helper_test_transition_qualified:true,helper_test_late_physical_and_callback_mutations_rejected:true,source_only:true,full_Actions_execution_qualified:false}));
