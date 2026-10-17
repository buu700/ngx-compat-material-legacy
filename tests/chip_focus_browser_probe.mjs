/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Browser fixture source diagnostics only; explicit DOM/zone collaborators. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chipFocusLifecycleFixtureMembers} from '../scripts/chip-focus-lifecycle-fixture.mjs';
import {chipFocusLifecycleNativeOkay as okay} from '../scripts/chip-focus-lifecycle-native-contract.mjs';
import {CHIP_FOCUS_SOURCE,readChipFocusRepairPrior,replayChipFocusSource} from '../scripts/chip-focus-contract.mjs';
import {requiredProbeSource} from '../scripts/browser-required-cells.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),{Subject,Subscription}=require('rxjs'),{take}=require('rxjs/operators');
const source=readFileSync(CHIP_FOCUS_SOURCE,'utf8'),prior=readChipFocusRepairPrior(),before=prior.sources.find(m=>m.path===CHIP_FOCUS_SOURCE).text;
const members=chipFocusLifecycleFixtureMembers(),fixture='class Fixture {\n'+members+'\n}';
assert.equal(ts.createSourceFile('fixture.ts',fixture,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0);
const js=ts.transpileModule(fixture,{compilerOptions:{target:ts.ScriptTarget.ES2022,experimentalDecorators:true},reportDiagnostics:true});assert.equal(js.diagnostics.length,0);
const serialized=new Function('return ('+okay.toString()+');')();new Function(requiredProbeSource());
function setup(product,{stable,ownDescriptor=false,throwNative=false}={}){
 const Chip=replayChipFocusSource(product,{Subscription,take,Promise}),chip=new Chip(),onStable=new Subject();let depth=0,nativeCalls=0;
 const zone={isStable:stable,onStable,run(fn){depth++;try{return fn();}finally{if(--depth===0)queueMicrotask(()=>onStable.next());}}};
 const document={activeElement:null,querySelector(selector){return selector==='[data-chip-focus-lifecycle]'?element:selector==='[data-chip-focus-outside]'?outside:null;}};
 const hostPrototype={focus(){nativeCalls++;if(throwNative)throw new Error('native focus failed');if(document.activeElement!==element){document.activeElement=element;zone.run(()=>chip.focus());}}};
 const element=Object.create(hostPrototype);if(ownDescriptor)Object.defineProperty(element,'focus',{value:hostPrototype.focus,writable:true,configurable:true,enumerable:false});
 const outside={focus(){if(document.activeElement===element){document.activeElement=outside;zone.run(()=>chip._blur());}else document.activeElement=outside;}};
 Object.assign(chip,{_hasFocus:false,_isDestroyed:false,_onFocus:new Subject(),_onBlur:new Subject(),_elementRef:{nativeElement:element},_ngZone:zone});
 const Fixture=new Function('ViewChild','inject','NgZone','document',js.outputText+';return Fixture;')(()=>()=>{},()=>zone,{},document);
 const fixture=new Fixture();fixture.focusLifecycleChip=chip;
 return {fixture,chip,element,outside,document,nativeCalls:()=>nativeCalls};
}
const observations=[];
for(const stable of [false,true])for(const ownDescriptor of [false,true]){
 for(const [epoch,product]of [['current',source],['before',before]]){
  const f=setup(product,{stable,ownDescriptor}),descriptor=Object.getOwnPropertyDescriptor(f.element,'focus');
  const raw=await f.fixture.runChipFocusLifecycle();assert.deepEqual(Object.getOwnPropertyDescriptor(f.element,'focus'),descriptor);assert.equal(f.chip._onFocus.observers.length,0);assert.equal(f.chip._onBlur.observers.length,0);
  assert.equal(okay(raw),epoch==='current');assert.equal(serialized(raw),epoch==='current');
  if(epoch==='before'){assert.equal(raw.initial_native_focus_calls,2);assert.equal(raw.initial_focus_notifications,2);assert.equal(raw.pending_native_focus_calls,0);assert.equal(raw.pending_after_dom_matches,false);}else{assert.equal(raw.initial_native_focus_calls,1);assert.equal(raw.pending_native_focus_calls,1);assert.equal(f.nativeCalls(),2);}
  observations.push({epoch,stable,own_descriptor:ownDescriptor,raw,qualified_by_selected_predicate:okay(raw),cleanup_restored:true});
 }
}
let controls=0;const good=observations.find(o=>o.epoch==='current').raw;
for(const [key,value]of Object.entries(good)){
 const absent={...good};delete absent[key];assert.equal(okay(absent),false,key);assert.equal(serialized(absent),false);controls++;
 for(const changed of typeof value==='boolean'?[!value,String(value),0,1]:[value+1,String(value),null]){assert.equal(okay({...good,[key]:changed}),false,key);controls++;}
}
for(const invalid of [null,undefined,{},[],{...good,error:'focus failed'}]){assert.equal(okay(invalid),false);controls++;}
for(const ownDescriptor of [false,true]){
 const f=setup(source,{stable:true,ownDescriptor,throwNative:true}),descriptor=Object.getOwnPropertyDescriptor(f.element,'focus');
 await assert.rejects(()=>f.fixture.runChipFocusLifecycle(),/native focus failed/);assert.deepEqual(Object.getOwnPropertyDescriptor(f.element,'focus'),descriptor);assert.equal(f.chip._onFocus.observers.length,0);assert.equal(f.chip._onBlur.observers.length,0);controls++;
}
// Execute the unchanged browser entry/poll plumbing with explicit collaborators.
// This validates callback ownership and serialized raw evidence, not a browser.
const probeRuns=[];
for(const stable of [false,true])for(const [epoch,product]of [['current',source],['before',before]]){
 const f=setup(product,{stable}),surface={setAttribute(){}},originalQuery=f.document.querySelector.bind(f.document);let touched=false;
 f.chip._onBlur.subscribe(()=>touched=true);
 f.document.querySelector=selector=>selector==='#wrap-chips'?{}:selector==='#p-chip-list .mat-chip'?f.element:selector==='#p-field-input'?f.outside:originalQuery(selector);
 f.document.getElementById=id=>id==='surface'?surface:null;
 const window={__lab:{closeTransient(){},runChipFocusLifecycle:()=>f.fixture.runChipFocusLifecycle(),readChipFormState:()=>({focused:f.chip._hasFocus,touched}),resetChipFormState(){touched=false;}}};
 new Function('window','document','setTimeout',requiredProbeSource())(window,f.document,setTimeout);
 window.__begin({family:'chips',state:'default'});
 const until=Date.now()+2500;while(!window.__poll().done&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,5));
 const status=window.__poll();assert.equal(status.done,true);assert.equal(status.ok,epoch==='current',status.evidence);
 if(epoch==='current'){assert.ok(status.evidence.startsWith('mat-chip-list; focus and blur '));const raw=JSON.parse(status.evidence.slice('mat-chip-list; focus and blur '.length));assert.equal(okay(raw.focus_lifecycle),true);assert.deepEqual(raw.blur,{focused_before:true,touched_before:false,focused_after:false,touched_after:true,dom_focus_moved:true});}
 else assert.ok(status.evidence.startsWith('chip focus lifecycle '));
 probeRuns.push({epoch,stable,result:status.ok?'pass':'fail',raw_evidence:status.evidence});
}
// A late completion may not overwrite another cell's status.
{
 const f=setup(source,{stable:true}),surface={setAttribute(){}},window={};let complete;
 f.document.getElementById=()=>surface;f.document.querySelector=selector=>selector==='#wrap-chips'?{}:selector==='#p-chip-list .mat-chip'?f.element:selector==='#p-field-input'?f.outside:null;
 window.__lab={closeTransient(){},runChipFocusLifecycle:()=>new Promise(resolve=>complete=resolve),readChipFormState:()=>({focused:false,touched:false}),resetChipFormState(){}};
 new Function('window','document','setTimeout',requiredProbeSource())(window,f.document,setTimeout);window.__begin({family:'chips',state:'default'});
 const until=Date.now()+500;while(!complete&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(complete);const next={done:false,ok:false,evidence:'next-cell'};window.__status=next;complete(good);await new Promise(resolve=>setTimeout(resolve,5));assert.equal(window.__status,next);controls++;
}
const report={schema_version:1,line:prior.line,compiler:ts.version,selected_fixture_runs:observations.length,current_selected_fixture_passes:4,before_selected_fixture_rejections:4,contract_corruption_and_cleanup_controls:controls,observations,whole_probe_callback_runs:probeRuns,browser_probe_with_serialized_predicates_parses:true,actual_angular_browser_packed_or_floor_execution:false,scope:'Actual generated fixture member body plus complete current/before focus and blur methods with genuine host RxJS and explicit DOM/zone collaborators. Native execution remains required;this report carries no runtime admission credit.',g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:prior.line,compiler:ts.version,selected_fixture_runs:8,current_selected_fixture_passes:4,before_selected_fixture_rejections:4,whole_probe_callback_runs:probeRuns.length,controls,actual_angular_browser_packed_or_floor_execution:false}));
