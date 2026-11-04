/** Serial physical shared-reader controls; no owner/source producer execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {historicalContractRepairReaderSubject,readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=resolve(process.argv[2]),output=process.argv[3];assert.match(output,/^compatibility\/rc\/parallel-base-class-owner-integration-[a-z0-9-]+\.json$/);
const begin=performance.now(),read=path=>readHistoricalContractRepairOwnerMember(root,path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=path=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};};
const line21=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.');
const protectedPaths=['compatibility/f10/disposition-ledger/ledger.json',...(line21?['scripts/upstream-source-contract-registry.mjs','compatibility/rc/21x-remaining-disposition-worksheet.json']:[])];
const protectedBefore=protectedPaths.map(ref),subject=historicalContractRepairReaderSubject({root,read}),expected=subject.line==='21.x'?17:7;assert.equal(subject.transitions.length,expected);
const checks=['physical current inputs accepted'];
for(const row of subject.transitions){
 const wrong=path=>path===row.path?Buffer.from('nonphysical-tool'):read(path);wrong.assertCurrent=()=>{};wrong.toString=()=>read.toString();
 assert.throws(()=>historicalContractRepairReaderSubject({root,read:wrong}));checks.push('cold spoofed callback rejects '+row.path);
 let changed=false;const callback=path=>changed&&path===row.path?Buffer.from('late-nonphysical-tool'):read(path),late=historicalContractRepairReaderSubject({root,read:callback});changed=true;assert.throws(()=>late.assertCurrent());changed=false;late.assertCurrent();checks.push('late callback rejects and authentic restoration passes '+row.path);
 assert.equal(subject.ownsReference({path:row.path}),false);assert.equal(subject.ownsReference({path:row.path,sha256:'0'.repeat(64)}),false);
}
subject.assertCurrent();assert.deepEqual(protectedPaths.map(ref),protectedBefore);
const body={schema_version:1,line:subject.line,root,node:process.version,status:'physical-shared-reader-controls-pass',elapsed_ms:Math.round(performance.now()-begin),transitions:expected,checks_passed:checks.length,checks,source_inputs:['scripts/historical-contract-repair-readers.mjs','compatibility/rc/historical-contract-repair-reader-inputs.json'].map(ref),canonical_refs_before_and_after:protectedBefore,actual_physical_reader_constructor:true,actual_owner_or_source_producer_construction:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(body,null,2)+'\n');console.log(JSON.stringify({output,line:body.line,checks:checks.length,elapsed_ms:body.elapsed_ms,source_inputs:body.source_inputs}));
