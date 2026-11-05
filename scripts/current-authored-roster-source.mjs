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
import {authoredUseInventory} from './authored-use-inventory.mjs';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
import {gunzipSync} from 'node:zlib';
import {tabsFiniteSourceSuccessor} from './tabs-finite-source-successor.mjs';
const SELF='scripts/current-authored-roster-source.mjs',INPUTS='compatibility/rc/current-roster-source-epoch-inputs.json';
const PINS={'21.x':'be3d14e06d021555774731308a8a7d416c832ff7f581da938753ea33599fe75f',main:'e2d4a41f20faffc9fb496553f0d263ed3750bc16295ef7361ecf4ebf0077f917'};
const PATHS=['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json'];
const image=readFileSync(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]),readers=new WeakMap(),originals=new Map();
const planner=composeCanonicalSourceGuards,functionToString=Function.prototype.toString,bufferEquals=Buffer.prototype.equals,apply=Reflect.apply;
const equal=(a,b)=>Buffer.isBuffer(b)&&apply(bufferEquals,a,[b]);
const PLANNER=Object.freeze({path:'scripts/canonical-source-guard-plan.mjs',sha256:'4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f',bytes:4609});
function assertPlanner(root){
 assert.equal(composeCanonicalSourceGuards,planner,'changed roster guard planner');
 assert.equal(hash(functionToString.call(planner)),'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947','unauthenticated roster guard planner');
 const raw=readEvidenceMember(root,PLANNER.path);assert.equal(hash(raw),PLANNER.sha256,'changed physical roster guard planner');assert.equal(raw.length,PLANNER.bytes);
}
/**
 * Fresh finite document-at-a-time roster review. The caller owns the reader;
 * this function grants no reader capability, admission or evidence authority.
 */
export function reviewCurrentRosterEvidenceByDocument(candidate, line, readMember, sha256) {
  return reviewRosterEvidenceByDocument(candidate, line, readMember, sha256);
}

// Private owner-only expected-reference selector; public review remains exact.
function reviewRosterEvidenceByDocument(candidate, line, readMember, sha256, expectedSource) {
  // Owned physical-reader failures abort immediately; they are not weaker
  // per-row evidence results. This private marker never escapes the call.
  class ReaderFailure { constructor(error) { this.error = error; } }
  const freshRead = path => { try { return readMember(path); } catch (error) { throw new ReaderFailure(error); } };
  const rows = Array.isArray(candidate?.symbol_uses) ? candidate.symbol_uses : [];
  const groups = new Map(), checked = new Array(rows.length).fill(false);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    // Match the original helper's placement outside its per-row try/catch.
    if (row.disposition !== 'closed' || row.status !== 'reviewed') continue;
    checked[index] = true;
    try {
      const ref = row.source_review;
      if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('compatibility/f10/authored-use-reviews/')
          || !/^[0-9a-f]{64}$/.test(ref.sha256 || '')) throw Error('missing review');
      const items = groups.get(ref.path) ?? [];
      items.push({index, expected: ref.sha256});
      groups.set(ref.path, items);
    } catch { /* This row remains insufficient. */ }
  }
  const valid = new Array(rows.length).fill(false);
  for (const [path, items] of groups) {
    let documentHash, documentBytes, body;
    try {
      const bytes = freshRead(path);
      if (!bytes || !bytes.length) throw Error('missing review');
      documentHash = sha256(bytes);
      documentBytes = bytes.length;
      body = JSON.parse(bytes.toString('utf8'));
    } catch (error) { if (error instanceof ReaderFailure) throw error.error; continue; }
    for (const item of items) {
      const row = rows[item.index];
      try {
        if (documentHash !== item.expected) throw Error('changed review');
        if (body.schema_version !== 1 || body.line !== line || body.status !== 'reviewed'
            || !Array.isArray(body.reviews)) throw Error('wrong review scope');
        const matches = body.reviews.filter(r => r.file === row.file && r.module === row.module && r.symbol === row.symbol);
        if (matches.length !== 1) throw Error('missing or ambiguous use');
        const review = matches[0];
        if (!['stable-public-peer', 'owned-replacement', 'removed-use', 'test-only'].includes(review.conclusion)
            || typeof review.decision !== 'string' || review.decision.trim().length < 80
            || typeof review.reviewer !== 'string' || !review.reviewer.trim()
            || !Array.isArray(review.independent_evidence) || !review.independent_evidence.length) throw Error('missing source judgment');
        const sourcePath = 'projects/ngx-material-legacy/' + row.file;
        const source = freshRead(sourcePath);
        if (!source || !source.length || !/^[0-9a-f]{64}$/.test(review.candidate_source_sha256 || '')) throw Error('stale source');
        const expected = expectedSource ? expectedSource({path:sourcePath,sha256:review.candidate_source_sha256,
          file:row.file,module:row.module,symbol:row.symbol,reviewPath:path,reviewSha256:item.expected}) : review.candidate_source_sha256;
        if (sha256(source) !== expected) throw Error('stale source');
        if (review.conclusion === 'test-only' && !/(?:^|\/)testing\/|\.spec\.ts$/.test(row.file)) throw Error('production use');
        for (const evidence of review.independent_evidence) {
          if (!evidence || typeof evidence.path !== 'string' || (evidence.path === path || evidence.path === 'projects/ngx-material-legacy/' + row.file)
              || !/^[0-9a-f]{64}$/.test(evidence.sha256 || '')) throw Error('invalid evidence');
          const data = freshRead(evidence.path);
          if (!data || !data.length || sha256(data) !== evidence.sha256) throw Error('missing or changed independent evidence');
        }
        valid[item.index] = true;
      } catch (error) { if (error instanceof ReaderFailure) throw error.error; /* Bad metadata leaves this row insufficient. */ }
    }
    // A changed document invalidates every judgment derived from this image.
    try {
      const after = freshRead(path);
      if (!after || after.length !== documentBytes || sha256(after) !== documentHash) throw Error('review changed during group');
    } catch (error) {
      if (error instanceof ReaderFailure) throw error.error;
      for (const item of items) valid[item.index] = false;
    }
    body = undefined;
  }
  const insufficient = [];
  let reviewed = 0;
  for (let index = 0; index < rows.length; index++) {
    if (!checked[index]) continue;
    const row = rows[index];
    if (valid[index]) reviewed++;
    else insufficient.push({file: row.file, module: row.module, symbol: row.symbol});
  }
  return {reviewed, insufficient: insufficient.length, insufficient_uses: insufficient};
}

/** Only readers registered below unwrap; arbitrary callbacks cannot claim this identity. */
export function currentAuthoredRosterRawRead({root=process.cwd(),read}={}){
 root=resolve(root);while(readers.has(read)){const prior=readers.get(read);assert.equal(prior.root,root,'roster reader belongs to another checkout');read=prior.raw;}return read;
}
function original(root,parent,path){
 assert.match(parent,/^[0-9a-f]{40}$/);assert.ok(PATHS.includes(path));const id=JSON.stringify([root,parent,path]);
 if(!originals.has(id)){const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const n of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[n];originals.set(id,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:root,env,maxBuffer:4*1024*1024}));}return Buffer.from(originals.get(id));
}
export function currentAuthoredRosterSourceSubject({root=process.cwd(),read}={}){
 root=resolve(root);assertPlanner(root);read??=path=>readHistoricalContractRepairOwnerMember(root,path);read=currentAuthoredRosterRawRead({root,read});const rawCurrent=read;
 const physical=path=>readHistoricalContractRepairOwnerMember(root,path),physicalVersion=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 const physicalLine=physicalVersion.startsWith('21.')?'21.x':physicalVersion.startsWith('22.')?'main':null;assert.ok(physicalLine);
 const tabs=tabsFiniteSourceSuccessor({root,read:rawCurrent,line:physicalLine}),bound=new Map(tabs.bound.map(ref=>[ref.path,{...ref}]));
 const member=(path,expected)=>{
  const bytes=physical(path),provided=rawCurrent(path);
  assert.ok(equal(bytes,provided),'nonphysical current roster input '+path);
  assert.ok(equal(bytes,physical(path)),'current roster input changed during callback '+path);
  const ref={path,sha256:hash(bytes),bytes:bytes.length},prior=bound.get(path);
  if(prior)assert.deepEqual(ref,prior,'changed repeated current roster input '+path);else bound.set(path,ref);
  if(expected){const prior={path,sha256:expected.sha256,...(expected.bytes===undefined?{}:{bytes:expected.bytes})},qualified=tabs.qualify(prior)??prior;assert.equal(ref.sha256,qualified.sha256,'changed current roster input '+path);if(qualified.bytes!==undefined)assert.equal(ref.bytes,qualified.bytes);}return bytes;
 };
 // Pin the scheduler as a genuine finite member without invoking another owner.
 member(PLANNER.path,PLANNER);
 const version=JSON.parse(member('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);assert.equal(line,physicalLine);const data=JSON.parse(member(INPUTS,{sha256:PINS[line]}));assert.equal(data.schema_version,1);assert.equal(data.line,line);assert.equal(data.source_scope_only,true);assert.equal(data.reader_implementation_qualified,false);assert.equal(data.full_current_owner_or_native_packed_browser_floor_or_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.deepEqual(data.before_rosters.map(r=>r.path),PATHS);assert.deepEqual(data.after_rosters.map(r=>r.path),PATHS);assert.ok(member(SELF).equals(image),'loaded roster subject differs from actual file');assert.equal(process.versions.node,JSON.parse(member('toolchain-lock.json')).repository.node);
 const before=new Map(),beforeDocs=[],afterDocs=[];
 for(let i=0;i<PATHS.length;i++){const old=original(root,data.before_source_parent,PATHS[i]),ref=data.before_rosters[i];assert.equal(hash(old),ref.sha256);assert.equal(old.length,ref.bytes);before.set(PATHS[i],old);beforeDocs.push(JSON.parse(old));afterDocs.push(JSON.parse(member(PATHS[i],data.after_rosters[i])));}
 const evidence=data.current_evidence.map(ref=>JSON.parse(member(ref.path,ref)));assert.equal(evidence[0].line,line);assert.equal(evidence[0].status,'reviewed');assert.equal(evidence[0].reviews.length,176);
 // Current proof dependencies are read as current bytes. Historical acquisition
 // snapshots remain inside those immutable proof documents, never a public read.
 for(const proof of evidence.slice(2)){assert.equal(proof.line,line);for(const ref of proof.source_bindings)member(ref.path,ref);}
 const current=scanCurrentAuthoredUses({root,readSource:path=>member(path)}),[frozen,additional]=afterDocs,[oldFrozen,oldAdditional]=beforeDocs;
 const scan=JSON.parse(gunzipSync(member(tabs.facts.scan_path))),independent=JSON.parse(gunzipSync(member(tabs.facts.review_path)));
 assert.equal(scan.previous.population_sha256,tabs.facts.old_population_sha256);assert.equal(scan.current.population_sha256,tabs.facts.current_population_sha256);
 assert.equal(additional.current_source_population_sha256,scan.previous.population_sha256);
 assert.deepEqual(current.source_files,scan.full_current_scan.source_files);assert.deepEqual(current.symbol_uses,scan.full_current_scan.symbol_uses);assert.equal(current.source_population_sha256,scan.current.population_sha256);
 const reviewRows=tabs.facts.review_rows,reviewByKey=new Map(reviewRows.map(row=>[key(row),row]));assert.equal(reviewRows.length,43);assert.equal(reviewByKey.size,43);
 const independentRows=independent.rows[line==='21.x'?'21':'main'];assert.equal(independentRows.length,43);
 for(const row of independentRows){const approved=reviewByKey.get(key(row));assert.ok(approved);assert.equal(approved.reviewPath,row.original_review.path);assert.equal(approved.reviewSha256,row.original_review.sha256);assert.equal(approved.beforeSha256,row.original_review_source_sha256);assert.equal(approved.retained_removed,row.retained_removed);assert.ok(typeof row.reason==='string'&&row.reason.length>50);}
 const observedKeys=new Set(current.symbol_uses.map(key));for(const row of reviewRows)assert.equal(observedKeys.has(key(row)),!row.retained_removed);

 const seedPath=frozen.frozen_roster.path,seedRaw=member(seedPath,frozen.frozen_roster),seed=JSON.parse(seedRaw);assert.equal(seed.symbol_uses.length,1736);
 assert.equal(oldFrozen.symbol_uses.length,1736);assert.equal(oldAdditional.symbol_uses.length,315);assert.equal(frozen.symbol_uses.length,1736);assert.equal(additional.symbol_uses.length,317);
 assert.deepEqual(frozen.symbol_uses.map(key),oldFrozen.symbol_uses.map(key));assert.deepEqual(additional.symbol_uses.slice(0,315).map(key),oldAdditional.symbol_uses.map(key));assert.equal(new Set(additional.symbol_uses.map(key)).size,317);assert.deepEqual(additional.retained_removed_additional_uses,oldAdditional.retained_removed_additional_uses);assert.equal(additional.retained_removed_additional_uses.length,2);
 assert.equal(current.source_files.length,532);assert.equal(current.symbol_uses.length,1965);assert.equal(additional.current_uses,current.symbol_uses.length);assert.equal(additional.current_source_files,current.source_files.length);assert.equal(tabs.facts.current_population_sha256,current.source_population_sha256);
 const seedKeys=new Set(seed.symbol_uses.map(key)),live=current.symbol_uses.filter(r=>!seedKeys.has(key(r))),actual=new Map(live.map(r=>[key(r),r])),retired=new Map(additional.retained_removed_additional_uses.map(r=>[key(r),r]));assert.equal(live.length,315);assert.equal(additional.live_symbol_use_count,315);assert.equal(additional.symbol_use_count,317);
 for(const row of additional.symbol_uses){const now=actual.get(key(row));if(now){const ref={path:'projects/ngx-material-legacy/'+row.file,sha256:row.candidate_source_sha256},qualified=tabs.qualify(ref)??ref;assert.equal(qualified.sha256,now.candidate_source_sha256);assert.deepEqual(row.occurrences,now.occurrences);}else{assert.ok(retired.has(key(row)));assert.deepEqual(row.occurrences,[]);const ref={path:'projects/ngx-material-legacy/'+row.file,sha256:row.candidate_source_sha256},qualified=tabs.qualify(ref)??ref;assert.equal(qualified.sha256,hash(member(ref.path)));}}
 const expected=new Map(oldAdditional.symbol_uses.map(r=>[key(r),r]));for(const row of live)expected.set(key(row),row);const fi=authoredUseInventory(seed.symbol_uses,frozen),ai=authoredUseInventory([...expected.values()],additional);assert.ok(fi.complete&&ai.complete);assert.equal(fi.open,0);assert.equal(ai.open,0);
 const seenReviewKeys=new Set(),expectedSource=request=>{const approved=reviewByKey.get(key(request));if(!approved){assert.ok(!request.path.endsWith('/legacy-tabs/internal/tab-body-base.ts')&&!request.path.endsWith('/legacy-tabs/internal/tab-group-base.ts'),'unreviewed tabs use');return request.sha256;}
  assert.equal(request.path,'projects/ngx-material-legacy/'+approved.file);assert.equal(request.sha256,approved.beforeSha256);assert.equal(request.reviewPath,approved.reviewPath);assert.equal(request.reviewSha256,approved.reviewSha256);assert.equal(seenReviewKeys.has(key(request)),false);seenReviewKeys.add(key(request));const qualified=tabs.qualify({path:request.path,sha256:request.sha256});assert.ok(qualified);return qualified.sha256;};
 const fe=reviewRosterEvidenceByDocument(frozen,line,p=>member(p),hash,expectedSource),ae=reviewRosterEvidenceByDocument(additional,line,p=>member(p),hash,expectedSource);assert.equal(seenReviewKeys.size,43);assert.equal(fe.reviewed,1736);assert.equal(ae.reviewed,317);assert.equal(fe.insufficient,0);assert.equal(ae.insufficient,0);
 const sweep=()=>{for(const ref of bound.values()){const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'physical current roster input '+ref.path);assert.equal(actual.length,ref.bytes);}tabs.assertPhysical();};
 let consuming=false;
 const idle=()=>assert.equal(consuming,false,'reentrant current roster consumption');
 const guardNode=Object.freeze({dependencies:Object.freeze([]),
  preflight:()=>{idle();assertPlanner(root);sweep();},
  consume:()=>{idle();consuming=true;try{for(const ref of bound.values()){
   const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late current roster input '+ref.path);assert.equal(actual.length,ref.bytes);
   const provided=rawCurrent(ref.path);assert.ok(equal(actual,provided),'nonphysical or late current roster input '+ref.path);
   assert.ok(equal(actual,physical(ref.path)),'current roster input changed during callback '+ref.path);
  }}finally{consuming=false;}},
  final:()=>{idle();sweep();assertPlanner(root);},
 });
 const composed=planner(Object.freeze([guardNode]));
 const assertCurrent=()=>{idle();composed();},guardPlan=Object.freeze({assertCurrent,node:guardNode});
 const side=(ref,target)=>{const index=PATHS.indexOf(ref.path);if(index<0)return null;const old=data.before_rosters[index],current=data.after_rosters[index],selected=ref.sha256===old.sha256?old:ref.sha256===current.sha256?current:null;assert.ok(selected,'unknown roster metadata reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,selected.bytes);assertCurrent();const to=target==='before'?old:current;return {...ref,sha256:to.sha256,...(ref.bytes===undefined?{}:{bytes:to.bytes})};};
 const metadataRead=path=>{if(!before.has(path))return rawCurrent(path);assertCurrent();return Buffer.from(before.get(path));};readers.set(metadataRead,{root,raw:rawCurrent});assertCurrent();
 return {root,line,metadataRead,raw:rawCurrent,assertCurrent,guardNode,guardPlan,qualify:ref=>side(ref,'after'),historicalReference:ref=>side(ref,'before'),before:structuredClone(data.before_rosters),after:structuredClone(data.after_rosters),bound:structuredClone([...bound.values()]),current_graph:{files:532,uses:1965,frozen:1736,additional_obligations:317,live_additional_uses:315,retirements:2},historical_metadata_paths:[...PATHS],product_or_program_before_images_exposed:false,current_source_read_uses_historical_projection:false,full_shipped_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
