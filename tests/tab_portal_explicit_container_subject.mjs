/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Appended to the immutable Core view lab prelude. No fake public namespace. */
NodeProtocol.prototype.replaceChild=function(node,old){assert.ok(this.children.includes(old),'DOM replacement requires existing child');insert(this,node,old);remove(this,old);return old;};
const fs=await import('node:fs'),rx=await import('rxjs'),operators=await import('rxjs/operators');
class MatLegacyTabBodyProtocol{}
const original=line==='original'?(await import('@angular/material/legacy-tabs')).MatLegacyTabBodyPortal:null;
function load(kind='current',adapter='current'){
 if(original)return original;
 const values={'@angular/core':core,'@angular/common':common,'@angular/cdk/portal':portal,rxjs:rx,'rxjs/operators':operators},helperExports={},exports={};
 const require=name=>{assert.ok(Object.hasOwn(values,name),'unregistered source import '+name);return values[name];};
 const helperFile=adapter==='current'?'portal-adapter.cjs':'adapter-mutant-'+adapter+'.cjs';new Function('exports','require',fs.readFileSync(new URL('./'+helperFile,import.meta.url),'utf8'))(helperExports,require);values['./internal/tab-portal-construction-context']=helperExports;
 const file=kind==='current'?'portal-code.cjs':kind==='before'?'portal-before.cjs':'portal-mutant-'+kind+'.cjs';new Function('exports','require','MatLegacyTabBody',fs.readFileSync(new URL('./'+file,import.meta.url),'utf8'))(exports,require,MatLegacyTabBodyProtocol);
 return exports.MatLegacyTabBodyPortal;
}
function hostFor(owner,center=false){
 const entering=new rx.Subject(),leaving=new rx.Subject(),active={entering:0,leaving:0};
 const stream=(source,key)=>new rx.Observable(subscriber=>{active[key]++;const subscription=source.subscribe(subscriber);return()=>{active[key]--;subscription.unsubscribe();};});
 const host={_beforeCentering:stream(entering,'entering'),_afterLeavingCenter:stream(leaving,'leaving'),_position:center?'center':'left',_isCenterPosition:position=>position==='center',preserveContent:false,_content:new portal.TemplatePortal(owner.template,owner.container,{item:'explicit'})};
 return {host,entering,leaving,active};
}
function construct(Type,container,host,doc=document,ambient){
 const args=original?[app.injector.get(core.ComponentFactoryResolver),container,host,doc]:[container,host,doc];
 return ambient?core.runInInjectionContext(ambient,()=>Reflect.construct(Type,args)):Reflect.construct(Type,args);
}
function lifetime(Type,a,b,{manual=false,center=false}={}){
 const state=hostFor(b,center),value=construct(Type,b.container,state.host,document,manual?undefined:a.injector);let first;
 try{
  assert.ok(value instanceof Type);assert.ok(value instanceof portal.CdkPortalOutlet);assert.equal(value.constructor.length,original?4:3);
  value.ngOnInit();assert.equal(a.container.length,0,'ambient container is untouched');assert.equal(b.container.length,center?1:0,'initial center attachment');
  state.entering.next(true);assert.equal(a.container.length,0,'caller container owns the view');assert.equal(b.container.length,1);assert.equal(value.hasAttached(),true);first=b.container.get(0);first.detectChanges();assert.equal(rendered(first),'explicit/declaration');
  state.entering.next(true);assert.equal(b.container.length,1,'repeated entry is idempotent');assert.ok(b.container.get(0).context===first.context,'same attached context');
  state.host.preserveContent=true;state.leaving.next();assert.equal(first.destroyed,false,'preserved view survives leaving');assert.equal(b.container.length,1);
  state.host.preserveContent=false;state.leaving.next();assert.equal(first.destroyed,true,'unpreserved view is destroyed');assert.equal(b.container.length,0);assert.equal(value.hasAttached(),false);
  state.entering.next(false);assert.equal(b.container.length,0);state.entering.next(true);assert.equal(b.container.length,1);const second=b.container.get(0);assert.ok(second.context===first.context);assert.equal(second.destroyed,false);
  value.ngOnDestroy();assert.equal(second.destroyed,true,'destroy disposes attached view');assert.equal(b.container.length,0);assert.equal(state.active.entering,0,'entry subscription released');assert.equal(state.active.leaving,0,'leave subscription released');
  state.entering.next(true);state.leaving.next();assert.equal(b.container.length,0,'events after destruction cannot attach');assert.equal(a.reference.hostView.destroyed,false);assert.equal(b.reference.hostView.destroyed,false);
  const survivor=b.container.createEmbeddedView(b.template,{item:'borrowed-owner-survives'});survivor.detectChanges();assert.equal(rendered(survivor),'borrowed-owner-survives/declaration');b.container.clear();
 }finally{value.ngOnDestroy();}
}
function subclass(Type,a,b){
 class ConsumerPortal extends Type {ownField='consumer';}
 const state=hostFor(b),value=construct(ConsumerPortal,b.container,state.host,document,a.injector);
 try{assert.ok(value instanceof ConsumerPortal,'new.target subclass identity');assert.ok(value instanceof Type);assert.ok(value instanceof portal.CdkPortalOutlet);assert.equal(value.ownField,'consumer','consumer field initializer runs');value.ngOnInit();state.entering.next(true);assert.equal(b.container.length,1);assert.equal(a.container.length,0);}finally{value.ngOnDestroy();}
}
function explicitDocument(Type,a,b){
 let comments=0;const supplied=Object.create(document);supplied.createComment=text=>{comments++;return document.createComment(text);};
 const state=hostFor(b),value=construct(Type,b.container,state.host,supplied,a.injector),element=new HTMLElementProtocol('explicit-document-child');document.body.appendChild(element);
 try{const before=comments;value.attach(new portal.DomPortal(element));assert.equal(comments,before+1,'supplied document creates the DOM portal anchor');assert.ok(element.parentNode===b.container.element.nativeElement.parentNode,'caller anchor is used');value.detach();assert.ok(element.parentNode===document.body,'DOM portal restored');}finally{value.ngOnDestroy();element.remove();}
}
const ModuleMarker=new core.InjectionToken('tab-portal-borrowed-module');class CallerModule{}core.NgModule({providers:[{provide:ModuleMarker,useValue:'caller-module'}]})(CallerModule);
function callerContext(Type,a){
 const module=core.createNgModule(CallerModule,app.injector),reference=core.createComponent(Owner,{environmentInjector:module.injector,hostElement:new HTMLElementProtocol('module-owner')});reference.changeDetectorRef.detectChanges();const b=reference.instance.capture,requested=[];
 class RecordingInjector extends core.Injector {get(token,...args){requested.push({token,args});return b.container.injector.get(token,...args);}}
 const recording=new RecordingInjector();if(!original)core.runInInjectionContext(recording,()=>core.inject(core.NgModuleRef,{optional:true}));const expectedRequest=requested.pop();const container=new Proxy(b.container,{get(target,key){if(key==='injector')return recording;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}}),state=hostFor(b),value=construct(Type,container,state.host,document,a.injector);
 try{value.ngOnInit();state.entering.next(true);assert.equal(b.container.length,1);value.ngOnDestroy();assert.equal(reference.hostView.destroyed,false);assert.equal(module.injector.get(ModuleMarker),'caller-module','borrowed module survives');if(!original){assert.ok(requested.some(r=>r.token===core.NgModuleRef),'genuine parent requests module from caller injector');assert.ok(expectedRequest?.token===core.NgModuleRef);assert.ok(requested.some(r=>r.token===core.NgModuleRef&&r.args[0]===expectedRequest.args[0]&&JSON.stringify(r.args[1])===JSON.stringify(expectedRequest.args[1])),'unchanged public optional lookup arguments forwarded');}const survivor=b.container.createEmbeddedView(b.template,{item:'module-survivor'});survivor.detectChanges();assert.equal(rendered(survivor),'module-survivor/declaration');b.container.clear();}finally{value.ngOnDestroy();reference.destroy();module.destroy();}
}
function destroyBeforeInit(Type,a,b){const state=hostFor(b),value=construct(Type,b.container,state.host,document,a.injector);value.ngOnDestroy();assert.equal(state.active.entering,0);assert.equal(state.active.leaving,0);assert.equal(b.container.length,0);assert.equal(b.reference.hostView.destroyed,false);}
function factory(Type){
 if(original)return;let captured;
 class CapturePortal {portal=core.inject(Type);constructor(){captured=this.portal;}}
 core.Directive({selector:'[capturePortal]',standalone:true})(CapturePortal);
 const state={...hostFor({template:null,container:null}).host,_isCenterPosition:()=>false};
 class FactoryOwner{}core.Component({selector:'tab-portal-factory-owner',standalone:false,template:'<ng-template matTabBodyHost capturePortal></ng-template>'})(FactoryOwner);
 class FactoryModule{}core.NgModule({declarations:[Type,FactoryOwner],imports:[CapturePortal],providers:[{provide:MatLegacyTabBodyProtocol,useValue:state}]})(FactoryModule);
 const module=core.createNgModule(FactoryModule,app.injector),reference=core.createComponent(FactoryOwner,{environmentInjector:module.injector,hostElement:new HTMLElementProtocol('factory-owner')});
 try{reference.changeDetectorRef.detectChanges();assert.ok(captured instanceof Type,'actual Angular JIT directive construction');assert.ok(captured instanceof portal.CdkPortalOutlet);assert.equal(captured.hasAttached(),false);reference.destroy();}finally{if(!reference.hostView.destroyed)reference.destroy();module.destroy();}
}
const Type=load();
const run=(id,fn)=>{zone.run(fn);cases.push(id);};
const paired=fn=>withOwner(a=>withOwner(b=>fn(a,b)));
const reject=(id,fn)=>{assert.throws(()=>zone.run(fn),error=>error?.code==='ERR_ASSERTION',id);faults.push(id);};
try{
 run('explicit-container-lifecycle',()=>paired((a,b)=>lifetime(Type,a,b)));
 run('initial-center-lifecycle',()=>paired((a,b)=>lifetime(Type,a,b,{center:true})));
 run('manual-construction-outside-injection-context',()=>paired((a,b)=>lifetime(Type,a,b,{manual:true})));
 run('consumer-subclass-and-own-fields',()=>paired((a,b)=>subclass(Type,a,b)));
 run('explicit-document',()=>paired((a,b)=>explicitDocument(Type,a,b)));
 run('caller-injector-module-and-borrowed-lifetime',()=>withOwner(a=>callerContext(Type,a)));
 run('destroy-before-initialization',()=>paired((a,b)=>destroyBeforeInit(Type,a,b)));
 if(!original){run('actual-angular-jit-directive-factory',()=>factory(Type));
  reject('original-owned-constructor-reversion',()=>paired((a,b)=>lifetime(load('before'),a,b)));
  for(const id of ['ambient-constructor','lost-host','lost-preserve-content','lost-detach','lost-destroy','lost-unsubscribe'])reject(id,()=>paired((a,b)=>lifetime(load(id),a,b)));
  reject('lost-new-target',()=>paired((a,b)=>subclass(load('lost-new-target'),a,b)));
  reject('ambient-parent',()=>withOwner(a=>callerContext(load('current','ambient-parent'),a)));
  reject('lost-document',()=>paired((a,b)=>explicitDocument(load('current','lost-document'),a,b)));
 }
 assert.equal(app.viewCount,0);
}finally{app.destroy();core.destroyPlatform();}
assert.equal(ownersCreated,ownersDestroyed);assert.equal(readersCreated,readersDestroyed);assert.equal(childrenCreated,childrenDestroyed);
console.log(JSON.stringify({line,mode,production:production==='true',cases,behavior_reversions_rejected:faults,genuine_Core_views_and_CDK_parent:true,actual_owned_portal:!original,actual_directive_factory:!original,host_renderer_DOM_and_injector_recording_protocols:true,owners_created:ownersCreated,owners_destroyed:ownersDestroyed,template_directives_created:readersCreated,template_directives_destroyed:readersDestroyed,actual_full_legacy_parent_native_packed_or_floor_qualified:false}));
