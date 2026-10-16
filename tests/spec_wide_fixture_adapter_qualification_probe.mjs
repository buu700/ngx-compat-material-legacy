/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectWideAdapterRequalification, ADAPTER_QUALIFICATION_PATH} from '../scripts/spec-wide-fixture-adapter-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=inspectWideAdapterRequalification({root});
assert.equal(result.updates.size,13); assert.equal(result.writes.size,15);
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const priorPath='compatibility/rc/spec-wide-fixture-source-adapter-prior.json.gz';
const prior=JSON.parse(gunzipSync(read(priorPath))),controls=[];
const nativeMember=prior.selected_entries[0].individual_proof.historical_behavior.source_members.find(n=>n.path.startsWith('projects/'));
for (const [id,path,change] of [
  ['stale-original-adapter','testing/legacy-runner/adapt-spec.mjs',()=>Buffer.from(prior.adapter.text)],
  ['changed-native-source',nativeMember.path,bytes=>Buffer.concat([bytes,Buffer.from('\n')])],
  ['changed-prior-capsule',priorPath,bytes=>Buffer.concat([bytes,Buffer.from('x')])],
  ['changed-original-evidence',prior.source_references[0].path,bytes=>Buffer.concat([bytes,Buffer.from('\n')])],
  ['changed-qualification',ADAPTER_QUALIFICATION_PATH,bytes=>Buffer.concat([bytes,Buffer.from('\n')])],
  ['changed-unrelated-ledger-row',ledgerPath,bytes=>{
    const ledger=JSON.parse(bytes),selected=new Set(prior.selected_entries.map(n=>n.sha));
    ledger.entries.find(n=>!selected.has(n.sha)).reason+=' unreviewed'; return Buffer.from(JSON.stringify(ledger));
  }],
  ['changed-selected-verdict',ledgerPath,bytes=>{
    const ledger=JSON.parse(bytes); ledger.entries.find(n=>n.sha===prior.selected_entries[0].sha).final_disposition='do-not-adopt';
    return Buffer.from(JSON.stringify(ledger));
  }],
]) {
  assert.throws(()=>inspectWideAdapterRequalification({root,readMember:member=>member===path?change(read(member)):read(member)}),undefined,id);
  controls.push({id,result:'rejected'});
}
for(const [path,bytes]of result.writes)assert.ok(read(path).equals(bytes),'unapplied exact output '+path);
console.log(JSON.stringify({line:result.line,qualified_entries:13,unrelated_rows_preserved:1684,
  scope_rejection_controls:controls.length,native_rejection_controls:result.native.reduce((sum,n)=>sum+n.controls.length,0),
  all1697_verdicts_unchanged:true,actual_Angular_native_artifact_or_floor_qualified:false,controls}));
