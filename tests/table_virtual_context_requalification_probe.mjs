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
import {inspectTableViewportRequalification,TABLE_VIEWPORT_INPUTS} from '../scripts/table-virtual-context-requalification.mjs';
import {reviewClassDecoratorUses} from '../scripts/class-decorator-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=await inspectTableViewportRequalification({root}),inputs=JSON.parse(read(TABLE_VIEWPORT_INPUTS));
assert.equal(result.roles.length,9);assert.equal(result.helper_uses_open.length,7);
assert.equal(result.historical_after.rows.length,57);assert.equal(result.g11_claim,'not-passed');
assert.equal(result.fresh_domain_role_counts.selected_current_class_decorators,2);
const controls=[];
const table='projects/ngx-material-legacy/legacy-table/table.ts';
const helper='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts';
for(const [id,path,change,expected]of [
 ['input-capsule',TABLE_VIEWPORT_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/table inputs changed/],
 ['captured-table',inputs.preimage.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/preimage archive changed/],
 ['captured-enum-cohort',inputs.enum_cohort.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/preimage archive changed/],
 ['historical-reference','compatibility/handoff/codex-closeout/reference/historical-paths.csv',bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/historical reference changed/],
 ['lost-boundary',table,bytes=>Buffer.from(bytes.toString().replace('@preserveLegacyTableViewport\n','')),/changed table source/],
 ['lost-guard',table,bytes=>Buffer.from(bytes.toString().replace('assertInInjectionContext(MatLegacyTable);','')),/changed table source/],
 ['changed-layout-class',table,bytes=>Buffer.from(bytes.toString().replace('mat-table-fixed-layout','foreign-layout')),/changed table source/],
 ['returned-outlet-import',table,bytes=>Buffer.concat([bytes,Buffer.from("\nimport {HeaderRowOutlet} from '@angular/cdk/table';\n")]),/changed table source/],
 ['changed-construction-helper',helper,bytes=>Buffer.from(bytes.toString().replace('token === CDK_VIRTUAL_SCROLL_VIEWPORT','true')),/changed tested constructor helper/],
 ['changed-repair-diagnostic','compatibility/rc/table-virtual-context-source-proof.json',bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/retained diagnostic changed/],
 ['changed-prior-review',inputs.prior_reviews[0].source_review.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/prior review changed/],
]){
 const before=read(path),after=change(before);assert.notDeepEqual(after,before,id+': mutation did not apply');
 await assert.rejects(inspectTableViewportRequalification({root,readMember:p=>p===path?after:read(p)}),expected,id+': mutation escaped');
 controls.push({id,rejected:true});
}
for(const [id,sourceFiles]of [['empty',[]],['duplicate',['legacy-table/table.ts','legacy-table/table.ts']],['unreviewed',['legacy-table/internal/column-classes.ts']]]){
 await assert.rejects(reviewClassDecoratorUses({root,skipDiagnostics:true,sourceFiles}),/metadata selection/,id+': source selection escaped');
 controls.push({id:'metadata-selection-'+id,rejected:true});
}
// A selected table proof must not silently admit the two later added files to
// the unchanged full class-decorator profile.
await assert.rejects(reviewClassDecoratorUses({root,skipDiagnostics:true}),/132 !== 130/);
controls.push({id:'full-metadata-population-guard-retained',rejected:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schema_version:1,line:result.line,requalified_roles:result.roles.length,new_helper_uses_left_open:result.helper_uses_open.length,
 explicit_current_class_selection:2,table_enum_roles:2,table_guard_roles:1,negative_controls:controls,
 producer_sha256:hash(read('tests/table_virtual_context_requalification_probe.mjs')),
 limits:result.scope,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,roles:9,helper_uses_open:7,negative_controls:controls.length,native_or_packed_qualified:false}));
