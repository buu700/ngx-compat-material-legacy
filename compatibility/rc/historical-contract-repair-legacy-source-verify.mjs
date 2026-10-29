/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Actual complete current source verifier; no owner/native admission. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {inspectLegacyRemovalSourceReview} from '../../scripts/upstream-legacy-removal-source.mjs';
import {readHistoricalContractRepairMember} from '../../scripts/historical-contract-repair-source.mjs';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>mutations.get(p)??readHistoricalContractRepairMember(root,p),mutations=new Map();
const module='scripts/upstream-legacy-removal-source.mjs',transitionPath='compatibility/rc/historical-contract-repair-legacy-source-transition.json';
const transition=JSON.parse(read(transitionPath));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',transition.source_parent+':'+module],{cwd:root,env,maxBuffer:1024*1024});
assert.equal(hash(before),transition.before.sha256);let derived=before.toString();for(const edit of transition.literal_edits){assert.equal(derived.split(edit.before).length,2);derived=derived.replace(edit.before,edit.after);}
assert.equal(hash(derived),transition.after.sha256);assert.equal(read(module).toString(),derived);
const ledger='compatibility/f10/disposition-ledger/ledger.json',registry='scripts/upstream-source-contract-registry.mjs';
const protectedMembers=[ledger,registry,'compatibility/rc/21x-legacy-removal-source-review.json','compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json','compatibility/rc/21x-legacy-removal-source-qualification.json'].map(path=>({path,sha256:hash(read(path))}));
const started=performance.now(),subject=inspectLegacyRemovalSourceReview({root,read}),controls=[];
assert.equal(subject.report.product_population,1142);assert.equal(subject.qualified_product_reference_successors,4);assert.equal(subject.report.api_name_inventory.length,44);assert.equal(subject.report.legacy_forward_bindings.length,29);
const historical=JSON.parse(read('compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json'));assert.deepEqual(subject.historical_comparison_report,historical);
const original=new Map(historical.current_members.map(ref=>[ref.path,ref]));const changed=subject.report.current_members.filter(ref=>hash(JSON.stringify(ref))!==hash(JSON.stringify(original.get(ref.path))));assert.equal(changed.length,4);
for(const ref of subject.report.current_members){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
function rejects(name,action,pattern){assert.throws(action,pattern);controls.push({name,rejected:true});}
for(const path of ['projects/ngx-material-legacy/legacy-menu/menu.html','compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json']){
 assert.ok(subject.bound.some(ref=>ref.path===path));mutations.set(path,Buffer.concat([readHistoricalContractRepairMember(root,path),Buffer.from('\n/* fake current bytes */\n')]));
 rejects('cold nonphysical unselected input '+path,()=>inspectLegacyRemovalSourceReview({root,read}),/nonphysical legacy review source/);mutations.clear();
}
for(const path of [changed[0].path,'node_modules/@angular/core/package.json',module]){
 assert.ok(subject.bound.some(ref=>ref.path===path));mutations.set(path,Buffer.concat([readHistoricalContractRepairMember(root,path),Buffer.from('\n/* late current bytes */\n')]));
 rejects('late current input '+path,()=>subject.assertCurrent(),/nonphysical legacy review source|late nonphysical historical-repair input/);mutations.clear();
}
subject.assertCurrent();for(const ref of protectedMembers)assert.equal(hash(read(ref.path)),ref.sha256);
const producer='compatibility/rc/historical-contract-repair-legacy-source-verify.mjs';
const report={schema_version:1,line:'21.x',status:'actual complete current legacy-removal source boundary qualified; CJS/tool owner integration pending',facts:subject.facts,current_product_population:subject.report.product_population,current_member_references:subject.report.current_members.length,current_bound_members:subject.bound.length,current_binding_list_sha256:hash(JSON.stringify(subject.bound)),current_reference_successors:changed,historical_comparison_report_unchanged:true,original_API_and_Sass_name_checks:{API_barrels:44,forward_bindings:29},protected_members_unchanged:protectedMembers,controls,controls_rejected:controls.length,transition:{path:transitionPath,sha256:hash(read(transitionPath))},actual_verifier:{path:module,sha256:hash(read(module))},execution:{producer,sha256:hash(read(producer)),seconds:(performance.now()-started)/1000},
 existing_frozen_Python_boundary_tests_not_run_or_requalified:true,CJS_admission_and_owner_reference_integration_complete:false,canonical_admission_ready:false,product_changes:0,canonical_dispositions_changed:0,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/historical-contract-repair-legacy-source-qualified.json';assert.equal(existsSync(join(root,out)),false);writeFileSync(join(root,out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({line:report.line,product:report.current_product_population,references_changed:changed.length,controls_rejected:report.controls_rejected,seconds:report.execution.seconds,CJS_and_owner_integration:false}));
