/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real packed legacy pagination, supplemental guard; no extra browser matrix credit. */
export function tabPaginationNativeOkay(o){return !!o&&!o.error&&o.elements===2&&o.button_semantics===true&&o.disabled_click_inert===true&&o.pointer_focus_retained===true&&Number.isFinite(o.scroll_before)&&o.scroll_before===0&&Number.isFinite(o.scroll_after)&&o.scroll_after<o.scroll_before;}
export async function observeTabPaginationNative({send,evaluate,waitFor}){
 const o={};
 const frame=async()=>{const r=await send('Runtime.evaluate',{expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('tab pagination frame failed');};
 const read=()=>evaluate(`(${readTabPaginationNative.toString()})(document.getElementById('pagination-tabs'))`);
 try{
  if(!await waitFor('!!document.querySelector("#pagination-tabs .mat-tab-header-pagination-controls-enabled")&&!document.querySelector("#pagination-tabs .mat-tab-header-pagination-after")?.disabled'))throw new Error('real legacy pagination controls unavailable');
  await frame();const initial=await read();if(initial.missing||initial.after_box.width<=0||initial.after_box.height<=0)throw new Error('pagination geometry unavailable');o.elements=initial.elements;o.button_semantics=initial.button_semantics;o.scroll_before=initial.scroll;
  await evaluate('document.querySelector("#pagination-tabs .mat-tab-header-pagination-before").click()');await frame();o.disabled_click_inert=(await read()).scroll===initial.scroll;
  await evaluate('document.querySelector("#pagination-tabs .mat-tab-label").focus()');await frame();const {x,y}=(await read()).after_box;
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await frame();const after=await read();o.pointer_focus_retained=after.focus_retained;o.scroll_after=after.scroll;
 }catch(e){o.error=String(e.message||e);}return o;
}

/** Shared DOM observation; initial button state is checked before scrolling. */
export function readTabPaginationNative(root) {
 const buttons=root?.querySelectorAll('button.mat-tab-header-pagination'),list=root?.querySelector('.mat-tab-list');
 const before=root?.querySelector('.mat-tab-header-pagination-before'),after=root?.querySelector('.mat-tab-header-pagination-after');
 if(!before||!after||!list)return {elements:buttons?.length||0,missing:true};
 const x=list.style.transform?new DOMMatrix(list.style.transform).m41:0,box=after.getBoundingClientRect();
 return {elements:buttons.length,
  button_semantics:[before,after].every(b=>b.tagName==='BUTTON'&&b.type==='button'&&b.tabIndex===-1&&b.getAttribute('aria-hidden')==='true')&&before.disabled===true&&after.disabled===false,
  scroll:x,after_box:{x:box.x+box.width/2,y:box.y+box.height/2,width:box.width,height:box.height},
  focus_retained:document.activeElement===root.querySelector('.mat-tab-label')};
}
