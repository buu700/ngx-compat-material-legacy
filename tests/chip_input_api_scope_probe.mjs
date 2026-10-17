/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Source and method protocols only. No Angular view, native, packed or floor qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {reviewKeycodeUses} from '../scripts/keycode-use-review.mjs';
import {CHIP_INPUT_API_ORIGINALS,analyzeChipInputApiOriginals,chipInputApiSourceContext,readChipInputApiOriginals,readChipInputApiPrior,replayChipInputSeparator,replayChipInputList} from '../scripts/upstream-chip-input-api-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const require=createRequire(import.meta.url),{merge,Subject}=require('rxjs'),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),paths=candidateProductSourcePaths(process.cwd()).sort();
const subjects=analyzeChipInputApiOriginals(read),context=chipInputApiSourceContext(read,paths),prior=readChipInputApiPrior(read,context.line);
assert.deepEqual(subjects.map(s=>[s.paths.length,s.hunks,s.existing_blob_occurrences]),[[3,4,6],[5,18,10],[4,10,8]]);
assert.equal(context.input_class_members,29);assert.equal(context.legacy_list_members_matching_tag.length,11);assert.equal(context.legacy_stream,'chipRemoveChanges merges chip.destroyed');
const chipInput='projects/ngx-material-legacy/legacy-chips/chip-input.ts',chipList='projects/ngx-material-legacy/legacy-chips/chip-list.ts',defaults='projects/ngx-material-legacy/legacy-chips/chip-default-options.ts';
const mutations=[
 ['aliased-current-input',chipInput,s=>"import {MatChipInput as OtherInput} from '@angular/material/chips';\n"+s],
 ['root-current-barrel',chipInput,s=>s+"\nexport * from '@angular/material';\n"],
 ['dynamic-current-chips',chipInput,s=>s+"\nconst x=import('@angular/material/chips');\n"],
 ['type-current-grid',chipInput,s=>s+"\ntype X=import('@angular/material/chips').MatChipGrid;\n"],
 ['broadened-input-option',chipInput,s=>s.replace('readonly number[] | ReadonlySet<number>','readonly (number | object)[] | ReadonlySet<number>')],
 ['separator-modifiers-enabled',chipInput,s=>s.replace('!hasModifierKey(event) && ','')],
 ['wrong-separator-key',chipInput,s=>s.replace('.has(event.keyCode)','.has(13)')],
 ['removed-grid-association',chipInput,s=>s.replace('this._chipList.registerInput(this);','')],
 ['input-chipGrid-getter',chipInput,s=>s.replace('  _chipList: MatLegacyChipList;','  _chipList: MatLegacyChipList;\n  get chipGrid() { return this._chipList; }')],
 ['default-options-broadened',defaults,s=>s.replace('readonly number[] | ReadonlySet<number>','readonly (number | object)[] | ReadonlySet<number>')],
 ['default-options-mirror',defaults,s=>s.replace('  separatorKeyCodes:','  inputDisabledInteractive: boolean;\n  separatorKeyCodes:')],
 ['destroyed-switched-to-removed',chipList,s=>s.replace('return merge(...this.chips.map(chip => chip.destroyed));','return merge(...this.chips.map(chip => chip.removed));')],
 ['input-required-id',chipList,s=>s.replace('return this._chipInput ? this._chipInput.id : this._uid;','return this._chipInput.id;')],
 ['empty-placeholder-fallback',chipList,s=>s.replace('return this._chipInput ? this._chipInput.placeholder : this._placeholder;','return this._chipInput?.placeholder || this._placeholder;')],
 ['host-description-removed',chipList,s=>s.replace("this._elementRef.nativeElement.setAttribute('data-mat-chip-input', inputElement.id);","this._elementRef.nativeElement.removeAttribute('aria-describedby');")],
 ['private-current-ID-generator',chipList,s=>"import {_IdGenerator} from '@angular/cdk/a11y';\n"+s],
];
const controls=[];
for(const [id,path,mutate]of mutations){const old=read(path).toString(),text=mutate(old);assert.notEqual(text,old,id);assert.throws(()=>chipInputApiSourceContext(p=>p===path?Buffer.from(text):read(p),paths),undefined,id);controls.push({id,result:'rejected'});}
const extra='projects/ngx-material-legacy/legacy-chips/internal/added-api.ts';
for(const [id,text]of [['new-separator-type','interface SeparatorKey {keyCode:number;modifiers:string[];}'],['new-grid-getter','class Other {get chipGrid(){return null;}}'],['new-removed-request-stream','class Other {get chipRemovedChanges(){return null;}}']]){assert.throws(()=>chipInputApiSourceContext(p=>p===extra?Buffer.from(text):read(p),[...paths,extra].sort()),undefined,id);controls.push({id,result:'rejected'});}
let integrity=0;
for(const path of [CHIP_INPUT_API_ORIGINALS,'compatibility/rc/chip-input-api-scope-prior.json.gz',...context.tagged_references.map(m=>m.path)]){const altered=p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p);assert.throws(()=>path===CHIP_INPUT_API_ORIGINALS?analyzeChipInputApiOriginals(altered):chipInputApiSourceContext(altered,paths));integrity++;}
assert.throws(()=>chipInputApiSourceContext(read,[...paths,paths[0]].sort()));integrity++;
assert.throws(()=>chipInputApiSourceContext(read,[...paths].reverse()));integrity++;
// The old/tagged helper and both advertised minimum public keycode helpers are
// authenticated by the unchanged keycode reviewer before their public imports.
const dependency=await reviewKeycodeUses({root:process.cwd()}),models=[];
for(const subject of dependency.subjects)models.push({subject,runtime:await import(pathToFileURL(join(subject.runtime_root,subject.public_entry)).href)});
const tagInput=read(context.tagged_references[0].path).toString(),candidate=read(chipInput).toString(),originalModel=models.find(m=>m.subject.line==='original');
function separatorCases(source,helper){
 const Replay=replayChipInputSeparator(source)(helper),receiver=new Replay(),out=[];
 for(const [name,config]of [['array-comma',[188]],['set-comma',new Set([188])],['array-empty',[]],['set-empty',new Set()],['array-mixed',[13,188,188]],['set-mixed',new Set([13,188])]])for(const keyCode of [188,13,65])for(let mask=0;mask<16;mask++){
  receiver.separatorKeyCodes=config;const reads=[],event={keyCode};for(const [i,name]of ['altKey','shiftKey','ctrlKey','metaKey'].entries())Object.defineProperty(event,name,{get(){reads.push(name);return !!(mask&(1<<i));}});
  const value=receiver._isSeparatorKey(event);assert.equal(typeof value,'boolean');out.push({name,keyCode,mask,value,reads});
 }return out;
}
const baseline=separatorCases(tagInput,originalModel.runtime.hasModifierKey),observations=[],behaviorMutations=[];
assert.equal(baseline.length,288);
const changedSources=[['ignore-modifiers',candidate.replace('!hasModifierKey(event) && ','')],['invert-modifiers',candidate.replace('!hasModifierKey(event)','hasModifierKey(event)')],['wrong-key',candidate.replace('.has(event.keyCode)','.has(13)')]];
const feature=readChipInputApiOriginals(read).subjects[2].members.find(m=>m.path==='src/material/chips/chip-input.ts').after.text;
for(const {subject,runtime}of models){
 const actual=separatorCases(candidate,runtime.hasModifierKey);assert.deepEqual(actual,baseline,subject.line);for(const [id,text]of changedSources){assert.notEqual(text,candidate);assert.throws(()=>assert.deepEqual(separatorCases(text,runtime.hasModifierKey),baseline),undefined,id);behaviorMutations.push({line:subject.line,id,rejected:true});}
 const Modern=replayChipInputSeparator(feature,{modern:true})(runtime.hasModifierKey),modern=new Modern();modern.separatorKeyCodes=[{keyCode:188,modifiers:['ctrlKey']}];assert.equal(modern._isSeparatorKey({keyCode:188,ctrlKey:true}),true);assert.equal(modern._isSeparatorKey({keyCode:188,ctrlKey:true,shiftKey:true}),true);
 observations.push({line:subject.line,cdk:subject.version,public_entry:subject.public_entry,authenticated_members:subject.members,cases:actual.length,trace_sha256:hash(JSON.stringify(actual)),modern_feature_ctrl_plus_shift_accepted:true,scope:'Pure extracted method and public helper protocol; no Angular or runtime floor credit.'});
}
const tagList=read(context.tagged_references[1].path).toString();
function listCases(source){
 const Replay=replayChipInputList(source,merge),snapshots=[];
 for(const d of [{name:'no-input-empty',chips:[]},{name:'no-input-chips',chips:[{}]},{name:'no-input-chip-focused',chips:[{}],chipFocus:true},{name:'input-empty',chips:[],input:{id:'input-id',placeholder:'',focused:false,empty:true}},{name:'input-focused',chips:[],input:{id:'input-id',placeholder:'input hint',focused:true,empty:true}},{name:'input-populated',chips:[],input:{id:'input-id',placeholder:'input hint',focused:false,empty:false}}]){
  const r=Object.assign(new Replay(),{_uid:'legacy-id',_placeholder:'list hint',chips:d.chips,_chipInput:d.input,_hasFocusedChip:()=>!!d.chipFocus});snapshots.push({name:d.name,id:r.id,placeholder:r.placeholder,focused:r.focused,empty:r.empty});
 }
 const a={destroyed:new Subject(),removed:new Subject()},b={destroyed:new Subject(),removed:new Subject()},r=Object.assign(new Replay(),{chips:[a,b]}),events=[],subscription=r.chipRemoveChanges.subscribe(value=>events.push(value));
 try{a.removed.next('request-a');a.destroyed.next('destroy-a');b.removed.next('request-b');b.destroyed.next('destroy-b');}finally{subscription.unsubscribe();for(const c of [a,b]){c.destroyed.complete();c.removed.complete();}}
 const attributes=new Map([['aria-describedby','existing-hint']]),element={setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k)},calls=[];r._elementRef={nativeElement:element};r.registerInput({id:'registered-input',setDescribedByIds:ids=>calls.push(ids)});const afterRegistration={attributes:[...attributes],forwarded:calls};r.setDescribedByIds(['first','second']);const populated=attributes.get('aria-describedby');r.setDescribedByIds([]);
 return {snapshots,stream_events:events,afterRegistration,populated,description_removed:!attributes.has('aria-describedby')};
}
const listBaseline=listCases(tagList),listActual=listCases(read(chipList).toString());assert.deepEqual(listActual,listBaseline);assert.deepEqual(listBaseline.stream_events,['destroy-a','destroy-b']);assert.equal(listBaseline.snapshots[0].id,'legacy-id');assert.equal(listBaseline.snapshots[0].empty,true);assert.equal(listBaseline.snapshots[3].placeholder,'');assert.deepEqual(listBaseline.afterRegistration.attributes,[['aria-describedby','existing-hint'],['data-mat-chip-input','registered-input']]);assert.deepEqual(listBaseline.afterRegistration.forwarded,[]);
const listMutants=[['switch-stream-to-removed',s=>s.replace('return merge(...this.chips.map(chip => chip.destroyed));','return merge(...this.chips.map(chip => chip.removed));')],['require-input-id',s=>s.replace('return this._chipInput ? this._chipInput.id : this._uid;','return this._chipInput.id;')],['fallback-on-empty-input-placeholder',s=>s.replace('return this._chipInput ? this._chipInput.placeholder : this._placeholder;','return this._chipInput?.placeholder || this._placeholder;')]];
for(const [id,mutate]of listMutants){const text=mutate(read(chipList).toString());assert.notEqual(text,read(chipList).toString());assert.throws(()=>assert.deepEqual(listCases(text),listBaseline),undefined,id);behaviorMutations.push({line:'owned-list-protocol',id,rejected:true});}
const report={schema_version:1,line:context.line,node:process.version,compiler:ts.version,subjects,context,source_controls:controls,source_semantic_mutation_controls:controls.length,archive_reference_and_membership_controls:integrity,keycode_dependency_subjects:dependency.subjects,keycode_dependency_behaviors:dependency.behaviors,keycode_authored_uses:dependency.uses,separator_observations:observations,separator_cases_per_model:288,separator_models:3,separator_model_cases:864,list_protocol:listActual,list_protocol_states:6,stream_and_registration_protocols:2,behavior_mutations:behaviorMutations,behavior_mutation_controls:behaviorMutations.length,source_dispositions_or_role_closures:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:context.line,subjects:3,path_occurrences:12,original_hunks:32,existing_blob_occurrences:24,input_class_members:29,list_tagged_members:11,source_semantic_mutation_controls:controls.length,archive_reference_and_membership_controls:integrity,separator_models:3,separator_model_cases:864,list_protocol_states:6,stream_and_registration_protocols:2,behavior_mutation_controls:behaviorMutations.length,actual_native_packed_or_floor_qualified:false}));
