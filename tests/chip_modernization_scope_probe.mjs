/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authenticated source and extracted protocols; no Angular/native/floor credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {reviewPureCoercionUses} from '../scripts/coercion-pure-use-review.mjs';
import {CHIP_MODERNIZATION_ORIGINALS,analyzeChipModernizationOriginals,chipModernizationSourceContext,replayModernizationSetters,replayModernizationID} from '../scripts/upstream-chip-modernization-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=p=>readFileSync(p),hash=b=>createHash('sha256').update(b).digest('hex'),require=createRequire(import.meta.url),paths=candidateProductSourcePaths(process.cwd()).sort();
const subjects=analyzeChipModernizationOriginals(read),context=chipModernizationSourceContext(read,paths);
assert.deepEqual(subjects.map(r=>[r.paths.length,r.hunks,r.existing_blob_occurrences]),[[10,61,20],[29,66,58],[2,6,4]]);assert.equal(subjects[0].detail.transforms.length,19);assert.equal(subjects[1].detail.specs.test_callbacks,256);assert.equal(subjects[1].detail.specs.changed_callbacks,2);assert.equal(subjects[1].detail.specs.added_flush_calls,7);assert.equal(context.legacy_metadata.length,6);assert.equal(context.manual_boolean_setters.length,8);
const chip='projects/ngx-material-legacy/legacy-chips/chip.ts',input='projects/ngx-material-legacy/legacy-chips/chip-input.ts',list='projects/ngx-material-legacy/legacy-chips/chip-list.ts',modulePath='projects/ngx-material-legacy/legacy-chips/chips-module.ts',token='projects/ngx-material-legacy/legacy-chips/chip-default-options.ts';
const mutations=[
 ['current-chip-namespace-import',chip,s=>"import * as CurrentChip from '@angular/material/chips';\n"+s],
 ['current-root-export',chip,s=>s+"\nexport * from '@angular/material';\n"],
 ['modern-current-base',chip,s=>s.replace('extends _MatChipMixinBase','extends MatChip')],
 ['standalone-true',input,s=>s.replace('standalone: false','standalone: true')],
 ['standalone-implicit-modern-default',input,s=>s.replace('  standalone: false,\n','')],
 ['manual-input-coercion-removed',input,s=>s.replace('this._addOnBlur = coerceBooleanProperty(value);','this._addOnBlur = value;')],
 ['manual-chip-coercion-removed',chip,s=>s.replace('this._removable = coerceBooleanProperty(value);','this._removable = value;')],
 ['manual-list-coercion-removed',list,s=>s.replace('this._multiple = coerceBooleanProperty(value);','this._multiple = value;')],
 ['booleanAttribute-mirror',input,s=>s.replace("import {BACKSPACE, hasModifierKey, TAB}","import {booleanAttribute} from '@angular/core';\nimport {BACKSPACE, hasModifierKey, TAB}")],
 ['private-ID-generator-import',input,s=>"import {_IdGenerator} from '@angular/cdk/a11y';\n"+s],
 ['private-ID-generator-initializer',input,s=>s.replace('`mat-chip-list-input-${nextUniqueId++}`',"inject(_IdGenerator).getId('mat-mdc-chip-list-input-')")],
 ['modern-ID-prefix',input,s=>s.replace('mat-chip-list-input-${','mat-mdc-chip-list-input-${')],
 ['modern-bare-chip-ID-API',chip,s=>s.replace('  _hasFocus: boolean = false;','  @Input() id = "modern";\n  _hasFocus: boolean = false;')],
 ['host-tabindex-semantic-change',chip,s=>s.replace('disabled ? null : tabIndex','disabled ? -1 : tabIndex')],
 ['host-class-semantic-change',chip,s=>s.replace("'class': 'mat-chip mat-focus-indicator'","'class': 'mat-mdc-chip mat-focus-indicator'")],
 ['arbitrary-style-route',list,s=>s.replace("styleUrls: ['chips.scss']","styleUrls: ['other.scss']")],
 ['module-standalone-imports',modulePath,s=>s.replace('  declarations: CHIP_DECLARATIONS,','  imports: CHIP_DECLARATIONS,')],
 ['removed-module-token-provider',modulePath,s=>s.replace('provide: MAT_LEGACY_CHIPS_DEFAULT_OPTIONS','provide: OTHER_CHIPS_OPTIONS')],
 ['root-token-factory',token,s=>s.replace("  'mat-chips-default-options',","  'mat-chips-default-options', {providedIn: 'root', factory: () => ({separatorKeyCodes: []})},")],
];
const controls=[];
for(const [id,path,mutate]of mutations){const before=read(path).toString(),after=mutate(before);assert.notEqual(after,before,id);assert.throws(()=>chipModernizationSourceContext(p=>p===path?Buffer.from(after):read(p),paths),undefined,id);controls.push({id,result:'rejected'});}
let integrity=0;
for(const path of [CHIP_MODERNIZATION_ORIGINALS,'compatibility/rc/chip-modernization-scope-prior.json.gz',...context.tagged_references.map(r=>r.path)]){const changed=p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p);assert.throws(()=>path===CHIP_MODERNIZATION_ORIGINALS?analyzeChipModernizationOriginals(changed):chipModernizationSourceContext(changed,paths));integrity++;}
assert.throws(()=>chipModernizationSourceContext(read,[...paths,paths[0]].sort()));integrity++;
assert.throws(()=>chipModernizationSourceContext(read,[...paths].reverse()));integrity++;
const dependency=await reviewPureCoercionUses({root:process.cwd()}),models=[];
for(const subject of dependency.subjects)models.push({subject,runtime:await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)).href)});
const props=[['chip',chip,'MatLegacyChip',['selected','selectable','disabled','removable']],['input',input,'MatLegacyChipInput',['addOnBlur','disabled']],['list',list,'MatLegacyChipList',['multiple','selectable']]];
const references={chip:context.tagged_references.find(r=>r.path.endsWith('/chip.ts')).path,input:context.tagged_references.find(r=>r.path.endsWith('/chip-input.ts')).path,list:context.tagged_references.find(r=>r.path.endsWith('/chip-list.ts')).path};
const values=[['null',null],['undefined',undefined],['true',true],['false',false],['empty',''],['text-false','false'],['text-False','False'],['text-zero','0']];
function setterCases(sourceFor,helper){const out=[];for(const [key,path,owner,names]of props){const Replay=replayModernizationSetters(sourceFor(key,path),owner,names,helper);for(const name of names)for(const [id,value]of values)for(const parent of [false,true]){
 const r=Object.assign(new Replay(),{syncs:0,selections:0,chipListSelectable:!parent,_chipListDisabled:parent,_chipList:{disabled:parent},_syncChipsState(){this.syncs++;},_dispatchSelectionChange(){this.selections++;}});r[name]=value;out.push({key,name,id,parent,value:r[name],syncs:r.syncs,selections:r.selections});
 }}return out;}
const original=models.find(m=>m.subject.line==='original'),baseline=setterCases(key=>read(references[key]).toString(),original.runtime.coerceBooleanProperty);assert.equal(baseline.length,128); // 8 properties x8 values x2 parent states.
const observations=[],behaviorControls=[],setMutations=[['chip-removable-raw',chip,s=>s.replace('this._removable = coerceBooleanProperty(value);','this._removable = value;')],['input-addOnBlur-raw',input,s=>s.replace('this._addOnBlur = coerceBooleanProperty(value);','this._addOnBlur = value;')],['list-multiple-raw',list,s=>s.replace('this._multiple = coerceBooleanProperty(value);','this._multiple = value;')],['selected-notification-dropped',chip,s=>s.replace('      this._dispatchSelectionChange();','')]];
for(const {subject,runtime}of models){const actual=setterCases((key,path)=>read(path).toString(),runtime.coerceBooleanProperty);assert.deepEqual(actual,baseline,subject.line);for(const [id,path,mutate]of setMutations){const before=read(path).toString(),after=mutate(before);assert.notEqual(after,before,id);assert.throws(()=>assert.deepEqual(setterCases((key,p)=>p===path?after:read(p).toString(),runtime.coerceBooleanProperty),baseline),undefined,id);behaviorControls.push({line:subject.line,id,result:'rejected'});}observations.push({line:subject.line,cdk:subject.version,public_entry:subject.public_entry,cases:actual.length,trace_sha256:hash(JSON.stringify(actual)),scope:'Extracted original and current setters/boolean field initializers with explicit callbacks/parent roles only. No Angular, component constructor or floor qualification.'});}
function idCases(sourceFor){const Input=replayModernizationID(sourceFor('input',input),'MatLegacyChipInput','id'),List=replayModernizationID(sourceFor('list',list),'MatLegacyChipList','_uid'),out=[];for(let i=0;i<3;i++){out.push(new Input().id);out.push(new List()._uid);}return out;}
const idBaseline=idCases(key=>read(references[key]).toString()),idActual=idCases((key,path)=>read(path).toString());assert.deepEqual(idActual,idBaseline);assert.deepEqual(idBaseline,['mat-chip-list-input-0','mat-chip-list-0','mat-chip-list-input-1','mat-chip-list-1','mat-chip-list-input-2','mat-chip-list-2']);
for(const [id,path,mutate]of [['counter-prefix-change',input,s=>s.replace('mat-chip-list-input-${','mat-mdc-chip-list-input-${')],['counter-seed-change',list,s=>s.replace('let nextUniqueId = 0;','let nextUniqueId = 1;')],['counter-increment-dropped',input,s=>s.replace('nextUniqueId++','nextUniqueId')]]){const before=read(path).toString(),after=mutate(before);assert.notEqual(after,before);assert.throws(()=>assert.deepEqual(idCases((key,p)=>p===path?after:read(p).toString()),idBaseline),undefined,id);behaviorControls.push({line:'ID-protocol',id,result:'rejected'});}
const report={schema_version:1,line:context.line,node:process.version,compiler:require('typescript').version,subjects,context,source_controls:controls,source_semantic_mutation_controls:controls.length,archive_reference_and_membership_controls:integrity,coercion_dependency:{subjects:dependency.subjects,behaviors:dependency.behaviors,uses:dependency.uses,limits:dependency.limits},setter_observations:observations,setter_models:3,setter_cases_per_model:128,setter_model_cases:384,ID_protocol:idActual,ID_protocol_observations:6,behavior_controls:behaviorControls,behavior_mutation_controls:behaviorControls.length,source_dispositions_or_role_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:context.line,subjects:3,path_occurrences:41,original_hunks:133,existing_blob_occurrences:82,standalone_original_classes:12,original_test_callbacks:256,original_timing_callbacks:2,original_added_flush_calls:7,tagged_owned_metadata:6,tagged_manual_setters:8,source_semantic_mutation_controls:controls.length,archive_reference_and_membership_controls:integrity,setter_model_cases:384,ID_protocol_observations:6,behavior_mutation_controls:behaviorControls.length,actual_native_packed_or_floor_qualified:false}));
