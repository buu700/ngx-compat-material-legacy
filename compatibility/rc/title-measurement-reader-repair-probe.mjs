/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current source references and original whole-report comparison; no native credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import title from '../../scripts/upstream-dialog-title-admission.cjs';
import {titleMeasurementSourceReferences,titleMeasurementForHistoricalComparison} from '../../scripts/inventory-reference-owner.mjs';
const root=process.cwd(),out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');
assert.ok(out?.startsWith('compatibility/rc/title-measurement-reader-repair-'));assert.equal(existsSync(out),false);
const read=path=>title.titleRead(root,path),scope=JSON.parse(read(title.TITLE_SOURCE_REPORT));
const tools=['scripts/dialog-title-source-context.mjs','scripts/canonical-tool-source-role.mjs'];
const refs=titleMeasurementSourceReferences({root,read,scope});assert.equal(scope.input_members.length,95);assert.equal(refs.length,111);assert.equal(new Set(refs.map(r=>r.path)).size,111);
assert.deepEqual(refs.slice(0,95).map(r=>r.path),scope.input_members.map(r=>r.path));
for(const ref of refs){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
const changed=refs.slice(0,95).filter((r,i)=>r.sha256!==scope.input_members[i].sha256);assert.deepEqual(changed.map(r=>r.path).sort(),[...tools,'testing/legacy-runner/historical-inventory.json','scripts/upstream-dialog-title-native-evidence.mjs'].sort());
const current=structuredClone(scope);current.input_members=structuredClone(refs.slice(0,95));assert.deepEqual(titleMeasurementForHistoricalComparison({root,actual:current,expected:scope}),scope);
const faultControls=[];
const mutations=[['graph',v=>v.graph.source_members[0].sha256='0'.repeat(64)],['lifecycle',v=>v.lifecycle.corrupted_observation=true],['line',v=>v.line='main'],['native-credit',v=>v.actual_native_artifact_browser_floor_or_full_audit_qualified=true],['clearance',v=>v.g11_claim='passed'],['unrelated-tool',v=>v.input_members[0].sha256='0'.repeat(64)]];
for(const path of tools){
 const i=current.input_members.findIndex(r=>r.path===path),prior=scope.input_members[i];
 mutations.push([path+'/old-hash',v=>v.input_members[i].sha256=prior.sha256],[path+'/old-size',v=>v.input_members[i].bytes=prior.bytes],[path+'/unknown-hash',v=>v.input_members[i].sha256='0'.repeat(64)],[path+'/missing',v=>v.input_members.splice(i,1)],[path+'/duplicate',v=>v.input_members.push({...v.input_members[i]})]);
}
for(const[id,edit]of mutations){const bad=structuredClone(current);edit(bad);assert.throws(()=>titleMeasurementForHistoricalComparison({root,actual:bad,expected:scope}),undefined,id);faultControls.push(id);}
for(const path of tools){const prior=scope.input_members.find(r=>r.path===path);assert.throws(()=>titleMeasurementSourceReferences({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p),scope}),undefined,path+'/noncurrent-read');faultControls.push(path+'/noncurrent-read');assert.ok(prior);}
let late=null;const mutable=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
const inspected=title.inspectTitleSource({root,read:mutable});assert.deepEqual(inspected.scope,scope);inspected.assertCurrent();
const sourceFaults=[...tools,'compatibility/rc/historical-contract-repair-reader-inputs.json','scripts/historical-contract-repair-readers.mjs','scripts/historical-contract-repair-source.mjs','scripts/inventory-reference-owner.mjs','projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts','projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts'];
for(const path of sourceFaults){late=path;assert.throws(()=>inspected.assertCurrent(),undefined,'late '+path);assert.throws(()=>title.inspectTitleSource({root,read:mutable}),undefined,'cold '+path);faultControls.push('cold-and-late/'+path);}
late=null;inspected.assertCurrent();assert.deepEqual(JSON.parse(readFileSync(title.TITLE_SOURCE_REPORT)),scope);
const report={schema_version:1,status:'pass',line:'21.x',actual_public_inspectTitleSource_executed:true,original_whole_report_members:95,current_source_reference_members:111,additional_provenance_bindings:16,exact_repaired_tool_references:2,original_graph_members:scope.graph.source_members.length,original_lifecycle_observations:scope.lifecycle.observations.length,original_lifecycle_metadata_fields:Object.keys(scope.lifecycle).length,whole_original_report_reproduced_exactly:true,whole_report_controls_rejected:mutations.length,current_read_controls_rejected:2,cold_source_controls_rejected:sourceFaults.length,late_source_controls_rejected:sourceFaults.length,controls:faultControls,actual_fresh_lifecycle_child_executed:false,actual_full_composed_owner_executed:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',seconds:(performance.now()-start)/1000};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,seconds:report.seconds,source_bindings:inspected.bound.length,controls:mutations.length+2+2*sourceFaults.length}));
