/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public Angular nodes and root services; synthetic rendering is not browser qualification. */
const definitions=new WeakMap();
let fixtureId=0;

function leaf(nodeType,value,document){
 return {nodeType,textContent:value,parentNode:null,ownerDocument:document,remove(){this.parentNode?.removeChild(this);}};
}

function node(name,document){
 const attributes=new Map(),classes=new Set(),styles=new Map();
 return Object.defineProperties(new EventTarget(),Object.getOwnPropertyDescriptors({nodeType:1,nodeName:name.toUpperCase(),tagName:name.toUpperCase(),ownerDocument:document,
  childNodes:[],parentNode:null,textContent:'',attributes,
  get children(){return this.childNodes.filter(n=>n.nodeType===1);},
  get parentElement(){return this.parentNode;},
  appendChild(child){child.parentNode?.removeChild(child);this.childNodes.push(child);child.parentNode=this;return child;},
  insertBefore(child,next){child.parentNode?.removeChild(child);const index=this.childNodes.indexOf(next);this.childNodes.splice(index<0?this.childNodes.length:index,0,child);child.parentNode=this;return child;},
  removeChild(child){const index=this.childNodes.indexOf(child);if(index>=0)this.childNodes.splice(index,1);child.parentNode=null;return child;},
  remove(){this.parentNode?.removeChild(this);},
  setAttribute(name,value){attributes.set(name,String(value));if(name==='class'){classes.clear();for(const item of String(value).split(/\s+/).filter(Boolean))classes.add(item);}},
  getAttribute(name){return attributes.get(name)??null;},
  hasAttribute(name){return attributes.has(name);},removeAttribute(name){attributes.delete(name);if(name==='class')classes.clear();},
  classList:{add(...names){for(const n of names)classes.add(n);attributes.set('class',[...classes].join(' '));},
   remove(...names){for(const n of names)classes.delete(n);attributes.set('class',[...classes].join(' '));},contains(name){return classes.has(name);}},
  style:{setProperty(name,value){styles.set(name,value);},removeProperty(name){styles.delete(name);}},
  querySelector(){return null;},querySelectorAll(){return [];},
  focus(){document.activeElement=this;},blur(){if(document.activeElement===this)document.activeElement=null;},
  getBoundingClientRect(){return{top:0,left:0,width:0,height:0,right:0,bottom:0};},
 }));
}

/** A public Renderer2 for empty fixture nodes; it deliberately supplies no browser geometry/CSS. */
function renderer(core,document){
 return new class extends core.Renderer2 {
  data={};destroyNode=null;destroy(){}
  createElement(name){return node(name,document);}
  createText(value){return leaf(3,value,document);}
  createComment(value){return leaf(8,value,document);}
  appendChild(parent,child){parent.appendChild(child);}
  insertBefore(parent,child,next){
   // Angular can request a container anchor before content projection attaches
   // its host. The public DOM renderer accepts a null parent at that point.
   if(parent){
    if(next!=null&&next.parentNode!==parent)throw Error('fixture insertion reference belongs to another parent');
    parent.insertBefore(child,next);
   }
  }
  removeChild(_parent,child){
   // Angular's public DOM renderer removes the child from its actual parent,
   // including already-detached nodes during portal/view cleanup.
   child.remove();
  }
  selectRootElement(target){if(typeof target==='string')throw Error('fixture requires an explicit host element');return target;}
  parentNode(target){return target.parentNode;}
  nextSibling(target){const siblings=target.parentNode?.childNodes||[];return siblings[siblings.indexOf(target)+1]||null;}
  setAttribute(target,name,value){target.setAttribute(name,value);}
  removeAttribute(target,name){target.removeAttribute(name);}
  addClass(target,name){target.classList.add(name);}
  removeClass(target,name){target.classList.remove(name);}
  setStyle(target,name,value){target.style.setProperty(name,value);}
  removeStyle(target,name){target.style.removeProperty(name);}
  setProperty(target,name,value){target[name]=value;}
  setValue(target,value){target.textContent=value;}
  listen(target,name,fn){
   if(typeof target==='string')target=({body:document.body,document,window:document.defaultView})[target];
   if(!target||typeof target.addEventListener!=='function')throw Error('synthetic fixture event target unavailable');
   const callback=event=>{if(fn(event)===false)event.preventDefault();};
   target.addEventListener(name,callback);return()=>target.removeEventListener(name,callback);
  }
 };
}

function fixtureDefinitions(core,{nodeFactory,attributes={},parentProviders=[],parentHost}={}){
 const cacheable=!nodeFactory&&Object.keys(attributes).length===0&&parentProviders.length===0&&!parentHost;
 if(cacheable&&definitions.has(core))return definitions.get(core);
 const scopeToken=new core.InjectionToken('API fixture node scope');
 const parentValue={scope:'parent'},childValue={scope:'child'};
 const executionToken=nodeFactory?new core.InjectionToken('API fixture node-local factory execution'):null;
 class Parent {
  destroyed=false;
  injector=core.inject(core.Injector);
  element=core.inject(core.ElementRef);
  owner=parentHost?core.inject(parentHost.token,{self:true}):null;
  ngOnDestroy(){this.destroyed=true;}
 }
 core.Directive({selector:'[apiFactoryParent]',standalone:true,
  providers:[{provide:scopeToken,useValue:parentValue},...parentProviders]})(Parent);
 class ElementProbe {
  destroyed=false;
  injector=core.inject(core.Injector);
  element=core.inject(core.ElementRef);
  detector=core.inject(core.ChangeDetectorRef);
  container=core.inject(core.ViewContainerRef);
  execution=nodeFactory?core.inject(executionToken):null;
  ngOnDestroy(){this.destroyed=true;}
 }
 core.Directive({selector:'[apiFactoryElement]',standalone:true,
  providers:[{provide:scopeToken,useValue:childValue},...(nodeFactory?[{provide:executionToken,
   useFactory:()=>nodeFactory({injector:core.inject(core.Injector),element:core.inject(core.ElementRef)})}]:[])]})(ElementProbe);
 class TemplateProbe {
  destroyed=false;
  injector=core.inject(core.Injector);
  element=core.inject(core.ElementRef);
  detector=core.inject(core.ChangeDetectorRef);
  container=core.inject(core.ViewContainerRef);
  template=core.inject(core.TemplateRef);
  ngOnDestroy(){this.destroyed=true;}
 }
 core.Directive({selector:'ng-template[apiFactoryTemplate]',standalone:true})(TemplateProbe);
 class Host{}
 core.ViewChild(Parent)(Host.prototype,'parent');
 core.ViewChild(ElementProbe)(Host.prototype,'element');
 core.ViewChild(TemplateProbe)(Host.prototype,'template');
 const serializeAttributes=(values,pattern)=>Object.entries(values).map(([name,value])=>{
  if(!pattern.test(name)||typeof value!=='string')throw Error('invalid fixture literal attribute');
  return ' '+name+'="'+value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'"';
 }).join('');
 const literalAttributes=serializeAttributes(attributes,/^[a-z][a-z0-9-]*$/);
 const parentTag=parentHost?.tag||'section';
 if(!/^[a-z][a-z0-9-]*$/.test(parentTag))throw Error('invalid fixture parent tag');
 const parentAttributes=serializeAttributes(parentHost?.attributes||{},/^[a-zA-Z][a-zA-Z0-9-]*$/);
 const elementTag=parentHost?.elementTag||'div';if(!/^[a-z][a-z0-9-]*$/.test(elementTag))throw Error('invalid fixture element tag');
 const elementAttributes=serializeAttributes(parentHost?.elementAttributes||{},/^[a-zA-Z][a-zA-Z0-9-]*$/);
 const elementMarkup='<'+elementTag+' apiFactoryElement'+literalAttributes+elementAttributes+'>'+(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(elementTag)?'':'</'+elementTag+'>');
 core.Component({selector:'api-factory-host-'+fixtureId++,standalone:true,
  imports:[Parent,ElementProbe,TemplateProbe,...(parentHost?.imports||[])],
  template:'<'+parentTag+' apiFactoryParent'+parentAttributes+'>'+elementMarkup+'<ng-template apiFactoryTemplate></ng-template></'+parentTag+'>'})(Host);
 const result={Host,scopeToken,parentValue,childValue};if(cacheable)definitions.set(core,result);return result;
}

/**
 * Obtain actual Angular node injectors and built-in services, including a real
 * TemplateRef. Providers are caller-supplied public module/configuration values;
 * missing services propagate. There is no private token discovery or fallback.
 */
export async function createPublicFactoryContext(core,importModule,{providers=[],nodeFactory,attributes={},parentProviders=[],parentHost,defaultViewTarget=false}={}){
 if(typeof defaultViewTarget!=='boolean')throw Error('synthetic defaultView target option must be boolean');
 const defaultView=defaultViewTarget?new EventTarget():null;
 const {BrowserModule}=await importModule('@angular/platform-browser');
 const {PlatformLocation}=await importModule('@angular/common');
 const {MockPlatformLocation}=await importModule('@angular/common/testing');
 const platformLocation=new MockPlatformLocation({startUrl:'https://factory-context.invalid/'});
 const document=Object.assign(new EventTarget(),{activeElement:null,defaultView,doctype:{},
  createElement(name){return node(name,document);},
  createTextNode(value){return leaf(3,value,document);},
  createComment(value){return leaf(8,value,document);},
  querySelector(){return null;},querySelectorAll(){return [];}});
 if(defaultView)defaultView.document=document;
 document.head=node('head',document);document.body=node('body',document);document.documentElement=node('html',document);
 document.documentElement.appendChild(document.head);document.documentElement.appendChild(document.body);
 document.getElementsByClassName=name=>{
  const found=[];const visit=element=>{if(element.classList?.contains(name))found.push(element);for(const child of element.children||[])visit(child);};
  visit(document.documentElement);return found;
 };
 const fixtureRenderer=renderer(core,document),defs=fixtureDefinitions(core,{nodeFactory,attributes,parentProviders,parentHost});
 let parent,environment,component,closed=false;
 const close=()=>{
  if(closed)return;closed=true;
  try{component?.destroy();}finally{try{environment?.destroy();}finally{parent?.destroy();}}
 };
 try{
  parent=core.Injector.create({providers:[]});
  if(!(parent instanceof core.EnvironmentInjector))throw Error('public Injector.create did not return an EnvironmentInjector parent');
  environment=core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),core.provideZonelessChangeDetection(),
   {provide:core.PLATFORM_ID,useValue:'server'},{provide:core.DOCUMENT,useValue:document},
   {provide:PlatformLocation,useValue:platformLocation},
   {provide:core.RendererFactory2,useValue:{createRenderer(){return fixtureRenderer;}}},...providers],parent);
  const host=node('api-factory-host',document);document.body.appendChild(host);
  component=core.createComponent(defs.Host,{hostElement:host,environmentInjector:environment});
  component.changeDetectorRef.detectChanges();
  if(!component.instance.element||!component.instance.template||!component.instance.parent)throw Error('public Angular node probes were not created');
  return {environment,component,document,host,platformLocation,parentNode:component.instance.parent,element:component.instance.element,template:component.instance.template,
   scopeToken:defs.scopeToken,parentValue:defs.parentValue,childValue:defs.childValue,close,
   context:'actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate'+(defaultViewTarget?'; explicit synthetic defaultView EventTarget, no browser geometry':'')};
 }catch(error){close();throw error;}
}
