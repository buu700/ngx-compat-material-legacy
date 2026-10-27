/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Raw current snack ownership qualification; historical reads are explicit. */
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {dialogPortalPrior,reviewDialogPortalSource,DIALOG_PORTAL_SOURCE} from './dialog-portal-failure-recovery.mjs';
import {qualifiedTooltipScrollClipping} from './tooltip-scroll-clipping-evidence.mjs';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE} from './menu-panel-content-boundary.mjs';
import {dialogConfigOverlayBridge} from './dialog-caller-config-boundary.mjs';
import {inspectDialogOwnedContracts} from './dialog-caller-owned-contract-boundary.mjs';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
import {qualifyPackedUpstreamFocusInspector,qualifyPackedUpstreamConsolidationInspector,packedUpstreamFocusMetadataEpoch} from './packed-upstream-source-requalification.mjs';
import {qualifyPackedProductSourceRepairs} from './packed-product-source-recovery.mjs';
import {packedCvaRoleHistoricalReader,packedCvaMetadataToolingEpoch} from './packed-cva-source-requalification.mjs';
export {DIALOG_PORTAL_SOURCE};
export const SNACK_PRODUCT_INPUTS='compatibility/rc/snack-dom-source-context-product-inputs.json';
export const SNACK_SOURCE_CONTEXT_INPUTS='compatibility/rc/snack-dom-source-context-inputs.json';
export const SNACK_SOURCE='projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts';
export const TOOLTIP_SOURCE='projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts';
const pins={"main":"ed200be4fe777b10a42d5af73ce4e9818fb0584989aa887a635d5750e636260d","21.x":"1f65a5b4a9cdaa950df1d5556f1210c214c4b6299e1dd2833f9345f7222499ab"},hash=b=>createHash('sha256').update(b).digest('hex'),authenticated=new Set(),decoded=new Map(),authenticatedPriors=new Set(),branded=new WeakMap(),packedCurrentEpochs=new WeakMap();
const rawRead=root=>p=>{let path=root;for(const part of p.split('/')){assert.ok(part&&part!=='.'&&part!=='..');path=join(path,part);assert.equal(lstatSync(path).isSymbolicLink(),false);}assert.ok(lstatSync(path).isFile());return readFileSync(path);};
function currentRaw(root,read){if(!branded.has(read))return read;const previous=branded.get(read);assert.equal(previous.root,root);return previous.raw;}
export function snackDomRawCurrentRead({root=process.cwd(),read=rawRead(root)}={}){return currentRaw(root,read);}
function freeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
function original(root,commit,m){const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),m.sha256,'unauthenticated snack context member '+m.path);authenticated.add(key);}
const productPins={"main":"a2e404199af63e54b81a0c2218c12c01a3932be65304c3a7af194dd8ab04da57","21.x":"4f4ee1ec720f39e8cd5aae7d1c1101e9c0b9cbc087fa21e4f37fd0c09b1e96ff"};
function productRegistry(root,read){const raw=read(SNACK_PRODUCT_INPUTS),line=Object.keys(productPins).find(k=>hash(raw)===productPins[k]);assert.ok(line,'changed independent snack product registry');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.g11_claim,'not-passed');return {data,line,ref:{path:SNACK_PRODUCT_INPUTS,sha256:hash(raw)}};}
function capsule(bytes,sha256){assert.equal(hash(bytes),sha256);if(!decoded.has(sha256))decoded.set(sha256,freeze(JSON.parse(gunzipSync(bytes))));return decoded.get(sha256);}
function registry(root,read){const raw=read(SNACK_SOURCE_CONTEXT_INPUTS),line=Object.keys(pins).find(k=>hash(raw)===pins[k]);assert.ok(line,'changed snack source context registry');const data=JSON.parse(raw);assert.equal(data.line,line);assert.equal(data.schema_version,1);assert.equal(data.g11_claim,'not-passed');assert.equal(data.actual_native_packed_or_floor_qualified,false);assert.equal(data.new_semantic_closures,361);assert.equal(data.additional_caller_review_members.length,12);assert.equal(data.remaining_core_review_members.length,4);assert.equal(data.material_core_review_members.length,4);assert.equal(data.cdk_module_type_review_members.length,6);assert.equal(data.layout_service_review_members.length,4);assert.equal(data.table_caller_review_members.length,6);assert.equal(data.overlay_contract_review_members.length,10);assert.equal(data.tabs_review_members.length,12);assert.equal(data.form_field_review_members.length,12);assert.equal(data.menu_caller_review_members.length,12);assert.equal(data.a11y_caller_review_members.length,16);assert.equal(data.a11y_caller_public_proofs.length,2);assert.equal(data.component_config_review_members.length,34);assert.equal(data.component_config_public_proofs.length,3);assert.equal(data.dialog_config_review_members.length,12);assert.equal(data.service_default_review_members.length,11);assert.equal(data.owned_contract_review_members.length,13);assert.equal(data.dialog_caller_review_members.length,5);assert.equal(data.material_remaining_review_members.length,5);return {data,line,ref:{path:SNACK_SOURCE_CONTEXT_INPUTS,sha256:hash(raw)}};}
/** One authenticated tooling successor; no current source bytes are projected. */
function assertCurrentFocusInspector(root,read,member){return qualifyPackedUpstreamFocusInspector({root,read,member}).ref;}
export function qualifyIndependentSnackProductDelta({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);
 const {data,line,ref}=productRegistry(root,read),delta=data.delta;assert.equal(delta.path,SNACK_SOURCE);assert.equal(delta.before_sha256,'d9ddfcf0a2f5a27a17670b9c4f382b2739c9a4f9ff5baffaef542cd866ecddab');assert.equal(delta.sha256,'1b673f43bacbcf47ea0e504ff3f191d84289e7c7337b20b93e8b5b98e833eb08');assert.equal(hash(read(delta.path)),delta.sha256,'changed independently qualified snack source');assert.equal(read(delta.path).length,delta.bytes);original(root,data.qualification.source_parent,delta);
 const bytes=read(data.qualification.path);assert.equal(hash(bytes),data.qualification.sha256);original(root,data.qualification.source_parent,data.qualification);const proof=JSON.parse(bytes);assert.equal(proof.line,line);assert.equal(proof.source.current_sha256,delta.sha256);assert.equal(proof.source.before_sha256,delta.before_sha256);assert.equal(proof.source.unchanged_class_members,31);assert.equal(proof.source.other_product_resource_members_preserved,1141);assert.equal(proof.source.consumer_HTML_CSS_SCSS_changes,0);assert.equal(proof.type_subjects.length,3);assert.ok(proof.type_subjects.every(s=>s.strict&&s.skipLibCheck===false&&s.diagnostics===0&&s.callback_API_preserved));assert.equal(proof.runtime_subjects.length,10);assert.equal(proof.case_count,115);assert.equal(proof.rejected_behavior_faults,40);assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),115);assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected.length,0),40);assert.equal(proof.actual_legacy_component_native_packed_or_floor_qualified,false);
 const dialog=qualifyIndependentDialogProductDelta({root,read}),tooltip=qualifyIndependentTooltipProductDelta({root,read}),menu=qualifyIndependentMenuContentTypeDelta({root,read});
 const owned=inspectSnackCurrentDialogContracts({root,read}),service=owned.defaults,config=service.configuration;assert.deepEqual(data.owned_contracts.targets,owned.targets);assert.deepEqual(data.owned_contracts.qualification,owned.ref);assert.deepEqual(data.dialog_config.targets,config.targets);assert.deepEqual(data.dialog_config.qualification,config.qualification);const declarationCode=packedCvaMetadataToolingEpoch({root,read}).read;for(const m of data.dialog_config.current_code_members)assert.equal(hash(declarationCode(m.path)),m.sha256,'changed current dialog admission code');assert.deepEqual(data.service_defaults.targets,service.targets);assert.deepEqual(data.service_defaults.qualification,service.ref);const exportBridge=data.service_defaults.role_inspector_export;assert.equal(exportBridge.path,'scripts/dialog-caller-config-source-rebinding.mjs');original(root,exportBridge.source_parent,{path:exportBridge.path,sha256:exportBridge.before_sha256});const originalRole=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',exportBridge.source_parent+':'+exportBridge.path],{cwd:root,encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(originalRole.split('function sourceRole(').length,2);assert.equal(read(exportBridge.path).toString(),originalRole.replace('function sourceRole(','export function sourceRole('));assert.equal(hash(read(exportBridge.path)),exportBridge.sha256);
 for(const m of data.current_code_members){if(m.path==='scripts/chip-focus-contract.mjs')assertCurrentFocusInspector(root,read,m);else if(m.path==='scripts/upstream-test-consolidation-evidence.mjs')qualifyPackedUpstreamConsolidationInspector({root,read,member:m});else assert.equal(hash(read(m.path)),m.sha256,'changed snack qualification code '+m.path);}
 const tabPath='compatibility/rc/tab-adapter-product-inventory-inputs.json',tabBytes=read(tabPath);original(root,data.qualification.source_parent,{path:tabPath,sha256:hash(tabBytes)});const tab=JSON.parse(tabBytes);assert.equal(hash(read(tab.focus_inputs.path)),tab.focus_inputs.sha256,'changed authenticated previous focus inputs');
 const focus=read(data.focus_inputs.path);assert.equal(hash(focus),data.focus_inputs.sha256);const focusData=JSON.parse(focus);assert.equal(focusData.line,line);assert.deepEqual(focusData.independent_snack_dom_delta,delta);assert.deepEqual(focusData.independent_dialog_portal_delta,dialog.delta);assert.deepEqual(focusData.independent_dialog_portal_qualification,dialog.qualification);assert.deepEqual(focusData.independent_tooltip_clipping_delta,tooltip.delta);assert.deepEqual(focusData.independent_tooltip_clipping_qualification,tooltip.qualification);assert.deepEqual(focusData.independent_menu_content_type_delta,menu.delta);assert.deepEqual(focusData.independent_menu_content_type_qualification,menu.qualification);assert.deepEqual(focusData.independent_dialog_service_default_targets,service.targets);assert.deepEqual(focusData.independent_dialog_service_default_qualification,service.ref);assert.deepEqual(focusData.independent_dialog_owned_contract_targets,owned.targets);assert.deepEqual(focusData.independent_dialog_owned_contract_qualification,owned.ref);assertCurrentFocusInspector(root,read,focusData.current_raw_contract_source);assert.equal(focusData.source_before_reader_used_by_runtime_or_native_admission,false);assert.equal(focusData.actual_native_packed_or_floor_qualified,false);assert.equal(focusData.g11_claim,'not-passed');
 return {line,delta,dialog,tooltip,menu,owned:{targets:owned.targets,qualification:owned.ref,source_scope_only:true,actual_native_packed_or_floor_qualified:false},service:{targets:service.targets,qualification:service.ref,source_scope_only:true,actual_native_packed_or_floor_qualified:false},inputs:ref,qualification:data.qualification,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Replay one frozen type-metadata input; every product/graph read remains current. */
export function inspectSnackCurrentDialogContracts({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);
 const typeRead=packedRepairTypeEvidenceRead({root,read});
 const allowance='compatibility/rc/api/export-name-allowlist.json';
 const evidenceRead=path=>path===allowance?typeRead(path):read(path);
 return inspectDialogOwnedContracts({root,read:evidenceRead,requireApplied:true});
}
/** Historical type evidence and current raw overlay membership are separate subjects. */
export function inspectSnackCurrentOverlayContracts({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);
 const internal=packedCurrentEpochs.get(read);
 if(internal)assert.equal(internal.root,root);
 const actual=internal?.actual??read,metadata=packedCvaMetadataToolingEpoch({root,read:actual});
 const packed=internal?.qualification??packedRepairEpoch(root,metadata.read);
 const types=path=>path===metadata.path?metadata.read(path):packed.preimages.has(path)?packed.read(path):actual(path);
 const owned=inspectSnackCurrentDialogContracts({root,read:actual}),service=owned.defaults,config=service.configuration;
 const comparison=path=>service.preimages.has(path)?Buffer.from(service.preimages.get(path)):
  owned.preimages.has(path)?Buffer.from(owned.preimages.get(path)):types(path);
 // These records retain their original source/type epoch. They never stand in
 // for the actual source graph below or certify a current native component.
 const historical=dialogConfigOverlayBridge({root,read:comparison});
 const captureRef=historical.prior_overlay_bridge.prior_capture,bytes=actual(captureRef.path);
 assert.equal(hash(bytes),captureRef.sha256);
 const capture=JSON.parse(bytes),{data,line}=productRegistry(root,actual);
 const graph=componentConfigGraph({root,read:actual,selected:capture.selected_sources.map(path=>({
  original_row:{file:path.slice('projects/ngx-material-legacy/'.length)},
 }))});
 assert.deepEqual([...graph.sources.keys()].sort(),capture.sources.map(m=>m.path).sort(),'changed current raw overlay population');
 const targets=[...packed.targets,...owned.targets,...service.targets,...config.targets,data.menu_type.delta];
 const deltas=[];
 for(const member of capture.sources){
  const current=actual(member.path),digest=hash(current),target=targets.find(t=>t.path===member.path);
  assert.equal(digest,target?.sha256??member.sha256,'unqualified current raw overlay source '+member.path);
  assert.equal(hash(graph.sources.get(member.path)),digest,'current graph used projected source');
  if(digest!==member.sha256)deltas.push({path:member.path,before_sha256:member.sha256,sha256:digest});
 }
 for(const route of capture.self_package_routes)assert.equal(hash(actual(route.path)),route.sha256,'changed current overlay route');
 const menu=qualifiedMenuContentTypeBoundary({line,readMember:types});
 const typeMembers=new Set(owned.proposed_sources.keys()),packedTypeDeltas=[];
 for(const member of menu.body.current_source_files){
  const digest=hash(actual(member.path));
  if(digest!==member.sha256){
   const target=packed.targets.find(t=>t.path===member.path);
   assert.ok(target,'unqualified current menu type-context delta '+member.path);
   assert.equal(member.sha256,target.before_sha256);assert.equal(digest,target.sha256);
   packedTypeDeltas.push({path:member.path,before_sha256:member.sha256,sha256:digest});
  }
  typeMembers.add(member.path);
 }
 const coverageBytes=actual(historical.additional_semantic_qualification.path);
 assert.equal(hash(coverageBytes),historical.additional_semantic_qualification.sha256);
 const coverage=JSON.parse(coverageBytes);
 for(const member of coverage.candidate_source_members){
  const digest=hash(actual(member.path));
  if(digest!==member.sha256){
   const applied=owned.proposed_sources.get(member.path),target=packed.targets.find(t=>t.path===member.path);
   assert.ok((applied!==undefined&&hash(applied)===digest)||
    (target?.before_sha256===member.sha256&&target.sha256===digest),
    'unqualified current dialog type-context delta '+member.path);
  }
  typeMembers.add(member.path);
 }
 // Both overlay repairs preserve declarations: one initializes the existing
 // boolean field; the other appends a void call without changing its signature.
 assert.deepEqual(packedTypeDeltas.map(m=>m.path).sort(),[
  'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts',
 ].sort());
 function affected(seeds){
  const found=new Set(seeds);let changed=true;
  while(changed){changed=false;for(const edge of graph.edges)if(found.has(edge.to)&&!found.has(edge.from)){found.add(edge.from);changed=true;}}
  for(const path of found)assert.ok(typeMembers.has(path),'current overlay consumer lacks qualified source/type coverage '+path);
  return [...found].sort();
 }
 const menuAffected=affected([MENU_CONTENT_PANEL_SOURCE]),dialogAffected=affected(config.targets.map(t=>t.path));
 const historicalTypes={menu:menu.ref,menu_source_files:menu.body.current_source_files.length,
  dialog_overlay:historical.additional_semantic_qualification,dialog_overlay_source_files:historical.current_dialog_semantic_source_files,
  historical_only:true,current_native_or_floor_qualified:false};
 const prior_overlay_bridge={prior_capture:captureRef,current_overlay_source_files:graph.sources.size,
  affected_current_sources:menuAffected,current_raw_source_members:[...graph.sources].map(([path,text])=>({path,sha256:hash(text)})),
  qualified_current_source_deltas:deltas,original_menu_type_evidence:menu.ref,
  independently_qualified_type_preserving_repairs:packedTypeDeltas,
  all_affected_sources_qualified:true,all_affected_sources_in_one_fresh_semantic_program:false,
  current_product_read_uses_historical_projection:false,actual_native_packed_or_floor_qualified:false};
 return {line,prior_overlay_bridge,affected_current_sources:dialogAffected,historical_type_evidence:historicalTypes,
  current_raw_overlay_source_files:graph.sources.size,actual_applied_dialog_source_files:owned.proposed_sources.size,
  packed_repair_qualification:{source:packed.source,artifact:packed.artifact,product_changes:packed.product_changes},
  current_product_read_uses_historical_projection:false,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Independently qualify the exact dialog callbacks against the committed public proof. */
export function qualifyIndependentDialogProductDelta({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);
 const {data,line}=productRegistry(root,read),{delta,qualification}=data.dialog;assert.equal(delta.path,DIALOG_PORTAL_SOURCE);assert.equal(delta.before_sha256,'752582e2bf49bc2f11431fa7bf35941f381a830dc5d837e14246a40ef010c01c');assert.equal(delta.sha256,'fc96f5570ed4331adf1074fd521a90b99c8ab3419d0c532c1238c7e135d9b9e4');const config=inspectSnackCurrentDialogContracts({root,read}).defaults.configuration;assert.equal(hash(config.preimages.get(delta.path)),delta.sha256);assert.equal(config.preimages.get(delta.path).length,delta.bytes);original(root,qualification.source_parent,delta);
 const bytes=read(qualification.path);assert.equal(hash(bytes),qualification.sha256);original(root,qualification.source_parent,qualification);const proof=JSON.parse(bytes),source=reviewDialogPortalSource(root,tooltipPriorCallerRead({root,read}));assert.deepEqual(proof.source,source);assert.equal(proof.line,line);assert.equal(proof.source.before_sha256,delta.before_sha256);assert.equal(proof.source.current_sha256,delta.sha256);assert.equal(proof.source.other_class_members_unchanged,30);assert.equal(proof.source.other_product_resource_members_unchanged,1141);assert.equal(proof.source.consumer_HTML_CSS_SCSS_changes,0);assert.equal(proof.type_subjects.length,3);assert.ok(proof.type_subjects.every(s=>s.strict&&s.skipLibCheck===false&&s.diagnostics===0&&s.callback_signatures_preserved));assert.equal(proof.runtime_subjects.length,10);assert.equal(proof.case_count,160);assert.equal(proof.rejected_behavior_faults,65);assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.cases.length,0),160);assert.equal(proof.runtime_subjects.reduce((n,s)=>n+s.behavior_faults_rejected.length,0),65);assert.equal(proof.actual_full_dialog_focus_component_native_packed_or_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');
 return {line,delta,qualification,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Exact current tooltip bytes are qualified before an old caller epoch is exposed. */
export function qualifyIndependentTooltipProductDelta({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);
 const {data,line}=productRegistry(root,read),q=qualifiedTooltipScrollClipping({root,read,allowApplied:true}),{delta,qualification}=data.tooltip;assert.equal(q.candidate.product_applied,true);assert.equal(q.candidate.prior.line,line);assert.equal(delta.path,TOOLTIP_SOURCE);assert.equal(delta.before_sha256,q.candidate.worksheet.source_before_sha256);assert.equal(delta.sha256,q.proof.candidate_source_sha256);assert.equal(hash(read(delta.path)),delta.sha256);assert.equal(read(delta.path).length,delta.bytes);assert.deepEqual({path:qualification.path,sha256:qualification.sha256},q.ref);original(root,qualification.source_parent,qualification);for(const m of data.tooltip.members){assert.equal(hash(read(m.path)),m.sha256);original(root,qualification.source_parent,m);}return {line,delta,qualification,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Current menu qualification keeps the historical declaration proof explicit. */
export function qualifyIndependentMenuContentTypeDelta({root=process.cwd(),read=rawRead(root)}={}){
 read=currentRaw(root,read);const {data,line}=productRegistry(root,read),m=data.menu_type,typeRead=packedRepairTypeEvidenceRead({root,read}),q=qualifiedMenuContentTypeBoundary({line,readMember:typeRead});assert.deepEqual({path:m.delta.path,before_sha256:m.delta.before_sha256,sha256:m.delta.sha256},q.delta);assert.equal(m.delta.bytes,read(MENU_CONTENT_PANEL_SOURCE).length);assert.deepEqual({path:m.qualification.path,sha256:m.qualification.sha256},q.ref);original(root,m.qualification.source_parent,m.qualification);for(const member of m.members){original(root,m.qualification.source_parent,member);const current=data.dialog_config.current_code_members.find(c=>c.path===member.path);assert.equal(hash(typeRead(member.path)),current?.sha256??member.sha256,'changed menu type qualification '+member.path);}const before=JSON.parse(read('compatibility/rc/menu-panel-content-type-proposal.json')).diagnostic.before;assert.equal(hash(before),m.delta.before_sha256);original(root,q.body.source_parent,{path:MENU_CONTENT_PANEL_SOURCE,sha256:m.delta.before_sha256});const complete=inspectSnackCurrentOverlayContracts({root,read});assert.equal(complete.historical_type_evidence.dialog_overlay_source_files,51);assert.equal(complete.affected_current_sources.length,12);const bridge=complete.prior_overlay_bridge;assert.equal(bridge.affected_current_sources.length,9);assert.equal(bridge.current_overlay_source_files,145);return {line,delta:m.delta,qualification:q.ref,before,bridge,source_scope_only:true,actual_native_packed_or_floor_qualified:false};
}
/** Old reports retain exact epochs; current qualification and native readers use raw. */
export function tooltipPriorCallerRead({root=process.cwd(),read=rawRead(root),currentTooltip=false,currentMenu=false}={}){
 read=currentRaw(root,read);qualifyIndependentTooltipProductDelta({root,read});const menu=qualifyIndependentMenuContentTypeDelta({root,read}),q=qualifiedTooltipScrollClipping({root,read,allowApplied:true}),before=Buffer.from(q.candidate.source),owned=inspectSnackCurrentDialogContracts({root,read}),service=owned.defaults,config=service.configuration,packedTypes=packedRepairTypeEvidenceRead({root,read});const reader=p=>service.preimages.has(p)?Buffer.from(service.preimages.get(p)):config.preimages.has(p)?Buffer.from(config.preimages.get(p)):owned.preimages.has(p)?Buffer.from(owned.preimages.get(p)):!currentTooltip&&p===TOOLTIP_SOURCE?Buffer.from(before):!currentMenu&&p===MENU_CONTENT_PANEL_SOURCE?Buffer.from(menu.before):packedTypes(p);branded.set(reader,{root,raw:read});return reader;
}
export function tooltipSourceContextPrior({root=process.cwd(),read=rawRead(root)}={}){
 const {data,line}=productRegistry(root,read),ref=data.tooltip.context_prior,bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);const prior=capsule(bytes,ref.sha256);assert.equal(prior.line,line);assert.equal(prior.selected.length,36);assert.equal(prior.reviews.length,23);for(const m of [...prior.ledgers,...prior.reviews]){assert.equal(hash(m.text),m.sha256);original(root,prior.source_parent,m);}return prior;
}
export function readSnackCurrentFocusInputs(options={}){
 const root=options.root??process.cwd(),read=options.read??rawRead(root),qualified=qualifyIndependentSnackProductDelta({root,read}),{data}=productRegistry(root,read);
 const prior=read(data.focus_inputs.path);assert.equal(hash(prior),data.focus_inputs.sha256);
 const current=JSON.parse(prior);current.current_raw_contract_source=assertCurrentFocusInspector(root,read,current.current_raw_contract_source);
 const path='compatibility/rc/packed-upstream-source-focus-inputs.json',bytes=read(path);
 assert.equal(bytes.toString(),JSON.stringify(current,null,2)+'\n','changed exact current focus input successor');
 return {data:current,bytes,ref:{path,sha256:hash(bytes)},qualified};
}
export function snackDomContextPrior({root=process.cwd(),read=rawRead(root)}={}){const {data,line}=registry(root,read),bytes=read(data.prior.path);assert.equal(hash(bytes),data.prior.sha256);const prior=capsule(bytes,data.prior.sha256);assert.equal(prior.line,line);assert.equal(prior.selected.length,75);assert.equal(prior.native.length,6);assert.equal(prior.authored_rows.length,12);const key=JSON.stringify([root,data.prior.sha256]);if(!authenticatedPriors.has(key)){for(const m of [...prior.ledgers,...prior.reports,...prior.code_preimages]){assert.equal(hash(m.text),m.sha256);original(root,prior.source_parent,m);}authenticatedPriors.add(key);}return prior;}
/** The exact packed repairs are checked before exposing their prior source epoch. */
function packedRepairEpoch(root,read){
 const product=productRegistry(root,read),inputs=registry(root,read);assert.equal(product.line,inputs.line);
 const prior=inputs.data.history_product,history=capsule(read(prior.path),prior.sha256);
 return qualifyPackedProductSourceRepairs({root,read,line:product.line,data:product.data.packed_repairs,history,registry:product.data});
}
/** Revalidate current repairs before replaying original finite type-proof inputs. */
export function packedRepairTypeEvidenceRead({root=process.cwd(),read=rawRead(root)}={}){
 const actual=currentRaw(root,read),metadata=packedCvaMetadataToolingEpoch({root,read:actual});
 const product=productRegistry(root,metadata.read),target=product.data.packed_repairs.targets.find(m=>m.path==='projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts');
 const digest=hash(actual(target.path));
 if(digest===target.before_sha256)return metadata.read;
 assert.equal(digest,target.sha256,'unqualified current menu type-proof source');
 const projected=packedRepairEpoch(root,metadata.read).read;branded.set(projected,{root,raw:actual});return projected;
}
export function inspectPackedProductSourceRepairs({root=process.cwd(),read=rawRead(root)}={}){
 const c=packedRepairEpoch(root,currentRaw(root,read));
 return {line:c.line,product_changes:c.product_changes,tooling_changes:c.tooling_changes,targets:c.targets,source:c.source,artifact:c.artifact,source_scope_only:true,current_coordinator_native_or_floor_qualified:false};
}
/** Finite old task subjects only, after every current successor is rechecked. */
export function snackDomSourceContext({root=process.cwd(),read=rawRead(root)}={}){
 if(branded.has(read)){const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}
 const rawCurrent=read,focusEpoch=packedUpstreamFocusMetadataEpoch({root,read}),roles=packedCvaRoleHistoricalReader({root,read:focusEpoch.read}),roleRead=p=>{if(focusEpoch.inspectors.some(m=>m.path===p)){focusEpoch.assertCurrent();return rawCurrent(p);}return roles.read(p);},packed=packedRepairEpoch(root,roleRead);packedCurrentEpochs.set(packed.read,{root,actual:rawCurrent,qualification:packed});read=packed.read;
 const qualified=qualifyIndependentSnackProductDelta({root,read}),callerRead=tooltipPriorCallerRead({root,read}),configEpoch=tooltipPriorCallerRead({root,read,currentTooltip:true,currentMenu:true}),owned=inspectSnackCurrentDialogContracts({root,read}),service=owned.defaults,config=service.configuration,{data}=registry(root,read),{data:dataProduct}=productRegistry(root,read),prior=snackDomContextPrior({root,read});tooltipSourceContextPrior({root,read});assert.deepEqual(data.product_inputs,qualified.inputs);assert.equal(data.writes.length,25);for(const m of [...data.writes,...data.history_code_members])assert.equal(hash(read(m.path)),m.sha256,'changed current snack context successor '+m.path);
 for(const m of prior.reports)assert.equal(hash(read(m.path)),m.sha256,'changed immutable original review '+m.path);
 for(const m of data.portal_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated portal review '+m.path);original(root,data.portal_review_source_parent,m);}
 for(const m of data.additional_caller_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated additional caller evidence '+m.path);original(root,data.additional_caller_review_source_parent,m);}
 for(const m of data.remaining_core_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated remaining Core evidence '+m.path);original(root,data.remaining_core_review_source_parent,m);}
 for(const m of data.material_core_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated Material-core evidence '+m.path);original(root,data.material_core_review_source_parent,m);}
 for(const m of data.cdk_module_type_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated CDK module/type evidence '+m.path);original(root,data.cdk_module_type_review_source_parent,m);}
 for(const m of data.layout_service_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated layout-service evidence '+m.path);original(root,data.layout_service_review_source_parent,m);}
 for(const m of data.table_caller_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated table-caller evidence '+m.path);original(root,data.table_caller_review_source_parent,m);}
 for(const m of data.overlay_contract_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated overlay contract evidence '+m.path);original(root,data.overlay_contract_review_source_parent,m);}
 for(const m of data.tabs_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated tabs evidence '+m.path);original(root,data.tabs_review_source_parent,m);}
 for(const m of data.form_field_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated form-field evidence '+m.path);original(root,data.form_field_review_source_parent,m);}
 for(const m of data.menu_caller_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated menu caller evidence '+m.path);original(root,data.menu_caller_review_source_parent,m);}
 for(const m of data.a11y_caller_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated accessibility caller evidence '+m.path);original(root,data.a11y_caller_review_source_parent,m);}
 for(const m of data.dialog_config_review_members){const current=m.path===dataProduct.service_defaults.role_inspector_export.path?dataProduct.service_defaults.role_inspector_export.sha256:m.sha256;assert.equal(hash(read(m.path)),current,'changed dialog configuration integration evidence '+m.path);original(root,data.dialog_config_review_source_parent,m);}for(const m of data.service_default_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed service-default integration evidence '+m.path);original(root,data.service_default_review_source_parent,m);}for(const m of JSON.parse(read('compatibility/rc/dialog-caller-config-source-impact.json')).prior_review_members)assert.equal(hash(read(m.path)),m.sha256,'changed immutable pre-configuration review '+m.path);
 for(const m of data.owned_contract_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed applied dialog contract review '+m.path);original(root,data.owned_contract_review_source_parent,m);}
 for(const group of ['dialog_caller','material_remaining'])for(const m of data[group+'_review_members']){assert.equal(hash(read(m.path)),m.sha256,'changed integrated current caller evidence '+m.path);original(root,data[group+'_review_source_parent'],m);}
 for(const m of data.component_config_review_members){assert.equal(hash(read(m.path)),m.sha256,'changed integrated configuration caller evidence '+m.path);original(root,data.component_config_review_source_parent,m);}
 let additionalCount=0;for(const path of ['compatibility/f10/authored-use-reviews/table-coercion-callers.json','compatibility/f10/authored-use-reviews/platform-callers.json','compatibility/f10/authored-use-reviews/core-token-callers.json','compatibility/f10/authored-use-reviews/remaining-core-callers.json','compatibility/f10/authored-use-reviews/material-core-callers.json','compatibility/f10/authored-use-reviews/cdk-module-type-callers.json','compatibility/f10/authored-use-reviews/layout-service-callers.json','compatibility/f10/authored-use-reviews/table-callers.json','compatibility/f10/authored-use-reviews/overlay-callers.json','compatibility/f10/authored-use-reviews/tabs-callers.json','compatibility/f10/authored-use-reviews/form-field-callers.json','compatibility/f10/authored-use-reviews/menu-callers.json','compatibility/f10/authored-use-reviews/a11y-callers.json','compatibility/f10/authored-use-reviews/component-config-callers.json','compatibility/f10/authored-use-reviews/dialog-callers.json','compatibility/f10/authored-use-reviews/material-remaining-callers.json']){const body=JSON.parse(read(path));assert.equal(body.line,data.line);assert.equal(body.status,'reviewed');for(const row of body.reviews){assert.equal(hash((['compatibility/f10/authored-use-reviews/dialog-callers.json','compatibility/f10/authored-use-reviews/material-remaining-callers.json'].includes(path)?read:['compatibility/f10/authored-use-reviews/overlay-callers.json','compatibility/f10/authored-use-reviews/tabs-callers.json','compatibility/f10/authored-use-reviews/form-field-callers.json','compatibility/f10/authored-use-reviews/menu-callers.json','compatibility/f10/authored-use-reviews/a11y-callers.json','compatibility/f10/authored-use-reviews/component-config-callers.json'].includes(path)?configEpoch:callerRead)('projects/ngx-material-legacy/'+row.file)),row.candidate_source_sha256);for(const m of row.independent_evidence)assert.equal(hash(read(m.path)),m.sha256,'changed additional caller dependency '+m.path);additionalCount++;}}assert.equal(additionalCount,336);
 for(const m of data.additional_caller_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(callerRead(input.path)),input.sha256,'changed additional public namespace input '+input.path);}
 for(const m of data.overlay_contract_public_proofs){assert.equal(hash(read(m.path)),m.sha256);const epoch=tooltipPriorCallerRead({root,read,currentTooltip:true});for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(epoch(input.path)),input.sha256,'changed authenticated overlay proof epoch '+input.path);}
 for(const m of data.tabs_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(configEpoch(input.path)),input.sha256,'changed authenticated pre-configuration tabs input '+input.path);}
 for(const m of data.form_field_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(configEpoch(input.path)),input.sha256,'changed authenticated pre-configuration form-field input '+input.path);}
 for(const m of data.menu_caller_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(configEpoch(input.path)),input.sha256,'changed authenticated pre-configuration menu caller input '+input.path);}
 for(const m of data.a11y_caller_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(configEpoch(input.path)),input.sha256,'changed authenticated pre-configuration accessibility input '+input.path);}
 for(const m of data.component_config_public_proofs){assert.equal(hash(read(m.path)),m.sha256);for(const input of JSON.parse(read(m.path)).inputs)assert.equal(hash(configEpoch(input.path)),input.sha256,'changed authenticated pre-configuration configuration caller input '+input.path);}
 for(const m of dialogPortalPrior(root,read).source_reviews)assert.equal(hash(read(m.path)),m.sha256,'changed immutable original dialog review '+m.path);
 const historyBytes=read(data.history_product.path);assert.equal(hash(historyBytes),data.history_product.sha256);const history=capsule(historyBytes,data.history_product.sha256);assert.equal(history.product_members.length,1142);const paths=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','ls-files','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n').sort();assert.deepEqual(paths,history.product_members.map(m=>m.path).sort(),'changed raw current product membership');for(const m of history.product_members)assert.equal(hash(rawCurrent(m.path)),packed.targets.find(t=>t.path===m.path)?.sha256??owned.targets.find(t=>t.path===m.path)?.sha256??service.targets.find(t=>t.path===m.path)?.sha256??config.targets.find(t=>t.path===m.path)?.sha256??(m.path===SNACK_SOURCE?qualified.delta.sha256:m.path===DIALOG_PORTAL_SOURCE?qualified.dialog.delta.sha256:m.path===TOOLTIP_SOURCE?qualified.tooltip.delta.sha256:m.path===MENU_CONTENT_PANEL_SOURCE?qualified.menu.delta.sha256:m.sha256),'changed raw current product/resource '+m.path);assert.equal(hash(history.product.text),history.product.sha256);assert.equal(history.product.path,SNACK_SOURCE);assert.equal(history.product.sha256,qualified.delta.before_sha256);original(root,history.source_parent,history.product);
 const auxBytes=read(data.validator_prior.path);assert.equal(hash(auxBytes),data.validator_prior.sha256);const aux=capsule(auxBytes,data.validator_prior.sha256);assert.equal(aux.line,prior.line);assert.equal(aux.members.length,1);for(const m of aux.members){assert.equal(hash(m.text),m.sha256);original(root,aux.source_parent,m);}
 const taskBytes=read(data.task_prior.path);assert.equal(hash(taskBytes),data.task_prior.sha256);const task=capsule(taskBytes,data.task_prior.sha256);assert.equal(task.line,prior.line);assert.equal(task.members.length,2);for(const m of task.members){assert.equal(hash(m.text),m.sha256);original(root,task.source_parent,m);}
 const fixtureBytes=read(data.fixture_prior.path);const fixture=capsule(fixtureBytes,data.fixture_prior.sha256);assert.equal(fixture.line,prior.line);assert.equal(fixture.members.length,1);for(const m of fixture.members){assert.equal(hash(m.text),m.sha256);original(root,fixture.source_parent,m);}
 const members=new Map([...prior.ledgers,...prior.code_preimages,...aux.members,...task.members,...fixture.members].map(m=>[m.path,Buffer.from(m.text)]));members.set(SNACK_SOURCE,Buffer.from(history.product.text));const dialogPrior=dialogPortalPrior(root,read);assert.equal(dialogPrior.product.sha256,qualified.dialog.delta.before_sha256);members.set(DIALOG_PORTAL_SOURCE,Buffer.from(dialogPrior.product.text));const tooltipBefore=qualifiedTooltipScrollClipping({root,read,allowApplied:true}).candidate.source;assert.equal(hash(tooltipBefore),qualified.tooltip.delta.before_sha256);assert.equal(members.size,13);members.set(TOOLTIP_SOURCE,Buffer.from(tooltipBefore));assert.equal(members.size,14);members.set(MENU_CONTENT_PANEL_SOURCE,Buffer.from(qualified.menu.before));assert.equal(members.size,15);for(const[path,bytes]of config.preimages)if(!members.has(path))members.set(path,Buffer.from(bytes));assert.equal(members.size,17);for(const[path,bytes]of service.preimages){assert.equal(members.has(path),false);members.set(path,Buffer.from(bytes));}assert.equal(members.size,18);for(const[path,bytes]of owned.preimages)if(!members.has(path))members.set(path,Buffer.from(bytes));assert.equal(members.size,20);const reader=p=>{if(members.has(p)){packed.assertCurrent(p);roles.read(p);return Buffer.from(members.get(p));}return read(p);};branded.set(reader,{root,raw:rawCurrent});return {read:reader,raw:rawCurrent,line:prior.line,members:members.size,packed_repair_epoch_members:packed.preimages.size,current_successors:data.writes.length};
}
export function snackDomPreviousTaskReader(options={}){return snackDomSourceContext(options).read;}
