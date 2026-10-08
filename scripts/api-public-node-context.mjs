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

function node(name,document){
 const attributes=new Map(),classes=new Set(),styles=new Map(),listeners=new Map();
 return {nodeType:1,nodeName:name.toUpperCase(),tagName:name.toUpperCase(),ownerDocument:document,
  childNodes:[],parentNode:null,textContent:'',attributes,
  get children(){return this.childNodes.filter(n=>n.nodeType===1);},
  get parentElement(){return this.parentNode;},
  appendChild(child){child.parentNode?.removeChild(child);this.childNodes.push(child);child.parentNode=this;return child;},
  insertBefore(child,next){child.parentNode?.removeChild(child);const index=this.childNodes.indexOf(next);this.childNodes.splice(index<0?this.childNodes.length:index,0,child);child.parentNode=this;return child;},
  removeChild(child){const index=this.childNodes.indexOf(child);if(index>=0)this.childNodes.splice(index,1);child.parentNode=null;return child;},
  remove(){this.parentNode?.removeChild(this);},
  setAttribute(name,value){attributes.set(name,String(value));},getAttribute(name){return attributes.get(name)??null;},
  hasAttribute(name){return attributes.has(name);},removeAttribute(name){attributes.delete(name);},
  classList:{add(...names){for(const n of names)classes.add(n);},remove(...names){for(const n of names)classes.delete(n);},contains(name){return classes.has(name);}},
  style:{setProperty(name,value){styles.set(name,value);},removeProperty(name){styles.delete(name);}},
  querySelector(){return null;},querySelectorAll(){return [];},
  addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
  removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
  focus(){document.activeElement=this;},blur(){if(document.activeElement===this)document.activeElement=null;},
  getBoundingClientRect(){return{top:0,left:0,width:0,height:0,right:0,bottom:0};},
 };
}

/** A public Renderer2 for empty fixture nodes; it deliberately supplies no browser geometry/CSS. */
function renderer(core,document){
 return new class extends core.Renderer2 {
  data={};destroyNode=null;destroy(){}
  createElement(name){return node(name,document);}
  createText(value){return{nodeType:3,textContent:value,parentNode:null};}
  createComment(value){return{nodeType:8,textContent:value,parentNode:null};}
  appendChild(parent,child){parent.appendChild(child);}
  insertBefore(parent,child,next){parent.insertBefore(child,next);}
  removeChild(parent,child){parent.removeChild(child);}
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
  listen(target,name,fn){if(typeof target==='string')throw Error('synthetic fixture cannot register global browser events');target.addEventListener(name,fn);return()=>target.removeEventListener(name,fn);}
 };
}

function fixtureDefinitions(core,{nodeFactory,attributes={}}={}){
 const cacheable=!nodeFactory&&Object.keys(attributes).length===0;
 if(cacheable&&definitions.has(core))return definitions.get(core);
 const scopeToken=new core.InjectionToken('API fixture node scope');
 const parentValue={scope:'parent'},childValue={scope:'child'};
 const executionToken=nodeFactory?new core.InjectionToken('API fixture node-local factory execution'):null;
 class Parent{}
 core.Directive({selector:'[apiFactoryParent]',standalone:true,
  providers:[{provide:scopeToken,useValue:parentValue}]})(Parent);
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
 core.ViewChild(ElementProbe)(Host.prototype,'element');
 core.ViewChild(TemplateProbe)(Host.prototype,'template');
 const literalAttributes=Object.entries(attributes).map(([name,value])=>{
  if(!/^[a-z][a-z0-9-]*$/.test(name)||typeof value!=='string')throw Error('invalid fixture literal attribute');
  return ' '+name+'="'+value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'"';
 }).join('');
 core.Component({selector:'api-factory-host-'+fixtureId++,standalone:true,imports:[Parent,ElementProbe,TemplateProbe],
  template:'<section apiFactoryParent><div apiFactoryElement'+literalAttributes+'></div><ng-template apiFactoryTemplate></ng-template></section>'})(Host);
 const result={Host,scopeToken,parentValue,childValue};if(cacheable)definitions.set(core,result);return result;
}

/**
 * Obtain actual Angular node injectors and built-in services, including a real
 * TemplateRef. Providers are caller-supplied public module/configuration values;
 * missing services propagate. There is no private token discovery or fallback.
 */
export async function createPublicFactoryContext(core,importModule,{providers=[],nodeFactory,attributes={}}={}){
 const {BrowserModule}=await importModule('@angular/platform-browser');
 const document=Object.assign(new EventTarget(),{activeElement:null,defaultView:null,doctype:{},
  createElement(name){return node(name,document);},
  createTextNode(value){return{nodeType:3,textContent:value,parentNode:null};},
  querySelector(){return null;},querySelectorAll(){return [];}});
 document.head=node('head',document);document.body=node('body',document);document.documentElement=node('html',document);
 document.documentElement.appendChild(document.head);document.documentElement.appendChild(document.body);
 const fixtureRenderer=renderer(core,document),defs=fixtureDefinitions(core,{nodeFactory,attributes});
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
   {provide:core.RendererFactory2,useValue:{createRenderer(){return fixtureRenderer;}}},...providers],parent);
  const host=node('api-factory-host',document);document.body.appendChild(host);
  component=core.createComponent(defs.Host,{hostElement:host,environmentInjector:environment});
  component.changeDetectorRef.detectChanges();
  if(!component.instance.element||!component.instance.template)throw Error('public Angular node probes were not created');
  return {environment,component,document,host,element:component.instance.element,template:component.instance.template,
   scopeToken:defs.scopeToken,parentValue:defs.parentValue,childValue:defs.childValue,close,
   context:'actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM; native/browser/AOT/packed/floors separate'};
 }catch(error){close();throw error;}
}
