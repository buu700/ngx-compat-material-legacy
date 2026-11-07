/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/inventory-finite-tool-successor.mjs',PACKET='compatibility/rc/parent-inventory-tool-product-successor-v2.json',PIN='7623c34a65d9600d9cecfcce53ea5ee539d990e05a3902b597e5b5848be130df';
const WORKFLOW_PACKET='compatibility/rc/parent-inventory-current-workflow-successor-v1.json',WORKFLOW_PIN='37172d8f47ec4bada65019581a444b5b2feb5979aeebad7edf471b2f8aceb3e0';
const HELPER_TEST_PACKET='compatibility/rc/parent-inventory-current-workflow-helper-test-successor-v2.json',HELPER_TEST_PIN='f4d625dc55d19586ce49b7ae9b9bb036dde6e375d04786688ab9637959fb7ce9';
const hash=b=>createHash('sha256').update(b).digest('hex'),image=readFileSync(fileURLToPath(import.meta.url));
export function inventoryFiniteToolSuccessor({root,line,read}){
 assert.ok(line==='21.x'||line==='main');assert.equal(typeof read,'function');const physical=p=>readEvidenceMember(root,p);assert.ok(physical(SELF).equals(image));
 const packetRaw=physical(PACKET);assert.equal(hash(packetRaw),PIN);assert.equal(packetRaw.length,12474);const packet=JSON.parse(packetRaw);assert.equal(packet.schema_version,1);assert.equal(packet.role,'inventory-tool-finite-product-successor');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.g11_claim,'not-passed');
 const previous={path:'compatibility/rc/parent-inventory-python-product-successor-v1.json',sha256:'1dec61d2e9c5fb9abc95d4f66e23e4dc99ed3b26b8847df37950634494990043',bytes:2672};assert.deepEqual(packet.previous_packet,previous);const previousRaw=physical(previous.path);assert.equal(hash(previousRaw),previous.sha256);assert.equal(previousRaw.length,previous.bytes);const prior=JSON.parse(previousRaw),rows=packet.branches[line].transitions;assert.deepEqual(rows.map(row=>row.path),['scripts/historical_inventory_rebinding.py','scripts/inventory-reference-proposal.mjs']);assert.deepEqual(rows[0],prior.branches[line]);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const k of Object.keys(env))if(k.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(k))delete env[k];
 for(const row of rows){assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);assert.match(row.source_parent,/^[0-9a-f]{40}$/);const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',row.source_parent+':'+row.path],{cwd:root,env,maxBuffer:1024*1024});assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);let pos=0,parts=[];for(const e of row.edits){assert.deepEqual(Object.keys(e).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(e.offset)&&e.offset>=pos);const old=Buffer.from(e.before);assert.ok(before.subarray(e.offset,e.offset+old.length).equals(old));parts.push(before.subarray(pos,e.offset),Buffer.from(e.after));pos=e.offset+old.length;}const after=Buffer.concat([...parts,before.subarray(pos)]);assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);}

 const workflowRaw=physical(WORKFLOW_PACKET);assert.equal(hash(workflowRaw),WORKFLOW_PIN,'changed finite workflow packet');assert.equal(workflowRaw.length,3466);
 const workflowPacket=JSON.parse(workflowRaw);assert.equal(workflowPacket.schema_version,1);assert.equal(workflowPacket.role,'inventory-current-ci-workflow-finite-successor');assert.equal(workflowPacket.source_scope_only,true);assert.equal(workflowPacket.historical_programs_executed,false);assert.equal(workflowPacket.full_Actions_execution_qualified,false);assert.equal(workflowPacket.g11_claim,'not-passed');
 const workflow=workflowPacket.branches[line];assert.ok(workflow);assert.equal(workflow.historical_after.path,'.github/workflows/ci.yml');assert.equal(workflow.current.path,workflow.historical_after.path);
 const oldWorkflow=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',workflow.source_commit+':'+workflow.current.path],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(oldWorkflow),workflow.historical_after.sha256);assert.equal(oldWorkflow.length,workflow.historical_after.bytes);
 const edit=workflow.edit;assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.equal(edit.before,'');assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=0&&edit.offset<=oldWorkflow.length);
 const anchor=Buffer.from(workflow.anchor);assert.equal(anchor.toString(),'      - name: Require the packed export map\n');assert.ok(oldWorkflow.subarray(edit.offset,edit.offset+anchor.length).equals(anchor));
 const addition=Buffer.from(edit.after),expected=Buffer.concat([oldWorkflow.subarray(0,edit.offset),addition,oldWorkflow.subarray(edit.offset)]);
 assert.equal(addition.toString(),'      - name: Dialog focus and motion source lifecycle regressions\n        run: |\n          just chainman exec -- node scripts/dialog-initial-focus-source-test.mjs\n          just chainman exec -- node scripts/dialog-motion-source-test.mjs\n\n');
 assert.equal(hash(expected),workflow.current.sha256);assert.equal(expected.length,workflow.current.bytes);assert.ok(physical(workflow.current.path).equals(expected),'unreviewed CI workflow change');
 assert.deepEqual(workflow.targets.map(ref=>ref.path),['scripts/dialog-initial-focus-source-test.mjs','scripts/dialog-motion-source-test.mjs']);
 assert.deepEqual(workflow.current_source_test_expectations,[{path:workflow.targets[0].path,cases:30,mutants_rejected:7},{path:workflow.targets[1].path,cases:20,mutants_rejected:6}]);
 for(const target of workflow.targets){const raw=physical(target.path);assert.equal(hash(raw),target.sha256,'changed CI source test '+target.path);assert.equal(raw.length,target.bytes);}
 const helperTestRaw=physical(HELPER_TEST_PACKET);assert.equal(hash(helperTestRaw),HELPER_TEST_PIN,'changed finite helper test packet');assert.equal(helperTestRaw.length,3449);
 const helperTestPacket=JSON.parse(helperTestRaw);assert.equal(helperTestPacket.schema_version,1);assert.equal(helperTestPacket.role,'inventory-current-ci-workflow-helper-test-successor');assert.equal(helperTestPacket.source_scope_only,true);assert.equal(helperTestPacket.historical_programs_executed,false);assert.equal(helperTestPacket.full_Actions_execution_qualified,false);assert.equal(helperTestPacket.g11_claim,'not-passed');assert.deepEqual(helperTestPacket.previous_packet,{path:WORKFLOW_PACKET,sha256:WORKFLOW_PIN,bytes:workflowRaw.length});
 const helperTest=helperTestPacket.branches[line];assert.ok(helperTest);assert.equal(helperTest.before.path,'tests/test_helper_ci.py');assert.equal(helperTest.current.path,helperTest.before.path);
 const oldTest=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',helperTest.source_parent+':'+helperTest.before.path],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(oldTest),helperTest.before.sha256);assert.equal(oldTest.length,helperTest.before.bytes);
 const testEdit=helperTest.edit;assert.deepEqual(Object.keys(testEdit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(testEdit.offset)&&testEdit.offset>=0&&testEdit.offset<=oldTest.length);
 const priorTest=Buffer.from(testEdit.before),nextTest=Buffer.from(testEdit.after);assert.ok(oldTest.subarray(testEdit.offset,testEdit.offset+priorTest.length).equals(priorTest),'helper test predecessor changed');
 assert.equal(oldTest.toString().split(testEdit.before).length,2,'ambiguous helper test edit');
 assert.match(testEdit.before,/self\.assertEqual\(current\.split\('  packed-consumer-aot:/);
 assert.match(testEdit.after,/self\.assertEqual\(current\.count\(source_regressions\), 1\)/);
 assert.match(testEdit.after,/\.replace\(source_regressions, ''\)/);
 const currentTest=Buffer.concat([oldTest.subarray(0,testEdit.offset),nextTest,oldTest.subarray(testEdit.offset+priorTest.length)]);
 assert.equal(hash(currentTest),helperTest.current.sha256);assert.equal(currentTest.length,helperTest.current.bytes);assert.ok(physical(helperTest.current.path).equals(currentTest),'unreviewed helper CI test change');
 let ownerEpoch=null,ownerPacketRef=null;
 if(line==='main'){
  const path='compatibility/rc/parent-main-nine-spec-inventory-owner-successor-v1.json',sha256='0cc73ad957f0b3a28ee3ac2f1b46bcdcf8f2d47f3399f9e0eb555c9a0af2e54b';
  const raw=physical(path);assert.equal(hash(raw),sha256);assert.equal(raw.length,23206);ownerPacketRef={path,sha256,bytes:raw.length};
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-nine-spec-inventory-owner-finite-successor');
  assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.g11_claim,'not-passed');
  assert.equal(packet.source_parent,'9665df520e4f8644422203b6cb82a5412a483a33');assert.deepEqual(packet.before,rows[1].after);
  const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+packet.before.path],{cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(before),packet.before.sha256);assert.equal(before.length,packet.before.bytes);
  const edit=packet.edit;assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=0);
  const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));
  const after=Buffer.concat([before.subarray(0,edit.offset),Buffer.from(edit.after),before.subarray(edit.offset+old.length)]);
  assert.equal(hash(after),packet.after.sha256);assert.equal(after.length,packet.after.bytes);assert.ok(physical(packet.after.path).equals(after));
  for(const ref of [packet.new_validator,packet.current_inventory]){const bytes=physical(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);}
  const terminal=packet.terminal_owner;assert.equal(terminal.before.path,'scripts/inventory-reference-owner.mjs');assert.equal(terminal.after.path,terminal.before.path);
  const priorOwner=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+terminal.before.path],{cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(priorOwner),terminal.before.sha256);assert.equal(priorOwner.length,terminal.before.bytes);
  const {before:oldText,after:newText}=terminal.literal_edit;assert.equal(priorOwner.toString().split(oldText).length,2);
  const updatedOwner=Buffer.from(priorOwner.toString().replace(oldText,newText));assert.equal(hash(updatedOwner),terminal.after.sha256);
  assert.equal(updatedOwner.length,terminal.after.bytes);assert.ok(physical(terminal.after.path).equals(updatedOwner));
  const oldInventory=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+packet.current_inventory.path],{cwd:root,env,maxBuffer:2*1024*1024});
  assert.equal(hash(oldInventory),'baecc3ac539fe5ade1796c8647089588daa23d43d426358bd17038cc3933561c');
  ownerEpoch={...packet,priorInventory:{path:packet.current_inventory.path,sha256:hash(oldInventory),bytes:oldInventory.length}};
 }
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PIN,bytes:packetRaw.length},previous,...rows.map(row=>({...((ownerEpoch&&row.path===ownerEpoch.after.path)?ownerEpoch.after:row.after)})),...(ownerEpoch?[ownerPacketRef,ownerEpoch.new_validator,ownerEpoch.current_inventory,ownerEpoch.terminal_owner.after]:[]),{path:WORKFLOW_PACKET,sha256:WORKFLOW_PIN,bytes:workflowRaw.length},{...workflow.current},...workflow.targets.map(ref=>({...ref})),{path:HELPER_TEST_PACKET,sha256:HELPER_TEST_PIN,bytes:helperTestRaw.length},{...helperTest.current}];let active=false;const sweep=()=>{for(const ref of bound){const raw=physical(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}assert.ok(physical(SELF).equals(image));};const assertCurrent=()=>{assert.equal(active,false,'reentrant inventory successor');active=true;try{sweep();for(const ref of bound){const raw=physical(ref.path);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied));assert.ok(raw.equals(supplied),'nonphysical inventory successor');assert.ok(raw.equals(physical(ref.path)));}sweep();}finally{active=false;}};
 const qualify=ref=>{const baseRow=rows.find(item=>item.path===ref?.path);const row=baseRow && ownerEpoch && baseRow.path===ownerEpoch.after.path ? {before:baseRow.before,after:ownerEpoch.after} : baseRow??(ownerEpoch&&ref?.path===ownerEpoch.current_inventory.path?{before:ownerEpoch.priorInventory,after:ownerEpoch.current_inventory}:ownerEpoch&&ref?.path===ownerEpoch.terminal_owner.after.path?ownerEpoch.terminal_owner:ref?.path===workflow.current.path?{before:workflow.historical_after,after:workflow.current}:ref?.path===helperTest.current.path?{before:helperTest.before,after:helperTest.current}:null);if(!row)return null;const intermediate=ownerEpoch&&ref.path===ownerEpoch.after.path?ownerEpoch.before:null;assert.ok(ref.sha256===row.before.sha256||ref.sha256===row.after.sha256||ref.sha256===intermediate?.sha256,'unknown inventory verifier predecessor');const prior=ref.sha256===row.before.sha256?row.before:ref.sha256===intermediate?.sha256?intermediate:row.after;if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes);return {...ref,sha256:row.after.sha256,...(ref.bytes===undefined?{}:{bytes:row.after.bytes})};};assertCurrent();return{bound:structuredClone(bound),qualify,assertCurrent,workflow:{before:{...workflow.historical_after},current:{...workflow.current},targets:structuredClone(workflow.targets),source_test_expectations:structuredClone(workflow.current_source_test_expectations),helper_test:{before:{...helperTest.before},current:{...helperTest.current}},full_Actions_execution_qualified:false}};
}
