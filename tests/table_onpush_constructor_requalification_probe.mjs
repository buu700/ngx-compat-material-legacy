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
import {inspectOnPushConstructor,ONPUSH_CONSTRUCTOR_INPUTS} from '../scripts/table-onpush-constructor-requalification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=inspectOnPushConstructor({root}),inputs=JSON.parse(read(ONPUSH_CONSTRUCTOR_INPUTS));
assert.equal(result.context.reviewed_table_source_members,14);assert.equal(result.documents.length,3);
assert.deepEqual(result.real_runtime_admission,{ok:false,detail:'missing coordinator run'});
const guard='scripts/upstream-artifact-behavior-evidence.mjs',table='projects/ngx-material-legacy/legacy-table/table.ts';
const member="  'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',\n";
const controls=[];
for(const [id,path,change,expected]of [
 ['input-capsule',ONPUSH_CONSTRUCTOR_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/OnPush inputs changed/],
 ['retained-context',inputs.prior_contexts.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/prior artifact context changed/],
 ['omitted-helper-requirement',guard,bytes=>Buffer.from(bytes.toString().replace(member,'')),/helper source requirement absent/],
 ['changed-runtime-admission',guard,bytes=>Buffer.from(bytes.toString().replace('demand(runtime.ok, runtime.detail);','demand(true, runtime.detail);')),/shared admission changed outside/],
 ['changed-helper',inputs.helper.path,bytes=>Buffer.from(bytes.toString().replace('token === CDK_VIRTUAL_SCROLL_VIEWPORT','true')),/tested helper changed/],
 ['changed-table-rendering',table,bytes=>Buffer.from(bytes.toString().replace('return super.fixedLayout;','return true;')),/table rendering\/source changed/],
 ['changed-constructor-evidence',inputs.evidence[0].path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/constructor evidence changed/],
 ['changed-minimum-no-data-mark','compatibility/rc/table-public-module-sources/cdk-21.2.14-table.mjs',bytes=>Buffer.from(bytes.toString().replace('this._isShowingNoDataRow = shouldShow;\n    this._changeDetectorRef.markForCheck();','this._isShowingNoDataRow = shouldShow;\n    this._changeDetectorRef.noop();')),/minimum no-data mark changed/],
 ['changed-original-patch','compatibility/rc/table-onpush-original.patch',bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/original OnPush patch changed/],
 ['unrelated-row-source','projects/ngx-material-legacy/legacy-table/row.ts',bytes=>Buffer.concat([bytes,Buffer.from('\n// unreviewed source\n')]),/unrelated reviewed source changed/],
 ['forged-live-source-pass','compatibility/f10/disposition-ledger/evidence/closeout-table-onpush-source-judgment.json',bytes=>{const x=JSON.parse(bytes);x.semantic_pass=true;return Buffer.from(JSON.stringify(x));},/live artifact judgment changed/],
]){
 const before=read(path),after=change(before);assert.notDeepEqual(before,after,id+': mutation did not apply');
 assert.throws(()=>inspectOnPushConstructor({root,readMember:p=>p===path?after:read(p)}),expected,id+': mutation escaped');
 controls.push({id,rejected:true});
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schema_version:1,line:result.line,table_required_source_members:14,negative_controls:controls,
 complete_shared_runtime_guard_recovered:true,minimum_renderer_modules:result.context.minimum_renderer_modules,
 actual_current_runtime_admission:result.real_runtime_admission,actual_packed_or_native_executed:false,
 producer_sha256:hash(read('tests/table_onpush_constructor_requalification_probe.mjs')),
 checker_sha256:hash(read('scripts/table-onpush-constructor-requalification.mjs')),semantic_pass:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,source_members:14,negative_controls:controls.length,runtime_gate:result.real_runtime_admission.detail,semantic_pass:false}));
