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
import {tabCompletionMotionOkay, tabCompletionOriginOkay} from '../scripts/upstream-tab-completion-evidence.mjs';
import {tabCompletionMotionSample} from './tab_completion_sample.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const raw=readFileSync(resolve(root,'scripts/native-motion-consumer.ts'),'utf8');
const ast=ts.createSourceFile('producer.ts',raw,ts.ScriptTarget.Latest,true);
const owner=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='MotionRoot');
const method=owner.members.find(node=>node.name?.getText(ast)==='measureTabs');
assert.ok(method);
const subject=method.getText(ast),cases=[];
async function run({mode='enabled',zero=false,outputs=1,failDispatch=false,nativeEnds=true,early=false,
  departureEnds=true,departureHidden=false,departureEmpty=false,originThrows=false}={}) {
  const subscriptions=new Set(),events=[];let clock=0;
  const makeNode=label=>{
    const listeners=new Map();
    const node={textContent:label,isConnected:true,style:{visibility:'visible',display:'block'},classList:{contains:name=>name==='mat-tab-body-content'},listeners,
      getBoundingClientRect:()=>({width:320,height:20}),
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
      removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
      dispatchEvent(event){if(failDispatch)throw Error('dispatch failure');events.push(event);deliver(node,event);return true;}};
    return node;
  };
  const deliver=(node,event)=>{event.target=node;for(const listener of node.listeners.get(event.type)||[])listener(event);};
  const outgoing=makeNode('One'),el=makeNode('One');
  const sandbox={document:{querySelector:selector=>selector==='.mat-tab-body-animating'?null:el,querySelectorAll:()=>[outgoing,el]},
    performance:{now:()=>clock},getComputedStyle:node=>node.style,
    TransitionEvent:class {constructor(type,init){this.type=type;this.isTrusted=false;this.elapsedTime=0;Object.assign(this,init);}}};
  const emitted=ts.transpileModule('class Probe {'+subject+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Type=vm.runInNewContext(emitted+'; Probe',sandbox),probe=new Type();
  probe.ensureSurfaces=async()=>{};probe.wait=async()=>{};
  probe.waitFor=async predicate=>{if(!predicate())throw Error('unsettled completion');};
  probe.mode=()=>mode;probe.duration=()=>zero||mode!=='enabled'?0:500;
  const originCalls=[];
  probe.measureTabOrigin=async(direction,passedZero)=>{originCalls.push([direction,passedZero]);if(originThrows)throw Error('origin failure');
    return structuredClone(tabCompletionMotionSample(zero?'zero':mode).origins[direction]);};
  probe.tabs={animationDone:{subscribe(fn){subscriptions.add(fn);return {closed:false,unsubscribe(){this.closed=true;subscriptions.delete(fn);}};}},selectedIndex:0};
  probe.clickTab=label=>{
    el.textContent=label;if(label!=='Two')return;
    const notify=()=>{for(let i=0;i<outputs;i++)for(const fn of subscriptions)fn();};
    if(early){clock=1;notify();}
    if(mode==='enabled'&&!zero){
      clock=10;
      if(nativeEnds)deliver(el,{type:'transitionstart',isTrusted:true,propertyName:'transform',elapsedTime:0});
      if(departureHidden)outgoing.style.display='none';if(departureEmpty)outgoing.textContent='';
      if(departureEnds)deliver(outgoing,{type:'transitionstart',isTrusted:true,propertyName:'transform',elapsedTime:0});
      clock=510;
      if(nativeEnds)deliver(el,{type:'transitionend',isTrusted:true,propertyName:'transform',elapsedTime:0.5});
      if(departureEnds)deliver(outgoing,{type:'transitionend',isTrusted:true,propertyName:'transform',elapsedTime:0.5});
    }else clock=1;
    outgoing.style={visibility:'hidden',display:'none'};outgoing.textContent='';
    if(!early){clock++;notify();}
  };
  let value,error;
  try{value=await probe.measureTabs(zero);}catch(e){error=e.message;}
  return {value,error,subscriptions:subscriptions.size,events,originCalls,
    listeners:[outgoing,el].flatMap(node=>[...node.listeners.values()]).reduce((n,rows)=>n+rows.size,0)};
}
for(const [mode,zero]of [['enabled',false],['provider-disabled',false],['reduced',false],['enabled',true]]) {
  const result=await run({mode,zero}),suffix=zero?'zero':mode;
  assert.equal(result.error,undefined);assert.equal(result.subscriptions,0);assert.equal(result.events.length,4);
  assert.deepEqual(result.originCalls,[['left',zero],['right',zero]]);
  assert.equal(result.listeners,0);assert.equal(tabCompletionMotionOkay(result.value.observation,suffix),true);
  assert.ok(result.events.every(event=>event.type==='transitionend'&&event.propertyName==='transform'&&event.bubbles));
  assert.equal(result.value.key,'tabs/'+suffix);assert.equal(result.value.notify.key,'tabs/animationDone/'+suffix);
  assert.deepEqual(result.value.notify.observation,result.value.observation);
  for(const group of ['enabled-disabled-reduced','exactly-once-notification']) {
    const id='native-motion/'+SOURCE_LINE+'/chromium/zoneful/'+group+'/tabs/'+(group==='exactly-once-notification'?'animationDone/':'')+suffix;
    assert.deepEqual(assertCase(id,{...result.value.observation,angularZoneEntered:true}),[]);
  }
  cases.push({id:'complete-producer-'+suffix,result:'pass'});
}
const duplicate=await run({outputs:2});assert.equal(duplicate.value.observation.notifications,2);
assert.deepEqual(assertCase('native-motion/'+SOURCE_LINE+'/chromium/zoneful/exactly-once-notification/tabs/animationDone/enabled',{...duplicate.value.observation,angularZoneEntered:true}),['emitted more than once']);
assert.equal(duplicate.subscriptions,0);cases.push({id:'actual-double-output-is-rejected',result:'pass'});
for(const options of [{outputs:0},{failDispatch:true},{originThrows:true}]) {
 const result=await run(options);assert.ok(result.error);assert.equal(result.subscriptions,0);assert.equal(result.listeners,0);
 cases.push({id:options.originThrows?'origin-error-cleans-selection-observers':options.failDispatch?'event-dispatch-error-unsubscribes':'missing-completion-unsubscribes',result:'pass'});
}
for(const [id,options]of [['missing-real-native-end-is-not-enabled-motion',{nativeEnds:false}],['early-completion-before-native-end-is-rejected',{early:true}],['missing-departure-native-end-is-rejected',{departureEnds:false}],['hidden-departure-at-start-is-rejected',{departureHidden:true}],['missing-departure-content-at-start-is-rejected',{departureEmpty:true}]]){
 const result=await run(options);assert.equal(result.error,undefined);assert.equal(tabCompletionMotionOkay(result.value.observation,'enabled'),false);
 assert.equal(result.subscriptions,0);assert.equal(result.listeners,0);cases.push({id,result:'pass'});
}
const originMethod=owner.members.find(node=>node.name?.getText(ast)==='measureTabOrigin');assert.ok(originMethod);
const originSubject=originMethod.getText(ast);
async function runOrigin({direction='left',mode='enabled',zero=false,outputs=1,nativeEnds=true,early=false,
  hidden=false,height=90,failDispatch=false,existing=false,foreignEvents=false}={}) {
  const subscriptions=new Set(),listeners=new Map(),events=[];let clock=0,created=false;
  const label=direction==='left'?'OriginLeft':'OriginRight';
  const node={textContent:label,isConnected:true,classList:{contains:name=>name==='mat-tab-body-content'},
    getBoundingClientRect:()=>({width:320,height:90}),
    dispatchEvent(event){if(failDispatch)throw Error('origin dispatch failure');events.push(event);deliver({...event,target:node});return true;}};
  const initialNode={textContent:direction==='left'?'Three':'One'};let active=initialNode;
  const deliver=event=>{for(const listener of listeners.get(event.type)||[])listener(event);};
  const wrapper={isConnected:true,style:{height:'90px'},querySelectorAll:()=>existing?[node]:[],getBoundingClientRect:()=>({height:90}),
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
  const sandbox={document:{querySelector:selector=>selector==='.mat-tab-body-wrapper'?wrapper:selector==='.mat-tab-body-animating'?null:active},
    performance:{now:()=>clock},getComputedStyle:()=>({visibility:hidden?'hidden':'visible',display:hidden?'none':'block'}),
    TransitionEvent:class {constructor(type,init){this.type=type;this.isTrusted=false;this.elapsedTime=0;Object.assign(this,init);}}};
  const emitted=ts.transpileModule('class Probe {'+originSubject+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Type=vm.runInNewContext(emitted+'; Probe',sandbox),probe=new Type();
  const left={set:value=>{if(value)created=true;}},right={set:value=>{if(value)created=true;}};
  probe.tabOriginLeft=left;probe.tabOriginRight=right;probe.tabOriginDynamicHeight={set(){}};
  probe.wait=async()=>{};probe.waitFor=async predicate=>{if(!predicate())throw Error('unsettled origin');};
  probe.clickTab=()=>{};probe.mode=()=>mode;probe.duration=()=>zero||mode!=='enabled'?0:500;
  probe.tabs={animationDone:{subscribe(fn){subscriptions.add(fn);return {closed:false,unsubscribe(){this.closed=true;subscriptions.delete(fn);}};}},
    set selectedIndex(value){if(!created||subscriptions.size===0)return;assert.equal(value,direction==='left'?0:3);active=node;
      const notify=()=>{for(let i=0;i<outputs;i++)for(const fn of subscriptions)fn();};
      if(early){clock=1;notify();}
      if(nativeEnds&&!zero&&mode==='enabled'){
        wrapper.style.height=height+'px';clock=10;
        if(foreignEvents)deliver({type:'transitionend',isTrusted:true,propertyName:'transform',elapsedTime:0.5,target:{textContent:label,classList:{contains:()=>false}}});
        deliver({type:'transitionstart',isTrusted:true,propertyName:'transform',elapsedTime:0,target:node});clock=510;
        deliver({type:'transitionend',isTrusted:true,propertyName:'transform',elapsedTime:0.5,target:node});
      }else clock=1;
      if(!early){clock++;notify();}
    }};
  let value,error;try{value=await probe.measureTabOrigin(direction,zero);}catch(e){error=e.message;}
  return {value,error,subscriptions:subscriptions.size,events,listeners:[...listeners.values()].reduce((n,rows)=>n+rows.size,0)};
}
for(const direction of ['left','right'])for(const [mode,zero] of [['enabled',false],['provider-disabled',false],['reduced',false],['enabled',true]]){
 const result=await runOrigin({direction,mode,zero,foreignEvents:true});assert.equal(result.error,undefined);
 assert.equal(result.subscriptions,0);assert.equal(result.listeners,0);assert.equal(result.events.length,2);
 assert.equal(tabCompletionOriginOkay(result.value,zero?'zero':mode,direction),true);
 cases.push({id:'complete-origin-producer-'+direction+'-'+(zero?'zero':mode),result:'pass'});
}
for(const [id,options]of [['missing-origin-native-end',{nativeEnds:false}],['early-origin-completion',{early:true}],
 ['wrong-origin-height',{height:0}],['double-origin-output',{outputs:2}]]){
 const result=await runOrigin(options);assert.equal(result.error,undefined);assert.equal(tabCompletionOriginOkay(result.value,'enabled','left'),false);
 assert.equal(result.subscriptions,0);assert.equal(result.listeners,0);cases.push({id:id+'-rejected',result:'pass'});
}
for(const [id,options]of [['missing-origin-output',{outputs:0}],['hidden-origin',{hidden:true}],['origin-dispatch-failure',{failDispatch:true}],['existing-origin-body',{existing:true}]]){
 const result=await runOrigin(options);assert.ok(result.error);assert.equal(result.subscriptions,0);assert.equal(result.listeners,0);
 cases.push({id:id+'-cleans-observers',result:'pass'});
}
const report={schema_version:1,scope:'Complete authored producer method execution with synthetic DOM/services; no Angular/browser/packed/minimum qualification.',source_sha256:createHash('sha256').update(raw).digest('hex'),method_sha256:createHash('sha256').update(subject).digest('hex'),origin_method_sha256:createHash('sha256').update(originSubject).digest('hex'),node:process.version,typescript:ts.version,cases,native_executed:false};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:cases.length,native_executed:false}));
