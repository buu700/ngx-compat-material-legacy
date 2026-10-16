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
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectTableVirtualUpstream,TABLE_UPSTREAM_INPUTS} from '../scripts/table-virtual-upstream-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=await inspectTableVirtualUpstream({root}),inputs=JSON.parse(read(TABLE_UPSTREAM_INPUTS));
assert.equal(Object.values(result.validations).reduce((a,b)=>a+b,0),83);
assert.equal(result.documents.length,6);assert.equal(result.context.unchanged_preceding_product_files,1138);
assert.equal(result.context.historical_candidate_only_updates.length,7);
assert.equal(result.native_upstream_tests_build_pack_floors_or_security_qualified,false);
const controls=[];
const table='projects/ngx-material-legacy/legacy-table/table.ts';
const spec='projects/ngx-material-legacy/legacy-table/table.spec.ts';
const ledger='compatibility/f10/disposition-ledger/ledger.json';
for(const [id,path,change,expected]of [
 ['input-capsule',TABLE_UPSTREAM_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/upstream context input changed/],
 ['prior-context-archive',inputs.prior_contexts.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/context archive changed/],
 ['product-preimages',inputs.preimages.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/context archive changed/],
 ['changed-constructor-helper',inputs.helper.path,bytes=>Buffer.from(bytes.toString().replace('token === CDK_VIRTUAL_SCROLL_VIEWPORT','true')),/changed tested table helper/],
 ['changed-existing-table',table,bytes=>Buffer.from(bytes.toString().replace('mat-table-sticky','foreign-sticky')),/changed bounded source/],
 ['weakened-preceding-test',spec,bytes=>Buffer.from(bytes.toString().replace('expect(outlets.length).toBe(4);','expect(outlets.length).toBe(3);')),/changed bounded source/],
 ['changed-source-inventory','testing/legacy-runner/historical-inventory.json',bytes=>{const x=JSON.parse(bytes);x.rows[0].historical_sha256='0'.repeat(64);return Buffer.from(JSON.stringify(x));},/changed bounded source/],
 ['unrelated-product-style','projects/ngx-material-legacy/legacy-table/table.scss',bytes=>Buffer.concat([bytes,Buffer.from('\n.unreviewed {display:none;}')]),/unreviewed preceding product change/],
 ['changed-build-config','package.json',bytes=>{const x=JSON.parse(bytes);x.scripts['build:lib']='bazel build';return Buffer.from(JSON.stringify(x));},/build input\/module changed/],
 ['changed-pack-module','scripts/npm-tooling-options.mjs',bytes=>Buffer.concat([bytes,Buffer.from('\n// unrelated edit\n')]),/build input\/module changed/],
 ['changed-constructor-evidence',inputs.evidence[0].path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/changed constructor\/role evidence/],
 ['changed-original-patch','compatibility/f10/disposition-ledger/evidence/patches/build-scope/b5d4de9794cd6c826a9a2d4fb27e7e9e3cb884ac.patch',bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/build source scope rejected/],
 ['changed-live-source-review',inputs.reports[0],bytes=>{const x=JSON.parse(bytes);x.reviews[0].decision+=' unreviewed change';return Buffer.from(JSON.stringify(x,null,2)+'\n');},/live source review changed/],
 ['changed-live-ledger-decision',ledger,bytes=>{const x=JSON.parse(bytes),entry=x.entries.find(e=>e.evidence_report===inputs.reports[0]);entry.reason+=' unreviewed change';return Buffer.from(JSON.stringify(x));},/live ledger judgment changed/],
]){
 const before=read(path),after=change(before);assert.notDeepEqual(after,before,id+': mutation did not apply');
 await assert.rejects(inspectTableVirtualUpstream({root,readMember:p=>p===path?after:read(p)}),expected,id+': mutation escaped');
 controls.push({id,rejected:true});
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schema_version:1,line:result.line,validated_source_scope_rows:result.validations,negative_controls:controls,
 original_judgments_unchanged:true,producer_sha256:hash(read('tests/table_virtual_upstream_requalification_probe.mjs')),
 source_checker_sha256:hash(read('scripts/table-virtual-upstream-requalification.mjs')),
 native_upstream_tests_build_pack_floors_or_security_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,source_scope_rows:83,negative_controls:controls.length,runtime_or_floor_qualified:false}));
