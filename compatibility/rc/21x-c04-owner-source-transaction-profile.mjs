/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One real current epoch; observe injected reads without replacing source or results. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
assert.equal(process.argv.length,3);
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),disk=p=>readFileSync(join(root,p));
const ledger='compatibility/f10/disposition-ledger/ledger.json',owner='scripts/packed-upstream-ledger-epoch.mjs',registry='scripts/upstream-source-contract-registry.mjs';
const ref=p=>{const raw=disk(p);return {path:p,sha256:hash(raw),bytes:raw.length};};
const subjects=[owner,registry,ledger,'scripts/packed-upstream-ledger-base.mjs','scripts/check-upstream-audit-disposition.mjs',relative(root,fileURLToPath(import.meta.url))].map(ref);
assert.equal(subjects.find(row=>row.path===ledger).sha256,'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111');
assert.equal(subjects.find(row=>row.path===registry).sha256,'5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af');
const api=await import(pathToFileURL(join(root,owner))),counts=new Map();
function read(path){
 const row=counts.get(path)??{path,calls:0,successful_reads:0,bytes:0,read_ms:0,errors:{}};counts.set(path,row);row.calls++;
 const start=performance.now();try{const raw=disk(path);row.successful_reads++;row.bytes+=raw.length;return raw;}catch(error){row.errors[error.code]=(row.errors[error.code]??0)+1;throw error;}finally{row.read_ms+=performance.now()-start;}
}
const started_at_utc=new Date().toISOString(),start=performance.now(),cpu=process.cpuUsage();
const epoch=api.packedUpstreamLedgerEpoch({root,read});assert.equal(epoch.individual_decisions_applied,56);assert.equal(epoch.raw,read);
assert.equal(epoch.title_source_decisions_applied,1);assert.equal(epoch.title_native_registry_metadata_tokens_applied,14);
assert.equal(epoch.theming_source_decisions_applied,2);assert.equal(epoch.inspection_source_decisions_applied,4);assert.equal(epoch.selector_density_source_decisions_applied,2);assert.equal(epoch.button_tokenization_source_decisions_applied,5);assert.equal(epoch.button_token_repairs_source_decisions_applied,2);
assert.equal(hash(epoch.raw(ledger)),subjects.find(row=>row.path===ledger).sha256);
const historical=epoch.read(ledger);assert.equal(hash(historical),'b1a562cd78fb7fe515cf612f90f1795b632278058d8710a0ec00a9aa06ac1b38');
for(const path of [owner,registry,'projects/ngx-material-legacy/styles/button/_button-theme.scss'])assert.equal(epoch.read(path).equals(disk(path)),true);
epoch.assertCurrent();const elapsed_ms=performance.now()-start,cpu_usage=process.cpuUsage(cpu);
for(const subject of subjects)assert.deepEqual(ref(subject.path),subject);
const rows=[...counts.values()].map(row=>({...row,read_ms:Math.round(row.read_ms*1000)/1000}));
const report={schema_version:1,line:'21.x',result:'pass',started_at_utc,command:[process.execPath,...process.execArgv,...process.argv.slice(1)],node:process.version,
 scope:'One fresh packedUpstreamLedgerEpoch creation, one raw and historical ledger read, three current public source reads and final assertCurrent; module/Git/internal reads outside the injected reader are not counted.',
 elapsed_ms:Math.round(elapsed_ms),parent_cpu_user_ms:cpu_usage.user/1000,parent_cpu_system_ms:cpu_usage.system/1000,
 injected_reader_calls:rows.reduce((n,row)=>n+row.calls,0),injected_successful_reads:rows.reduce((n,row)=>n+row.successful_reads,0),injected_bytes_read:rows.reduce((n,row)=>n+row.bytes,0),injected_read_ms:Math.round(rows.reduce((n,row)=>n+row.read_ms,0)),unique_injected_paths:rows.length,
 top_paths_by_bytes:[...rows].sort((a,b)=>b.bytes-a.bytes).slice(0,25),top_paths_by_calls:[...rows].sort((a,b)=>b.calls-a.calls).slice(0,25),all_injected_paths:rows.sort((a,b)=>a.path.localeCompare(b.path)),
 subjects,current_source_admissions:56,closed_dispositions:392,pending_dispositions:1305,pending_security_reviews:1,canonical_ledger_unchanged:true,source_registry_unchanged:true,current_public_source_bytes_preserved:true,
 full_retained_1800s_suite_executed:false,full_M3_suite_executed:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,elapsed_ms:report.elapsed_ms,injected_reader_calls:report.injected_reader_calls,injected_bytes_read:report.injected_bytes_read,injected_read_ms:report.injected_read_ms,parent_cpu_user_ms:report.parent_cpu_user_ms}));
