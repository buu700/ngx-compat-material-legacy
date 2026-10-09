/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Executes the complete authored producer method with synthetic DOM/services only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {assertCase, SOURCE_LINE} from '../scripts/native-motion-roster.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const raw=readFileSync(resolve(root,'scripts/native-motion-consumer.ts'),'utf8');
const ast=ts.createSourceFile('producer.ts',raw,ts.ScriptTarget.Latest,true);
const owner=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='MotionRoot');
const method=owner.members.find(node=>node.name?.getText(ast)==='measureTabs');
assert.ok(method);
const subject=method.getText(ast),cases=[];
async function run({mode='enabled',zero=false,outputs=1,failDispatch=false}={}) {
  const subscriptions=new Set(),events=[];
  const el={textContent:'One',classList:{contains:name=>name==='mat-tab-body-content'},dispatchEvent(event){if(failDispatch)throw Error('dispatch failure');events.push(event);return true;}};
  const sandbox={document:{querySelector:selector=>selector==='.mat-tab-body-animating'?null:el},
    getComputedStyle:()=>({visibility:'visible'}),TransitionEvent:class {constructor(type,init){this.type=type;Object.assign(this,init);}}};
  const emitted=ts.transpileModule('class Probe {'+subject+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Type=vm.runInNewContext(emitted+'; Probe',sandbox),probe=new Type();
  probe.ensureSurfaces=async()=>{};probe.wait=async()=>{};
  probe.waitFor=async predicate=>{if(!predicate())throw Error('unsettled completion');};
  probe.mode=()=>mode;probe.duration=()=>zero||mode!=='enabled'?0:500;
  probe.tabs={animationDone:{subscribe(fn){subscriptions.add(fn);return {unsubscribe(){subscriptions.delete(fn);}};}},selectedIndex:0};
  probe.clickTab=label=>{el.textContent=label;if(label==='Two')for(let i=0;i<outputs;i++)for(const fn of subscriptions)fn();};
  let value,error;
  try{value=await probe.measureTabs(zero);}catch(e){error=e.message;}
  return {value,error,subscriptions:subscriptions.size,events};
}
for(const [mode,zero]of [['enabled',false],['provider-disabled',false],['reduced',false],['enabled',true]]) {
  const result=await run({mode,zero}),suffix=zero?'zero':mode;
  assert.equal(result.error,undefined);assert.equal(result.subscriptions,0);assert.equal(result.events.length,2);
  assert.ok(result.events.every(event=>event.type==='transitionend'&&event.propertyName==='transform'&&event.bubbles));
  assert.equal(result.value.key,'tabs/'+suffix);assert.equal(result.value.notify.key,'tabs/animationDone/'+suffix);
  assert.deepEqual(result.value.notify.observation,result.value.observation);
  for(const group of ['enabled-disabled-reduced','exactly-once-notification']) {
    const id='native-motion/'+SOURCE_LINE+'/chromium/zoneful/'+group+'/tabs/'+(group==='exactly-once-notification'?'animationDone/':'')+suffix;
    assert.deepEqual(assertCase(id,result.value.observation),[]);
  }
  cases.push({id:'complete-producer-'+suffix,result:'pass'});
}
const duplicate=await run({outputs:2});assert.equal(duplicate.value.observation.notifications,2);
assert.ok(assertCase('native-motion/'+SOURCE_LINE+'/chromium/zoneful/exactly-once-notification/tabs/animationDone/enabled',duplicate.value.observation).length);
assert.equal(duplicate.subscriptions,0);cases.push({id:'actual-double-output-is-rejected',result:'pass'});
for(const options of [{outputs:0},{failDispatch:true}]) {
 const result=await run(options);assert.ok(result.error);assert.equal(result.subscriptions,0);
 cases.push({id:options.failDispatch?'event-dispatch-error-unsubscribes':'missing-completion-unsubscribes',result:'pass'});
}
const report={schema_version:1,scope:'Complete authored producer method execution with synthetic DOM/services; no Angular/browser/packed/minimum qualification.',source_sha256:createHash('sha256').update(raw).digest('hex'),method_sha256:createHash('sha256').update(subject).digest('hex'),node:process.version,typescript:ts.version,cases,native_executed:false};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:cases.length,native_executed:false}));
