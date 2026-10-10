/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Supplemental packed snack motion cases; no additional browser matrix credit. */
export function legacySnackMotionNativeOkay(o) {
  return !!o && !o.error && ['event','fallback'].includes(o.mode) && o.enabled === true &&
    o.entered === 1 && o.dismissed === 1 && o.completed === true && o.dismissed_by_action === true &&
    o.removed === true && o.trusted_enter_events === 1 && o.trusted_exit_events === 1 &&
    Number.isFinite(o.enter_ms) && o.enter_ms >= 0 && Number.isFinite(o.exit_ms) && o.exit_ms >= 0 &&
    o.enter_delivery === o.mode && o.exit_delivery === o.mode &&
    (o.mode === 'event' || (o.enter_ms >= 180 && o.exit_ms >= 110));
}
export async function observeLegacySnackMotionNative({send,evaluate,waitFor},mode) {
  const o={mode};
  try {
    await evaluate(`(()=>{
      window.__snackMotionTrace={events:[],actionAt:null,suppress:${mode==='fallback'}};
      window.__snackMotionListener=event=>{
        const trace=window.__snackMotionTrace;
        if(event.target?.matches('.mat-snack-bar-container')){
          trace.events.push({name:event.animationName,trusted:event.isTrusted,at:performance.now()});
          if(trace.suppress)event.stopImmediatePropagation();
        }
      };
      window.__snackActionListener=event=>{
        if(event.target?.closest('.mat-simple-snackbar-action'))window.__snackMotionTrace.actionAt=performance.now();
      };
      document.addEventListener('animationend',window.__snackMotionListener,true);
      document.addEventListener('click',window.__snackActionListener,true);
      document.getElementById('snack-motion-open').click();
    })()`);
    if(!await waitFor('document.getElementById("snack-motion-state")?.dataset.entered==="1"'))throw new Error('enabled snack did not enter');
    const before=await evaluate(`(()=>{
      const host=document.querySelector('.mat-snack-bar-container'),state=document.getElementById('snack-motion-state');
      const button=host?.querySelector('.mat-simple-snackbar-action button');
      const box=button?.getBoundingClientRect();
      return {enabled:host?.classList.contains('mat-snack-bar-container-animations-enabled')===true,
        entered:Number(state?.dataset.entered),enter_ms:Number(state?.dataset.enterMs),
        box:box?{x:box.x+box.width/2,y:box.y+box.height/2,width:box.width,height:box.height}:null};
    })()`);
    Object.assign(o,{enabled:before.enabled,entered:before.entered,enter_ms:before.enter_ms});
    if(!before.box||before.box.width<=0||before.box.height<=0)throw new Error('snack action geometry unavailable');
    const {x,y}=before.box;
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
    if(!await waitFor('!document.querySelector(".mat-snack-bar-container")&&document.getElementById("snack-motion-state")?.dataset.completed==="true"'))throw new Error('enabled snack did not finish dismissal');
    Object.assign(o,await evaluate(`(()=>{
      const state=document.getElementById('snack-motion-state'),trace=window.__snackMotionTrace;
      return {dismissed:Number(state?.dataset.dismissed),completed:state?.dataset.completed==='true',
        dismissed_by_action:state?.dataset.action==='true',removed:!document.querySelector('.mat-snack-bar-container'),
        exit_ms:Number.isFinite(trace.actionAt)?Number(state?.dataset.dismissedAt)-trace.actionAt:NaN,
        enter_delivery:state?.dataset.enterDelivery,exit_delivery:state?.dataset.exitDelivery,
        trusted_enter_events:trace.events.filter(e=>e.trusted&&e.name==='mat-legacy-snack-bar-enter').length,
        trusted_exit_events:trace.events.filter(e=>e.trusted&&e.name==='mat-legacy-snack-bar-exit').length};
    })()`));
  } catch(error) {o.error=String(error.message||error);}
  finally {
    await evaluate(`document.removeEventListener('animationend',window.__snackMotionListener,true);
      document.removeEventListener('click',window.__snackActionListener,true);
      delete window.__snackMotionTrace;delete window.__snackMotionListener;delete window.__snackActionListener;`);
  }
  return o;
}
