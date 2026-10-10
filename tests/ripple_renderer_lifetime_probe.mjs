/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='projects/ngx-material-legacy/legacy-core/ripple/ripple-renderer.ts',source=readFileSync(join(root,path),'utf8');
const capsule=readFileSync(join(root,'compatibility/rc/ripple-event-manager-original-subjects.json'));
assert.equal(hash(capsule),'a3046ffb6a2d56c93fa9e22c7a325d6e20822c00720d24a5c74a8c39dd5cf775');
const record=JSON.parse(capsule).sources[0],tag=gunzipSync(Buffer.from(record.gzip_base64,'base64')).toString();
assert.equal(hash(tag),record.sha256);
const tree=ts.createSourceFile('tag.mjs',tag,ts.ScriptTarget.Latest,true),names=['RippleRef','RippleRenderer','distanceToFurthestCorner'];
const original=names.map(name=>{const node=tree.statements.find(n=>(ts.isClassDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.text===name);assert.ok(node,name);return node.getText(tree);}).join('\n');
const emit=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const priorCommit=JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')
 ?'0deeb4add8eb2292f3cc0960701c74c264cb119f':'93f5f38af60fe8af6fc1d5566ac40b96d2a0aa22';
const prior=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show',priorCommit+':'+path],{cwd:root,encoding:'utf8'});
const publicSignatures=s=>{const tree=ts.createSourceFile('renderer.ts',s,ts.ScriptTarget.Latest,true);
 const declaration=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='LegacyRippleRenderer');
 return declaration.members.filter(n=>!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword))
  .map(n=>n.getText(tree).slice(0,n.body?n.body.pos-n.pos:undefined).replace(/\s+/g,' ').trim());};
assert.deepEqual(publicSignatures(source),publicSignatures(prior));
function fixture(candidate=true,candidateSource=source){
 let now=0,next=0,outsideDepth=0;const timers=new Map(),cancelled=[],writes=[],scheduled=[];
 class Element {
  constructor(){this.listeners=new Map();this.children=[];this.classList={add(){}};this.style=new Proxy({}, {set:(target,key,value)=>{writes.push([key,value]);target[key]=value;return true;}});}
  getBoundingClientRect(){return {left:0,top:0,right:100,bottom:48,width:100,height:48};}
  appendChild(element){this.children.push(element);element.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
  addEventListener(type,handler){this.listeners.set(type,handler);}
  removeEventListener(type,handler){if(this.listeners.get(type)===handler)this.listeners.delete(type);}
  fire(type){this.listeners.get(type)?.({type});}
 }
 const element=new Element(),zone={runOutsideAngular:fn=>{outsideDepth++;try{return fn();}finally{outsideDepth--;}}},platform={isBrowser:true};
 const setTimeout=(fn,delay)=>{const id=next++;scheduled.push({id,delay,outside:outsideDepth>0});timers.set(id,{fn,due:now+delay});return id;};
 const clearTimeout=id=>{cancelled.push(id);timers.delete(id);};
 const window={getComputedStyle:()=>({transitionProperty:'transform, opacity',transitionDuration:'0.225s, 0.15s'})};
 const document={createElement:()=>new Element()},manager=class{addHandler(){}removeHandler(){}};
 const external={'@angular/core':{},'@angular/cdk/platform':{normalizePassiveListenerOptions:x=>x},
  '@angular/cdk/a11y':{isFakeMousedownFromScreenReader:()=>false,isFakeTouchstartFromScreenReader:()=>false},
  '@angular/cdk/coercion':{coerceElement:x=>x},'./ripple-event-manager':{LegacyRippleEventManager:manager}};
 let Renderer;
 if(candidate){const refs={};new Function('exports',emit(readFileSync(join(root,'projects/ngx-material-legacy/legacy-core/ripple/ripple-ref.ts'),'utf8')))(refs);external['./ripple-ref']=refs;
  const out={};new Function('exports','require','window','document','setTimeout','clearTimeout',emit(candidateSource))(out,s=>external[s],window,document,setTimeout,clearTimeout);Renderer=out.LegacyRippleRenderer;
 }else Renderer=new Function('RippleEventManager','coerceElement','isFakeMousedownFromScreenReader','isFakeTouchstartFromScreenReader',
  'defaultRippleAnimationConfig','passiveCapturingEventOptions','pointerDownEvents','pointerUpEvents','ignoreMouseEventsTimeout','window','document',
  original+'\nreturn RippleRenderer;')(manager,x=>x,()=>false,()=>false,{enterDuration:225,exitDuration:150},{capture:true,passive:true},
    ['mousedown','touchstart'],['mouseup','mouseleave','touchend','touchcancel'],800,window,document);
 const renderer=new Renderer({rippleConfig:{},rippleDisabled:false},zone,element,platform);renderer.setupTriggerEvents(element);
 const advance=ms=>{now+=ms;for(let count=0;count<20;count++){const due=[...timers].filter(([,row])=>row.due<=now);if(!due.length)return;for(const[id,row]of due){if(!timers.has(id))continue;timers.delete(id);row.fn();}}throw Error('Timer loop');};
 return{renderer,element,timers,writes,cancelled,scheduled,advance,down(){renderer.handleEvent({type:'mousedown',clientX:10,clientY:10,buttons:1});return element.children[0];},
  up(){renderer.handleEvent({type:'mouseup'});},capture(){return [...timers.values()].map(row=>row.fn);}};
}
function held(candidate=true,sourceOverride=source){const f=fixture(candidate,sourceOverride),ripple=f.down();f.advance(400);
 assert.equal(f.element.children.length,1,'Held pointer ripple removed before release');return{f,ripple};}
function lifecycle(candidate=true,sourceOverride=source){const{f,ripple}=held(candidate,sourceOverride);if(!candidate)ripple.fire('transitionend');
 f.up();if(candidate)f.advance(250);else ripple.fire('transitionend');assert.equal(f.element.children.length,0);assert.equal(ripple.listeners.size,0);assert.equal(f.timers.size,0);}
function persistent(candidate=true,sourceOverride=source){const f=fixture(candidate,sourceOverride),ref=f.renderer.fadeInRipple(10,10,{persistent:true});
 f.advance(500);assert.equal(f.element.children.length,1,'Persistent ripple removed by enter fallback');if(!candidate)ref.element.fire('transitionend');
 ref.fadeOut();if(candidate)f.advance(250);else ref.element.fire('transitionend');assert.equal(f.element.children.length,0);}
function stale(sourceOverride=source){const f=fixture(true,sourceOverride),ripple=f.down(),callbacks=f.capture();ripple.fire('transitioncancel');assert.equal(f.timers.size,0);
 const before=f.writes.length;for(const callback of callbacks)callback();assert.equal(f.writes.length,before);assert.equal(f.element.children.length,0);}
function exitFallback(sourceOverride=source){const f=fixture(true,sourceOverride),ripple=f.down();ripple.fire('transitionend');assert.equal(f.timers.size,0);
 f.up();assert.equal(f.timers.size,1);assert.equal(f.scheduled.at(-1).delay,250);assert.equal(f.scheduled.at(-1).outside,true);
 f.advance(249);assert.equal(f.element.children.length,1);f.advance(1);assert.equal(f.element.children.length,0);}
function earlyRelease(sourceOverride=source){const f=fixture(true,sourceOverride),ripple=f.down();f.advance(50);f.up();
 f.advance(275);assert.equal(f.element.children.length,1);assert.equal(f.timers.size,1);
 f.advance(250);assert.equal(f.element.children.length,0);assert.equal(ripple.listeners.size,0);}
function nativeCompletes(sourceOverride=source){const f=fixture(true,sourceOverride),ripple=f.down();ripple.fire('transitionend');f.up();
 const callbacks=f.capture();ripple.fire('transitionend');assert.equal(f.timers.size,0);const writes=f.writes.length;
 for(const callback of callbacks)callback();assert.equal(f.writes.length,writes);assert.equal(f.element.children.length,0);assert.ok(f.cancelled.includes(0));}
function independent(sourceOverride=source){const f=fixture(true,sourceOverride),first=f.renderer.fadeInRipple(1,1,{persistent:true}),second=f.renderer.fadeInRipple(2,2,{persistent:true});
 first.element.fire('transitioncancel');assert.equal(f.timers.size,1);f.advance(400);assert.equal(f.element.children.length,1);
 second.fadeOut();f.advance(250);assert.equal(f.element.children.length,0);}
function staleEnter(sourceOverride=source){const f=fixture(true,sourceOverride);f.down();const [enter]=f.capture();f.up();f.advance(325);
 assert.equal(f.element.children.length,1);assert.equal(f.timers.size,1);enter();assert.equal(f.element.children.length,1);
 f.advance(250);assert.equal(f.element.children.length,0);}
const baseline=process.argv.includes('--baseline');
if(baseline){
 held(false);let defect='';try{held(true,prior);}catch(error){defect=error.message;}assert.match(defect,/Held pointer ripple removed/);
 console.log(JSON.stringify({tagged_held_ripple_retained:true,candidate_held_ripple_removed:true,prior_commit:priorCommit,prior_source_sha256:hash(prior),defect,scope:'Whole authentic tagged renderer/ref and whole prior owned renderer/ref business source with explicit DOM/timer/zone/manager/helper protocols; no native or genuine framework execution.'}));
}else{
 lifecycle(false);lifecycle();persistent(false);persistent();stale();exitFallback();earlyRelease();nativeCompletes();independent();staleEnter();
 const change=(a,b)=>{assert.equal(source.split(a).length,2,a);return source.replace(a,b);};
 const mutants=[
  ['enter-destructive',()=>held(true,change('onTransitionEnd();\n          }\n        }, enterDuration + 100)','onTransitionCancel();\n          }\n        }, enterDuration + 100)'))],
  ['exit-no-fallback',()=>exitFallback(change('eventListeners.fallbackTimer = setTimeout(','eventListeners.fallbackTimer = ((..._args) => null)('))],
  ['exit-premature',()=>exitFallback(change('animationConfig.exitDuration + 100','animationConfig.exitDuration'))],
  ['enter-stale-state',()=>staleEnter(change('if (rippleRef.state === LegacyRippleState.FADING_IN) {\n            onTransitionEnd();','if (true) {\n            onTransitionEnd();'))],
  ['exit-inside-zone',()=>exitFallback(change('this._ngZone.runOutsideAngular(() => {\n          eventListeners.fallbackTimer','(() => {\n          eventListeners.fallbackTimer').replace('          );\n        });','          );\n        })();'))],
 ];
 for(const[id,action]of mutants)assert.throws(action,id);
 const report={schema_version:1,cases:10,mutations_rejected:mutants.length,original_whole_renderer_ref:true,candidate_whole_renderer_ref:true,
  public_constructor_and_member_signatures_unchanged:true,prior_commit:priorCommit,prior_source_sha256:hash(prior),
  sources:[path,'projects/ngx-material-legacy/legacy-core/ripple/ripple-ref.ts','tests/ripple_renderer_lifetime_probe.mjs'].map(path=>({path,sha256:hash(readFileSync(join(root,path)))})),
  tagged_core_sha256:record.sha256,scope:'Whole original/owned business classes; explicit DOM/CSS/timer/zone/manager/a11y/coercion protocols. No actual Angular node DI, public dependency runtime, native motion, packed/AOT/consumer or full floors.'};
 const output=process.argv.find(arg=>arg.endsWith('.json'));if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({cases:10,mutations_rejected:mutants.length,native_or_framework_executed:false}));
}
