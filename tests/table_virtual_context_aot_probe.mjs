/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Focused compiler/factory diagnostic; the real legacy view remains an artifact-family gate. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(import.meta.url);
const ts=req('typescript'),url=spec=>pathToFileURL(req.resolve(spec));
const ng=await import(url('@angular/compiler-cli'));
await import(url('@angular/compiler'));
const core=await import(url('@angular/core')),common=await import(url('@angular/common'));
const browser=await import(url('@angular/platform-browser')),cdk=await import(url('@angular/cdk/table'));
const scrolling=await import(url('@angular/cdk/scrolling'));
const {Platform}=await import(url('@angular/cdk/platform')),{Directionality}=await import(url('@angular/cdk/bidi'));
const tablePath='projects/ngx-material-legacy/legacy-table/table.ts';
const helperPath='projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts';
const source=readFileSync(resolve(root,tablePath),'utf8'),helper=readFileSync(resolve(root,helperPath),'utf8');
const parsed=ts.createSourceFile(tablePath,source,ts.ScriptTarget.Latest,true);
const owned=parsed.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyTable');
assert.ok(ts.getDecorators(owned).some(d=>d.expression.getText(parsed)==='preserveLegacyTableViewport'));
const fixture=`import {Component,Directive,ViewChild,ChangeDetectionStrategy,assertInInjectionContext} from '@angular/core';
import {CdkTable} from '@angular/cdk/table';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {CDK_VIRTUAL_SCROLL_VIEWPORT} from '@angular/cdk/scrolling';
import {preserveLegacyTableViewport} from './table-construction-context';
type BooleanInput=string|boolean|null|undefined;
export const viewport={kind:'explicit ancestor viewport protocol'};
@Directive({selector:'[viewportWitness]',standalone:true,providers:[{provide:CDK_VIRTUAL_SCROLL_VIEWPORT,useValue:viewport}]})
class Witness{}
@preserveLegacyTableViewport
@Component({selector:'owned-table-probe',standalone:true,template:''})
export class MatLegacyTable<T> extends CdkTable<T>{
${owned.members.map(n=>n.getText(parsed)).join('\n')}
// Explicit fixture substitutions isolate construction and input/factory metadata.
override ngOnInit(){} override ngAfterContentInit(){} override ngAfterContentChecked(){}
ngAfterViewInit(){} override ngOnDestroy(){}
}
@Component({selector:'table-probe-host',standalone:true,changeDetection:ChangeDetectionStrategy.Eager,
 imports:[MatLegacyTable,Witness],template:'<div viewportWitness><owned-table-probe [dataSource]="rows" [fixedLayout]="fixed" [multiTemplateDataRows]="true" [recycleRows]="false" [trackBy]="track"></owned-table-probe></div>'})
export class Host{rows=[{id:1}];fixed=false;track=(_index:number,row:{id:number})=>row.id;
 @ViewChild(MatLegacyTable) table!:MatLegacyTable<{id:number}>;}
function publicParent(owned:MatLegacyTable<{id:number}>):CdkTable<{id:number}>{return owned;}
`;
const temp=mkdtempSync(join(tmpdir(),'table-viewport-aot-')),compilations=[],factories=[];
try{
 const modules=req.resolve('typescript').split('/node_modules/')[0]+'/node_modules';
 symlinkSync(modules,join(temp,'node_modules'),'dir');
 writeFileSync(join(temp,'table-construction-context.ts'),helper);
 for(const [mode,negative]of [['full',false],['partial',false],['full',true]]){
  const name=negative?'invalid':'fixture',outDir=join(temp,mode+'-'+name);
  const candidateFixture=fixture.replaceAll('owned-table-probe',mode+'-owned-table-probe').replaceAll('table-probe-host',mode+'-table-probe-host');
  writeFileSync(join(temp,name+'.ts'),negative?candidateFixture.replace('[dataSource]="rows"','[unknownTableInput]="rows"'):candidateFixture);
  const result=ng.performCompilation({rootNames:[join(temp,name+'.ts')],options:{
   strict:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,
   moduleResolution:ts.ModuleResolutionKind.Bundler,lib:['lib.es2022.d.ts','lib.dom.d.ts'],
   experimentalDecorators:true,skipLibCheck:false,declaration:true,outDir,
   strictTemplates:true,strictInjectionParameters:true,compilationMode:mode,
  }});
  const errors=result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error)
   .map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
  if(negative){assert.equal(errors.length,1,JSON.stringify(errors));assert.equal(errors[0].code,-998002);assert.match(errors[0].message,/unknownTableInput/);}
  else assert.deepEqual(errors,[]);
  compilations.push({mode,negative,errors});if(negative)continue;
  // Node needs explicit ESM extensions. The emitted Angular factories/metadata are untouched.
  writeFileSync(join(outDir,'table-construction-context.mjs'),readFileSync(join(outDir,'table-construction-context.js')));
  const emitted=readFileSync(join(outDir,'fixture.js'),'utf8');
  assert.equal(emitted.split("'./table-construction-context'").length,2);
  writeFileSync(join(outDir,'fixture.mjs'),emitted.replace("'./table-construction-context'","'./table-construction-context.mjs'"));
  const {Host,MatLegacyTable,viewport}=await import(pathToFileURL(join(outDir,'fixture.mjs')));
  const element=name=>({nodeName:name.toUpperCase(),children:[],attrs:{},getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;}});
  const host=element('table-probe-host');
  const renderer={data:{},destroy(){},createElement:element,createComment:text=>({textContent:text}),createText:text=>({textContent:text}),
   appendChild(p,c){p.children.push(c);c.parent=p;},insertBefore(p,c){p.children.push(c);c.parent=p;},removeChild(p,c){if(p)p.children=p.children.filter(x=>x!==c);},selectRootElement:()=>host,parentNode:n=>n.parent??null,nextSibling:()=>null,
   setAttribute(n,k,v){n.attrs[k]=v;},removeAttribute(n,k){delete n.attrs[k];},addClass(){},removeClass(){},setStyle(){},removeStyle(){},setProperty(n,k,v){n[k]=v;},setValue(n,v){n.textContent=v;},listen:()=>()=>{}};
  const app=await browser.createApplication({providers:[core.provideZonelessChangeDetection(),
   {provide:Platform,useValue:{isBrowser:false}},{provide:scrolling.ViewportRuler,useValue:{}},
   {provide:Directionality,useValue:{value:'ltr',change:new core.EventEmitter()}},
   {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
   {provide:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll:()=>[]}}},
   {provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}]});
  let ref;
  try{
   ref=core.createComponent(Host,{environmentInjector:app.injector,hostElement:host});app.attachView(ref.hostView);app.tick();
   const table=ref.instance.table;assert.ok(table instanceof MatLegacyTable&&table instanceof cdk.CdkTable);
   assert.equal(table.fixedLayout,false);assert.equal(table.multiTemplateDataRows,true);assert.equal(table.recycleRows,false);
   assert.equal(table.dataSource,ref.instance.rows);assert.equal(table.trackBy,ref.instance.track);
   assert.equal(table.stickyCssClass,'mat-table-sticky');assert.equal(table.needsPositionStickyOnElement,false);
   assert.equal(table._virtualScrollViewport,null);assert.equal(table._injector.get(scrolling.CDK_VIRTUAL_SCROLL_VIEWPORT),viewport);
   ref.instance.fixed=true;ref.changeDetectorRef.detectChanges();assert.equal(table.fixedLayout,true);
   factories.push({mode,compiled_component_factory_executed:true,inherited_inputs:5,derived_fields_preserved:true,viewport_capture_absent:true});
  }finally{ref?.destroy();app.destroy();}
 }
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const report={node:process.version,typescript:ts.version,framework:core.VERSION.full,compiler:JSON.parse(readFileSync(req.resolve('@angular/compiler-cli/package.json'))).version,
  source_members:[tablePath,helperPath].map(path=>({path,sha256:sha(readFileSync(resolve(root,path)))})),compilations,factories,
  scope:'Full/partial AOT of an isolated two-file fixture using the complete actual owned constructor/fields/accessors and unchanged constructor helper. Actual compiled factories, public parent and five inherited inputs execute under Angular node DI. Renderer/viewport/services are protocols, template is empty and lifecycle hooks are no-ops. No whole legacy library/template/native/packed/floor qualification.'};
 const at=process.argv.indexOf('--report');if(at>=0)writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({framework:report.framework,compiler:report.compiler,compilations:compilations.length,factories}));
}finally{rmSync(temp,{recursive:true,force:true});}
