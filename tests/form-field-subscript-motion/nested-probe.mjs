/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {pathToFileURL} from 'node:url';
const {withChromium} = await import(pathToFileURL(process.env.MOTION_BROWSER_HELPER).href);
import {writeFileSync} from 'node:fs';
const dir=process.env.MOTION_OUTPUT;
await withChromium(process.argv[2],async({evaluate,browser})=>{
 for(let i=0;i<80 && !(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++)await new Promise(r=>setTimeout(r,100));
 const boot=await evaluate('({ready:!!window.lab,error:document.getElementById("bootstrap-error")?.textContent})');if(!boot.ready)throw Error(JSON.stringify(boot));
 const data=await evaluate(`(async()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(700);
 const own=id=>document.querySelector('#'+id).querySelector(':scope > .mat-form-field-wrapper > .mat-form-field-subscript-wrapper > .mat-form-field-subscript-message');
 const outer=own('outer'),inner=own('inner');if(!outer||!inner||outer===inner)throw Error('fixture must have two distinct owned messages');
 if(document.querySelector('#outer').querySelector('.mat-form-field-subscript-message')!==inner)throw Error('fixture must expose the broad-query bug');
 let outerReads=0,innerReads=0,outerEvents=0,innerEvents=0;
 const o=outer.getBoundingClientRect.bind(outer),i=inner.getBoundingClientRect.bind(inner);
 outer.getBoundingClientRect=()=>{outerReads++;return o()};inner.getBoundingClientRect=()=>{innerReads++;return i()};
 outer.addEventListener('transitionrun',e=>{if(e.target===outer)outerEvents++});inner.addEventListener('transitionrun',e=>{if(e.target===inner)innerEvents++});
 window.lab.set(true);await wait(50);
 const result={outerReads,innerReads,outerEvents,innerEvents,outerOpacity:getComputedStyle(outer).opacity,innerOpacity:getComputedStyle(inner).opacity,outerAnimations:outer.getAnimations().length,innerAnimations:inner.getAnimations().length,outerText:outer.innerText,innerText:inner.innerText,sameOuter:own('outer')===outer,sameInner:own('inner')===inner,aria:{live:outer.getAttribute('aria-live'),atomic:outer.getAttribute('aria-atomic')}};
 window.lab.destroy();await wait(100);result.remaining=!!document.querySelector('#outer');return result;
 })()`);
 if (data.outerReads !== 1 || data.innerReads !== 0 || data.outerAnimations !== 2 || data.innerAnimations !== 0 || !data.sameOuter || !data.sameInner || data.remaining || data.aria.live !== 'polite' || data.aria.atomic !== 'true') throw Error('nested ownership: ' + JSON.stringify(data));
 writeFileSync(dir+'/'+process.argv[3]+'-report.json',JSON.stringify({browser,data},null,2)+'\n');console.log(JSON.stringify(data));
},{debugPort:0,requireAnnouncedEndpoint:true});
