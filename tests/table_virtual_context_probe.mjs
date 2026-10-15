/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Constructor/node-DI diagnostic. The real legacy-view regression is in table.spec.ts. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.env.CLOSEOUT_TABLE_SOURCE_ROOT||resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(resolve(process.env.CLOSEOUT_TABLE_PEERS||root,'package.json'));
const ts=createRequire(resolve(root,'package.json'))('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
await import(pathToFileURL(require.resolve('@angular/compiler')));
const core=await import(pathToFileURL(require.resolve('@angular/core')));
const common=await import(pathToFileURL(require.resolve('@angular/common')));
const browser=await import(pathToFileURL(require.resolve('@angular/platform-browser')));
const table=await import(pathToFileURL(require.resolve('@angular/cdk/table')));
const scrolling=await import(pathToFileURL(require.resolve('@angular/cdk/scrolling')));
const coercion=await import(pathToFileURL(require.resolve('@angular/cdk/coercion')));
const platform=await import(pathToFileURL(require.resolve('@angular/cdk/platform')));
const bidi=await import(pathToFileURL(require.resolve('@angular/cdk/bidi')));
const tablePath='projects/ngx-material-legacy/legacy-table/table.ts';
const helperPath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts';
const source=readFileSync(resolve(root,tablePath),'utf8'),helperSource=readFileSync(resolve(root,helperPath),'utf8');
const file=ts.createSourceFile(tablePath,source,ts.ScriptTarget.Latest,true);
const cls=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyTable');
assert.ok(ts.getDecorators(cls).some(d=>d.expression.getText(file)==='preserveLegacyTableViewport'));
const mode=process.argv[2]??'owned';assert.ok(['owned','unmasked','view-provider'].includes(mode));
const helperFile=ts.createSourceFile(helperPath,helperSource,ts.ScriptTarget.Latest,true);
const helperCode=ts.transpileModule(helperFile.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(helperFile)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const helper={};new Function('exports','Injector','inject','runInInjectionContext','CdkTable','CDK_VIRTUAL_SCROLL_VIEWPORT',helperCode)(helper,core.Injector,core.inject,core.runInInjectionContext,table.CdkTable,scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT);
const code=(mode==='owned'?'@preserveLegacyTableViewport\n':'')+'class MatLegacyTable extends CdkTable {\n'+cls.members.map(n=>n.getText(file)).join('\n')+
'\nngOnInit(){} ngAfterContentInit(){} ngAfterContentChecked(){} ngAfterViewInit(){} ngOnDestroy(){}\n}';
const program=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;
const Probe=new Function('CdkTable','assertInInjectionContext','coerceBooleanProperty','preserveLegacyTableViewport',program+';return MatLegacyTable;')(table.CdkTable,core.assertInInjectionContext,coercion.coerceBooleanProperty,helper.preserveLegacyTableViewport);
const readers=[];class TokenReader {constructor(){this.viewport=core.inject(scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,{optional:true});readers.push(this);}}core.Input()(TokenReader.prototype,'kind');
core.Component({selector:'token-reader',standalone:true,template:''})(TokenReader);
core.Component({selector:'table-constructor-probe',standalone:true,viewProviders:mode==='view-provider'?[{provide:scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,useValue:null}]:[],imports:[TokenReader],template:'<ng-content></ng-content><token-reader kind="internal"></token-reader><ng-container #outlet></ng-container>'})(Probe);core.ViewChild(TokenReader)(Probe.prototype,'reader');core.ContentChild(core.TemplateRef)(Probe.prototype,'cellTemplate');core.ViewChild('outlet',{read:core.ViewContainerRef})(Probe.prototype,'outlet');Probe.prototype.ngAfterViewInit=function(){if(this.cellTemplate)this.outlet.createEmbeddedView(this.cellTemplate);};
class ConsumerTable extends Probe {
 marker='consumer';
 viewportAfterSuper=core.inject(scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,{optional:true});
}
core.Component({selector:'consumer-table-probe',standalone:true,viewProviders:mode==='view-provider'?[{provide:scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,useValue:null}]:[],imports:[TokenReader],template:'<ng-content></ng-content><token-reader kind="internal"></token-reader><ng-container #outlet></ng-container>'})(ConsumerTable);
const viewport={kind:'explicit viewport token protocol'};
class Witness{};core.Directive({selector:'[viewportWitness]',standalone:true,providers:[{provide:scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT,useValue:viewport}]})(Witness);
class Boundary{};core.Component({selector:'context-boundary',standalone:true,imports:[ConsumerTable,TokenReader],template:'<consumer-table-probe><token-reader kind="projected"></token-reader><ng-template><token-reader kind="embedded"></token-reader></ng-template></consumer-table-probe>'})(Boundary);core.ViewChild(ConsumerTable)(Boundary.prototype,'table');
class Root{};core.Component({selector:'table-context-root',standalone:true,imports:[Probe,Witness,Boundary,TokenReader],template:'<div viewportWitness><table-constructor-probe><token-reader kind="projected"></token-reader><ng-template><token-reader kind="embedded"></token-reader></ng-template></table-constructor-probe><context-boundary></context-boundary></div>'})(Root);core.ViewChild(Probe)(Root.prototype,'table');core.ViewChild(Boundary)(Root.prototype,'boundary');
const host={children:[],attrs:{},nodeName:'TABLE-CONTEXT-ROOT',getAttribute(){return null;}};
const renderer={data:{},destroy(){},createElement:name=>({name,nodeName:name.toUpperCase(),children:[],attrs:{},getAttribute(key){return this.attrs[key]??null;},setAttribute(key,value){this.attrs[key]=value;}}),createComment:text=>({textContent:text}),createText:text=>({textContent:text}),
 appendChild(parent,child){parent.children.push(child);child.parent=parent;},insertBefore(parent,child){parent.children.push(child);child.parent=parent;},removeChild(parent,child){if(parent)parent.children=parent.children.filter(c=>c!==child);},selectRootElement:()=>host,parentNode:node=>node.parent??null,nextSibling:()=>null,
 setAttribute(node,key,value){node.attrs[key]=value;},removeAttribute(node,key){delete node.attrs[key];},addClass(){},removeClass(){},setStyle(){},removeStyle(){},setProperty(node,key,value){node[key]=value;},setValue(node,value){node.textContent=value;},listen:()=>()=>{}};
const app=await browser.createApplication({providers:[core.provideZonelessChangeDetection(),{provide:platform.Platform,useValue:{isBrowser:false}},{provide:scrolling.ViewportRuler,useValue:{}},{provide:bidi.Directionality,useValue:{value:"ltr",change:new core.EventEmitter()}},{provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},{provide:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll:()=>[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}]});
let ref;
try{
 ref=core.createComponent(Root,{environmentInjector:app.injector,hostElement:host});app.attachView(ref.hostView);app.tick();
 const direct=ref.instance.table,nested=ref.instance.boundary.table;
 assert.ok(direct instanceof table.CdkTable&&nested instanceof table.CdkTable);
 assert.ok(nested instanceof ConsumerTable);assert.equal(nested.marker,'consumer');assert.equal(nested.viewportAfterSuper,mode==='view-provider'?null:viewport);
 assert.equal(direct.needsPositionStickyOnElement,false);assert.equal(direct.stickyCssClass,'mat-table-sticky');
 assert.equal(direct.fixedLayout,mode==='unmasked');assert.equal(nested.fixedLayout,false);
 for(const value of [false,true,'false','',null,undefined]){direct.fixedLayout=value;assert.equal(direct.fixedLayout,mode==='unmasked'?true:coercion.coerceBooleanProperty(value));direct.multiTemplateDataRows=value;assert.equal(direct.multiTemplateDataRows,coercion.coerceBooleanProperty(value));}
 direct.fixedLayout=false;
 assert.throws(()=>new Probe(),/NG0203/);
 assert.throws(()=>core.runInInjectionContext(app.injector,()=>new Probe({})),/manual dependency arguments/);
 const witnessToken=new core.InjectionToken('construction exception restoration');
 const exceptionContext=core.createEnvironmentInjector([{provide:witnessToken,useValue:viewport}],app.injector);
 try{core.runInInjectionContext(exceptionContext,()=>{assert.throws(()=>new Probe(),/NG0201/);assert.equal(core.inject(witnessToken),viewport);});}finally{exceptionContext.destroy();}
 assert.equal(direct.reader.viewport===viewport,mode!=='view-provider');assert.equal(nested.reader.viewport===viewport,mode!=='view-provider');if(mode==='view-provider')assert.ok(readers.some(r=>r.kind==='embedded'&&r.viewport==null));if(mode!=='view-provider')for(const r of readers.filter(r=>r.kind!=='internal'))assert.equal(r.viewport,viewport,'projected/embedded content viewport must remain visible');
 const result={mode,readers:readers.map(r=>({kind:r.kind,ancestor_viewport:r.viewport===viewport,absent:r.viewport==null})),framework:core.VERSION.full,cdk:require('@angular/cdk/package.json').version,node:process.version,
 direct:{captured_ancestor_viewport:direct._virtualScrollViewport===viewport,public_fixedLayout:direct.fixedLayout,sticky_class:direct.stickyCssClass, descendant_viewport_preserved:direct.reader.viewport===viewport,later_injector_viewport_preserved:direct._injector.get(scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT)===viewport},
 nested:{captured_ancestor_viewport:nested._virtualScrollViewport===viewport,viewport_absent:nested._virtualScrollViewport==null,public_fixedLayout:nested.fixedLayout},
 scope:'Actual Angular node DI and whole real public CdkTable constructor with complete owned constructor/fields/accessors; renderer, viewport, platform, ruler and directionality are protocols; lifecycle hooks replaced to isolate constructor; unmasked/view-provider modes are negative controls; actual owned constructor helper executes in owned mode; projected and imperatively embedded content are observed independently. No actual legacy template/view, real viewport, DOM/browser/AOT/packed or full floor qualification.'};
 const peerBytes=readFileSync(require.resolve('@angular/cdk/table'));
 const authenticated=JSON.parse(readFileSync(resolve(root,'compatibility/rc/table-public-module-import-source-proof.json'))).subjects.find(s=>s.members.some(m=>m.path.endsWith('.mjs')&&m.sha256===hash(peerBytes)));assert.ok(authenticated,'execute an authenticated exact minimum public table');
 result.authenticated_table_version=authenticated.version;
 result.source_members=[tablePath,helperPath].map(path=>({path,sha256:hash(readFileSync(resolve(root,path)))}));
 result.consumer_subclass_fields_preserved=mode!=='view-provider';result.exception_context_restored=true;
 const reportAt=process.argv.indexOf('--report');if(reportAt>=0)writeFileSync(process.argv[reportAt+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result));
}finally{ref?.destroy();app.destroy();}
