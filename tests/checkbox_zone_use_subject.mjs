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
const payload=JSON.parse(readFileSync(new URL('./checkbox-zone-use-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
  app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
    {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
    {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
  zone=app.injector.get(core.NgZone);
}
function fixture(baseJS=payload.base,leafJS=payload.leaf,animationMode,firstId=0,nodeTasks=false){
  let now=0,serial=firstId,stops=0;const timers=new Map(),captured=[],writes=[],classes=new Set(),focus=new Subject(),registrations=[],callbackZones=[],handles=new Map();
  const host={classList:{add:c=>{classes.add(c);writes.push({at:now,add:c});},remove:c=>{classes.delete(c);writes.push({at:now,remove:c});}}};
  const setTimeout=(callback,ms)=>{const id=serial++;captured.push(callback);const inside=core.NgZone.isInAngularZone();
    registrations.push({requested_ms:ms,inside});timers.set(id,{callback,due:now+ms,inside});
    if(nodeTasks){assert.equal(ms,1000);handles.set(id,globalThis.setTimeout(()=>{handles.delete(id);timers.delete(id);
      callbackZones.push(core.NgZone.isInAngularZone());callback();},0));}
    return id;};
  const clearTimeout=id=>{if(handles.has(id))globalThis.clearTimeout(handles.get(id));handles.delete(id);timers.delete(id);};
  class TraitProtocol{constructor(element){this._elementRef=element;}}
  const load=(js,Parent)=>{const exports={};new Function('exports','TraitProtocol','Base','EventEmitter','coerceBooleanProperty',
    'TransitionCheckState','setTimeout','clearTimeout','nextUniqueId','defaults','MatLegacyCheckboxChange',js)
    (exports,TraitProtocol,Parent,core.EventEmitter,coerceBooleanProperty,payload.enumValues,
      setTimeout,clearTimeout,0,{color:'accent',clickAction:'check-indeterminate'},class Change{});return exports.Replay;};
  const Base=load(baseJS),Leaf=load(leafJS,Base);
  const instance=new Leaf(new core.ElementRef(host),{markForCheck(){}},{monitor:()=>focus,stopMonitoring(){stops++;focus.complete();}},
    zone,'3',animationMode,{color:'accent',clickAction:'check-indeterminate'});
  assert.equal(instance._ngZone,zone,'supplied-zone-identity');
  instance._inputElement=new core.ElementRef({checked:false,indeterminate:false,focus(){}});instance.ngAfterViewInit();
  const advance=end=>{for(const[id,t]of[...timers].sort((a,b)=>a[1].due-b[1].due)){if(t.due>end)break;now=t.due;timers.delete(id);t.callback();}now=end;};
  return{instance,classes,timers,captured,writes,advance,registrations,callbackZones,click(){zone.run(()=>instance._onInputClick({stopPropagation(){}}));},
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
async function nodeTaskContext(base=payload.base){
  const f=fixture(base,payload.leaf,undefined,0,true);
  try{f.click();await new Promise(resolve=>globalThis.setTimeout(resolve,10));
    assert.deepEqual(f.callbackZones,[false],'node-task-callback-outside-zone');
    assert.deepEqual(f.registrations,[{requested_ms:1000,inside:false}],'node-task-registration-outside-zone');
    assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);assert.equal(f.instance._animationCleanups.size,0);
  }finally{f.destroy();}
}
async function canceledNodeTask(){
  const f=fixture(payload.base,payload.leaf,undefined,0,true);
  try{f.click();f.destroy();await new Promise(resolve=>globalThis.setTimeout(resolve,10));
    assert.deepEqual(f.callbackZones,[],'destroy-cancels-accelerated-node-task');assert.equal(f.timers.size,0);
    assert.equal(f.classes.size,0);assert.equal(f.instance._animationCleanups.size,0);assert.equal(f.stops(),1);
  }finally{if(!f.instance._checkboxDestroyed)f.destroy();}
}
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
  await nodeTaskContext();cases.push({id:'accelerated-real-node-task-outside-zone',result:'pass'});
  await canceledNodeTask();cases.push({id:'destroy-cancels-real-node-task',result:'pass'});
  for(const[id,js]of Object.entries(payload.mutations)){
    const action=id==='noReuse'?()=>reused(js):id==='noLeafDestroy'?()=>destroyed(payload.base,js):()=>destroyed(js);
    assert.throws(action,error=>error.code==='ERR_ASSERTION');mutations.push({id,result:'rejected'});
  }
  if(mode==='zoneful'){
    assert.throws(()=>live(payload.zoneFault,payload.leaf),error=>error.code==='ERR_ASSERTION');
    mutations.push({id:'inside-zone-timer-registration',result:'rejected'});
    await assert.rejects(()=>nodeTaskContext(payload.zoneFault),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith('node-task-callback-outside-zone'));
    mutations.push({id:'inside-zone-node-callback',result:'rejected'});
  }
  assert.equal(cases.length,8);assert.ok(cases.every(row=>row.result==='pass'));
  console.log(JSON.stringify({cases,mutations,genuine_public_zone:true,
    genuine_Node_task_context_executed:true,Node_task_delay_accelerated_from_1000ms_to_0ms:true,
    actual_browser_1000ms_timing_or_component_or_native_rendering_qualified:false,actual_legacy_component_or_native_executed:false}));
}finally{app?.destroy();if(app)core.destroyPlatform();}
