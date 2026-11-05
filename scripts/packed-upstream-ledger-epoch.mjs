/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current canonical owner: preserved prior stages plus one explicit title stage. */
import assert from 'node:assert/strict';
import {inventoryReferenceOwnerContext} from './inventory-reference-owner.mjs';
import {historicalContractRepairReaderSubject} from './historical-contract-repair-readers.mjs';
import {canonicalSourcePhysicalBoundary} from './current-sass-canonical-source-boundary.mjs';
import {legacyRemovalOwnerContext} from './legacy-removal-canonical-stage.mjs';
import {tableLocalCompilationOwnerContext} from './table-local-compilation-canonical-stage.mjs';
import {baseClassRemovalOwnerContext} from './base-class-removal-canonical-stage.mjs';
import {assertBaseClassRemovalSourceInspectorIdentity} from './base-class-removal-owner-source.mjs';
import {currentAuthoredRosterSourceSubject,currentAuthoredRosterRawRead} from './current-authored-roster-source.mjs';
import {legacyRemovalOwnerSourceSubject} from './legacy-removal-owner-source.mjs';
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
import buttonTokenRepairs from './upstream-button-token-repairs-admission.cjs';
import {applyButtonTokenRepairsCanonicalStage,buttonTokenRepairsRegistrySuccessor} from './button-token-repairs-canonical-stage.mjs';
import surfaceM3Theme from './upstream-surface-m3-theme-admission.cjs';
import {applySurfaceM3ThemeCanonicalStage,surfaceM3ThemeRegistrySuccessor} from './surface-m3-theme-canonical-stage.mjs';
import sliderM3Repairs from './upstream-slider-m3-repairs-admission.cjs';
import {applySliderM3RepairsCanonicalStage,sliderM3RepairsRegistrySuccessor} from './slider-m3-repairs-canonical-stage.mjs';
import controlM3Theme from './upstream-control-m3-theme-admission.cjs';
import {applyControlM3ThemeCanonicalStage,controlM3ThemeRegistrySuccessor} from './control-m3-theme-canonical-stage.mjs';
import foundationM3Theme from './upstream-foundation-m3-theme-admission.cjs';
import {applyFoundationM3ThemeCanonicalStage,foundationM3ThemeRegistrySuccessor} from './foundation-m3-theme-canonical-stage.mjs';
import coreTokenization from './upstream-core-tokenization-admission.cjs';
import {applyCoreTokenizationCanonicalStage,coreTokenizationRegistrySuccessor} from './core-tokenization-canonical-stage.mjs';
import remainingUnthemable from './upstream-remaining-unthemable-admission.cjs';
import {applyRemainingUnthemableCanonicalStage,remainingUnthemableRegistrySuccessor} from './remaining-unthemable-canonical-stage.mjs';
import {inspectCanonicalSourceTransaction,canonicalSourceTransactionReference} from './canonical-source-transaction.mjs';
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
const BUTTON_TOKEN_REPAIRS_PACKET='compatibility/rc/21x-c04-button-token-repairs-canonical-transition.json';
const BUTTON_TOKEN_REPAIRS_PACKET_HASH='34aa5b3bb4ada73ff77f58d3e692af1bfcd88bd92586de313867fcf7f243a201';
const SURFACE_M3_THEME_PACKET='compatibility/rc/21x-c04-surface-m3-theme-canonical-transition.json';
const SURFACE_M3_THEME_PACKET_HASH='c4fc827f5fcd6f5494ce34090a8b6d51b34d451ca82bd9db1d2abec3e1c8a6b1';
const SLIDER_M3_REPAIRS_PACKET='compatibility/rc/21x-c04-slider-m3-repairs-canonical-transition.json';
const SLIDER_M3_REPAIRS_PACKET_HASH='96196f13ab8386749c10426d16e630908c370426170c934d9c5401e94bb1bd99';
const CONTROL_M3_THEME_PACKET='compatibility/rc/21x-c04-control-m3-theme-canonical-transition.json';
const CONTROL_M3_THEME_PACKET_HASH='416ab63c24277f15a91e5885cab327b68e35070efe0623975b62880123e4904f';
const FOUNDATION_M3_THEME_PACKET='compatibility/rc/21x-c04-foundation-m3-theme-canonical-transition.json';
const FOUNDATION_M3_THEME_PACKET_HASH='1c7120da9c25c71125b5e236e1f9451887b3440b7825991d5db275f243953c56';
const CORE_TOKENIZATION_PACKET='compatibility/rc/21x-c04-core-tokenization-canonical-transition.json';
const CORE_TOKENIZATION_PACKET_HASH='e11c688ee705819aab9689cd6e05a89817e4a1546c68b08788586ea2ddacda23';
const REMAINING_UNTHEMABLE_PACKET='compatibility/rc/21x-c04-remaining-unthemable-canonical-transition.json';
const REMAINING_UNTHEMABLE_PACKET_HASH='607c37b36c84f557c836cf83fb39e9e508f483ade1dff3d1d2b57c813dd7759c';
const SOURCE_TRANSACTION='compatibility/rc/21x-c04-owner-source-transaction-inputs.json';
const SOURCE_TRANSACTION_HASH='96f4322243e31e55558ea0a36c363c883086b618e5f0049c4c48ad7fd7dea887';
const AFTER='80123c4e8c4f7f43330553ffca84e51fea98e70f545234cf5359c11128e548d7';
const AUTHORITY='33e11b2965c9ff559865bc81298e6766653672be';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const image=readFileSync(fileURLToPath(import.meta.url)),readers=new WeakMap(),originals=new Map();
const METADATA_ROLE='compatibility/rc/.canonical-owned-tool-metadata-role';
const metadataToken=Buffer.from('owned canonical tool metadata');
const disk=root=>path=>readFileSync(join(root,path));
// Only the exact locally constructed owner contexts below can write this map.
// It is deliberately separate from public historical-ledger unwrapping.
const sourceMetadataReaders=new WeakMap();
const sourceMetadataPaths={
 title:[OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',LEDGER],
 inventory:[LEDGER,'testing/legacy-runner/historical-inventory.json','.github/workflows/ci.yml','scripts/upstream-dialog-title-admission.cjs','scripts/upstream-dialog-title-native-evidence.mjs'],
 legacy:[LEDGER],table:[LEDGER],base_class:[LEDGER],
};
function bindSourceMetadata(root,context,currentRead,role){
 assert.ok(Object.hasOwn(sourceMetadataPaths,role));assert.equal(typeof context.metadataRead,'function');
 assert.notEqual(context.metadataRead,currentRead);assert.equal(typeof context.assertCurrent,'function');
 assert.equal(sourceMetadataReaders.has(context.metadataRead),false);
 context.assertCurrent();const references=new Map();
 for(const path of sourceMetadataPaths[role]){
  const before=context.metadataRead(path),after=currentRead(path);assert.ok(Buffer.isBuffer(before)&&Buffer.isBuffer(after));
  if(!before.equals(after))references.set(path,{before:{path,sha256:hash(before),bytes:before.length},after:{path,sha256:hash(after),bytes:after.length}});
 }
 context.assertCurrent();sourceMetadataReaders.set(context.metadataRead,{root:resolve(root),raw:currentRead,read:context.metadataRead,guard:context.assertCurrent,references});
 return context;
}
/** Read-only resolver; unknown callbacks receive no authority or disk fallback. */
export function packedUpstreamLedgerCurrentSourceLane({root,read}){
 const frames=[],seen=new Set();let current=read;
 while(sourceMetadataReaders.has(current)){
  assert.equal(seen.has(current),false,'cyclic canonical source metadata reader');seen.add(current);
  const frame=sourceMetadataReaders.get(current);assert.equal(frame.root,resolve(root));frames.push(frame);current=frame.raw;
 }
 const assertCurrent=()=>{for(const frame of frames){assertBaseClassRemovalSourceInspectorIdentity();for(const row of frame.references.values()){
  for(const[reader,ref]of [[frame.read,row.before],[frame.raw,row.after]]){const raw=reader(ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed canonical source-lane reference '+ref.path);assert.equal(raw.length,ref.bytes);}
 }frame.guard();}};
 const comparisonReference=ref=>{
  let result={...ref};
  for(const frame of [...frames].reverse()){
   const row=frame.references.get(result.path);if(!row)continue;
   for(const[reader,expected]of [[frame.read,row.before],[frame.raw,row.after]]){const raw=reader(expected.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),expected.sha256,'changed canonical source-lane member '+expected.path);assert.equal(raw.length,expected.bytes);}
   assert.equal(result.sha256,row.after.sha256,'unqualified canonical source-lane reference '+result.path);
   if(result.bytes!==undefined)assert.equal(result.bytes,row.after.bytes);
   result={...result,sha256:row.before.sha256,...(result.bytes===undefined?{}:{bytes:row.before.bytes})};
  }
  return result;
 };
 return {read:current,comparisonReference,assertCurrent,registered_frames:frames.length};
}
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
function sourceTransactionTools(root,read){
 const boundary=canonicalSourcePhysicalBoundary({root,read});read=boundary.read;
 const raw=read(SOURCE_TRANSACTION);assert.equal(hash(raw),SOURCE_TRANSACTION_HASH,'changed canonical source transaction packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.schema_version,1);assert.equal(packet.canonical_dispositions_changed,0);assert.equal(packet.source_admissions,56);
 assert.deepEqual(packet.families,{theming:2,inspection:4,'selector-density':2,'button-tokenization':5});assert.equal(packet.individual_metadata_rows_preserved,13);
 assert.equal(packet.root_per_SHA_source_dispatch_unchanged,true);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 assert.deepEqual(packet.before_owner,{path:OWNER,sha256:'4f93d241fee195be6c9d052473af37f1e19ba9394c8de444a9dd154452f14ebc',bytes:33317});
 const repairs=historicalContractRepairReaderSubject({root,read}),helperRef=repairs.qualify(packet.helper);
 assert.deepEqual(helperRef,canonicalSourceTransactionReference(),'unqualified current source transaction helper');
 const baseRef=repairs.qualify(packet.byte_preserved_base);assert.ok(baseRef,'unqualified current base source-lane successor');
 const baseImage=repairs.comparisonBytes(packet.byte_preserved_base);assert.equal(hash(baseImage),packet.byte_preserved_base.sha256);assert.equal(baseImage.length,packet.byte_preserved_base.bytes);
 const bound=[{path:SOURCE_TRANSACTION,sha256:SOURCE_TRANSACTION_HASH,bytes:raw.length},helperRef,baseRef,packet.byte_preserved_root_checker,...repairs.bound];
 const assertCurrent=()=>{repairs.assertCurrent();for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed source transaction tool '+ref.path);assert.equal(value.length,ref.bytes);}boundary.assertPhysical();};
 assertCurrent();return {bound,assertCurrent,baseImage:Buffer.from(baseImage)};
}
function remainingUnthemableTools(root,read,repairs){
 const raw=read(REMAINING_UNTHEMABLE_PACKET);assert.equal(hash(raw),REMAINING_UNTHEMABLE_PACKET_HASH,'changed remaining unthemable canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'692c2e3200935e2ff23b201888903b02675e1571');
 assert.equal(packet.individual_decisions,14);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,14);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1683);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=remainingUnthemableRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-remaining-unthemable-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 const bound=[{path:REMAINING_UNTHEMABLE_PACKET,sha256:REMAINING_UNTHEMABLE_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,packet.registry_after,...patches,...repairs.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed remaining unthemable tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body};
}
function coreTokenizationTools(root,read,repairs){
 const successor=remainingUnthemableTools(root,read,repairs);
 const raw=read(CORE_TOKENIZATION_PACKET);assert.equal(hash(raw),CORE_TOKENIZATION_PACKET_HASH,'changed core tokenization canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'fab613002c9bb6c6235e2157dadeb0b4d982179f');
 assert.equal(packet.individual_decisions,3);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,3);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1694);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=coreTokenizationRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-core-tokenization-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'remaining unthemable registry does not succeed exact core tokenization registry');
 const bound=[{path:CORE_TOKENIZATION_PACKET,sha256:CORE_TOKENIZATION_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed core tokenization tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function foundationM3ThemeTools(root,read,repairs){
 const successor=coreTokenizationTools(root,read,repairs);
 const raw=read(FOUNDATION_M3_THEME_PACKET);assert.equal(hash(raw),FOUNDATION_M3_THEME_PACKET_HASH,'changed foundation M3 theme canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'e91b3ceaf147c882361930c67220014669dd77d3');
 assert.equal(packet.individual_decisions,6);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,6);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1691);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=foundationM3ThemeRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-foundation-m3-theme-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'core tokenization registry does not succeed exact foundation M3 theme registry');
 const bound=[{path:FOUNDATION_M3_THEME_PACKET,sha256:FOUNDATION_M3_THEME_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed foundation M3 theme tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function controlM3ThemeTools(root,read,repairs){
 const successor=foundationM3ThemeTools(root,read,repairs);
 const raw=read(CONTROL_M3_THEME_PACKET);assert.equal(hash(raw),CONTROL_M3_THEME_PACKET_HASH,'changed control M3 theme canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'7131016f8bc8011c3ac27e799d0200a6a708f977');
 assert.equal(packet.individual_decisions,4);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,4);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1693);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=controlM3ThemeRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-control-m3-theme-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'foundation M3 theme registry does not succeed exact control M3 theme registry');
 const bound=[{path:CONTROL_M3_THEME_PACKET,sha256:CONTROL_M3_THEME_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed control M3 theme tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function sliderM3RepairsTools(root,read,repairs){
 const successor=controlM3ThemeTools(root,read,repairs);
 const raw=read(SLIDER_M3_REPAIRS_PACKET);assert.equal(hash(raw),SLIDER_M3_REPAIRS_PACKET_HASH,'changed slider M3 repairs canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'30bcfb49fbf185567b4cd8ba3a022bf0c54a5d56');
 assert.equal(packet.individual_decisions,2);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,2);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1695);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=sliderM3RepairsRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-slider-m3-repairs-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'control M3 theme registry does not succeed exact slider M3 repairs registry');
 const bound=[{path:SLIDER_M3_REPAIRS_PACKET,sha256:SLIDER_M3_REPAIRS_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed slider M3 repairs tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function surfaceM3ThemeTools(root,read,repairs){
 const successor=sliderM3RepairsTools(root,read,repairs);
 const raw=read(SURFACE_M3_THEME_PACKET);assert.equal(hash(raw),SURFACE_M3_THEME_PACKET_HASH,'changed surface M3 theme canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'368363eaf44760e4aea73c5a0811c739777582e3');
 assert.equal(packet.individual_decisions,3);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,3);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1694);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=surfaceM3ThemeRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-surface-m3-theme-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'slider M3 repairs registry does not succeed exact surface M3 theme registry');
 const bound=[{path:SURFACE_M3_THEME_PACKET,sha256:SURFACE_M3_THEME_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed surface M3 theme tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function buttonTokenRepairsTools(root,read,repairs){
 const successor=surfaceM3ThemeTools(root,read,repairs);
 const raw=read(BUTTON_TOKEN_REPAIRS_PACKET);assert.equal(hash(raw),BUTTON_TOKEN_REPAIRS_PACKET_HASH,'changed button token repairs canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'2103cdde255ea68b82b51f94f42e6c9b95824ea0');
 assert.equal(packet.individual_decisions,2);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,2);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1695);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=buttonTokenRepairsRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-button-token-repairs-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'surface M3 theme registry does not succeed exact button token-repairs registry');
 const bound=[{path:BUTTON_TOKEN_REPAIRS_PACKET,sha256:BUTTON_TOKEN_REPAIRS_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed button token repairs tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function buttonTokenizationTools(root,read,repairs){
 const successor=buttonTokenRepairsTools(root,read,repairs);
 const raw=read(BUTTON_TOKENIZATION_PACKET);assert.equal(hash(raw),BUTTON_TOKENIZATION_PACKET_HASH,'changed button tokenization canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.line,'21.x');assert.equal(packet.source_parent,'878b00dacaca2a8417dd0aebefc8adce6a8a9277');
 assert.equal(packet.individual_decisions,5);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.registry_records_added,5);
 assert.equal(packet.unselected_entry_bytes_to_preserve,1692);assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const registryBefore=original(root,THEMING_REGISTRY,packet.source_parent),registryAfter=buttonTokenizationRegistrySuccessor(registryBefore);
 assert.deepEqual(packet.registry_before,{path:THEMING_REGISTRY,sha256:hash(registryBefore),bytes:registryBefore.length});
 assert.deepEqual(packet.registry_after,{path:THEMING_REGISTRY,sha256:hash(registryAfter),bytes:registryAfter.length});
 const bodyRaw=read(packet.review.path);assert.equal(hash(bodyRaw),packet.review.sha256);assert.equal(bodyRaw.length,packet.review.bytes);const body=JSON.parse(bodyRaw);
 const patches=body.reviews.map(row=>{assert.equal(row.patch_file,'compatibility/rc/21x-c04-button-tokenization-'+row.sha+'.patch');const value=read(row.patch_file);return {path:row.patch_file,sha256:row.diff_sha256,bytes:value.length};});
 assert.equal(registryAfter.equals(successor.registryBefore),true,'button token-repairs registry does not succeed exact button-tokenization registry');
 const bound=[{path:BUTTON_TOKENIZATION_PACKET,sha256:BUTTON_TOKENIZATION_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed button tokenization tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function selectorDensityTools(root,read,repairs){
 const successor=buttonTokenizationTools(root,read,repairs);
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
 const bound=[{path:SELECTOR_DENSITY_PACKET,sha256:SELECTOR_DENSITY_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed selector/density tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function inspectionTools(root,read,repairs){
 const successor=selectorDensityTools(root,read,repairs);
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
 const bound=[{path:INSPECTION_PACKET,sha256:INSPECTION_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed inspection tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,registryAfter,bound,assertCurrent,body,successor};
}
function themingTools(root,read,repairs){
 const successor=inspectionTools(root,read,repairs);
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
 const bound=[{path:THEMING_PACKET,sha256:THEMING_PACKET_HASH,bytes:raw.length},...packet.source_members.map(ref=>repairs.qualify(ref)??ref),packet.review,...patches,...successor.bound];
 const assertCurrent=()=>{for(const ref of bound){const value=read(ref.path);assert.equal(hash(value),ref.sha256,'changed theming tool/source binding '+ref.path);assert.equal(value.length,ref.bytes);}};
 assertCurrent();return {packet,registryBefore,bound,assertCurrent,body,successor,
  currentReference:ref=>ref.path===THEMING_REGISTRY?successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.registry_after:ref};
}
function currentThemingTools(root,read){
 const boundary=canonicalSourcePhysicalBoundary({root,read});read=boundary.read;
 const legacy=legacyRemovalOwnerSourceSubject({root,read});
 const comparisonRead=path=>path===THEMING_REGISTRY?legacy.registryComparisonBytes():read(path);
 const repairs=historicalContractRepairReaderSubject({root,read});
 const prior=themingTools(root,comparisonRead,repairs);
 const currentReference=ref=>{const previous=prior.currentReference(ref);return previous.path===THEMING_REGISTRY?legacy.qualifyReference(previous):previous;};
 const bound=prior.bound.map(currentReference),assertCurrent=()=>{legacy.assertCurrent();repairs.assertCurrent();prior.assertCurrent();for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}repairs.assertCurrent();boundary.assertPhysical();};
 assertCurrent();return {...prior,bound,currentReference,assertCurrent};
}
function legacyRegistryMetadataReference(root,read,prior){
 const legacy=legacyRemovalOwnerSourceSubject({root}),reference=legacy.qualifyReference(prior);
 const assertCurrent=()=>{legacy.assertCurrent();assert.equal(hash(read(prior.path)),reference.sha256);};
 assertCurrent();return {reference,bound:[...legacy.bound,reference],assertCurrent,individual_source_decisions:0,metadata_tokens:0,old_tool_bytes_exposed:false,current_native_or_packed_qualified:false};
}
function context(root,read){
 assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');
 const sourceLane=packedUpstreamLedgerCurrentSourceLane({root,read}),sourceRead=sourceLane.read;
 const transaction=sourceTransactionTools(root,sourceRead);
 const tools=currentThemingTools(root,sourceRead);
 const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');
 const frames=JSON.parse(frameRaw);assert.equal(frames.schema_version,1);assert.equal(frames.line,'21.x');
 assert.equal(frames.frames.length,21);assert.equal(new Set(frames.frames.map(frame=>frame.sha256)).size,21);
 const ledgerRaw=read(LEDGER),currentHash=hash(ledgerRaw);
 assert.ok([...frames.frames,tools.packet.after,tools.successor.packet.after,tools.successor.successor.packet.after,tools.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after].some(frame=>frame.sha256===currentHash&&frame.bytes===ledgerRaw.length),'not an accepted complete ledger frame');
 const raw=read(PACKET);assert.equal(hash(raw),PACKET_HASH,'changed title canonical packet');const packet=JSON.parse(raw);
 assert.equal(packet.source_parent,AUTHORITY);assert.equal(packet.line,'21.x');assert.equal(packet.individual_decisions,1);
 assert.equal(packet.metadata_tokens,14);assert.equal(packet.summary_scalar_tokens,2);assert.equal(packet.unselected_judgments_changed,0);
 assert.equal(packet.actual_native_artifact_browser_floor_or_full_audit_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 const before=original(root,LEDGER);assert.equal(hash(before),TITLE_LEDGER_BEFORE);assert.equal(before.length,packet.before.bytes);
 assert.deepEqual(packet.before,{path:LEDGER,sha256:TITLE_LEDGER_BEFORE,bytes:before.length});
 const baseImage=transaction.baseImage;assert.equal(hash(baseImage),'ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715');
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
 assert.deepEqual(tools.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.packet.after);
 const buttonTokenRepairsStage=applyButtonTokenRepairsCanonicalStage({before:buttonTokenizationStage.after,body:tools.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(buttonTokenRepairsStage.after),bytes:buttonTokenRepairsStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.packet.after);
 const surfaceM3ThemeStage=applySurfaceM3ThemeCanonicalStage({before:buttonTokenRepairsStage.after,body:tools.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(surfaceM3ThemeStage.after),bytes:surfaceM3ThemeStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.successor.packet.after);
 const sliderM3RepairsStage=applySliderM3RepairsCanonicalStage({before:surfaceM3ThemeStage.after,body:tools.successor.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(sliderM3RepairsStage.after),bytes:sliderM3RepairsStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.successor.successor.packet.after);
 const controlM3ThemeStage=applyControlM3ThemeCanonicalStage({before:sliderM3RepairsStage.after,body:tools.successor.successor.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(controlM3ThemeStage.after),bytes:controlM3ThemeStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.successor.successor.successor.packet.after);
 const foundationM3ThemeStage=applyFoundationM3ThemeCanonicalStage({before:controlM3ThemeStage.after,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(foundationM3ThemeStage.after),bytes:foundationM3ThemeStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after);
 const coreTokenizationStage=applyCoreTokenizationCanonicalStage({before:foundationM3ThemeStage.after,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(coreTokenizationStage.after),bytes:coreTokenizationStage.after.length});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.before,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after);
 const remainingUnthemableStage=applyRemainingUnthemableCanonicalStage({before:coreTokenizationStage.after,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.body});
 assert.deepEqual(tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after,{path:LEDGER,sha256:hash(remainingUnthemableStage.after),bytes:remainingUnthemableStage.after.length});
 const own={path:OWNER,sha256:hash(image),bytes:image.length};
 const repairs=historicalContractRepairReaderSubject({root,read:sourceRead});
 const bound=[...new Map([own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members.map(tools.currentReference),packet.root_checker,...tools.bound,...transaction.bound,...repairs.bound].map(ref=>repairs.qualify(ref)??ref).map(ref=>[ref.path,ref])).values()];
 const assertTools=()=>{
  sourceLane.assertCurrent();repairs.assertCurrent();
  for(const member of bound){const value=sourceRead(member.path);assert.equal(hash(value),member.sha256,'changed title owner binding '+member.path);if(member.bytes!==undefined)assert.equal(value.length,member.bytes);}
 };
 const assertLedger=()=>assert.equal(hash(read(LEDGER)),currentHash,'late title canonical ledger change');
 assertTools();assertLedger();
 // These two tool images and the exact prior ledger are private metadata for
 // the byte-preserved prior stage implementation. They are never executed as
 // fallback programs, and no product source is projected.
 const metadataRead=path=>{
  if(path===METADATA_ROLE)return metadataToken;
  if(path===OWNER){assert.equal(hash(sourceRead(path)),own.sha256,'changed current owner metadata source');return Buffer.from(baseImage);}
  if(path===TITLE_NATIVE_REGISTRY){assert.equal(hash(sourceRead(path)),TITLE_NATIVE_AFTER,'changed current native metadata source');return Buffer.from(nativeBefore);}
  if(path==='scripts/autocomplete-selection-native-subject.mjs'){
   assert.equal(hash(sourceRead(path)),bound.find(member=>member.path===path).sha256,'changed current native-subject metadata source');return original(root,path);
  }
  if(path===LEDGER&&[AFTER,tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash)){assertTools();return Buffer.from(before);}
  return read(path);
 };
 const source=title.inspectTitleSource({root,read:sourceRead});
 assert.equal(title.sourceOk({root,read:sourceRead,entry:stage.entry,body,review:body.reviews[0],proof:stage.entry.individual_proof}),true,'fresh title source admission failed');
 const themingSource=inspectCanonicalSourceTransaction({root,read:sourceRead,family:'theming',entries:themingStage.entries,body:tools.body});
 assert.equal(themingSource.individual_metadata_cases,themingStage.entries.length,'every individual source row must be verified');
 const inspectionSource=inspectCanonicalSourceTransaction({root,read:sourceRead,family:'inspection',entries:inspectionStage.entries,body:tools.successor.body});
 assert.equal(inspectionSource.individual_metadata_cases,inspectionStage.entries.length,'every individual source row must be verified');
 const selectorDensitySource=inspectCanonicalSourceTransaction({root,read:sourceRead,family:'selector-density',entries:selectorDensityStage.entries,body:tools.successor.successor.body});
 assert.equal(selectorDensitySource.individual_metadata_cases,selectorDensityStage.entries.length,'every individual source row must be verified');
 const buttonTokenizationSource=inspectCanonicalSourceTransaction({root,read:sourceRead,family:'button-tokenization',entries:buttonTokenizationStage.entries,body:tools.successor.successor.successor.body});
 assert.equal(buttonTokenizationSource.individual_metadata_cases,buttonTokenizationStage.entries.length,'every individual source row must be verified');
 const buttonTokenRepairsSource=buttonTokenRepairs.inspectCanonicalSource({root,read:sourceRead,entries:buttonTokenRepairsStage.entries,body:tools.successor.successor.successor.successor.body});
 const surfaceM3ThemeSource=surfaceM3Theme.inspectCanonicalSource({root,read:sourceRead,entries:surfaceM3ThemeStage.entries,body:tools.successor.successor.successor.successor.successor.body});
 const sliderM3RepairsSource=sliderM3Repairs.inspectCanonicalSource({root,read:sourceRead,entries:sliderM3RepairsStage.entries,body:tools.successor.successor.successor.successor.successor.successor.body});
 const controlM3ThemeSource=controlM3Theme.inspectCanonicalSource({root,read:sourceRead,entries:controlM3ThemeStage.entries,body:tools.successor.successor.successor.successor.successor.successor.successor.body});
 const foundationM3ThemeSource=foundationM3Theme.inspectCanonicalSource({root,read:sourceRead,entries:foundationM3ThemeStage.entries,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.body});
 const coreTokenizationSource=coreTokenization.inspectCanonicalSource({root,read:sourceRead,entries:coreTokenizationStage.entries,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.body});
 const remainingUnthemableSource=remainingUnthemable.inspectCanonicalSource({root,read:sourceRead,entries:remainingUnthemableStage.entries,body:tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.body});
 const assertCurrent=()=>{assertTools();assertLedger();source.assertCurrent();themingSource.assertCurrent();inspectionSource.assertCurrent();selectorDensitySource.assertCurrent();buttonTokenizationSource.assertCurrent();buttonTokenRepairsSource.assertCurrent();surfaceM3ThemeSource.assertCurrent();sliderM3RepairsSource.assertCurrent();controlM3ThemeSource.assertCurrent();foundationM3ThemeSource.assertCurrent();coreTokenizationSource.assertCurrent();remainingUnthemableSource.assertCurrent();};
 assertCurrent();return {packet,stage,themingStage,inspectionStage,selectorDensityStage,buttonTokenizationStage,buttonTokenRepairsStage,surfaceM3ThemeStage,sliderM3RepairsStage,controlM3ThemeStage,foundationM3ThemeStage,coreTokenizationStage,remainingUnthemableStage,metadataRead,assertCurrent,bound:[...bound,...source.bound,...themingSource.bound,...inspectionSource.bound,...selectorDensitySource.bound,...buttonTokenizationSource.bound,...buttonTokenRepairsSource.bound,...surfaceM3ThemeSource.bound,...sliderM3RepairsSource.bound,...controlM3ThemeSource.bound,...foundationM3ThemeSource.bound,...coreTokenizationSource.bound,...remainingUnthemableSource.bound],
  titleApplied:[AFTER,tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),themingApplied:[tools.packet.after.sha256,tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),inspectionApplied:[tools.successor.packet.after.sha256,tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),selectorDensityApplied:[tools.successor.successor.packet.after.sha256,tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),buttonTokenizationApplied:[tools.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),buttonTokenRepairsApplied:[tools.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),surfaceM3ThemeApplied:[tools.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),sliderM3RepairsApplied:[tools.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),controlM3ThemeApplied:[tools.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),foundationM3ThemeApplied:[tools.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),coreTokenizationApplied:[tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256].includes(currentHash),remainingUnthemableApplied:currentHash===tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.packet.after.sha256,currentHash};
}
function actualBound(prior,ctx){
 const bound=new Map(prior);
 for(const member of ctx.bound)bound.set(member.path,member.sha256);
 return bound;
}
export function packedUpstreamLedgerRawRead({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read,true);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;
}
function prepareBeforeInventoryReferenceLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const ctx=bindSourceMetadata(root,context(root,read),read,'title'),prior=base.preparePackedUpstreamLedger({root,read:ctx.metadataRead});
 assert.equal(hash(prior.canonical_after),TITLE_LEDGER_BEFORE);
 const current=actualBound(prior.bound,ctx),native=prior.native_spec_source;
 for(const[path,digest]of prior.current_source_bound??[])current.set(path,digest);
 const nativeBound=native.bound.map(member=>({...member,sha256:current.get(member.path)??member.sha256,bytes:read(member.path).length}));
 // The old bound set was measured through private metadata. Its public form
 // records actual current tools; the preserved stage checks remain separate.
 return {...prior,canonical_after:ctx.remainingUnthemableStage.after,bound:current,
  native_spec_source:{...native,bound:nativeBound,assertCurrent:()=>{ctx.assertCurrent();native.assertCurrent();ctx.assertCurrent();}},
  title_stage:{...ctx.stage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  theming_stage:{...ctx.themingStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  inspection_stage:{...ctx.inspectionStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  selector_density_stage:{...ctx.selectorDensityStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  button_tokenization_stage:{...ctx.buttonTokenizationStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  button_token_repairs_stage:{...ctx.buttonTokenRepairsStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  surface_m3_theme_stage:{...ctx.surfaceM3ThemeStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  slider_m3_repairs_stage:{...ctx.sliderM3RepairsStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  control_m3_theme_stage:{...ctx.controlM3ThemeStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  foundation_m3_theme_stage:{...ctx.foundationM3ThemeStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  core_tokenization_stage:{...ctx.coreTokenizationStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  remaining_unthemable_stage:{...ctx.remainingUnthemableStage,assertCurrent:ctx.assertCurrent,source_scope_only:true,current_native_or_packed_or_floor_qualified:false},
  prior_metadata_assert_current:()=>{ctx.assertCurrent();prior.assertCurrent();for(const [path,digest]of prior.bound)assert.equal(hash(ctx.metadataRead(path)),digest);ctx.assertCurrent();},
  assertCurrent:()=>{ctx.assertCurrent();prior.assertCurrent();ctx.assertCurrent();}};
}
function epochBeforeInventoryReferenceLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const ctx=bindSourceMetadata(root,context(root,read),read,'title'),prior=base.packedUpstreamLedgerEpoch({root,read:ctx.metadataRead});
 const assertCurrent=()=>{ctx.assertCurrent();prior.assertCurrent();ctx.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);ctx.assertCurrent();const value=prior.read(path);ctx.assertCurrent();return value;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,
  individual_decisions_applied:prior.individual_decisions_applied+(ctx.titleApplied?1:0)+(ctx.themingApplied?2:0)+(ctx.inspectionApplied?4:0)+(ctx.selectorDensityApplied?2:0)+(ctx.buttonTokenizationApplied?5:0)+(ctx.buttonTokenRepairsApplied?2:0)+(ctx.surfaceM3ThemeApplied?3:0)+(ctx.sliderM3RepairsApplied?2:0)+(ctx.controlM3ThemeApplied?4:0)+(ctx.foundationM3ThemeApplied?6:0)+(ctx.coreTokenizationApplied?3:0)+(ctx.remainingUnthemableApplied?14:0),
  title_source_decisions_applied:ctx.titleApplied?1:0,title_native_registry_metadata_tokens_applied:ctx.titleApplied?14:0,
  theming_source_decisions_applied:ctx.themingApplied?2:0,inspection_source_decisions_applied:ctx.inspectionApplied?4:0,selector_density_source_decisions_applied:ctx.selectorDensityApplied?2:0,button_tokenization_source_decisions_applied:ctx.buttonTokenizationApplied?5:0,button_token_repairs_source_decisions_applied:ctx.buttonTokenRepairsApplied?2:0,surface_m3_theme_source_decisions_applied:ctx.surfaceM3ThemeApplied?3:0,slider_m3_repairs_source_decisions_applied:ctx.sliderM3RepairsApplied?2:0,control_m3_theme_source_decisions_applied:ctx.controlM3ThemeApplied?4:0,foundation_m3_theme_source_decisions_applied:ctx.foundationM3ThemeApplied?6:0,core_tokenization_source_decisions_applied:ctx.coreTokenizationApplied?3:0,remaining_unthemable_source_decisions_applied:ctx.remainingUnthemableApplied?14:0,
  current_tool_bytes_exposed_without_projection:true,old_product_bytes_exposed:false,
  current_native_packed_or_floor_or_g11_credit:false};
}

/** Authenticate current tool references without exposing a historical reader. */
function qualifyBeforeInventoryReferenceToolReference({root=process.cwd(),read=disk(root),prior}={}){
 assert.equal(resolve(root),ROOT);assert.ok([OWNER,TITLE_NATIVE_REGISTRY,'scripts/autocomplete-selection-native-subject.mjs',THEMING_REGISTRY].includes(prior?.path));
 let role;try{role=read(METADATA_ROLE);}catch{/* A physical current reader has no private metadata capability. */}
 if(role===metadataToken){if(prior.path===THEMING_REGISTRY&&hash(read(prior.path))!==prior.sha256)return legacyRegistryMetadataReference(root,read,prior);assert.equal(hash(read(prior.path)),prior.sha256);return null;}
 const sourceLane=packedUpstreamLedgerCurrentSourceLane({root,read}),boundary=canonicalSourcePhysicalBoundary({root,read:sourceLane.read}),sourceRead=boundary.read;
 const transaction=sourceTransactionTools(root,sourceRead);
 const tools=currentThemingTools(root,sourceRead);
 const before=prior.path===THEMING_REGISTRY?[tools.registryBefore,tools.successor.registryBefore,tools.successor.successor.registryBefore,tools.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.registryBefore,tools.successor.successor.successor.successor.successor.successor.successor.successor.successor.successor.registryBefore].find(raw=>hash(raw)===prior.sha256):original(root,prior.path);assert.ok(before,'unqualified canonical registry prior');assert.equal(hash(before),prior.sha256,'unqualified canonical tool prior');
 if(prior.bytes!==undefined)assert.equal(before.length,prior.bytes);
 const raw=read(PACKET);assert.equal(hash(raw),PACKET_HASH);const packet=JSON.parse(raw);
 const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');
 const repairs=historicalContractRepairReaderSubject({root,read:sourceRead});
 const bound=[...new Map([{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members.map(tools.currentReference),packet.root_checker,...tools.bound,...transaction.bound,...repairs.bound].map(ref=>repairs.qualify(ref)??ref).map(ref=>[ref.path,ref])).values()].map(member=>({...member,bytes:member.bytes??read(member.path).length}));
 const assertCurrent=()=>{sourceLane.assertCurrent();repairs.assertCurrent();for(const member of bound){const value=sourceRead(member.path);assert.equal(hash(value),member.sha256,'changed current canonical tool '+member.path);if(member.bytes!==undefined)assert.equal(value.length,member.bytes);}repairs.assertCurrent();sourceLane.assertCurrent();boundary.assertPhysical();};
 assertCurrent();const value=sourceRead(prior.path),reference={path:prior.path,sha256:hash(value),bytes:value.length};boundary.assertPhysical();
 return {reference,bound:structuredClone(bound),assertCurrent,individual_source_decisions:1,metadata_tokens:14,old_tool_bytes_exposed:false,current_native_or_packed_qualified:false};
}

/** Exact terminal inventory metadata successor; all prior source stages still execute. */
function prepareBeforeLegacyRemovalLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const inventory=bindSourceMetadata(root,inventoryReferenceOwnerContext({root,read}),read,'inventory');
 const prior=prepareBeforeInventoryReferenceLedger({root,read:inventory.metadataRead});
 return inventory.wrapPrepared(prior);
}
function epochBeforeLegacyRemovalLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const inventory=bindSourceMetadata(root,inventoryReferenceOwnerContext({root,read}),read,'inventory');
 const prior=epochBeforeInventoryReferenceLedger({root,read:inventory.metadataRead});
 const assertCurrent=()=>{inventory.assertCurrent();prior.assertCurrent();inventory.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);assertCurrent();const value=prior.read(path);assertCurrent();return value;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,
  inventory_reference_metadata_applied:inventory.applied,
  inventory_reference_metadata_entries:inventory.applied?inventory.metadata_entries:0,
  inventory_reference_metadata_source_references:inventory.applied?inventory.metadata_entries:0,
  current_native_packed_or_floor_or_g11_credit:false};
}

/** Public tool references retain current bytes and every preserved binding check. */
function qualifyBeforeLegacyRemovalToolReference({root=process.cwd(),read=disk(root),prior}={}){
 let role;try{role=read(METADATA_ROLE);}catch{/* Raw readers have no metadata capability. */}
 if(role===metadataToken)return qualifyBeforeInventoryReferenceToolReference({root,read,prior});
 const inventory=bindSourceMetadata(root,inventoryReferenceOwnerContext({root,read}),read,'inventory');
 const result=qualifyBeforeInventoryReferenceToolReference({root,read:inventory.metadataRead,prior});
 if(!result)return result;
 const bound=new Map(result.bound.map(ref=>[ref.path,{...ref}]));
 for(const ref of inventory.bound)bound.set(ref.path,{...ref});
 const assertCurrent=()=>{inventory.assertCurrent();result.assertCurrent();inventory.assertCurrent();};
 const current=read(result.reference.path);
 const reference={...result.reference,sha256:hash(current),bytes:current.length};
 assertCurrent();return {...result,reference,bound:[...bound.values()],assertCurrent};
}

/** The complete prior owner runs first; only the exact new source stage follows. */
function prepareBeforeTableLocalCompilationLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const legacy=bindSourceMetadata(root,legacyRemovalOwnerContext({root,read}),read,'legacy');
 const prior=prepareBeforeLegacyRemovalLedger({root,read:legacy.metadataRead});
 return legacy.wrapPrepared(prior);
}
function epochBeforeTableLocalCompilationLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const legacy=bindSourceMetadata(root,legacyRemovalOwnerContext({root,read}),read,'legacy');
 const prior=epochBeforeLegacyRemovalLedger({root,read:legacy.metadataRead});
 const assertCurrent=()=>{legacy.assertCurrent();prior.assertCurrent();legacy.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);assertCurrent();const raw=prior.read(path);assertCurrent();return raw;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,
  individual_decisions_applied:prior.individual_decisions_applied+(legacy.applied?1:0),
  legacy_removal_source_decisions_applied:legacy.applied?1:0,
  current_tool_bytes_exposed_without_projection:true,current_native_packed_or_floor_or_g11_credit:false};
}
function qualifyBeforeTableLocalCompilationToolReference({root=process.cwd(),read=disk(root),prior}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.qualifyCanonicalToolReference({root,read,prior});
 let role;try{role=read(METADATA_ROLE);}catch{/* A public reader has no private comparison capability. */}
 if(role===metadataToken)return qualifyBeforeLegacyRemovalToolReference({root,read,prior});
 const legacy=bindSourceMetadata(root,legacyRemovalOwnerContext({root,read}),read,'legacy');
 const result=qualifyBeforeLegacyRemovalToolReference({root,read:legacy.metadataRead,prior});
 if(!result)return result;
 const bound=new Map(result.bound.map(ref=>[ref.path,{...ref}]));for(const ref of legacy.bound)bound.set(ref.path,{...ref});
 const current=read(result.reference.path),reference={...result.reference,sha256:hash(current),bytes:current.length};
 const assertCurrent=()=>{legacy.assertCurrent();result.assertCurrent();legacy.assertCurrent();};
 assertCurrent();return {...result,reference,bound:[...bound.values()],assertCurrent,legacy_removal_source_scope:true};
}


/** Exact terminal table source decision; every prior current source stage runs. */
function prepareBeforeBaseClassRemovalLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const table=bindSourceMetadata(root,tableLocalCompilationOwnerContext({root,read}),read,'table');
 const prior=prepareBeforeTableLocalCompilationLedger({root,read:table.metadataRead});return table.wrapPrepared(prior);
}
function epochBeforeBaseClassRemovalLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const table=bindSourceMetadata(root,tableLocalCompilationOwnerContext({root,read}),read,'table'),prior=epochBeforeTableLocalCompilationLedger({root,read:table.metadataRead});
 const assertCurrent=()=>{table.assertCurrent();prior.assertCurrent();table.assertCurrent();};
 const historical=path=>{if(path!==LEDGER)return read(path);assertCurrent();const raw=prior.read(path);assertCurrent();return raw;};
 readers.set(historical,{root:resolve(root),raw:read});assertCurrent();
 return {...prior,read:historical,raw:read,assertCurrent,individual_decisions_applied:prior.individual_decisions_applied+(table.applied?1:0),table_local_compilation_source_decisions_applied:table.applied?1:0,current_tool_bytes_exposed_without_projection:true,current_native_packed_or_floor_or_g11_credit:false};
}
function qualifyBeforeBaseClassRemovalToolReference({root=process.cwd(),read=disk(root),prior}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.qualifyCanonicalToolReference({root,read,prior});
 let role;try{role=read(METADATA_ROLE);}catch{/* Public readers have no comparison capability. */}
 if(role===metadataToken)return qualifyBeforeTableLocalCompilationToolReference({root,read,prior});
 const table=bindSourceMetadata(root,tableLocalCompilationOwnerContext({root,read}),read,'table'),result=qualifyBeforeTableLocalCompilationToolReference({root,read:table.metadataRead,prior});if(!result)return result;
 const bound=new Map(result.bound.map(ref=>[ref.path,{...ref}]));for(const ref of table.bound)bound.set(ref.path,{...ref});
 const raw=read(result.reference.path),reference={...result.reference,sha256:hash(raw),bytes:raw.length};
 const assertCurrent=()=>{table.assertCurrent();result.assertCurrent();table.assertCurrent();};assertCurrent();
 return {...result,reference,bound:[...bound.values()],assertCurrent,table_local_compilation_source_scope:true};
}

/** Physical proof reads; preserve a registered roster reader on the public route. */
function baseClassRemovalProofContext(root,publicRead){
 const actual=currentAuthoredRosterRawRead({root,read:publicRead});
 const boundary=canonicalSourcePhysicalBoundary({root,read:actual}),read=boundary.read;
 const selected=baseClassRemovalOwnerContext({root,read});
 if(actual===publicRead)return {selected:bindSourceMetadata(root,selected,read,'base_class'),boundary};
 // Only the roster module's private registration can select this branch.
 // Its historical JSON views remain on publicRead, never the proof reader.
 const roster=currentAuthoredRosterSourceSubject({root,read});
 const assertCurrent=()=>{selected.assertCurrent();roster.assertCurrent();selected.assertCurrent();boundary.assertPhysical();};
 const refs=new Map([...selected.bound,...roster.bound].map(ref=>[ref.path,{...ref}]));
 const combined={...selected,assertCurrent,bound:[...refs.values()],wrapPrepared:prior=>{
  const prepared=selected.wrapPrepared(prior),bound=new Map(prepared.bound);for(const ref of refs.values())bound.set(ref.path,ref.sha256);
  const native=prepared.native_spec_source,nativeBound=native.bound.map(ref=>{const actual=refs.get(ref.path);return actual?{...ref,sha256:actual.sha256,bytes:actual.bytes}:{...ref};});
  return {...prepared,bound,native_spec_source:{...native,bound:nativeBound}};
 }};
 assertCurrent();return {selected:bindSourceMetadata(root,combined,read,'base_class'),boundary};
}

/** Exact terminal base-class source decision; all preceding owners still run. */
export function preparePackedUpstreamLedger({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.preparePackedUpstreamLedger({root,read});
 const {selected,boundary}=baseClassRemovalProofContext(root,read);
 const prior=prepareBeforeBaseClassRemovalLedger({root,read:selected.metadataRead}),prepared=selected.wrapPrepared(prior);
 const guarded=guard=>()=>{selected.assertCurrent();guard();selected.assertCurrent();boundary.assertPhysical();};
 const assertCurrent=guarded(prepared.assertCurrent);assertCurrent();
 return {...prepared,assertCurrent,
  prior_metadata_assert_current:guarded(prepared.prior_metadata_assert_current),
  native_spec_source:{...prepared.native_spec_source,assertCurrent:guarded(prepared.native_spec_source.assertCurrent)},
  base_class_removal_stage:{...prepared.base_class_removal_stage,assertCurrent:guarded(prepared.base_class_removal_stage.assertCurrent)}};
}
export function packedUpstreamLedgerEpoch({root=process.cwd(),read=disk(root)}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.packedUpstreamLedgerEpoch({root,read});
 const publicRead=read,{selected,boundary}=baseClassRemovalProofContext(root,read);
 const prior=epochBeforeBaseClassRemovalLedger({root,read:selected.metadataRead});
 const assertCurrent=()=>{selected.assertCurrent();prior.assertCurrent();selected.assertCurrent();boundary.assertPhysical();};
 const historical=path=>{if(path!==LEDGER)return publicRead(path);assertCurrent();const raw=prior.read(path);assertCurrent();return raw;};
 readers.set(historical,{root:resolve(root),raw:publicRead});assertCurrent();
 return {...prior,read:historical,raw:publicRead,assertCurrent,
  individual_decisions_applied:prior.individual_decisions_applied+(selected.applied?1:0),
  base_class_removal_source_decisions_applied:selected.applied?1:0,
  current_tool_bytes_exposed_without_projection:true,current_native_packed_or_floor_or_g11_credit:false};
}
export function qualifyCanonicalToolReference({root=process.cwd(),read=disk(root),prior}={}){
 read=unwrap(root,read);const remote=foreign(root,read);if(remote)return remote.qualifyCanonicalToolReference({root,read,prior});
 let role;try{role=read(METADATA_ROLE);}catch{/* Public readers have no private comparison capability. */}
 if(role===metadataToken)return qualifyBeforeBaseClassRemovalToolReference({root,read,prior});
 const {selected,boundary}=baseClassRemovalProofContext(root,read);
 const result=qualifyBeforeBaseClassRemovalToolReference({root,read:selected.metadataRead,prior});if(!result){boundary.assertPhysical();return result;}
 const bound=new Map(result.bound.map(ref=>[ref.path,{...ref}]));for(const ref of selected.bound)bound.set(ref.path,{...ref});
 const raw=boundary.read(result.reference.path),reference={...result.reference,sha256:hash(raw),bytes:raw.length};
 const assertCurrent=()=>{selected.assertCurrent();result.assertCurrent();selected.assertCurrent();boundary.assertPhysical();};assertCurrent();
 return {...result,reference,bound:[...bound.values()],assertCurrent,base_class_removal_source_scope:true};
}
