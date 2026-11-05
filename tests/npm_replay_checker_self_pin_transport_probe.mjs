/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual public source guard on disposable Git DATA fixtures, no historical programs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {historicalFrameMembers,verifyHistoricalCurrentSubjects} from '../scripts/historical-source-replay.mjs';
const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),start=performance.now();
const checker='scripts/check-dependency-eligibility.py',profilePath='compatibility/rc/parent-private-npm-current-profile-inputs-v2.json',document='compatibility/rc/historical-source-replay.md';
const begin='<!-- npm-current-profile-checker-self-pin-v1 -->',end='<!-- /npm-current-profile-checker-self-pin-v1 -->';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),json=value=>JSON.stringify(value,null,2)+'\n';
const env={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const git=(root,...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','-c','core.hooksPath=/dev/null','-c','user.name=fixture','-c','user.email=fixture@invalid',...args],{cwd:root,env,maxBuffer:16*1024*1024});
const read=(root,path)=>readFileSync(join(root,path));
const write=(root,path,raw)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),raw);};
const commit=(root,label)=>{git(root,'add','--all');git(root,'commit','-q','-m',label);return git(root,'rev-parse','HEAD').toString().trim();};
const data=JSON.parse(read(sourceRoot,'compatibility/rc/historical-source-replay-inputs.json')),line=data.line;
const base=mkdtempSync(join(tmpdir(),'ngx-checker-seal-fixture-')),cases=[];
const sourceRefs=['scripts/historical-source-replay.mjs','compatibility/rc/historical-source-replay.md','tests/historical_source_replay_probe.mjs','tests/historical_replay_current_frame_probe.mjs'].map(path=>({path,sha256:hash(read(sourceRoot,path)),bytes:read(sourceRoot,path).length}));
try{
 git(base,'init','-q');const common=resolve(sourceRoot,git(sourceRoot,'rev-parse','--git-common-dir').toString().trim());write(base,'.git/objects/info/alternates',join(common,'objects')+'\n');
 const older=JSON.parse(read(sourceRoot,'compatibility/rc/older-audit-history-inputs.json'));
 const files=new Set([...data.current_head_tooling_paths,...data.entries.map(row=>row.probe),...data.wrapper_edits.map(row=>row.path),checker,'compatibility/rc/older-audit-history-inputs.json',older.prior.path,'compatibility/rc/historical-consumer-wrapper-successor.json']);
 for(const path of files)write(base,path,read(sourceRoot,path));
 const before=read(base,checker).toString().replace(/^NPM_CURRENT_PRIVATE_PROFILE_PATH = "[^"]+"$/m,'NPM_CURRENT_PRIVATE_PROFILE_PATH = "'+profilePath+'"');write(base,checker,before);
 const plainDocument='Disposable checker seal fixture documentation.\n';write(base,document,plainDocument);
 const A=commit(base,'source frame A');write(base,'fixture-source-checkpoint.txt','committed code checkpoint B\n');const B=commit(base,'code checkpoint B');
 const historical_artifacts={'private-profile-source-manifests.json':'08f1feb3a2186f6bb0bd9e36af7462e2c752c7a344632b37c44e8bb194b0b3a4','private-profile-remaining-evidence.json':'f944d76dfb5ea39bf4f7743ea377c5112218efcef4c42af465eb59437bcb82fb','private-profile-remaining-result.json':'54bd6cf921745b848f05fb1d2eaea6339b870bf53ce431e9e5eaad606a390dc0'};
 const branch=()=>({source_parent:B,source_files:[],support_files:[],input_files:[],support_discovery:['tests','compatibility/handoff/codex-closeout/tools'].map(root=>({root,suffixes:['.cjs','.js','.mjs','.py','.sh','.ts'],paths:[]}))});
 const profile={schema_version:1,scope:'maintained-tool-owned-npm-invocations',historical_artifacts,lines:{'21.x':branch(),main:branch()}};
 write(base,profilePath,json(profile));const C=commit(base,'immutable profile DATA C');
 const descriptor={schema_version:1,line,profile:{path:profilePath,sha256:hash(read(base,profilePath)),bytes:read(base,profilePath).length,commit:C}};
 const setDescriptor=(root,value,extra='')=>write(root,document,plainDocument+'\n'+begin+'\n```json\n'+JSON.stringify(value,null,2)+'\n```\n'+end+'\n'+extra);
 const setChecker=root=>write(root,checker,before.replace(/^NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "[a-f0-9]{64}"$/m,'NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "'+hash(read(root,profilePath))+'"'));
 setChecker(base);setDescriptor(base,descriptor);const D=commit(base,'exact checker seal and HEAD descriptor D');
 const listing=git(base,'ls-tree','-rz',A);data.current_frame={commit:A,tree:git(base,'rev-parse',A+'^{tree}').toString().trim(),tree_listing_sha256:hash(listing),members:listing.toString().split('\0').filter(Boolean).length};
 const members=historicalFrameMembers(base,data.current_frame),verify=(root,readMember)=>verifyHistoricalCurrentSubjects({root,data,members,readMember,productPaths:[]});
 const clone=()=>{const root=mkdtempSync(join(tmpdir(),'ngx-checker-seal-case-'));for(const path of [...files,profilePath,'fixture-source-checkpoint.txt'])write(root,path,read(base,path));git(root,'init','-q');write(root,'.git/objects/info/alternates',join(base,'.git/objects')+'\n');git(root,'update-ref','HEAD',D);git(root,'read-tree',D);return root;};
 const observe=(id,setup,expected)=>{const root=clone();try{setup?.(root);let error=null;try{verify(root);}catch(e){error=String(e.message);}if(expected){assert.ok(error,id+' unexpectedly accepted');assert.match(error,expected,id);}else assert.equal(error,null,id);cases.push({id,rejected:!!error,error});}finally{rmSync(root,{recursive:true,force:true});}};
 observe('complete-exact-checker-afterimage-accepted',null,null);
 observe('unchanged-original-checker-keeps-ordinary-route-without-descriptor',root=>{write(root,checker,before);write(root,document,plainDocument);commit(root,'original checker with no descriptor');},null);
 observe('changed-checker-with-missing-descriptor-rejects',root=>{write(root,document,plainDocument);commit(root,'missing descriptor');},/missing or duplicate checker seal descriptor/);
 observe('committed-unrelated-checker-body-byte-rejects',root=>{write(root,checker,read(root,checker)+'\n# unrelated behavior\n');commit(root,'unrelated checker body');},/exceeds exact self-pin/);
 observe('checker-profile-filename-change-rejects',root=>{write(root,checker,read(root,checker).toString().replace(profilePath,'compatibility/rc/unrelated.json'));commit(root,'different profile path');},/exceeds exact self-pin/);
 observe('second-checker-assignment-rejects',root=>{write(root,checker,read(root,checker)+'\nNPM_CURRENT_PRIVATE_PROFILE_SHA256 = "'+'a'.repeat(64)+'"\n');commit(root,'extra assignment');},/exceeds exact self-pin/);
 observe('ordinary-original-program-change-has-no-transport-authority',root=>{const path=data.entries[0].probe;write(root,path,read(root,path)+'\n// unrelated original program change\n');commit(root,'ordinary source change');},/current historical-replay subject changed/);
 observe('uncommitted-descriptor-document-rejects',root=>write(root,document,read(root,document)+'\nchanged after HEAD\n'),/document differs from HEAD/);
 for(const[id,change,pattern]of [
  ['descriptor-wrong-line',x=>{x.line=line==='21.x'?'main':'21.x';},/foreign checker seal line/],
  ['descriptor-wrong-schema',x=>{x.schema_version=2;},/strictly equal/],
  ['descriptor-wrong-field-shape',x=>{x.unreviewed=true;},/metadata shape/],
  ['descriptor-wrong-profile-path',x=>{x.profile.path='compatibility/rc/unrelated.json';},/strictly equal/],
  ['descriptor-wrong-profile-sha',x=>{x.profile.sha256='a'.repeat(64);},/profile SHA changed/],
  ['descriptor-wrong-profile-size',x=>{x.profile.bytes++;},/strictly equal/],
  ['descriptor-profile-commit-without-file',x=>{x.profile.commit=B;},/strictly equal/]
 ])observe(id,root=>{const x=structuredClone(descriptor);change(x);setDescriptor(root,x);commit(root,id);},pattern);
 observe('duplicate-descriptor-marker-rejects',root=>{setDescriptor(root,descriptor,begin+'\n');commit(root,'duplicate marker');},/missing or duplicate checker seal descriptor/);
 observe('duplicate-descriptor-JSON-field-rejects',root=>{setDescriptor(root,descriptor);write(root,document,plainDocument+'\n'+begin+'\n```json\n'+JSON.stringify(descriptor,null,2).replace('"schema_version": 1,','"schema_version": 1,\n  "schema_version": 1,')+'\n```\n'+end+'\n');commit(root,'duplicate JSON key');},/canonical JSON/);
 observe('profile-commit-not-ancestor-of-HEAD-rejects',root=>{const sibling=git(root,'commit-tree',git(root,'rev-parse',D+'^{tree}').toString().trim(),'-p',B,'-m','sibling profile commit').toString().trim();const x=structuredClone(descriptor);x.profile.commit=sibling;setDescriptor(root,x);commit(root,'nonancestor descriptor');},/merge-base/);
 const mutateProfile=(root,change,stored=true)=>{const x=structuredClone(profile);change(x);write(root,profilePath,json(x));const next=stored?commit(root,'changed profile DATA'):C;setChecker(root);const d={schema_version:1,line,profile:{path:profilePath,sha256:hash(read(root,profilePath)),bytes:read(root,profilePath).length,commit:next}};setDescriptor(root,d);commit(root,'changed profile descriptor and checker');};
 for(const[id,change,pattern]of [
  ['profile-wrong-schema',x=>{x.schema_version=2;},/strictly equal/],
  ['profile-wrong-scope',x=>{x.scope='arbitrary';},/strictly equal/],
  ['profile-wrong-historical-identities',x=>{x.historical_artifacts['private-profile-remaining-result.json']='a'.repeat(64);},/deep-equal/],
  ['profile-missing-other-line',x=>{delete x.lines[line==='21.x'?'main':'21.x'];},/deep-equal/],
  ['profile-source-parent-not-descendant-of-frame',x=>{x.lines[line].source_parent=data.entries[0].frame.commit;},/merge-base/],
  ['descriptor-document-in-other-line-input-population',x=>{x.lines[line==='21.x'?'main':'21.x'].input_files=[{path:document}];},/document cannot be bound/],
  ['descriptor-document-in-support-population',x=>{x.lines[line].support_files=[{path:document}];},/document cannot be bound/],
  ['descriptor-document-in-primary-population',x=>{x.lines[line].source_files=[{path:document}];},/document cannot be bound/],
  ['descriptor-document-in-discovery-paths',x=>{x.lines[line].support_discovery[0].paths=[document];},/strictly unequal/],
  ['broadened-discovery-root',x=>{x.lines[line].support_discovery[0].root='compatibility/rc';},/deep-equal/]
 ])observe(id,root=>mutateProfile(root,change),pattern);
 observe('physical-profile-does-not-equal-named-Git-DATA',root=>mutateProfile(root,x=>{x.note='not in named Git C';},false),/differs from immutable Git DATA/);
 for(const target of [checker,profilePath,document]){
  const root=clone();try{let fired=false,probeReads=0;const finalProbe=data.entries.at(-1).probe;assert.throws(()=>verify(root,path=>{const bytes=read(root,path);if(path===finalProbe&&++probeReads===2&&!fired){write(root,target,read(root,target)+'\nlate physical mutation\n');fired=true;}return bytes;}),/late physical checker seal member/);assert.ok(fired);write(root,target,read(base,target));verify(root);cases.push({id:'final-original-probe-callback-mutation-rejects:'+target,rejected:true,restoration_passed:true});}finally{rmSync(root,{recursive:true,force:true});}
 }
 {
  const root=clone();try{let fired=false;assert.throws(()=>verify(root,path=>{const bytes=read(root,path);if(path===document&&!fired){write(root,document,bytes+'\ntransient descriptor drift\n');fired=true;}return bytes;}),/changed during callback/);assert.ok(fired);write(root,document,read(base,document));verify(root);cases.push({id:'immediate-document-physical-reread-rejects-transient-callback-drift',rejected:true,restoration_passed:true});}finally{rmSync(root,{recursive:true,force:true});}
 }
 {
  const root=clone();try{let fired=false,probeReads=0;assert.throws(()=>verify(root,path=>{const bytes=read(root,path);if(path===data.entries.at(-1).probe&&++probeReads===2&&!fired){write(root,'late-HEAD-fixture.txt','late Git HEAD change\n');commit(root,'late HEAD change');fired=true;}return bytes;}),/HEAD changed during callbacks/);assert.ok(fired);cases.push({id:'final-callback-cannot-change-authenticated-document-HEAD',rejected:true});}finally{rmSync(root,{recursive:true,force:true});}
 }
 for(const getter of [false,true]){
  const root=clone();try{let reads=0;assert.throws(()=>verify(root,path=>{if(path!==document)return read(root,path);const wrong=Buffer.from('forged descriptor');if(getter)Object.defineProperty(wrong,'equals',{get(){reads++;return ()=>true;}});else wrong.equals=()=>true;return wrong;}),/nonphysical checker seal member/);assert.equal(reads,0);cases.push({id:getter?'forged-Buffer-equals-getter-rejects-without-read':'forged-Buffer-own-equals-rejects',rejected:true,equals_getter_reads:reads});}finally{rmSync(root,{recursive:true,force:true});}
 }
 const report={schema_version:1,status:'finite-checker-self-pin-transport-controls-pass',line,node:process.version,controls:cases.length,cases,seconds:(performance.now()-start)/1000,original_wrapper_metadata_and26program_bytes_used_as_DATA:true,disposable_Git_fixture_product_members:0,fixture_document_namespace:'independent-literal-before-frame',source_document_contains_seal_descriptor:read(sourceRoot,document).includes(Buffer.from(begin)),production_registry_pin_authentication_exercised:false,current_npm_semantic_profile_qualification_exercised:false,full_predecessor_owner_or_historical_program_executed:false,source_mutations:false,network_build_compiler_executed:false,source_inputs:sourceRefs,current_native_packed_floor_audit_qualified:false,g11_claim:'not-passed'};
 for(const ref of sourceRefs){assert.equal(hash(read(sourceRoot,ref.path)),ref.sha256,'source changed while fixture ran');}
 if(process.argv[2]){assert.match(process.argv[2],/^compatibility\/rc\/parent-npm-replay-seal-transport-controls-(?:21|main)-v[0-9]+\.json$/);writeFileSync(join(sourceRoot,process.argv[2]),json(report),{flag:'wx'});}
 console.log(json(report));
}finally{rmSync(base,{recursive:true,force:true});}
