/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Published16 protocol bodies are oracle data; this does not run Angular16 views. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const folder='reference/material-16.2.14/dialog-portal-protocol/';
const manifestPin='243c8f552f0e6938f7bd3c423bed9e6e163a3b726b48920fffa3be0baff08231';
const asUrl=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
export async function loadTaggedPortalProtocol({root,read=path=>readFileSync(join(root,path))}={}){
 const manifestBytes=read(folder+'provenance.json');assert.equal(hash(manifestBytes),manifestPin);
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.tag,'16.2.14');assert.equal(manifest.tag_commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 const bound=[{path:folder+'provenance.json',sha256:hash(manifestBytes),bytes:manifestBytes.length}];
 for(const ref of manifest.members){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed tagged portal oracle '+ref.path);assert.equal(bytes.length,ref.bytes);bound.push({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});}
 const excerpts=[],removed=[];
 function extract(path,names){
  const text=read(path).toString(),file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);
  return names.map(name=>{
   const nodes=file.statements.filter(node=>(ts.isClassDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.text===name);assert.equal(nodes.length,1,name);
   const node=nodes[0],start=node.getStart(file),original=text.slice(start,node.end);let selected=original;
   if(ts.isClassDeclaration(node))for(const member of [...node.members].reverse()){
    if(!ts.isClassStaticBlockDeclaration(member))continue;
    const block=member.getText(file);assert.match(block,/^static \{ this\.ɵ(?:fac|dir|cmp) = i0\.ɵɵngDeclare(?:Factory|Directive|Component)\(/);
    removed.push({class:name,sha256:hash(block)});const offset=member.getStart(file)-start;selected=selected.slice(0,offset)+selected.slice(member.end-start);
   }
   excerpts.push({path,name,complete_declaration_sha256:hash(original),instance_and_constructor_bytes_unchanged:true,adapted_declaration_sha256:hash(selected)});
   return selected;
  }).join('\n');
 }
 const functions=['throwNullPortalError','throwPortalAlreadyAttachedError','throwPortalOutletAlreadyDisposedError','throwUnknownPortalTypeError','throwNullPortalOutletError','throwNoPortalAttachedError'];
 const classes=['Portal','ComponentPortal','TemplatePortal','DomPortal','BasePortalOutlet','CdkPortalOutlet'];
 const portalBody=extract(folder+'portal.mjs',[...functions,...classes]);
 const coreUrl=pathToFileURL(require.resolve('@angular/core')).href;
 const portalUrl=asUrl('import {ElementRef,EventEmitter} from '+JSON.stringify(coreUrl)+';\n'+portalBody+'\nexport {'+classes.join(',')+'};');
 const portal=await import(portalUrl);
 const dialogBody=extract(folder+'dialog.mjs',['throwDialogContentAlreadyAttachedError','CdkDialogContainer']);
 const dialog=await import(asUrl('import {BasePortalOutlet} from '+JSON.stringify(portalUrl)+';\n'+dialogBody+'\nexport {CdkDialogContainer};'));
 assert.equal(removed.filter(row=>row.class==='CdkPortalOutlet').length,2);assert.equal(removed.filter(row=>row.class==='CdkDialogContainer').length,2);assert.equal(removed.length,4);
 const assertCurrent=()=>{for(const ref of bound){const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'late tagged portal oracle change');assert.equal(bytes.length,ref.bytes);}};
 assertCurrent();return {portal,dialog,manifest,bound,excerpts,removed,assertCurrent,Angular16_metadata_or_native_views_executed:false};
}
/** Minimal parent/anchor movement, independent of any portal implementation. */
export function portalDom(){
 const node=name=>({name,nodeType:1,ELEMENT_NODE:1,parentNode:null,children:[],
  appendChild(child){if(child.parentNode)child.parentNode.removeChild(child);this.children.push(child);child.parentNode=this;return child;},
  removeChild(child){const i=this.children.indexOf(child);assert.ok(i>=0);this.children.splice(i,1);child.parentNode=null;return child;},
  insertBefore(child,before){const i=this.children.indexOf(before);assert.ok(i>=0);if(child.parentNode)child.parentNode.removeChild(child);this.children.splice(i,0,child);child.parentNode=this;return child;},
  replaceChild(child,before){const i=this.children.indexOf(before);assert.ok(i>=0);if(child.parentNode)child.parentNode.removeChild(child);this.children[i]=child;child.parentNode=this;before.parentNode=null;return before;}});
 const origin=node('origin'),target=node('outlet'),element=node('content');origin.appendChild(element);
 return {origin,target,element,document:{createComment:()=>Object.assign(node('anchor'),{nodeType:8})},node};
}
/** Real outlet implementations receive the same finite rendering protocol. */
export function portalView(core,dom){
 const log=[],component={hostView:{rootNodes:[dom.node('component')]},destroy(){log.push({kind:'component-destroy'});}},template={};let pending;
 const view={length:0,injector:core.Injector.NULL,element:{nativeElement:dom.target},
  createComponent(){log.push({kind:'component',portal:pending});return component;},
  createEmbeddedView(){log.push({kind:'template',portal:pending});return template;},clear(){log.push({kind:'clear'});}};
 const wrap=outlet=>{
  for(const method of ['attachComponentPortal','attachTemplatePortal','attachDomPortal']){const actual=outlet[method].bind(outlet);outlet[method]=portal=>{pending=portal;if(method==='attachDomPortal')log.push({kind:'dom',portal});return actual(portal);};}
  for(const method of ['detach','dispose']){const actual=outlet[method].bind(outlet);outlet[method]=()=>{log.push({kind:method});return actual();};}
  return outlet;
 };
 return {view,log,component,template,wrap};
}
export function taggedOutlet(oracle,core,dom=portalDom()){
 const state=portalView(core,dom),resolver={resolveComponentFactory:component=>({componentType:component})};
 const outlet=state.wrap(new oracle.portal.CdkPortalOutlet(resolver,state.view,dom.document));
 return {...state,outlet,dom,destroy(){outlet.dispose();}};
}
export function currentOutlet(portal,core,dom=portalDom()){
 const state=portalView(core,dom),injector=core.Injector.create({providers:[{provide:core.ViewContainerRef,useValue:state.view},{provide:core.DOCUMENT,useValue:dom.document}]});
 const outlet=state.wrap(core.runInInjectionContext(injector,()=>new portal.CdkPortalOutlet()));
 return {...state,outlet,dom,destroy(){outlet.dispose();injector.destroy();}};
}
/** Keep the original28 observations and eight mutants; fix only fixture/protocol dispatch. */
export function currentContainerProgram({root,read=path=>readFileSync(join(root,path))}={}){
 const path='tests/dialog_container_public_runtime_probe.mjs',raw=read(path).toString();assert.equal(hash(raw),'3cd1ac4204ce8539cf4cc90671583a9104c7c14ca2d5bbe705d0a2a134e56264');
 let current=raw;const edits=[];
 function replace(before,after,count=1){assert.equal(current.split(before).length,count+1,before.slice(0,100));current=current.split(before).join(after);edits.push({before,after,occurrences:count});}
 replace("import {fixture, load} from './dialog_initial_focus_runtime_probe.mjs';", "import {fixture, load} from "+JSON.stringify(pathToFileURL(join(root,'tests/dialog_initial_focus_runtime_probe.mjs')).href)+";\nimport {currentOutlet,portalDom} from "+JSON.stringify(pathToFileURL(join(root,'tests/dialog_portal_protocol_subject.mjs')).href)+";");
 replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+JSON.stringify(root)+';');
 replace('const require = createRequire(import.meta.url), ts = require(\'typescript\');',"const require = createRequire(root+'/package.json'), ts = require('typescript');");
 replace('const {BasePortalOutlet, ComponentPortal, TemplatePortal, DomPortal}', 'const {BasePortalOutlet, CdkPortalOutlet, ComponentPortal, TemplatePortal, DomPortal}');
 const start=current.indexOf('function recordingOutlet() {'),end=current.indexOf('\nasync function loadService',start);assert.ok(start>0&&end>start);
 const fixtureBefore=current.slice(start,end);
 replace(fixtureBefore,`const outletFixtures=new Set();
function recordingOutlet(f) {
  const dom=portalDom();
  for(const name of ['appendChild','removeChild','insertBefore','replaceChild'])f.host[name]=dom.target[name];
  f.host.ELEMENT_NODE=1;dom.target=f.host;
  f.document.createComment=dom.document.createComment;dom.document=f.document;
  const actual=currentOutlet({CdkPortalOutlet},core,dom);outletFixtures.add(actual);return actual;
}
`);
 const calls=current.split('recordingOutlet()').length-1;assert.equal(calls,5);replace('recordingOutlet()','recordingOutlet(f)',calls);
 replace('new DomPortal(f.first)','new DomPortal(o.dom.element)');
 replace("assert.throws(() => f.instance.attachComponentPortal(new ComponentPortal(class Later {})), /disposed/);","assert.throws(() => f.instance.attach(new ComponentPortal(class Later {})), /disposed/);");
 replace('  return cases;','  for(const actual of outletFixtures)actual.destroy();outletFixtures.clear();\n  return cases;');
 // The original CLI branch is unused by this module adapter; no original
 // assertion, observation or mutation is removed from the generated program.
 replace('const args = process.argv.slice(2);','const args = [];');
 current+='\nexport {report};\n';
 const originalFile=ts.createSourceFile('original.mjs',raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),afterFile=ts.createSourceFile('current.mjs',current,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(originalFile.parseDiagnostics.length,0);assert.equal(afterFile.parseDiagnostics.length,0);
 const assertionCalls=file=>{const results=[];function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(file)==='assert')results.push(node.expression.name.text);ts.forEachChild(node,visit);}visit(file);return results;};
 assert.deepEqual(assertionCalls(afterFile),assertionCalls(originalFile),'current successor changed assertion kinds or their order');
 return {url:asUrl(current),original:{path,sha256:hash(raw),bytes:Buffer.byteLength(raw)},generated_sha256:hash(current),literal_edits:edits,original_assertion_calls:assertionCalls(originalFile).length};
}
