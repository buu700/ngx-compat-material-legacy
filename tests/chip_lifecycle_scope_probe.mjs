/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Extracted authored protocols only; no Angular fixture or browser is run. */
import assert from 'node:assert/strict';
import {chipLifecycleAdmissionBeforeRead} from './chip_lifecycle_admission_context.mjs';
import {chipFocusBeforeRead} from '../scripts/chip-focus-repair.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {analyzeChipLifecycleOriginals,readChipLifecycleOriginals,chipLifecycleOriginalHunks,chipLifecycleSourceContext,replayChipLifecycle,CHIP_LIFECYCLE_ORIGINALS} from '../scripts/upstream-chip-lifecycle-scope.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const read=chipFocusBeforeRead(chipLifecycleAdmissionBeforeRead(p=>readFileSync(p))),hash=b=>createHash('sha256').update(b).digest('hex'),require=createRequire(import.meta.url),ts=require('typescript'),paths=candidateProductSourcePaths(process.cwd()).sort();
const {Subject,Subscription,merge}=require('rxjs'),{take,startWith,takeUntil}=require('rxjs/operators');
const chipPath='projects/ngx-material-legacy/legacy-chips/chip.ts',listPath='projects/ngx-material-legacy/legacy-chips/chip-list.ts',chip=read(chipPath).toString(),list=read(listPath).toString();
const analysis=analyzeChipLifecycleOriginals(read),context=chipLifecycleSourceContext(read,paths),controls=[];assert.equal(analysis.length,7);assert.equal(analysis.reduce((n,r)=>n+r.hunks,0),30);assert.equal(analysis.reduce((n,r)=>n+r.paths.length,0),16);
function alteredMethod(source,owner,name,needle,replacement){const file=ts.createSourceFile('change.ts',source,ts.ScriptTarget.Latest,true),c=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===owner),m=c.members.find(m=>m.name?.getText()===name);assert.ok(m);const original=m.getText(file);assert.equal(original.split(needle).length,2,needle);const altered=source.slice(0,m.getStart(file))+original.replace(needle,replacement)+source.slice(m.end);assert.equal(ts.createSourceFile('valid-semantic-mutant.ts',altered,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0,'semantic mutant must remain valid TypeScript');return altered;}
const chipModel=source=>replayChipLifecycle(source,'MatLegacyChip',['focus','_blur','ngOnDestroy'],{Subscription,take,Promise});
function chipInstance(Replay,stable=true,focused=true){const trace=[],o=new Replay(),zone=new Subject(),destroyed=new Subject();destroyed.emit=destroyed.next.bind(destroyed);Object.assign(o,{_isDestroyed:false,_hasFocus:focused,_onFocus:new Subject(),_onBlur:new Subject(),destroyed,_ngZone:{onStable:zone,isStable:stable,run:fn=>{trace.push('zone');fn();}},_elementRef:{nativeElement:{focus:()=>trace.push('DOM-focus')}},_chipRipple:{_removeTriggerEvents:()=>trace.push('ripple-cleanup')}});o._onBlur.subscribe(()=>trace.push('blur:'+o._hasFocus));o._onFocus.subscribe(()=>trace.push('focus:'+o._hasFocus));destroyed.subscribe(()=>trace.push('destroy:'+o._isDestroyed+':'+o._hasFocus));return {o,trace,zone};}
async function checkBlur(Replay){let count=0;
 for(const stable of [false,true]){
  {const {o,trace,zone}=chipInstance(Replay,stable);o._blur();assert.deepEqual(trace,[]);if(stable)await Promise.resolve();else zone.next();assert.deepEqual(trace,['zone','blur:false']);assert.equal(o._blurSubscription.closed,true);zone.next();await Promise.resolve();assert.deepEqual(trace,['zone','blur:false']);count++;}
  {const {o,trace,zone}=chipInstance(Replay,stable);o._blur();o.focus();await Promise.resolve();zone.next();assert.deepEqual(trace,[]);assert.equal(o._hasFocus,true);assert.equal(o._blurSubscription.closed,true);count++;}
  {const {o,trace,zone}=chipInstance(Replay,stable);o._blur();o.ngOnDestroy();assert.equal(o._blurSubscription.closed,true);await Promise.resolve();zone.next();o.ngOnDestroy();assert.deepEqual(trace,['destroy:true:true','ripple-cleanup']);count++;}
  {const {o,trace,zone}=chipInstance(Replay,stable);o._blur();const old=o._blurSubscription;o._blur();assert.equal(old.closed,true);if(stable)await Promise.resolve();else zone.next();assert.deepEqual(trace,['zone','blur:false']);count++;}
  {const {o,trace,zone}=chipInstance(Replay,stable);o._onBlur.subscribe(()=>o.focus());o._blur();if(stable)await Promise.resolve();else zone.next();assert.deepEqual(trace,['zone','blur:false','DOM-focus','focus:false']);assert.equal(o._hasFocus,true);zone.next();assert.equal(trace.length,4);count++;}
 }
 {const {o,trace,zone}=chipInstance(Replay,true);o._blur();zone.next();await Promise.resolve();assert.deepEqual(trace,['zone','blur:false']);count++;}
 {const {o,trace}=chipInstance(Replay,true,false);o.focus();assert.deepEqual(trace,['DOM-focus','focus:false']);assert.equal(o._hasFocus,true);count++;}
 {const {o,trace}=chipInstance(Replay,true);o._isDestroyed=true;o._blur();o.focus();o.ngOnDestroy();assert.deepEqual(trace,[]);assert.equal(o._blurSubscription,undefined);count++;}
 return count;
}
const blurCases=await checkBlur(chipModel(chip));
const chipMutants=[
 ['cancelled-microtask-may-fire','_blur','request.closed || this._isDestroyed','this._isDestroyed'],
 ['refocus-does-not-cancel','focus','this._blurSubscription?.unsubscribe();',''],
 ['destroy-leaks-request','ngOnDestroy','this._blurSubscription?.unsubscribe();',''],
 ['zoneless-stable-never-emits','_blur','if (this._ngZone.isStable)','if (false)'],
 ['blur-event-sees-focused-flag','_blur','this._hasFocus = false;','this._hasFocus = true;'],
 ['destroy-is-not-idempotent','ngOnDestroy','this._isDestroyed = true;','this._isDestroyed = false;'],
 ['applied-request-stays-open','_blur','request.unsubscribe();',''],
 ['cleanup-before-destroy-notification','ngOnDestroy','this.destroyed.emit({chip: this});\n    this._chipRipple._removeTriggerEvents();','this._chipRipple._removeTriggerEvents();\n    this.destroyed.emit({chip: this});'],
];
for(const [id,name,old,fresh]of chipMutants){await assert.rejects(()=>checkBlur(chipModel(alteredMethod(chip,'MatLegacyChip',name,old,fresh))),undefined,id);controls.push({id,result:'rejected'});}
async function checkEscape(source){let count=0;for(const initial of [-1,0,3])for(const user of [null,0,4,-1]){const timers=[],Replay=replayChipLifecycle(source,'MatLegacyChipList',['_allowFocusEscape'],{setTimeout:fn=>{timers.push(fn);return timers.length;}}),o=new Replay();let marks=0;Object.assign(o,{_tabIndex:initial,_userTabIndex:user,_elementRef:{nativeElement:{tabIndex:initial}},_changeDetectorRef:{markForCheck:()=>marks++}});o._allowFocusEscape();if(initial===-1){assert.equal(timers.length,0);assert.equal(o._elementRef.nativeElement.tabIndex,-1);}else{assert.equal(o._tabIndex,-1);assert.equal(o._elementRef.nativeElement.tabIndex,-1);assert.equal(timers.length,1);assert.equal(marks,0);o._allowFocusEscape();assert.equal(timers.length,1);await Promise.resolve();assert.equal(o._elementRef.nativeElement.tabIndex,-1);timers.shift()();assert.equal(o._tabIndex,user||0);assert.equal(o._elementRef.nativeElement.tabIndex,user||0);assert.equal(marks,1);}count++;}return count;}
const escapeCases=await checkEscape(list);
for(const [id,old,fresh]of [
 ['only-field-changes','this._elementRef.nativeElement.tabIndex = -1;',''],
 ['DOM-never-restored','this._elementRef.nativeElement.tabIndex = this._tabIndex;',''],
 ['microtask-replaces-macrotask','setTimeout(','Promise.resolve().then('],
 ['user-index-lost','this._userTabIndex || 0','0'],
 ['bound-field-not-synchronized','this._tabIndex = -1;',''],
]){await assert.rejects(()=>checkEscape(alteredMethod(list,'MatLegacyChipList','_allowFocusEscape',old,fresh)),undefined,id);controls.push({id,result:'rejected'});}
class ProtocolKeyManager{constructor(){this.tabOut=new Subject();}withWrap(){return this;}withVerticalOrientation(){return this;}withHomeAndEnd(){return this;}withHorizontalOrientation(){return this;}}
async function checkSelection(source){const Replay=replayChipLifecycle(source,'MatLegacyChipList',['ngAfterContentInit','_initializeSelection'],{FocusKeyManager:ProtocolKeyManager,startWith,takeUntil,Promise});let count=0;
 for(const form of [false,true]){const o=new Replay(),changes=new Subject(),calls=[],notices=[];Object.assign(o,{chips:{changes},_destroyed:new Subject(),_dir:null,disabled:false,selectable:true,stateChanges:new Subject(),_resetChips(){},_updateTabIndex(){},_updateFocusForDestroyedChips(){},_allowFocusEscape(){},_value:['binding-initial'],ngControl:form?{value:['form-initial']}:null,_setSelectionByValue:(value,user)=>calls.push({value,user})});o.stateChanges.subscribe(()=>notices.push('state'));o.ngAfterContentInit();assert.deepEqual(calls,[]);await Promise.resolve();assert.deepEqual(calls,[{value:[form?'form-initial':'binding-initial'],user:false}]);count++;
  if(form)o.ngControl.value=['late-before'];else o._value=['late-before'];changes.next();if(form)o.ngControl.value=['latest'];else o._value=['latest'];await Promise.resolve();assert.deepEqual(calls.at(-1),{value:['latest'],user:false});count++;
  o._destroyed.next();const oldCount=calls.length;changes.next();await Promise.resolve();assert.equal(calls.length,oldCount);assert.ok(notices.length>=4);count++;
 }return count;}
const selectionCases=await checkSelection(list);
for(const [id,name,old,fresh]of [
 ['query-changes-never-initialize','ngAfterContentInit','this._initializeSelection();',''],
 ['form-model-ignored','_initializeSelection','this.ngControl ? this.ngControl.value : this._value','this._value'],
 ['query-subscription-survives-destroy','ngAfterContentInit','this.chips.changes.pipe(startWith(null), takeUntil(this._destroyed))','this.chips.changes.pipe(startWith(null))'],
]){await assert.rejects(()=>checkSelection(alteredMethod(list,'MatLegacyChipList',name,old,fresh)),undefined,id);controls.push({id,result:'rejected'});}
function checkDestroyedFocus(source){const Replay=replayChipLifecycle(source,'MatLegacyChipList',['chipRemoveChanges','_listenToChipsRemoved','_isValidIndex','_updateFocusForDestroyedChips'],{merge});let count=0;
 for(const focused of [false,true]){const o=new Replay(),trace=[],chips=[0,1,2].map(value=>({value,destroyed:new Subject(),removed:new Subject(),_hasFocus:value===2&&focused}));chips.toArray=()=>chips;Object.assign(o,{chips,_lastDestroyedChipIndex:null,_keyManager:{updateActiveItem:i=>trace.push(['update',i]),setActiveItem:i=>trace.push(['set',i])},focus:()=>trace.push(['focus-list'])});o._listenToChipsRemoved();chips[2].removed.next({chip:chips[2]});assert.equal(o._lastDestroyedChipIndex,null);chips[2].destroyed.next({chip:chips[2]});assert.equal(o._lastDestroyedChipIndex,focused?2:null);count++;chips.splice(1);o._updateFocusForDestroyedChips();assert.deepEqual(trace,focused?[['set',0]]:[]);assert.equal(o._lastDestroyedChipIndex,null);count++;o._chipRemoveSubscription.unsubscribe();}
 for(const index of [null,0]){const o=new Replay(),trace=[];Object.assign(o,{chips:[],_lastDestroyedChipIndex:index,_keyManager:{updateActiveItem:i=>trace.push(['update',i]),setActiveItem:i=>trace.push(['set',i])},focus:()=>trace.push(['focus-list'])});o._updateFocusForDestroyedChips();assert.deepEqual(trace,index===null?[['update',-1]]:[['update',-1],['focus-list']]);assert.equal(o._lastDestroyedChipIndex,null);count++;}return count;
}
const destroyedFocusCases=checkDestroyedFocus(list);
for(const [id,name,old,fresh]of [
 ['removal-request-substitutes-destroy-event','chipRemoveChanges','chip.destroyed','chip.removed'],
 ['unfocused-chip-steals-focus','_listenToChipsRemoved','this._isValidIndex(chipIndex) && chip._hasFocus','this._isValidIndex(chipIndex)'],
 ['empty-list-retains-destroyed-active-item','_updateFocusForDestroyedChips','this._keyManager.updateActiveItem(-1);',''],
 ['last-index-not-clamped','_updateFocusForDestroyedChips','Math.min(','Math.max('],
]){assert.throws(()=>checkDestroyedFocus(alteredMethod(list,'MatLegacyChipList',name,old,fresh)),undefined,id);controls.push({id,result:'rejected'});}
for(const path of [CHIP_LIFECYCLE_ORIGINALS]){assert.throws(()=>analyzeChipLifecycleOriginals(p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p)));controls.push({id:'late-corrupt-original-capsule',result:'rejected'});}
for(const s of readChipLifecycleOriginals(read).subjects){const bad=structuredClone(s);bad.members[0].after.text+='unreviewed\n';assert.throws(()=>chipLifecycleOriginalHunks(bad));controls.push({id:'changed-original-after-'+s.sha,result:'rejected'});}
for(const [id,path,old,fresh]of [
 ['owned-blur-switched-to-after-render',chipPath,'Promise.resolve().then(apply)','afterNextRender(apply)'],
 ['owned-direct-DOM-write-removed',listPath,'this._elementRef.nativeElement.tabIndex = -1;',''],
 ['owned-destroy-clearing-removed',listPath,'this._keyManager.updateActiveItem(-1);',''],
 ['owned-query-selection-removed',listPath,'this._initializeSelection();',''],
]){const original=read(path).toString();assert.ok(original.includes(old));assert.throws(()=>chipLifecycleSourceContext(p=>p===path?Buffer.from(original.replace(old,fresh)):read(p),paths));controls.push({id,result:'rejected'});}
const minimumPath='compatibility/rc/tab-header-peer-sources/cdk-21.2.14-_focus-key-manager-chunk.mjs';assert.throws(()=>chipLifecycleSourceContext(p=>p===minimumPath?Buffer.concat([read(p),Buffer.from('changed')]):read(p),paths));controls.push({id:'changed-authenticated-minimum-key-manager',result:'rejected'});
// The source protocols also reproduce candidate defects. Preserve these
// counterexamples for the next repair; passing diagnostics is not product approval.
const focusCounterexamples=[];
{
 const {o,trace,zone}=chipInstance(chipModel(chip),true,true);let active='outside';o._elementRef.nativeElement.focus=()=>active='chip';o._blur();o.focus();await Promise.resolve();zone.next();
 assert.equal(active,'outside');assert.equal(o._hasFocus,true);assert.equal(o._blurSubscription.closed,true);assert.deepEqual(trace,[]);
 focusCounterexamples.push({id:'programmatic-refocus-during-pending-blur',actual_DOM_protocol_active:'outside',cached_hasFocus:true,pending_request_cancelled:true,focus_was_called_on_element:false,status:'source-counterexample;native-regression-and-repair-required'});
}
{
 const {o,trace}=chipInstance(chipModel(chip),true,false);let active='outside',nativeCalls=0;o._elementRef.nativeElement.focus=()=>{nativeCalls++;if(active!=='chip'){active='chip';o.focus();}};
 assert.ok(chip.includes("'(focus)': 'focus()'"));o.focus();assert.equal(active,'chip');assert.equal(trace.filter(s=>s.startsWith('focus:')).length,2);assert.equal(nativeCalls,2);
 focusCounterexamples.push({id:'synchronous-host-focus-reentry',native_focus_calls:nativeCalls,focus_notifications:2,expected_focus_notifications:1,status:'source-counterexample;native-regression-and-repair-required'});
}
const report={schema_version:1,line:context.line,source_view:'authenticated pre-repair lifecycle foundation;current raw repair checked separately',focus_counterexamples:focusCounterexamples,complete_original_subjects:7,whole_original_hunks:30,complete_changed_path_occurrences:16,authenticated_blob_occurrences:32,original_analysis:analysis,source_context:context,protocols:{blur_cases:blurCases,macro_task_DOM_escape_cases:escapeCases,query_selection_timing_cases:selectionCases,destroy_event_and_focus_cases:destroyedFocusCases,actual_selected_authored_method_bodies:true,collaborators:'Genuine installed RxJS Subject/Subscription/merge/operators; explicit NgZone,focus-node,key-manager,timer and value-observer protocols. Angular fixtures,renderer,layout,SSR/hydration and native floors are not executed.',installed_rxjs:require('rxjs/package.json').version},controls,actual_native_packed_or_floor_qualified:false,native_DOM_test_and_per_SHA_admission_pending:true,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:context.line,subjects:7,hunks:30,protocol_cases:blurCases+escapeCases+selectionCases+destroyedFocusCases,protocols:report.protocols,controls:controls.length,focus_counterexamples:focusCounterexamples.length,actual_native_packed_or_floor_qualified:false}));
