/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source guard controls only: these do not execute Angular or qualify a packed run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateNativeDate,NATIVE_DATE_SHA,nativeDateRequirements} from '../scripts/upstream-native-date-evidence.mjs';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..'), read=p=>readFileSync(join(source,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const entry=JSON.parse(read(ledgerPath)).entries.find(row=>row.sha===NATIVE_DATE_SHA);
const before=JSON.parse(execFileSync('git',['show','4903a80fc76cd3b57b806a9b89003f5b1545baa5:'+ledgerPath],{cwd:source,maxBuffer:20*1024*1024})).entries.find(row=>row.sha===NATIVE_DATE_SHA);
const review=JSON.parse(read(entry.evidence_report)),registration=review.native_date_current_source_registration;
assert.deepEqual(entry.individual_proof,review.individual_proof);
assert.equal(hash(read(registration.prior_review.path)),registration.prior_review.sha256);
assert.deepEqual(JSON.parse(read(registration.prior_review.path)).individual_proof,before.individual_proof);
const members=entry.individual_proof.native_date_behavior.source_members;
assert.deepEqual(members.map(x=>x.path),nativeDateRequirements(NATIVE_DATE_SHA).members);
const changeMap=new Map(registration.changed_members.map(row=>[row.path,row]));assert.equal(changeMap.size,5);
const reconstructed=structuredClone(entry);reconstructed.evidence_report=before.evidence_report;
for(const [i,member] of members.entries()){
 const expected=before.individual_proof.native_date_behavior.source_members[i];assert.equal(member.path,expected.path);assert.equal(hash(read(member.path)),member.sha256);
 const change=changeMap.get(member.path);
 if(change){assert.equal(change.before_sha256,expected.sha256);assert.equal(change.after_sha256,member.sha256);reconstructed.individual_proof.native_date_behavior.source_members[i].sha256=expected.sha256;}
 else assert.equal(member.sha256,expected.sha256);
}
assert.deepEqual(reconstructed,before);
const root=mkdtempSync(join(tmpdir(),'native-date-source-registration-'));
try {
 for(const {path} of members){const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,read(path));}
 const check=()=>validateNativeDate({root,entry,proof:entry.individual_proof,request:{}});
 let result=check();assert.equal(result.ok,false);assert.match(result.detail,/missing coordinator run/);
 for(const {path} of members){const file=join(root,path),old=readFileSync(file);writeFileSync(file,Buffer.concat([old,Buffer.from('\n')]));result=check();assert.equal(result.ok,false);assert.match(result.detail,/stale native date source member/);writeFileSync(file,old);}
 for(const [path,message] of [['projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts',/changed original native date algorithm or constructor/],['reference/material-16.2.14/datetime/native-date-adapter.ts',/changed original native date source/]]){
  const m=members.find(x=>x.path===path),file=join(root,path),old=readFileSync(file),oldHash=m.sha256,altered=Buffer.concat([old,Buffer.from('\n')]);writeFileSync(file,altered);m.sha256=hash(altered);result=check();assert.equal(result.ok,false);assert.match(result.detail,message);writeFileSync(file,old);m.sha256=oldHash;
 }
 for(const mutate of [e=>e.sha='a'.repeat(40),e=>e.individual_proof.proof_kind='other',e=>e.individual_proof.native_date_behavior.case_ids.reverse(),e=>e.individual_proof.native_date_behavior.source_members.pop()]){const copy=structuredClone(entry);mutate(copy);assert.equal(validateNativeDate({root,entry:copy,proof:copy.individual_proof,request:{}}).ok,false);}
 console.log(JSON.stringify({source_members:members.length,stale_source_controls:members.length,repinned_original_mutations_rejected:2,scope_mutants_rejected:4,missing_run_rejected:true,previous_entry_recovered:true,synthetic_only:true,actual_native_packed_or_floor_qualified:false}));
} finally {rmSync(root,{recursive:true,force:true});}
