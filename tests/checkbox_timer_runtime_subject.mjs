/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const[line,mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),{coerceBooleanProperty}=await import('@angular/cdk/coercion'),{Subject}=await import('rxjs');
const payload=JSON.parse(readFileSync(new URL('./checkbox-timer-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
  app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
    {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
    {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
  zone=app.injector.get(core.NgZone);
}
function fixture(baseJS=payload.base,leafJS=payload.leaf,animationMode,firstId=0){
  let now=0,serial=firstId,stops=0;const timers=new Map(),captured=[],writes=[],classes=new Set(),focus=new Subject();
  const host={classList:{add:c=>{classes.add(c);writes.push({at:now,add:c});},remove:c=>{classes.delete(c);writes.push({at:now,remove:c});}}};
  const setTimeout=(callback,ms)=>{const id=serial++;captured.push(callback);timers.set(id,{callback,due:now+ms,inside:core.NgZone.isInAngularZone()});return id;};
  const clearTimeout=id=>timers.delete(id);
  class TraitProtocol{constructor(element){this._elementRef=element;}}
  const load=(js,Parent)=>{const exports={};new Function('exports','TraitProtocol','Base','EventEmitter','coerceBooleanProperty',
    'TransitionCheckState','setTimeout','clearTimeout','nextUniqueId','defaults','MatLegacyCheckboxChange',js)
    (exports,TraitProtocol,Parent,core.EventEmitter,coerceBooleanProperty,{Init:0,Checked:1,Unchecked:2,Indeterminate:3},
      setTimeout,clearTimeout,0,{color:'accent',clickAction:'check-indeterminate'},class Change{});return exports.Replay;};
  const Base=load(baseJS),Leaf=load(leafJS,Base);
  const instance=new Leaf(new core.ElementRef(host),{markForCheck(){}},{monitor:()=>focus,stopMonitoring(){stops++;focus.complete();}},
    zone,'3',animationMode,{color:'accent',clickAction:'check-indeterminate'});
  instance._inputElement=new core.ElementRef({checked:false,indeterminate:false,focus(){}});instance.ngAfterViewInit();
  const advance=end=>{for(const[id,t]of[...timers].sort((a,b)=>a[1].due-b[1].due)){if(t.due>end)break;now=t.due;timers.delete(id);t.callback();}now=end;};
  return{instance,classes,timers,captured,writes,advance,click(){zone.run(()=>instance._onInputClick({stopPropagation(){}}));},
    destroy(){instance.ngOnDestroy();},stops:()=>stops};
}
function live(base,leaf){const f=fixture(base,leaf);f.click();assert.ok(f.classes.has('mat-checkbox-anim-unchecked-checked'));
  assert.equal(f.timers.size,1);assert.ok([...f.timers.values()].every(t=>!t.inside));f.advance(999);assert.equal(f.classes.size,1);
  f.advance(1000);assert.equal(f.classes.size,0);f.destroy();}
function reused(base=payload.base){const f=fixture(base);f.click();f.advance(850);f.click();f.advance(900);f.click();
  f.advance(1000);assert.ok(f.classes.has('mat-checkbox-anim-unchecked-checked'),'new-animation-survives-old-timer');
  f.advance(1899);assert.ok(f.classes.has('mat-checkbox-anim-unchecked-checked'));f.advance(1900);assert.equal(f.classes.size,0);f.destroy();}
function destroyed(base=payload.base,leaf=payload.leaf){const f=fixture(base,leaf);f.click();f.advance(100);f.click();f.destroy();
  assert.equal(f.timers.size,0,'destroy-cancels-all-timers');assert.equal(f.classes.size,0,'destroy-clears-animation-classes');
  assert.equal(f.instance._animationCleanups.size,0,'destroy-releases-records');const before=f.writes.length;
  for(const callback of f.captured)callback();assert.equal(f.writes.length,before,'captured-callback-cannot-write-after-destroy');
  f.instance._transitionCheckState(1);assert.equal(f.timers.size,0,'destroyed-transition-cannot-schedule');
  assert.equal(f.writes.length,before,'destroyed-transition-cannot-write');assert.equal(f.stops(),1);}
const cases=[],mutations=[];
try{
  live(payload.original,payload.originalLeaf);cases.push({id:'tagged-live-timing',result:'pass'});
  live(payload.base,payload.leaf);cases.push({id:'current-live-timing',result:'pass'});
  reused();cases.push({id:'reused-class-keeps-latest-deadline',result:'pass'});
  destroyed();cases.push({id:'destroy-clears-id-zero-and-captured-callbacks',result:'pass'});
  const noop=fixture(payload.base,payload.leaf,'NoopAnimations');noop.click();assert.equal(noop.timers.size,0);assert.equal(noop.classes.size,0);noop.destroy();
  cases.push({id:'noop-keeps-no-animation-class-or-timer',result:'pass'});
  const original=fixture(payload.original,payload.originalLeaf);original.click();original.destroy();assert.equal(original.timers.size,1);
  const before=original.writes.length;original.advance(1000);assert.equal(original.writes.length,before+1);
  cases.push({id:'original-direct-destruction-leak-reproduced',result:'pass'});
  for(const[id,js]of Object.entries(payload.mutations)){
    const action=id==='noReuse'?()=>reused(js):id==='noLeafDestroy'?()=>destroyed(payload.base,js):()=>destroyed(js);
    assert.throws(action,error=>error.code==='ERR_ASSERTION');mutations.push({id,result:'rejected'});
  }
  console.log(JSON.stringify({cases,mutations,genuine_public_zone:true,actual_legacy_component_or_native_executed:false}));
}finally{app?.destroy();if(app)core.destroyPlatform();}
