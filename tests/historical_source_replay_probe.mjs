/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real current-graph guard with cached bytes; no historical/runtime credit from this test. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HISTORICAL_REPLAY_INPUTS,historicalReplayInputs,historicalFrameMembers,inspectHistoricalReplayCurrent,verifyHistoricalCurrentSubjects} from '../scripts/historical-source-replay.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const result=inspectHistoricalReplayCurrent({root}),{data,members,guard}=result,cache=new Map(members.filter(row=>!data.mutable_progress_paths.includes(row.path)).map(row=>[row.path,read(row.path)]));
const productPaths=members.filter(row=>row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.path).sort(),cases=[];
const cached=path=>cache.get(path)||read(path),inspect=readMember=>verifyHistoricalCurrentSubjects({root,data,members,readMember,productPaths});
assert.deepEqual(inspect(cached),guard);
for(const path of [HISTORICAL_REPLAY_INPUTS]){
 const bytes=Buffer.concat([read(path),Buffer.from(' ')]);assert.throws(()=>historicalReplayInputs({root,readMember:name=>name===path?bytes:cached(name)}),/input changed/);cases.push({id:'changed-pinned-registry',result:'rejected'});
}
for(const path of [
 'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',
 'projects/ngx-material-legacy/legacy-tabs/tab-body.html',
 'projects/ngx-material-legacy/legacy-table/internal/column-classes.ts',
 'scripts/check-upstream-audit-disposition.mjs',
 'scripts/upstream-tab-completion-evidence.mjs',
 'compatibility/f10/disposition-ledger/ledger.json',
 'compatibility/f10/authored-dependency-dispositions.json',
 'compatibility/f10/authored-dependency-current-dispositions.json',
 'compatibility/rc/remaining-native-admission-tab-repair-source-context-proof.json',
 ...data.entries.map(row=>row.probe),
 ...data.wrapper_edits.map(row=>row.path),
 ...data.current_head_tooling_paths,
]){
 const before=cached(path),changed=Buffer.concat([before,Buffer.from('\n// unreviewed caller data\n')]);
 assert.throws(()=>inspect(name=>name===path?changed:cached(name)),/changed/,path);cases.push({id:'changed-current-subject-'+path,result:'rejected'});
}
const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
for(const path of ['projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts','compatibility/f10/disposition-ledger/ledger.json']){
 const older=git(['show',data.entries[0].frame.commit+':'+path]);assert.notDeepEqual(older,cached(path));
 assert.throws(()=>inspect(name=>name===path?older:cached(name)),/changed/);cases.push({id:'authentic-old-caller-subject-is-not-replaced-'+path,result:'rejected'});
}
for(const wrapper of data.wrapper_edits){
 const before=git(['show',data.wrapper_reference_commit+':'+wrapper.path]);assert.deepEqual(inspect(name=>name===wrapper.path?before:cached(name)),guard);
 let next=before.toString();for(const edit of wrapper.edits)next=next.replace(edit.before,edit.after);
 assert.deepEqual(inspect(name=>name===wrapper.path?Buffer.from(next):cached(name)),guard);cases.push({id:'exact-before-and-command-only-wrapper-'+wrapper.path,result:'pass'});
}
for(const values of [[],[...productPaths,'projects/ngx-material-legacy/internal/unreviewed.ts'].sort(),[...productPaths,productPaths[0]].sort()]){
 assert.throws(()=>verifyHistoricalCurrentSubjects({root,data,members,readMember:cached,productPaths:values}),/membership changed/);cases.push({id:'changed-product-membership-'+cases.length,result:'rejected'});
}
for(const field of ['tree','tree_listing_sha256','members']){
 const frame=structuredClone(data.current_frame);frame[field]=field==='members'?frame.members-1:'0'.repeat(field==='tree'?40:64);
 assert.throws(()=>historicalFrameMembers(root,frame));cases.push({id:'changed-immutable-frame-'+field,result:'rejected'});
}
const invalid=spawnSync(process.execPath,['scripts/run-historical-source-probe.mjs','unregistered'],{cwd:root,encoding:'utf8'});
assert.equal(invalid.status,1);assert.match(invalid.stderr,/unregistered historical probe/);cases.push({id:'actual-cli-rejects-unregistered-probe',result:'rejected'});
const report={schema_version:2,line:data.line,scope:'Actual current coherence guard and exact wrapper/reference checks with cached original bytes. No historical program, build, installer, peer, browser or runtime qualification in these controls.',current_guard:guard,registered_original_programs:6,controls:cases.length,cases,inputs_sha256:hash(read(HISTORICAL_REPLAY_INPUTS)),helper_sha256:hash(read('scripts/historical-source-replay.mjs')),cli_sha256:hash(read('scripts/run-historical-source-probe.mjs')),producer_sha256:hash(read('tests/historical_source_replay_probe.mjs')),actual_current_source_or_native_or_packed_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:data.line,controls:cases.length,current_members:guard.guarded_current_members,current_product_members:guard.current_product_members,historical_probes_executed:0,actual_current_native_or_packed_qualified:false}));
