/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Three finite program identities. Historical code is data, never a reader. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/retained-validator-program-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-validator-programs-v1.json',sha256:'e26a11ac20146aa41e5b2a540606cf659c627b5235ae09687a0bb3cea4b2780d',bytes:6968};
const CONTEXT_SUCCESSOR={path:'compatibility/rc/retained-validator-context-successor-4015.json',sha256:'55543fe7a1c7621e516b0ddde32711445b463ba47dcdeda0f2fa51bd33d0e1eb',bytes:2286};
const CONTEXT_CONTINUATION={path:'compatibility/rc/retained-validator-context-successor-149de.json',sha256:'ed55cab51218c54b292a1f33adef1d84edd68941e59b6fdfecd977546a8b9575',bytes:2591};
const METADATA_CONTINUATION={path:'compatibility/rc/retained-validator-context-successor-a0b77.json',sha256:'3b212875082485079b0def1efbb881bf0cbab2de6a4302ea69f3f6c2074d13fa',bytes:2524};
const BUILD_CONTINUATION={path:'compatibility/rc/retained-validator-build-context-successor-3ac.json',sha256:'44477a92abc7e9edc3a91722d846450d3a7c0719ee80c24b80208d87a8f76cf6',bytes:937};
const CONSOLIDATION_CONTINUATION={path:'compatibility/rc/retained-validator-consolidation-source-fd55-v1.json',sha256:'27300dcc8c0fd1f71855de34a35b6727bcda7e6f9980ac33b160db00d6144715',bytes:4098};
const AUTHORITY='1c4ace0fa7a0e7cc4d3e919f415e05ca5e46f3c0',INTERMEDIATE='4e6f608402e99da9fb550bb46040aa68a648440a',CURRENT='1b81670bc1390da94e7928c0fb24f361e1af08e8';
const PATHS=['scripts/upstream-build-scope-evidence.mjs','scripts/upstream-test-consolidation-evidence.mjs','scripts/upstream-bazel-build-scope.mjs'];
const sha=raw=>createHash('sha256').update(raw).digest('hex'),clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
const safePath=path=>{assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;};
const exact=(raw,ref)=>{assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
export function retainedValidatorProgramSource({root=process.cwd(),read}={}){
 root=resolve(root);read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,safePath(path));assert.ok(physical(SELF).equals(image));
 const packetRaw=physical(PACKET.path);exact(packetRaw,PACKET);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-validator-program-identities');
 assert.equal(packet.authority,AUTHORITY);assert.equal(packet.intermediate_commit,INTERMEDIATE);assert.equal(packet.current_commit,CURRENT);
 for(const [key,value]of Object.entries({historical_programs_executed:false,historical_program_bytes_returned_as_current:false,original_source_pins_rewritten:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.deepEqual(packet.programs.map(row=>row.path),PATHS);assert.equal(packet.support.length,14);
 assert.equal(packet.source_input.path,'compatibility/rc/packed-upstream-source-inputs.json');assert.equal(packet.source_input.sha256,'971a35dd5a3f6007b419e333f7972ba676635822a833f5445021aa58445e2b27');
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:8*1024*1024});
 for(const [before,after]of [[AUTHORITY,INTERMEDIATE],[INTERMEDIATE,CURRENT],[CURRENT,'HEAD']])git(['merge-base','--is-ancestor',before,after]);
 const verifyGit=(commit,refs)=>{
  const raw=git(['cat-file','--batch'],Buffer.from(refs.map(ref=>commit+':'+safePath(ref.path)+'\n').join('')));let offset=0;
  for(const ref of refs){const end=raw.indexOf(10,offset);assert.ok(end>=offset);const header=raw.subarray(offset,end).toString().split(' ');offset=end+1;assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<raw.length);exact(raw.subarray(offset,offset+size),ref);offset+=size;assert.equal(raw[offset++],10);}
  assert.equal(offset,raw.length);
 };
 verifyGit(AUTHORITY,[packet.source_input,...packet.programs.map(row=>row.before)]);
 verifyGit(INTERMEDIATE,packet.programs.map(row=>row.intermediate));
 verifyGit(CURRENT,[...packet.programs.map(row=>row.current),...packet.support]);
 // Preserve the original support identities as Git-authenticated history. The
 // physical guard consumes only the two exact, committed successor images.
 const successorRaw=physical(CONTEXT_SUCCESSOR.path);exact(successorRaw,CONTEXT_SUCCESSOR);
 const successor=JSON.parse(successorRaw),parent='011db05858d10a4f9725b4ad8f9fbe148b90ed52',commit='4015b7002997bb18d20d0b2fb2d6a99c223dab3c';
 assert.equal(successor.schema_version,1);assert.equal(successor.role,'retained-validator-retained-context-source-successor');
 assert.equal(successor.source_parent,parent);assert.equal(successor.source_commit,commit);
 for(const [key,value]of Object.entries({source_only:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(successor[key],value,key);
 const successorPaths=['scripts/retained-current-context-identity.mjs','tests/retained_current_context_identity_probe.mjs'];
 assert.deepEqual(successor.transitions.map(row=>row.path),successorPaths);
 assert.equal(git(['rev-parse',commit+'^']).toString().trim(),parent);git(['merge-base','--is-ancestor',CURRENT,parent]);git(['merge-base','--is-ancestor',commit,'HEAD']);
 assert.deepEqual(git(['diff','--name-only','--no-renames',parent,commit]).toString().trim().split('\n'),successorPaths);
 for(const row of successor.transitions)for(const side of ['before','after'])assert.equal(row[side].path,row.path);
 assert.deepEqual(packet.support.find(row=>row.path===successorPaths[0]),successor.transitions[0].before);
 verifyGit(parent,successor.transitions.map(row=>row.before));verifyGit(commit,successor.transitions.map(row=>row.after));
 // Authenticate the complete committed follow-on, including the Python test
 // harness, as Git data. Neither historical body is a current reader.
 const continuationRaw=physical(CONTEXT_CONTINUATION.path);exact(continuationRaw,CONTEXT_CONTINUATION);
 const continuation=JSON.parse(continuationRaw),continuationParent='d443a7671cb7c5bbbd20211e5806a5de61b4af9e',continuationCommit='149de9c37bdf99050e4b5e8b9096ce7892c22ef1';
 const continuationPaths=[...successorPaths,'tests/test_current_reader_source_successors.py'];
 assert.equal(continuation.schema_version,1);assert.equal(continuation.role,'retained-validator-current-context-source-continuation');
 assert.equal(continuation.source_parent,continuationParent);assert.equal(continuation.source_commit,continuationCommit);
 for(const [key,value]of Object.entries({source_only:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(continuation[key],value,key);
 assert.equal(git(['rev-parse',continuationCommit+'^']).toString().trim(),continuationParent);
 git(['merge-base','--is-ancestor',commit,continuationParent]);git(['merge-base','--is-ancestor',continuationCommit,'HEAD']);
 assert.deepEqual(continuation.transitions.map(row=>row.path),continuationPaths);
 assert.deepEqual(git(['diff','--name-status','--no-renames',continuationParent,continuationCommit]).toString().trim().split('\n'),continuationPaths.map(path=>'M\t'+path));
 for(const row of continuation.transitions)for(const side of ['before','after'])assert.equal(row[side].path,row.path);
 for(let i=0;i<successorPaths.length;i++)assert.deepEqual(continuation.transitions[i].before,successor.transitions[i].after);
 verifyGit(continuationParent,continuation.transitions.map(row=>row.before));verifyGit(continuationCommit,continuation.transitions.map(row=>row.after));
 // Authenticate the committed metadata context source and its exact test cut.
 const metadataRaw=physical(METADATA_CONTINUATION.path);exact(metadataRaw,METADATA_CONTINUATION);const metadata=JSON.parse(metadataRaw),metadataParent='42d16b15d9e852a9c959506f67046cf531faa6f4',metadataCommit='a0b778d5b3268bb6cb218f0487b7ce5e28d6ac1f';
 assert.equal(metadata.schema_version,1);assert.equal(metadata.role,'retained-validator-metadata-context-source-continuation');assert.equal(metadata.source_parent,metadataParent);assert.equal(metadata.source_commit,metadataCommit);for(const [key,value]of Object.entries({source_only:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(metadata[key],value,key);
 assert.equal(git(['rev-list','--parents','-n','1',metadataCommit]).toString().trim(),metadataCommit+' '+metadataParent);git(['merge-base','--is-ancestor',continuationCommit,metadataParent]);git(['merge-base','--is-ancestor',metadataCommit,'HEAD']);assert.deepEqual(metadata.transitions.map(row=>row.path),continuationPaths);assert.deepEqual(git(['diff','--name-status','--no-renames',metadataParent,metadataCommit]).toString().trim().split('\n'),continuationPaths.map(path=>'M\t'+path));for(let i=0;i<continuationPaths.length;i++){const row=metadata.transitions[i];assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);assert.deepEqual(row.before,continuation.transitions[i].after);}verifyGit(metadataParent,metadata.transitions.map(row=>row.before));verifyGit(metadataCommit,metadata.transitions.map(row=>row.after));
 const buildRaw=physical(BUILD_CONTINUATION.path);exact(buildRaw,BUILD_CONTINUATION);const build=JSON.parse(buildRaw),buildParent='6f134e962163d84257468e6539f1f2e4c9f539e2',buildCommit='3ac10c5438c5636504f7dd909bf7c50387c649d7';assert.equal(build.schema_version,1);assert.equal(build.role,'retained-validator-build-context-source-continuation');assert.equal(build.source_parent,buildParent);assert.equal(build.source_commit,buildCommit);for(const [key,value]of Object.entries({source_only:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(build[key],value,key);assert.equal(git(['rev-list','--parents','-n','1',buildCommit]).toString().trim(),buildCommit+' '+buildParent);git(['merge-base','--is-ancestor',buildCommit,'HEAD']);assert.equal(build.transition.path,'scripts/retained-current-build-context.mjs');assert.deepEqual(build.transition.before,packet.support.find(ref=>ref.path===build.transition.path));assert.equal(build.transition.after.path,build.transition.path);verifyGit(buildParent,[build.transition.before]);verifyGit(buildCommit,[build.transition.after]);
 const consolidationRaw=physical(CONSOLIDATION_CONTINUATION.path);exact(consolidationRaw,CONSOLIDATION_CONTINUATION);const consolidation=JSON.parse(consolidationRaw),consolidationParent='e74f9b96f0ea8b25d3455d7447602d32bdbd838d',consolidationCommit='fd55b5545d229783e9a95d1a6fbac55510674685';assert.equal(consolidation.schema_version,1);assert.equal(consolidation.role,'retained-validator-consolidation-source-continuation');assert.equal(consolidation.source_parent,consolidationParent);assert.equal(consolidation.source_commit,consolidationCommit);for(const [key,value]of Object.entries({source_only:true,historical_programs_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(consolidation[key],value,key);assert.equal(git(['rev-list','--parents','-n','1',consolidationCommit]).toString().trim(),consolidationCommit+' '+consolidationParent);git(['merge-base','--is-ancestor',consolidationCommit,'HEAD']);assert.deepEqual(consolidation.transitions.map(row=>row.path),['scripts/upstream-test-consolidation-evidence.mjs','scripts/retained-current-consolidation-context.mjs']);assert.deepEqual(consolidation.transitions[0].before,packet.programs[1].current);assert.deepEqual(consolidation.transitions[1].before,packet.support.find(ref=>ref.path===consolidation.transitions[1].path));for(const row of consolidation.transitions){assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);}verifyGit(consolidationParent,consolidation.transitions.map(row=>row.before));verifyGit(consolidationCommit,consolidation.transitions.map(row=>row.after));assert.deepEqual(consolidation.support.map(row=>row.reference.path),['scripts/retained-f10-build-source-context.mjs','compatibility/rc/retained-f10-build-source-context-696.json','scripts/harness-animation-preparation-evidence.mjs','compatibility/rc/harness-animation-preparation-owned-mode-2c51.json','scripts/retained-f10-inventory-source-context.mjs','compatibility/rc/retained-f10-inventory-source-context-ce9.json','compatibility/rc/retained-main-consolidation-source-continuation-3ac.json']);assert.deepEqual(consolidation.support.map(row=>row.commit),[...Array(4).fill(buildCommit),...Array(3).fill(consolidationCommit)]);for(const row of consolidation.support)verifyGit(row.commit,[row.reference]);
 const bound=new Map(),identities=new Map();
 const add=ref=>{const normalized=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,normalized);else bound.set(ref.path,normalized);};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);add(packet.source_input);
 const input=JSON.parse(physical(packet.source_input.path));exact(physical(packet.source_input.path),packet.source_input);assert.equal(input.line,'main');
 for(const row of packet.programs){
  for(const role of ['before','intermediate','current'])assert.equal(row[role].path,row.path);
  const old=input.validation_code_subjects.filter(ref=>ref.path===row.path);assert.equal(old.length,1);assert.equal(old[0].sha256,row.before.sha256);
  const known=new Map();for(const ref of [row.before,row.intermediate,row.current,...(row.path===consolidation.transitions[0].path?[consolidation.transitions[0].after]:[])]){const prior=known.get(ref.sha256);if(prior)assert.deepEqual(prior,clean(ref));else known.set(ref.sha256,clean(ref));}
  const current=row.path===consolidation.transitions[0].path?consolidation.transitions[0].after:row.current;identities.set(row.path,{known,current:clean(current)});add(current);
 }
 for(const ref of packet.support)add(ref.path===successorPaths[0]?metadata.transitions[0].after:ref.path===build.transition.path?build.transition.after:ref.path===consolidation.transitions[1].path?consolidation.transitions[1].after:ref);
 add(CONTEXT_SUCCESSOR);add(CONTEXT_CONTINUATION);add(METADATA_CONTINUATION);add(BUILD_CONTINUATION);add(CONSOLIDATION_CONTINUATION);for(const row of consolidation.support)add(row.reference);for(const row of metadata.transitions.slice(1))add(row.after);
 let checking=false,reentered=false;
 const assertCurrent=()=>{
  if(checking){reentered=true;throw new Error('retained validator program reentry');}
  checking=true;reentered=false;
  try{
  for(const ref of bound.values()){
   const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);
   assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical retained validator program '+ref.path);
   assert.ok(raw.equals(physical(ref.path)),'retained validator input changed during callback '+ref.path);
  }
  // No callback may leave an earlier source or receipt changed at settlement.
  for(const ref of bound.values())exact(physical(ref.path),ref);
  assert.equal(reentered,false,'retained validator program reentry');
  }finally{checking=false;}
 };
 const qualifyMetadata=value=>{
  assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
  const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));
  const hasBytes=Object.hasOwn(fields,'bytes');assert.deepEqual(keys.sort(),hasBytes?['bytes','path','sha256']:['path','sha256']);
  for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const path=safePath(fields.path.value);assert.match(fields.sha256.value,/^[a-f0-9]{64}$/);
  const row=identities.get(path);if(!row)return null;const known=row.known.get(fields.sha256.value);assert.ok(known,'unknown retained validator identity');if(hasBytes)assert.equal(fields.bytes.value,known.bytes);
  return {path:row.current.path,sha256:row.current.sha256,...(hasBytes?{bytes:row.current.bytes}:{})};
 };
 assertCurrent();return Object.freeze({
  get bound(){return structuredClone([...bound.values()]);},get transitions(){return structuredClone(packet.programs.map(row=>({path:row.path,before:clean(row.before),intermediate:clean(row.intermediate),current:clean(row.path===consolidation.transitions[0].path?consolidation.transitions[0].after:row.current)})));},
  // Pure metadata selection only. The consumer must guard before and after
  // actual current reads. No historical code body/read capability is exposed.
  qualifyMetadata,assertCurrent,source_judgments_changed:0,current_read_route_returned:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed',
 });
}
