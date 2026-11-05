/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact historical source graphs with a separate mandatory current coherence guard. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {delimiter,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const HISTORICAL_REPLAY_INPUTS='compatibility/rc/historical-source-replay-inputs.json';
export const SOURCE_INTEGRATION_HISTORY_INPUTS='compatibility/rc/source-integration-history-inputs.json';
const integrationPins={"main":"226f7f2ff77ba23eed0668865665e27eca455f19966f70efae08382f6a02c1e7","21.x":"980b384a361257883208433a8b6dc41590678aaa7791015474d41e62979c1084"};
const integrationSpecs=[
 ['snack-source-integration','snack_dom_source_context','NGX_SNACK_CONTEXT_DIAGNOSTIC',360000],
 ['menu-panel-integration','menu_panel_source_integration','NGX_MENU_PANEL_INTEGRATION_DIAGNOSTIC',180000],
 ['menu-caller-integration','menu_caller_integration','NGX_MENU_CALLER_INTEGRATION_DIAGNOSTIC',120000],
 ['a11y-caller-integration','a11y_caller_integration','NGX_A11Y_CALLER_INTEGRATION_DIAGNOSTIC',120000],
 ['configuration-caller-integration','component_config_caller_integration','NGX_COMPONENT_CONFIG_INTEGRATION_DIAGNOSTIC',120000],
 ['dialog-configuration-integration','dialog_caller_config_integration',null,180000],
 ['dialog-default-integration','dialog_caller_service_default_integration',null,180000],
 ['dialog-owned-integration','dialog_caller_owned_contract_integration',null,180000],
];
export const SOURCE_INTEGRATION_HISTORY_IDS=Object.freeze(integrationSpecs.map(row=>row[0]));
export const SOURCE_INTEGRATION_POLICY_HISTORY_ID='source-integration-history-controls';
const policyFrames={
 main:{commit:'280c1e8016725e234c7c272154a863fa0e96681f',tree:'ce2b19fa9db2221f886cd9cf5f2fef3293720ac2',tree_listing_sha256:'2af2563c232874fa327e79c9c4b6dd56b4d2e91e32de7327a02f79e83f046a55',members:10569},
 '21.x':{commit:'ec3899a44639ff5f5453c1e7efb5acfd3d24be79',tree:'ad6d74ddf912e4af46bcb6db4797dd5ffdd0cb3a',tree_listing_sha256:'e665da55d9487188c57c2bb6c61f788099ed88c4217143dfd600f0c7708a593d',members:9212},
};
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pins={main:'61c36f8cdeb5a16efb61004af8a87c1b3a7ada872bcc84bc32487f1d90c14110','21.x':'a30f461ff268842d13512bf35228a074c7c4adc658b7ab66ad00f102613d7e8e'};
const ids=['historical-menu-import','historical-menu-import-admission','menu-exit-context','selection-comparator-source','native-admission-source','tab-lifecycle-source',
 'native-individual-source','native-individual-admission','spec-fixture-context',
 'small-spec-source','followup-spec-source','peer-spec-source','control-case-context',
 'control-test-source','render-setup-source','theme-date-source','test-environment-zone-source','standalone-environment-source',
 'stability-chip-method','stability-chip-context','wide-fixture-adapter-context','historical-native-admission','test-consolidation-source','deferred-control-upstream-source','native-date-context-source','recorded-execution-source-context'];
// These six versioned replay-tool members are checked against the caller HEAD,
// separately from the qualified product/review context. Comparing the registry
// and its own verifier to that older context would require self-referential hashes.
// They remain mandatory clean Git subjects; no product, receipt or original probe
// is admitted through this tooling-only route.
const toolingPaths=['scripts/historical-source-replay.mjs','scripts/run-historical-source-probe.mjs',HISTORICAL_REPLAY_INPUTS,
 'tests/historical_source_replay_probe.mjs','tests/test_historical_source_replay.py','compatibility/rc/historical-source-replay.md'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const successorPaths=['tests/test_native_date_source_context.py','tests/test_recorded_execution_source_context.py'];
const olderRegistry='compatibility/rc/older-audit-history-inputs.json';
const blobHash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function environment(){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
 return env;
}
const gitArgs=args=>['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args];
// Cache only reads named by a full immutable commit ID. HEAD/ref resolution and
// every current-file read/hash remain fresh; callers receive independent bytes.
const immutableGitReads=new Map();
const git=(root,args,options={})=>{
 const immutable=Object.keys(options).length===0&&(
  args.length===2&&args[0]==='show'&&/^[0-9a-f]{40}:[^\0]+$/.test(args[1])||
  args.length===3&&args[0]==='ls-tree'&&args[1]==='-rz'&&/^[0-9a-f]{40}$/.test(args[2]));
 const key=immutable?JSON.stringify([root,args]):null;
 if(key&&immutableGitReads.has(key))return Buffer.from(immutableGitReads.get(key));
 const bytes=execFileSync('git',gitArgs(args),{cwd:root,env:environment(),maxBuffer:16*1024*1024,...options});
 if(key)immutableGitReads.set(key,Buffer.from(bytes));
 return bytes;
};
function relativePath(path){assert.equal(typeof path,'string');assert.ok(!path.includes('\\')&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&part!=='.git'),'unsafe historical member path');return path;}
export function historicalReplayInputs({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),bytes=read(HISTORICAL_REPLAY_INPUTS),data=JSON.parse(bytes);
 assert.ok(Object.hasOwn(pins,data.line),'unregistered historical line');assert.equal(hash(bytes),pins[data.line],'historical replay input changed');
 assert.equal(data.schema_version,12);assert.deepEqual(data.entries.map(row=>row.id),ids);assert.equal(new Set(data.entries.map(row=>row.probe)).size,26);
 assert.deepEqual(data.current_wrapper_successors.map(row=>row.path),successorPaths);
 assert.deepEqual(data.mutable_progress_paths,['compatibility/rc/remaining-native-admission-worksheet.json','compatibility/rc/session-handoff.json']);
 assert.deepEqual(data.current_head_tooling_paths,toolingPaths);
 for(const entry of data.entries)assert.equal(entry.report_option,['tab-lifecycle-source','native-individual-source','native-individual-admission','spec-fixture-context','small-spec-source','followup-spec-source','peer-spec-source','control-case-context','control-test-source','render-setup-source','theme-date-source','test-environment-zone-source','standalone-environment-source','stability-chip-method','stability-chip-context'].includes(entry.id)?'--out':undefined,'historical report invocation changed');
 for(const entry of data.entries)assert.equal(entry.report_source,entry.id==='wide-fixture-adapter-context'?'stdout-json':undefined,'historical report channel changed');
 assert.equal(data.wrapper_edits.length,23);assert.equal(new Set(data.wrapper_edits.map(row=>row.path)).size,23);
 assert.match(data.wrapper_reference_commit,/^[0-9a-f]{40}$/);for(const wrapper of data.wrapper_edits)if(wrapper.reference_commit!==undefined)assert.match(wrapper.reference_commit,/^[0-9a-f]{40}$/);
 assert.equal(data.original_js_programs_and_assertions_unchanged,true);assert.equal(data.new_sha_or_authored_use_closures,0);
 return data;
}
export function historicalFrameMembers(root,frame){
 assert.match(frame.commit,/^[0-9a-f]{40}$/);assert.match(frame.tree,/^[0-9a-f]{40}$/);
 assert.equal(git(root,['rev-parse',frame.commit+'^{tree}']).toString().trim(),frame.tree,'historical tree identity changed');
 const bytes=git(root,['ls-tree','-rz',frame.commit]);assert.equal(hash(bytes),frame.tree_listing_sha256,'historical tree listing changed');
 const members=bytes.toString().split('\0').filter(Boolean).map(record=>{
  const[metadata,path]=record.split('\t'),[mode,kind,blob]=metadata.split(' ');relativePath(path);assert.equal(kind,'blob');assert.ok(['100644','100755'].includes(mode),'unsupported historical member mode');assert.match(blob,/^[0-9a-f]{40}$/);
  return {path,mode,blob};
 });assert.equal(members.length,frame.members);assert.equal(new Set(members.map(row=>row.path)).size,members.length);return members;
}
function sourceFiles(root,prefix){
 const paths=[];
 function visit(relative){for(const entry of readdirSync(resolve(root,relative),{withFileTypes:true})){
  const path=relative+'/'+entry.name;if(entry.name==='node_modules')continue;
  assert.ok(!entry.isSymbolicLink(),'symlink in current product route '+path);
  if(entry.isDirectory())visit(path);else if(entry.isFile())paths.push(path);else assert.fail('non-file in current product route '+path);
 }}visit(prefix);return paths.sort();
}
/** Two finite wrapper transitions; their original records and assertions are
 * still authenticated above. No current-HEAD source exception is introduced. */
function currentWrapperSuccessors(root,data,members,read){
 const memberMap=new Map(members.map(m=>[m.path,m]));assert.ok(memberMap.has(olderRegistry),'missing successor source registry');
 const raw=read(olderRegistry),captured=git(root,['show',data.current_frame.commit+':'+olderRegistry]);
 assert.ok(raw.equals(captured),'current wrapper successor registry changed');
 const inputs=JSON.parse(raw);assert.equal(inputs.line,data.line);assert.equal(inputs.module_count,20);assert.equal(inputs.case_count,50);
 const stored=read(inputs.prior.path);assert.equal(hash(stored),inputs.prior.sha256,'wrapper successor prior changed');
 const priorBytes=gunzipSync(stored);assert.equal(hash(priorBytes),inputs.prior.raw_sha256);const prior=JSON.parse(priorBytes);
 const result=new Map(),expected=[];
 for(const path of successorPaths){
  const wrapper=data.wrapper_edits.find(w=>w.path===path),entry=inputs.entries.find(e=>e.program===path),before=prior.preimages.find(m=>m.path===path);
  assert.ok(wrapper&&entry&&before&&memberMap.has(path));assert.equal(hash(before.text),before.sha256);assert.equal(before.sha256,wrapper.after_sha256);
  const original=git(root,['show',inputs.frame.commit+':'+path]);assert.equal(hash(original),entry.program_sha256);assert.equal(hash(original),wrapper.after_sha256);
  const current=git(root,['show',data.current_frame.commit+':'+path]);assert.equal(hash(current),entry.wrapper_sha256);
  expected.push({path,original_wrapper_record_sha256:hash(JSON.stringify(wrapper)),original_after_sha256:wrapper.after_sha256,
   current_sha256:entry.wrapper_sha256,originals_registry:{path:olderRegistry,sha256:hash(raw)},
   original_program:{commit:inputs.frame.commit,sha256:entry.program_sha256},source_scope_only:true,actual_native_or_packed_qualified:false});
  result.set(path,{bytes:current,sha256:entry.wrapper_sha256});
 }
 assert.deepEqual(data.current_wrapper_successors,expected,'unregistered wrapper successor identity');return result;
}
/** The adapter's other method acquired one separately qualified replay route.
 * Reconstruct that exact transport on top of the original registered wrapper;
 * retain acceptance of both original wrapper forms for the unchanged controls. */
function consumerWrapperSuccessors(root,data,members,read){
 const path='compatibility/rc/historical-consumer-wrapper-successor.json';
 const expected={main:'a1f9d4e3455d6c8ffc74bbbfefa69b001c0db6a091c3edfefab57999e7c3d0b4',
  '21.x':'fa2aa9675b856020dd4e24791d74684ce47513bfd248d81b21e1d61775200502'};
 const raw=read(path);assert.equal(hash(raw),expected[data.line],'current consumer wrapper transport changed');
 assert.ok(raw.equals(git(root,['show',data.current_frame.commit+':'+path])),'consumer wrapper transport frame changed');
 const transport=JSON.parse(raw);assert.equal(transport.line,data.line);
 const overlaps=transport.wrappers.filter(row=>data.wrapper_edits.some(wrapper=>wrapper.path===row.path));
 assert.deepEqual(overlaps.map(row=>row.path),['tests/test_spec_wide_fixture_adapter.py']);
 const result=new Map();
 for(const row of overlaps){
  const wrapper=data.wrapper_edits.find(wrapper=>wrapper.path===row.path);
  const before=git(root,['show',transport.source_parent+':'+row.path]);
  assert.equal(hash(before),row.before.sha256);assert.equal(row.before.sha256,wrapper.after_sha256);
  let after=before.toString();assert.equal(row.literal_edits.length,2);
  for(const edit of row.literal_edits){assert.equal(after.split(edit.before).length,2,'consumer wrapper edit not exact');after=after.replace(edit.before,edit.after);}
  const bytes=Buffer.from(after);assert.equal(hash(bytes),row.after.sha256);assert.equal(bytes.length,row.after.bytes);
  const member=members.find(member=>member.path===row.path);assert.ok(member);
  assert.equal(member.blob,blobHash(bytes),'consumer wrapper frame changed');
  result.set(row.path,{bytes,sha256:row.after.sha256});
 }
 return result;
}
// One replay-only transport for the separately sealed current npm checker.
// The checker literal remains npm's trust anchor; this HEAD-owned descriptor
// authenticates one complete afterimage without returning before bytes as source.
const checkerSealPath='scripts/check-dependency-eligibility.py';
const checkerSealProfile='compatibility/rc/parent-private-npm-current-profile-inputs-v2.json';
const checkerSealDocument='compatibility/rc/historical-source-replay.md';
const checkerSealBegin='<!-- npm-current-profile-checker-self-pin-v1 -->';
const checkerSealEnd='<!-- /npm-current-profile-checker-self-pin-v1 -->';
const checkerSealEquals=Buffer.prototype.equals,checkerSealIsBuffer=Buffer.isBuffer,checkerSealApply=Reflect.apply;
const checkerSealEqual=(actual,supplied)=>checkerSealIsBuffer(supplied)&&checkerSealApply(checkerSealEquals,actual,[supplied]);
function checkerSealPhysical(root,path){
 relativePath(path);let cursor=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());
 for(const part of path.split('/')){cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false,'linked checker seal member');}
 assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
function checkerSealObject(value,keys){
 assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.equal(Object.getPrototypeOf(value),Object.prototype);
 assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),'checker seal metadata shape');
}
function checkerSelfPinTransport({root,data,member,supplied,read,toolingCommit}){
 assert.equal(member.path,checkerSealPath);assert.ok(['21.x','main'].includes(data.line));
 const retained=new Map(),current=path=>{
  const actual=checkerSealPhysical(root,path);assert.ok(checkerSealEqual(actual,read(path)),'nonphysical checker seal member '+path);
  assert.ok(checkerSealEqual(checkerSealPhysical(root,path),actual),'checker seal member changed during callback '+path);
  retained.set(path,Buffer.from(actual));return actual;
 };
 const document=current(checkerSealDocument),headDocument=git(root,['show',toolingCommit+':'+checkerSealDocument]);
 assert.ok(checkerSealEqual(document,headDocument),'checker seal document differs from HEAD');
 const text=document.toString('utf8');assert.ok(checkerSealEqual(document,Buffer.from(text)));
 assert.equal(text.split(checkerSealBegin).length,2,'missing or duplicate checker seal descriptor');
 assert.equal(text.split(checkerSealEnd).length,2,'missing or duplicate checker seal descriptor end');
 const begin=text.indexOf(checkerSealBegin)+checkerSealBegin.length,end=text.indexOf(checkerSealEnd);assert.ok(end>begin);
 const block=text.slice(begin,end).match(/^\n```json\n([\s\S]+)\n```\n$/);assert.ok(block,'checker seal descriptor must be one JSON block');
 const descriptor=JSON.parse(block[1]);assert.equal(block[1],JSON.stringify(descriptor,null,2),'checker seal descriptor must be canonical JSON');checkerSealObject(descriptor,['schema_version','line','profile']);
 assert.equal(descriptor.schema_version,1);assert.equal(descriptor.line,data.line,'foreign checker seal line');
 const ref=descriptor.profile;checkerSealObject(ref,['path','sha256','bytes','commit']);assert.equal(ref.path,checkerSealProfile);
 assert.match(ref.sha256,/^[0-9a-f]{64}$/);assert.ok(Number.isSafeInteger(ref.bytes)&&ref.bytes>0&&ref.bytes<=3000000);assert.match(ref.commit,/^[0-9a-f]{40}$/);
 const before=git(root,['show',data.current_frame.commit+':'+checkerSealPath]);assert.equal(blobHash(before),member.blob,'checker before program is not frame Gitblob');
 const beforeText=before.toString('utf8');assert.ok(checkerSealEqual(before,Buffer.from(beforeText)));
 const paths=[...beforeText.matchAll(/^NPM_CURRENT_PRIVATE_PROFILE_PATH = "([^"]+)"$/gm)];assert.equal(paths.length,1);assert.equal(paths[0][1],checkerSealProfile,'checker profile filename handoff must precede source frame');
 const assignments=[...beforeText.matchAll(/^NPM_CURRENT_PRIVATE_PROFILE_SHA256\s*=/gm)];
 const pins=[...beforeText.matchAll(/^NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "([a-f0-9]{64})"$/gm)];assert.equal(assignments.length,1);assert.equal(pins.length,1,'checker seal field is not exactly one literal');
 const profile=current(checkerSealProfile);assert.equal(profile.length,ref.bytes);assert.equal(hash(profile),ref.sha256,'checker seal profile SHA changed');
 const entry=git(root,['ls-tree','-z',ref.commit,'--',checkerSealProfile]).toString().split('\0').filter(Boolean);assert.equal(entry.length,1);const[meta,path]=entry[0].split('\t');assert.equal(path,checkerSealProfile);assert.match(meta,/^100(?:644|755) blob [0-9a-f]{40}$/);
 const stored=git(root,['show',ref.commit+':'+checkerSealProfile]);assert.ok(checkerSealEqual(profile,stored),'checker seal profile differs from immutable Git DATA');
 const packet=JSON.parse(profile);assert.equal(packet.schema_version,1);assert.equal(packet.scope,'maintained-tool-owned-npm-invocations');
 assert.deepEqual(packet.historical_artifacts,{'private-profile-source-manifests.json':'08f1feb3a2186f6bb0bd9e36af7462e2c752c7a344632b37c44e8bb194b0b3a4','private-profile-remaining-evidence.json':'f944d76dfb5ea39bf4f7743ea377c5112218efcef4c42af465eb59437bcb82fb','private-profile-remaining-result.json':'54bd6cf921745b848f05fb1d2eaea6339b870bf53ce431e9e5eaad606a390dc0'});
 assert.deepEqual(Object.keys(packet.lines).sort(),['21.x','main']);
 const suffixes=['.cjs','.js','.mjs','.py','.sh','.ts'],roots=['compatibility/handoff/codex-closeout/tools','tests'];
 for(const branch of Object.values(packet.lines)){
  assert.match(branch.source_parent,/^[0-9a-f]{40}$/);const seen=new Set();
  for(const key of ['source_files','support_files','input_files']){assert.ok(Array.isArray(branch[key]));for(const row of branch[key]){
   assert.equal(typeof row.path,'string');relativePath(row.path);assert.equal(seen.has(row.path),false);seen.add(row.path);
   assert.notEqual(row.path,checkerSealDocument,'checker seal document cannot be bound by npm profile');
  }}
  assert.ok(Array.isArray(branch.support_discovery));assert.equal(branch.support_discovery.length,2);
  assert.deepEqual(branch.support_discovery.map(group=>group.root).sort(),roots);
  for(const group of branch.support_discovery){assert.deepEqual(group.suffixes,suffixes);assert.ok(Array.isArray(group.paths));for(const path of group.paths){
   assert.equal(typeof path,'string');relativePath(path);assert.notEqual(path,checkerSealDocument);assert.ok(path.startsWith(group.root+'/'),'foreign npm discovery member');
  }assert.equal(checkerSealDocument.startsWith(group.root+'/')&&suffixes.some(s=>checkerSealDocument.endsWith(s)),false);}
 }
 const sourceParent=packet.lines[data.line].source_parent;
 for(const[ancestor,descendant]of [[data.current_frame.commit,sourceParent],[sourceParent,ref.commit],[ref.commit,toolingCommit]])git(root,['merge-base','--is-ancestor',ancestor,descendant]);
 const literal='NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "'+ref.sha256+'"';
 const expected=Buffer.from(beforeText.slice(0,pins[0].index)+literal+beforeText.slice(pins[0].index+pins[0][0].length));
 const actual=current(checkerSealPath);assert.ok(checkerSealEqual(actual,supplied),'checker supplied bytes differ from physical afterimage');
 assert.ok(checkerSealEqual(actual,expected),'checker change exceeds exact self-pin literal transport');
 const assertCurrent=()=>{
  assert.equal(git(root,['rev-parse','HEAD']).toString().trim(),toolingCommit,'checker seal HEAD changed during callbacks');
  for(const[path,bytes]of retained)assert.ok(checkerSealEqual(checkerSealPhysical(root,path),bytes),'late physical checker seal member '+path);
 };
 assertCurrent();return {assertCurrent};
}

export function verifyHistoricalCurrentSubjects({root=rootDefault,data,members,readMember,productPaths}={}){
 const read=readMember||((path)=>{let cursor=root;assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink());for(const part of path.split('/')){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink(),'symlink in current source route '+path);}assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);}),mutable=new Set(data.mutable_progress_paths),wrappers=new Map(data.wrapper_edits.map(row=>[row.path,row]));
 const currentByPath=new Map(members.map(row=>[row.path,row])),tooling=new Set(toolingPaths),successors=currentWrapperSuccessors(root,data,members,read),consumerSuccessors=consumerWrapperSuccessors(root,data,members,read);let guarded=0;
 const toolingCommit=git(root,['rev-parse','HEAD']).toString().trim(),toolingTree=git(root,['rev-parse',toolingCommit+'^{tree}']).toString().trim();let checkerTransport;
 for(const member of members){
  if(mutable.has(member.path)||tooling.has(member.path))continue;
  const bytes=read(member.path),wrapper=wrappers.get(member.path);
  if(wrapper){
   const original=git(root,['show',(wrapper.reference_commit||data.wrapper_reference_commit)+':'+member.path]);assert.equal(hash(original),wrapper.before_sha256);
   let proposed=original.toString();for(const edit of wrapper.edits){assert.equal(proposed.split(edit.before).length,2,'wrapper edit not exact');proposed=proposed.replace(edit.before,edit.after);}
   assert.equal(hash(proposed),wrapper.after_sha256);
   const admitted=[successors.get(member.path),consumerSuccessors.get(member.path)].filter(Boolean);
   assert.ok([blobHash(original),blobHash(Buffer.from(proposed)),...admitted.map(row=>blobHash(row.bytes))].includes(member.blob),'registered wrapper base changed');
   assert.ok([wrapper.before_sha256,wrapper.after_sha256,...admitted.map(row=>row.sha256)].includes(hash(bytes)),'current historical-replay wrapper changed '+member.path);
  }else if(member.path===checkerSealPath&&blobHash(bytes)!==member.blob){
   checkerTransport=checkerSelfPinTransport({root,data,member,supplied:bytes,read,toolingCommit});
  }else assert.equal(blobHash(bytes),member.blob,'current historical-replay subject changed '+member.path);
  guarded++;
 }
 for(const path of toolingPaths){
  assert.ok(currentByPath.has(path),'registered tooling member missing from source frame');
  const original=git(root,['show',toolingCommit+':'+path]);
  assert.ok(read(path).equals(original),'current historical-replay tooling changed '+path);guarded++;
 }
 checkerTransport?.assertCurrent();
 for(const wrapper of wrappers.keys())assert.ok(currentByPath.has(wrapper));
 const product=members.filter(row=>row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.path).sort();
 assert.deepEqual(productPaths||sourceFiles(root,'projects/ngx-material-legacy'),product,'current product membership changed');
 for(const entry of data.entries){assert.equal(hash(read(entry.probe)),entry.probe_sha256,'original historical probe changed');assert.ok(currentByPath.has(entry.probe));}
 checkerTransport?.assertCurrent();
 return {line:data.line,guarded_current_members:guarded,current_product_members:product.length,
  current_tooling_members:toolingPaths.length,tooling_reference:{commit:toolingCommit,tree:toolingTree},
  exact_wrapper_edits_only:true,authenticated_current_wrapper_successors:successors.size,authenticated_consumer_wrapper_transitions:consumerSuccessors.size,mutable_progress_paths:[...mutable],current_source_qualification:false,current_native_or_packed_qualification:false};
}
export function inspectHistoricalReplayCurrent({root=rootDefault,readMember,productPaths}={}){
 const data=historicalReplayInputs({root,readMember}),members=historicalFrameMembers(root,data.current_frame);
 return {data,members,guard:verifyHistoricalCurrentSubjects({root,data,members,readMember,productPaths})};
}
function regularTree(root,members){
 const files=[];
 function visit(relative=''){for(const entry of readdirSync(resolve(root,relative),{withFileTypes:true})){
  const path=relative?relative+'/'+entry.name:entry.name;assert.ok(!entry.isSymbolicLink(),'historical graph contains a symlink');
  if(entry.isDirectory())visit(path);else{assert.ok(entry.isFile());files.push(path);}
 }}visit();assert.deepEqual(files.sort(),members.map(row=>row.path).sort(),'incomplete historical file graph');
 let bytes=0;for(const member of members){const value=readFileSync(resolve(root,member.path));assert.equal(blobHash(value),member.blob,'historical member changed '+member.path);bytes+=value.length;}return bytes;
}
function completion(child){return new Promise((done,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>done({code,signal}));});}
async function extractFrame(root,frame,target){
 const archive=spawn('git',gitArgs(['archive','--format=tar',frame.commit]),{cwd:root,env:environment(),stdio:['ignore','pipe','pipe']});
 const tar=spawn('tar',['-xf','-','-C',target],{env:environment(),stdio:['pipe','ignore','pipe']});
 let archiveError='',tarError='';archive.stderr.on('data',bytes=>{archiveError=(archiveError+bytes).slice(-4000);});tar.stderr.on('data',bytes=>{tarError=(tarError+bytes).slice(-4000);});
 tar.stdin.on('error',()=>{});archive.stdout.pipe(tar.stdin);
 try{const[packed,extracted]=await Promise.all([completion(archive),completion(tar)]);assert.equal(packed.code,0,'historical archive failed '+archiveError);assert.equal(extracted.code,0,'historical extraction failed '+tarError);}
 finally{if(archive.exitCode===null)archive.kill('SIGTERM');if(tar.exitCode===null)tar.kill('SIGTERM');}
}
function dependencyRoot(root){
 const candidates=[join(root,'node_modules'),...(process.env.NODE_PATH||'').split(delimiter).filter(Boolean)];
 for(const candidate of candidates)if(existsSync(candidate)&&lstatSync(candidate).isDirectory())return candidate;
 // pnpm workspace roots can themselves be links.
 for(const candidate of candidates)if(existsSync(candidate))return candidate;
 assert.fail('Historical source replay needs the already installed workspace dependencies; no installer is run');
}
/** Eight later source-model transitions use the same graph execution owner. */
export function sourceIntegrationHistoryInputs({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),raw=read(SOURCE_INTEGRATION_HISTORY_INPUTS),data=JSON.parse(raw);
 assert.ok(Object.hasOwn(integrationPins,data.line));assert.equal(hash(raw),integrationPins[data.line],'source integration history registry changed');
 assert.equal(data.schema_version,1);assert.equal(data.id,'source-integration-history');
 assert.equal(data.original_JS_programs_and_Python_assertions_unchanged,true);assert.equal(data.original_child_timeouts_unchanged,true);
 assert.equal(data.wrapper_orchestration_overhead_seconds,180);
 assert.equal(data.current_historical_registry_entries_added,0);assert.equal(data.current_mutable_paths_added,0);assert.equal(data.source_closures,0);
 assert.equal(data.actual_current_source_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.deepEqual(data.entries.map(row=>row.id),SOURCE_INTEGRATION_HISTORY_IDS);assert.equal(data.wrapper_edits.length,8);
 for(const [index,[id,name,env,timeout]]of integrationSpecs.entries()){
  const entry=data.entries[index],wrapper=data.wrapper_edits[index],probe='tests/'+name+'_probe.mjs';
  assert.equal(entry.id,id);assert.equal(entry.probe,probe);assert.equal(entry.timeout_ms,timeout);relativePath(probe);
  assert.equal(wrapper.path,'tests/test_'+name+'.py');assert.match(wrapper.reference_commit,/^[0-9a-f]{40}$/);
  const edits=id==='dialog-owned-integration'?[{before:"['node', '"+probe+"', str(report_path)]",after:"['node', 'scripts/run-historical-source-probe.mjs', '"+id+"', '--original-report', str(report_path)]"}]:
   [{before:"['node', '"+probe+"']",after:"['node', 'scripts/run-historical-source-probe.mjs', '"+id+"']"}];
  if(env)edits.push({before:"command.append(os.environ['"+env+"'])",after:"command.extend(['--original-report', os.environ['"+env+"']])"});
  edits.push({before:'timeout='+timeout/1000,after:'timeout='+timeout/1000+' + 180'});
  assert.deepEqual(wrapper.edits,edits,'source history wrapper changed beyond exact command/report/orchestration-budget routing');
  const before=git(root,['show',wrapper.reference_commit+':'+wrapper.path]);assert.equal(hash(before),wrapper.before_sha256);
  let after=before.toString();for(const edit of edits){assert.equal(after.split(edit.before).length,2);after=after.replace(edit.before,edit.after);}
  assert.equal(hash(after),wrapper.after_sha256);assert.equal(hash(read(wrapper.path)),wrapper.after_sha256,'source integration wrapper changed');
  assert.equal(hash(read(probe)),entry.probe_sha256,'original integration program changed');
 }
 return {data,sha256:hash(raw)};
}
/** Qualify only a recorded exact Python replay wrapper successor, never a product file. */
export function sourceIntegrationWrapperHash({root=rootDefault,path,expectedSha,readMember}={}){
 if(!integrationSpecs.some(row=>'tests/test_'+row[1]+'.py'===path))return expectedSha;
 const {data}=sourceIntegrationHistoryInputs({root,readMember}),wrapper=data.wrapper_edits.find(row=>row.path===path);
 assert.ok(wrapper);assert.ok([wrapper.before_sha256,wrapper.after_sha256].includes(expectedSha),'unknown source integration wrapper reference');
 return wrapper.after_sha256;
}
/** Retain the complete original policy probe at its passing source checkpoint.
 * Current eight-entry policy validation still runs through its existing owner. */
export function sourceIntegrationPolicyHistoryInputs({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path)));
 const current=sourceIntegrationHistoryInputs({root,readMember:read}),line=current.data.line;
 const probe='tests/source_integration_history_probe.mjs',wrapper='tests/test_source_integration_history.py';
 const frame=structuredClone(policyFrames[line]);assert.ok(frame);
 const original=git(root,['show',frame.commit+':'+probe]);
 assert.equal(hash(original),'5b3de6c0f4e3da6273c2769634bbb0723ad4957619527a4185d5441a6ad9b424');
 assert.ok(read(probe).equals(original),'original source policy probe changed');
 const before=git(root,['show',frame.commit+':'+wrapper]);
 assert.equal(hash(before),'966b5a107b9cd974f78f995f59dc604abb75a20ff77875e9acea6c2402ffaca7');
 let after=before.toString();
 for(const [from,to]of [
  ["        child = subprocess.run(['node', 'tests/source_integration_history_probe.mjs'],",
   "        # Original snapshot assertions; current policy runs in test_source_integration_policy_current.py.\n        child = subprocess.run(['node', 'tests/source_integration_history_probe.mjs'],"],
  ["['node', 'tests/source_integration_history_probe.mjs']",
   "['node', 'scripts/run-historical-source-probe.mjs', 'source-integration-history-controls']"],
 ]){assert.equal(after.split(from).length,2,'policy wrapper edit not exact');after=after.replace(from,to);}
 assert.equal(read(wrapper).toString(),after,'current source policy wrapper changed');
 const entry={id:SOURCE_INTEGRATION_POLICY_HISTORY_ID,probe,probe_sha256:hash(original),frame,timeout_ms:90000};
 const data={line,entries:[entry],current_integration_programs:current.data.entries.length,
  source_history_inputs_sha256:current.sha256,wrapper:{path:wrapper,before_sha256:hash(before),after_sha256:hash(after)},
  actual_current_source_native_packed_or_floor_qualified:false};
 return {data,sha256:hash(JSON.stringify(data))};
}
export async function runHistoricalSourceProbe({root=rootDefault,id,reportPath,originalReportPath}={}){
 const policy=id===SOURCE_INTEGRATION_POLICY_HISTORY_ID;
 const supplemental=policy?sourceIntegrationPolicyHistoryInputs({root}):SOURCE_INTEGRATION_HISTORY_IDS.includes(id)?sourceIntegrationHistoryInputs({root}):null;
 assert.ok(ids.includes(id)||supplemental,'unregistered historical probe');
 assert.ok(!originalReportPath||SOURCE_INTEGRATION_HISTORY_IDS.includes(id),'original report output is restricted to the eight integration programs');
 if(originalReportPath)assert.equal(existsSync(originalReportPath),false,'original report destination already exists');
 const started=Date.now(),{data,members:currentMembers,guard}=inspectHistoricalReplayCurrent({root});
 const entry=(supplemental?.data??data).entries.find(row=>row.id===id);assert.ok(entry,'unregistered historical probe');
 const members=historicalFrameMembers(root,entry.frame);assert.equal(hash(git(root,['show',entry.frame.commit+':'+entry.probe])),entry.probe_sha256);
 const parent=mkdtempSync(join(tmpdir(),'ngx-historical-source-')),checkout=join(parent,'checkout');mkdirSync(checkout);
 let report;
 try{
  await extractFrame(root,entry.frame,checkout);const historicalBytes=regularTree(checkout,members);
  const common=resolve(root,git(root,['rev-parse','--git-common-dir']).toString().trim());
  git(checkout,['init','-q','--object-format=sha1']);writeFileSync(join(checkout,'.git/objects/info/alternates'),join(common,'objects')+'\n');writeFileSync(join(checkout,'.git/HEAD'),entry.frame.commit+'\n');git(checkout,['read-tree',entry.frame.commit]);
  symlinkSync(dependencyRoot(root),join(checkout,'node_modules'),'dir');writeFileSync(join(checkout,'.git/info/exclude'),'/node_modules/\n');
  assert.equal(git(checkout,['status','--porcelain','--untracked-files=all']).toString(),'','historical graph is dirty before execution');
  const diagnostic=join(parent,'original-report.json'),env=environment();
  env.NODE_PATH=[join(root,'node_modules'),...(env.NODE_PATH||'').split(delimiter).filter(Boolean)].join(delimiter);
  const child=spawn(process.execPath,[entry.probe,...(entry.report_option?[entry.report_option]:[]),diagnostic],{cwd:checkout,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
  child.stdout.on('data',bytes=>{stdout+=bytes;if(stdout.length>4*1024*1024)child.kill('SIGTERM');});child.stderr.on('data',bytes=>{stderr=(stderr+bytes).slice(-4*1024*1024);});
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},entry.timeout_ms);
  let finished;try{finished=await completion(child);}finally{clearTimeout(timer);}
  const postStatus=git(checkout,['status','--porcelain','--untracked-files=all']).toString();
  // One fixed original program reports JSON on stdout. Preserve that program's
  // complete assertions/interface; the prior twenty retain their file reports.
  let original;
  if(entry.report_source==='stdout-json'){
   assert.equal(entry.id,'wide-fixture-adapter-context');assert.equal(existsSync(diagnostic),false,'unexpected adapter report file');
   original=JSON.parse(stdout);
   assert.equal(original.qualified_entries,13);assert.equal(original.unrelated_rows_preserved,1684);
   assert.equal(original.scope_rejection_controls,7);assert.equal(original.native_rejection_controls,15);
   assert.equal(original.all1697_verdicts_unchanged,true);assert.equal(original.actual_Angular_native_artifact_or_floor_qualified,false);
  }else original=existsSync(diagnostic)?JSON.parse(readFileSync(diagnostic)):null;
  if(entry.id==='test-consolidation-source'){assert.equal(original?.subjects,32);assert.equal(original.negative_controls,25);assert.equal(original.retained_historical_sources,12);assert.equal(original.actual_original_tests_or_product_runtime_executed,false);}
  if(entry.id==='deferred-control-upstream-source'){assert.equal(original?.reviewed_SHAs,80);assert.equal(original.controls.length,12);assert.equal(original.native_or_packed_or_full_floors_qualified,false);}
  if(original){assert.equal(original.line,data.line,'historical report line changed');assert.notEqual(original.g11_claim,'passed');for(const flag of ['actual_native_packed_or_floor_qualified','native_or_packed_qualified','packed_or_native_qualified'])assert.notEqual(original[flag],true,'historical probe claimed runtime qualification');}
  // Recheck the caller graph after the original program runs. It was never replaced.
  const after=verifyHistoricalCurrentSubjects({root,data,members:currentMembers});assert.deepEqual(after,guard);
  if(supplemental)assert.equal((policy?sourceIntegrationPolicyHistoryInputs({root}):sourceIntegrationHistoryInputs({root})).sha256,supplemental.sha256);
  report={schema_version:1,line:data.line,inputs_sha256:hash(readFileSync(resolve(root,HISTORICAL_REPLAY_INPUTS))),helper_sha256:hash(readFileSync(resolve(root,'scripts/historical-source-replay.mjs'))),cli_sha256:hash(readFileSync(resolve(root,'scripts/run-historical-source-probe.mjs'))),probe_id:id,probe:entry.probe,probe_sha256:entry.probe_sha256,frame:entry.frame,
   historical_members_verified:members.length,historical_bytes_verified:historicalBytes,complete_original_program_unchanged:true,
   current_guard:guard,current_guard_passed_before_and_after:true,exit_code:finished.code,signal:finished.signal,timed_out:timedOut,
   original_stdout:stdout,original_stderr:stderr,original_report:original,historical_post_execution_clean:postStatus==='',
   node:process.version,typescript:createRequire(import.meta.url)('typescript').version,elapsed_ms:Date.now()-started,
   source_scope:'Historical source model and its original rejection controls only. Current source/runtime, application, compiler, Node/RxJS and peer floors require their own gates.',
   actual_current_source_or_native_or_packed_qualified:false,g11_claim:'not-passed',temporary_graph_removed:false};
  assert.equal(timedOut,false,'historical probe timed out');assert.equal(finished.code,0,'historical probe failed\n'+stderr.slice(-6000));assert.equal(postStatus,'','historical probe changed its source graph');assert.ok(original,'historical probe report missing');
  if(supplemental){
   report.supplemental_registry={path:SOURCE_INTEGRATION_HISTORY_INPUTS,sha256:supplemental.sha256};
   report.original_report_sha256=hash(readFileSync(diagnostic));
   if(originalReportPath)writeFileSync(originalReportPath,readFileSync(diagnostic),{flag:'wx'});
  }
 }finally{
  rmSync(parent,{recursive:true,force:true});if(report)report.temporary_graph_removed=true;
  if(reportPath&&report)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 }
 return report;
}
