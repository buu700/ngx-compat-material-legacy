/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual extracted callback/hide/class methods, genuine zones/streams, explicit rectangles. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,runtime,mode]=process.argv.slice(2);
if(runtime==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),cdk=await import('@angular/cdk'),peer=await import('@angular/cdk/overlay'),{Subject}=await import('rxjs'),reference=await import('./clip-reference.mjs'),candidate=await import('./clip-candidate.mjs'),{isElementClippedByScrolling:oracle}=await import('./clip-oracle.mjs'),payload=JSON.parse(readFileSync(new URL('./clip-payload.json',import.meta.url)));
if(mode==='production')core.enableProdMode();
const environment=runtime==='zoneless'?core.createEnvironmentInjector([core.provideZonelessChangeDetection()],core.Injector.NULL):null,zone=environment?environment.get(core.NgZone):new core.NgZone({enableLongStackTrace:false});
const rect=(top,left,bottom,right)=>({top,left,bottom,right}),container=rect(0,0,10,10),inside=rect(2,2,8,8),outside=rect(-1,2,8,8);
const geometries=[['inside',inside,[container]],['all-equal',container,[container]],['top-equal',rect(0,2,8,8),[container]],['bottom-equal',rect(2,2,10,8),[container]],['left-equal',rect(2,0,8,8),[container]],['right-equal',rect(2,2,8,10),[container]],['clipped-above',outside,[container]],['clipped-below',rect(2,2,10.1,8),[container]],['clipped-left',rect(2,-0.1,8,8),[container]],['clipped-right',rect(2,2,8,10.1),[container]],['outside',rect(12,12,18,18),[container]],['zero-area-equal',rect(0,0,0,0),[container]],['no-ancestors',outside,[]],['nested',rect(1,1,9,9),[rect(-5,-5,15,15),rect(2,2,8,8)]],['second-ancestor-clips',inside,[container,rect(3,3,9,9)]]];
const cases=geometries.flatMap(([id,pane,parents])=>['visible','hidden','absent'].map(state=>({id:id+'-'+state,pane,parents,state}))).concat([
 {id:'class-change-must-not-retroactively-clip',pane:inside,parents:[container],state:'visible',classRect:outside},
 {id:'class-change-must-not-retroactively-unclip',pane:outside,parents:[container],state:'visible',classRect:inside},
 {id:'physical-start-LTR',pane:inside,parents:[container],state:'visible',horizontal:true,dir:'ltr'},
 {id:'physical-start-RTL',pane:inside,parents:[container],state:'visible',horizontal:true,dir:'rtl'},
]);
function observe(module,test,isCandidate){
 const events=[],layoutReads=[],pair=new peer.ConnectionPositionPair({originX:'start',originY:test.horizontal?'center':'top'},{overlayX:'end',overlayY:test.horizontal?'center':'bottom'}),positions=new Subject(),destroyed=new Subject();let pane={...test.pane},visible=test.state==='visible',privateReads=0,borrowedDestroyCalls=0;
 const scrollableAncestors=test.parents.map((bounds,index)=>({getElementRef(){return {nativeElement:{getBoundingClientRect(){layoutReads.push('ancestor-'+index);return {...bounds};}}};},ngOnDestroy(){borrowedDestroyCalls++;}}));
 const overlay={overlayElement:{getBoundingClientRect(){layoutReads.push('pane');return {...pane};}},removePanelClass(name){events.push(['remove-class',name]);},addPanelClass(name){events.push(['add-class',name]);if(test.classRect)pane={...test.classRect};},dispose(){borrowedDestroyCalls++;}};
 const instance=test.state==='absent'?null:{isVisible(){events.push(['is-visible',visible,core.NgZone.isInAngularZone()]);return visible;},hide(delay){events.push(['instance-hide',delay,core.NgZone.isInAngularZone()]);visible=false;},_cancelPendingAnimations(){events.push(['cancel']);}};
 const receiver={_overlayRef:overlay,_tooltipInstance:instance,_destroyed:destroyed,_ngZone:zone,_cssClassPrefix:'mat',_dir:{value:test.dir??'ltr'},hideDelay:123,_detach(){events.push(['detach']);},hide:module.Methods.prototype.hide,_updateCurrentPositionClass:module.Methods.prototype._updateCurrentPositionClass};
 const previous=zone.run;zone.run=function(fn,...args){events.push(['zone-entry']);return previous.call(this,fn,...args);};let subscription;
 try{
  subscription=module.bindClipping.call(receiver,positions,scrollableAncestors);
  function emit(){const flag=oracle({...pane},test.parents.map(p=>({...p}))),event={connectionPair:pair};Object.defineProperty(event,'scrollableViewProperties',{get(){privateReads++;if(isCandidate)throw Error('forbidden current private visibility read');return {isOverlayClipped:flag};}});zone.runOutsideAngular(()=>positions.next(event));return flag;}
  const first=emit(),afterFirst=events.filter(e=>e[0]==='instance-hide').length,second=emit();assert.equal(afterFirst,first&&test.state==='visible'?1:0,test.id+' first hide decision');assert.equal(events.filter(e=>e[0]==='instance-hide').length,(first||second)&&test.state==='visible'?1:0,test.id+' fresh second hide decision');
  const hides=events.filter(e=>e[0]==='instance-hide');assert.ok(hides.every(e=>e[1]===0&&e[2]===(runtime==='zoneful')),test.id+' hide delay/zone');assert.equal(events.filter(e=>e[0]==='zone-entry').length,hides.length,test.id+' missing zone entry');
  destroyed.next();destroyed.complete();assert.equal(subscription.closed,true,'clipping subscription retained after destruction');const eventCount=events.length,readCount=layoutReads.length;emit();assert.equal(events.length,eventCount,'callback ran after destruction');assert.equal(layoutReads.length,readCount,'layout read after destruction');assert.equal(borrowedDestroyCalls,0);if(isCandidate)assert.equal(privateReads,0);
  return {id:test.id,events,firstClipped:first,secondClipped:second,borrowed_destroy_calls:borrowedDestroyCalls};
 }finally{subscription?.unsubscribe();positions.complete();destroyed.complete();zone.run=previous;}
}
let report;
try{
 const referenceRows=cases.map(c=>observe(reference,c,false)),candidateRows=cases.map(c=>observe(candidate,c,true));for(let i=0;i<cases.length;i++)assert.deepEqual(candidateRows[i],referenceRows[i],cases[i].id+' differs from untouched callback');
 const faults=[];for(const fault of payload.mutants){const module=await import('./'+fault.file);let failure;try{for(const test of cases)observe(module,test,true);}catch(error){failure=error;}assert.ok(failure,'source mutant escaped: '+fault.id);assert.match(String(failure),/AssertionError|forbidden current private visibility read/,'unrelated mutant failure '+fault.id);faults.push({id:fault.id,rejected:true});}
 report={line,runtime,mode,Core:core.VERSION.full,CDK:cdk.VERSION.full,cases:cases.length,untouched_callback_and_candidate_cases_compared:cases.length,source_mutants_rejected:faults,observations:candidateRows,actual_public_NgZone_and_RxJS_streams:true,stable_public_zoneless_provider:runtime==='zoneless',public_ConnectionPositionPair_instances:true,DOM_event_tooltip_and_overlay_receivers_are_protocols:true,geometry_captured_before_position_class_changes:true,current_private_visibility_reads:0,borrowed_objects_destroyed:0,whole_directive_native_geometry_packed_AOT_or_floors_qualified:false};
}finally{environment?.destroy();}
console.log(JSON.stringify(report));
