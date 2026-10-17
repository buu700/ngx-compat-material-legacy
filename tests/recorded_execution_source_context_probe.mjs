/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact predecessor and live guard checks. No product execution or closure credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {recordedSourceContext,recordedHistoricalRead,reverseRecordedSource,recordedImplementationSubject} from '../scripts/recorded-execution-source-context.mjs';
import {nativeDateSourceContext,readNativeDatePackedBefore} from '../scripts/native-date-packed-source-context.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
import {ownedStyleCaseIds} from '../scripts/owned-style-contract.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=b=>createHash('sha256').update(b).digest('hex');
const json=v=>JSON.stringify(v,null,2)+'\n',same=(a,b)=>assert.deepEqual(a,b);
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,maxBuffer:40*1024*1024});
assert.equal(hash(read('scripts/recorded-execution-source-context.mjs')),'9ab4bb50af0cb9fd7c5343cfae25bf5bb774f37c33c671726c60c583cfd5d695');
assert.equal(hash(read('tests/recorded_execution_source_context.py')),'bde112b4c0cf2bf2c21d57b93f919b7d52cc9b9af1e5f41fa4c75cde4b32eaf6');
const ctx=recordedSourceContext(read),{data,before,after,output}=ctx,line=data.line,history=recordedHistoricalRead(read);
assert.equal(recordedHistoricalRead(read),history);assert.equal(recordedHistoricalRead(history),history);
assert.equal(Object.isFrozen(data.after_requirements[0].definition.members),true);
assert.equal(before.sources.length,17);assert.equal(data.changes.length,17);assert.equal(data.new_source_members.length,5);
let sourceControls=0,subjectControls=0,projectionControls=0;
function strictCurrent(readMember){
 recordedSourceContext(readMember);
 for(const change of data.changes)assert.equal(hash(readMember(change.path)),change.current_sha256);
 for(const member of [...data.new_source_members,...after.members])assert.equal(hash(readMember(member.path)),member.sha256);
}
strictCurrent(read);
for(const old of before.sources){
 const bytes=read(old.path),change=data.changes.find(r=>r.path===old.path);assert.ok(change);
 same(git('show',data.baseline+':'+old.path).toString(),old.text);assert.equal(hash(bytes),change.current_sha256);
 assert.equal(reverseRecordedSource(old.path,bytes.toString(),{readMember:read,strict:true}),old.text);
 assert.equal(reverseRecordedSource(old.path,old.text,{readMember:read,strict:true}),old.text);
 assert.throws(()=>reverseRecordedSource(old.path,bytes+'\n// unreviewed\n',{readMember:read,strict:true}));sourceControls++;
 assert.throws(()=>strictCurrent(path=>path===old.path?Buffer.from(old.text):read(path)));sourceControls++;
 assert.equal(history(old.path).toString(),old.text);
 const unknown=Buffer.concat([bytes,Buffer.from('\n// unknown\n')]),view=recordedHistoricalRead(path=>path===old.path?unknown:read(path));
 assert.equal(view(old.path),unknown);projectionControls++;
}
for(const member of [...before.reviews,...before.authored_reviews,...before.frame_tooling_before]){
 assert.equal(git('show',data.baseline+':'+member.path).toString(),member.text);
 if(!before.frame_tooling_before.includes(member))assert.equal(read(member.path).toString(),member.text);
}
for(const member of after.members){
 assert.throws(()=>strictCurrent(path=>path===member.path?Buffer.concat([read(path),Buffer.from('\n// changed')]):read(path)));subjectControls++;
}
const implementation=JSON.parse(before.implementation_ledger_text),current=JSON.parse(read(before.ledger_path)),oldEntries=new Map(implementation.entries.map(r=>[r.sha,r])),entries=new Map(current.entries.map(r=>[r.sha,r]));
assert.equal(git('show',data.implementation_parent+':'+before.ledger_path).toString(),before.implementation_ledger_text);
assert.equal(git('show',data.baseline+':'+before.ledger_path).toString(),before.ledger_text);
assert.equal(hash(read(before.ledger_path)),data.expected_ledger_sha256);assert.equal(entries.size,1697);same([...entries.keys()],[...oldEntries.keys()]);
const updated=new Set(data.before_requirements.map(r=>r.sha)),definitions=new Map(data.after_requirements.map(r=>[r.sha,r]));
let refreshed=0;
for(const row of current.entries){
 const old=oldEntries.get(row.sha);assert.equal(row.final_disposition,old.final_disposition);
 if(!updated.has(row.sha)){same(row,old);continue;}
 const scope=definitions.get(row.sha),expected=structuredClone(old);
 expected.evidence_report='compatibility/f10/disposition-ledger/evidence/closeout-recorded-source-context-'+row.sha+'.json';
 expected.individual_proof[scope.field].source_members=scope.definition.members.map(path=>({path,sha256:hash(read(path))}));same(row,expected);
 const doc=JSON.parse(read(row.evidence_report)),oldDoc=JSON.parse(read(old.evidence_report)),transition=doc.recorded_source_context;
 same(transition.inputs,output.inputs);same(transition.prior_review,{path:old.evidence_report,sha256:hash(read(old.evidence_report))});
 same(transition.prior_entry,{ledger_path:before.ledger_path,ledger_commit:data.implementation_parent,entry_sha256:hash(json(old))});
 assert.equal(transition.actual_native_packed_or_floor_qualified,false);delete doc.recorded_source_context;oldDoc.individual_proof=row.individual_proof;same(doc,oldDoc);refreshed++;
}
assert.equal(refreshed,line==='main'?24:23);
const four=JSON.parse(read('compatibility/rc/recorded-execution-current-worksheet.json')).subjects;
assert.equal(four.length,4);for(const sha of four)same(entries.get(sha),oldEntries.get(sha));
assert.equal(recordedImplementationSubject(before.ledger_path,read).toString(),before.implementation_ledger_text);
assert.throws(()=>recordedImplementationSubject('unknown',read));subjectControls++;
const subjects=[{path:before.ledger_path,text:before.ledger_text},...before.authored_stores];
for(const member of subjects){
 assert.equal(history(member.path).toString(),member.text);
 const unknown=Buffer.concat([read(member.path),Buffer.from('\n// unknown subject\n')]),view=recordedHistoricalRead(path=>path===member.path?unknown:read(path));
 assert.equal(view(member.path),unknown);projectionControls++;
}
assert.throws(()=>recordedImplementationSubject(before.ledger_path,path=>path===before.ledger_path?Buffer.concat([read(path),Buffer.from('\n')]):read(path)));subjectControls++;
const capsulePaths=[output.inputs.path,'compatibility/rc/recorded-source-context-outputs.json',data.prior.path,output.expected.path];
for(const path of capsulePaths){assert.throws(()=>recordedSourceContext(p=>p===path?Buffer.concat([read(p),Buffer.from('unreviewed')]):read(p)));subjectControls++;}
// Only an explicit view captures immutable context. Direct API calls always
// recheck all four live identities, including when a prior parsed cache exists.
for(const path of capsulePaths){
 let corrupt=false;const changing=p=>corrupt&&p===path?Buffer.from('corrupt'):read(p),captured=recordedHistoricalRead(changing);corrupt=true;
 assert.throws(()=>recordedSourceContext(changing));projectionControls++;
 assert.equal(recordedSourceContext(captured),ctx);assert.equal(captured(before.sources[0].path).toString(),before.sources[0].text);projectionControls++;
}
const native=nativeDateSourceContext(read);
assert.equal(native.before.sources.length,30);assert.equal(native.data.after_requirements.length,line==='main'?23:22);
assert.equal(readNativeDatePackedBefore(before.ledger_path,read).toString(),native.before.ledger_text);
const modules={artifact_behavior:['artifact-behavior','artifactBehaviorRequirements','validateArtifactBehavior'],historical_behavior:['historical-behavior','historicalBehaviorRequirements','validateHistoricalBehavior'],generated_identity_behavior:['generated-identity','generatedIdentityRequirements','validateGeneratedIdentity'],selection_behavior:['selection','selectionBehaviorRequirements','validateSelectionBehavior'],bidi_behavior:['bidi','bidiBehaviorRequirements','validateBidiBehavior'],progress_csp_behavior:['progress-csp','progressCspRequirements','validateProgressCsp'],form_field_hover_behavior:['form-field-hover','formFieldHoverRequirements','validateFormFieldHover'],tab_completion_behavior:['tab-completion','tabCompletionRequirements','validateTabCompletion'],ripple_replay_behavior:['ripple-replay','rippleReplayRequirements','validateRippleReplay'],content_observer_behavior:['content-observer','contentObserverRequirements','validateContentObserver'],media_matcher_behavior:['media-matcher','mediaMatcherRequirements','validateMediaMatcher'],native_date_behavior:['native-date','nativeDateRequirements','validateNativeDate'],owned_style_behavior:['owned-style','ownedStyleRequirements','validateOwnedStyle']};
let guards=0;
for(const row of data.after_requirements){
 const [name,requirements,validate]=modules[row.field],module=await import('../scripts/upstream-'+name+'-evidence.mjs');same(module[requirements](row.sha,line),row.definition);
 const entry=entries.get(row.sha),scope=entry.individual_proof[row.field];assert.equal(scope.kind,row.definition.kind);
 same(scope.source_members,row.definition.members.map(path=>({path,sha256:hash(read(path))})));
 same(module[validate]({root,entry,proof:entry.individual_proof}),{ok:false,detail:'missing coordinator run'});guards++;
}
for(const row of data.before_requirements)same(definitions.get(row.sha),row);
assert.equal(guards,line==='main'?28:27);
const frozen=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),candidate=JSON.parse(read('compatibility/f10/authored-dependency-current-dispositions.json'));
const frozenEvidence=authoredUseReviewEvidence(frozen,line,read,hash),currentEvidence=currentAuthoredUseAdmission({current:scanCurrentAuthoredUses({root}),frozen:frozen.symbol_uses,candidate,line,readMember:read});
assert.equal(frozenEvidence.reviewed,1446);assert.equal(frozenEvidence.insufficient,0);assert.equal(currentEvidence.review_evidence.reviewed,178);assert.equal(currentEvidence.review_evidence.insufficient,0);assert.equal(currentEvidence.inventory.open,130);assert.equal(currentEvidence.ready,false);
let authoredRefs=0;
for(const store of before.authored_stores)assert.equal(read(store.path).toString(),store.text);
for(const member of before.authored_reviews){
 assert.equal(read(member.path).toString(),member.text);
 for(const row of JSON.parse(member.text).reviews)for(const ref of row.independent_evidence){assert.ok(!data.changes.some(c=>c.path===ref.path));authoredRefs++;}
}
const matrix=JSON.parse(read('compatibility/rc/matrices/full-verify.json')),oldMatrix=JSON.parse(before.sources.find(r=>r.path==='compatibility/rc/matrices/full-verify.json').text);
const owned=m=>m.checks.find(r=>r.check_id==='sass-seal').acceptance.cases_by_line[line]['owned-rendered'];
assert.equal(owned(matrix).length,37);assert.equal(owned(oldMatrix).length,24);assert.ok(owned(oldMatrix).every(id=>owned(matrix).includes(id)));same(owned(matrix),ownedStyleCaseIds());
const registry=JSON.parse(read('compatibility/rc/historical-source-replay-inputs.json')),oldRegistry=JSON.parse(before.frame_tooling_before.find(r=>r.path.endsWith('inputs.json')).text);
assert.equal(registry.schema_version,10);assert.equal(registry.entries.length,25);assert.equal(registry.wrapper_edits.length,22);
same(registry.entries.slice(0,24),oldRegistry.entries);same(registry.wrapper_edits.slice(0,21),oldRegistry.wrapper_edits);
const newEntry=registry.entries.at(-1);assert.equal(newEntry.id,'native-date-context-source');assert.equal(newEntry.frame.commit,data.baseline);
assert.equal(git('show',data.baseline+':tests/native_date_source_context_probe.mjs').toString(),read('tests/native_date_source_context_probe.mjs').toString());
assert.equal(git('diff',data.baseline,'--','projects','testing','reference','fixtures').length,0);
const report={schema_version:1,line,complete_committed_source_preimages:17,source_corruption_controls:sourceControls,subject_and_capsule_corruption_controls:subjectControls,
 historical_projection_controls:projectionControls,preserved_ledger_verdicts:1697,source_scopes_refreshed:refreshed,current_native_guards:guards,all_current_guards_reject_missing_coordinator:true,
 preserved_current_proof_migrations:4,authored_stores_unchanged:2,authored_review_documents_unchanged:before.authored_reviews.length,authored_independent_references_checked:authoredRefs,
 frozen_reviewed:frozenEvidence.reviewed,current_reviewed:currentEvidence.review_evidence.reviewed,current_open:currentEvidence.inventory.open,current_owned_style_cells:37,original_owned_style_cells_retained:24,
 registered_original_programs:25,original_programs_unchanged:true,new_SHA_or_role_closures:0,required_consumer_HTML_CSS_SCSS_changes:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],json(report),{flag:'wx'});console.log(JSON.stringify(report));
