/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Historical manual construction versus actual public parent and adopted Angular DI policy. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire(import.meta.url),ts=req('typescript'),url=spec=>pathToFileURL(req.resolve(spec)).href;
const sha=b=>createHash('sha256').update(b).digest('hex'),data=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
await import(url('@angular/compiler'));
const core=await import(url('@angular/core')),{BrowserModule}=await import(url('@angular/platform-browser'));
const {Platform}=await import(url('@angular/cdk/platform')),peer=await import(url('@angular/cdk/table'));
const rx=await import(url('rxjs'));
const path='projects/ngx-material-legacy/legacy-table/table.ts',source=readFileSync(resolve(root,path),'utf8');
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,
  module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
  .replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_,q,spec)=>JSON.stringify(url(spec)));
const {MatLegacyTable}=await import(data(emit(source)));
const provenancePaths=['reference/material-16.2.14/table-outlet-sources/provenance.json',
  'reference/material-16.2.14/table-constructor-sources/provenance.json'];
const originals=provenancePaths.flatMap(path=>JSON.parse(readFileSync(resolve(root,path),'utf8')).files);
for(const original of originals){const b=readFileSync(resolve(root,original.path));assert.equal(sha(b),original.sha256);assert.equal(b.length,original.bytes);}
const originalClassSources=[];
for(const [tagSource,name]of [['src/cdk/table/sticky-styler.ts','StickyStyler'],['src/cdk/table/table.ts','CdkTable'],['src/material/legacy-table/table.ts','MatLegacyTable']]){
  const original=originals.find(x=>x.tag_source===tagSource),text=readFileSync(resolve(root,original.path),'utf8');
  const ast=ts.createSourceFile(original.path,text,ts.ScriptTarget.Latest,true),node=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node);
  const removeDecorators=context=>{const visit=node=>{
    const modifiers=node.modifiers?.filter(m=>m.kind!==ts.SyntaxKind.Decorator);
    if(ts.isClassDeclaration(node))node=ts.factory.updateClassDeclaration(node,modifiers,node.name,node.typeParameters,node.heritageClauses,node.members);
    else if(ts.isPropertyDeclaration(node))node=ts.factory.updatePropertyDeclaration(node,modifiers,node.name,node.questionToken||node.exclamationToken,node.type,node.initializer);
    else if(ts.isMethodDeclaration(node))node=ts.factory.updateMethodDeclaration(node,modifiers,node.asteriskToken,node.name,node.questionToken,node.typeParameters,node.parameters,node.type,node.body);
    else if(ts.isGetAccessorDeclaration(node))node=ts.factory.updateGetAccessorDeclaration(node,modifiers,node.name,node.parameters,node.type,node.body);
    else if(ts.isSetAccessorDeclaration(node))node=ts.factory.updateSetAccessorDeclaration(node,modifiers,node.name,node.parameters,node.body);
    else if(ts.isParameter(node))node=ts.factory.updateParameterDeclaration(node,modifiers,node.dotDotDotToken,node.name,node.questionToken,node.type,node.initializer);
    return ts.visitEachChild(node,visit,context);
  };return visit;};
  const result=ts.transform(node,[removeDecorators]);
  originalClassSources.push(ts.createPrinter().printNode(ts.EmitHint.Unspecified,result.transformed[0],ast));result.dispose();
}
const support=[];
for(const [tagSource,name] of [['src/cdk/collections/data-source.ts','isDataSource'],['src/cdk/table/sticky-styler.ts','STICKY_DIRECTIONS']]) {
  const item=originals.find(x=>x.tag_source===tagSource),text=readFileSync(resolve(root,item.path),'utf8');
  const ast=ts.createSourceFile(item.path,text,ts.ScriptTarget.Latest,true);
  const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name));
  assert.ok(node);support.push(node.getText(ast));
}
const original=await import(data(emit(`import {EventEmitter,NgZone} from '@angular/core';
import {Subject,BehaviorSubject,ConnectableObservable,of as observableOf} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
${support.join('\n')}
${originalClassSources.join('\n')}`)));
function manualFixture(role='grid',withZone=true){
  const node={nodeName:'MAT-TABLE',attributes:new Map([['role',role]]),setAttribute(k,v){this.attributes.set(k,v);},getAttribute(k){return this.attributes.get(k)||null;}};
  const events=new rx.Subject(),calls={viewport:0,repeater:0,scheduled:0,styleUpdates:0,destroyed:0};
  const changes={forEachIdentityChange(){}};
  const differs={find(){return {create(){return {diff(){return changes;}};}};}};
  const detector={markForCheck(){}},ref=new core.ElementRef(node),direction={value:'rtl',change:new rx.Subject()};
  const document={originalDocument:true},platform={isBrowser:false};
  const repeater={applyChanges(...args){calls.repeater++;assert.equal(args[0],changes);},detach(){}};
  const queued=[],scheduler={schedule(fn){calls.scheduled++;queued.push(fn);},scheduleEnd(fn){calls.scheduled++;queued.push(fn);}};
  const viewport={change(){calls.viewport++;return events;},ngOnDestroy(){calls.destroyed++;}};
  const listener={originalPositionListener:true},zone=withZone?{onStable:new rx.Subject()}:undefined;
  const args=[differs,detector,ref,role,direction,document,platform,repeater,scheduler,viewport,listener,zone];
  const table=new original.MatLegacyTable(...args);
  for(const field of ['_rowOutlet','_headerRowOutlet','_footerRowOutlet','_noDataRowOutlet'])table[field]={viewContainer:{length:0,clear(){}}};
  table._data=[];table._rowDefs=[];table._headerRowDefs=[];table._footerRowDefs=[];
  return {table,args,events,calls,queued,close(){table.ngOnDestroy();}};
}
const historical=[];function check(id,fn){try{fn();historical.push({id,result:'pass'});}catch(e){historical.push({id,result:'fail',error:String(e.message).slice(0,700)});}}
check('twelve-argument-manual-construction-outside-di-retains-eleven-supplied-objects',()=>{
  const f=manualFixture();try{
    for(const [index,field]of [[0,'_differs'],[1,'_changeDetectorRef'],[2,'_elementRef'],[4,'_dir'],[5,'_document'],
      [6,'_platform'],[7,'_viewRepeater'],[8,'_coalescedStyleScheduler'],[9,'_viewportRuler'],[10,'_stickyPositioningListener'],[11,'_ngZone']])assert.equal(f.table[field],f.args[index]);
    assert.equal(f.table.stickyCssClass,'mat-table-sticky');assert.equal(f.table.needsPositionStickyOnElement,false);
  }finally{f.close();}
});
check('caller-viewport-drives-invalidation-and-unsubscribes-without-destruction',()=>{
  const f=manualFixture();try{
    f.table.ngOnInit();assert.equal(f.calls.viewport,1);f.table._forceRecalculateCellWidths=false;f.events.next({});
    assert.equal(f.table._forceRecalculateCellWidths,true);f.table.ngOnDestroy();
    f.table._forceRecalculateCellWidths=false;f.events.next({});assert.equal(f.table._forceRecalculateCellWidths,false);assert.equal(f.calls.destroyed,0);
  }finally{f.close();}
});
check('caller-repeater-actually-receives-render-diff',()=>{
  const f=manualFixture();try{
    f.table.ngOnInit();f.table.updateStickyColumnStyles=()=>f.calls.styleUpdates++;
    f.table.renderRows();assert.equal(f.calls.repeater,1);assert.equal(f.calls.styleUpdates,1);
  }finally{f.close();}
});
check('caller-coalescer-defers-and-flushes-real-tagged-style-work',()=>{
  const f=manualFixture();try{
    f.table.ngOnInit();assert.equal(f.table._stickyStyler._coalescedStyleScheduler,f.args[8]);
    const row={nodeType:1,ELEMENT_NODE:1,children:[],style:{top:'12px',bottom:'',left:'',right:'',zIndex:'1'},classList:{remove(){}}};
    f.table._stickyStyler.clearStickyPositioning([row],['top']);assert.equal(f.calls.scheduled,1);assert.equal(row.style.top,'12px');
    for(const fn of f.queued)fn();assert.equal(row.style.top,'');
  }finally{f.close();}
});
check('manual-role-and-optional-zone-contract',()=>{
  const f=manualFixture('',false);try{assert.equal(f.table._elementRef.nativeElement.getAttribute('role'),'table');assert.equal(f.table._ngZone,undefined);f.table.ngOnInit();}finally{f.close();}
});
assert.equal(historical.filter(c=>c.result!=='pass').length,0,JSON.stringify(historical));
const f=manualFixture();let outsideError;
try{new peer.CdkTable(...f.args);}catch(e){outsideError=String(e.message);}assert.match(outsideError,/NG0203|injection context/);
const document={},environment=core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),core.provideZonelessChangeDetection(),
  {provide:core.DOCUMENT,useValue:document},{provide:core.PLATFORM_ID,useValue:'server'},{provide:Platform,useValue:{isBrowser:false}}],core.Injector.NULL);
const currentRef=new core.ElementRef({nodeName:'MAT-TABLE',setAttribute(){},getAttribute(){return 'grid';}}),detector={markForCheck(){}};
class NodeContext extends core.Injector{get(token,notFoundValue,options){
  if(token===core.Injector)return this;if(token===core.ElementRef)return currentRef;if(token===core.ChangeDetectorRef)return detector;
  if(token instanceof core.HostAttributeToken)return 'grid';if(notFoundValue===null||typeof options==='object'&&options?.optional)return null;
  return environment.get(token,notFoundValue,options);
}}
let current,proposed;
const Proposed=MatLegacyTable;
const policy=[];
try{
  const context=new NodeContext();current=core.runInInjectionContext(context,()=>new peer.CdkTable(...f.args));
  assert.equal(current._elementRef,currentRef);assert.notEqual(current._elementRef,f.args[2]);current.ngOnInit();current.ngAfterContentInit();
  assert.notEqual(current._viewRepeater,f.args[7]);assert.notEqual(current._viewportRuler,f.args[9]);assert.equal(f.calls.viewport,0);
  assert.equal(current._coalescedStyleScheduler,undefined);assert.equal(f.calls.scheduled,0);
  assert.throws(()=>new Proposed(),/NG0203|injection context/);policy.push('outside-DI explicitly rejects');
  assert.throws(()=>core.runInInjectionContext(context,()=>new Proposed(...f.args)),/manual dependency arguments are not supported/);policy.push('old manual arguments explicitly reject before dependencies are ignored');
  proposed=core.runInInjectionContext(context,()=>new Proposed());assert.ok(proposed instanceof peer.CdkTable);assert.ok(proposed instanceof Proposed);
  assert.equal(proposed._elementRef,currentRef);assert.equal(proposed.stickyCssClass,'mat-table-sticky');assert.equal(proposed.needsPositionStickyOnElement,false);policy.push('genuine public parent/node and legacy sticky settings retained');
  proposed.ngOnInit();proposed.ngAfterContentInit();policy.push('real public parent initialization and default strategy execute');
  const made=core.runInInjectionContext(context,()=>Proposed.ɵfac());
  assert.ok(made instanceof Proposed);assert.ok(made instanceof peer.CdkTable);assert.equal(made._elementRef,currentRef);
  made.ngOnInit();made.ngAfterContentInit();made.ngOnDestroy();policy.push('actual owned Angular JIT factory executes with zero dependency arguments');
  class ConsumerTable extends Proposed {marker='consumer';}
  const child=core.runInInjectionContext(context,()=>new ConsumerTable());
  assert.ok(child instanceof ConsumerTable);assert.ok(child instanceof Proposed);assert.ok(child instanceof peer.CdkTable);assert.equal(child.marker,'consumer');
  child.ngOnInit();child.ngAfterContentInit();child.ngOnDestroy();policy.push('public parent/subclass initialization retained');
  for(const args of [[{}],f.args])assert.throws(()=>core.runInInjectionContext(context,()=>Reflect.construct(Proposed,args)),/manual dependency arguments are not supported/);
  policy.push('single and twelve manual arguments explicitly reject');
}finally{current?.ngOnDestroy();proposed?.ngOnDestroy();environment.destroy();f.close();}
const actualPeerPath=req.resolve('@angular/cdk/table'),actualPeerHash=sha(readFileSync(actualPeerPath));
const subjects=JSON.parse(readFileSync(resolve(root,'compatibility/rc/table-public-module-import-source-proof.json'),'utf8')).subjects;
const subject=subjects.find(s=>s.members.find(m=>m.path.endsWith('.mjs')).sha256===actualPeerHash);assert.ok(subject);
const result={node:process.version,compiler:ts.version,source:{path,sha256:sha(Buffer.from(source))},originals,
  decorator_removal:'Only Angular class/member/parameter decorators removed for manual source execution; original constructor bodies, parameters, class fields and called methods preserved.',
  actual_peer:{version:subject.version,sha256:actualPeerHash},historical_contract_cases:historical,
  current_contract_gaps:{outside_di_error:outsideError,inside_di_extra_arguments:'Ignored by current zero-argument parent: original supplied element, custom repeater, viewport and coalescer are not honored.',original_contract_pass:false},
  adopted_policy:{status:'maintainer-delegated conservative TypeScript decision; source implemented',source_sha256:sha(Buffer.from(source)),passed_cases:policy,changes_rendered_template_or_styles:false},
  limits:['Actual untouched tagged classes execute with synthetic manual dependencies; style callback/diff work is observed, not native DOM rendering.',
    'Actual public current parent executes under borrowed22.1.7 public node/root context. No actual21/native/AOT/packed/floor qualification.',
    'Actual maintained source executes; original manual/customization contract is deliberately retired, not an original-contract pass. Exact API/factory admission and all native/AOT/packed/floor gates remain pending.']};
const argv=process.argv.slice(2),at=argv.indexOf('--report');if(at>=0)writeFileSync(argv[at+1],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({historical_passed:historical.length,current_original_contract_pass:false,adopted_policy_cases:policy.length,product_source_constructor_applied:true}));
