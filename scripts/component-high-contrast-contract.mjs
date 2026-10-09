/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical component selectors and native media; supplemental guards, no new matrix credit. */
const flags={normal:[false,false],historical_class:[false,true],forced_colors:[true,false],combined:[true,true]};
const expected={normal:['1','0px','0px'],contrast:['0.5','1px','1px'],negative:['0.8','7px','9px']};
function modeOkay(mode,key,values){return mode?.found===true&&mode.media_active===flags[key][0]&&mode.class_active===flags[key][1]&&JSON.stringify(mode.values)===JSON.stringify(values);}
export function componentHighContrastOkay(o){return !!o&&!o.error&&Object.keys(flags).every(key=>modeOkay(o[key],key,expected[key==='normal'?'normal':'contrast']))&&['historical_class','forced_colors'].every(key=>modeOkay(o[key]?.negative,key,expected.negative));}
export async function observeComponentHighContrast({send,evaluate}){
 const o={},saved=await evaluate('document.body.className');
 const frame=async()=>{const r=await send('Runtime.evaluate',{expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('component contrast frame failed');};
 const measure=()=>evaluate(`(()=>{const list=document.getElementById('list-item-disabled'),slider=document.querySelector('#slider-default .mat-slider-thumb-label'),toggle=document.querySelector('#toggle-default .mat-slide-toggle-bar');return {found:!!list&&!!slider&&!!toggle&&[list,slider,toggle].every(n=>n.isConnected),media_active:matchMedia('(forced-colors: active)').matches,class_active:document.body.classList.contains('cdk-high-contrast-active'),values:list&&slider&&toggle?[getComputedStyle(list).opacity,getComputedStyle(slider).outlineWidth,getComputedStyle(toggle).borderTopWidth]:null};})()`);
 try{
  for(const [key,[forced,historical]]of Object.entries(flags)){
   await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:forced?'active':'none'}]});await frame();
   await evaluate(`document.body.classList.toggle('cdk-high-contrast-active',${historical})`);await frame();o[key]=await measure();
   if(key==='historical_class'||key==='forced_colors'){
    const styles=await evaluate(`(()=>{const nodes=[document.getElementById('list-item-disabled'),document.querySelector('#slider-default .mat-slider-thumb-label'),document.querySelector('#toggle-default .mat-slide-toggle-bar')];if(nodes.some(n=>!n))throw new Error('real contrast controls missing');const saved=nodes.map(n=>n.getAttribute('style'));nodes[0].style.setProperty('opacity','0.8','important');nodes[1].style.setProperty('outline-width','7px','important');nodes[2].style.setProperty('border-top-width','9px','important');return saved;})()`);
    try{await frame();o[key].negative=await measure();}finally{await evaluate(`(()=>{const nodes=[document.getElementById('list-item-disabled'),document.querySelector('#slider-default .mat-slider-thumb-label'),document.querySelector('#toggle-default .mat-slide-toggle-bar')];const saved=${JSON.stringify(styles)};nodes.forEach((n,i)=>{if(saved[i]===null)n.removeAttribute('style');else n.setAttribute('style',saved[i]);});})()`);}
   }
  }
 }catch(e){o.error=String(e.message||e);}finally{await send('Emulation.setEmulatedMedia',{features:[]});await frame();await evaluate(`document.body.className=${JSON.stringify(saved)}`);}
 return o;
}
