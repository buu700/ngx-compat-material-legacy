/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded constructor failure reproduction; real public parent/root, synthetic DOM. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {originalInheritedConstructor,diParamsOf,originalFactoryContract} from '../scripts/api-surface.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),ts=require('typescript'),url=name=>pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const core=await import(url('@angular/core'));
const {BrowserModule,platformBrowser}=await import(url('@angular/platform-browser'));
const {FocusMonitor}=await import(url('@angular/cdk/a11y'));
const {MatMenuItem}=await import(url('@angular/material/menu'));
const path='projects/ngx-material-legacy/legacy-menu/menu-item.ts',raw=readFileSync(resolve(root,path),'utf8');
const js=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
 .replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,name)=>JSON.stringify(url(name)));
const {MatLegacyMenuItem}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const reference='reference/material-16.2.14/menu-item-sources/material-menu-item.ts';
const old=readFileSync(resolve(root,reference),'utf8');assert.equal(sha(old),'cc176409b67585676aa97714145e5fad042a8ca7626c63a87527c5ed83372bd8');
const file=ts.createSourceFile(reference,old,ts.ScriptTarget.Latest,true);
const declaration=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatMenuItem');
const implementation={...declaration,members:ts.factory.createNodeArray(declaration.members.filter(n=>!ts.isConstructorDeclaration(n)||n.body))};
const di=diParamsOf(implementation,file);assert.equal(di.length,5);assert.equal(di[3].optional,true);
const contract=originalInheritedConstructor('/original/src/material/legacy-menu/menu-item.ts','MatLegacyMenuItem');assert.equal(contract.signatures.length,2);
const cases=[];async function check(id,run){try{await run();cases.push({id,result:'pass'});}catch(error){cases.push({id,result:'fail',error:String(error.message).slice(0,600)});}}
const hadDocument=Object.hasOwn(globalThis,'document'),priorDocument=globalThis.document;
const operations=[];
function element(name,document){const value={name,nodeName:'DIV',nodeType:1,childNodes:[],attributes:{},parentNode:null,
 setAttribute(key,text){this.attributes[key]=text;},getAttribute(key){return this.attributes[key]??null;},removeAttribute(key){delete this.attributes[key];},
 appendChild(child){this.childNodes.push(child);child.parentNode=this;return child;},removeChild(child){this.childNodes.splice(this.childNodes.indexOf(child),1);child.parentNode=null;return child;},
 remove(){this.parentNode?.removeChild(this);},addEventListener(){},removeEventListener(){},querySelectorAll(){return[];},querySelector(){return null;},
 classList:{add(){},remove(){}},style:{setProperty(){},removeProperty(){}},
 focus(options){document.activeElement=this;operations.push({kind:'focus',name,options});},
 cloneNode(){return{textContent:'Label',querySelectorAll(){return[];}}},};return value;}
function doc(name){const d={activeElement:null,createElement(tag){operations.push({kind:'create-element',document:name,tag});return element(tag,d);},
 querySelectorAll(){return[];},querySelector(){return null;},createTextNode(text){return{nodeType:3,textContent:text};}};
 d.head=element('head',d);d.body=element('body',d);return d;}
const document=doc('root'),suppliedDocument=doc('supplied');
const suppliedElement=new core.ElementRef(element('supplied-host',suppliedDocument));
let suppliedMarks=0,suppliedAdds=0,suppliedRemoves=0;const suppliedFocus=[];
const suppliedMonitor={monitor(ref,checkChildren){suppliedFocus.push({kind:'monitor',ref,checkChildren});},
 stopMonitoring(ref){suppliedFocus.push({kind:'stop',ref});},focusVia(target,origin,options){suppliedFocus.push({kind:'focus',target,origin,options});target.focus(options);}};
const suppliedParent={addItem(item){suppliedAdds++;},removeItem(item){suppliedRemoves++;}};
const suppliedDetector={markForCheck(){suppliedMarks++;}};
const args=[suppliedElement,suppliedDocument,suppliedMonitor,suppliedParent,suppliedDetector];
await check('original-five-arguments-outside-injection-context',async()=>{const item=new MatLegacyMenuItem(...args);
 assert.equal(item._getHostElement(),suppliedElement.nativeElement);item.ngOnDestroy();});
await check('original-short-form-with-only-element',async()=>{const item=new MatLegacyMenuItem(suppliedElement);
 item.focus();assert.equal(suppliedDocument.activeElement,suppliedElement.nativeElement);item.ngOnDestroy();});
globalThis.document=document;
let platform,environment;
try{
 platform=platformBrowser([{provide:core.DOCUMENT,useValue:document}]);
 environment=core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),core.provideZonelessChangeDetection(),
  {provide:core.DOCUMENT,useValue:document},{provide:core.PLATFORM_ID,useValue:'browser'}],core.Injector.NULL);
 const ambientElement=new core.ElementRef(element('ambient-host',document));
 const ambientMonitor={monitor(){},stopMonitoring(){},focusVia(target,origin,options){target.focus(options);}};
 const ambientDetector={markForCheck(){}};
 class Borrowed extends core.Injector{get(token,notFound){if(token===core.ElementRef)return ambientElement;
  if(token===core.DOCUMENT)return document;if(token===FocusMonitor)return ambientMonitor;
  if(token===core.ChangeDetectorRef)return ambientDetector;return environment.get(token,notFound);}}
 async function use(run){const item=core.runInInjectionContext(new Borrowed(),()=>new MatLegacyMenuItem(...args));
  try{return await run(item);}finally{item.ngOnDestroy();}}
 await check('supplied-element-overrides-different-ambient-element',()=>use(item=>{
  assert.equal(item._getHostElement(),suppliedElement.nativeElement);assert.ok(item instanceof MatMenuItem);}));
 await check('supplied-focus-monitor-and-options-are-honored',()=>use(item=>{
  const before=suppliedFocus.length,options={preventScroll:true};item.ngAfterViewInit();item.focus('keyboard',options);
  assert.equal(suppliedFocus.length,before+2);assert.equal(suppliedFocus.at(-1).target,suppliedElement.nativeElement);
  assert.equal(suppliedFocus.at(-1).origin,'keyboard');assert.equal(suppliedFocus.at(-1).options,options);}));
 await check('supplied-change-detector-marks-both-public-state-setters',()=>use(item=>{
  const before=suppliedMarks;item._setHighlighted(true);item._setTriggersSubmenu(true);assert.equal(suppliedMarks,before+2);}));
 await check('supplied-parent-is-registered-and-retained',()=>use(item=>{
  assert.equal(item._parentMenu,suppliedParent);assert.ok(suppliedAdds>0);}));
 await check('supplied-document-controls-has-focus',()=>use(item=>{
  suppliedDocument.activeElement=suppliedElement.nativeElement;document.activeElement=null;assert.equal(item._hasFocus(),true);}));
}finally{environment?.destroy();platform?.destroy();if(hadDocument)globalThis.document=priorDocument;else delete globalThis.document;}
const argv=process.argv.slice(2),baseline=argv.includes('--baseline');
if(!baseline)assert.ok(cases.every(c=>c.result==='pass'),JSON.stringify(cases.filter(c=>c.result==='fail')));
const report={schema_version:1,role:'Unresolved original menu-item constructor reproduction;not repaired/native/AOT/packed/minimum qualification',
 node:process.version,compiler:ts.version,runtime_peer:core.VERSION.full,source:{path,sha256:sha(raw)},
 untouched_reference:{path:reference,sha256:sha(old)},original_constructor:contract,original_di:di,
 original_leaf_factory:originalFactoryContract('/original/src/material/legacy-menu/menu-item.ts','MatLegacyMenuItem'),
 cases,root_style_operations:operations.filter(o=>o.kind==='create-element'),supplied_parent_counts:{adds:suppliedAdds,removes:suppliedRemoves},
 limits:['Actual owned leaf/current publicMatMenuItem executes under public platformBrowser/BrowserModule/zoneless root with synthetic DOM.',
 'Borrowed injector only supplies public tokens and delegates framework services to public root;no private token/provider imported or mocked.',
 'Root fixture lifetime is scoped to this process;not an approved product bootstrap/constructor adaptation.',
 'No actual21/native/SSR/CSP/AOT/packed/canonical/floor qualification or constructor exclusion.']};
const at=argv.indexOf('--report');if(at!==-1){assert.equal(existsSync(argv[at+1]),false);writeFileSync(argv[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({cases:cases.length,failed:cases.filter(c=>c.result==='fail'),supplied_parent_counts:report.supplied_parent_counts,
 node:process.version,compiler:ts.version,runtime_peer:core.VERSION.full}));
