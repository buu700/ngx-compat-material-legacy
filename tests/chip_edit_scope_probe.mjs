/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source counterexamples only; no rendered, browser, packed or floor credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {CHIP_EDIT_ORIGINALS,analyzeChipEditOriginals,readChipEditPrior,chipEditSourceContext,normalizedClassicChipStyles} from '../scripts/upstream-chip-edit-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex');
const paths=candidateProductSourcePaths(process.cwd()).sort(),subjects=analyzeChipEditOriginals(read),context=chipEditSourceContext(read,paths);
assert.deepEqual(subjects.map(s=>[s.paths.length,s.hunks,s.existing_blob_occurrences,s.absent_preimages]),[[3,8,6,0],[19,56,37,1],[1,1,2,0]]);
assert.equal(context.authored_TS_and_resource_members.length,paths.length);
assert.equal(context.authored_row_or_editing_surfaces,0);
assert.equal(context.classic_structural_Sass_equal_after_module_source_normalization,true);
assert.ok(context.historical_Material16_MDC_style_members.length>0);
for(const m of context.historical_Material16_MDC_style_members){assert.equal(m.sha256,hash(read(m.path)));assert.deepEqual(context.authored_TS_and_resource_members.find(x=>x.path===m.path),m);}
const synthetic='projects/ngx-material-legacy/legacy-chips/internal/edit-boundary-control.ts';
const candidates=[
 ['named-peer-import',"import {MatChipEdit} from '@angular/material/chips';"],
 ['alias-peer-import',"import {MatChipRow as OtherRow} from '@angular/material/chips';"],
 ['root-barrel-export',"export * from '@angular/material';"],
 ['type-import',"type Other = import('@angular/material/chips').MatChipRow;"],
 ['dynamic-import',"const other = import('@angular/material/chips');"],
 ['unknown-module',"const other = import(chipModule);"],
 ['local-edit-directive',"@Directive({selector:'[matChipEdit]'}) class OwnedEdit {}"],
 ['local-edit-token',"const MAT_LEGACY_CHIP_EDIT = {};"],
 ['local-edit-harness',"class MatLegacyChipEditHarness {}"],
 ['local-edit-filter',"interface ChipEditHarnessFilters {}"],
 ['row-selector',"@Directive({selector:'mat-basic-chip-row'}) class OwnedRow {}"],
 ['editable-contract',"class OtherChip { editable = true; }"],
 ['edited-contract',"class OtherChip { edited: unknown; }"],
 ['edit-action',"class OtherChip { _edit() {} }"],
 ['pending-timer-state',"class OtherChip { _editStartPending = false; }"],
 ['focus-to-edit-state',"class OtherChip { _alreadyFocused = false; }"],
 ['harness-contract-spelling',"class OtherChip { geEditButton() {} }"],
 ['inline-leading-cell',"const template = `<div class=\"mdc-evolution-chip__cell--leading\"></div>`;"],
 ['inline-secondary-action',"const styles = `.mdc-evolution-chip__action--secondary {padding:0}`;"],
];
const cases=[];
for(const [id,text] of candidates){assert.ok(!paths.includes(synthetic));assert.throws(()=>chipEditSourceContext(p=>p===synthetic?Buffer.from(text):read(p),[...paths,synthetic].sort()),undefined,id);cases.push({id,result:'rejected'});}
const resources=[
 ['HTML-edit-directive','legacy-chips/edit-control.html','<button matChipEdit></button>'],
 ['HTML-row','legacy-chips/edit-control.html','<mat-chip-row></mat-chip-row>'],
 ['HTML-MDC-cell','legacy-chips/edit-control.html','<div class="mdc-evolution-chip__cell"></div>'],
 ['CSS-edit-class','legacy-chips/edit-control.css','.mat-mdc-chip-edit {display:block}'],
 ['SCSS-leading-state','legacy-chips/edit-control.scss','.mdc-evolution-chip--with-leading-action {padding:0}'],
 ['facade-leading-state','styles/chips/_edit-control.scss','.mdc-evolution-chip--with-leading-action {padding:0}'],
 ['facade-secondary-action','styles/chips/_edit-control.scss','.mdc-evolution-chip__action--secondary {padding:0}'],
 ['Sass-peer-route','styles/chips/_edit-control.scss',"@use '@angular/material/chips';"],
];
for(const [id,relative,text] of resources){const path='projects/ngx-material-legacy/'+relative;assert.ok(!paths.includes(path));assert.throws(()=>chipEditSourceContext(p=>p===path?Buffer.from(text):read(p),[...paths,path].sort()),undefined,id);cases.push({id,result:'rejected'});}
const chip='projects/ngx-material-legacy/legacy-chips/chip.ts',sass='projects/ngx-material-legacy/legacy-chips/chips.scss';
for(const [id,path,mutate] of [
 ['classic-click-change',chip,s=>s.replace('if (this.disabled) {','if (this.removable) {')],
 ['classic-remove-change',chip,s=>s.replace('this.removed.emit({chip: this});','this.removed.emit({chip: this}); this.focus();')],
 ['classic-padding-change',sass,s=>s.replace('$chip-vertical-padding: 7px;','$chip-vertical-padding: 8px;')],
 ['classic-Sass-namespace-change',sass,s=>s.replace('as cdk;','as changedCdk;')],
]){const old=read(path).toString(),changed=mutate(old);assert.notEqual(changed,old,id);assert.throws(()=>chipEditSourceContext(p=>p===path?Buffer.from(changed):read(p),paths),undefined,id);cases.push({id,result:'rejected'});}
// Verify the independent full-body normalization, beyond the owned source-epoch seal.
const style=read(sass).toString(),normal=normalizedClassicChipStyles(style);
assert.equal(normalizedClassicChipStyles(style.replace('as cdk;','as changedCdk;')).normalized===normal.normalized,false);
assert.equal(normalizedClassicChipStyles(style.replace('$chip-vertical-padding: 7px;','$chip-vertical-padding: 8px;')).normalized===normal.normalized,false);
const sourceOnly=style.replace(/@use ['"][^'"]+['"] as cdk;/,"@use 'another/module' as cdk;");assert.notEqual(sourceOnly,style);assert.equal(normalizedClassicChipStyles(sourceOnly).normalized,normal.normalized);
// Comments are not newly executable surfaces, but their source identities still change.
const commentPath='projects/ngx-material-legacy/legacy-chips/edit-documentation.html',comment='<!-- matChipEdit mdc-evolution-chip__action--secondary -->';
const prose=chipEditSourceContext(p=>p===commentPath?Buffer.from(comment):read(p),[...paths,commentPath].sort());assert.equal(prose.authored_row_or_editing_surfaces,0);assert.ok(prose.authored_TS_and_resource_members.some(m=>m.path===commentPath&&m.sha256===hash(comment)));
const archives=[CHIP_EDIT_ORIGINALS,'compatibility/rc/chip-edit-scope-prior.json.gz'];let archiveControls=0;
for(const path of archives){for(const bytes of [Buffer.from('not gzip'),Buffer.concat([read(path),Buffer.from('changed')])]){const altered=p=>p===path?bytes:read(p);assert.throws(()=>path===CHIP_EDIT_ORIGINALS?analyzeChipEditOriginals(altered):readChipEditPrior(altered,context.line));archiveControls++;}}
for(const path of [context.tagged_chip.path,context.tagged_structural_styles.path]){assert.throws(()=>chipEditSourceContext(p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p),paths));archiveControls++;}
assert.throws(()=>chipEditSourceContext(read,[...paths,paths[0]].sort()));archiveControls++;
assert.throws(()=>chipEditSourceContext(read,[...paths].reverse()));archiveControls++;
const report={schema_version:1,line:context.line,scope:'Whole original-source and current authored applicability only. No rendered CSS, browser, packed or floor observation.',compiler:createRequire(import.meta.url)('typescript').version,node:process.version,subjects,context,cases,semantic_mutation_controls:cases.length,independent_Sass_normalization_controls:3,comment_identity_control:1,archive_reference_and_membership_controls:archiveControls,source_dispositions_or_role_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:context.line,subjects:subjects.length,path_occurrences:23,hunks:65,existing_blob_occurrences:45,absent_preimages:1,typescript_members:context.modern_type_boundary.production_and_test_typescript_members.length,TS_and_resource_members:paths.length,historical_MDC_facade_members:context.historical_Material16_MDC_style_members.length,semantic_mutation_controls:cases.length,independent_Sass_normalization_controls:3,comment_identity_control:1,archive_reference_and_membership_controls:archiveControls,actual_native_packed_or_floor_qualified:false}));
