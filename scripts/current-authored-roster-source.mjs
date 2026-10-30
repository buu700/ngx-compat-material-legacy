/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Two authenticated historical roster images; all source and program reads stay current. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from './authored-current-use-inventory.mjs';
import {authoredUseInventory,authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
const SELF='scripts/current-authored-roster-source.mjs',INPUTS='compatibility/rc/current-roster-source-epoch-inputs.json';
const PINS={'21.x':'be3d14e06d021555774731308a8a7d416c832ff7f581da938753ea33599fe75f',main:'e2d4a41f20faffc9fb496553f0d263ed3750bc16295ef7361ecf4ebf0077f917'};
const PATHS=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'];
const image=readFileSync(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]),readers=new WeakMap(),originals=new Map();
/** Only readers registered below unwrap; arbitrary callbacks cannot claim this identity. */
export function currentAuthoredRosterRawRead({root=process.cwd(),read}={}){
 root=resolve(root);while(readers.has(read)){const prior=readers.get(read);assert.equal(prior.root,root,'roster reader belongs to another checkout');read=prior.raw;}return read;
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);assert.ok(PATHS.includes(path));const id=JSON.stringify([root,parent,path]);
 if(!originals.has(id)){const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const n of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[n];originals.set(id,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:4*1024*1024}));}return Buffer.from(originals.get(id));
}
export function currentAuthoredRosterSourceSubject({root=process.cwd(),read}={}){
 root=resolve(root);read??=path=>readHistoricalContractRepairOwnerMember(root,path);read=currentAuthoredRosterRawRead({root,read});const rawCurrent=read,bound=new Map(),cache=new Map();
 const physical=path=>readHistoricalContractRepairOwnerMember(root,path);
 const member=(path,expected)=>{let bytes=cache.get(path);if(!bytes){bytes=physical(path);const provided=rawCurrent(path);assert.ok(Buffer.isBuffer(provided)&&provided.equals(bytes),'nonphysical current roster input '+path);cache.set(path,bytes);bound.set(path,{path,sha256:hash(bytes),bytes:bytes.length});}const ref=bound.get(path);if(expected){assert.equal(ref.sha256,expected.sha256,'changed current roster input '+path);if(expected.bytes!==undefined)assert.equal(ref.bytes,expected.bytes);}return bytes;};
 const version=JSON.parse(member('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);const data=JSON.parse(member(INPUTS,{sha256:PINS[line]}));assert.equal(data.schema_version,1);assert.equal(data.line,line);assert.equal(data.source_scope_only,true);assert.equal(data.reader_implementation_qualified,false);assert.equal(data.full_current_owner_or_native_packed_browser_floor_or_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.deepEqual(data.before_rosters.map(r=>r.path),PATHS);assert.deepEqual(data.after_rosters.map(r=>r.path),PATHS);assert.ok(member(SELF).equals(image),'loaded roster subject differs from actual file');assert.equal(process.versions.node,JSON.parse(member('toolchain-lock.json')).repository.node);
 const before=new Map(),beforeDocs=[],afterDocs=[];
 for(let i=0;i<PATHS.length;i++){const old=original(root,data.before_source_parent,PATHS[i]),ref=data.before_rosters[i];assert.equal(hash(old),ref.sha256);assert.equal(old.length,ref.bytes);before.set(PATHS[i],old);beforeDocs.push(JSON.parse(old));afterDocs.push(JSON.parse(member(PATHS[i],data.after_rosters[i])));}
 const evidence=data.current_evidence.map(ref=>JSON.parse(member(ref.path,ref)));assert.equal(evidence[0].line,line);assert.equal(evidence[0].status,'reviewed');assert.equal(evidence[0].reviews.length,176);
 // Current proof dependencies are read as current bytes. Historical acquisition
 // snapshots remain inside those immutable proof documents, never a public read.
 for(const proof of evidence.slice(2)){assert.equal(proof.line,line);for(const ref of proof.source_bindings)member(ref.path,ref);}
 const current=scanCurrentAuthoredUses({root,readSource:path=>member(path)}),[frozen,additional]=afterDocs,[oldFrozen,oldAdditional]=beforeDocs;
 const seedPath=frozen.frozen_roster.path,seedRaw=member(seedPath,frozen.frozen_roster),seed=JSON.parse(seedRaw);assert.equal(seed.symbol_uses.length,1736);
 assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldAdditional.symbol_uses.length,315);assert.equal(frozen.symbol_uses.length,1736);assert.equal(additional.symbol_uses.length,317);
 assert.deepEqual(frozen.symbol_uses.map(key),oldFrozen.symbol_uses.map(key));assert.deepEqual(additional.symbol_uses.slice(0,315).map(key),oldAdditional.symbol_uses.map(key));assert.equal(new Set(additional.symbol_uses.map(key)).size,317);assert.deepEqual(additional.retained_removed_additional_uses,oldAdditional.retained_removed_additional_uses);assert.equal(additional.retained_removed_additional_uses.length,2);
 assert.equal(current.source_files.length,532);assert.equal(current.symbol_uses.length,1965);assert.equal(additional.current_uses,current.symbol_uses.length);assert.equal(additional.current_source_files,current.source_files.length);assert.equal(additional.current_source_population_sha256,current.source_population_sha256);
 const seedKeys=new Set(seed.symbol_uses.map(key)),live=current.symbol_uses.filter(r=>!seedKeys.has(key(r))),actual=new Map(live.map(r=>[key(r),r])),retired=new Map(additional.retained_removed_additional_uses.map(r=>[key(r),r]));assert.equal(live.length,315);assert.equal(additional.live_symbol_use_count,315);assert.equal(additional.symbol_use_count,317);
 for(const row of additional.symbol_uses){const now=actual.get(key(row));if(now){assert.equal(row.candidate_source_sha256,now.candidate_source_sha256);assert.deepEqual(row.occurrences,now.occurrences);}else{assert.ok(retired.has(key(row)));assert.deepEqual(row.occurrences,[]);assert.equal(row.candidate_source_sha256,hash(member('projects/ngx-material-legacy/'+row.file)));}}
 const expected=new Map(oldAdditional.symbol_uses.map(r=>[key(r),r]));for(const row of live)expected.set(key(row),row);const fi=authoredUseInventory(seed.symbol_uses,frozen),ai=authoredUseInventory([...expected.values()],additional);assert.ok(fi.complete&&ai.complete);assert.equal(fi.open,0);assert.equal(ai.open,0);
 const fe=authoredUseReviewEvidence(frozen,line,p=>member(p),hash),ae=authoredUseReviewEvidence(additional,line,p=>member(p),hash);assert.equal(fe.reviewed,1736);assert.equal(ae.reviewed,317);assert.equal(fe.insufficient,0);assert.equal(ae.insufficient,0);
 const assertCurrent=()=>{for(const ref of bound.values()){const actual=physical(ref.path),provided=rawCurrent(ref.path);assert.ok(Buffer.isBuffer(provided)&&provided.equals(actual),'nonphysical or late current roster input '+ref.path);assert.equal(hash(actual),ref.sha256,'late current roster input '+ref.path);assert.equal(actual.length,ref.bytes);}};
 const side=(ref,target)=>{const index=PATHS.indexOf(ref.path);if(index<0)return null;const old=data.before_rosters[index],current=data.after_rosters[index],selected=ref.sha256===old.sha256?old:ref.sha256===current.sha256?current:null;assert.ok(selected,'unknown roster metadata reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,selected.bytes);assertCurrent();const to=target==='before'?old:current;return {...ref,sha256:to.sha256,...(ref.bytes===undefined?{}:{bytes:to.bytes})};};
 const metadataRead=path=>{if(!before.has(path))return rawCurrent(path);assertCurrent();return Buffer.from(before.get(path));};readers.set(metadataRead,{root,raw:rawCurrent});assertCurrent();
 return {root,line,metadataRead,raw:rawCurrent,assertCurrent,qualify:ref=>side(ref,'after'),historicalReference:ref=>side(ref,'before'),before:structuredClone(data.before_rosters),after:structuredClone(data.after_rosters),bound:structuredClone([...bound.values()]),current_graph:{files:532,uses:1965,frozen:1736,additional_obligations:317,live_additional_uses:315,retirements:2},historical_metadata_paths:[...PATHS],product_or_program_before_images_exposed:false,current_source_read_uses_historical_projection:false,full_shipped_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
