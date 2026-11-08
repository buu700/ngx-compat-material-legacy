/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact inventory-reference metadata proposal. Canonical integration and native execution remain separate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const functionToString=Function.prototype.toString,apply=Reflect.apply;
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,realpathSync,lstatSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {selectDialogFiniteSuccessor} from './select-dialog-finite-source-successor.mjs';
import {inventoryFiniteToolSuccessor} from './inventory-finite-tool-successor.mjs';
export const INVENTORY_REFERENCE_PACKET='compatibility/rc/c04-inventory-reference-proposal.json';
export const INVENTORY_REFERENCE_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
export const INVENTORY_REFERENCE_PATH='testing/legacy-runner/historical-inventory.json';
const sourceValidator='scripts/historical_inventory_rebinding.py',nextValidator='scripts/historical_inventory_nine_spec_successor.py',self='scripts/inventory-reference-proposal.mjs';
const nextInventoryHash='912def47c1e171f9c2a01906dcc0968b91c5288d9b8f73714247b0319f3a2b15';
const nextValidatorHash='089c9136edf610560f183eb0d4c39c89a764d7d984a4e6afe250765367e943fd';
const epochHead='9665df520e4f8644422203b6cb82a5412a483a33';
const validatorHash='1014fae26c962bf8934d93bca44d30dfe49575b2b9e23288e8eb930323f48ce1';
const pins={
  "main": {
    "parent": "a0015ca03a0cd65405df754fdee30cfe95cbafac",
    "before": "121fa2c930784575a0ead888fb6d5caa03a4511aa5b90f7d88e69450df5a6da0",
    "after": "e8c57b7630bfec15b3730214c03c41cf37e6654ce236743dff3d644ff43e813e",
    "inventory": "baecc3ac539fe5ade1796c8647089588daa23d43d426358bd17038cc3933561c",
    "priorInventory": "89e7770f51357cd8544c7df10a3ba9c538bcc66f3040e3d45434634308616832",
    "count": 20,
    "packet": "15d53cbe6433fd675cb2650f91767c84b75751e35b285580aa4aba61d066e521"
  },
  "21.x": {
    "parent": "3aefef647f2237cca488d0b5de62cd2981f3dc7e",
    "before": "cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1",
    "after": "558b6891e575422cdfcdaff2f59fa7611cf53246130da3afeec68571d1c77a1b",
    "inventory": "810b917ff7702ff8e759291b5265d3060edb39866bc691ed0700ee6158a02659",
    "priorInventory": "2698f53be977b484aec2aaf3f9f052fc9b0bc4cd28632acc2ef5481b3ca4f724",
    "count": 19,
    "packet": "c1ace65c1154b0d97295be951b1bda4d2ba135c8ef7a9b117ba0c083ea9c0843"
  }
};
const kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const image=readFileSync(fileURLToPath(import.meta.url));
const readerModules=[
 {path:'scripts/upstream-packed-run-evidence.mjs',sha256:'4ca01cf54f88ddd557556955ce987986a53ad21f95adfaed3fb3686d31bbd5ac'},
 {path:'scripts/packed-consumer-evidence.mjs',sha256:'c277cc4d4e3c3d5afb706ed9872cf0a5da453cbd470d9d7be0c2a6f02e6b28a3'},
];
const readerImageHash='ba09dbebba1cd94786b5f75563528bfe875d833b9db2de73e6d8c4628a39fe3c';

function oldBytes(root,parent,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
function inventoryReferences(ledger){
 const refs=[];
 function walk(value,pointer,entry){
  if(Array.isArray(value)){value.forEach((child,index)=>walk(child,pointer+'/'+index,entry));return;}
  if(!value||typeof value!=='object')return;
  if(value.path===INVENTORY_REFERENCE_PATH)refs.push({sha:entry.sha,pointer,reference:structuredClone(value)});
  for(const[key,child]of Object.entries(value))walk(child,pointer+'/'+key,entry);
 }
 for(const entry of ledger.entries)walk(entry,'',entry);
 return refs;
}
/** Pure derivation from an authenticated before-image; the packet is a comparison, not an executable expectation. */
export function deriveInventoryReferenceMetadata({before,packet,inventory}={}){
 const pin=pins[packet.line];assert.ok(pin,'unknown inventory reference line');
 assert.equal(hash(before),pin.before);assert.equal(hash(inventory),pin.inventory);
 assert.equal(packet.source_parent,pin.parent);assert.equal(packet.metadata_reference_updates,pin.count);
 assert.deepEqual(packet.before_ledger,{path:INVENTORY_REFERENCE_LEDGER,sha256:pin.before,bytes:before.length});
 assert.deepEqual(packet.current_inventory,{path:INVENTORY_REFERENCE_PATH,sha256:pin.inventory,bytes:inventory.length});
 const ledger=JSON.parse(before),expected=structuredClone(ledger),replacements=[],updates=[];
 assert.equal(ledger.entries.length,1697);assert.equal(new Set(ledger.entries.map(row=>row.sha)).size,1697);
 assert.equal(ledger.g11_claim,'not-passed');assert.equal(packet.prior_inventory_sha256,pin.priorInventory);
 for(const[entryIndex,prior]of ledger.entries.entries()){
  const entry=expected.entries[entryIndex];
  for(const kind of kinds){
   const members=prior.individual_proof?.[kind]?.source_members;if(!members)continue;
   assert.ok(Array.isArray(members));
   for(const[memberIndex,member]of members.entries()){
    if(member.path!==INVENTORY_REFERENCE_PATH)continue;
    assert.equal(member.sha256,pin.priorInventory,'unregistered native inventory source image');
    const next=entry.individual_proof[kind].source_members[memberIndex];next.sha256=pin.inventory;
    updates.push({sha:prior.sha,pointer:'/individual_proof/'+kind+'/source_members/'+memberIndex,
     before_reference:structuredClone(member),after_reference:structuredClone(next),
     before_entry_sha256:hash(json(prior)),after_entry_sha256:hash(json(entry))});
    replacements.push({sha:prior.sha,after_entry:entry});
   }
  }
 }
 assert.equal(updates.length,pin.count);assert.equal(new Set(updates.map(row=>row.sha)).size,pin.count);
 assert.deepEqual(updates,packet.updates,'packet does not name the complete independently derived native reference cohort');
 const beforeRefs=inventoryReferences(ledger),historical=beforeRefs.filter(ref=>ref.reference.sha256!==pin.priorInventory);
 assert.equal(historical.length,20);
 assert.deepEqual(packet.older_historical_references_to_preserve.map(row=>({sha:row.sha,pointer:row.pointer,reference:row.reference})),historical);
 const after=replaceHistoricalConsumerEntries(before,replacements);
 assert.equal(after.length,before.length);assert.equal(hash(after),pin.after);
 assert.deepEqual(packet.after_ledger,{path:INVENTORY_REFERENCE_LEDGER,sha256:pin.after,bytes:after.length});
 assert.deepEqual(JSON.parse(after),expected);
 const afterRefs=inventoryReferences(expected);
 assert.deepEqual(afterRefs.filter(ref=>ref.reference.sha256!==pin.inventory),historical,'historical inventory records were rebound');
 assert.equal(afterRefs.filter(ref=>ref.reference.sha256===pin.inventory).length,pin.count);
 const selected=new Set(updates.map(row=>row.sha));
 assert.deepEqual(expected.entries.filter(row=>!selected.has(row.sha)),ledger.entries.filter(row=>!selected.has(row.sha)));
 const withoutEntries=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='entries'));
 assert.deepEqual(withoutEntries(expected),withoutEntries(ledger));
 for(const flag of ['canonical_dispositions_changed','source_admissions_changed','other_current_source_references_changed'])assert.equal(packet[flag],0);
 assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 assert.equal(packet.canonical_owner_integration_complete,false);assert.equal(packet.g11_claim,'not-passed');
 return {before:Buffer.from(before),after,updates:structuredClone(updates),historical:structuredClone(historical),
  metadata_reference_updates:pin.count,unselected_entries_preserved:1697-pin.count,canonical_dispositions_changed:0,
  native_or_full_audit_credit:false};
}
// One transaction spans each public operation, including every supplied reader
// callback. A caught nested failure still invalidates the outer operation.
const activeRoots=new Map(),sourceChecks=new WeakMap();
function transaction(root,operation){
 const key=realpathSync(root),prior=activeRoots.get(key);
 if(prior){prior.violation=true;throw Error('reentrant inventory reference consumption');}
 const state={violation:false};activeRoots.set(key,state);
 try{const result=operation();assert.equal(state.violation,false,'swallowed inventory reference reentry');return result;}
 finally{activeRoots.delete(key);}
}
/** Recomputes the real finite source verifier; no caller-supplied verifier or persistent success cache. */
export function prepareInventoryReferenceSourceMetadata(options={}){
 return transaction(options.root,()=>buildInventoryReferenceSourceMetadata(options));
}
function buildInventoryReferenceSourceMetadata({root,read:suppliedRead=path=>readEvidenceMember(root,path),prebindPaths=[]}={}){
 assert.equal(typeof suppliedRead,'function');
 // A reader callback is untrusted input: every observed source is swept before
 // and after each callback, and the returned bytes must be the physical member.
 const observed=new Map();
 // Scratch storage is reused but is fully refreshed on every sweep. Directory
 // checks are scoped to one sweep; no bytes or stat results are cached.
 let scratch=Buffer.allocUnsafe(1),expectedShimPaths=null;
 const sweepShimNamespace=()=>{
  if(expectedShimPaths===null)return;
  const found=[],base='testing/legacy-runner/shims/harness';
  const visit=relative=>{for(const entry of readdirSync(resolve(root,relative),{withFileTypes:true})){
   const path=relative+'/'+entry.name;if(entry.name.endsWith('.spec.ts'))found.push(path);
   if(entry.isDirectory())visit(path);
  }};
  visit(base);found.sort();assert.deepEqual(found,expectedShimPaths,'historical shim namespace changed');
 };
 const sweepObserved=()=>{
  sweepShimNamespace();
  const rootStat=lstatSync(root);assert.ok(rootStat.isDirectory()&&!rootStat.isSymbolicLink());
  const checkedDirs=new Set();
  for(const [relative,image] of observed){
   assert.ok(typeof relative==='string'&&!relative.includes('\\'));const parts=relative.split('/');assert.ok(parts.length&&parts.every(part=>part&&part!=='.'&&part!=='..'));
   const path=resolve(root,...parts);assert.ok(path.startsWith(resolve(root)+sep));let cursor=root;
   // Parent components are checked on every sweep. The final component is
   // opened with O_NOFOLLOW and checked as a regular file by fstat below.
   for(let i=0;i<parts.length-1;i++){cursor=join(cursor,parts[i]);if(checkedDirs.has(cursor))continue;
    const st=lstatSync(cursor);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'invalid inventory directory');checkedDirs.add(cursor);
   }
   if(!constants.O_NOFOLLOW){const st=lstatSync(path);assert.ok(st.isFile()&&!st.isSymbolicLink(),'invalid inventory member');}
   if(scratch.length<image.length+1)scratch=Buffer.allocUnsafe(image.length+1);
   const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
   try{const st=fstatSync(fd);assert.ok(st.isFile()&&st.size===image.length,'physical inventory read frame changed '+relative);let pos=0;
    while(pos<image.length){const count=readSync(fd,scratch,pos,image.length-pos,null);assert.ok(count>0,'short inventory member');pos+=count;}
    assert.ok(scratch.subarray(0,image.length).equals(image),'physical inventory read frame changed '+relative);
    assert.equal(readSync(fd,scratch,image.length,1,null),0,'extra inventory member bytes');
    assert.equal(fstatSync(fd).size,image.length,'physical inventory member changed size');
   }finally{closeSync(fd);}
  }
 };
 const read=path=>{
  const actual=readEvidenceMember(root,path),previous=observed.get(path);
  if(previous)assert.ok(actual.equals(previous),'changed repeated inventory read '+path);else observed.set(path,Buffer.from(actual));
  sweepObserved();const supplied=suppliedRead(path);sweepObserved();
  assert.ok(Buffer.isBuffer(supplied)&&actual.equals(supplied),'nonphysical inventory reader '+path);
  return Buffer.from(actual);
 };
 const physical=path=>readEvidenceMember(root,path);
 const packagePath='projects/ngx-material-legacy/package.json',packageBytes=physical(packagePath),version=JSON.parse(packageBytes).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 let product;
 if(line==='main'){
  const physicalPackage=readEvidenceMember(root,packagePath);assert.ok(Buffer.isBuffer(packageBytes)&&physicalPackage.equals(packageBytes),'nonphysical inventory proposal package');
  const owner={path:'scripts/select-dialog-finite-source-v7.mjs',sha256:'87155482dbaa488a0e72ae0ba75c3edfe370bc11fcfc2ddd1ce3f0190a5609a6',bytes:17719};
  const physicalOwner=readEvidenceMember(root,owner.path),loadedPath=readFileSync(fileURLToPath(new URL('./select-dialog-finite-source-v7.mjs',import.meta.url)));assert.equal(hash(physicalOwner),owner.sha256);assert.equal(physicalOwner.length,owner.bytes);assert.equal(hash(loadedPath),owner.sha256);assert.equal(loadedPath.length,owner.bytes);
  const loaded=require('./select-dialog-finite-source-v7.mjs');assert.ok(Object.isFrozen(loaded.selectDialogFiniteLoadedImage));assert.deepEqual(loaded.selectDialogFiniteLoadedImage,owner);assert.equal(hash(apply(functionToString,loaded.selectDialogFiniteSuccessor,[])),'e6ab419874774e5d1878257c001d4bc24ea298d28072de22134ad0831895eef1');
  product=loaded.selectDialogFiniteSuccessor({root,line,read:physical});
 }else product=selectDialogFiniteSuccessor({root,line,read:physical});
 const tool=inventoryFiniteToolSuccessor({root,line,read:physical}),pin=pins[line],bound=new Map();
 const matrixOwner=line==='main'?require('./current-tool-matrix-source.mjs').currentToolMatrixSource({root,read:physical}):null;
 const prebind=(path,expected)=>{const raw=physical(path),previous=observed.get(path);if(previous)assert.ok(raw.equals(previous));else observed.set(path,Buffer.from(raw));if(expected){assert.equal(hash(raw),expected.sha256);assert.equal(raw.length,expected.bytes);}return raw;};
 for(const ref of [...product.bound,...tool.bound,...(matrixOwner?matrixOwner.bound:[])]){prebind(ref.path,ref);const prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,ref);else bound.set(ref.path,{...ref});}
 // Assemble the complete finite callback frame before the first supplied read.
 const packetPre=prebind(INVENTORY_REFERENCE_PACKET);assert.equal(hash(packetPre),pin.packet);
 const inventoryPre=prebind(INVENTORY_REFERENCE_PATH);assert.equal(hash(inventoryPre),line==='main'?nextInventoryHash:pin.inventory);
 const packetData=JSON.parse(packetPre),inventoryPreData=JSON.parse(inventoryPre);
 expectedShimPaths=inventoryPreData.shared_suite_shims.map(row=>row.path).sort();assert.equal(expectedShimPaths.length,21);assert.equal(new Set(expectedShimPaths).size,21);sweepShimNamespace();
 if(line==='main'){assert.equal(hash(apply(functionToString,readEvidenceMember,[])),readerImageHash,'loaded physical reader changed');
  for(const ref of readerModules){const loaded=readFileSync(fileURLToPath(new URL('../'+ref.path,import.meta.url)));assert.equal(hash(loaded),ref.sha256);const raw=prebind(ref.path);assert.equal(hash(raw),ref.sha256);}}
 for(const ref of packetData.source_members)prebind(ref.path);
 for(const path of [packagePath,self,sourceValidator,'scripts/select_dialog_finite_source_successor.py',...(line==='main'?[nextValidator,'scripts/historical_inventory_source.py']:[]),...prebindPaths])prebind(path);
 for(const row of inventoryPreData.rows)prebind(row.candidate);
 for(const row of inventoryPreData.shared_suite_shims)prebind(row.path);
 assert.ok(read(packagePath).equals(packageBytes));
 const member=(path,expected)=>{
  const actual=readEvidenceMember(root,path),raw=read(path);assert.ok(Buffer.isBuffer(raw));assert.ok(actual.equals(raw),'nonphysical inventory proposal input '+path);assert.ok(actual.equals(readEvidenceMember(root,path)),'inventory proposal input changed during callback '+path);
  if(expected){const ref={path,sha256:expected};const selected=line==='main' && path===INVENTORY_REFERENCE_PATH && expected===pin.inventory ? {...ref,sha256:nextInventoryHash} : tool.qualify(product.qualify(ref)??ref)??product.qualify(ref)??ref;assert.equal(hash(raw),selected.sha256,'unqualified inventory proposal input '+path);}
  const current={path,sha256:hash(raw),bytes:raw.length},prior=bound.get(path);if(prior)assert.deepEqual(current,prior,'changed repeated inventory proposal input '+path);else bound.set(path,current);return raw;
 };
 const packetRaw=member(INVENTORY_REFERENCE_PACKET,pin.packet),packet=JSON.parse(packetRaw);
 assert.equal(packet.line,line);assert.equal(packet.source_parent,pin.parent);
 member(self,hash(image));
 if(line==='main')for(const ref of readerModules)member(ref.path,ref.sha256);
 for(const ref of packet.source_members){const selected=tool.qualify(product.qualify(ref)??ref)??product.qualify(ref)??ref;const raw=member(ref.path,ref.sha256);assert.equal(raw.length,line==='main' && ref.path===INVENTORY_REFERENCE_PATH ? member(INVENTORY_REFERENCE_PATH,nextInventoryHash).length : selected.bytes);}
 member(sourceValidator,validatorHash);member('scripts/select_dialog_finite_source_successor.py','d5cb25d0908f93fb0d8e8d4701f2db0ec9a0726df8133dabe45906372b17fda7');
 const currentInventory=member(INVENTORY_REFERENCE_PATH,line==='main'?nextInventoryHash:pin.inventory);
 const inventory=line==='main'?oldBytes(root,epochHead,INVENTORY_REFERENCE_PATH):currentInventory;assert.equal(hash(inventory),pin.inventory);
 const inventoryData=JSON.parse(currentInventory);
 if(line==='main') member(nextValidator,nextValidatorHash);
 assert.equal(inventoryData.rows.length,57);assert.equal(inventoryData.shared_suite_shims.length,21);
 for(const row of inventoryData.rows)member(row.candidate,row.candidate_sha256);
 for(const row of inventoryData.shared_suite_shims)member(row.path,row.sha256);
 const before=oldBytes(root,pin.parent,INVENTORY_REFERENCE_LEDGER);
 const result=deriveInventoryReferenceMetadata({before,packet,inventory});
 let verifier;
 if(line==='main'){
  // The nine-spec image is historical comparison data. The live scanner reads
  // the physical current inventory and current candidate/shim sources.
  const nineSpec=oldBytes(root,'948e8290b74953c83d11268368f38952d0b51fd7',INVENTORY_REFERENCE_PATH);
  assert.equal(hash(nineSpec),'a3ebe782d8757db92b392c9c5ced70de7f25cca550a705363ccab825037d6403');
  member('scripts/historical_inventory_source.py','ea001a53909ab5f7227814b8690f62e5c9e22ce847888db5ebb349c599f0c8cf');
  const scan=execFileSync('python3',['-B','scripts/historical_inventory_source.py'],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(scan.trim(),'historical-inventory: 57 current candidate and 21 shim identities match; execution not qualified');
  matrixOwner.assertCurrent();
  const historical=JSON.parse(inventory).candidate_snapshot.source_binding_refreshes;
  assert.equal(historical.length,1);const prior=historical[0];assert.equal(prior.current_source_bindings_changed,13);
  assert.equal(prior.before_inventory_sha256,pin.priorInventory);assert.equal(prior.execution_claims_changed,0);
  verifier={line,source_parent:prior.source_parent,before_inventory_sha256:prior.before_inventory_sha256,
   historical_epoch_inventory_sha256:hash(inventory),historical_source_bindings_changed:13,
   historical_nine_spec_inventory_sha256:hash(nineSpec),current_source_scan:{candidates:57,shims:21,execution_qualified:false},current_matrix_owner_bound:true,current_inventory_sha256:hash(currentInventory),g11_claim:'not-passed'};
 }else{
  verifier=JSON.parse(execFileSync('python3',[sourceValidator],{cwd:root,encoding:'utf8',maxBuffer:1024*1024}));
  assert.equal(verifier.line,line);assert.equal(verifier.current_inventory_sha256,pin.inventory);
  assert.equal(verifier.source_bindings_changed,13);assert.equal(verifier.derived_summary_scalars_changed,2);
  assert.equal(verifier.execution_claims_changed,0);assert.equal(verifier.actual_native_packed_browser_floor_or_full_audit_qualified,false);
  assert.equal(verifier.g11_claim,'not-passed');
 }
 const sweep=()=>{for(const ref of bound.values()){const actual=readEvidenceMember(root,ref.path);assert.equal(hash(actual),ref.sha256,'physical inventory reference input change '+ref.path);assert.equal(actual.length,ref.bytes);}};
 const check=()=>{sweep();product.assertCurrent();tool.assertCurrent();if(matrixOwner)matrixOwner.assertCurrent();for(const ref of bound.values()){
  const actual=readEvidenceMember(root,ref.path),raw=read(ref.path);assert.ok(Buffer.isBuffer(raw)&&actual.equals(raw),'nonphysical inventory reference input '+ref.path);assert.ok(actual.equals(readEvidenceMember(root,ref.path)),'inventory reference input changed during callback '+ref.path);assert.equal(hash(actual),ref.sha256,'late inventory reference input change '+ref.path);assert.equal(actual.length,ref.bytes);
 }product.assertCurrent();tool.assertCurrent();if(matrixOwner)matrixOwner.assertCurrent();sweep();};
 const verify=candidate=>{assert.ok(Buffer.isBuffer(candidate)&&candidate.equals(result.after),'not the exact inventory metadata after-image');check();return {metadata_only:true,native_or_full_audit_credit:false};};
 const assertCurrent=()=>transaction(root,check),verifyAfter=candidate=>transaction(root,()=>verify(candidate));
 check();
 const source={line,before:Buffer.from(before),after:Buffer.from(result.after),updates:structuredClone(result.updates),
  historical:structuredClone(result.historical),metadata_reference_updates:pin.count,unselected_entries_preserved:1697-pin.count,
  bound:structuredClone([...bound.values()]),assertCurrent,verifyAfter,
  verifier:structuredClone(verifier),canonical_owner_integration_complete:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 sourceChecks.set(source,{check,verify,read,sweepObserved});return source;
}

/** The proposal API keeps its original strict two-image current-ledger gate.
 * Source-only preparation above grants no current-ledger admission: canonical
 * owners must still run their complete real frame/stage validation. */
export function prepareInventoryReferenceMetadata(options={}){
 const {root,read=path=>readEvidenceMember(root,path)}=options;
 return transaction(root,()=>{
  const source=buildInventoryReferenceSourceMetadata({root,read,prebindPaths:[INVENTORY_REFERENCE_LEDGER]}),checks=sourceChecks.get(source);
  const current=checks.read(INVENTORY_REFERENCE_LEDGER);
  assert.ok(current.equals(source.before)||current.equals(source.after),'unregistered current canonical image');
  const ledgerRef={path:INVENTORY_REFERENCE_LEDGER,sha256:hash(current),bytes:current.length};
  const check=()=>{checks.check();const raw=checks.read(INVENTORY_REFERENCE_LEDGER);assert.equal(hash(raw),ledgerRef.sha256,'late canonical ledger proposal change');assert.equal(raw.length,ledgerRef.bytes);};
  const assertCurrent=()=>transaction(root,check);
  const verifyAfter=candidate=>transaction(root,()=>{const result=checks.verify(candidate);check();return result;});
  check();return {...source,current_canonical_state:current.equals(source.before)?'before':'after',
   bound:[...source.bound,ledgerRef],assertCurrent,verifyAfter};
 });
}
