/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
/** Real public-parent control and actual owned factory; node/DOM fixtures are synthetic. */
export async function observeTableFactory(Table,loaded,importModule=spec=>import(spec)){
 const core=await importModule('@angular/core'),{BrowserModule}=await importModule('@angular/platform-browser');
 const {CdkTable,STICKY_POSITIONING_LISTENER}=await importModule('@angular/cdk/table');
 const {Directionality}=await importModule('@angular/cdk/bidi'),rx=await importModule('rxjs');
 const behaviorProblems=[],parentComparison=[],counts={borrowedDestroyed:0,manualRejects:0,subclass:0,disconnects:0};
 const document={documentElement:{},body:{querySelector(){return null;},querySelectorAll(){return [];}}};
 const environment=core.createEnvironmentInjector([core.importProvidersFrom(BrowserModule),core.provideZonelessChangeDetection(),
   {provide:core.DOCUMENT,useValue:document},{provide:core.PLATFORM_ID,useValue:'server'}],core.Injector.NULL);
 const opts=flags=>typeof flags==='number'?{optional:!!(flags&8),self:!!(flags&2),skipSelf:!!(flags&4),host:!!(flags&1)}
   :{optional:!!flags?.optional,self:!!flags?.self,skipSelf:!!flags?.skipSelf,host:!!flags?.host};
 const label=token=>typeof token==='function'?token.name:String(token).replace(/^InjectionToken /,'');
 const roleToken=new core.HostAttributeToken('role');
 function fixture(role,nodeName){
  const attributes=new Map(role?[['role',role]]:[]);
  const element={nodeName,setAttribute(k,v){attributes.set(k,v);},getAttribute(k){return attributes.get(k)??null;}};
  const elementRef=new core.ElementRef(element),detector={markForCheck(){},ngOnDestroy(){counts.borrowedDestroyed++;}};
  const direction={value:'rtl',change:new rx.Subject(),ngOnDestroy(){counts.borrowedDestroyed++;}};
  const listener={stickyColumnsUpdated(){},stickyEndColumnsUpdated(){},stickyHeaderRowsUpdated(){},stickyFooterRowsUpdated(){},ngOnDestroy(){counts.borrowedDestroyed++;}};
  const values=new Map([[core.ElementRef,elementRef],[core.ChangeDetectorRef,detector],[Directionality,direction],[core.DOCUMENT,document]]);
  const requests=[],rootRequests=[],trace=[];
  class Context extends core.Injector {get(token,notFound,flags){
   const options=opts(flags),optional=options.optional||notFound===null;
   if(token instanceof core.HostAttributeToken){
    assert.equal(token.toString(),roleToken.toString(),'unknown host attribute request');
    trace.push({token,options,kind:'attribute'});return role;
   }
   if(token===core.Injector||values.has(token)||token===STICKY_POSITIONING_LISTENER){
    requests.push({token,label:label(token),...options,optional});trace.push({token,options,kind:'node'});
    if(token===core.Injector)return this;
    if(token===STICKY_POSITIONING_LISTENER)return options.skipSelf?listener:null;
    return values.get(token);
   }
   const request={token,label:label(token),...options,optional,unresolved:false};rootRequests.push(request);trace.push({token,options,kind:'root'});
   try{return environment.get(token,optional?null:notFound,flags);}catch(e){request.unresolved=true;throw e;}
  }}
  return {context:new Context(),requests,rootRequests,trace,elementRef,element,direction,detector,listener};
 }
 function check(name,run){try{return run();}catch(e){behaviorProblems.push(name+': '+String(e.message));}}
 function execute(factory,f){try{return {value:core.runInInjectionContext(f.context,factory),outcome:'returned',error:null};}
  catch(e){return {value:null,outcome:'threw',error:String(e.message)};}}
 let primary=null,outcome='threw',error=null,primaryFixture,primaryRequests=[],primaryRootRequests=[];
 const instances=[];
 try{
  for(const [index,[name,role,nodeName]]of [['grid-role','grid','MAT-TABLE'],['missing-role',null,'TABLE']].entries()){
   const baseline=fixture(role,nodeName),owned=fixture(role,nodeName);
   const parent=execute(()=>new CdkTable(),baseline),actual=execute(()=>Table.ɵfac(),owned);
   if(parent.value)instances.push(parent.value);if(actual.value)instances.push(actual.value);
   if(index===0){primary=actual.value;primaryFixture=owned;outcome=actual.outcome;error=actual.error;primaryRequests=[...owned.requests];primaryRootRequests=[...owned.rootRequests];}
   const pairs=baseline.trace.map((p,i)=>[p,owned.trace[i]]);
   const tokenObjectsEqual=baseline.trace.length===owned.trace.length&&pairs.every(([a,b])=>b&&(a.token===b.token
      ||a.token instanceof core.HostAttributeToken&&b.token instanceof core.HostAttributeToken&&a.token.toString()===b.token.toString()));
   const optionsEqual=baseline.trace.length===owned.trace.length&&pairs.every(([a,b])=>b&&Object.keys(a.options).every(k=>a.options[k]===b.options[k]));
   const traceKindsEqual=baseline.trace.length===owned.trace.length&&pairs.every(([a,b])=>b&&a.kind===b.kind);
   const rootServicesResolved=baseline.rootRequests.every(r=>!r.unresolved)&&owned.rootRequests.every(r=>!r.unresolved);
   const roleBehavior=baseline.element.getAttribute('role')===(role||'table')&&owned.element.getAttribute('role')===(role||'table');
   parentComparison.push({context:name,parent_outcome:parent.outcome,owned_outcome:actual.outcome,
    trace_count:baseline.trace.length,parent_root_request_count:baseline.rootRequests.length,owned_root_request_count:owned.rootRequests.length,node_request_count:owned.requests.length,attribute_request_count:owned.trace.filter(r=>r.kind==='attribute').length,token_objects_equal:tokenObjectsEqual,options_equal:optionsEqual,trace_kinds_equal:traceKindsEqual,role_behavior:roleBehavior,root_services_resolved:rootServicesResolved});
   check(name+' genuine factory/control trace',()=>{
    assert.equal(parent.outcome,'returned',parent.error);assert.equal(actual.outcome,'returned',actual.error);
    assert.ok(tokenObjectsEqual);assert.ok(optionsEqual);assert.ok(traceKindsEqual);assert.ok(roleBehavior);assert.ok(rootServicesResolved);
    assert.equal(Object.getPrototypeOf(Table),CdkTable);assert.ok(actual.value instanceof Table);assert.ok(actual.value instanceof CdkTable);
    assert.equal(Object.getPrototypeOf(actual.value),Table.prototype);
    assert.equal(actual.value._elementRef,owned.elementRef);assert.equal(actual.value._changeDetectorRef,owned.detector);assert.equal(actual.value._dir,owned.direction);assert.equal(actual.value.stickyCssClass,'mat-table-sticky');assert.equal(actual.value.needsPositionStickyOnElement,false);
   });
   if(actual.value)check(name+' lifecycle/public inputs/data-source teardown',()=>{
    const table=actual.value;
    for(const [input,wanted]of [['false',false],['',true],[null,false],['true',true],[undefined,false]]){
     table.fixedLayout=input;table.multiTemplateDataRows=input;assert.equal(table.fixedLayout,wanted);assert.equal(table.multiTemplateDataRows,wanted);
    }
    const dataSource={connect(){return rx.of([]);},disconnect(viewer){assert.equal(viewer,table);counts.disconnects++;}};
    table.dataSource=dataSource;assert.equal(table.dataSource,dataSource);table.ngOnInit();table.ngAfterContentInit();table.ngOnDestroy();
    instances.splice(instances.indexOf(table),1);
   });
  }
  if(primaryFixture)check('manual arguments reject before injecting',()=>{
   const args=[primaryFixture.elementRef,{}, {},'grid',{}, {},{}, {},{}, {},{}, {}];
   const before=primaryFixture.trace.length;
   for(const supplied of [[primaryFixture.elementRef],args]){
    assert.throws(()=>core.runInInjectionContext(primaryFixture.context,()=>Reflect.construct(Table,supplied)),/manual dependency arguments are not supported/);counts.manualRejects++;
   }
   assert.equal(primaryFixture.trace.length,before);
  });
  check('outside Angular DI explicitly rejects',()=>assert.throws(()=>new Table(),/NG0203|injection context/));
  if(primaryFixture)check('consumer subclass initialization and public-parent identity',()=>{
   class ConsumerTable extends Table{marker='consumer';}
   const child=core.runInInjectionContext(primaryFixture.context,()=>new ConsumerTable());instances.push(child);
   assert.ok(child instanceof ConsumerTable);assert.ok(child instanceof Table);assert.ok(child instanceof CdkTable);assert.equal(child.marker,'consumer');
   child.ngOnInit();child.ngAfterContentInit();child.ngOnDestroy();instances.splice(instances.indexOf(child),1);counts.subclass++;
  });
 }finally{
  for(const table of instances)check('remaining table cleanup',()=>table.ngOnDestroy());
  check('genuine root cleanup',()=>environment.destroy());
 }
 check('borrowed node services remain unowned',()=>assert.equal(counts.borrowedDestroyed,0));
 // The complete primary trace is compared before lifecycle/negative/subclass work.
 // All public borrowed-node requests from actual construction are retained without truncation.
 return {requests:primaryRequests,rootRequests:primaryRootRequests,outcome,error,
  behaviorProblems,counts,parentComparison,context:'actual owned factory and independent genuine public CdkTable with public node/root services; synthetic server DOM, native/AOT/packed/floors separate'};
}
