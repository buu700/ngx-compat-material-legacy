/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {pathToFileURL} from 'node:url';
const {withChromium} = await import(pathToFileURL(process.env.MOTION_BROWSER_HELPER).href);
import {writeFileSync} from 'node:fs';
const dir=process.env.MOTION_OUTPUT, disabled=process.argv[3].startsWith('noop');
await withChromium(process.argv[2],async({evaluate,browser})=>{
 for(let i=0;i<80 && !(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++)await new Promise(r=>setTimeout(r,100));
 const boot=await evaluate('({ready:!!window.lab,error:document.getElementById("bootstrap-error")?.textContent})');if(!boot.ready)throw Error(JSON.stringify(boot));
 const data=await evaluate(`(async()=>{
 const disabled=${JSON.stringify(disabled)},wait=ms=>new Promise(r=>setTimeout(r,ms)),frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const node=()=>document.querySelector('.mat-form-field-subscript-message'),check=(x,m)=>{if(!x)throw Error(m)};await wait(700);const message=node();let reads=0;
 const geometry=message.getBoundingClientRect.bind(message);message.getBoundingClientRect=()=>{reads++;return geometry()};const rows=[];
 check(message.getAnimations().length===0 && getComputedStyle(message).opacity==='1','initial rendering must not animate');
 async function rendered(text){for(let i=0;i<30 && node()?.innerText!==text;i++)await frames();check(node()?.innerText===text,'displayed state did not update');getComputedStyle(node()).opacity;}
 async function change(invalid,label,previous=[]){
  window.lab.set(invalid);await rendered(invalid?'Error':'Hint');const animations=node().getAnimations(),properties=animations.map(a=>a.transitionProperty).sort();
  const row={label,text:node().innerText,reads,same:node()===message,properties,timings:animations.map(a=>a.effect.getTiming()),fresh:animations.every(a=>!previous.includes(a)),beforeOpacity:getComputedStyle(node()).opacity};
  check(row.same,'permanent live-region node replaced');
  if(disabled){check(animations.length===0 && row.beforeOpacity==='1','disabled motion animated');}
  else {
   check(animations.length===2 && JSON.stringify(properties)===JSON.stringify(['opacity','transform']),'two actual CSS transitions required');check(row.fresh,'message switch reused old transition objects');
   check(animations.every(a=>a.effect.getTiming().duration===300),'historical duration changed');
   check(getComputedStyle(node()).transition.includes('cubic-bezier(0.55, 0, 0.55, 0.2)'),'historical curve changed');
   for(const a of animations)a.currentTime=50;
   row.opacityAt50=getComputedStyle(node()).opacity;row.transformAt50=getComputedStyle(node()).transform;
   check(Number(row.opacityAt50)>0 && Number(row.opacityAt50)<1,'browser opacity interpolation missing');
   const matrix=new DOMMatrixReadOnly(row.transformAt50),opacity=Number(row.opacityAt50);
   check(Math.abs(matrix.m11-1)<0.0001 && Math.abs(matrix.m22-1)<0.0001 && Math.abs(matrix.m41)<0.0001 && matrix.m42>-5 && matrix.m42<0,'browser historical translateY interpolation missing');
   check(Math.abs(matrix.m42-(-5*(1-opacity)))<0.025,'opacity/translateY interpolation diverged from tagged reference endpoints');
  }
  rows.push(row);return animations;
 }
 window.lab.set(false);await rendered('Hint');check(reads===0 && message.getAnimations().length===0,'same initial hint restarted');
 let animations=await change(true,'error');const beforeSame=reads,old=[...animations];window.lab.set(true);await rendered('Error');check(reads===beforeSame && message.getAnimations().every(a=>old.includes(a)),'same error restarted');
 animations=await change(false,'hint',animations);
 const overlap=[];
 for(const [invalid,label] of [[true,'rapid-error'],[false,'rapid-hint'],[true,'rapid-error-again']]){
  if(!disabled){const active=animations.some(a=>a.playState==='running' && a.currentTime<300);check(active,'rapid request was not made during an active transition');overlap.push(active);}
  animations=await change(invalid,label,animations);
 }
 const preCoalesced=[...animations],readsBeforeCoalesced=reads;
 window.lab.set(false);window.lab.set(true);window.lab.set(false);await rendered('Hint');const final=node().getAnimations();
 if(!disabled){check(final.length===2 && final.every(a=>!preCoalesced.includes(a)) && reads>readsBeforeCoalesced,'final changed-kind transition missing or stale');for(const a of final)a.currentTime=50;
 const opacity=Number(getComputedStyle(node()).opacity),matrix=new DOMMatrixReadOnly(getComputedStyle(node()).transform);
 check(opacity>0&&opacity<1&&matrix.m42>-5&&matrix.m42<0&&Math.abs(matrix.m42-(-5*(1-opacity)))<0.025,'final changed-kind interpolation failed');for(const a of final)a.currentTime=300;}
 else check(final.length===0&&reads===0,'disabled coalesced changes animated or forced geometry');
 check(getComputedStyle(node()).opacity==='1' && Math.abs(new DOMMatrixReadOnly(getComputedStyle(node()).transform).m42)<0.0001,'final state failed to settle');const aria={live:message.getAttribute('aria-live'),atomic:message.getAttribute('aria-atomic')};check(aria.live==='polite'&&aria.atomic==='true','live-region attributes changed');
 window.lab.destroy();for(let i=0;i<30&&node();i++)await frames();check(!node(),'destroy left message node');return {passed:true,rows,overlap,reads,aria,destroyed:true,measurement:'Actual CSS transition identities, duration, curve and browser interpolation at explicit currentTime50; wall-clock timing is not asserted.'};
 })()`);
 writeFileSync(dir+'/'+process.argv[3]+'-report.json',JSON.stringify({browser,data},null,2)+'\n');console.log(JSON.stringify(data));
},{debugPort:0,requireAnnouncedEndpoint:true});
