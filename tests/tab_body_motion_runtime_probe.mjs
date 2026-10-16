/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Owned source lifecycle diagnostic; deterministic clock/synthetic DOM, not native qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const url=name=>pathToFileURL(require.resolve(name)).href,load=name=>import(url(name));
await load('@angular/compiler');const core=await load('@angular/core'),{Subject}=await load('rxjs');
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const emit=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_m,_q,name)=>JSON.stringify(url(name)));
const flags=await import(data(emit(readFileSync(resolve(root,'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'),'utf8'))));
const raw=readFileSync(resolve(root,'projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts'),'utf8');
export async function ownedType(source=raw){return (await import(data(emit(source).replaceAll("'@ngx-compat/material-legacy/legacy-core'",JSON.stringify(data(emit(readFileSync(resolve(root,'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'),'utf8'))))))))._MatTabBodyBase;}
const Type=await ownedType();
const originalPath='reference/material-16.2.14/component-motion-sources/tabs/tab-body.ts';
const originalRaw=readFileSync(resolve(root,originalPath),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(originalRaw),'b8cae68f00521586ecf1b69d3bce277c3e1eeba35997b05b91223b1ffcbdfaf7');
const originalFile=ts.createSourceFile('original-tab-body.ts',originalRaw,ts.ScriptTarget.Latest,true);
const originalOwner=originalFile.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='_MatTabBodyBase');
assert.ok(originalOwner);
// Keep the complete untouched historical base. Remove unrelated portal/component declarations;
// transpilation erases its unused type imports. Borrowed framework execution is diagnostic only.
const originalImports=originalFile.statements.filter(ts.isImportDeclaration).filter(node=>
 ['@angular/core','@angular/cdk/portal','@angular/cdk/bidi','rxjs','rxjs/operators'].includes(node.moduleSpecifier.text));
const originalProgram=originalImports.map(node=>node.getText(originalFile)).join('\n')+'\n'+originalOwner.getText(originalFile);
const OriginalType=(await import(data(emit(originalProgram))))._MatTabBodyBase;
function clock(){
 const original=[globalThis.setTimeout,globalThis.clearTimeout],timers=new Map();let id=0,now=0;
 globalThis.setTimeout=(run,delay=0)=>{const key=++id;timers.set(key,{run,delay,due:now+delay});return key;};globalThis.clearTimeout=key=>timers.delete(key);
 return {timers,advance(delta){const end=now+delta;let count=0;while(true){const entry=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!entry)break;assert.ok(++count<100,'unbounded timers');timers.delete(entry[0]);now=entry[1].due;entry[1].run();}now=end;},restore(){[globalThis.setTimeout,globalThis.clearTimeout]=original;}};
}
function fixture(Type,mode='manual',zone=null){
 const dom={trace:[],layouts:0,onLayout:null},c=clock(),classes=new Set(),writes=[],host={get clientHeight(){dom.trace.push('height');return 123;},classList:{add:n=>{writes.push(['add',n]);classes.add(n);},remove:n=>{writes.push(['remove',n]);classes.delete(n);},toggle(n,force){writes.push(['toggle',n,force]);const yes=force===undefined?!classes.has(n):!!force;if(yes)classes.add(n);else classes.delete(n);return yes;}}};
 const dir={value:'ltr',change:new Subject()},detector={marks:0,markForCheck(){this.marks++;}},element=new core.ElementRef(host),content=new core.ElementRef({style:{visibility:'',removeProperty(name){assert.equal(name,'visibility');dom.trace.push('reveal');this.visibility='';}},getBoundingClientRect(){dom.trace.push('layout');dom.layouts++;dom.onLayout?.();return {width:320,height:123};}}),injector=core.Injector.create({providers:[{provide:flags.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:mode==='manual'?'enabled':mode},{provide:core.NgZone,useValue:zone}]});
 let body;try{body=mode==='manual'?new Type(element,dir,detector):core.runInInjectionContext(injector,()=>new Type(element,dir,detector));}catch(error){injector.destroy();c.restore();throw error;}
 body._contentElement=content;const before=[],height=[],done=[],center=[],left=[];
 body._beforeCentering.subscribe(v=>before.push(v));body._onCentering.subscribe(v=>height.push(v));body._translateTabComplete.subscribe(v=>done.push(v));body._onCentered.subscribe(()=>center.push('center'));body._afterLeavingCenter.subscribe(()=>left.push('left'));
 return {body,c,dom,content:content.nativeElement,classes,writes,dir,detector,before,height,done,center,left,start(target=content.nativeElement,propertyName='transform'){body._onContentTransitionStart({target,propertyName});},end(target=content.nativeElement,propertyName='transform'){body._onContentTransitionEnd({target,propertyName});},close(){try{body.ngOnDestroy();injector.destroy();}finally{c.restore();}}};
}
export function observations(Type){
 const cases=[];function check(id,run){try{run();cases.push({id,result:'pass'});}catch(error){cases.push({id,result:'fail',error:String(error.message).slice(0,500)});}}
 check('initial-centered-body-completes-once',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();assert.deepEqual(f.height,[123]);f.end();f.end();f.c.advance(1000);assert.deepEqual(f.center,['center']);assert.equal(f.done.length,1);}finally{f.close();}});
 check('historical-completion-subject-suppresses-duplicate-output',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();f.end();f.body._translateTabComplete.next({fromState:'void',toState:'center'});f.c.advance(0);assert.deepEqual(f.center,['center']);}finally{f.close();}});
 check('fallback-schedules-outside-and-completes-through-public-zone-run',()=>{const calls=[],zone={runOutsideAngular(fn){calls.push('outside');return fn();},run(fn){calls.push('inside');return fn();}},f=fixture(Type,'enabled',zone);try{f.body.position=-1;f.body.ngOnInit();f.body.position=0;assert.deepEqual(calls,['outside']);f.c.advance(600);assert.deepEqual(calls,['outside','inside']);assert.equal(f.done.length,1);}finally{f.close();}});
 check('default-duration-does-not-complete-at-100ms',()=>{const f=fixture(Type);try{f.body.position=-1;f.body.ngOnInit();f.body.position=0;f.c.advance(100);assert.equal(f.done.length,0);f.c.advance(399);assert.equal(f.done.length,0);f.c.advance(101);assert.equal(f.done.length,1);f.c.advance(0);assert.deepEqual(f.center,['center']);}finally{f.close();}});
 for(const duration of ['250ms','0.25s','1200ms'])check('configured-duration-'+duration,()=>{const f=fixture(Type);try{f.body.animationDuration=duration;f.body.position=0;f.body.ngOnInit();f.end();f.c.advance(0);f.done.length=0;f.center.length=0;f.before.length=0;f.height.length=0;f.body.position=1;const expected=duration==='1200ms'?1200:250;f.c.advance(expected-1);assert.equal(f.left.length,0);f.c.advance(101);assert.deepEqual(f.left,['left']);}finally{f.close();}});
 check('native-completion-cancels-fallback-and-rejects-duplicates',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();f.end();f.c.advance(0);f.done.length=0;f.center.length=0;f.before.length=0;f.height.length=0;f.body.position=1;f.start();f.end();f.end();f.c.advance(1000);assert.deepEqual(f.left,['left']);assert.equal(f.done.length,1);assert.equal(f.classes.has('mat-tab-body-animating'),false);}finally{f.close();}});
 check('start-notifications-once-per-transition',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.body.position=0;f.start();f.start();assert.deepEqual(f.before,[true]);assert.deepEqual(f.height,[123]);}finally{f.close();}});
 check('wrong-target-and-property-do-not-complete',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();f.end();f.c.advance(0);f.done.length=0;f.center.length=0;f.before.length=0;f.height.length=0;f.body.position=1;f.end({},'transform');f.end(undefined,'opacity');assert.equal(f.done.length,0);f.end();assert.equal(f.done.length,1);}finally{f.close();}});
 check('reversal-cancels-stale-fallback',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();f.end();f.c.advance(0);f.done.length=0;f.center.length=0;f.before.length=0;f.height.length=0;f.body.position=1;const stale=[...f.c.timers.values()][0].run;f.body.position=0;stale();assert.equal(f.done.length,0);f.c.advance(1000);assert.equal(f.left.length,0);assert.equal(f.done.length,1);assert.deepEqual(f.center,['center']);}finally{f.close();}});
 check('repeated-position-keeps-current-transition',()=>{const f=fixture(Type);try{f.body.position=0;f.body.ngOnInit();f.end();f.c.advance(0);f.done.length=0;f.center.length=0;f.before.length=0;f.height.length=0;f.body.position=1;f.body.position=1;assert.deepEqual(f.before,[false]);assert.equal(f.body._previousPosition,'center');f.end();assert.deepEqual(f.left,['left']);assert.deepEqual(f.done,[{fromState:'center',toState:'right'}]);}finally{f.close();}});
 check('destroy-cancels-stale-timer-and-events',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.body.position=0;const stale=[...f.c.timers.values()][0].run;const before=f.before.length;f.body.ngOnDestroy();const writes=f.writes.length;assert.equal(f.c.timers.size,0);stale();f.start();f.end();f.body.position=1;f.dir.change.next('rtl');assert.equal(f.before.length,before);assert.equal(f.writes.length,writes);assert.equal(f.done.length,0);assert.equal(f.detector.marks,0);}finally{f.close();}});
 check('direction-state-and-teardown',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();assert.equal(f.body._position,'right');f.dir.value='rtl';f.dir.change.next('rtl');assert.equal(f.body._position,'left');assert.equal(f.detector.marks,1);f.body.ngOnDestroy();f.dir.change.next('ltr');assert.equal(f.detector.marks,1);}finally{f.close();}});
 for(const [mode,duration] of [['di-disabled','500ms'],['reduced-motion','500ms'],['manual','0ms'],['manual','0s']])check(mode+'-'+duration+'-deferred-single-completion',()=>{const f=fixture(Type,mode);try{f.body.animationDuration=duration;f.body.position=1;f.body.ngOnInit();f.c.advance(0);const initial=f.done.length;f.body.position=0;assert.equal(f.body.animationDuration,'0ms');assert.equal(f.done.length,initial);f.c.advance(0);f.end();assert.equal(f.done.length,initial+1);assert.deepEqual(f.center,['center']);}finally{f.close();}});
 for(const origin of [-1,1])check('origin-center-'+origin,()=>{const f=fixture(Type);try{f.body.position=0;f.body.origin=origin;f.body.ngOnInit();assert.equal(f.body._position,origin<0?'left-origin-center':'right-origin-center');f.end();f.c.advance(0);assert.deepEqual(f.center,['center']);assert.equal(f.height.length,1);}finally{f.close();}});
 check('reentrant-start-cannot-schedule-obsolete-phase',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();const sub=f.body._beforeCentering.subscribe(v=>{if(v)f.body.position=1;});f.body.position=0;f.c.advance(1000);assert.equal(f.center.length,0);assert.equal(f.done.length,1);assert.deepEqual(f.done[0],{fromState:'center',toState:'right'});sub.unsubscribe();}finally{f.close();}});
 check('incoming-hidden-pane-layout-precedes-height',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.content.style.visibility='hidden';const sub=f.body._beforeCentering.subscribe(v=>{if(v)f.dom.trace.push('attach');});f.body.position=0;assert.deepEqual(f.dom.trace,['attach','reveal','layout','height']);assert.equal(f.content.style.visibility,'');assert.equal(f.dom.layouts,1);assert.equal(f.done.length,0);sub.unsubscribe();}finally{f.close();}});
 check('already-visible-pane-needs-no-layout-flush',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.body.position=0;assert.deepEqual(f.dom.trace,['height']);assert.equal(f.dom.layouts,0);}finally{f.close();}});
 check('initial-center-before-content-query-is-safe',()=>{const f=fixture(Type);try{delete f.body._contentElement;f.body.position=0;f.body.ngOnInit();assert.deepEqual(f.height,[123]);assert.equal(f.dom.layouts,0);f.c.advance(600);assert.equal(f.done.length,1);}finally{f.close();}});
 check('disabled-hidden-pane-is-revealed-before-height',()=>{const f=fixture(Type,'di-disabled');try{f.body.position=1;f.body.ngOnInit();f.c.advance(0);f.dom.trace.length=0;f.content.style.visibility='hidden';f.body.position=0;assert.deepEqual(f.dom.trace,['reveal','layout','height']);assert.equal(f.content.style.visibility,'');f.c.advance(0);assert.deepEqual(f.center,['center']);}finally{f.close();}});
 check('destroy-in-before-centering-does-not-touch-content',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.content.style.visibility='hidden';const sub=f.body._beforeCentering.subscribe(v=>{if(v)f.body.ngOnDestroy();});f.body.position=0;assert.deepEqual(f.dom.trace,[]);assert.equal(f.content.style.visibility,'hidden');assert.equal(f.c.timers.size,0);sub.unsubscribe();}finally{f.close();}});
 check('reentrant-before-centering-cannot-reveal-obsolete-pane',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.content.style.visibility='hidden';const sub=f.body._beforeCentering.subscribe(v=>{if(v)f.body.position=1;});f.body.position=0;assert.deepEqual(f.dom.trace,[]);assert.equal(f.content.style.visibility,'hidden');assert.equal(f.c.timers.size,1);sub.unsubscribe();}finally{f.close();}});
 check('reentrant-layout-cannot-emit-obsolete-centering',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.content.style.visibility='hidden';f.dom.onLayout=()=>{f.body.position=1;};f.body.position=0;assert.deepEqual(f.dom.trace,['reveal','layout']);assert.deepEqual(f.height,[]);assert.equal(f.c.timers.size,1);f.c.advance(600);assert.deepEqual(f.done,[{fromState:'center',toState:'right'}]);}finally{f.close();}});
 check('destroy-during-layout-cannot-schedule-or-emit',()=>{const f=fixture(Type);try{f.body.position=1;f.body.ngOnInit();f.content.style.visibility='hidden';f.dom.onLayout=()=>f.body.ngOnDestroy();f.body.position=0;assert.deepEqual(f.dom.trace,['reveal','layout']);assert.deepEqual(f.height,[]);assert.equal(f.c.timers.size,0);}finally{f.close();}});
 return cases;
}
function completionContract(Type){
 const rows=[];
 const scenarios=[
  ['duplicate-center',[['center','left','center'],['center','left','center']]],
  ['duplicate-leave',[['right','center','right'],['right','center','right']]],
  ['successive-real-round-trips',[['center','left','center'],['left','center','left'],['center','left','center'],['left','center','left'],['center','left','center']]],
  ['changed-source-state-is-distinct',[['center','left','center'],['center','right','center']]],
  ['changed-destination-state-is-distinct',[['center','left','center'],['center','left','left-origin-center']]],
  ['obsolete-center-event',[['left','left','center']]],
  ['obsolete-leaving-event',[['center','center','right']]],
  ['origin-center-states',[['left-origin-center','left','left-origin-center'],['left-origin-center','left','left-origin-center'],['right','left-origin-center','right'],['right-origin-center','right','right-origin-center']]],
 ];
 for(const [id,events]of scenarios){
  const f=fixture(Type);
  try{for(const [position,fromState,toState]of events){f.body._position=position;f.body._translateTabComplete.next({fromState,toState});}
   const centeredBeforeAsyncFlush=f.center.length;f.c.advance(0);
   rows.push({id,centeredBeforeAsyncFlush,centered:f.center.length,left:f.left.length,rawCompletions:f.done.length});
  }finally{f.close();}
 }
 return rows;
}
const referenceCompletion=completionContract(OriginalType),ownedCompletion=completionContract(Type);
assert.deepEqual(ownedCompletion,referenceCompletion,'complete historical output subscription contract');
const cases=observations(Type),mutants=[];
if(!process.argv.includes('--record-failures'))for(const [id,find,replacement] of [
 ['drop-historical-completion-filter',"      .pipe(distinctUntilChanged((a, b) => a.fromState === b.fromState && a.toState === b.toState))\n",""],
 ['early-fallback',"milliseconds + 100","100"],
 ['accept-stale-completion',"this._pendingTransition !== transition","false"],
 ['keep-completed-phase',"    this._pendingTransition = undefined;\n    this._elementRef.nativeElement.classList.remove","    this._elementRef.nativeElement.classList.remove"],
 ['repeat-position-overwrites-prior-state',"    if (position === this._position) {\n      return;\n    }",""],
 ['accept-events-after-destroy',"this._destroyed || !this._pendingTransition ||\n      event.target","event.target"],
 ['ignore-noop-duration',"this._cssAnimationsDisabled() ? 0 : milliseconds + 100","milliseconds + 100"],
 ['skip-zone-reentry',"this._ngZone.run(() => this._finishTransition(transition));","this._finishTransition(transition);"],
 ['keep-direction-subscription',"    this._dirChangeSubscription.unsubscribe();",""],
 ['keep-hidden-incoming-pane',"        content.style.removeProperty('visibility');",""],
 ['skip-incoming-layout-staging',"        content.getBoundingClientRect();",""],
 ['continue-obsolete-phase-after-layout',"      if (this._pendingTransition !== transition || this._destroyed) {\n        return;\n      }\n",""],
 ]){assert.ok(raw.includes(find),'mutation anchor missing: '+id);const bad=raw.replaceAll(find,replacement),failures=observations(await ownedType(bad)).filter(c=>c.result==='fail');assert.ok(failures.length,'mutant survived: '+id);mutants.push({id,result:'rejected',failed_case_ids:failures.map(c=>c.id)});}
const minimumPeerContrasts=[];
for(const cap of JSON.parse(readFileSync(resolve(root,'compatibility/rc/tab-completion-peer-sources/identities.json'),'utf8'))){
 const compressed=readFileSync(resolve(root,cap.retained.path));assert.equal(hash(compressed),cap.retained.sha256);
 const bytes=gunzipSync(compressed);assert.equal(hash(bytes),cap.member_sha256);assert.equal(bytes.length,cap.member_bytes);
 const file=ts.createSourceFile('peer-tabs.mjs',bytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const owner=file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='MatTabBody');
 const method=owner.members.find(node=>node.name?.getText(file)==='_transitionDone');assert.ok(method);
 const Peer=(await import(data('export class Peer {'+method.getText(file)+'}'))).Peer;
 const c=clock(),peer=new Peer(),center=[],left=[];
 peer._onCentered=new core.EventEmitter(true);peer._afterLeavingCenter=new core.EventEmitter();
 peer._onCentered.subscribe(()=>center.push('center'));peer._afterLeavingCenter.subscribe(()=>left.push('left'));
 try{peer._position='center';peer._previousPosition='left';peer._transitionDone();peer._transitionDone();c.advance(0);
  peer._position='right';peer._previousPosition='center';peer._transitionDone();peer._transitionDone();
  assert.deepEqual(center,['center','center']);assert.deepEqual(left,['left','left']);
  minimumPeerContrasts.push({line:cap.line,version:cap.version,member_sha256:cap.member_sha256,complete_method:method.getText(file),method_sha256:hash(method.getText(file)),duplicate_center_outputs:center.length,duplicate_leaving_outputs:left.length,
   scope:'Complete exact minimum peer method only, called on synthetic state/output receivers; no constructor/DI/native/minimum runtime qualification.'});
 }finally{c.restore();}
}
const completionMutant=completionContract(await ownedType(raw.replace('      .pipe(distinctUntilChanged((a, b) => a.fromState === b.fromState && a.toState === b.toState))\n','')));
assert.notDeepEqual(completionMutant,referenceCompletion,'removed upstream filter must change historical contract');
const result={minimum_peer_contrasts:minimumPeerContrasts,original_source:{path:originalPath,sha256:hash(originalRaw),extracted_complete_base_sha256:hash(originalProgram)},source_sha256:hash(raw),node:process.version,typescript:ts.version,borrowed_angular:core.VERSION.full,completion_contract:{reference:referenceCompletion,candidate:ownedCompletion,removed_filter:completionMutant},role:'Owned tab-body transpiled source with real Angular/rxjs; deterministic clock and synthetic DOM only',cases,mutants,passed:cases.filter(c=>c.result==='pass').length,failed:cases.filter(c=>c.result==='fail').length,native_browser_execution:false,packed_execution:false,actual21_execution:false};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n');
if(process.argv.includes('--record-failures'))console.log(JSON.stringify(result,null,2));else{assert.equal(result.failed,0,JSON.stringify(cases.filter(c=>c.result==='fail'),null,2));console.log(JSON.stringify(result,null,2));}
