/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine pure public helpers and exact source-method replay; no whole component. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {autocompleteClassSubjects,reviewAutocompleteClassTransfer} from '../scripts/autocomplete-class-transfer-use-review.mjs';
const root=resolve('.'),read=path=>readFileSync(join(root,path),'utf8'),subjects=await autocompleteClassSubjects(root);
try {
const report=await reviewAutocompleteClassTransfer({root,subjects});
assert.equal(report.source_override_used,false);assert.equal(report.runtime_override_used,false);
assert.equal(report.contracts.length,3);assert.equal(report.case.references.length,1);
assert.ok(report.behaviors.every(row=>row.cases===30));assert.ok(report.delegations.every(row=>row.cases===64&&row.complete_methods===3));
const original=subjects.models.find(m=>m.line==='original').runtime.coerceStringArray;
let negatives=0;
for(const [id,replacement] of [
  ['empty-placeholder',()=>['']],
  ['split-array-entries',value=>value==null?[]:String(value).trim().split(/\s+/).filter(Boolean)],
  ['return-caller-array',value=>Array.isArray(value)?value:original(value)],
  ['deduplicate',value=>[...new Set(original(value))]],
  ['String-symbol-conversion',value=>value==null?[]:String(value).split(/\s+/).filter(Boolean)],
  ['wrong-primitive-hint',value=>value==null?[]:Array.isArray(value)?original(value):(value+'').split(/\s+/).filter(Boolean)],
]) {
  await assert.rejects(()=>reviewAutocompleteClassTransfer({root,subjects,runtimeOverrides:{[report.line]:replacement}}),undefined,id);negatives++;
}
const path='projects/ngx-material-legacy/'+report.case.file,text=read(path);
for(const [id,changed] of [
  ['unsupported-separator',text.replace('coerceStringArray(value)','coerceStringArray(value, ",")')],
  ['non-call-alias',text+'\nconst leakedClassCoercion=coerceStringArray;\n'],
  ['host-class-not-cleared',text.replace("this._elementRef.nativeElement.className = '';","this._elementRef.nativeElement.className = 'wrong';")],
  ['class-value-disabled',text.replace('classList[className] = true;','classList[className] = false;')],
  ['visibility-flipped',text.replace('classList[this._visibleClass] = this.showPanel;','classList[this._visibleClass] = !this.showPanel;')],
  ['theme-color-remapped',text.replace("classList['mat-primary'] = this._color === 'primary';","classList['mat-primary'] = this._color === 'accent';")],
  ['duplicate-public-import',text+"\nimport {coerceStringArray as otherClassArray} from '@angular/cdk/coercion';\n"],
]) {
  assert.notEqual(changed,text,id);
  await assert.rejects(()=>reviewAutocompleteClassTransfer({root,subjects,readSource:p=>p===path?changed:read(p)}),undefined,id);negatives++;
}
const renamed=text.replace('coerceBooleanProperty, coerceStringArray','coerceBooleanProperty, coerceStringArray as classArray').replaceAll('coerceStringArray(value)','classArray(value)');
assert.notEqual(renamed,text);
const alias=await reviewAutocompleteClassTransfer({root,subjects,readSource:p=>p===path?renamed:read(p)});
assert.equal(alias.case.local_name,'classArray');assert.ok(alias.delegations.every(row=>row.cases===64));assert.equal(negatives,13);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({...report,negative_controls_rejected:negatives,alias_positive:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:report.line,frozen_uses:1,subjects:3,helper_cases_per_subject:30,class_transfer_cases_per_subject:64,
  negative_controls:negatives,alias_positive:true,whole_component_or_native_or_packed_executed:false,g11_claim:'not-passed'}));
} finally {subjects.dispose();}
