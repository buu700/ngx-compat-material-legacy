/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Existing native source profiles only. This never qualifies native execution. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {inspectChipFocusRepair} from './chip-focus-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
export const CHIP_FOCUS_NATIVE_PRIOR='compatibility/rc/chip-focus-native-requalification-prior.json.gz';
export const CHIP_FOCUS_NATIVE_INPUTS='compatibility/rc/chip-focus-native-requalification-inputs.json';
const priorPins={main:'b0552aea4d868233f928d4b51184201533ec11587764c58259dcde25da692a68','21.x':'6b09faceea4d4f59b2fa5a721db21553d479b35edae2c93c9966f0c2907163b6'};
const inputPins={"main": "a1a75f4ecc415eb85acd7ec05476b3cfafbdbfe8e6767031c52a1a4e80db5a5f", "21.x": "a53e40592a386e462743f10e2bcbacf0388966c616364208b1bc7167f9aa86b6"};
function freeze(v){if(v&&typeof v==='object'){for(const c of Object.values(v))freeze(c);Object.freeze(v);}return v;}
const cache=new Map();
export function chipFocusNativePrior(read=p=>readFileSync(p)){
 const bytes=read(CHIP_FOCUS_NATIVE_PRIOR),fingerprint=hash(bytes),line=Object.keys(priorPins).find(k=>priorPins[k]===fingerprint);assert.ok(line,'changed native source prior');if(cache.has(line))return cache.get(line);
 const p=JSON.parse(gunzipSync(bytes));assert.equal(p.line,line);assert.equal(hash(p.ledger_text),p.ledger_sha256);assert.equal(JSON.parse(p.ledger_text).entries.length,1697);assert.equal(p.entries.length,line==='main'?34:33);assert.equal(p.changed_source_subjects.length,7);
 for(const m of p.reviews)assert.equal(hash(m.text),m.sha256);for(const m of p.changed_source_subjects)assert.equal(hash(m.before_text),m.before_sha256);cache.set(line,freeze(p));return cache.get(line);
}
export const CHIP_FOCUS_NATIVE_MODULES=Object.freeze([
 ['artifact-behavior','ARTIFACT_BEHAVIOR_KIND','artifact_behavior','artifactBehaviorRequirements','validateArtifactBehavior'],
 ['historical-behavior','HISTORICAL_BEHAVIOR_KIND','historical_behavior','historicalBehaviorRequirements','validateHistoricalBehavior'],
 ['generated-identity','GENERATED_IDENTITY_KIND','generated_identity_behavior','generatedIdentityRequirements','validateGeneratedIdentity'],
 ['selection','SELECTION_BEHAVIOR_KIND','selection_behavior','selectionBehaviorRequirements','validateSelectionBehavior'],
 ['bidi','BIDI_BEHAVIOR_KIND','bidi_behavior','bidiBehaviorRequirements','validateBidiBehavior'],
 ['progress-csp','PROGRESS_CSP_KIND','progress_csp_behavior','progressCspRequirements','validateProgressCsp'],
 ['form-field-hover','FORM_FIELD_HOVER_KIND','form_field_hover_behavior','formFieldHoverRequirements','validateFormFieldHover'],
 ['tab-completion','TAB_COMPLETION_KIND','tab_completion_behavior','tabCompletionRequirements','validateTabCompletion'],
 ['ripple-replay','RIPPLE_REPLAY_KIND','ripple_replay_behavior','rippleReplayRequirements','validateRippleReplay'],
 ['content-observer','CONTENT_OBSERVER_KIND','content_observer_behavior','contentObserverRequirements','validateContentObserver'],
 ['media-matcher','MEDIA_MATCHER_KIND','media_matcher_behavior','mediaMatcherRequirements','validateMediaMatcher'],
 ['native-date','NATIVE_DATE_KIND','native_date_behavior','nativeDateRequirements','validateNativeDate'],
 ['owned-style','OWNED_STYLE_KIND','owned_style_behavior','ownedStyleRequirements','validateOwnedStyle'],
].map(row=>Object.freeze(row)));
export function chipFocusNativeInputs(read=p=>readFileSync(p),root=process.cwd()){
 const bytes=read(CHIP_FOCUS_NATIVE_INPUTS),data=JSON.parse(bytes);assert.equal(hash(bytes),inputPins[data.line],'changed native source inputs');const prior=chipFocusNativePrior(read);assert.equal(data.line,prior.line);assert.equal(data.source_parent,prior.source_parent);
 for(const m of [...prior.current_declared_source_members,...data.api_modules,...prior.implementation_records])assert.equal(hash(read(m.path)),m.sha256,'unreviewed native input source '+m.path);
 // Authenticate registries with zero subjects on this line as well. In21.x
 // MediaMatcher intentionally remains outside native inherited-fix admission.
 const modules=new Set(data.api_modules.map(m=>m.path));for(const [name]of CHIP_FOCUS_NATIVE_MODULES){const path='scripts/upstream-'+name+'-evidence.mjs';if(!modules.has(path)){const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',prior.source_parent+':'+path],{cwd:root});assert.equal(hash(read(path)),hash(before),'changed zero-subject native registry');}}
 return {data,prior,ref:{path:CHIP_FOCUS_NATIVE_INPUTS,sha256:inputPins[data.line]}};
}
export async function chipFocusNativeDefinitions({root=process.cwd(),read=p=>readFileSync(join(root,p)),requireNoCoordinator=false}={}){
 const {prior}=chipFocusNativeInputs(read,root),entries=JSON.parse(read(prior.ledger_path)).entries,rows=[];
 for(const [name,kind,field,requirements,validator]of CHIP_FOCUS_NATIVE_MODULES){const api=await import('./upstream-'+name+'-evidence.mjs');for(const entry of entries){const definition=api[requirements](entry.sha,prior.line);if(!definition)continue;
  const expected=prior.native_inventory.profiles.find(p=>p.sha===entry.sha);assert.ok(expected);assert.deepEqual(definition,expected.definition,'native requirements changed '+entry.sha);assert.equal(api[kind],expected.kind);assert.equal(field,expected.field);
  const row={sha:entry.sha,api:name,field,kind:api[kind],definition};if(requireNoCoordinator){const result=api[validator]({root,entry,proof:entry.individual_proof});assert.deepEqual(result,{ok:false,detail:'missing coordinator run'},entry.sha);row.no_run=result;}rows.push(row);
 }}
 assert.equal(rows.length,prior.line==='main'?34:33);assert.equal(new Set(rows.map(r=>r.sha)).size,rows.length);return rows;
}
/** Deterministic new report copies. All original source/hunk/semantic fields
 * remain identical; the previous source context is retained inside the new one. */
export function chipFocusNativeSourceWrites({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const {data,prior,ref}=chipFocusNativeInputs(read,root),sourceDelta=new Map(prior.changed_source_subjects.map(m=>[m.path,m])),writes=new Map(),entries=new Map(),groups=new Map();
 const raw=inspectChipFocusRepair({root,readMember:read});assert.equal(raw.line,prior.line);
 for(const profile of prior.native_inventory.profiles){if(!profile.stale_members.length)continue;const previous=prior.entries.find(e=>e.sha===profile.sha),entry=structuredClone(previous),scope=entry.individual_proof[profile.field];assert.deepEqual(scope.source_members.map(m=>m.path).sort(),profile.definition.members.slice().sort());
  scope.source_members=scope.source_members.map(m=>{const current=hash(read(m.path));if(current===m.sha256)return {...m};const approved=sourceDelta.get(m.path);assert.ok(approved,'changed native member outside approved source delta');assert.equal(m.sha256,approved.before_sha256);assert.equal(current,approved.current_sha256);return {...m,sha256:current};});
  assert.notDeepEqual(scope.source_members,previous.individual_proof[profile.field].source_members);entries.set(entry.sha,entry);if(!groups.has(previous.evidence_report))groups.set(previous.evidence_report,[]);groups.get(previous.evidence_report).push({previous,entry,profile});
 }
 assert.equal(entries.size,prior.line==='main'?31:30);
 for(const [path,selected]of groups){const original=prior.reviews.find(m=>m.path===path);assert.ok(original);assert.equal(hash(read(path)),original.sha256,'changed prior native report');const body=JSON.parse(original.text),multirow=Array.isArray(body.reviews);assert.equal(multirow,selected.length===3);if(multirow)assert.equal(body.reviews.length,3);
  const output='compatibility/rc/chip-focus-native-requalification-'+(multirow?'classic-list':selected[0].entry.sha)+'.json';
  for(const {previous,entry}of selected){const row=multirow?body.reviews.find(r=>r.sha===entry.sha):body;assert.ok(row);assert.deepEqual(row.individual_proof,previous.individual_proof,'prior body/entry native proof differs');const oldContext=row.recorded_source_context;
   row.individual_proof=structuredClone(entry.individual_proof);row.recorded_source_context={inputs:ref,prior_entry:{ledger_path:prior.ledger_path,ledger_commit:prior.source_parent,entry_sha256:hash(json(previous))},prior_review:{path,sha256:original.sha256},...(oldContext?{previous_recorded_source_context:oldContext}:{}),source_scope_only:true,actual_native_packed_or_floor_qualified:false,note:'Source-only refresh for the authenticated focus/spec/matrix/browser/registry delta. Every existing case,semantic judgment,branch/floor contract and real coordinator requirement is retained. Previous document-seal mismatches,if any,remain in the nested historical context and original report.'};entry.evidence_report=output;
  }
  const bytes=Buffer.from(json(body));writes.set(output,bytes);for(const {entry}of selected)if(entry.source_check?.evidence_report_sha256)entry.source_check.evidence_report_sha256=hash(bytes);
 }
 return {line:prior.line,entries:[...entries.values()],writes,inputs:ref,raw_focus_contract:raw,all_native_requirements:prior.native_inventory.profile_count,new_native_subjects_unchanged:3,shared_three_row_reports:[...groups].filter(([,rows])=>rows.length===3).length,actual_native_packed_or_floor_qualified:false};
}
export async function inspectChipFocusNativeRequalification({root=process.cwd(),read=p=>readFileSync(join(root,p)),requireNoCoordinator=false}={}){
 const {prior}=chipFocusNativeInputs(read,root),expected=chipFocusNativeSourceWrites({root,read}),ledger=JSON.parse(read(prior.ledger_path)),native=await chipFocusNativeDefinitions({root,read,requireNoCoordinator}),changed=[];
 for(const entry of expected.entries){const current=ledger.entries.find(e=>e.sha===entry.sha);assert.deepEqual(current,entry,'different native source-only transition');changed.push(entry.sha);}
 for(const old of prior.entries.filter(e=>!changed.includes(e.sha)))assert.deepEqual(ledger.entries.find(e=>e.sha===old.sha),old,'changed current lifecycle subject');
 const baseline=JSON.parse(prior.ledger_text),restored=structuredClone(ledger);assert.equal(restored.entries.length,1697);for(let i=0;i<baseline.entries.length;i++){assert.equal(restored.entries[i].sha,baseline.entries[i].sha);if(changed.includes(restored.entries[i].sha))restored.entries[i]=baseline.entries[i];}assert.deepEqual(restored,baseline,'unreviewed unrelated ledger or envelope change');
 for(const [path,bytes]of expected.writes)assert.deepEqual(read(path),bytes,'different current native report');
 for(const m of [...prior.reviews,...prior.authored_stores,...prior.authored_reviews])assert.equal(hash(read(m.path)),m.sha256,'changed retained review/role source');
 const population=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','projects','testing','reference','fixtures'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();assert.deepEqual(population,prior.product_members.map(m=>m.path).sort());for(const m of prior.product_members)assert.equal(hash(read(m.path)),m.sha256,'unexpected product/reference/fixture change');
 return {schema_version:1,line:prior.line,native_profiles:native.map(({no_run,...r})=>r),updated_native_profile_shas:changed,new_lifecycle_native_subjects_unchanged:3,new_native_report_count:expected.writes.size,shared_three_row_reports:expected.shared_three_row_reports,all_native_guards_refuse_missing_coordinator:requireNoCoordinator,stale_native_source_bindings:0,all1697_dispositions_preserved:true,product_reference_fixture_members_preserved:prior.product_members.length,original_native_reports_preserved:prior.reviews.length,authored_review_documents_unchanged:prior.authored_reviews.length,actual_native_packed_or_floor_qualified:false,current_authored_roles_and_history_requalification_pending:true,g11_claim:'not-passed'};
}
