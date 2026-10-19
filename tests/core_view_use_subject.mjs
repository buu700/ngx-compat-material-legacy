/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Core/CDK public views; renderer and DOM are explicit protocols. */
import assert from 'node:assert/strict';
const [line,mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),common=await import('@angular/common'),browser=await import('@angular/platform-browser'),portal=await import('@angular/cdk/portal'),cdk=await import('@angular/cdk');
const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};assert.equal(core.VERSION.full,versions[line][0]);assert.equal(cdk.VERSION.full,versions[line][1]);
let document;
class NodeProtocol{
 constructor(name,type=1){this.name=name;this.nodeType=type;this.children=[];this.attributes=new Map();this.text='';this.ownerDocument=document;}
 get parentNode(){return this.parent??null;}get nextSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]??null;}
 get textContent(){return this.text+this.children.map(n=>n.textContent).join('');}set textContent(value){this.text=value;}
 hasAttribute(name){return this.attributes.has(name);}getAttribute(name){return this.attributes.get(name)??null;}
 setAttribute(name,value){this.attributes.set(name,String(value));}removeAttribute(name){this.attributes.delete(name);}
 querySelectorAll(selector){const selectors=selector.split(',').map(s=>{const m=s.trim().match(/^([a-z][\w-]*)?(?:\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\])?$/i);assert.ok(m,'unsupported DOM protocol selector: '+s);return m;});const found=[];for(const child of this.children){if(selectors.some(m=>(!m[1]||child.name===m[1])&&(!m[2]||child.hasAttribute(m[2]))&&(m[3]===undefined||child.getAttribute(m[2])===m[3])))found.push(child);found.push(...child.querySelectorAll(selector));}return found;}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 appendChild(node){insert(this,node);return node;}insertBefore(node,before){insert(this,node,before);return node;}
 removeChild(node){remove(this,node);return node;}remove(){if(this.parent)remove(this.parent,this);}
}
class HTMLElementProtocol extends NodeProtocol{}
globalThis.HTMLElement=HTMLElementProtocol;
function insert(parent,node,before){if(node.parent)remove(node.parent,node);const at=before?parent.children.indexOf(before):-1;parent.children.splice(at<0?parent.children.length:at,0,node);node.parent=parent;}
function remove(parent,node){if(parent)parent.children=parent.children.filter(n=>n!==node);node.parent=null;}
document={head:new HTMLElementProtocol('head'),body:new HTMLElementProtocol('body'),createElement:name=>new HTMLElementProtocol(name),createComment:text=>Object.assign(new NodeProtocol('comment',8),{text}),querySelectorAll:selector=>[...document.head.querySelectorAll(selector),...document.body.querySelectorAll(selector)],querySelector:selector=>document.querySelectorAll(selector)[0]??null};
const renderer={data:{},destroy(){},createElement:name=>new HTMLElementProtocol(name),createComment:text=>Object.assign(new NodeProtocol('comment',8),{text}),createText:text=>Object.assign(new NodeProtocol('text',3),{text}),appendChild:insert,insertBefore:insert,removeChild:remove,selectRootElement:n=>n,parentNode:n=>n.parentNode,nextSibling:n=>n.nextSibling,setAttribute:(n,k,v)=>n.attributes.set(k,v),removeAttribute:(n,k)=>n.attributes.delete(k),addClass(){},removeClass(){},setStyle(){},removeStyle(){},setProperty:(n,k,v)=>{n[k]=v;},setValue:(n,v)=>{n.text=v;},listen:()=>()=>{}};
const Scope=new core.InjectionToken('core-view-public-scope');let ownersCreated=0,ownersDestroyed=0,readersCreated=0,readersDestroyed=0,childrenCreated=0,childrenDestroyed=0;
class ScopeReader{scope=core.inject(Scope);constructor(){readersCreated++;}ngOnDestroy(){readersDestroyed++;}}
core.Directive({selector:'[viewScope]',exportAs:'viewScope',standalone:true})(ScopeReader);
class Capture{template=core.inject(core.TemplateRef);container=core.inject(core.ViewContainerRef);injector=core.inject(core.Injector);}
core.Directive({selector:'[captureView]',standalone:true,providers:[{provide:Scope,useValue:'declaration'}]})(Capture);
class Owner{constructor(){ownersCreated++;}ngOnDestroy(){ownersDestroyed++;}}
core.ViewChild(Capture,{static:true})(Owner.prototype,'capture');
core.Component({selector:'core-view-owner',standalone:true,imports:[Capture,ScopeReader],changeDetection:core.ChangeDetectionStrategy.OnPush,template:'<ng-template captureView let-item="item"><span viewScope #scope="viewScope">{{item}}/{{scope.scope}}</span></ng-template>'})(Owner);
class Child{scope=core.inject(Scope);item='child';constructor(){childrenCreated++;}ngOnDestroy(){childrenDestroyed++;}}
core.Input()(Child.prototype,'item');core.Component({selector:'core-view-child',standalone:true,template:'<b>{{item}}/{{scope}}</b>'})(Child);
const providers=[{provide:Scope,useValue:'root'},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}},{provide:line==='original'?common.DOCUMENT:core.DOCUMENT,useValue:document},{provide:core.PLATFORM_ID,useValue:'server'},core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection']()];
if(common.IMAGE_CONFIG)providers.push({provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}});
const app=await browser.createApplication({providers}),zone=app.injector.get(core.NgZone),cases=[],faults=[],detachWitnesses=[];
const rendered=view=>view.rootNodes.filter(n=>n.nodeType===1).map(n=>n.textContent).join('');
function withOwner(fn){
 const reference=core.createComponent(Owner,{environmentInjector:app.injector,hostElement:new HTMLElementProtocol('owner')});app.attachView(reference.hostView);reference.changeDetectorRef.detectChanges();const capture=reference.instance.capture,views=[],injectors=[],outlets=[],components=[];
 const state={reference,...capture,views,injectors,outlets,components,track:view=>(views.push(view),view),override:value=>{const injector=core.createEnvironmentInjector([{provide:Scope,useValue:value}],app.injector);injectors.push(injector);return injector;}};
 try{return fn(state);}finally{for(const outlet of outlets)outlet.dispose();for(const component of components)if(!component.hostView.destroyed)component.destroy();capture.container.clear();for(const view of views)if(!view.destroyed)view.destroy();reference.destroy();for(const injector of injectors)injector.destroy();}
}
const run=(id,fn)=>{zone.run(()=>withOwner(fn));cases.push(id);};
const reject=(id,fn)=>{assert.throws(()=>zone.run(()=>withOwner(fn)),error=>error?.code==='ERR_ASSERTION',id);faults.push(id);};
function detached(s,create=(t,c,i)=>t.createEmbeddedView(c,i)){
 const context={item:'detached'},view=s.track(create(s.template,context,s.override('override')));assert.equal(s.container.length,0);assert.ok(view.context===context,'view context identity');assert.equal(view.destroyed,false);view.detectChanges();assert.equal(rendered(view),'detached/override');context.item='updated';view.detectChanges();assert.equal(rendered(view),'updated/override');assert.equal(s.reference.hostView.destroyed,false);
}
function detach(s,action=(c,i)=>c.detach(i)){
 const view=s.track(s.container.createEmbeddedView(s.template,{item:'detached'}));view.detectChanges();assert.equal(s.container.length,1);const result=action(s.container,0);assert.ok(result&&result.context===view.context,'detached view context identity');assert.ok(result.rootNodes[0]===view.rootNodes[0],'detached view node identity');assert.equal(view.destroyed,false);assert.equal(s.container.length,0);s.container.insert(result);assert.ok(s.container.get(0).context===view.context,'reinserted view context');assert.ok(s.container.get(0).rootNodes[0]===view.rootNodes[0],'reinserted view node');assert.equal(view.destroyed,false);detachWitnesses.push({same_JavaScript_wrapper:result===view,same_context_and_nodes:true,returned_handle_reinserted:true});
}
function clear(s,action=c=>c.clear()){
 const a=s.track(s.container.createEmbeddedView(s.template,{item:'a'})),b=s.track(s.container.createEmbeddedView(s.template,{item:'b'}));let destroyed=0;a.onDestroy(()=>destroyed++);b.onDestroy(()=>destroyed++);action(s.container);assert.equal(s.container.length,0);assert.equal(a.destroyed,true);assert.equal(b.destroyed,true);assert.equal(destroyed,2);
}
function outlet(s){const element=new HTMLElementProtocol('outlet');document.body.appendChild(element);const value=line==='original'?new portal.DomPortalOutlet(element,app.injector.get(core.ComponentFactoryResolver),app,app.injector,document):new portal.DomPortalOutlet(element,app,app.injector);s.outlets.push(value);return value;}
function templatePortal(s,attach=(p,o,c)=>p.attach(o,c),dispose=o=>o.dispose()){
 const target=outlet(s),context={item:'portal'},content=new portal.TemplatePortal(s.template,s.container,{item:'wrong'}),first=s.track(attach(content,target,context));assert.ok(first.context===context,'portal context identity');assert.equal(rendered(first),'portal/declaration');assert.equal(content.isAttached,true);assert.equal(target.hasAttached(),true);target.detach();assert.equal(first.destroyed,true);assert.equal(content.isAttached,false);const second=s.track(content.attach(target,{item:'again'}));assert.ok(second!==first,'portal creates a new view after detach');assert.equal(rendered(second),'again/declaration');dispose(target);assert.equal(second.destroyed,true);assert.equal(s.container.length,0);assert.equal(s.reference.hostView.destroyed,false);
}
function componentPortal(s,make=(type,injector)=>new portal.ComponentPortal(type,null,injector),dispose=o=>o.dispose()){
 const target=outlet(s),baseline=app.viewCount,injector=s.override('component'),content=make(Child,injector),component=target.attach(content);s.components.push(component);assert.equal(component.instance.scope,'component');assert.ok(component.componentType===Child,'component type identity');assert.ok(component.instance instanceof Child);assert.equal(app.viewCount,baseline+1);assert.ok(component.location.nativeElement.parentNode===target.outletElement,'component portal host ownership');dispose(target);assert.equal(component.hostView.destroyed,true);assert.equal(app.viewCount,baseline);assert.equal(s.reference.hostView.destroyed,false);
}
function containerComponentPortal(s,make=(type,container)=>new portal.ComponentPortal(type,container)){
 const target=outlet(s),baseline=app.viewCount,component=target.attach(make(Child,s.container));s.components.push(component);assert.equal(component.instance.scope,'declaration');assert.equal(s.container.length,1);assert.equal(app.viewCount,baseline);target.dispose();assert.equal(component.hostView.destroyed,true);assert.equal(s.container.length,0);assert.equal(app.viewCount,baseline);assert.equal(s.reference.hostView.destroyed,false);
}
try{
 run('public-template-token-and-declaration-anchor',s=>{assert.ok(s.template instanceof core.TemplateRef);assert.ok(s.template.elementRef.nativeElement===s.container.element.nativeElement,'template/container anchor identity');assert.equal(s.container.injector.get(Scope),'declaration');assert.equal(s.injector.get(Scope),'declaration');});
 run('detached-context-and-override-injector',detached);
 run('container-context-and-insertion-order',s=>{const a=s.track(s.container.createEmbeddedView(s.template,{item:'a'})),b=s.track(s.container.createEmbeddedView(s.template,{item:'b'},{index:0}));a.detectChanges();b.detectChanges();assert.equal(s.container.length,2);assert.ok(s.container.get(0).context===b.context,'first inserted/moved view context');assert.ok(s.container.get(1).context===a.context,'second inserted view context');assert.equal(rendered(a),'a/declaration');assert.equal(rendered(b),'b/declaration');});
 run('move-preserves-view-and-context',s=>{const a=s.track(s.container.createEmbeddedView(s.template,{item:'a'})),b=s.track(s.container.createEmbeddedView(s.template,{item:'b'}));s.container.move(a,1);assert.ok(s.container.get(0).context===b.context,'first inserted/moved view context');assert.equal(s.container.indexOf(a),1);assert.equal(a.context.item,'a');assert.equal(a.destroyed,false);});
 run('detach-preserves-reinsertable-view',detach);
 run('remove-destroys-exactly-one-view',s=>{const a=s.track(s.container.createEmbeddedView(s.template,{item:'a'})),b=s.track(s.container.createEmbeddedView(s.template,{item:'b'}));let destroyed=0;a.onDestroy(()=>destroyed++);s.container.remove(0);assert.equal(a.destroyed,true);assert.equal(b.destroyed,false);assert.equal(destroyed,1);a.destroy();assert.equal(destroyed,1);assert.equal(s.container.length,1);});
 run('clear-destroys-all-owned-views',clear);
 run('application-attach-detach-and-view-count',s=>{const view=s.track(s.template.createEmbeddedView({item:'application'})),baseline=app.viewCount;app.attachView(view);assert.equal(app.viewCount,baseline+1);view.detectChanges();assert.equal(rendered(view),'application/declaration');app.detachView(view);assert.equal(app.viewCount,baseline);assert.equal(view.destroyed,false);view.destroy();assert.equal(view.destroyed,true);});
 run('container-component-type-injector-and-destroy',s=>{const component=s.container.createComponent(Child,{environmentInjector:app.injector,injector:s.container.injector});s.components.push(component);assert.equal(component.instance.scope,'declaration');assert.ok(component.componentType===Child,'component type identity');component.setInput('item','inserted');component.changeDetectorRef.detectChanges();assert.equal(component.location.nativeElement.textContent,'inserted/declaration');let destroyed=0;component.onDestroy(()=>destroyed++);component.destroy();assert.equal(component.hostView.destroyed,true);assert.equal(destroyed,1);assert.equal(s.container.length,0);});
 run('public-template-portal-context-reattach-and-disposal',templatePortal);
 run('public-component-portal-injector-and-application-ownership',componentPortal);
 run('public-component-portal-preserves-container-node-scope',containerComponentPortal);
 run('borrowed-owner-survives-outlet-disposal',s=>{templatePortal(s);assert.equal(s.reference.hostView.destroyed,false);assert.equal(app.injector.get(Scope),'root');const view=s.track(s.container.createEmbeddedView(s.template,{item:'still-alive'}));view.detectChanges();assert.equal(rendered(view),'still-alive/declaration');});
 reject('lost-template-context',s=>detached(s,(t,_c,i)=>t.createEmbeddedView({item:'wrong'},i)));
 reject('ignored-template-injector',s=>detached(s,(t,c,_i)=>t.createEmbeddedView(c)));
 reject('detach-destroys-view',s=>detach(s,(c,i)=>c.remove(i)));
 reject('clear-does-nothing',s=>clear(s,()=>{}));
 reject('clear-only-detaches',s=>clear(s,c=>{while(c.length)c.detach(0);}));
 reject('portal-loses-explicit-context',s=>templatePortal(s,(p,o,_c)=>p.attach(o)));
 reject('template-portal-missing-disposal',s=>templatePortal(s,undefined,()=>{}));
 reject('component-portal-loses-injector',s=>componentPortal(s,type=>new portal.ComponentPortal(type)));
 reject('component-portal-missing-disposal',s=>componentPortal(s,undefined,()=>{}));
 reject('component-portal-loses-view-container',s=>containerComponentPortal(s,type=>new portal.ComponentPortal(type)));
 assert.equal(cases.length,13);assert.equal(faults.length,10);assert.equal(app.viewCount,0);
}finally{app.destroy();core.destroyPlatform();}
assert.equal(ownersCreated,ownersDestroyed);assert.equal(readersCreated,readersDestroyed);assert.equal(childrenCreated,childrenDestroyed);
console.log(JSON.stringify({line,mode,production:production==='true',cases,behavior_faults_rejected:faults,detach_wrapper_observations:detachWitnesses,genuine_public_Core_and_CDK_portal_subjects:true,owners_created:ownersCreated,owners_destroyed:ownersDestroyed,template_directives_created:readersCreated,template_directives_destroyed:readersDestroyed,child_components_created:childrenCreated,child_components_destroyed:childrenDestroyed,renderer_and_DOM_protocols:true,actual_legacy_component_TestBed_browser_packed_or_floor_qualified:false}));
