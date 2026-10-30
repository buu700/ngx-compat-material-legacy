/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Historical comparison callbacks never supply a current checker's bindings. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {dialogTitleReaderSubject} from '../../scripts/dialog-title-source-context.mjs';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),out=process.argv[2],prefix='compatibility/rc/cva-current-reader-repair-',hash=b=>createHash('sha256').update(b).digest('hex'),start=performance.now();assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
const report={schema_version:1,full_owner_or_shipped_current_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 let late=null;const disk=p=>readHistoricalContractRepairOwnerMember(root,p),read=p=>p===late?Buffer.concat([disk(p),Buffer.from('\n')]):disk(p);
 const title=dialogTitleReaderSubject({root,read}),packet=JSON.parse(disk('compatibility/rc/dialog-title-current-source-reader-successors.json'));
 const source=JSON.parse(disk('compatibility/rc/historical-contract-repair-source-inputs.json')),paths=source.images.filter(r=>r.path.startsWith('projects/')).map(r=>r.path),old=new Map();
 for(const row of source.images.filter(r=>paths.includes(r.path))){const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',source.repair_baseline_commit+':'+row.path],{cwd:root});assert.equal(hash(raw),row.before.sha256);old.set(row.path,raw);}
 const comparison=p=>old.has(p)?Buffer.from(old.get(p)):disk(p);
 const metadata=title.withHistoricalToolMetadata(r=>r,{comparisonRead:comparison});
 for(const row of packet.code_subjects)assert.equal(hash(metadata(row.path)),row.before.sha256);
 for(const path of paths){assert.equal(hash(metadata(path)),hash(old.get(path)));assert.notEqual(hash(metadata(path)),hash(disk(path)));}
 title.withHistoricalToolMetadata(r=>{for(const path of paths)assert.equal(hash(r(path)),hash(disk(path)));});
 const first=packet.code_subjects[0],copy=metadata(first.path);copy[0]^=1;assert.equal(hash(metadata(first.path)),first.before.sha256);
 const rejected=[];
 assert.throws(()=>title.withHistoricalToolMetadata(r=>r,{comparisonRead:null}));rejected.push('invalid-comparison-callback');
 const guards=[...paths,'scripts/dialog-title-source-context.mjs','scripts/packed-cva-source-requalification.mjs','compatibility/rc/historical-contract-repair-reader-inputs.json','projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts'];
 for(const path of guards){late=path;assert.throws(()=>title.assertCurrent());rejected.push('current/'+path);assert.throws(()=>metadata(first.path));rejected.push('escaped-old-tool/'+path);late=null;}
 assert.throws(()=>title.withHistoricalToolMetadata(()=>{late=paths[0];return 1;},{comparisonRead:comparison}));rejected.push('phase-end-current-change');late=null;
 assert.throws(()=>dialogTitleReaderSubject({root,read:p=>p===paths[0]?comparison(p):disk(p)}));rejected.push('old-product-fed-to-current-checker');
 title.assertCurrent();Object.assign(report,{status:'pass',line:title.line,current_bindings:title.bound.length,historical_tool_images:packet.code_subjects.length,explicit_historical_source_images:old.size,default_metadata_source_reads_stay_current:true,phase_and_projected_tool_guards_preserved:true,mutable_return_is_copy:true,rejections:rejected.length,rejected_case_ids:rejected});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,rejections:report.rejections,error:report.error}));
