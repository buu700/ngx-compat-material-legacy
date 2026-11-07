/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [helper,dist,output,variant]=process.argv.slice(2);
const {withChromium}=await import(pathToFileURL(helper));
let result;
await withChromium(dist,async({evaluate,browser})=>{
 for(let i=0;i<100 && !(await evaluate('!!window.lab || !!document.getElementById("bootstrap-error")'));i++) await new Promise(r=>setTimeout(r,100));
 const data=await evaluate(`(()=>{const error=document.getElementById('bootstrap-error')?.textContent;if(error)return {error};const app=window.lab;if(!app)return {error:'timeout'};return Object.fromEntries(['legacy','current'].map(name=>{const host=document.querySelector('case-'+name),outer=host.querySelector('#raw-outer'),inner=outer.querySelector('#raw-inner');return [name,{...app[name].first.inspect(),text:[outer.querySelector('tbody > tr > td')?.firstChild?.textContent.trim(),inner.querySelector('tbody > tr > td')?.textContent.trim(),outer.querySelector('thead > tr > th')?.textContent.trim(),outer.querySelector('tfoot > tr > td')?.textContent.trim()]}]}))})()`);
 result={browser,data};
},{debugPort:0,requireAnnouncedEndpoint:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
assert.ok(!result.data.error,result.data.error);
for(const name of ['legacy','current']){
 const x=result.data[name];
 assert.equal(x.instances,6); assert.equal(x.owners,6);
 assert.deepEqual(x.counts,[2,1,1,2]); assert.deepEqual(x.text,['Outer','Inner','Header','Footer']);
 assert.equal(x.associations.length,6); assert.ok(x.associations.every(a=>a.count===1));
 if(variant==='good') assert.ok(x.associations.every(a=>a.match),name+' nearest table association');
 else assert.ok(x.associations.some(a=>!a.match),name+' must reject null association');
}
