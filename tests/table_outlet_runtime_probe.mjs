/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual owned adapters/public parents with untouched tagged outlet/ownership expectations. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire(import.meta.url),ts=req('typescript'),url=name=>pathToFileURL(req.resolve(name)).href;
const sha=b=>createHash('sha256').update(b).digest('hex');
await import(url('@angular/compiler'));
const core=await import(url('@angular/core'));
const {BrowserModule}=await import(url('@angular/platform-browser'));
const {Platform}=await import(url('@angular/cdk/platform'));
const peer=await import(url('@angular/cdk/table'));
const peerPath=req.resolve('@angular/cdk/table'),peerHash=sha(readFileSync(peerPath));
const subjects=JSON.parse(readFileSync(resolve(root,'compatibility/rc/table-public-module-import-source-proof.json'),'utf8')).subjects;
const actualSubject=subjects.find(s=>s.members.find(m=>m.path.endsWith('.mjs')).sha256===peerHash);
assert.ok(actualSubject,'The diagnostic must execute one of the authenticated minimum table implementations.');
const base='projects/ngx-material-legacy/legacy-table/';
const tablePath=base+'table.ts',helperPath=base+'internal/table-outlet.ts',ownerPath=base+'internal/definition-owner.ts';
const tableSource=readFileSync(resolve(root,tablePath),'utf8'),helperSource=readFileSync(resolve(root,helperPath),'utf8'),ownerSource=readFileSync(resolve(root,ownerPath),'utf8');
const data=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const constructionContextSource=readFileSync(resolve(root,'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts'),'utf8');
const constructionContextCode=ts.transpileModule(constructionContextSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
 .replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,spec)=>JSON.stringify(url(spec)));
const constructionContextUrl='data:text/javascript;base64,'+Buffer.from(constructionContextCode).toString('base64');
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,
  module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
  .replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,name)=>JSON.stringify(url(name)))
 .replaceAll("'./internal/table-construction-context'", JSON.stringify(constructionContextUrl));
const tableUrl=data(emit(tableSource)),{MatLegacyTable}=await import(tableUrl);
async function load(source=helperSource,definition=ownerSource){return {...await import(data(emit(source))),...await import(data(emit(definition).replaceAll("'../table'",JSON.stringify(tableUrl))))};}
const provenance=JSON.parse(readFileSync(resolve(root,'reference/material-16.2.14/table-outlet-sources/provenance.json'),'utf8'));
for(const subject of provenance.files){const bytes=readFileSync(resolve(root,subject.path));assert.equal(sha(bytes),subject.sha256);assert.equal(bytes.length,subject.bytes);}
const originalSource=readFileSync(resolve(root,provenance.files.find(x=>x.tag_source==='src/cdk/table/table.ts').path),'utf8');
const originalAst=ts.createSourceFile('original.ts',originalSource,ts.ScriptTarget.Latest,true);
const classOf=name=>originalAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);
const names=['HeaderRowOutlet','DataRowOutlet','FooterRowOutlet','NoDataRowOutlet'];
const selectedClasses=names.map(name=>{const node=classOf(name);assert.ok(node);return node.getText(originalAst);});
const ownership=classOf('CdkTable').members.find(n=>n.name?.getText(originalAst)==='_getOwnDefs');assert.ok(ownership);
const sections=classOf('CdkTable').members.find(n=>n.name?.getText(originalAst)==='_applyNativeTableSections');assert.ok(sections);
const original=await import(data(emit(`import {Directive,ElementRef,ViewContainerRef} from '@angular/core';
${selectedClasses.join('\n')} export class OriginalOwnership {${ownership.getText(originalAst)} ${sections.getText(originalAst)}}`)));
const tableAst=ts.createSourceFile(tablePath,tableSource,ts.ScriptTarget.Latest,true);
const tableClass=tableAst.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyTable');
const metadata=ts.getDecorators(tableClass).find(n=>n.expression.expression?.text==='Component').expression.arguments[0];
const template=metadata.properties.find(n=>n.name?.getText(tableAst)==='template').initializer.text;
const slotName={HeaderRowOutlet:'header',DataRowOutlet:'data',FooterRowOutlet:'footer',NoDataRowOutlet:'empty'};
function taggedFrame(){
  const element=tag=>({tag,role:null,children:[],setAttribute(k,v){assert.equal(k,'role');this.role=v;},appendChild(child){this.children.push(child);}});
  const fragment={children:[],appendChild(child){this.children.push(child);}};
  const host={children:[],appendChild(child){this.children.push(...child.children);}};
  const context={_document:{createElement:element,createDocumentFragment:()=>fragment},_elementRef:new core.ElementRef(host)};
  for(const [field,name]of [['_headerRowOutlet','HeaderRowOutlet'],['_rowOutlet','DataRowOutlet'],['_footerRowOutlet','FooterRowOutlet'],['_noDataRowOutlet','NoDataRowOutlet']])
    context[field]=new original[name]({},new core.ElementRef({outlet:slotName[name]}));
  original.OriginalOwnership.prototype._applyNativeTableSections.call(context);
  return host.children.map(n=>({tag:n.tag,role:n.role,outlets:n.children.map(x=>x.outlet)}));
}
const expectedFrame=taggedFrame();
function nativeFrame(text){return [...text.matchAll(/<(thead|tbody|tfoot) role="([^"]+)">([\s\S]*?)<\/\1>/g)]
  .map(([,tag,role,content])=>({tag,role,outlets:[...content.matchAll(/legacyTableOutlet="([^"]+)"/g)].map(m=>m[1])}));}
function flexFrame(text){const content=text.split('} @else {')[1];assert.ok(content);return [...content.matchAll(/legacyTableOutlet="([^"]+)"/g)].map(m=>m[1]);}
const oldTemplate=originalAst.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations)
  .find(n=>n.name.getText(originalAst)==='CDK_TABLE_TEMPLATE').initializer.text;
const historicalSelector={headerRowOutlet:'header',rowOutlet:'data',noDataRowOutlet:'empty',footerRowOutlet:'footer'};
const expectedFlex=[...oldTemplate.matchAll(/<ng-container (\w+)>/g)].map(m=>historicalSelector[m[1]]);
const environment=core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),core.provideZonelessChangeDetection(),
  {provide:core.DOCUMENT,useValue:{}},{provide:core.PLATFORM_ID,useValue:'server'},{provide:Platform,useValue:{isBrowser:false}}],core.Injector.NULL);
let borrowedDestroyed=0;
function fixture(Table=MatLegacyTable){
  const attributes=new Map(),ref=new core.ElementRef({nodeName:'TABLE',setAttribute:(k,v)=>attributes.set(k,v),getAttribute:k=>attributes.get(k)||null});
  const detector={markForCheck(){},ngOnDestroy(){borrowedDestroyed++;}};
  class NodeContext extends core.Injector {
    get(token,notFoundValue,options){
      if(token===core.Injector)return this;
      if(token===core.ElementRef)return ref;
      if(token===core.ChangeDetectorRef)return detector;
      if(token instanceof core.HostAttributeToken)return null;
      if(notFoundValue===null||typeof options==='object'&&options?.optional)return null;
      return environment.get(token,notFoundValue,options);
    }
  }
  const context=new NodeContext(),table=core.runInInjectionContext(context,()=>new Table());
  return {table,context,ref,close(){table.ngOnDestroy();}};
}
const slots=[['header','_headerRowOutlet','HeaderRowOutlet'],['data','_rowOutlet','DataRowOutlet'],
  ['footer','_footerRowOutlet','FooterRowOutlet'],['empty','_noDataRowOutlet','NoDataRowOutlet']];
async function observations(mod){
  const cases=[];async function check(id,run){try{await run();cases.push({id,result:'pass'});}catch(e){cases.push({id,result:'fail',error:String(e.message).slice(0,500)});}}
  for(const [kind,field,name]of slots)await check('tagged-'+kind+'-outlet-borrows-exact-container-and-element',()=>{
    const f=fixture();try{
      assert.ok(f.table instanceof peer.CdkTable);assert.ok(f.table instanceof MatLegacyTable);
      const container={clear(){}},element=new core.ElementRef({nodeType:8}),historical=new original[name](container,element);
      const outlet=new mod._LegacyTableOutlet(f.table,container,element);outlet.kind=kind;
      let notified=0;f.table._outletAssigned=()=>{assert.equal(f.table[field],outlet);notified++;};outlet.ngOnInit();
      assert.equal(outlet.viewContainer,historical.viewContainer);assert.equal(outlet.elementRef,historical.elementRef);
      assert.equal(f.table[field],outlet);assert.equal(notified,1);
      for(const [,other]of slots)if(other!==field)assert.equal(f.table[other],undefined);
    }finally{f.close();}
  });
  await check('invalid-outlet-kind-rejects-before-assignment-or-notification',()=>{
    const f=fixture();try{
      let notified=0;f.table._outletAssigned=()=>notified++;
      const outlet=new mod._LegacyTableOutlet(f.table,{clear(){}},new core.ElementRef({}));outlet.kind='unknown';
      assert.throws(()=>outlet.ngOnInit(),/Unknown legacy table outlet/);assert.equal(notified,0);
      for(const [,field]of slots)assert.equal(f.table[field],undefined);
    }finally{f.close();}
  });
  await check('actual-peer-outlet-notification-requires-all-four',()=>{
    const f=fixture();try{
      f.table.ngAfterContentInit();let renders=0;f.table._render=()=>renders++;
      for(const [index,[kind]]of slots.entries()){
        const outlet=new mod._LegacyTableOutlet(f.table,{clear(){}},new core.ElementRef({}));outlet.kind=kind;outlet.ngOnInit();
        assert.equal(renders,index===3?1:0);
      }
      assert.equal(f.table._canRender(),true);
    }finally{f.close();}
  });
  await check('raw-public-peer-definitions-bind-to-the-nearest-legacy-table',()=>{
    const outer=fixture(),inner=fixture();try{
      const definitions=[peer.CdkColumnDef,peer.CdkHeaderRowDef,peer.CdkFooterRowDef,peer.CdkRowDef].map(Definition=>{
        class DefinitionContext extends core.Injector{get(token,notFoundValue,options){
          if(token===core.TemplateRef)return {taggedTemplate:true};return inner.context.get(token,notFoundValue,options);
        }}
        return core.runInInjectionContext(new DefinitionContext(),()=>new Definition());
      });
      for(const definition of definitions)assert.equal(definition._table,null);
      new mod._LegacyTableDefinitionOwner(inner.table,...definitions);
      for(const definition of definitions)assert.equal(definition._table,inner.table);
      const detached={_table:null},outerDef={_table:outer.table},all=[outerDef,...definitions,detached];
      assert.deepEqual(outer.table._getOwnDefs(all),original.OriginalOwnership.prototype._getOwnDefs.call(outer.table,all));
      assert.deepEqual(outer.table._getOwnDefs(all),[outerDef,detached]);
      assert.deepEqual(inner.table._getOwnDefs(all),[...definitions,detached]);
    }finally{outer.close();inner.close();}
  });
  await check('current-peer-table-ownership-is-not-overwritten',()=>{
    const f=fixture(peer.CdkTable);try{
      const prior={currentPeerOwner:true},definitions=Array.from({length:4},()=>({_table:prior}));
      new mod._LegacyTableDefinitionOwner(f.table,...definitions);
      for(const definition of definitions)assert.equal(definition._table,prior);
    }finally{f.close();}
  });
  await check('optional-definitions-and-missing-table-do-not-clobber-ownership',()=>{
    const f=fixture();try{
      new mod._LegacyTableDefinitionOwner(f.table,null,null,null,null);
      const prior={custom:true},definition={_table:prior};
      new mod._LegacyTableDefinitionOwner(null,definition,null,null,null);assert.equal(definition._table,prior);
    }finally{f.close();}
  });
  await check('legacy-table-subclasses-retain-definition-ownership',()=>{
    class ExtendedTable extends MatLegacyTable{}const f=fixture(ExtendedTable);try{
      const definition={_table:null};new mod._LegacyTableDefinitionOwner(f.table,null,null,null,definition);
      assert.equal(definition._table,f.table);
    }finally{f.close();}
  });
  await check('native-row-group-source-structure-matches-tagged-sections',()=>assert.deepEqual(nativeFrame(template),expectedFrame));
  await check('flex-outlet-source-order-matches-tagged-template',()=>assert.deepEqual(flexFrame(template),expectedFlex));
  return cases;
}
let result;
try{
  const cases=await observations(await load());assert.equal(cases.filter(c=>c.result!=='pass').length,0,JSON.stringify(cases));
  const edits=[['wrong-header-slot','this.table._headerRowOutlet = this','this.table._footerRowOutlet = this'],
    ['wrong-data-slot','this.table._rowOutlet = this','this.table._footerRowOutlet = this'],
    ['wrong-empty-slot','this.table._noDataRowOutlet = this','this.table._rowOutlet = this'],
    ['missing-notification','this.table._outletAssigned();',''],
    ['notification-before-assignment','switch (this.kind) {','this.table._outletAssigned(); switch (this.kind) {'],
    ['unbound-definitions','definition._table = table','definition._table = null'],
    ['clobber-current-table','table instanceof MatLegacyTable','table instanceof CdkTable'],
    ['missing-row-owner','[column, header, footer, row]','[column, header, footer]']];
  const mutants=[];for(const [id,from,to]of edits){assert.ok(helperSource.includes(from)||ownerSource.includes(from));
    const observed=await observations(await load(helperSource.replace(from,to),ownerSource.replace(from,to)));
    const failures=observed.filter(c=>c.result==='fail');assert.ok(failures.length,id+' escaped');mutants.push({id,failed_cases:failures});
  }
  for(const [id,text,actual,expected]of [
    ['wrong-native-row-group-role',template.replace('role="rowgroup"','role="grid"'),nativeFrame,expectedFrame],
    ['wrong-flex-no-data-outlet',template.replace(/(} @else {[\s\S]*)legacyTableOutlet="empty"/,'$1legacyTableOutlet="footer"'),flexFrame,expectedFlex],
  ]){assert.notEqual(text,template);assert.notDeepEqual(actual(text),expected);mutants.push({id,rejected_by:'untouched-tagged-structure-comparison'});}
  assert.equal(borrowedDestroyed,0);
  result={node:process.version,compiler:ts.version,actual_peer:{path:peerPath,sha256:peerHash,version:actualSubject.version},sources:[tablePath,helperPath,ownerPath].map(path=>({path,sha256:sha(readFileSync(resolve(root,path)))})),
    original_provenance:provenance,selected_original_class_source:selectedClasses,selected_original_ownership_source:ownership.getText(originalAst),
    selected_original_sections_source:sections.getText(originalAst),tagged_native_frame:expectedFrame,tagged_flex_outlet_order:expectedFlex,cases,mutants,
    borrowed_destroyed:borrowedDestroyed,limits:['Real current public CdkTable and definition constructors under a synthetic public node/root context.',
      'The readiness case observes the real peer notification method with a rendering callback spy; it does not prove native row rendering.',
      'Untouched original outlet constructors and ownership method are extracted and executed; native/template/AOT/packed/actual21/floor qualification remains separate.']};
}finally{environment.destroy();}
assert.equal(borrowedDestroyed,0);
const args=process.argv.slice(2),at=args.indexOf('--report');if(at>=0)writeFileSync(args[at+1],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:result.cases.length,mutants:result.mutants.length}));
