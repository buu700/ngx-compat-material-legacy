/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real complete legacy source review; no Sass/compiler/full-owner execution. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectLegacyRemovalSourceReview} from '../scripts/upstream-legacy-removal-source.mjs';
import {readHistoricalContractRepairOwnerMember} from '../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),out=process.argv[2];
if(out){assert.match(out,/^compatibility\/rc\/parent-base-class-legacy-sass-controls-[a-z0-9-]+\.json$/);assert.equal(existsSync(out),false);}
const SELF='scripts/upstream-legacy-removal-source.mjs',FROZEN='compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),physical=path=>readHistoricalContractRepairOwnerMember(root,path);
const sourcePaths=[SELF,'scripts/current-sass-source.mjs','compatibility/rc/current-sass-source-inputs-v2.json',FROZEN];
const ref=path=>{const raw=physical(path);return {path,sha256:hash(raw),bytes:raw.length};},before=sourcePaths.map(ref),checks=[],start=performance.now();
let changed=null,calls=0,trigger=Infinity,mutated=false;
const program=physical(SELF);
const read=path=>{const raw=physical(path);if(++calls===trigger){writeFileSync(SELF,Buffer.concat([program,Buffer.from('\n// injected final callback source drift\n')]));mutated=true;}return path===changed?Buffer.concat([raw,Buffer.from('\n')]):raw;};
const source=inspectLegacyRemovalSourceReview({root,read});
assert.deepEqual(source.historical_comparison_report,JSON.parse(physical(FROZEN)));
assert.equal(source.qualified_product_reference_successors,4);assert.equal(source.current_sass_reference_successors,5);
checks.push('complete original boundary and unchanged four-repair comparison plus five exact Sass refs');
for(const path of ['button','card','checkbox','progress-spinner','snack-bar'].map(name=>'projects/ngx-material-legacy/styles/'+name+'/_'+name+'-theme.scss')){
 changed=path;assert.throws(()=>source.assertCurrent(),undefined,path);changed=null;source.assertCurrent();checks.push('late nonphysical source rejected and restoration passes:'+path);
}
changed='projects/ngx-material-legacy/legacy-table/row.ts';assert.throws(()=>source.assertCurrent());changed=null;source.assertCurrent();checks.push('unrelated non-Sass product defect still rejects');
calls=0;source.assertCurrent();const count=calls;assert.ok(count>0);calls=0;trigger=count;
try{assert.throws(()=>source.assertCurrent());assert.equal(mutated,true);checks.push('last callback cannot mutate earlier loaded source program');}
finally{writeFileSync(SELF,program);trigger=Infinity;}
source.assertCurrent();assert.deepEqual(sourcePaths.map(ref),before);checks.push('all source files restored and frozen comparison unchanged');
const report={schema_version:1,status:'pass',node:process.version,seconds:(performance.now()-start)/1000,checks,checks_passed:checks.length,source_inputs:before,bound:source.bound.length,original_product_reference_successors:4,current_sass_reference_successors:5,complete_legacy_source_review_executed:true,complete_shared_owner_executed:false,Sass_compiler_or_build_executed:false,product_file_mutations:0,g11_claim:'not-passed'};
if(out)writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
