/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five individual source decisions; no native, packed, floor or audit credit. */
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,lstatSync,realpathSync}=require('node:fs');
const {join,resolve,relative,isAbsolute}=require('node:path');
const {gunzipSync}=require('node:zlib');
const {isDeepStrictEqual}=require('node:util');
const {m3MeasurementSourceEpoch,historicalM3MeasurementView,M3_PORTABLE_WITNESSES,M3_TRANSPORT_CODE}=require('./m3-measurement-transport.mjs');
const {currentM3ThemeBoundarySubject,M3_CURRENT_ABSENT}=require('./current-m3-theme-boundary-contract.mjs');
const {canonicalSourcePhysicalBoundary}=require('./current-sass-canonical-source-boundary.mjs');
const {captureCurrentSassMetadata}=require('./current-sass-inspection-scope.mjs');
const {types}=require('node:util');
const {measureM3ThemeBoundary}=require('./measure-m3-theme-boundary-contracts.mjs');
const functionToString=Function.prototype.toString;
const producerImage=readFileSync(join(__dirname,'measure-m3-theme-boundary-contracts.mjs'));
const ROOT=resolve(__dirname,'..'),PREFIX='compatibility/rc/21x-c04-m3-theme-boundary-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='1471cf3de35c1bf86d13e993c9f55f0cef6849dab20ffdd7b4fcc62f74ec044a';
const QUALIFICATION=PREFIX+'source-qualification.json',QUALIFICATION_HASH='37d3b1eaa7a4468b48c90435e4d50b5d08053914ff3cb9f6ee2f57505c52ec17';
const KIND='individual-historical-m3-theme-boundary-source-review';
const DIFFS={
 '3f544ef015fbb8c56e991d4e0a9a539d9e153577':'9619b61081734580da4f2392b7eb3ecc8459679edc709880cacc0aecf6d7ae13',
 '027b171c91fc880aef3b3a66cb7c5d0f5c419501':'c0d09827cbd22096d07183fae07efa3b1bf050a351434d5ba0ee334b88090cc6',
 '305af4f0e0e0f68e929b6aeb328296ac42295c16':'f174544911a30f12b701b9347c2698659780244634ca74f17e7c710df692c40b',
 '0df4d082e0aab1958fdbe5aa48fef0203079abc2':'1222990f3a58fa9576799b7eebc240d97d533a08c0d1a28ee5c260f58af28ac8',
 '32981cc4500a8c0065574bfb1357d2d8a78494de':'7140a509daebc9ef1a81e640c4dc150ffca847b4edeee450fbba595cd394171e',
};
const hash=raw=>createHash('sha256').update(raw).digest('hex'),measurements=new WeakMap();
function regular(root,path){
 if(path==='node_modules/@angular/core/package.json'||/^node_modules\/sass\/(?:package\.json|sass\.node\.js|sass\.dart\.js)$/.test(path))return require('./historical-contract-repair-readers.mjs').readHistoricalContractRepairOwnerMember(root,path);
 assert.ok(typeof path==='string'&&!path.includes('\\'));const parts=path.split('/');assert.ok(parts.every(part=>part&&part!=='.'&&part!=='..'));
 const peer=path.match(/^node_modules\/@angular\/(material|cdk)\/(.+)$/);let file=root,tail=parts;
 if(peer){file=realpathSync(join(root,'node_modules/@angular',peer[1]));tail=peer[2].split('/');}
 assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());const base=file;
 for(const part of tail){file=join(file,part);assert.equal(lstatSync(file).isSymbolicLink(),false);}
 const rel=relative(base,realpathSync(file));assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'));assert.ok(lstatSync(file).isFile());return readFileSync(file);
}
const defaultRead=path=>regular(ROOT,path);
function boundaryProof(row){
 assert.ok(Object.hasOwn(DIFFS,row.sha));assert.equal(row.diff_sha256,DIFFS[row.sha]);
 return {proof_kind:KIND,diff_sha256:DIFFS[row.sha],review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  m3_theme_boundary_source_scope:{sha:row.sha,review:{path:REVIEW,sha256:REVIEW_HASH},qualification:{path:QUALIFICATION,sha256:QUALIFICATION_HASH},
   source_scope_only:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false}};
}
/** Pure completion metadata. No filesystem, environment or compiler access. */
function metadataOk({entry,body,review,proof}={}){
 try{
  assert.ok(Object.hasOwn(DIFFS,entry.sha));assert.equal(body.line,'21.x');assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.deepEqual(body.reviews.map(row=>row.sha),Object.keys(DIFFS));const row=body.reviews.find(row=>row.sha===entry.sha);assert.ok(isDeepStrictEqual(row,review));
  assert.equal(row.status,'reviewed');assert.equal(row.line,'21.x');assert.equal(row.source_scope_only,true);assert.equal(row.proposed_final_disposition,'do-not-adopt');
  assert.equal(row.diff_sha256,DIFFS[entry.sha]);assert.equal(hash(row.diff),DIFFS[entry.sha]);
  assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.review_depth,'individual-compatibility');assert.equal(entry.evidence_report,REVIEW);
  assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,row.frozen_seed_paths);assert.equal(entry.reason,row.decision);
  assert.deepEqual(entry.individual_proof,boundaryProof(row));if(proof!==undefined)assert.deepEqual(proof,entry.individual_proof);
  for(const node of [entry,body,row])assert.equal(node.g11_claim,'not-passed');assert.equal(row.g13_claim,'not-passed');return true;
 }catch{return false;}
}
function inspectBoundarySource({root=ROOT,read=root===ROOT?defaultRead:path=>regular(root,path)}={}){
 const transportPath='scripts/m3-measurement-transport.mjs',transportHash='7bcb7a2d1cef12433240575596b991f0f82c0bdbdbe8f39e2a047fb877bf7fba';
 root=resolve(root);const physical=canonicalSourcePhysicalBoundary({root,read,absentPaths:M3_CURRENT_ABSENT});read=physical.read;
 const current=currentM3ThemeBoundarySubject({root,read}),epoch=m3MeasurementSourceEpoch({root,read});
 const bound=new Map([...current.bound,...epoch.bound].map(ref=>[ref.path,ref]));
 const member=ref=>{const previous=M3_TRANSPORT_CODE.find(value=>value.path===ref.path&&value.before===ref.sha256);
  const qualified=previous?epoch.currentRefs.find(value=>value.path===ref.path):current.qualifyReference(ref);
  const raw=previous?epoch.beforeRead(ref.path):read(qualified.path),expected=previous?ref:qualified;assert.equal(hash(raw),expected.sha256,'changed M3-theme-boundary input '+ref.path);if(expected.bytes!==undefined)assert.equal(raw.length,expected.bytes);
  const actual=previous?qualified:{path:ref.path,sha256:qualified.sha256,bytes:raw.length};if(bound.has(actual.path))assert.deepEqual(bound.get(actual.path),actual);else bound.set(actual.path,actual);return raw;};
 member({path:transportPath,sha256:transportHash});
 const body=JSON.parse(member({path:REVIEW,sha256:REVIEW_HASH})),qualification=JSON.parse(member({path:QUALIFICATION,sha256:QUALIFICATION_HASH}));
 assert.equal(qualification.individual_review.sha256,REVIEW_HASH);assert.equal(qualification.original_commits,5);assert.equal(qualification.original_hunks,42);
 for(const ref of [...qualification.source_code,qualification.actual_test_execution,...Object.values(qualification.actual_line_controls)])member(ref);
 // The two registry/owner refs describe the immutable pre-admission checkpoint.
 // Their new append-only integration is owned by packed-upstream-ledger-epoch.
 for(const ref of qualification.unchanged_existing_capture_checker_registry_and_owner.filter(ref=>!['scripts/upstream-source-contract-registry.mjs','scripts/packed-upstream-ledger-epoch.mjs'].includes(ref.path)))member(ref);
 const original=JSON.parse(gunzipSync(member(body.originals))),replay=JSON.parse(gunzipSync(member(body.offline_replay)));
 member(body.acquisition_seed);assert.deepEqual(original.reviews.map(row=>row.sha),Object.keys(DIFFS));assert.deepEqual(original.reviews,replay.reviews);assert.deepEqual(original.tagged_reference,replay.tagged_reference);
 assert.equal(original.tagged_reference.members.length,21);let present=0,absent=0,hunks=0;
 for(const [index,row]of original.reviews.entries()){
  const raw=Buffer.from(row.raw_commit);assert.equal(createHash('sha1').update('commit '+raw.length+'\0').update(raw).digest('hex'),row.sha);
  assert.equal(hash(row.diff),DIFFS[row.sha]);const review=body.reviews.find(value=>value.sha===row.sha);assert.equal(row.diff,review.diff);
  const originals=row.sections.flatMap(section=>section.hunks.map(h=>({path:section.path,index:h.index,text:h.text,sha256:h.sha256})));assert.equal(originals.length,[5,14,15,1,7][index]);hunks+=originals.length;
  assert.deepEqual(review.complete_original_hunk_reviews.map(h=>({path:h.path,index:h.index,text:h.text,sha256:h.sha256})),originals);
  for(const section of row.sections)for(const value of [section.before,section.after]){
   const raw=Buffer.from(value.body);assert.equal(hash(raw),value.sha256);assert.equal(raw.length,value.bytes);
   if(value.blob==='0'.repeat(40)){assert.equal(value.absent,true);assert.equal(raw.length,0);absent++;}
   else{assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),value.blob);present++;}
  }
 }
 assert.equal(present,45);assert.equal(absent,3);assert.equal(hunks,42);
 for(const value of original.tagged_reference.members){const raw=Buffer.from(value.body);assert.equal(hash(raw),value.sha256);assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),value.blob);}
 const scopeRef=body.actual_line_scopes['21.x'];assert.equal(scopeRef.path,PREFIX+'measurement-21x.json');
 const scopeRaw=member(scopeRef),scope=JSON.parse(scopeRaw);assert.equal(scope.line,'21.x');assert.equal(scope.result,'pass');member(body.actual_line_scopes.main);
 assert.equal(scope.historical_default_CSS_cases.length,16);assert.equal(scope.historical_warning_and_density_cases.length,6);assert.equal(scope.original_inspection_cases.length,8);assert.equal(scope.selected_card_checkbox_M2_M3_source_compile_cases.length,4);
 assert.equal(scope.historical_private_token_exports_retained.length,2);assert.equal(scope.all_four_orders_preserve_exact_original_rule_sequences,true);
 for(const ref of [...scope.input_members,...scope.loaded_sources,...scope.measurement_tools_from_review_worktree,scope.producer])member(ref);
 const portableRaw=member(M3_PORTABLE_WITNESSES['21.x']),portableScope=JSON.parse(portableRaw);member(M3_PORTABLE_WITNESSES.main);
 for(const ref of [...portableScope.input_members,...portableScope.loaded_sources,...portableScope.measurement_tools_from_review_worktree,portableScope.producer])member(ref);
 historicalM3MeasurementView({portable:portableScope,historical:scope});
 const expected=current.expectedReport();
 const assertCurrent=()=>{epoch.assertCurrent();current.assertCurrent();for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late M3-theme-boundary input '+ref.path);assert.equal(raw.length,ref.bytes);}physical.assertPhysical();};
 assertCurrent();return {body,scope,portableScope,currentExpected:expected,scopeHash:hash(scopeRaw)+':'+hash(portableRaw)+':'+hash(JSON.stringify(expected)),bound:[...bound.values()],assertSuccessor:actual=>{const portable=current.assertSuccessor(actual);historicalM3MeasurementView({portable,historical:scope});assertCurrent();physical.assertPhysical();return structuredClone(scope);},assertPhysical:physical.assertPhysical,assertCurrent};
}
function captureSourceArgs(args){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(args),values={};
 for(const key of Reflect.ownKeys(descriptors)){assert.ok(['root','read','entry','body','review','proof'].includes(key));const d=descriptors[key];assert.ok(Object.hasOwn(d,'value'));Object.defineProperty(values,key,{value:d.value,enumerable:true});}
 const snapshot=captureCurrentSassMetadata(Object.fromEntries(Object.entries(values).filter(([key])=>key!=='read')));
 const assertCurrent=()=>{assert.equal(Object.getPrototypeOf(args),Object.prototype);const now=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(now),Reflect.ownKeys(descriptors));for(const key of Reflect.ownKeys(descriptors)){assert.ok(Object.hasOwn(now[key],'value'));assert.equal(now[key].value,descriptors[key].value);for(const flag of ['enumerable','writable','configurable'])assert.equal(now[key][flag],descriptors[key][flag]);}assert.deepEqual(captureCurrentSassMetadata(Object.fromEntries(Object.keys(snapshot).map(key=>[key,now[key].value]))),snapshot);};
 return {values:{...snapshot,...(Object.hasOwn(values,'read')?{read:values.read}:{})},assertCurrent};
}
function sourceOk(args={}){
 try{
  const captured=captureSourceArgs(args),input=captured.values;assert.equal(metadataOk(input),true);const root=input.root??ROOT,read=input.read??(root===ROOT?defaultRead:path=>regular(root,path));
  const inspected=inspectBoundarySource({root,read});assert.deepEqual(input.body,inspected.body);const rootId=realpathSync(root),previous=measurements.get(read);
  assert.equal(typeof measureM3ThemeBoundary,'function');assert.ok(producerImage.toString().includes(functionToString.call(measureM3ThemeBoundary)),'loaded M3 producer differs from guarded source');
  if(!previous||previous.root!==rootId||previous.scopeHash!==inspected.scopeHash){
   const actual=measureM3ThemeBoundary({root:rootId});inspected.assertSuccessor(actual);measurements.set(read,{root:rootId,scopeHash:inspected.scopeHash});
  }
  inspected.assertCurrent();captured.assertCurrent();inspected.assertPhysical();return true;
 }catch{return false;}
}

module.exports={BOUNDARY_SHAS:Object.keys(DIFFS),BOUNDARY_REVIEW:REVIEW,boundaryProof,metadataOk,inspectBoundarySource,sourceOk};
