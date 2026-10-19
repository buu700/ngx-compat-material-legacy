/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fixtureLifecycleNativePrior,inspectFixtureLifecycleNativeRequalification,
 fixtureLifecycleNativeParentReader,nativeLedgerRows} from '../scripts/fixture-lifecycle-native-requalification.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),json=b=>Buffer.from(JSON.stringify(b,null,2)+'\n');
const prior=fixtureLifecycleNativePrior(),summary=inspectFixtureLifecycleNativeRequalification(),parent=fixtureLifecycleNativeParentReader(),controls=[];
for(const m of [prior.ledger,...prior.context_preimages])assert.equal(hash(parent(m.path)),m.sha256);
for(const m of prior.producer_preimages)assert.equal(parent(m.path).equals(read(m.path)),true,'current producers are never projected');
const currentText=read(prior.ledger.path).toString();
const original=nativeLedgerRows(prior.ledger.text),current=nativeLedgerRows(currentText),selected=new Set(prior.selected.map(m=>m.sha));let restored=currentText;
for(let i=current.length-1;i>=0;i--){const before=original[i],after=current[i];assert.equal(before.value.sha,after.value.sha);if(selected.has(before.value.sha))restored=restored.slice(0,after.start)+prior.ledger.text.slice(before.start,before.end)+restored.slice(after.end);else assert.equal(hash(prior.ledger.text.slice(before.start,before.end)),hash(currentText.slice(after.start,after.end)),'unrelated row bytes changed');}
assert.equal(hash(restored),prior.ledger.sha256,'all unselected rows and envelope bytes must survive');
function rejected(id,path,bytes){assert.throws(()=>inspectFixtureLifecycleNativeRequalification({read:p=>p===path?bytes:read(p)}),id);controls.push(id);}
const ledger=JSON.parse(read(prior.ledger.path));
for(const selected of prior.selected){
 const entry=ledger.entries.find(e=>e.sha===selected.sha),body=JSON.parse(read(entry.evidence_report)),old=JSON.parse(prior.reviews.find(m=>m.path===selected.evidence_report).text);
 for(const key of ['source_conclusion','hunk_reviews','diff_sha256','runtime_admission','runtime_qualification','branch_review','decision','final_disposition'])assert.deepEqual(body[key],old[key],key+' must remain unchanged');
 const api=await import('../scripts/upstream-'+(selected.field==='artifact_behavior'?'artifact-behavior':'generated-identity')+'-evidence.mjs'),validator=api[selected.field==='artifact_behavior'?'validateArtifactBehavior':'validateGeneratedIdentity'];
 assert.deepEqual(validator({root:process.cwd(),entry,proof:entry.individual_proof}),{ok:false,detail:'missing coordinator run'});
 for(const [id,mutate]of [
  ['stale-producer',p=>p[selected.field].source_members.find(m=>m.path===selected.path).sha256=selected.before_sha256],
  ['wrong-case',p=>p[selected.field].case_ids=['foreign']],
  ['missing-source',p=>p[selected.field].source_members.pop()],
  ['wrong-kind',p=>p[selected.field].kind='foreign'],
  ['wrong-patch',p=>p.diff_sha256='0'.repeat(64)],
 ]){const proof=structuredClone(entry.individual_proof);mutate(proof);const result=validator({root:process.cwd(),entry,proof});assert.equal(result.ok,false);assert.notEqual(result.detail,'missing coordinator run',id);controls.push(selected.sha+':'+id);}
 const changed=structuredClone(ledger);changed.entries.find(e=>e.sha===selected.sha).final_disposition='not-applicable';rejected(selected.sha+':changed-disposition',prior.ledger.path,json(changed));
 body.actual_native_packed_or_floor_qualified=true;rejected(selected.sha+':fabricated-execution',entry.evidence_report,json(body));
 rejected(selected.sha+':changed-original-report',selected.evidence_report,Buffer.concat([read(selected.evidence_report),Buffer.from('\n')]));
}
for(const path of [...prior.producer_preimages.map(m=>m.path),...prior.context_preimages.map(m=>m.path),'compatibility/rc/fixture-lifecycle-native-requalification-prior.json.gz'])rejected('changed-bound-member:'+path,path,Buffer.concat([read(path),Buffer.from('\n')]));
const changed=structuredClone(ledger);changed.entries.find(e=>!selected.has(e.sha)).reason+=' test';rejected('unrelated-ledger-row',prior.ledger.path,json(changed));
rejected('entire-old-ledger',prior.ledger.path,Buffer.from(prior.ledger.text));
assert.equal(controls.length,57);
const result={...summary,rejection_controls:controls.length,controls,raw_six_validators_refuse_missing_coordinator:true,unselected_ledger_and_envelope_bytes_preserved:true,current_native_validator_or_contract_edits:0};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
