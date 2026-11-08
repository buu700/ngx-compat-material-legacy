/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [helper,dist,output,variant]=process.argv.slice(2),{withChromium}=await import(pathToFileURL(helper));
const observations=[];
const result=await withChromium(dist,async({evaluate,browser})=>{
 for(let i=0;i<100&&!(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++)await new Promise(r=>setTimeout(r,100));
 assert.equal(await evaluate('document.getElementById("bootstrap-error")?.textContent??null'),null);
 async function check(rows,visible=true){
  await evaluate(`window.lab.step(${JSON.stringify(rows)},${visible})`);
  const data=await evaluate(`({sources:window.lab.sourceCounts(),tables:document.querySelectorAll('#native,#flex').length,hosts:['native','flex'].map(id=>{const host=document.getElementById(id);if(!host)return null;const empty=host.querySelector('.mat-no-data-row');return {sections:[...host.children].filter(x=>['THEAD','TBODY','TFOOT'].includes(x.tagName)).map(x=>[x.tagName,x.getAttribute('role')]),rows:[...host.querySelectorAll('.mat-row')].map(x=>x.textContent.trim()),header:host.querySelector('.mat-header-row')?.textContent.trim(),footer:host.querySelector('.mat-footer-row')?.textContent.trim(),empty:empty?{role:empty.getAttribute('role'),classes:[...empty.classList].sort(),plain:empty.querySelector('[data-plain]').getAttribute('class'),authored:empty.querySelector('.authored-cell').getAttribute('class')}:null};})})`);
  observations.push({rows,visible,...data});assert.equal(data.tables,visible?2:0);
  for(const source of data.sources){assert.equal(source.subscriptions,visible?1:0);assert.equal(source.connects-source.disconnects,visible?1:0);}
  if(!visible){assert.deepEqual(data.hosts,[null,null]);return;}
  for(const [i,host]of data.hosts.entries()){
   assert.ok(host);assert.deepEqual(host.sections,i===0?[['THEAD','rowgroup'],['TBODY','rowgroup'],['TFOOT','rowgroup']]:[]);
   assert.equal(host.header,'Header');assert.equal(host.footer,'Footer');assert.deepEqual(host.rows,rows);
   if(rows.length)assert.equal(host.empty,null);
   else{assert.equal(host.empty.role,'row');assert.deepEqual(host.empty.classes,['authored','cdk-no-data-row','mat-no-data-row']);assert.equal(host.empty.authored,'authored-cell cdk-no-data-cell');assert.equal(host.empty.plain,variant==='mutant'&&i===0?'':null);}
  }
 }
 await check([]);await check(['A','B']);await check([]);await check([],false);
 assert.deepEqual(observations.at(-1).sources,[{connects:1,disconnects:1,subscriptions:0},{connects:1,disconnects:1,subscriptions:0}]);
 await check([]);await check(['C']);await check([],false);
 assert.deepEqual(observations.at(-1).sources,[{connects:2,disconnects:2,subscriptions:0},{connects:2,disconnects:2,subscriptions:0}]);
 return {browser,passed:true,native_and_flex:true,transitions:observations.length,variant,observations};
},{debugPort:0,requireAnnouncedEndpoint:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
