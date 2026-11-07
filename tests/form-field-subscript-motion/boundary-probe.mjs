/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {pathToFileURL} from 'node:url';
const {withChromium} = await import(pathToFileURL(process.env.MOTION_BROWSER_HELPER).href);
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const [dir,variant]=process.argv.slice(2),initialError=['initial-error','noop'].includes(variant),disabled=variant==='noop';
await withChromium(dir+'/dist',async({evaluate,browser})=>{
 for(let i=0;i<80&&!(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++)await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate('!!window.lab'),true);
 const data=await evaluate(`(async()=>{
 const initialError=${initialError},disabled=${disabled},wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(500);
 const node=()=>document.querySelector('.mat-form-field-subscript-message'),message=node(),check=(x,m)=>{if(!x)throw Error(m)};
 check(message.innerText===(initialError?'Error':'Hint')&&message.getAnimations().length===0&&getComputedStyle(message).opacity==='1','initial state animated or incorrect');
 const errors=[];window.addEventListener('error',e=>errors.push(String(e.error||e.message)));let reads=0;
 const geometry=message.getBoundingClientRect.bind(message);message.getBoundingClientRect=()=>{reads++;return geometry()};
 const changed=!initialError;window.lab.set(changed);
 for(let i=0;i<30&&message.innerText!==(changed?'Error':'Hint');i++)await wait(10);
 check(message.innerText===(changed?'Error':'Hint'),'changed state missing');getComputedStyle(message).opacity;
 const animations=message.getAnimations();check(disabled?animations.length===0:animations.length===2,'changed motion missing/disabled motion present');
 if(!disabled){for(const animation of animations)animation.currentTime=50;check(animations.some(a=>a.playState==='running'&&a.currentTime<300),'destruction setup has no active transition');}
 const beforeReads=reads;window.lab.batch([initialError,changed]);await wait(20);getComputedStyle(message).opacity;
 check(message.innerText===(changed?'Error':'Hint')&&reads===beforeReads,'coalesced final same kind forced geometry');
 check(message.getAnimations().length===animations.length && message.getAnimations().every(a=>animations.includes(a)),'coalesced final same kind restarted motion');
 const activeBeforeDestroy=message.getAnimations().some(a=>a.playState==='running'&&a.currentTime<300);check(disabled||activeBeforeDestroy,'transition ended before destruction');
 window.lab.destroy();for(let i=0;i<30&&node();i++)await wait(10);check(!node(),'destroy retained field');await wait(350);check(!node()&&errors.length===0,'post-destroy activity failed');
 return {passed:true,initial:initialError?'error':'hint',disabled,reads,beforeReads,coalescedSameKind:true,activeBeforeDestroy,removed:true,errors};})()`);
 writeFileSync(dir+'/boundary-report.json',JSON.stringify({browser,data},null,2)+'\n');console.log(JSON.stringify(data));
},{debugPort:0,requireAnnouncedEndpoint:true});
