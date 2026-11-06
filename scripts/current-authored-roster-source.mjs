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
import {selectDialogFiniteSuccessor} from './select-dialog-finite-source-successor.mjs';
import {dialogFocusFiniteSourceSuccessor} from './dialog-focus-finite-source-successor.mjs';
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
function reviewRosterEvidenceByDocument(candidate, line, readMember, sha256, expectedSource, expectedEvidence) {
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
          if (!data || !data.length || sha256(data) !== (expectedEvidence ? expectedEvidence(evidence) : evidence.sha256)) throw Error('missing or changed independent evidence');
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
 const physical=path=>path.startsWith('node_modules/@angular/core/types/')?readFileSync(resolve(root,path)):readHistoricalContractRepairOwnerMember(root,path),physicalVersion=JSON.parse(physical('projects/ngx-material-legacy/package.json')).version;
 const physicalLine=physicalVersion.startsWith('21.')?'21.x':physicalVersion.startsWith('22.')?'main':null;assert.ok(physicalLine);
 const tabs=tabsFiniteSourceSuccessor({root,read:rawCurrent,line:physicalLine}),product=selectDialogFiniteSuccessor({root,read:rawCurrent,line:physicalLine}),focus=dialogFocusFiniteSourceSuccessor({root,read:rawCurrent,line:physicalLine}),bound=new Map([...tabs.bound,...product.bound,...focus.bound].map(ref=>[ref.path,{...ref}]));
 let fixtureTransition;
 const member=(path,expected)=>{
  const bytes=physical(path),provided=rawCurrent(path);
  assert.ok(equal(bytes,provided),'nonphysical current roster input '+path);
  assert.ok(equal(bytes,physical(path)),'current roster input changed during callback '+path);focus.assertPhysical();
  const ref={path,sha256:hash(bytes),bytes:bytes.length},prior=bound.get(path);
  if(prior)assert.deepEqual(ref,prior,'changed repeated current roster input '+path);else bound.set(path,ref);
  if(expected){const prior={path,sha256:expected.sha256,...(expected.bytes===undefined?{}:{bytes:expected.bytes})},tabsRef=tabs.qualify(prior)??prior,productRef=product.qualify(tabsRef)??tabsRef,focusRef=focus.qualify(productRef)??productRef,qualified=fixtureTransition&&path===fixtureTransition.path&&focusRef.sha256===fixtureTransition.before.sha256?fixtureTransition.after:focusRef;assert.equal(ref.sha256,qualified.sha256,'changed current roster input '+path);if(qualified.bytes!==undefined)assert.equal(ref.bytes,qualified.bytes);}return bytes;
 };
 // Pin the scheduler as a genuine finite member without invoking another owner.
 member(PLANNER.path,PLANNER);
 const version=JSON.parse(member('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);assert.equal(line,physicalLine);const data=JSON.parse(member(INPUTS,{sha256:PINS[line]}));assert.equal(data.schema_version,1);assert.equal(data.line,line);assert.equal(data.source_scope_only,true);assert.equal(data.reader_implementation_qualified,false);assert.equal(data.full_current_owner_or_native_packed_browser_floor_or_audit_qualified,false);assert.equal(data.g11_claim,'not-passed');
 assert.deepEqual(data.before_rosters.map(r=>r.path),PATHS);assert.deepEqual(data.after_rosters.map(r=>r.path),PATHS);assert.ok(member(SELF).equals(image),'loaded roster subject differs from actual file');assert.equal(process.versions.node,JSON.parse(member('toolchain-lock.json')).repository.node);
 const before=new Map(),beforeDocs=[],afterDocs=[];
 for(let i=0;i<PATHS.length;i++){const old=original(root,data.before_source_parent,PATHS[i]),ref=data.before_rosters[i];assert.equal(hash(old),ref.sha256);assert.equal(old.length,ref.bytes);before.set(PATHS[i],old);beforeDocs.push(JSON.parse(old));afterDocs.push(JSON.parse(member(PATHS[i],data.after_rosters[i])));}
 const dialogPacket=JSON.parse(member('compatibility/rc/parent-dialog-menu-snack-d61-menu-authored-use-successor-v4.json',{sha256:'67861dc8b64cdfcd7f9792065b755084a51e25490bab46c6f71ac6b47d122e35',bytes:301398}));
 fixtureTransition=dialogPacket.branches[line].fixture_source_transition;assert.equal(fixtureTransition.path,'scripts/packed-consumer-aot-smoke.mjs');assert.match(fixtureTransition.source_parent,/^[0-9a-f]{40}$/);assert.ok(fixtureTransition.reason.length>100);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};for(const name of Object.keys(env))if(name.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(name))delete env[name];
 const fixtureBefore=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',fixtureTransition.source_parent+':'+fixtureTransition.path],{cwd:root,env,maxBuffer:2000000});assert.equal(hash(fixtureBefore),fixtureTransition.before.sha256);assert.equal(fixtureBefore.length,fixtureTransition.before.bytes);
 const fixtureText=fixtureBefore.toString();assert.equal(fixtureText.split(fixtureTransition.literal_before).length,2);const fixtureAfter=Buffer.from(fixtureText.replace(fixtureTransition.literal_before,fixtureTransition.literal_after));assert.equal(hash(fixtureAfter),fixtureTransition.after.sha256);assert.equal(fixtureAfter.length,fixtureTransition.after.bytes);assert.ok(equal(fixtureAfter,member(fixtureTransition.path,fixtureTransition.after)));
 const evidence=data.current_evidence.map(ref=>JSON.parse(member(ref.path,ref)));assert.equal(evidence[0].line,line);assert.equal(evidence[0].status,'reviewed');assert.equal(evidence[0].reviews.length,176);
 // Current proof dependencies are read as current bytes. Historical acquisition
 // snapshots remain inside those immutable proof documents, never a public read.
 for(const proof of evidence.slice(2)){assert.equal(proof.line,line);for(const ref of proof.source_bindings)member(ref.path,ref);}
 const focusCurrent=scanCurrentAuthoredUses({root,readSource:path=>member(path)}),[frozen,additional]=afterDocs,[oldFrozen,oldAdditional]=beforeDocs;
 const focusDelta=focus.delta,focusKey=r=>JSON.stringify([r.file,r.module,r.symbol]);
 assert.equal(focusCurrent.source_files.length,focusDelta.source_files);assert.equal(focusCurrent.symbol_uses.length,focusDelta.current_uses);assert.equal(focusCurrent.source_population_sha256,focusDelta.current_population_sha256);
 const focusMap=new Map(focusCurrent.symbol_uses.map(r=>[focusKey(r),r]));assert.equal(focusMap.size,focusDelta.current_uses);
 for(const row of focusDelta.changed_uses){assert.ok(['legacy-dialog/internal/dialog-container-base.ts','legacy-dialog/dialog-container.ts'].includes(row.before.file));assert.equal(focusKey(row.before),focusKey(row.after));assert.deepEqual(focusMap.get(focusKey(row.after)),row.after);focusMap.set(focusKey(row.before),row.before);}
 for(const row of focusDelta.added_uses){assert.equal(row.file,'legacy-dialog/internal/dialog-container-base.ts');assert.equal(row.module,'@angular/core');assert.deepEqual(focusMap.get(focusKey(row)),row);focusMap.delete(focusKey(row));}
 assert.deepEqual(focusDelta.removed_uses,[]);assert.equal(focusMap.size,focusDelta.previous_uses);
 const focusPreviousFiles=focusCurrent.source_files.map(ref=>focus.historicalReference(ref)??ref);
 assert.equal(hash(JSON.stringify(focusPreviousFiles)),focusDelta.previous_population_sha256);
 const actualCurrent={...focusCurrent,source_files:focusPreviousFiles,source_population_sha256:focusDelta.previous_population_sha256,symbol_uses:[...focusMap.values()].sort((a,b)=>focusKey(a).localeCompare(focusKey(b),'en'))};
 assert.equal(actualCurrent.symbol_uses.length,focusDelta.previous_uses);

 const scan=JSON.parse(gunzipSync(member(tabs.facts.scan_path))),independent=JSON.parse(gunzipSync(member(tabs.facts.review_path)));
 assert.equal(dialogPacket.schema_version,1);assert.equal(dialogPacket.role,'finite-dialog-menu-snack-d61-menu-authored-use-successor');assert.equal(dialogPacket.source_scope_only,true);assert.equal(dialogPacket.g11_claim,'not-passed');
 assert.equal(dialogPacket.review.status,'reviewed');assert.equal(dialogPacket.review.conclusion,'stable-public-peer');assert.ok(dialogPacket.review.decision.length>200);
 const previousSnack={path:'compatibility/rc/parent-dialog-menu-snack-authored-use-successor-v3.json',sha256:'fe9c5083488d36d07d5c484e55227ea678ec7461eda0d70a38908165d3e063bd',bytes:178143};assert.deepEqual(dialogPacket.previous_packet,previousSnack);const priorSnack=JSON.parse(member(previousSnack.path,previousSnack));
 const previousMenu={path:'compatibility/rc/parent-dialog-menu-authored-use-successor-v2.json',sha256:'69fb6612b94b57972263e9eaff6a921ca611aa105c13a1119e3cd970994b35f2',bytes:121240};assert.deepEqual(priorSnack.previous_packet,previousMenu);const priorMenu=JSON.parse(member(previousMenu.path,previousMenu));const previousDialog={path:'compatibility/rc/parent-dialog-authored-use-successor-v1.json',sha256:'4b0a963c28b4d51c006ee8b6ddee599cbf0113cb88ed343f7c2af951bc7dae75',bytes:37108};assert.deepEqual(priorMenu.previous_packet,previousDialog);const priorDialog=JSON.parse(member(previousDialog.path,previousDialog));
 const successor=dialogPacket.branches[line],current=scan.full_current_scan,priorSuccessor=priorSnack.branches[line],delta=successor.d61_menu_delta;const {d61_menu_delta,...retained}=successor;assert.deepEqual(retained,priorSuccessor);assert.equal(delta.previous_population_sha256,priorSuccessor.current_population_sha256);assert.equal(delta.current_population_sha256,actualCurrent.source_population_sha256);assert.equal(delta.changed_uses.length,55);assert.equal(delta.removed_uses.length,1);assert.deepEqual(delta.added_uses,[]);assert.deepEqual([delta.removed_uses[0].file,delta.removed_uses[0].module,delta.removed_uses[0].symbol],['legacy-dialog/internal/dialog-base.ts','@angular/cdk/dialog','DialogRef']);assert.deepEqual(successor.changed_uses.filter(row=>!row.before.file.startsWith('legacy-snack-bar/')),priorMenu.branches[line].changed_uses);assert.deepEqual(priorMenu.branches[line].changed_uses.filter(row=>row.before.file==='legacy-dialog/internal/dialog-base.ts'),priorDialog.branches[line].changed_uses);assert.deepEqual(successor.retained_removed_reviews,priorMenu.branches[line].retained_removed_reviews);assert.deepEqual(successor.added_uses,priorDialog.branches[line].added_uses);assert.deepEqual(successor.fixture_source_transition,priorDialog.branches[line].fixture_source_transition);assert.deepEqual(successor.core_declarations,priorDialog.branches[line].core_declarations);assert.equal(successor.old_population_sha256,current.source_population_sha256);assert.equal(successor.current_population_sha256,delta.previous_population_sha256);
 const declaration=member(successor.core_declarations.path,successor.core_declarations).toString();
 for(const symbol of ['assertInInjectionContext','runInInjectionContext']){const pattern=new RegExp('/\\*\\*((?:(?!/\\*\\*|\\*/)[^])*)\\*/\\s*declare function '+symbol+'\\b');const match=declaration.match(pattern);assert.ok(match&&match[1].includes('@publicApi')&&!match[1].includes('@deprecated')&&!match[1].includes('@docs-private'),'missing stable public core declaration '+symbol);assert.match(declaration,new RegExp('export \\{[^}]*\\b'+symbol+'\\b'));}
 assert.equal(successor.changed_uses.length,81);assert.equal(successor.added_uses.length,2);const changes=new Map(successor.changed_uses.map(row=>[key(row.before),row]));assert.equal(changes.size,81);assert.equal(successor.changed_uses.filter(row=>row.before.file==='legacy-snack-bar/internal/snack-bar-base.ts').length,24);assert.equal(successor.changed_uses.filter(row=>row.before.file==='legacy-snack-bar/snack-bar-container.ts').length,3);assert.equal(successor.changed_uses.filter(row=>row.before.file==='legacy-menu/internal/menu-trigger-base.ts').length,39);
 const added=new Map(successor.added_uses.map(row=>[key(row),row]));assert.equal(added.size,2);assert.deepEqual([...added.values()].map(row=>row.symbol).sort(),['assertInInjectionContext','runInInjectionContext']);
 const actualByKey=new Map(actualCurrent.symbol_uses.map(row=>[key(row),row]));assert.equal(actualByKey.size,1966);const projectedByKey=new Map(actualByKey);for(const row of delta.changed_uses){assert.deepEqual(actualByKey.get(key(row.after)),row.after);assert.equal(key(row.before),key(row.after));assert.ok(['legacy-dialog/internal/dialog-base.ts','legacy-menu/internal/menu-trigger-base.ts'].includes(row.before.file));projectedByKey.set(key(row.before),row.before);}for(const row of delta.removed_uses){assert.equal(actualByKey.has(key(row)),false);projectedByKey.set(key(row),row);}assert.equal(projectedByKey.size,1967);assert.equal(current.symbol_uses.length,1965);
 for(const old of current.symbol_uses){const change=changes.get(key(old)),now=projectedByKey.get(key(old));if(change){assert.ok(['legacy-dialog/internal/dialog-base.ts','legacy-menu/internal/menu-trigger-base.ts','legacy-snack-bar/internal/snack-bar-base.ts','legacy-snack-bar/snack-bar-container.ts'].includes(old.file));assert.deepEqual(old,change.before);assert.deepEqual(now,change.after);const ref=product.qualify({path:'projects/ngx-material-legacy/'+old.file,sha256:old.candidate_source_sha256});assert.equal(ref.sha256,hash(member(ref.path)));}else assert.deepEqual(now,old);}
 for(const row of added.values()){assert.equal(row.file,'legacy-dialog/internal/dialog-base.ts');assert.equal(row.module,'@angular/core');assert.deepEqual(projectedByKey.get(key(row)),row);assert.ok(!current.symbol_uses.some(old=>key(old)===key(row)));}
 assert.deepEqual(actualCurrent.source_files,current.source_files.map(ref=>{const next=product.qualify(ref);return next??ref;}));assert.equal(actualCurrent.compiler,current.compiler);assert.equal(actualCurrent.schema_version,current.schema_version);

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
 const retainedMenu=new Map(successor.retained_removed_reviews.map(row=>[key(row),row]));assert.equal(retainedMenu.size,2);for(const row of retainedMenu.values())assert.ok(!actualByKey.has(key(row)));
 const seenRetired=new Set(),seenReviewKeys=new Set(),expectedSource=request=>{const approved=reviewByKey.get(key(request));if(!approved){const retired=retainedMenu.get(key(request));if(retired){assert.equal(seenRetired.has(key(request)),false);seenRetired.add(key(request));assert.equal(request.path,'projects/ngx-material-legacy/'+retired.file);assert.equal(request.sha256,retired.before_sha256);assert.equal(request.reviewPath,retired.reviewPath);assert.equal(request.reviewSha256,retired.reviewSha256);const qualified=product.qualify({path:request.path,sha256:request.sha256});assert.ok(qualified);return qualified.sha256;}const dialog=changes.get(key(request));if(dialog){assert.equal(request.sha256,dialog.before.candidate_source_sha256);const qualified=product.qualify({path:request.path,sha256:request.sha256});assert.ok(qualified);return qualified.sha256;}assert.ok(!request.path.endsWith('/legacy-tabs/internal/tab-body-base.ts')&&!request.path.endsWith('/legacy-tabs/internal/tab-group-base.ts'),'unreviewed tabs use');const focused=focus.qualify({path:request.path,sha256:request.sha256});return focused?.sha256??request.sha256;}
  assert.equal(request.path,'projects/ngx-material-legacy/'+approved.file);assert.equal(request.sha256,approved.beforeSha256);assert.equal(request.reviewPath,approved.reviewPath);assert.equal(request.reviewSha256,approved.reviewSha256);assert.equal(seenReviewKeys.has(key(request)),false);seenReviewKeys.add(key(request));const qualified=tabs.qualify({path:request.path,sha256:request.sha256});assert.ok(qualified);return qualified.sha256;};
 const expectedEvidence=ref=>{if(ref.path===fixtureTransition.path&&ref.sha256===fixtureTransition.before.sha256)return fixtureTransition.after.sha256;return (product.qualify(ref)??ref).sha256;};
 const fe=reviewRosterEvidenceByDocument(frozen,line,p=>member(p),hash,expectedSource,expectedEvidence),ae=reviewRosterEvidenceByDocument(additional,line,p=>member(p),hash,expectedSource,expectedEvidence);assert.equal(seenRetired.size,2);assert.equal(seenReviewKeys.size,43);assert.equal(fe.reviewed,1736);assert.equal(ae.reviewed,317);assert.equal(fe.insufficient,0);assert.equal(ae.insufficient,0);
 const sweep=()=>{for(const ref of bound.values()){const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'physical current roster input '+ref.path);assert.equal(actual.length,ref.bytes);}tabs.assertPhysical();product.assertPhysical();focus.assertPhysical();};
 let consuming=false;
 const idle=()=>assert.equal(consuming,false,'reentrant current roster consumption');
 const guardNode=Object.freeze({dependencies:Object.freeze([]),
  preflight:()=>{idle();assertPlanner(root);sweep();},
  consume:()=>{idle();consuming=true;try{for(const ref of bound.values()){
   const actual=physical(ref.path);assert.equal(hash(actual),ref.sha256,'late current roster input '+ref.path);assert.equal(actual.length,ref.bytes);
   const provided=ref.path.startsWith('node_modules/@angular/core/types/')?actual:rawCurrent(ref.path);assert.ok(equal(actual,provided),'nonphysical or late current roster input '+ref.path);
   assert.ok(equal(actual,physical(ref.path)),'current roster input changed during callback '+ref.path);focus.assertPhysical();
  }}finally{consuming=false;}},
  final:()=>{idle();sweep();assertPlanner(root);},
 });
 const composed=planner(Object.freeze([guardNode]));
 const assertCurrent=()=>{idle();composed();},guardPlan=Object.freeze({assertCurrent,node:guardNode});
 const side=(ref,target)=>{const index=PATHS.indexOf(ref.path);if(index<0)return null;const old=data.before_rosters[index],current=data.after_rosters[index],selected=ref.sha256===old.sha256?old:ref.sha256===current.sha256?current:null;assert.ok(selected,'unknown roster metadata reference');if(ref.bytes!==undefined)assert.equal(ref.bytes,selected.bytes);assertCurrent();const to=target==='before'?old:current;return {...ref,sha256:to.sha256,...(ref.bytes===undefined?{}:{bytes:to.bytes})};};
 const metadataRead=path=>{if(!before.has(path))return rawCurrent(path);assertCurrent();return Buffer.from(before.get(path));};readers.set(metadataRead,{root,raw:rawCurrent});assertCurrent();
 return {root,line,metadataRead,raw:rawCurrent,assertCurrent,guardNode,guardPlan,qualify:ref=>side(ref,'after'),historicalReference:ref=>side(ref,'before'),before:structuredClone(data.before_rosters),after:structuredClone(data.after_rosters),bound:structuredClone([...bound.values()]),current_graph:{files:focusCurrent.source_files.length,uses:focusCurrent.symbol_uses.length,frozen:1736,additional_obligations:319+focusDelta.added_uses.length,live_additional_uses:317+focusDelta.added_uses.length,retirements:3,reviewed_legacy_additional_uses:317,unreviewed_focus_additions:focusDelta.added_uses.length},focus_delta:{changed_uses:focusDelta.changed_uses.length,added_uses:focusDelta.added_uses.length,removed_uses:focusDelta.removed_uses.length},historical_metadata_paths:[...PATHS],product_or_program_before_images_exposed:false,current_source_read_uses_historical_projection:false,full_shipped_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
