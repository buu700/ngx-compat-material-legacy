/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current canonical owner: preserved prior stages plus one explicit title stage. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as base from './packed-upstream-ledger-base.mjs';
import {applyDialogTitleCanonicalStage,TITLE_LEDGER_BEFORE,TITLE_NATIVE_REGISTRY,TITLE_NATIVE_BEFORE,TITLE_NATIVE_AFTER} from './dialog-title-canonical-stage.mjs';
import title from './upstream-dialog-title-admission.cjs';
import theming from './upstream-theming-inspection-admission.cjs';
import {applyThemingInspectionCanonicalStage,themingRegistrySuccessor,THEMING_REGISTRY} from './theming-inspection-canonical-stage.mjs';
import {reviewThemingInspectionSource} from './upstream-theming-inspection-source-review.mjs';
import inspection from './upstream-inspection-compatibility-admission.cjs';
import {applyInspectionCompatibilityCanonicalStage,inspectionRegistrySuccessor} from './inspection-compatibility-canonical-stage.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import selectorDensity from './upstream-selector-density-admission.cjs';
import {applySelectorDensityCanonicalStage,selectorDensityRegistrySuccessor} from './selector-density-canonical-stage.mjs';
import {reviewSelectorDensitySource} from './upstream-selector-density-source-review.mjs';
import buttonTokenization from './upstream-button-tokenization-admission.cjs';
import {applyButtonTokenizationCanonicalStage,buttonTokenizationRegistrySuccessor} from './button-tokenization-canonical-stage.mjs';
import {reviewButtonTokenizationSource} from './upstream-button-tokenization-source-review.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const OWNER='scripts/packed-upstream-ledger-epoch.mjs',BASE='scripts/packed-upstream-ledger-base.mjs';
const LEDGER='compatibility/f10/disposition-ledger/ledger.json';
const PACKET='compatibility/rc/21x-c04-dialog-title-replacement-canonical-admitted-transition.json';
const PACKET_HASH='87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea';
const FRAMES='compatibility/rc/21x-c04-dialog-title-replacement-retained-ledger-frames.json';
const FRAMES_HASH='1818801b7b603d2707fe7f2571dd5819edb7de12e259934bc71b24354c8fd456';
const THEMING_PACKET='compatibility/rc/21x-c04-theming-inspection-canonical-transition.json';
const THEMING_PACKET_HASH='3f93068912fbfbdc305366cc553d9981c787868d19792359f7cb0b303bc8370d';
const INSPECTION_PACKET='compatibility/rc/21x-c04-inspection-compatibility-canonical-transition.json';
const INSPECTION_PACKET_HASH='6194ddd826ea4469d49aa96d58db67ad4576bb74a31f9ccbe4ceae9c9334db9f';
const SELECTOR_DENSITY_PACKET='compatibility/rc/21x-c04-selector-density-canonical-transition.json';
const SELECTOR_DENSITY_PACKET_HASH='e128bc43e5626db26727f35b0550374f5c1dccf21e2149d5232d4eabbabec997';
const BUTTON_TOKENIZATION_PACKET='compatibility/rc/21x-c04-button-tokenization-canonical-transition.json';
const BUTTON_TOKENIZATION_PACKET_HASH='8f9a3016332c8448db94dfea173d023640db1984f7a499c49c0f6b79030c3853';
const AFTER='80123c4e8c4f7f43330553ffca84e51fea98e70f545234cf5359c11128e548d7';
const AUTHORITY='33e11b2965c9ff559865bc81298e6766653672be';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),readers=new WeakMap(),originals=new Map();
const METADATA_ROLE='compatibility/rc/.canonical-owned-tool-metadata-role';
const metadataToken=Buffer.from('owned canonical tool metadata');
const disk=root=>path=>readFileSync(join(root,path));
function original(root,path,authority=AUTHORITY){
 const key=root+'\0'+authority+'\0'+path;
 if(!originals.has(key)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  originals.set(key,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',authority+':'+path],{cwd:root,env,maxBuffer:8*1024*1024}));
 }
 return Buffer.from(originals.get(key));
}
function unwrap(root,read){
 while(readers.has(read)){const value=readers.get(read);assert.equal(resolve(root),value.root);read=value.raw;}
 return base.packedUpstreamLedgerRawRead({root,read});
}
/** A cross-checkout caller uses that checkout's actual current owner. */
function foreign(root,read,allowMissing=false){
 let raw;try{raw=read('projects/ngx-material-legacy/package.json');}catch(error){if(allowMissing&&error.code==='ENOENT')return null;throw error;}
 const version=JSON.parse(raw).version;
 if(version.startsWith('21.'))return null;
 assert.ok(version.startsWith('22.'),'unsupported canonical owner line');
 const path=resolve(root,OWNER);assert.notEqual(path,resolve(ROOT,OWNER),'foreign line supplied to21.x owner');
 const module=require(path);assert.equal(typeof module.packedUpstreamLedgerEpoch,'function');return module;
}
function buttonTokenizationTools(root,read){
 const raw=read(BUTTON_TOKENIZATION_PACKET);assert.equal(hash(raw),BUTTON_TOKENIZATION_PACKET_HASH,'changed button tokenization canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'878b00dacaca2a8417dd0aebefc8adce6a8a9277');
 assert.equal(packet.individual_decisions,5);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,5);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1692);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=buttonTokenizationRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-button-tokenization-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 const bound=[{path:BUTTON_TOKENIZATION_PACKET,sha256:BUTTON_TOKENIZATION_PACKET_HASH,bytes:raw.length},...packet.source_members,packet.review,packet.registry_after,...patches];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed button tokenization tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body};
}
function selectorDensityTools(root,read){
 const successor=buttonTokenizationTools(root,read);
 const raw=read(SELECTOR_DENSITY_PACKET);assert.equal(hash(raw),SELECTOR_DENSITY_PACKET_HASH,'changed selector/density canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'f5638de44628fa48df56644f5cccf53720fb8401');
 assert.equal(packet.individual_decisions,2);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,2);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1695);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=selectorDensityRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-selector-density-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'button tokenization registry does not succeed exact selector/density registry');
 const bound=[{path:SELECTOR_DENSITY_PACKET,sha256:SELECTOR_DENSITY_PACKET_HASH,bytes:raw.length},...packet.source_members,packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed selector/density tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function inspectionTools(root,read){
 const successor=selectorDensityTools(root,read);
 const raw=read(INSPECTION_PACKET);assert.equal(hash(raw),INSPECTION_PACKET_HASH,'changed inspection canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'83e48681774603aef0eb23fb0ef4cb40b3dca6ec');
 assert.equal(packet.individual_decisions,4);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,4);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1693);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=inspectionRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-inspection-compatibility-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'selector/density registry does not succeed exact inspection registry');
 const bound=[{path:INSPECTION_PACKET,sha256:INSPECTION_PACKET_HASH,bytes:raw.length},...packet.source_members,packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed inspection tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function themingTools(root,read){
 const successor=inspectionTools(root,read);
 const raw=read(THEMING_PACKET);assert.equal(hash(raw),THEMING_PACKET_HASH,'changed theming canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'1fcb9a09a4d989a58f403db8237a281cab6cfa0d');
 assert.equal(packet.individual_decisions,2);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,2);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1695);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=themingRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-theming-inspection-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'inspection registry does not succeed exact theming registry');
 const bound=[{path:THEMING_PACKET,sha256:THEMING_PACKET_HASH,bytes:raw.length},...packet.source_members,packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed theming tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,bound,assertCurrent,body,successor,
  currentReference:ref=>ref.path===THEMING_REGISTRY?successor.successor.successor.packet.registry_after:ref};
}
function context(root,read){
 assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');
 const tools=themingTools(root,read);
 const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');
 const frames=JSON.parse(frameRaw);assert.equal(frames.schema_version,1);assert.equal(frames.line,'21.x');
 assert.equal(frames.frames.length,21);assert.equal(new Set(frames.frames.map(frame=>frame.sha256)).size,21);
 const ledgerRaw=read(LEDGER),currentHash=hash(ledgerRaw);
 assert.ok([...frames.frames,tools.packet.after,tools.successor.packet.after,tools.successor.successor.packet.after,tools.successor.successor.successor.packet.after].some(frame=>frame.sha256===currentHash&&frame.bytes===ledgerRaw.length),'not an accepted complete ledger frame');
 const raw=read(PACKET);assert.equal(hash(raw),PACKET_HASH,'changed title canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.source_parent,AUTHORITY);assert.equal(packet.line,'21.x');assert.equal(packet.individual_decisions,1);
 assert.equal(packet.metadata_tokens,14);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.unselected_judgments_changed,0);
 assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const before=original(root,LEDGER);assert.equal(hash(before),TITLE_LEDGER_BEFORE);assert.equal(before.length,packet.before.bytes);
 assert.deepEqual(packet.before,{path:LEDGER,sha256:TITLE_LEDGER_BEFORE,bytes:before.length});
 const baseImage=read(BASE);assert.equal(hash(baseImage),'ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715');
 assert.equal(baseImage.equals(original(root,OWNER)),true,'prior owner changed during extraction');
 const nativeBefore=original(root,TITLE_NATIVE_REGISTRY);assert.equal(hash(nativeBefore),TITLE_NATIVE_BEFORE);
 let nativeExpected=nativeBefore.toString();
 for(const [from,to]of [
  ["import {createHash} from 'node:crypto';","import {createHash} from 'node:crypto';\nimport {validateDialogTitleNative} from './upstream-dialog-title-native-evidence.mjs';"],
  ['  return scopes.has(entry?.sha) || proof?.proof_kind === HISTORICAL_BEHAVIOR_KIND',
   "  return entry?.sha === '642d886ef117721a34c98055391c9055fde29607' || scopes.has(entry?.sha) || proof?.proof_kind === HISTORICAL_BEHAVIOR_KIND"],
  ['export function validateHistoricalBehavior({root, entry, proof, request}) {\n  try {',
   "export function validateHistoricalBehavior({root, entry, proof, request}) {\n  if (entry?.sha === '642d886ef117721a34c98055391c9055fde29607') return validateDialogTitleNative({root, entry, proof, request});\n  try {"],
 ]){assert.equal(nativeExpected.split(from).length,2);nativeExpected=nativeExpected.replace(from,to);}
 assert.equal(hash(nativeExpected),TITLE_NATIVE_AFTER);assert.equal(read(TITLE_NATIVE_REGISTRY).toString(),nativeExpected);
 const body=JSON.parse(read(title.TITLE_REVIEW));
 const stage=applyDialogTitleCanonicalStage({before,body,selected:packet.metadata_selection});
 assert.equal(hash(stage.after),AFTER);assert.deepEqual(packet.after,{path:LEDGER,sha256:AFTER,bytes:stage.after.length});
 assert.equal(hash(stage.metadataAfter),packet.metadata_ledger_sha256);
 assert.deepEqual(tools.packet.before,{path:LEDGER,sha256:AFTER,bytes:stage.after.length});
 const themingStage=applyThemingInspectionCanonicalStage({before:stage.after,body:tools.body});
 assert.deepEqual(tools.packet.after,{path:LEDGER,sha256:hash(themingStage.after),bytes:themingStage.after.length});
 assert.deepEqual(tools.successor.packet.before,tools.packet.after);
 const inspectionStage=applyInspectionCompatibilityCanonicalStage({before:themingStage.after,body:tools.successor.body});
 assert.deepEqual(tools.successor.packet.after,{path:LEDGER,sha256:hash(inspectionStage.after),bytes:inspectionStage.after.length});
 assert.deepEqual(tools.successor.successor.packet.before,tools.successor.packet.after);
 const selectorDensityStage=applySelectorDensityCanonicalStage({before:inspectionStage.after,body:tools.successor.successor.body});
 assert.deepEqual(tools.successor.successor.packet.after,{path:LEDGER,sha256:hash(selectorDensityStage.after),bytes:selectorDensityStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.packet.before,tools.successor.successor.packet.after);
 const buttonTokenizationStage=applyButtonTokenizationCanonicalStage({before:selectorDensityStage.after,body:tools.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(buttonTokenizationStage.after),bytes:buttonTokenizationStage.after.length});
 const own={path:OWNER,sha256:hash(image),bytes:image.length};
 const bound=[...new Map([own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members.map(tools.currentReference),packet.root_checker,...tools.bound].map(ref=>[ref.path,ref])).values()];
 const assertTools=()=>{
  for(const member of bound){const value=read(member.path);assert.equal(hash(value),member.sha256,'changed title owner binding '+member.path);if(member.bytes!==undefined)assert.equal(value.length,member.bytes);}
 };
 const assertLedger=()=>assert.equal(hash(read(LEDGER)),currentHash,'late title canonical ledger change');
 assertTools();assertLedger();
 // These two tool images and the exact prior ledger are private metadata for
 // the byte-preserved prior stage implementation. They are never executed as
 // fallback programs, and no product source is projected.
 const metadataRead=path=>{
  if(path===METADATA_ROLE)return metadataToken;
  if(path===OWNER){assert.equal(hash(read(path)),own.sha256,'changed current owner metadata source');return Buffer.from(baseImage);}
  if(path===TITLE_NATIVE_REGISTRY){assert.equal(hash(read(path)),TITLE_NATIVE_AFTER,'changed current native metadata source');return Buffer.from(nativeBefore);}
  if(path==='scripts/autocomplete-selection-native-subject.mjs'){
   assert.equal(hash(read(path)),bound.find(member=>member.path===path).sha256,'changed current native-subject metadata source');return original(root,path);
  }
  if(path===LEDGER&&[AFTER,tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256].includes(currentHash)){assertTools();return Buffer.from(before);}
  return read(path);
 };
 const source=title.inspectTitleSource({root,read});
 assert.equal(title.sourceOk({root,read,entry:stage.entry,body,review:body.reviews[0],proof:stage.entry.individual_proof}),true,'fresh title source admission failed');
 for(const entry of themingStage.entries)assert.equal(theming.sourceOk({root,read,entry,body:tools.body,review:tools.body.reviews.find(row=>row.sha===entry.sha),proof:entry.individual_proof}),true,'fresh theming source admission failed');
 const themingSource=reviewThemingInspectionSource({root,read});
 for(const entry of inspectionStage.entries)assert.equal(inspection.sourceOk({root,read,entry,body:tools.successor.body,review:tools.successor.body.reviews.find(row=>row.sha===entry.sha),proof:entry.individual_proof}),true,'fresh inspection source admission failed');
 const inspectionSource=reviewInspectionCompatibilitySource({root,read});
 for(const entry of selectorDensityStage.entries)assert.equal(selectorDensity.sourceOk({root,read,entry,body:tools.successor.successor.body,review:tools.successor.successor.body.reviews.find(row=>row.sha===entry.sha),proof:entry.individual_proof}),true,'fresh selector/density source admission failed');
 const selectorDensitySource=reviewSelectorDensitySource({root,read});
 for(const entry of buttonTokenizationStage.entries)assert.equal(buttonTokenization.sourceOk({root,read,entry,body:tools.successor.successor.successor.body,review:tools.successor.successor.successor.body.reviews.find(row=>row.sha===entry.sha),proof:entry.individual_proof}),true,'fresh button tokenization source admission failed');
 const buttonTokenizationSource=reviewButtonTokenizationSource({root,read});
 const assertCurrent=()=>{assertTools();assertLedger();source.assertCurrent();themingSource.assertCurrent();inspectionSource.assertCurrent();selectorDensitySource.assertCurrent();buttonTokenizationSource.assertCurrent();};
 assertCurrent();return {packet,stage,themingStage,inspectionStage,selectorDensityStage,buttonTokenizationStage,metadataRead,assertCurrent,bound:[...bound,...source.bound,...themingSource.bound,...inspectionSource.bound,...selectorDensitySource.bound,...buttonTokenizationSource.bound],
  titleApplied:[AFTER,tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256].includes(currentHash),themingApplied:[tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256].includes(currentHash),inspectionApplied:[tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256].includes(currentHash),selectorDensityApplied:[tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256].includes(currentHash),buttonTokenizationApplied:currentHash===tools.successor.successor.successor.packet.after.sha256,currentHash};
}
function actualBound(prior,ctx){
 const bound=new Map(prior);
 for(const member of ctx.bound)bound.set(member.path,member.sha256);
 return bound;
}
export function packedUpstreamLedgerRawRead({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read,true);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;
}
export function preparePackedUpstreamLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const ctx=context(root,read),prior=base.preparePackedUpstreamLedger({root,read:ctx.metadataRead});
 assert.equal(hash(prior.canonical_after),TITLE_LEDGER_BEFORE);
 const current=actualBound(prior.bound,ctx),native=prior.native_spec_source;
 const nativeBound=native.bound.map(member=>({...member,sha256:current.get(member.path)??member.sha256,bytes:read(member.path).length}));
 // The old bound set was measured through private metadata. Its public form
 // records actual current tools; the preserved stage checks remain separate.
 return {...prior,canonical_after:ctx.buttonTokenizationStage.after,bound:current,
  native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{ctx.assertCurrent();native.assertCurrent();ctx.assertCurrent();}},
  title_stage:{...ctx.stage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  theming_stage:{...ctx.themingStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  inspection_stage:{...ctx.inspectionStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  selector_density_stage:{...ctx.selectorDensityStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  button_tokenization_stage:{...ctx.buttonTokenizationStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  prior_metadata_assert_current:()=>{ctx.assertCurrent();for(const [path,digest]of prior.bound)assert.equal(hash(ctx.metadataRead(path)),digest);},
  assertCurrent:ctx.assertCurrent};
}
export function packedUpstreamLedgerEpoch({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const ctx=context(root,read),prior=base.packedUpstreamLedgerEpoch({root,read:ctx.metadataRead});
 const assertCurrent=()=>{ctx.assertCurrent();prior.assertCurrent();ctx.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);ctx.assertCurrent();const value=prior.read(path);ctx.assertCurrent();return value;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,
  individual_decisions_applied:prior.individual_decisions_applied+(ctx.titleApplied?1:0)+(ctx.themingApplied?2:0)+(ctx.inspectionApplied?4:0)+(ctx.selectorDensityApplied?2:0)+(ctx.buttonTokenizationApplied?5:0),
  title_source_decisions_applied:ctx.titleApplied?1:0,title_native_registry_metadata_tokens_applied:ctx.titleApplied?14:0,
  theming_source_decisions_applied:ctx.themingApplied?2:0,inspection_source_decisions_applied:ctx.inspectionApplied?4:0,selector_density_source_decisions_applied:ctx.selectorDensityApplied?2:0,button_tokenization_source_decisions_applied:ctx.buttonTokenizationApplied?5:0,
  current_tool_bytes_exposed_without_projection:true,old_product_bytes_exposed:false,
  current_native_packed_or_floor_or_g11_credit:false};
}

/** Authenticate current tool references without exposing a historical reader. */
export function qualifyCanonicalToolReference({root=process.cwd(),read=disk(root),prior}={}){
 assert.equal(resolve(root),ROOT);assert.ok([OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',THEMING_REGISTRY].includes(prior?.path));
 let role;try{role=read(METADATA_ROLE);}catch{/* A physical current reader has no private metadata capability. */}
 if(role===metadataToken){assert.equal(hash(read(prior.path)),prior.sha256);return null;}
 const tools=themingTools(root,read);
 const before=prior.path===THEMING_REGISTRY?[tools.registryBefore,tools.successor.registryBefore,tools.successor.successor.registryBefore,tools.successor.successor.successor.registryBefore].find(raw=>hash(raw)===prior.sha256):original(root,prior.path);assert.ok(before,'unqualified canonical registry prior');assert.equal(hash(before),prior.sha256,'unqualified canonical tool prior');
 if(prior.bytes!==undefined)assert.equal(before.length,prior.bytes);
 const raw=read(PACKET);assert.equal(hash(raw),PACKET_HASH);const packet=JSON.parse(raw);
 const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');
 const bound=[...new Map([{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members.map(tools.currentReference),packet.root_checker,...tools.bound].map(ref=>[ref.path,ref])).values()].map(member=>({...member,bytes:member.bytes??read(member.path).length}));
 const assertCurrent=()=>{for(const member of bound){const value=read(member.path);assert.equal(hash(value),member.sha256,'changed current canonical tool '+member.path);if(member.bytes!==undefined)assert.equal(value.length,member.bytes);}};
 assertCurrent();const value=read(prior.path),reference={path:prior.path,sha256:hash(value),bytes:value.length};
 return {reference,bound:structuredClone(bound),assertCurrent,individual_source_decisions:1,metadata_tokens:14,old_tool_bytes_exposed:false,current_native_or_packed_qualified:false};
}
