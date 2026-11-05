/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Exact owned-path fastpath controls; source-only, no compiler/producer. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},rows=[];
for(const[line,root]of Object.entries(roots)){
 let callbacks=0;const read=path=>{callbacks++;return readFileSync(join(root,path));},api=await import(pathToFileURL(join(root,'scripts/sass-spinner-snack-c04-source.mjs'))),source=api.spinnerSnackC04Source({root,read});
 const unknown={path:'scripts/outside-the-finite-C04-set.mjs',sha256:'0'.repeat(64),bytes:3,annotation:{role:'caller-only'}};callbacks=0;const result=source.qualify(unknown);assert.strictEqual(result,unknown);assert.equal(callbacks,0);assert.equal(unknown.annotation.role,'caller-only');
 let rejected=0,accepted=0;for(const transition of source.summary.sources){for(const side of ['before','current']){const ref={path:transition.path,...transition[side]},qualified=source.qualify(ref);assert.equal(qualified.sha256,transition.current.sha256);accepted++;}for(const mutation of [{sha256:'0'.repeat(64)},{bytes:transition.before.bytes+1}]){assert.throws(()=>source.qualify({path:transition.path,...transition.before,...mutation}));rejected++;}}
 const data=JSON.parse(readFileSync(join(root,'compatibility/rc/historical-contract-repair-reader-inputs.json'))),tool=data.tool_transitions.at(-1);assert.equal(source.qualify({path:tool.path,...tool.before}).sha256,tool.after.sha256);accepted++;assert.throws(()=>source.qualify({path:tool.path,...tool.before,sha256:'0'.repeat(64)}));rejected++;
 let getters=0;const nested={path:tool.path,...tool.before,metadata:{}};Object.defineProperty(nested.metadata,'value',{enumerable:true,get(){getters++;return 'bad';}});assert.throws(()=>source.qualify(nested));assert.equal(getters,0);rejected++;
 source.assertCurrent();rows.push({line,nonowned_metadata_only_callback_reads:0,nonowned_caller_metadata_is_passthrough:true,owned_valid_references_accepted:accepted,owned_foreign_hash_or_size_and_nested_descriptor_rejections:rejected,getter_calls:getters});
}
const out={schema_version:1,result:'pass',rows,actual_physical_C04_subject:true,compiler_or_source_producer_executed:false,real_inputs_mutated:false,independent_closing_review:'open',g11_claim:'not-passed'};writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:'pass',lines:rows.length,rejections:rows.reduce((n,r)=>n+r.owned_foreign_hash_or_size_and_nested_descriptor_rejections,0)}));
