/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact source transition and current missing-run checks. No product execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeDateSourceContext,reverseNativeDatePackedSource,readNativeDatePackedBefore,nativeDateRequirementsBefore,nativeDateCurrentRead,nativeDateHistoricalProductRead} from '../scripts/native-date-packed-source-context.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path));
const hash=value=>createHash('sha256').update(value).digest('hex'),json=value=>JSON.stringify(value,null,2)+'\n';
const JS_PIN='6e52f913ad826bcbe8e948ff9ef0147a24407e0aca76210c23fbfcb15b1ed4fb',PY_PIN='2afb8f06115ae4857871bc0375103f28ca98eb9f04cdb06c20ed1030dd024de8';
assert.equal(hash(read('scripts/native-date-packed-source-context.mjs')),JS_PIN);
assert.equal(hash(read('tests/native_date_source_context.py')),PY_PIN);
const ctx=nativeDateSourceContext(read),{data,before,after}=ctx,line=data.line;
assert.equal(Object.isFrozen(data),true);assert.equal(Object.isFrozen(data.before_requirements[0].definition.members),true);
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,maxBuffer:40*1024*1024});
let sourceControls=0;
function strictCurrent(readMember){
 nativeDateSourceContext(readMember);
 for(const change of data.changes)assert.equal(hash(readMember(change.path)),change.current_sha256);
 for(const member of after.members)assert.equal(hash(readMember(member.path)),member.sha256);
}
for(const old of before.sources){
 const change=data.changes.find(row=>row.path===old.path);assert.ok(change);assert.equal(hash(read(old.path)),change.current_sha256);
 assert.equal(git('show',data.baseline+':'+old.path).toString(),old.text);
 assert.equal(reverseNativeDatePackedSource(old.path,read(old.path).toString(),{readMember:read}),old.text);
 assert.throws(()=>reverseNativeDatePackedSource(old.path,read(old.path).toString()+'\n// unreviewed\n',{readMember:read}));sourceControls++;
 assert.throws(()=>strictCurrent(path=>path===old.path?Buffer.from(old.text):read(path)));sourceControls++;
}
assert.equal(before.sources.length,30);
for(const member of after.members)assert.equal(hash(read(member.path)),member.sha256,'current transition subject changed '+member.path);
for(const member of [...before.reviews,...before.authored_reviews]){
 assert.equal(hash(read(member.path)),member.sha256);assert.equal(git('show',data.baseline+':'+member.path).toString(),member.text);
}
const originalLedger=JSON.parse(before.ledger_text),currentLedger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
assert.equal(hash(read('compatibility/f10/disposition-ledger/ledger.json')),data.expected_ledger_sha256);
const oldEntries=new Map(originalLedger.entries.map(row=>[row.sha,row])),currentEntries=new Map(currentLedger.entries.map(row=>[row.sha,row]));
assert.equal(currentEntries.size,1697);assert.deepEqual([...currentEntries.keys()],[...oldEntries.keys()]);
const defs=new Map(data.after_requirements.map(row=>[row.sha,row]));const native='b423c0e0b754b1f1d118d17e022981c357c3aa68';
const updated=new Set([...before.rows.map(row=>row.sha),native]);
for(const current of currentEntries.values()){
 const old=oldEntries.get(current.sha);assert.equal(current.final_disposition,old.final_disposition);
 if(!updated.has(current.sha)){assert.deepEqual(current,old);continue;}
 if(current.sha===native)continue;
 const row=before.rows.find(row=>row.sha===current.sha),expected=structuredClone(old);
 expected.evidence_report='compatibility/f10/disposition-ledger/evidence/closeout-native-date-context-'+row.sha+'.json';
 expected.individual_proof[row.field].source_members=defs.get(row.sha).definition.members.map(path=>({path,sha256:hash(read(path))}));
 assert.deepEqual(current,expected);
 const doc=JSON.parse(read(current.evidence_report)),oldDoc=JSON.parse(read(old.evidence_report)),context=doc.native_date_source_context;
 assert.deepEqual(context.prior_entry,{ledger_path:'compatibility/f10/disposition-ledger/ledger.json',ledger_commit:data.baseline,entry_sha256:hash(json(old))});
 assert.deepEqual(context.prior_review,{path:old.evidence_report,sha256:hash(read(old.evidence_report))});
 assert.deepEqual(context.inputs,ctx.output.inputs);assert.equal(context.actual_native_packed_or_floor_qualified,false);
 delete doc.native_date_source_context;oldDoc.individual_proof=current.individual_proof;assert.deepEqual(doc,oldDoc);
}
const expectedNative=structuredClone(before.native_entry);delete expectedNative.individual_proof.execution;
expectedNative.individual_proof.proof_kind='packed-required-individual-native-date';
expectedNative.individual_proof.decision+=' Current qualification additionally requires the complete current clean same-library packed106 run and both rich constructor/provider observations; the retained old Actions receipts are historical.';
expectedNative.individual_proof.native_date_behavior={kind:data.native_definition.definition.kind,case_ids:data.native_definition.definition.case_ids,
 source_members:data.native_definition.definition.members.map(path=>({path,sha256:hash(read(path))}))};
expectedNative.evidence_report='compatibility/f10/disposition-ledger/evidence/closeout-native-date-current-run-review.json';assert.deepEqual(currentEntries.get(native),expectedNative);
const nativeDoc=JSON.parse(read(expectedNative.evidence_report));assert.deepEqual(nativeDoc.historical_source_proof,before.native_entry.individual_proof);
assert.deepEqual(nativeDoc.historical_source_review,JSON.parse(read(before.native_entry.evidence_report)));assert.equal(nativeDoc.native_admission.qualified_by_this_document,false);
// The three newer historical cells remain required by the live matrix. Only old source readers see its exact old snapshot.
const matrix=before.matrix_history,currentMatrix=JSON.parse(read(matrix.path)),oldMatrix=JSON.parse(matrix.text);
assert.equal(hash(read(matrix.path)),matrix.current_sha256);assert.equal(git('show',matrix.reference_commit+':'+matrix.path).toString(),matrix.text);
const oldGroup=currentMatrix.checks.find(row=>row.check_id==='historical-legacy-artifact').acceptance.cases_by_line[line];
assert.equal(matrix.added_current_cases.length,3);assert.ok(matrix.added_current_cases.every(id=>oldGroup['original-and-shared-cases'].includes(id)));
oldGroup['original-and-shared-cases']=oldGroup['original-and-shared-cases'].filter(id=>!matrix.added_current_cases.includes(id));assert.deepEqual(currentMatrix,oldMatrix);
assert.equal(reverseNativeDatePackedSource(matrix.path,read(matrix.path).toString(),{readMember:read}),matrix.text);
assert.throws(()=>reverseNativeDatePackedSource(matrix.path,read(matrix.path).toString()+'\n',{readMember:read}));sourceControls++;
// Authenticate both declared historical frames against Git, including complete
// consulted tooling members. Unknown changes must reach the old strict reader.
let historicalMembers=0,historicalControls=0;
assert.deepEqual(before.historical_products.map(row=>row.changed_members.length),[11,12]);
for(const frame of before.historical_products){
 const baselineBytes=new Map(frame.changed_members.map(member=>[member.path,git('show',data.baseline+':'+member.path)]));
 const frameRead=path=>baselineBytes.get(path)||read(path),historical=nativeDateHistoricalProductRead(frame.source_parent,frameRead);
 for(const member of frame.changed_members){
  const original=git('show',frame.source_parent+':'+member.path);
  assert.equal(original.toString(),member.text);assert.equal(hash(original),member.sha256);
  assert.equal(git('rev-parse',frame.source_parent+':'+member.path).toString().trim(),member.git_blob);
  assert.equal(hash(baselineBytes.get(member.path)),member.current_baseline_sha256);
  assert.equal(historical(member.path).toString(),member.text);historicalMembers++;
  const unknown=Buffer.concat([baselineBytes.get(member.path),Buffer.from('\n// unknown historical change\n')]);
  const changed=nativeDateHistoricalProductRead(frame.source_parent,path=>path===member.path?unknown:frameRead(path));
  assert.equal(changed(member.path),unknown);historicalControls++;
  const preceding=nativeDateHistoricalProductRead(frame.source_parent,path=>path===member.path?original:frameRead(path));
  assert.equal(preceding(member.path),original);historicalControls++;
 }
}
assert.throws(()=>nativeDateHistoricalProductRead('unregistered',read));historicalControls++;
const currentView=nativeDateCurrentRead(read);assert.equal(nativeDateCurrentRead(read),currentView);
for(const original of before.sources){
 assert.equal(currentView(original.path).toString(),original.text);
 const unknown=Buffer.concat([read(original.path),Buffer.from('\n// unknown current change\n')]);
 const changed=nativeDateCurrentRead(path=>path===original.path?unknown:read(path));
 assert.equal(changed(original.path),unknown);historicalControls++;
}
// Only an explicit historical view keeps its authenticated immutable snapshot.
// The ordinary context reader must still reject later archive corruption.
let corruptArchive=false;
const changingRead=path=>corruptArchive&&path===data.prior.path?Buffer.from('corrupt archive'):read(path);
const captured=nativeDateCurrentRead(changingRead);corruptArchive=true;
assert.throws(()=>nativeDateSourceContext(changingRead));historicalControls++;
assert.equal(nativeDateSourceContext(captured),ctx);
assert.equal(captured(before.sources[0].path).toString(),before.sources[0].text);historicalControls++;
const key=row=>JSON.stringify([row.file,row.module,row.symbol]),newRolePath='compatibility/f10/authored-use-reviews/native-date-context-requalified-boundaries.json';
const newRoleDoc=JSON.parse(read(newRolePath));assert.equal(newRoleDoc.reviews.length,167);
let roleRows=0;const referencePaths=new Set();
for(const store of before.authored_stores){
 const original=JSON.parse(store.text),current=JSON.parse(read(store.path));assert.equal(original.symbol_uses.length,current.symbol_uses.length);
 for(const [index,row]of current.symbol_uses.entries()){
  const old=original.symbol_uses[index];assert.equal(key(row),key(old));
  if(JSON.stringify(row)===JSON.stringify(old))continue;
  const stripped=structuredClone(row);stripped.source_review=old.source_review;
  if(Object.hasOwn(old,'source_review_history'))stripped.source_review_history=old.source_review_history;else delete stripped.source_review_history;
  assert.deepEqual(stripped,old);assert.equal(row.source_review.path,newRolePath);assert.equal(row.source_review.sha256,hash(read(newRolePath)));
  const oldReview=JSON.parse(read(old.source_review.path)).reviews.find(r=>key(r)===key(old)),newReview=newRoleDoc.reviews.find(r=>key(r)===key(row));assert.ok(oldReview&&newReview);
  const fresh=structuredClone(newReview);delete fresh.native_date_context_requalification;
  const expectedEvidence=structuredClone(oldReview.independent_evidence);
  for(const ref of expectedEvidence){const change=data.changes.find(r=>r.path===ref.path);if(change&&ref.sha256!==change.current_sha256){assert.equal(ref.sha256,change.before_sha256);ref.sha256=change.current_sha256;referencePaths.add(ref.path);}}
  assert.deepEqual(fresh.independent_evidence.slice(0,-2),expectedEvidence);assert.deepEqual(fresh.independent_evidence.at(-2),old.source_review);
  const proofRef=fresh.independent_evidence.at(-1);assert.equal(proofRef.path,'compatibility/rc/native-date-context-requalification.json');assert.equal(proofRef.sha256,hash(read(proofRef.path)));
  fresh.independent_evidence=oldReview.independent_evidence;assert.deepEqual(fresh,oldReview);roleRows++;
 }
}
assert.equal(roleRows,167);assert.equal(referencePaths.size,10);
const runtimeModules={artifact_behavior:['artifact-behavior','artifactBehaviorRequirements','validateArtifactBehavior'],historical_behavior:['historical-behavior','historicalBehaviorRequirements','validateHistoricalBehavior'],generated_identity_behavior:['generated-identity','generatedIdentityRequirements','validateGeneratedIdentity'],selection_behavior:['selection','selectionBehaviorRequirements','validateSelectionBehavior'],bidi_behavior:['bidi','bidiBehaviorRequirements','validateBidiBehavior'],progress_csp_behavior:['progress-csp','progressCspRequirements','validateProgressCsp'],form_field_hover_behavior:['form-field-hover','formFieldHoverRequirements','validateFormFieldHover'],tab_completion_behavior:['tab-completion','tabCompletionRequirements','validateTabCompletion'],ripple_replay_behavior:['ripple-replay','rippleReplayRequirements','validateRippleReplay'],content_observer_behavior:['content-observer','contentObserverRequirements','validateContentObserver'],media_matcher_behavior:['media-matcher','mediaMatcherRequirements','validateMediaMatcher'],native_date_behavior:['native-date','nativeDateRequirements','validateNativeDate']};
let currentGuards=0,requirementControls=0;
for(const row of [...data.after_requirements,data.native_definition]){
 const [name,method,validate]=runtimeModules[row.field],module=await import('../scripts/upstream-'+name+'-evidence.mjs');
 assert.deepEqual(module[method](row.sha,line),row.definition);const entry=currentEntries.get(row.sha);
 assert.deepEqual(module[validate]({root,entry,proof:entry.individual_proof}),{ok:false,detail:'missing coordinator run'});currentGuards++;
 if(row.sha!==native){assert.deepEqual(nativeDateRequirementsBefore(row.sha,row.definition,line,{readMember:read}),data.before_requirements.find(old=>old.sha===row.sha).definition);requirementControls++;}
}
assert.equal(currentGuards,line==='main'?24:23);
const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),candidate=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
const frozenEvidence=authoredUseReviewEvidence(frozen,line,read,hash),currentEvidence=currentAuthoredUseAdmission({current:scanCurrentAuthoredUses({root}),frozen:frozen.symbol_uses,candidate,line,readMember:read});
assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);assert.equal(currentEvidence.review_evidence.reviewed,178);assert.equal(currentEvidence.review_evidence.insufficient,0);assert.equal(currentEvidence.inventory.open,130);assert.equal(currentEvidence.ready,false);
assert.equal(git('diff',data.baseline,'--','projects','testing','reference','fixtures').length,0);
let subjectControls=0;
for(const path of ['compatibility/f10/disposition-ledger/ledger.json',...before.authored_stores.map(row=>row.path)]){
 assert.throws(()=>readNativeDatePackedBefore(path,p=>p===path?Buffer.concat([read(p),Buffer.from('\n// unreviewed')]):read(p)));subjectControls++;
 assert.equal(readNativeDatePackedBefore(path,read).toString(),path.includes('ledger.json')?before.ledger_text:before.authored_stores.find(row=>row.path===path).text);
}
for(const path of ['compatibility/rc/native-date-context-inputs.json','compatibility/rc/native-date-context-outputs.json',data.prior.path,ctx.output.expected.path]){
 assert.throws(()=>nativeDateSourceContext(p=>p===path?Buffer.concat([read(p),Buffer.from('unreviewed')]):read(p)));subjectControls++;
}
const report={schema_version:1,line,complete_committed_source_preimages:30,source_corruption_controls:sourceControls,subject_and_capsule_corruption_controls:subjectControls,
 preserved_ledger_verdicts:1697,historical_frame_members:historicalMembers,historical_projection_controls:historicalControls,current_native_guards:currentGuards,all_current_guards_reject_missing_coordinator:true,preceding_requirements_recovered:requirementControls,
 authored_rows_same_candidate_and_decision:roleRows,changed_role_source_references:referencePaths.size,frozen_reviewed:frozenEvidence.reviewed,current_reviewed:currentEvidence.review_evidence.reviewed,current_open:currentEvidence.inventory.open,
 live_matrix_unchanged:true,current_added_historical_cases_retained:3,old_actions_retained_as_historical:true,new_SHA_or_role_closures:0,required_consumer_HTML_CSS_SCSS_changes:0,
 actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(JSON.stringify(report));
