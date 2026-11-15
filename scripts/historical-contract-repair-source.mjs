/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One finite current source-reference owner; original evidence stays historical. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {historicalRepairLiveSourceSuccessor} from './historical-repair-live-source-successor.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import * as plannerModule from './canonical-source-guard-plan.mjs';
const {composeCanonicalSourceGuards}=plannerModule;
import {tabsFiniteSourceSuccessor} from './tabs-finite-source-successor.mjs';
import {selectDialogFiniteSuccessor} from './select-dialog-finite-source-successor.mjs';
import {dialogFocusFiniteSourceSuccessor} from './dialog-focus-finite-source-successor.mjs';
const SELF='scripts/historical-contract-repair-source.mjs',INPUTS='compatibility/rc/historical-contract-repair-source-inputs.json';
const PINS={'21.x':'c1d7a8762cad7913a5d4ad60863afb506c56c61d27a78c17a3f5372c51cc9303',main:'cee92383ce1cb2c82b135e2e3b8be0131a46b114d60a521f7e11e4d0bb017191'};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex'),originals=new Map();
const requireLocal=createRequire(import.meta.url);
export const historicalContractRepairLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});
const SOURCE_PATHS=Object.freeze([
 'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
 'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',
 'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
 'compatibility/rc/api/signature-differences.json',
]);
const key=row=>JSON.stringify([row.file,row.module,row.symbol]);
/** Only pinned package roots can be linked. Source and descendants remain regular files. */
export function readHistoricalContractRepairMember(root,path){
 const cyph=['../../../../cyph/shared/js/cyph/services/material-dialog.service.ts','../../../../cyph/shared/js/cyph/modules/cyph-web.module.ts'];
 if(cyph.includes(path)){const suffix=path.slice('../../../../cyph/'.length);assert.equal(resolve(root,path),resolve('/home/parallels/cyph',suffix));return readEvidenceMember('/home/parallels/cyph',suffix);}
 const match=path.match(/^node_modules\/(@angular\/(?:material|cdk|core|compiler)|typescript|rxjs)\/(.+)$/);
 if(!match)return readEvidenceMember(root,path);
 let cursor=realpathSync(join(root,'node_modules',match[1]));
 for(const part of match[2].split('/')){assert.ok(part&&part!=='.'&&part!=='..');cursor=join(cursor,part);assert.equal(lstatSync(cursor).isSymbolicLink(),false);}
 assert.ok(lstatSync(cursor).isFile());return readFileSync(cursor);
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);const id=JSON.stringify([root,parent,path]);
 if(!originals.has(id)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(id,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:8*1024*1024}));
 }return Buffer.from(originals.get(id));
}
const reference=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const planner=composeCanonicalSourceGuards, functionToString=Function.prototype.toString;
const equals=Buffer.prototype.equals,apply=Reflect.apply;
const equal=(a,b)=>Buffer.isBuffer(b)&&apply(equals,a,[b]);
const PLANNER=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f',bytes:4609});
const PLANNER_CURRENT=Object.freeze({path:PLANNER.path,sha256:'3a3663ce06af2107f55c410fff458100a808593fa9a968e18a94d8490c7fc664',bytes:5014});
const PLANNER_PACKET=Object.freeze({path:'compatibility/rc/current-tool-planner-source-successor-v1.json',sha256:'7a986f7e700c45cc7137432e0573705f6aed6245c3963e9aa8953f93f8eec7fb',bytes:1162});
const TABLE_PACKET=Object.freeze({path:'compatibility/rc/historical-repair-table-signature-source-successor-v1.json',sha256:'c2a030da37eb7a7c37a0526f79b55de405469bf36c4f343e5f5aef973ce72f12',bytes:1683});
function replay(before,edits){
 assert.ok(Array.isArray(edits));let cursor=0;const parts=[];
 for(const edit of edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');const prior=Buffer.from(edit.before);assert.ok(equal(before.subarray(edit.offset,edit.offset+prior.length),prior));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+prior.length;}
 parts.push(before.subarray(cursor));return Buffer.concat(parts);
}
function exact(raw,ref){assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
function assertParent(root,commit,parent){
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
 assert.equal(execFileSync('git',['--no-replace-objects','rev-list','--parents','-n','1',commit],{cwd:root,env,encoding:'utf8'}).trim(),commit+' '+parent);
}
export function assertHistoricalRepairPlannerSource(root){
 assert.equal(composeCanonicalSourceGuards,planner,'changed historical repair guard planner');
 assert.equal(hash(functionToString.call(planner)),'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947','unauthenticated historical repair guard planner');
 const raw=readEvidenceMember(root,PLANNER.path),version=JSON.parse(readEvidenceMember(root,'projects/ngx-material-legacy/package.json')).version;
 if(hash(raw)===PLANNER.sha256){assert.match(version,/^21\./);exact(raw,PLANNER);return;}
 assert.match(version,/^22\./);
 exact(raw,PLANNER_CURRENT);assert.ok(Object.isFrozen(plannerModule.canonicalSourceGuardPlanLoadedImage));assert.deepEqual(plannerModule.canonicalSourceGuardPlanLoadedImage,PLANNER_CURRENT);
 const packetRaw=readEvidenceMember(root,PLANNER_PACKET.path);exact(packetRaw,PLANNER_PACKET);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'current-tool-planner-source-successor');assert.equal(packet.source_parent,'2fbecd1b2687e26515c205cbd5c0024e9474b4b8');assert.equal(packet.source_commit,'8baa761eca624c9d71293c3d31750a2b3fdeebf0');assert.equal(packet.historical_programs_executed,false);assert.deepEqual(packet.before,PLANNER);assert.deepEqual(packet.after,PLANNER_CURRENT);
 assertParent(root,packet.source_commit,packet.source_parent);const before=original(root,packet.source_parent,PLANNER.path),after=replay(before,packet.edits);exact(before,PLANNER);exact(after,PLANNER_CURRENT);assert.ok(equal(after,original(root,packet.source_commit,PLANNER.path)));assert.ok(equal(raw,after));
}
const assertPlanner=assertHistoricalRepairPlannerSource;
export function historicalRepairTableSourceProof({root=process.cwd(),live=historicalRepairLiveSourceSuccessor({root})}={}){
 root=resolve(root);const read=path=>readEvidenceMember(root,path);assert.ok(equal(read(SELF),image),'loaded historical-repair source owner differs from current file');
  const packetRaw=read(TABLE_PACKET.path);exact(packetRaw,TABLE_PACKET);const packet=JSON.parse(packetRaw);
  assert.equal(packet.schema_version,1);assert.equal(packet.role,'historical-repair-table-signature-source-successor');assert.equal(packet.source_parent,'c394ef616bfae381e0676c8f84af01e0553cad1d');assert.equal(packet.source_commit,'68606c1ee64a6f529ef71b4576cc13c7863dbc85');assert.equal(packet.historical_programs_executed,false);assert.equal(packet.artifact_or_audit_admission_granted,false);
  const path='compatibility/rc/api/signature-differences.json';assert.deepEqual(packet.before,{path,sha256:'ab78e5d35b56a8ce552054ac36ed35aa6e136d3b58bff9534474a5020fd698d0',bytes:49850});assert.deepEqual(packet.after,{path,sha256:'fc44b0d7b587556a6124440c4918ed52f2bd1db35442c8d1cbe5cc9a6010fb9b',bytes:50554});
  assert.deepEqual(packet.review,{path:'compatibility/rc/parent-main-table-column-diagnostic-v1.json',sha256:'3259363816ea786cb550b1a7e7ae5570f4ad3d2b0b111e7d66d65a2446007de7',bytes:4964});
  const receiptRaw=read(packet.review.path);exact(receiptRaw,packet.review);const receipt=JSON.parse(receiptRaw);assert.equal(receipt.base_head,packet.source_parent);assert.equal(receipt.independent_review.sha256,'e9bb997595db0a8d165a30fbf38c54ddb4e572402f27d9cb842d4aae8714fe85');assert.equal(receipt.root_preflight.before[path],packet.before.sha256);assert.equal(receipt.root_preflight.after[path],packet.after.sha256);
  assertParent(root,packet.source_commit,packet.source_parent);const before=original(root,packet.source_parent,path),after=replay(before,packet.edits);exact(before,packet.before);exact(after,packet.after);assert.ok(equal(after,original(root,packet.source_commit,path)));
  assert.deepEqual(packet.after,live.signatureBefore);const actual=read(path);exact(actual,live.signatureAfter);live.assertPhysical();
  const old=JSON.parse(before),current=JSON.parse(after);assert.equal(old.differences.length,113);assert.equal(current.differences.length,114);const added=current.differences[0];assert.equal(added.symbol_id,'legacy-table/primary/MatLegacyColumnDef');assert.equal(added.classification,'intentional-legacy-difference');assert.equal(added.historical_signature,'protected method _updateColumnCssClassName():*');assert.equal(added.owned_signature,null);assert.equal(typeof added.rationale,'string');assert.ok(added.rationale.length>0);assert.deepEqual({...current,differences:current.differences.slice(1)},old);
  const qualify=ref=>{
   if(ref===null||typeof ref!=='object')return null;assert.equal(types.isProxy(ref),false,'table reference must not be a proxy');assert.equal(Object.getPrototypeOf(ref),Object.prototype,'table reference must be plain');
   const descriptors=Object.getOwnPropertyDescriptors(ref),pathDescriptor=descriptors.path;if(!pathDescriptor)return null;assert.ok(Object.hasOwn(pathDescriptor,'value'),'table reference path must be data');assert.equal(typeof pathDescriptor.value,'string');if(pathDescriptor.value!==path)return null;
   const keys=Reflect.ownKeys(descriptors);assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),Object.hasOwn(descriptors,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const descriptor of Object.values(descriptors))assert.ok(Object.hasOwn(descriptor,'value')&&descriptor.enumerable,'table reference requires enumerable data');
   const sha256=descriptors.sha256.value,hasBytes=Object.hasOwn(descriptors,'bytes'),bytes=descriptors.bytes?.value;assert.match(sha256,/^[0-9a-f]{64}$/);if(hasBytes)assert.ok(Number.isSafeInteger(bytes)&&bytes>=0);const prior=sha256===packet.before.sha256?packet.before:sha256===packet.after.sha256?packet.after:sha256===live.signatureAfter.sha256?live.signatureAfter:null;assert.ok(prior,'unknown historical-repair table source identity');if(bytes!==undefined)assert.equal(bytes,prior.bytes);
   const fresh=read(path);exact(fresh,live.signatureAfter);live.assertPhysical();return {path,sha256:live.signatureAfter.sha256,...(bytes===undefined?{}:{bytes:live.signatureAfter.bytes})};
  };
  const assertImage=(prior,current)=>{assert.ok(Buffer.isBuffer(prior)&&Buffer.isBuffer(current));exact(prior,packet.before);assert.ok(equal(prior,before),'changed historical table signature comparison');const selected=qualify(packet.before);assert.equal(selected.sha256,live.signatureAfter.sha256);assert.equal(selected.bytes,live.signatureAfter.bytes);exact(current,live.signatureAfter);live.assertPhysical();};
  return Object.freeze({before:Object.freeze({...packet.before}),after:Object.freeze({...live.signatureAfter}),review:Object.freeze({...packet.review}),qualify,assertImage});
}

/** Select the already reviewed source owner for this physical package line. */
export function historicalRepairSelectSourceOwner({root=process.cwd(),read,line}={}){
 root=resolve(root);assert.ok(line==='21.x'||line==='main');const physical=path=>readEvidenceMember(root,path);if(read===undefined)read=physical;assert.equal(typeof read,'function');let select;
 if(line==='main'){
  // Retain the reviewed V7 identity and select the finite V8 continuation.
  // The original successor remains the 21.x route.
  const source={path:'scripts/select-dialog-finite-source-v7.mjs',sha256:'87155482dbaa488a0e72ae0ba75c3edfe370bc11fcfc2ddd1ce3f0190a5609a6',bytes:17719};
  const raw=physical(source.path);exact(raw,source);const module=requireLocal('./select-dialog-finite-source-v7.mjs');
  assert.ok(Object.isFrozen(module.selectDialogFiniteLoadedImage));assert.deepEqual(module.selectDialogFiniteLoadedImage,source);
  assert.equal(hash(functionToString.call(module.selectDialogFiniteSuccessor)),'e6ab419874774e5d1878257c001d4bc24ea298d28072de22134ad0831895eef1','unauthenticated current select source successor');
  const current={path:'scripts/select-dialog-finite-source-v8.mjs',sha256:'7b61b26fb9a07d38c99100193e1b9a918a2ca952608c01ca7c81eed32ed30004',bytes:21123};
  const currentRaw=physical(current.path);exact(currentRaw,current);const next=requireLocal('./select-dialog-finite-source-v8.mjs');
  assert.ok(Object.isFrozen(next.selectDialogFiniteLoadedImage));assert.deepEqual(next.selectDialogFiniteLoadedImage,current);
  assert.equal(hash(functionToString.call(next.selectDialogFiniteSuccessor)),'a96a3c38e6ab001b457b846a87952a9e11e85fd4f9dd8138260e83f312712856','unauthenticated current select source successor');
  const sweepV7=()=>exact(physical(source.path),source);
  const guardedRead=path=>{sweepV7();const value=read(path);sweepV7();return value;};
  const selected=next.selectDialogFiniteSuccessor({root,read:guardedRead,line});
  const wrap=fn=>(...args)=>{sweepV7();const value=fn(...args);sweepV7();return value;};
  select={...selected,bound:[...selected.bound,{...source}],qualify:wrap(selected.qualify),historicalReference:wrap(selected.historicalReference),assertCurrent:wrap(selected.assertCurrent),assertPhysical:wrap(selected.assertPhysical)};
 }else select=selectDialogFiniteSuccessor({root,read,line});
 return select;
}


/** Select the reviewed dialog-focus source owner for this package line. */
export function historicalRepairFocusSourceOwner({root=process.cwd(),read,line}={}){
 root=resolve(root);assert.ok(line==='21.x'||line==='main');
 const physical=path=>readHistoricalContractRepairMember(root,path);
 if(read===undefined)read=physical;
 assert.equal(typeof read,'function');
 // Authenticate the finite declaration roster before any supplied callback.
 const rosterPath='compatibility/rc/parent-dialog-focus-authored-use-successor-v5.json';
 const rosterRaw=physical(rosterPath),rosterHash={'21.x':'9c967f9246bf68cc5e599e6a4fc12c3d8cce40018fe426f1d8db53127f01d956',main:'d244b2cacae1ac2c90898ab76f2f399eb734d2b49c07759ff14424df0cf2d3d4'};
 assert.equal(hash(rosterRaw),rosterHash[line]);
 const declarations=JSON.parse(rosterRaw).branches[line].core_declarations;
 const prefix='node_modules/@angular/core/types/';
 assert.deepEqual(declarations.map(r=>r.path).sort(),[prefix+'_chrome_dev_tools_performance-chunk.d.ts',prefix+(line==='main'?'_debug_node-chunk.d.ts':'_discovery-chunk.d.ts'),prefix+'core.d.ts'].sort());
 const packagePaths=['projects/ngx-material-legacy/package.json','node_modules/@angular/core/package.json'];
 const packages=packagePaths.map(path=>{const bytes=physical(path);return {path,sha256:hash(bytes),bytes:bytes.length};});
 const sweep=()=>{assert.equal(hash(physical(rosterPath)),rosterHash[line]);for(const ref of [...declarations,...packages])exact(physical(ref.path),ref);};
 const guardedRead=path=>{sweep();const value=read(path);sweep();return value;};
 sweep();
 let selected;
 if(line==='21.x')selected=dialogFocusFiniteSourceSuccessor({root,read:guardedRead,line});
 else {
  const source={path:'scripts/dialog-focus-finite-source-v6.mjs',sha256:'c40a155191130898771839bf761183f850d3582fa2298fe2d9b197567c672f56',bytes:13030};
  const raw=physical(source.path);exact(raw,source);
  const module=requireLocal('./dialog-focus-finite-source-v6.mjs');
  assert.ok(Object.isFrozen(module.dialogFocusFiniteLoadedImage));
  assert.deepEqual(module.dialogFocusFiniteLoadedImage,source);
  assert.equal(hash(functionToString.call(module.dialogFocusFiniteSourceSuccessor)),'d1f0240417a224d4a35ac711fbabdfa578e497916119b42ee5b7c9ea02d5da42','unauthenticated current dialog focus source successor');
  selected=module.dialogFocusFiniteSourceSuccessor({root,read:guardedRead,line});
 }
 sweep();
 const bound=new Map(selected.bound.map(ref=>[ref.path,ref]));
 for(const ref of packages){const prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,ref);else bound.set(ref.path,ref);}
 let active=false,violated=false;
 const wrap=fn=>(...args)=>{
  if(active){violated=true;assert.fail('reentrant historical focus source consumption');}
  active=true;violated=false;
  try{sweep();const result=fn(...args);sweep();assert.equal(violated,false,'swallowed historical focus source reentry');return result;}finally{active=false;}
 };
 return {...selected,bound:[...bound.values()].map(ref=>({...ref})),qualify:wrap(selected.qualify),historicalReference:wrap(selected.historicalReference),assertCurrent:wrap(selected.assertCurrent),assertPhysical:wrap(selected.assertPhysical)};
}
const producerIdentityTransitions=Object.freeze([{"path":"scripts/upstream-base-class-removal-source.mjs","after":{"path":"scripts/upstream-base-class-removal-source.mjs","sha256":"2a225cd654fe4940aec34987c7b46453fa624b70743ae5fa63d73ce2341358e2","bytes":12610},"edits":[{"offset":1382,"before":"","after":"export const baseClassRemovalOriginalLoadedImage=Object.freeze({path:SELF,sha256:hash(image),bytes:image.length});\n"}],"before":{"path":"scripts/upstream-base-class-removal-source.mjs","sha256":"1c127473aac8050d206b38c531eb8386492bbc4114acabd7d4a42dd80c30b17b","bytes":12495,"git_blob":"ef9a77b0941e2c257ae8f9c89709b6f3907c39d0"}},{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","after":{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","sha256":"9fb47887c2389e0e40a8ba1fa4e2086e844d96940d82387d8b69c12b739839f0","bytes":22459},"edits":[{"offset":1023,"before":"","after":"export const baseClassRemovalReviewLoadedImage = Object.freeze({path: SELF, sha256: hash(image), bytes: image.length});\n"}],"before":{"path":"compatibility/rc/21x-base-class-removal-source-final-review.mjs","sha256":"67fbedb4ac7310218123d4248f8f93519a9d9c7a03d5ecfccae398f78543084b","bytes":22339,"git_blob":"d9491b9a8cecc5b85ecb23bff81a4887193f3e5e"}}]);
function currentProducerReference(root,line,ref){
 if(line!=='21.x')return ref;
 const row=producerIdentityTransitions.find(row=>row.path===ref.path);if(!row)return ref;
 const before={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes};
 assert.deepEqual(ref,before,'unknown historical-repair producer predecessor');
 const old=original(root,'d8ab97315b6c77b83f42c2bebcf63b2984fff255',row.path);
 assert.equal(hash(old),before.sha256);assert.equal(old.length,before.bytes);
 const edit=row.edits[0],literal=Buffer.from(edit.before);
 assert.ok(equal(old.subarray(edit.offset,edit.offset+literal.length),literal));
 const after=Buffer.concat([old.subarray(0,edit.offset),Buffer.from(edit.after),old.subarray(edit.offset+literal.length)]);
 assert.equal(hash(after),row.after.sha256);assert.equal(after.length,row.after.bytes);
 return row.after;
}

function reviewHistoricalRepairEvidence(candidate, line, readMember, sha256, select) {
  const rows=Array.isArray(candidate?.symbol_uses)?candidate.symbol_uses:[];
  const insufficient=[];
  let reviewed=0;
  for (const row of rows) {
    if (row.disposition !== 'closed' || row.status !== 'reviewed') continue;
    let valid=false;
    try {
      const ref=row.source_review;
      if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('compatibility/f10/authored-use-reviews/')
          || !/^[0-9a-f]{64}$/.test(ref.sha256 || '')) throw Error('missing review');
      const bytes=readMember(ref.path);
      if (!bytes || !bytes.length || sha256(bytes)!==ref.sha256) throw Error('changed review');
      const body=JSON.parse(bytes.toString('utf8'));
      if (body.schema_version!==1 || body.line!==line || body.status!=='reviewed'
          || !Array.isArray(body.reviews)) throw Error('wrong review scope');
      const matches=body.reviews.filter(r=>r.file===row.file && r.module===row.module && r.symbol===row.symbol);
      if (matches.length!==1) throw Error('missing or ambiguous use');
      const review=matches[0];
      if (!['stable-public-peer','owned-replacement','removed-use','test-only'].includes(review.conclusion)
          || typeof review.decision!=='string' || review.decision.trim().length<80
          || typeof review.reviewer!=='string' || !review.reviewer.trim()
          || !Array.isArray(review.independent_evidence) || !review.independent_evidence.length) throw Error('missing source judgment');
      const source=readMember('projects/ngx-material-legacy/'+row.file);
      const sourceRef={path:'projects/ngx-material-legacy/'+row.file,sha256:review.candidate_source_sha256};
      const selected=select.qualify(sourceRef)??sourceRef;
      if (!source || !source.length || !/^[0-9a-f]{64}$/.test(review.candidate_source_sha256 || '')
          || sha256(source)!==selected.sha256) throw Error('stale source');
      if (review.conclusion==='test-only' && !/(?:^|\/)testing\/|\.spec\.ts$/.test(row.file)) throw Error('production use');
      for (const evidence of review.independent_evidence) {
        if (!evidence || typeof evidence.path!=='string' || (evidence.path===ref.path || evidence.path==='projects/ngx-material-legacy/'+row.file)
            || !/^[0-9a-f]{64}$/.test(evidence.sha256 || '')) throw Error('invalid evidence');
        const data=readMember(evidence.path);
        const selected=select.qualify(evidence)??evidence;
        if (!data || !data.length || sha256(data)!==selected.sha256) throw Error('missing or changed independent evidence');
      }
      valid=true;
    } catch { /* Unproved closed labels remain failed. */ }
    if (valid) reviewed++;
    else insufficient.push({file:row.file,module:row.module,symbol:row.symbol});
  }
  return {reviewed,insufficient:insufficient.length,insufficient_uses:insufficient};
}

export function historicalContractRepairSourceSubject({root=process.cwd(),read:providedReadRaw}={}){
 root=resolve(root);assertPlanner(root);const physical=path=>readHistoricalContractRepairMember(root,path),bound=new Map();
 const initialVersion=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;const live=initialVersion.startsWith('22.')?historicalRepairLiveSourceSuccessor({root}):null;
 const providedRead=providedReadRaw===undefined?undefined:path=>{live?.assertPhysical();const value=providedReadRaw(path);live?.assertPhysical();return value;};if(providedReadRaw!==undefined)assert.equal(typeof providedReadRaw,'function');
 if(live)for(const ref of live.bound)bound.set(ref.path,ref);
 const physicalVersion=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 const physicalLine=physicalVersion.startsWith('21.')?'21.x':physicalVersion.startsWith('22.')?'main':null;assert.ok(physicalLine);
 const tabs=tabsFiniteSourceSuccessor({root,read:providedRead??physical,line:physicalLine});
 const select=historicalRepairSelectSourceOwner({root,read:providedRead??physical,line:physicalLine});
 const focus=historicalRepairFocusSourceOwner({root,read:providedRead??physical,line:physicalLine});
 for(const ref of [...tabs.bound,...select.bound,...focus.bound]){const previous=bound.get(ref.path);if(previous)assert.deepEqual(previous,ref,'conflicting finite historical-repair input '+ref.path);else bound.set(ref.path,{...ref});}
 let tableTransition=null;
 const tableCurrent=ref=>tableTransition?.qualify(ref)??null;
 const currentSuccessor=ref=>focus.qualify(ref)??select.qualify(ref)??tableCurrent(ref)??live?.qualify(ref)??null;
 const historicalSuccessor=ref=>focus.historicalReference(ref)??select.historicalReference(ref);
 const read=path=>{
  const actual=physical(path);
  if(providedRead){const provided=providedRead(path);assert.ok(equal(actual,provided),'nonphysical current historical-repair input '+path);}
  assert.ok(equal(actual,physical(path)),'historical-repair input changed during callback '+path);
  const ref=reference(path,actual),previous=bound.get(path);if(previous)assert.deepEqual(ref,previous,'input changed during historical-repair qualification '+path);else bound.set(path,ref);return actual;
 };
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);assert.equal(line,physicalLine,'historical-repair package line changed');
 const raw=read(INPUTS);assert.equal(hash(raw),PINS[line],'changed finite historical-repair input registry');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);
 assert.equal(data.source_scope_only,true);assert.equal(data.canonical_decisions_changed,0);assert.equal(data.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);assert.ok(read(SELF).equals(image),'loaded historical-repair source owner differs from current file');
 if(line==='main'){tableTransition=historicalRepairTableSourceProof({root,live});exact(read(TABLE_PACKET.path),TABLE_PACKET);exact(read(tableTransition.review.path),tableTransition.review);exact(read(tableTransition.after.path),tableTransition.after);}
 const member=ref=>{const prior=currentProducerReference(root,line,ref),tab=tabs.qualify(prior)??prior,selected=select.qualify(tab)??tab,focused=focus.qualify(selected)??selected,expected=tableCurrent(focused)??live?.qualify(focused)??focused;const bytes=read(ref.path);assert.equal(hash(bytes),expected.sha256,'changed historical-repair evidence '+ref.path);if(expected.bytes!==undefined)assert.equal(bytes.length,expected.bytes);return bytes;};
 const implementation=JSON.parse(member(data.implementation)),useQualified=JSON.parse(member(data.current_use_qualification)),useProof=JSON.parse(member(data.current_use_source_proof)),review=JSON.parse(member(data.current_use_review));
 for(const record of [implementation,useQualified,useProof,review])assert.equal(record.line,line,'cross-line historical-repair evidence');
 assert.equal(implementation.g11_claim,'not-passed');assert.equal(implementation.canonical_admission_ready,false);assert.equal(implementation.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 assert.equal(useQualified.independent_review_record_check.reviewed,95);assert.equal(useQualified.independent_review_record_check.insufficient,0);assert.equal(useQualified.controls_rejected,10);
 assert.equal(useProof.existing_reviewed_uses,93);assert.equal(useProof.new_uses,2);assert.equal(useProof.identical_lexical_use_rows,90);assert.equal(useProof.explicit_historical_helper_extraction_rows,3);
 assert.deepEqual(useProof.actual_repair_qualification,data.implementation);assert.equal(review.status,'reviewed');assert.equal(review.reviews.length,95);
 const images=new Map();assert.deepEqual(data.images.map(row=>row.path),SOURCE_PATHS);
 for(const row of data.images){
  const before=original(root,data.repair_baseline_commit,row.path);assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  let expected=before.toString();
  if(row.path===SOURCE_PATHS[4]){
   assert.deepEqual(row.literal_edits,[]);const parsed=JSON.parse(before);assert.equal(parsed.differences.length,114);
   const matching=parsed.differences.filter(item=>JSON.stringify(item)===JSON.stringify(row.removed_api_exception));assert.equal(matching.length,1);
   const removed=matching[0];assert.equal(removed.symbol_id,'legacy-form-field/testing/MatLegacyErrorHarness');assert.equal(removed.owned_signature,null);assert.ok(removed.historical_signature.includes('_getErrorPredicate'));
   parsed.differences=parsed.differences.filter(item=>item!==removed);assert.equal(parsed.differences.length,113);expected=JSON.stringify(parsed,null,2)+'\n';
  }else{
   assert.ok(row.literal_edits.length>0);for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous historical product repair '+row.path);expected=expected.replace(edit.before,edit.after);}
   const applied=implementation.applied.filter(item=>item.path===row.path);assert.equal(applied.length,1);assert.equal(applied[0].before_sha256,row.before.sha256);assert.equal(applied[0].after_sha256,row.after.sha256);
  }
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);const current=member({path:row.path,...row.after});
  if(tableTransition&&row.path===tableTransition.before.path){assert.deepEqual({path:row.path,...row.after},tableTransition.before);tableTransition.assertImage(Buffer.from(expected),current);}
  else{const successor=select.qualify({path:row.path,...row.after})??live?.qualify({path:row.path,...row.after});if(successor){assert.equal(hash(current),successor.sha256);assert.equal(current.length,successor.bytes);}else assert.equal(current.toString(),expected,'current historical repair exceeds its exact reviewed delta');}
  images.set(row.path,{...structuredClone(row)});
 }
 // These two inputs described the original choice of prior caller reviews.
 // They remain authenticated historical metadata, independent of the current
 // roster's later integration. Every product/peer/evidence input stays current.
 const historicalMetadata=new Map();assert.equal(data.historical_roster_context.members.length,2);
 for(const ref of data.historical_roster_context.members){
  assert.ok(['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'].includes(ref.path));
  const before=original(root,data.historical_roster_context.source_parent,ref.path);assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);historicalMetadata.set(ref.path,{...ref});
 }
 // Three acquisition-time audit snapshots describe the recorded review state.
 // The canonical owner validates current state; these are not runtime inputs.
 const canonicalPaths=['compatibility/f10/disposition-ledger/ledger.json','scripts/upstream-source-contract-registry.mjs','compatibility/rc/21x-remaining-disposition-worksheet.json'],canonicalHistory=new Map();
 assert.ok(implementation.source_bindings.length>300);
 for(const ref of implementation.source_bindings){
  if(!canonicalPaths.includes(ref.path)){member(ref);continue;}
  const before=original(root,data.source_parent,ref.path);assert.equal(hash(before),ref.sha256);assert.equal(before.length,ref.bytes);canonicalHistory.set(ref.path,{...ref});
 }
 assert.equal(canonicalHistory.size,line==='21.x'?3:1);
 let currentBindings=0,historicalBindings=0,historicalCanonicalBindings=0;
 for(const ref of useProof.source_bindings){
  const prior=historicalMetadata.get(ref.path);
  if(prior){assert.deepEqual(ref,prior);historicalBindings++;}
  else if(canonicalHistory.has(ref.path)){assert.deepEqual(ref,canonicalHistory.get(ref.path));historicalCanonicalBindings++;}
  else{member(ref);currentBindings++;}
 }
 assert.equal(historicalBindings,2);assert.equal(historicalCanonicalBindings,line==='21.x'?3:1);assert.equal(currentBindings,line==='21.x'?1102:724);
 const known=new Set();
 for(const row of review.reviews){assert.equal(known.has(key(row)),false);known.add(key(row));const source=images.get('projects/ngx-material-legacy/'+row.file);assert.ok(source);assert.equal(row.candidate_source_sha256,source.after.sha256);}
 const reviewed=reviewHistoricalRepairEvidence({symbol_uses:review.reviews.map(row=>({file:row.file,module:row.module,symbol:row.symbol,status:'reviewed',disposition:'closed',source_review:data.current_use_review}))},line,read,hash,{qualify:currentSuccessor});
 assert.equal(reviewed.reviewed,95);assert.equal(reviewed.insufficient,0);
 let active=false;
 const idle=()=>assert.equal(active,false,'reentrant historical repair source operation');
 const selectedReferenceCore=(ref,side)=>{
  const row=images.get(ref.path);if(!row){const selected=side==='after'?currentSuccessor(ref):historicalSuccessor(ref);if(selected){select.assertCurrent();focus.assertCurrent();}return selected;}
  const base={path:ref.path,...row.after},successor=focus.qualify(base)??select.qualify(base)??tableCurrent(base)??live?.qualify(base);const current=successor??row.after;
  const previous=ref.sha256===row.before.sha256?row.before:ref.sha256===row.after.sha256?row.after:ref.sha256===current.sha256?current:null;assert.ok(previous,'unreviewed historical-repair source reference '+ref.path);
  if(ref.bytes!==undefined)assert.equal(ref.bytes,previous.bytes);
  const actual=physical(ref.path);assert.equal(hash(actual),current.sha256,'late actual historical-repair source '+ref.path);assert.equal(actual.length,current.bytes);
  if(providedRead)assert.ok(equal(actual,Buffer.from(providedRead(ref.path))),'nonphysical historical-repair source reference '+ref.path);
  assert.ok(equal(actual,physical(ref.path)),'historical-repair source reference changed during callback '+ref.path);
  const target=side==='after'?current:row.before;return {...ref,sha256:target.sha256,...(ref.bytes===undefined?{}:{bytes:target.bytes})};
 };
 const selectedReference=(ref,side)=>{
  if(!images.has(ref.path)&&!select.qualify(ref)&&!focus.qualify(ref)&&!live?.qualify(ref))return null;
  idle();active=true;try{return selectedReferenceCore(ref,side);}finally{active=false;}
 };
 const qualify=ref=>selectedReference(ref,'after'),historicalReference=ref=>selectedReference(ref,'before');
 const compareSourceReport=(current,historical)=>{idle();active=true;try{
  assert.ok(Array.isArray(historical.current_members)&&historical.current_members.length>1000,'expected complete immutable source boundary');
  const derived=structuredClone(historical);let changed=0,baselineChanged=0,tableAdded=0,tableSeen=0;
  derived.current_members=derived.current_members.map(ref=>{const selected=selectedReferenceCore(ref,'after');if(!selected)return ref;
   if(selected.sha256!==ref.sha256)changed++;
   if(tableTransition&&ref.path===tableTransition.before.path){
    assert.equal(++tableSeen,1,'duplicate historical table source reference');const row=images.get(ref.path);assert.ok(row);
    assert.ok(ref.sha256===row.before.sha256||ref.sha256===row.after.sha256,'unknown historical table report identity');
    if(ref.sha256!==row.after.sha256)baselineChanged++;else tableAdded++;
   }else if(selected.sha256!==ref.sha256)baselineChanged++;
   return selected;});
  assert.equal(baselineChanged,14,'source boundary must contain the exact reviewed original repairs and finite product successors, including the dialog focus pair');assert.equal(changed,14+tableAdded,'unexpected table successor change count');assert.deepEqual(current,derived,'fresh source facts differ beyond the finite qualified reference successors');
  return {current_metadata:derived,historical_comparison:structuredClone(historical),changed_source_references:changed,metadata_comparison_only:true,old_product_bytes_exposed:false};
 }finally{active=false;}};
 const sweep=()=>{for(const ref of bound.values()){const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late historical-repair subject input '+ref.path);assert.equal(actual.length,ref.bytes);}tabs.assertPhysical();select.assertPhysical();focus.assertPhysical();live?.assertPhysical();};
 const guardNode=Object.freeze({dependencies:Object.freeze([]),
  preflight:()=>{idle();assertPlanner(root);sweep();},
  consume:()=>{idle();active=true;try{for(const ref of bound.values()){
   const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late historical-repair subject input '+ref.path);assert.equal(actual.length,ref.bytes);
   if(providedRead)assert.ok(equal(actual,Buffer.from(providedRead(ref.path))),'late nonphysical historical-repair input '+ref.path);
   assert.ok(equal(actual,physical(ref.path)),'historical-repair input changed during callback '+ref.path);
  }}finally{active=false;}},
  final:()=>{idle();sweep();focus.assertCurrent();assertPlanner(root);},
 });
 const composed=planner(Object.freeze([guardNode])),assertCurrent=()=>{idle();composed();};
 const guardPlan=Object.freeze({assertCurrent,node:guardNode});
 assertCurrent();return {line,guardNode,guardPlan,images:structuredClone([...images.values()]),bound:structuredClone([...bound.values()]),qualify,historicalReference,compareSourceReport,assertCurrent,
  current_use_reviews:95,current_use_current_input_bindings:currentBindings,current_use_historical_roster_metadata_inputs:historicalBindings,current_use_historical_canonical_context_inputs:historicalCanonicalBindings,canonical_context_admission_granted:false,
  old_product_bytes_exposed:false,current_read_route_returned:false,canonical_rosters_or_dispositions_changed:false,
  current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
