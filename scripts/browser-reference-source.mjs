/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticate finite browser-tool transitions; this grants no frame admission. */
import assert from 'node:assert/strict';
import {browserOwnerSourceSubject,readBrowserOwnerMember} from './browser-owner-source.mjs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {readCheckerOwnerMember} from './checker-owner-source.mjs';
import {browserZoneSourceSuccessor} from './browser-zone-source-successor.mjs';
import {browserSurfaceSourceSuccessor} from './browser-surface-source-successor.mjs';
import {inventoryFiniteToolSuccessor} from './inventory-finite-tool-successor.mjs';
import {browserFormZoneSourceSuccessor} from './browser-form-zone-source-successor.mjs';
import {replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
const SELF='scripts/browser-reference-source.mjs',INPUT='compatibility/rc/c04-browser-reference-source-inputs.json';
const PINS={"main":"4b0167af85263a3fb652806e25186e8500e02424749adb860610519d28817e6c","21.x":"5a8bd910e0d9a64a73558b5da0f48abdf8546b455d8db0fcb921678a0ee0a5ae"};
const image=readFileSync(fileURLToPath(import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
function original(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:8*1024*1024});
}
export const BROWSER_REFERENCE_PACKET='compatibility/rc/c04-browser-reference-proposal.json';
export const BROWSER_REFERENCE_LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const PROPOSAL_SELF='scripts/browser-reference-proposal.mjs',VERIFIER='tests/browser_reference_source_probe.mjs';
const PROPOSAL_PINS={
  "main": {
    "parent": "0cda109c68d11278b2c348a34b773bf2e623b20e",
    "before": "0f3ffb5a86e4838a3fd29d7e47e10a30bc7feb39f23d79dde9706473f6337443",
    "after": "d4f65b5545915bee888a342495a13d756f926d5edc7679a529a881d3e5bc4a3d",
    "count": 18,
    "entries": 9,
    "packet": "6a5ed7a82947ac170e3a051c3f7801ee1a72797fc0d679e78f959fe483255c07"
  },
  "21.x": {
    "parent": "7378668ffa018b9cbf5498d84a5db32fa824cc26",
    "before": "8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17",
    "after": "f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee",
    "count": 16,
    "entries": 8,
    "packet": "52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e"
  }
};
const proposalImage=readFileSync(fileURLToPath(new URL('./browser-reference-proposal.mjs',import.meta.url)));
const encoded=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const kinds=['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior'];
function proposalOriginal(root,commit,path){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:16*1024*1024});
}
function references(ledger){
 return ledger.entries.flatMap(entry=>kinds.flatMap(kind=>(entry.individual_proof?.[kind]?.source_members??[]).map((ref,index)=>
  ({sha:entry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+index,reference:structuredClone(ref)}))));
}
export function deriveBrowserReferenceMetadata({before,packet,sources}={}){
 const pin=PROPOSAL_PINS[packet?.line];assert.ok(pin,'unknown browser reference line');assert.equal(hash(encoded(packet)),pin.packet,'changed browser proposal packet');
 assert.ok(Buffer.isBuffer(before));assert.equal(hash(before),pin.before);assert.equal(packet.source_parent,pin.parent);
 assert.equal(packet.metadata_reference_updates,pin.count);assert.equal(packet.selected_entries,pin.entries);
 assert.deepEqual(packet.before_ledger,{path:BROWSER_REFERENCE_LEDGER,sha256:pin.before,bytes:before.length});
 assert.ok(sources instanceof Map);assert.equal(sources.size,4);assert.equal(packet.source_transitions.length,4);
 const transitions=new Map();
 for(const row of packet.source_transitions){
  assert.ok(!transitions.has(row.path));assert.ok(sources.has(row.path));const raw=sources.get(row.path);assert.ok(Buffer.isBuffer(raw));
  assert.deepEqual(row.current,{path:row.path,sha256:hash(raw),bytes:raw.length});assert.ok(/^[0-9a-f]{64}$/.test(row.old_sha256));assert.notEqual(row.old_sha256,row.current.sha256);transitions.set(row.path,row);
 }
 const prior=JSON.parse(before),expected=structuredClone(prior),changes=[],selected=new Set();
 assert.equal(prior.entries.length,1697);assert.equal(new Set(prior.entries.map(row=>row.sha)).size,1697);assert.equal(prior.g11_claim,'not-passed');
 for(const[index,oldEntry]of prior.entries.entries())for(const kind of kinds)for(const[refIndex,ref]of (oldEntry.individual_proof?.[kind]?.source_members??[]).entries()){
  const row=transitions.get(ref.path);if(!row)continue;assert.ok([row.old_sha256,row.current.sha256].includes(ref.sha256),'unknown browser source reference');
  if(ref.sha256===row.current.sha256)continue;assert.deepEqual(Object.keys(ref).sort(),['path','sha256']);
  const next=expected.entries[index].individual_proof[kind].source_members[refIndex];next.sha256=row.current.sha256;selected.add(oldEntry.sha);
  changes.push({sha:oldEntry.sha,pointer:'/individual_proof/'+kind+'/source_members/'+refIndex,before_reference:structuredClone(ref),after_reference:structuredClone(next)});
 }
 assert.equal(changes.length,pin.count);assert.equal(selected.size,pin.entries);
 const updates=changes.map(row=>({...row,before_entry_sha256:hash(encoded(prior.entries.find(entry=>entry.sha===row.sha))),after_entry_sha256:hash(encoded(expected.entries.find(entry=>entry.sha===row.sha)))}));
 assert.deepEqual(updates,packet.updates);
 const selectedPointers=new Set(changes.map(row=>row.sha+row.pointer)),preserved=references(prior).filter(row=>!selectedPointers.has(row.sha+row.pointer));
 assert.equal(preserved.length,packet.preserved_native_reference_count);assert.equal(hash(encoded(preserved)),packet.preserved_native_references_sha256);
 assert.equal(references(prior).filter(row=>transitions.get(row.reference.path)?.current.sha256===row.reference.sha256).length,packet.already_current_browser_references_preserved);
 assert.equal(packet.already_current_browser_references_preserved,0);
 const replacements=expected.entries.filter(entry=>selected.has(entry.sha)).map(entry=>({sha:entry.sha,after_entry:entry}));
 const after=replaceHistoricalConsumerEntries(before,replacements);assert.deepEqual(JSON.parse(after),expected);assert.equal(after.length,before.length);assert.equal(hash(after),pin.after);
 assert.deepEqual(packet.after_ledger,{path:BROWSER_REFERENCE_LEDGER,sha256:pin.after,bytes:after.length});
 assert.deepEqual(expected.entries.filter(entry=>!selected.has(entry.sha)),prior.entries.filter(entry=>!selected.has(entry.sha)));
 const header=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='entries'));assert.deepEqual(header(expected),header(prior));
 assert.deepEqual(references(expected).filter(row=>!selectedPointers.has(row.sha+row.pointer)),preserved);
 for(const ref of references(expected))if(transitions.has(ref.reference.path))assert.equal(ref.reference.sha256,transitions.get(ref.reference.path).current.sha256);
 for(const key of ['canonical_dispositions_changed','source_admissions_changed','other_source_references_changed','product_changes'])assert.equal(packet[key],0);
 for(const key of ['canonical_ledger_changed','canonical_owner_integration_complete','actual_native_packed_browser_floor_or_full_audit_qualified'])assert.equal(packet[key],false);
 assert.equal(packet.g11_claim,'not-passed');
 return {before:Buffer.from(before),after,updates:structuredClone(updates),preserved:structuredClone(preserved),metadata_reference_updates:pin.count,selected_entries:pin.entries,unselected_entry_bytes_preserved:1697-pin.entries,native_or_full_audit_credit:false};
}

const LEDGER=BROWSER_REFERENCE_LEDGER;
function constructBrowserOperations(root,read,mode){
 let tools;
function finishInspection(read){
 const packagePath='projects/ngx-material-legacy/package.json',physicalPackage=readCheckerOwnerMember(root,packagePath);
 const version=JSON.parse(physicalPackage).version,line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const zone=browserZoneSourceSuccessor({root,read,line});
 const surface=browserSurfaceSourceSuccessor({root,read,line});
 const formZone=browserFormZoneSourceSuccessor({root,read,line});
 const workflow=inventoryFiniteToolSuccessor({root,read,line});
 const suppliedPackage=read(packagePath);assert.ok(Buffer.isBuffer(suppliedPackage)&&suppliedPackage.equals(physicalPackage));assert.ok(readCheckerOwnerMember(root,packagePath).equals(physicalPackage));
 if(!tools)tools=browserOwnerSourceSubject({root,read});
 const bound=new Map([...tools.bound,...zone.bound,...surface.bound,...formZone.bound,...workflow.bound].map(ref=>[ref.path,{...ref}]));
 const slicePath='scripts/run-browser-matrix-slice.mjs';
 const sliceBefore={path:slicePath,sha256:'63129120785dbec5264198f0d1b8fadb7eb01b014040dc04e66c20872e46d610'};
 const sliceAfter={path:slicePath,sha256:'7be17c3f34fa5943fade75bfd4bb51b06e524bcf25049ab1a7d1f58549257a6a',bytes:19860};
 const dialogSliceQualify=ref=>{if(line!=='main'||ref.path!==slicePath)return null;const prior=ref.sha256===sliceBefore.sha256?sliceBefore:ref.sha256===sliceAfter.sha256?sliceAfter:null;assert.ok(prior,'unknown dialog slice source');if(ref.bytes!==undefined)assert.equal(ref.bytes,prior===sliceBefore?original(root,'36cc0feb5ff9fefe95d354b251ac8f6b37b067e2',slicePath).length:prior.bytes);return {...ref,sha256:sliceAfter.sha256,...(ref.bytes===undefined?{}:{bytes:sliceAfter.bytes})};};
 const peerPath='tests/browser_peer_versions_probe.mjs';
 const peerBefore={path:peerPath,sha256:'84d0d6dc654decb0352762e2cc57ccbd34723363ec314ad22b1a6839cb8457b9',bytes:3835};
 const peerAfter={path:peerPath,sha256:'0816108e3dbcfdb565acf53e2c4d584e17e5e71835b9eed594f743a91654d2e8',bytes:4719};
 const dialogPeerQualify=ref=>{if(line!=='main'||ref.path!==peerPath)return null;const prior=ref.sha256===peerBefore.sha256?peerBefore:ref.sha256===peerAfter.sha256?peerAfter:null;assert.ok(prior,'unknown browser peer test source');if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes);return {...ref,sha256:peerAfter.sha256,...(ref.bytes===undefined?{}:{bytes:peerAfter.bytes})};};
 const member=ref=>{
  if(ref.sha256!==undefined)ref=dialogPeerQualify(ref)??dialogSliceQualify(ref)??workflow.qualify(ref)??formZone.qualify(ref)??surface.qualify(ref)??tools.qualifyReference(ref);
  const physical=readCheckerOwnerMember(root,ref.path),raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(physical),'noncurrent browser source '+ref.path);
  assert.ok(physical.equals(readCheckerOwnerMember(root,ref.path)),'browser source changed during callback '+ref.path);
  if(ref.sha256)assert.equal(hash(raw),ref.sha256,'changed browser source '+ref.path);
  if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);
  bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 if(line==='main'){
  const receipt=JSON.parse(member({path:'compatibility/rc/parent-dialog-focus-readiness-integration-v1.json',sha256:'08a872956a859beee736ec1aa1c1b01e3f7197ee36132c099b406ef918be16ab',bytes:3708}));
  assert.equal(receipt.patch_sha256,'93869925718897ad5d1db3d93a8cbe16f41a8d4dc0d60790b52cc6218af4adca');
  assert.equal(receipt.evidence_archive.sha256,'355eb1df48462280b0fc24599e01e26125b4df39395520a660884ef2d059bfb1');member({path:receipt.evidence_archive.path,sha256:receipt.evidence_archive.sha256,bytes:receipt.evidence_archive.bytes});
  const peerOld=original(root,'feaa956a5d593aa73d41fc4160772fa82cdf8972',peerPath),peerCurrent=original(root,'0ca6505896139dab0643f91f4179c3b351b5c068',peerPath);
  assert.equal(hash(peerOld),peerBefore.sha256);assert.equal(peerOld.length,peerBefore.bytes);assert.equal(hash(peerCurrent),peerAfter.sha256);assert.equal(peerCurrent.length,peerAfter.bytes);assert.ok(readCheckerOwnerMember(root,peerPath).equals(peerCurrent));
  const before=original(root,'36cc0feb5ff9fefe95d354b251ac8f6b37b067e2',slicePath),after=original(root,'b8e00f603869daaabb72e5b5ee464ce510fe9b47',slicePath);
  assert.equal(hash(before),sliceBefore.sha256);assert.equal(hash(after),sliceAfter.sha256);assert.equal(after.length,sliceAfter.bytes);assert.ok(readCheckerOwnerMember(root,slicePath).equals(after));
 }
 const packet=JSON.parse(member({path:INPUT,sha256:PINS[line]}));assert.equal(packet.line,line);assert.equal(packet.schema_version,1);
 assert.equal(packet.canonical_frame_admission_granted,false);assert.equal(packet.canonical_dispositions_changed,0);assert.equal(packet.product_changes,0);
 assert.equal(packet.old_programs_executed,false);assert.equal(packet.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 member({path:SELF,sha256:hash(image),bytes:image.length});
 for(const ref of packet.source_members)member(ref);
 const authority=JSON.parse(original(root,packet.worksheet_authority.commit,packet.worksheet_authority.path));
 assert.deepEqual(packet.worksheet,authority.next_browser_reference_source_review);
 const priorLedger=original(root,packet.source_parent,packet.protected_ledger.path);assert.equal(hash(priorLedger),packet.protected_ledger.sha256);assert.equal(priorLedger.length,packet.protected_ledger.bytes);
 const currentLedger=member({path:packet.protected_ledger.path}),ledger=JSON.parse(priorLedger);assert.equal(ledger.entries.length,1697);assert.equal(ledger.g11_claim,'not-passed');
 const ts=createRequire(import.meta.url)('typescript');assert.equal(ts.version,JSON.parse(member(packet.package_json)).devDependencies.typescript);
 const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0,path);return sf;};
 const functions=sf=>new Map(sf.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(sf)]));
 const summaries=[],derived=[];let totalHunks=0;
 assert.equal(packet.transitions.length,4);assert.equal(new Set(packet.transitions.map(row=>row.path)).size,4);
 for(const row of packet.transitions){
  const old=original(root,row.before.commit,row.path);assert.equal(hash(old),row.before.sha256);assert.equal(old.length,row.before.bytes);
  assert.ok(gunzipSync(member(row.before.capture)).equals(old),'capture differs from untouched Git source');
  const zoneTransition=row.path===zone.after.path,surfaceTransition=row.path===surface.after.path,formTransition=row.path===formZone.after.path;
  const current=zoneTransition||surfaceTransition||formTransition?original(root,packet.source_parent,row.path):member(row.after);
  if(zoneTransition){assert.deepEqual(row.after,zone.before);assert.equal(hash(current),zone.before.sha256);assert.equal(current.length,zone.before.bytes);zone.assertCurrent();}
  else if(surfaceTransition){assert.deepEqual(row.after,surface.before);assert.equal(hash(current),surface.before.sha256);assert.equal(current.length,surface.before.bytes);member(surface.after);surface.assertCurrent();}
  else if(formTransition){assert.deepEqual(row.after,formZone.before);assert.equal(hash(current),formZone.before.sha256);assert.equal(current.length,formZone.before.bytes);member(formZone.after);formZone.assertCurrent();}
  else assert.ok(original(root,packet.source_parent,row.path).equals(current),'current source differs from reviewed parent');
  let expected=old.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'ambiguous browser source edit');expected=expected.replace(edit.before,edit.after);}
  assert.equal(current.toString(),expected,'unreviewed browser helper transition');
  assert.equal(hash(row.complete_diff),row.complete_diff_sha256);
  assert.equal(row.complete_diff.split(/(?=^@@ )/m).slice(1).join(''),row.hunk_reviews.map(item=>item.text).join(''));
  assert.equal(row.hunk_reviews.length,row.path.endsWith('browser-required-cells.mjs')?12:row.path.endsWith('browser-required-probe.js')?1:5);
  for(const[index,review]of row.hunk_reviews.entries()){
   assert.equal(review.index,index+1);assert.equal(hash(review.text),review.sha256);assert.ok(review.decision.length>100);assert.equal(review.native_or_security_acceptance_qualified,false);
  }
  totalHunks+=row.hunk_reviews.length;
  const a=parse('old-data.js',old.toString()),b=parse(row.path,current.toString()),af=functions(a),bf=functions(b);let unchangedFunctions=0;
  if(row.path.endsWith('browser-required-cells.mjs')){
   const removed=['exactVersion','readPackedPackage','versionsFor'],changed=['requiredProbeSource','labHtml','labSource','candidateInstallSpec','fixtureQualificationDefects'];
   assert.deepEqual([...bf.keys()].sort(),[...af.keys()].filter(name=>!removed.includes(name)).sort());
   for(const[name,text]of af){if(removed.includes(name))continue;if(!changed.includes(name)){assert.equal(bf.get(name),text,'changed browser predicate '+name);unchangedFunctions++;}}
   assert.equal(bf.get('requiredProbeSource'),af.get('requiredProbeSource').replace('legacySnackAnnouncementLifetimeNativeOkay,','legacySnackAnnouncementLifetimeNativeOkay, legacyDialogTitleLifetimeNativeOkay,'));
   assert.equal(bf.get('labHtml'),af.get('labHtml').replace('Open dialog</button></div>','Open dialog</button><lab-dialog-title-lifetime></lab-dialog-title-lifetime></div>'));
   assert.ok(bf.get('labSource').includes('if (!lab.titleLifetimeLab) return Promise.reject'));
   summaries.push({path:row.path,unchanged_functions:unchangedFunctions,removed_permissive_input_functions:removed,individually_reviewed_changed_functions:changed,other_required_cell_routes_unchanged:true});
  }else if(row.path.endsWith('browser-required-probe.js')){
   const dialog=sf=>{const result=[];function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(sf)==="family === 'dialog'"){let owner=node.parent;while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;if(owner?.name?.text==='runDefault')result.push(node.getText(sf));}ts.forEachChild(node,visit);}visit(sf);assert.equal(result.length,1);return result[0];};
   const before=dialog(a),after=dialog(b);assert.equal(old.toString().replace(before,'REVIEWED_DIALOG_ROUTE'),current.toString().replace(after,'REVIEWED_DIALOG_ROUTE'));
   for(const marker of ['opener.click()','1500','if (!node)','typeof lab.runDialogTitleLifetime','lab.closeTransient()','if (!closed)','window.__status === request','legacyDialogTitleLifetimeNativeOkay(observation)'])assert.ok(after.includes(marker),marker);
   summaries.push({path:row.path,changed_family_routes:['dialog/default'],all_other_program_bytes_unchanged:true});
  }else{
   assert.deepEqual([...bf.keys()],[...af.keys()]);for(const[name,text]of af){assert.equal(bf.get(name),text,'changed mini runtime '+name);unchangedFunctions++;}
   const marker='const ngc =';assert.ok(old.includes(marker));assert.equal(current.toString().slice(current.indexOf(marker)),old.toString().slice(old.indexOf(marker)),'changed browser runtime/assertions/reporting');
   const lab=sf=>{const found=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(sf)==='writeFileSync'&&node.arguments[0]?.getText(sf).includes("'src/main.ts'"))found.push(node.arguments[1].getText(sf));ts.forEachChild(node,visit);}visit(sf);assert.equal(found.length,1);return found[0];};
   assert.equal(lab(a),lab(b),'changed mini generated lab');
   summaries.push({path:row.path,unchanged_functions:unchangedFunctions,generated_lab_byte_identical:true,all_runtime_assertions_and_reporting_byte_identical:true});
  }
  for(const entry of ledger.entries)for(const kind of packet.native_kinds)for(const ref of entry.individual_proof?.[kind]?.source_members??[]){
   if(ref.path===row.path&&ref.sha256===row.before.sha256)derived.push({sha:entry.sha,proof_kind:kind,reference:ref,current_raw:{path:row.path,...row.after},requires_separate_qualification:true});
  }
 }
 const census=JSON.parse(member(packet.raw_source_census));
 assert.deepEqual(derived.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),census.rows.slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 assert.equal(derived.length,line==='main'?18:16);assert.equal(totalHunks,23);
 const assertCurrent=()=>{workflow.assertCurrent();zone.assertCurrent();surface.assertCurrent();formZone.assertCurrent();tools.assertCurrent();for(const ref of bound.values()){
  const physical=readCheckerOwnerMember(root,ref.path),raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late browser source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(physical),'late physical browser source '+ref.path);assert.ok(physical.equals(readCheckerOwnerMember(root,ref.path)),'late browser source changed during callback '+ref.path);
 }zone.assertPhysical();surface.assertPhysical();formZone.assertPhysical();};
 assertCurrent();return {bound:structuredClone([...bound.values()]),assertCurrent,assertZonePhysical:zone.assertPhysical,assertSurfacePhysical:surface.assertPhysical,assertFormPhysical:formZone.assertPhysical,qualifySurfaceReference:surface.qualify,qualifyFormReference:formZone.qualify,surfaceBefore:{...surface.before},formBefore:{...formZone.before},report:{schema_version:1,line,result:'pass',analysis_node:process.version,analysis_typescript:ts.version,complete_source_transitions:4,individually_reviewed_hunks:totalHunks,selected_references:derived.length,transitions:summaries,current_physical_ledger_sha256:hash(currentLedger),current_physical_ledger_bytes:currentLedger.length,current_ledger_equals_reviewed_cohort:currentLedger.equals(priorLedger),canonical_frame_admission_granted:false,old_programs_executed:false,canonical_dispositions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}};
}

/** Source proof is independent of the actual owner's historical-frame gates. */
function finishProducer(read){
 const physicalPackage=readCheckerOwnerMember(root,'projects/ngx-material-legacy/package.json'),version=JSON.parse(physicalPackage).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const zone=browserZoneSourceSuccessor({root,read,line});
 const suppliedPackage=read('projects/ngx-material-legacy/package.json');assert.ok(Buffer.isBuffer(suppliedPackage)&&suppliedPackage.equals(physicalPackage));assert.ok(readCheckerOwnerMember(root,'projects/ngx-material-legacy/package.json').equals(physicalPackage));
 if(!tools)tools=browserOwnerSourceSubject({root,read});
 const source=finishInspection(read),pin=PROPOSAL_PINS[line];assert.ok(pin);assert.equal(source.report.line,line);
 const bound=new Map([...source.bound,...zone.bound].map(ref=>[ref.path,{...ref}])),member=ref=>{
  ref=source.qualifyFormReference(ref)??source.qualifySurfaceReference(ref)??tools.qualifyReference(ref);
  const physical=readCheckerOwnerMember(root,ref.path),raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(physical),'noncurrent browser proposal source '+ref.path);assert.ok(physical.equals(readCheckerOwnerMember(root,ref.path)),'browser proposal source changed during callback '+ref.path);
  assert.equal(hash(raw),ref.sha256,'changed browser proposal source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);
  bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const packet=JSON.parse(member({path:BROWSER_REFERENCE_PACKET,sha256:pin.packet}));assert.equal(packet.source_parent,pin.parent);
 member({path:PROPOSAL_SELF,sha256:hash(proposalImage),bytes:proposalImage.length});for(const ref of packet.source_members)member(ref);
 const sources=new Map(packet.source_transitions.map(row=>{
  if(row.path===source.formBefore.path){assert.deepEqual(row.current,source.formBefore);member(row.current);const previous=proposalOriginal(root,pin.parent,row.path);assert.equal(hash(previous),source.formBefore.sha256);assert.equal(previous.length,source.formBefore.bytes);source.assertCurrent();return [row.path,previous];}
  if(row.path===source.surfaceBefore.path){assert.deepEqual(row.current,source.surfaceBefore);member(row.current);const previous=proposalOriginal(root,pin.parent,row.path);assert.equal(hash(previous),source.surfaceBefore.sha256);assert.equal(previous.length,source.surfaceBefore.bytes);source.assertCurrent();return [row.path,previous];}
  if(row.path!==zone.before.path)return [row.path,member(row.current)];
  assert.deepEqual(row.current,zone.before);const previous=proposalOriginal(root,pin.parent,row.path);
  assert.equal(hash(previous),zone.before.sha256);assert.equal(previous.length,zone.before.bytes);zone.assertCurrent();return [row.path,previous];
 }));
 assert.equal(process.version,'v'+JSON.parse(read('toolchain-lock.json')).repository.node);
 const before=proposalOriginal(root,pin.parent,BROWSER_REFERENCE_LEDGER),result=deriveBrowserReferenceMetadata({before,packet,sources});
 const sourceInputs=JSON.parse(read(packet.qualified_source_inputs.path));
 assert.deepEqual(packet.source_transitions,sourceInputs.transitions.map(row=>({path:row.path,old_sha256:row.before.sha256,current:row.after})));
 const qualified=JSON.parse(read(packet.qualified_source.path));assert.equal(qualified.selected_references,pin.count);assert.equal(qualified.distinct_selected_shas,pin.entries);
 const artifact=member(packet.after_image);assert.ok(gunzipSync(artifact).equals(result.after),'browser proposal artifact differs from independent derivation');
 const physicalLedger=readCheckerOwnerMember(root,BROWSER_REFERENCE_LEDGER);
 const verifier=JSON.parse(execFileSync(process.execPath,[VERIFIER,'--source-metadata'],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024,timeout:180000}));
 assert.equal(verifier.result,'pass');assert.equal(verifier.line,line);assert.equal(verifier.complete_source_transitions,4);assert.equal(verifier.individually_reviewed_hunks,23);assert.equal(verifier.selected_references,pin.count);
 assert.equal(verifier.current_physical_ledger_sha256,hash(physicalLedger));assert.equal(verifier.current_physical_ledger_bytes,physicalLedger.length);
 assert.equal(verifier.analysis_node,process.version);assert.equal(verifier.analysis_typescript,JSON.parse(read('package.json')).devDependencies.typescript);
 assert.equal(verifier.source_execution_mode,'source-metadata');assert.equal(verifier.full_source_fault_lifetimes_executed,false);
 for(const key of ['cold_source_faults_rejected','late_source_faults_rejected','cold_source_fault_paths_rejected','late_source_fault_paths_rejected'])assert.equal(Object.hasOwn(verifier,key),false);
 assert.equal(verifier.title_contract_negative_controls,47);assert.equal(verifier.whole_current_dialog_probe_collaborator_runs.length,8);
 for(const key of ['canonical_frame_admission_granted','old_programs_executed','actual_native_packed_browser_floor_or_full_audit_qualified','actual_angular_DOM_browser_or_packed_execution'])assert.equal(verifier[key],false);
 assert.equal(verifier.g11_claim,'not-passed');
 const assertCurrent=()=>{zone.assertCurrent();tools.assertCurrent();source.assertCurrent();assert.ok(readCheckerOwnerMember(root,BROWSER_REFERENCE_LEDGER).equals(physicalLedger),'late physical canonical ledger');for(const ref of bound.values()){
  const physical=readCheckerOwnerMember(root,ref.path),raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late browser proposal source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(physical),'late physical browser proposal source '+ref.path);assert.ok(physical.equals(readCheckerOwnerMember(root,ref.path)),'late browser proposal source changed during callback '+ref.path);
 }zone.assertPhysical();source.assertSurfacePhysical();source.assertFormPhysical();};
 const verifyAfter=candidate=>{assertCurrent();assert.ok(Buffer.isBuffer(candidate)&&candidate.equals(result.after),'not the exact browser-reference after-image');assertCurrent();return {metadata_only:true,canonical_frame_admission_granted:false,native_or_full_audit_credit:false};};
 const verifyInput=candidate=>{assertCurrent();assert.ok(Buffer.isBuffer(candidate)&&(candidate.equals(result.before)||candidate.equals(result.after)),'unregistered canonical browser-reference image');assertCurrent();return {current_canonical_state:candidate.equals(result.before)?'before':'after',canonical_frame_admission_granted:false};};
 assertCurrent();return {line,before:Buffer.from(result.before),after:Buffer.from(result.after),updates:structuredClone(result.updates),preserved:structuredClone(result.preserved),metadata_reference_updates:pin.count,selected_entries:pin.entries,unselected_entry_bytes_preserved:1697-pin.entries,bound:structuredClone([...bound.values()]),verifier:structuredClone(verifier),assertCurrent,assertZonePhysical:zone.assertPhysical,assertSurfacePhysical:source.assertSurfacePhysical,assertFormPhysical:source.assertFormPhysical,verifyAfter,verifyInput,canonical_owner_integration_complete:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}

function finishOwner(){
 const version=JSON.parse(readBrowserOwnerMember(root,'projects/ngx-material-legacy/package.json')).version;
 const line=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(line);
 const zone=browserZoneSourceSuccessor({root,read,line});
 tools=browserOwnerSourceSubject({root,read});
 // Source qualification always sees the real physical ledger. The caller's
 // complete image is captured separately and is never projected if unknown.
 const sourceRead=path=>path===LEDGER?readBrowserOwnerMember(root,path):read(path);
 const source=finishProducer(sourceRead);
 assert.equal(source.line,tools.line);assert.equal(hash(source.before),tools.packet.before_ledger.sha256);assert.equal(hash(source.after),tools.packet.after_ledger.sha256);
 const raw=read(LEDGER),current={path:LEDGER,sha256:hash(raw),bytes:raw.length},applied=raw.equals(source.after);
 assert.equal(source.line,line);
 const bound=new Map([...tools.bound,...source.bound,...zone.bound,current].map(ref=>[ref.path,{...ref}]));
 const assertCurrent=()=>{zone.assertCurrent();tools.assertCurrent();source.assertCurrent();for(const ref of bound.values()){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'late browser metadata input '+ref.path);assert.equal(value.length,ref.bytes);}zone.assertPhysical();source.assertSurfacePhysical();source.assertFormPhysical();};
 const wrapPrepared=prior=>{
  assertCurrent();assert.ok(prior.canonical_after.equals(source.before),'browser stage does not succeed exact checker after-image');
  const currentBound=new Map(prior.bound);for(const ref of bound.values())currentBound.set(ref.path,ref.sha256);
  const assertPrior=()=>{assertCurrent();prior.assertCurrent?.();prior.prior_metadata_assert_current?.();assertCurrent();};
  const stage={before:Buffer.from(source.before),after:Buffer.from(source.after),metadata_entries:source.metadata_reference_updates,selected_entries:source.selected_entries,source_reference_updates:source.metadata_reference_updates,individual_decisions:0,assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false};
  assertPrior();return {...prior,canonical_after:Buffer.from(source.after),bound:currentBound,browser_reference_stage:stage,assertCurrent:assertPrior,prior_metadata_assert_current:assertPrior};
 };
 assertCurrent();return {line:source.line,before:Buffer.from(source.before),after:Buffer.from(source.after),applied,metadata_entries:source.metadata_reference_updates,selected_entries:source.selected_entries,bound:structuredClone([...bound.values()]),assertCurrent,assertSurfacePhysical:source.assertSurfacePhysical,assertFormPhysical:source.assertFormPhysical,wrapPrepared,canonical_frame_admission_granted:false,current_native_packed_or_floor_or_g11_credit:false};
}

 if(mode==='inspection')return finishInspection(read);
 if(mode==='producer')return finishProducer(read);
 return finishOwner();
}

export function inspectBrowserReferenceSource({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 return constructBrowserOperations(root,read,'inspection');
}
export function prepareBrowserReferenceSourceMetadata({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 return constructBrowserOperations(root,read,'producer');
}
export function browserReferenceOwnerContext({root,read=path=>readBrowserOwnerMember(root,path)}={}){
 return constructBrowserOperations(root,read,'owner');
}

/** The proposal input rule accepts only its two complete exact images. */
export function prepareBrowserReferenceMetadata({root,read=path=>readCheckerOwnerMember(root,path)}={}){
 const source=prepareBrowserReferenceSourceMetadata({root,read}),current=read(BROWSER_REFERENCE_LEDGER),state=source.verifyInput(current);
 const identity={path:BROWSER_REFERENCE_LEDGER,sha256:hash(current),bytes:current.length};
 const assertCurrent=()=>{source.assertCurrent();const raw=read(BROWSER_REFERENCE_LEDGER);assert.equal(hash(raw),identity.sha256,'late canonical browser-reference image');assert.equal(raw.length,identity.bytes);source.assertZonePhysical();source.assertSurfacePhysical();source.assertFormPhysical();};
 const verifyAfter=candidate=>{assertCurrent();const result=source.verifyAfter(candidate);assertCurrent();return result;};
 const verifyInput=candidate=>{assertCurrent();const result=source.verifyInput(candidate);assertCurrent();return result;};
 assertCurrent();return {...source,...state,bound:structuredClone(source.bound),assertCurrent,verifyAfter,verifyInput};
}
