/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete patched source methods with actual FormControl/RxJS and explicit boundaries.
 * No constructor, Angular render, native DOM, package or floor execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const require=createRequire(import.meta.url),ts=require('typescript'),url=name=>pathToFileURL(require.resolve(name)).href;
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(process.versions.node,JSON.parse(read('toolchain-lock.json')).repository.node);
assert.equal(ts.version,JSON.parse(read('package.json')).devDependencies.typescript);
await import(url('@angular/compiler'));
const {FormControl}=await import(url('@angular/forms'));
const {Subject,Subscription}=await import(url('rxjs'));
const product=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=product.version.startsWith('21.')?'21.x':'main';
const candidatePath='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',candidate=read(candidatePath).toString();
const originalPath='compatibility/rc/autocomplete-selection-originals.json.gz',originalRaw=read(originalPath);
assert.equal(hash(originalRaw),'ddb8eeefba441568d46b9107a88889553320ce2e841c3fdc90a29b3f518aeebc');
const originals=JSON.parse(gunzipSync(originalRaw));assert.equal(originals.original_hunks,10);assert.equal(originals.unique_blobs,9);
const objectHash=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
for(const blob of Object.values(originals.blobs)){
  assert.equal(objectHash('blob',blob.text),blob.git_blob);assert.equal(hash(blob.text),blob.sha256);assert.equal(Buffer.byteLength(blob.text),blob.bytes);
}
for(const commit of originals.commits){assert.equal(objectHash('commit',commit.raw_commit),commit.sha);assert.equal(hash(commit.diff),commit.diff_sha256);}

function owner(source,name,kind=ts.ScriptKind.TS){
  const file=ts.createSourceFile('selection-subject.ts',source,ts.ScriptTarget.Latest,true,kind);
  assert.equal(file.parseDiagnostics.length,0);
  const node=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return {file,node};
}
async function type(source,name,kind){
  const {file,node}=owner(source,name,kind),members=node.members.filter(n=>ts.isMethodDeclaration(n)||ts.isGetAccessorDeclaration(n)||ts.isSetAccessorDeclaration(n));
  const declaration=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],ts.factory.createIdentifier('Probe'),undefined,undefined,members);
  const transformed=ts.transform(declaration,[context=>{const visit=n=>ts.isDecorator(n)?undefined:ts.visitEachChild(n,visit,context);return n=>ts.visitNode(n,visit);}]);
  let emitted;
  try{emitted=ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified,transformed.transformed[0],file),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;}
  finally{transformed.dispose();}
  const imports='import {Observable,merge,of,EMPTY,Subscription} from '+JSON.stringify(url('rxjs'))+';\n'
    +'import {tap,delay,switchMap,take} from '+JSON.stringify(url('rxjs/operators'))+';\n'
    +'const afterLegacyRender=zone=>zone.onStable.pipe(take(1));\n'
    +'const afterNextRender=(fn,{injector})=>{injector.renderCallbacks.push(fn);return {destroy(){}};};\n';
  return (await import('data:text/javascript;base64,'+Buffer.from(imports+emitted).toString('base64'))).Probe;
}
const settle=async()=>{await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,1));};
function fixture(Type,{required=false,attached=false,empty=false,value={code:'CA',name:'California'},formField=false,display}={}){
  const changes=[],selectionEvents=[],displayCalls=[],calls=[],control=new FormControl(value),stable=new Subject(),outside=new Subject(),optionChanges=new Subject();
  let stored=typeof value==='object'&&value!==null?value.name:String(value??''),attachedNow=attached,closes=0;
  const native={type:'text',get value(){return stored;},set value(next){stored=next==null?'':String(next);},focus(){calls.push('focus');}};
  const option={value,selected:true,deselect(emit){this.selected=false;if(emit!==false)selectionEvents.push('deselected');}};
  const options=empty?[]:[option];options.changes=optionChanges;
  const panel={requireSelection:required,options,showPanel:!empty,id:'selection-panel',_isOpen:attached,_latestOpeningTrigger:null,_animationDone:null,
    displayWith(v){displayCalls.push(v===option?'selected-option':v===option.value?'selected-value':v===null?'null':typeof v);return display?display(v):v&&typeof v==='object'?v.name:v;},
    opened:{emit(){calls.push('opened');}},closed:{emit(){calls.push('closed-event');}},_setColor(){},_emitSelectEvent(){selectionEvents.push('selected');}};
  const injector={renderCallbacks:[]},overlay={hasAttached:()=>attachedNow,attach(){attachedNow=true;calls.push('attach');},
    updateSize(){},updatePosition(){calls.push('position');},detach(){attachedNow=false;}};
  const instance=Object.create(Type.prototype);
  Object.assign(instance,{autocomplete:panel,_element:{nativeElement:native},_formField:formField?{_control:native}:null,
    _overlayRef:overlay,_portal:{},_overlayAttached:attached,_pendingAutoselectedOption:null,_trackedModal:null,_valueOnLastKeydown:null,
    _previousValue:native.value,_valueOnAttach:attached?native.value:undefined,_componentDestroyed:false,_environmentInjector:injector,_viewContainerRef:{injector},
    _zone:{onStable:stable,run:fn=>fn()},_positionStrategy:{setOrigin(){},reapplyLastPosition(){calls.push('reapply');}},_changeDetectorRef:{detectChanges(){}},
    _getConnectedElement:()=>({}),_getPanelWidth:()=>100,_resetActiveItem(){},_floatLabel(){},_applyModalPanelOwnership(){},_canOpen:()=>false,
    _updatePanelState(){panel.showPanel=options.length>0;},closePanel(){closes++;attachedNow=false;this._overlayAttached=false;}});
  Object.defineProperty(instance,'panelClosingActions',{get:()=>outside.asObservable()});
  instance.registerOnChange(v=>control.setValue(v,{emitModelToViewChange:false}));
  control.registerOnChange(v=>instance.writeValue(v));control.valueChanges.subscribe(v=>changes.push(v));
  const snapshot=()=>({model:control.value,native:native.value,selected:option.selected,changes:[...changes],selection_events:[...selectionEvents],display_calls:[...displayCalls],
    captured:instance._valueOnAttach,attached:attachedNow,visible:instance.panelOpen,closes});
  return {instance,control,native,option,panel,options,changes,selectionEvents,displayCalls,calls,outside,snapshot,
    async stabilize(){stable.next();for(const fn of injector.renderCallbacks.splice(0))fn();await settle();},
    async setOptions(values){options.splice(0,options.length,...values);optionChanges.next(options);await settle();},
    dispose(){instance._closingActionsSubscription?.unsubscribe();stable.complete();outside.complete();optionChanges.complete();}};
}
async function observations(Type){
  const rows=[];
  async function run(id,options,action){const f=fixture(Type,options);try{await action(f);rows.push({id,result:'pass',observation:f.snapshot()});}
    catch(error){rows.push({id,result:'fail',detail:String(error.message).slice(0,600),observation:f.snapshot()});}finally{f.dispose();}}
  for(const formField of [false,true])await run('programmatic-null-reset/'+(formField?'form-field':'bare'),{formField},async f=>{
    f.control.reset();await settle();assert.equal(f.control.value,null);assert.equal(f.native.value,'');assert.equal(f.option.selected,false);
    assert.deepEqual(f.selectionEvents,[]);assert.deepEqual(f.changes,[null]);});
  await run('programmatic-undefined-assignment',{},async f=>{f.control.setValue(undefined);await settle();assert.equal(f.control.value,undefined);
    assert.equal(f.option.selected,false);assert.equal(f.native.value,'');assert.deepEqual(f.selectionEvents,[]);});
  for(const [id,value,display,text]of [['zero',0,undefined,'0'],['false',false,undefined,'false'],['empty-string','',undefined,''],['empty-display',{name:'Selected'},()=>'', '']])
    await run('non-null-value-retains-selection/'+id,{value,display},async f=>{
      f.control.setValue(value);await settle();assert.equal(f.control.value,value);assert.equal(f.native.value,text);
      assert.equal(f.option.selected,true);assert.deepEqual(f.selectionEvents,[]);});
  await run('optional-nonempty-typing-clears-selection-quietly',{attached:true},async f=>{
    f.native.value='Cali';f.instance._handleInput({target:f.native});await settle();assert.equal(f.control.value,'Cali');assert.equal(f.option.selected,false);
    assert.deepEqual(f.selectionEvents,[]);assert.deepEqual(f.displayCalls,['selected-value']);});
  await run('optional-updated-display-retains-matching-selected-value',{attached:true,display:v=>v&&typeof v==='object'?'*'+v.name:v},async f=>{
    f.native.value='*California';f.instance._handleInput({target:f.native});await settle();assert.equal(f.control.value,'*California');
    assert.equal(f.option.selected,true);assert.deepEqual(f.displayCalls,['selected-value']);assert.deepEqual(f.selectionEvents,[]);});
  await run('required-typing-retains-selection-until-dismissal',{required:true,attached:true},async f=>{
    const initial=f.control.value;f.native.value='Cali';f.instance._handleInput({target:f.native});await settle();
    assert.equal(f.control.value,initial);assert.equal(f.option.selected,true);assert.deepEqual(f.changes,[]);assert.deepEqual(f.selectionEvents,[]);
    f.instance._setValueAndClose(null);await settle();assert.equal(f.control.value,null);assert.equal(f.option.selected,false);assert.equal(f.native.value,'');
    assert.deepEqual(f.changes,[null]);assert.deepEqual(f.selectionEvents,['deselected']);});
  for(const mode of ['repeated-open','empty-to-visible','hide-and-reshow','unchanged-empty'])await run('required-original-attachment/'+mode,{required:true,empty:mode==='empty-to-visible'||mode==='unchanged-empty'},async f=>{
    const initial=f.control.value;f.instance.openPanel();await f.stabilize();assert.equal(f.instance._valueOnAttach,'California');
    if(mode!=='unchanged-empty'){f.native.value='Cali';f.instance._handleInput({target:f.native});}
    if(mode==='repeated-open')f.instance.openPanel();
    if(mode==='empty-to-visible')await f.setOptions([f.option]);
    if(mode==='hide-and-reshow'){await f.setOptions([]);await f.setOptions([f.option]);}
    assert.equal(f.instance._valueOnAttach,'California');f.outside.next(null);await settle();
    if(mode==='unchanged-empty'){assert.equal(f.control.value,initial);assert.equal(f.native.value,'California');assert.deepEqual(f.changes,[]);}
    else{assert.equal(f.control.value,null);assert.equal(f.native.value,'');assert.deepEqual(f.changes,[null]);}
    assert.equal(f.instance._closingActionsSubscription.closed,true);assert.equal(f.snapshot().closes,1);
  });
  assert.equal(rows.length,14);return rows;
}
const Owned=await type(candidate,'_MatAutocompleteTriggerBase'),actual=await observations(Owned);
assert.ok(actual.every(row=>row.result==='pass'),JSON.stringify(actual.filter(row=>row.result!=='pass')));
const peers=[];
for(const cap of JSON.parse(read('compatibility/rc/autocomplete-input-peer-sources/identities.json'))){
  const compressed=read(cap.retained.path);assert.equal(hash(compressed),cap.retained.sha256);
  const bytes=gunzipSync(compressed);assert.equal(hash(bytes),cap.member_sha256);assert.equal(bytes.length,cap.member_bytes);
  if(cap.line===line){const peer=realpathSync(join(root,'node_modules/@angular/material'));assert.equal(JSON.parse(readFileSync(join(peer,'package.json'))).version,cap.version);
    assert.equal(product.peerDependencies['@angular/material'],'^'+cap.version);assert.equal(hash(readFileSync(join(peer,'fesm2022/autocomplete.mjs'))),cap.member_sha256);}
  const rows=await observations(await type(bytes.toString(),'MatAutocompleteTrigger',ts.ScriptKind.JS));
  assert.ok(rows.every(row=>row.result==='pass'),cap.line+' '+JSON.stringify(rows.filter(row=>row.result!=='pass')));
  peers.push({line:cap.line,version:cap.version,member_sha256:cap.member_sha256,rows});
}
const taggedPath='reference/material-16.2.14/component-behavior-sources/autocomplete/autocomplete-trigger.ts',tagged=read(taggedPath).toString();
assert.equal(hash(tagged),'b69decaf81ef29dd665a0b267f3a121837212157b31ddd02c3b617fa958844f2');
const baseline=await observations(await type(tagged,'_MatAutocompleteTriggerBase'));
const originalObservations=[];
for(const commit of originals.commits)for(const side of ['before','after']){
  const member=commit.members.find(m=>m.path.endsWith('autocomplete-trigger.ts')),blob=originals.blobs[member[side]];
  const rows=await observations(await type(blob.text,'MatAutocompleteTrigger'));
  originalObservations.push({sha:commit.sha,side,source_sha256:blob.sha256,failed_case_ids:rows.filter(row=>row.result==='fail').map(row=>row.id),rows});
}
const beforeReset=originalObservations.find(row=>row.sha===originals.subjects[0]&&row.side==='before');
const afterReset=originalObservations.find(row=>row.sha===originals.subjects[0]&&row.side==='after');
assert.ok(beforeReset.failed_case_ids.includes('programmatic-null-reset/bare'));assert.ok(!afterReset.failed_case_ids.includes('programmatic-null-reset/bare'));
assert.ok(afterReset.failed_case_ids.includes('non-null-value-retains-selection/zero'));
const beforeCapture=originalObservations.find(row=>row.sha===originals.subjects[1]&&row.side==='before'),afterCapture=originalObservations.find(row=>row.sha===originals.subjects[1]&&row.side==='after');
for(const id of ['required-original-attachment/repeated-open','required-original-attachment/empty-to-visible']){
  assert.ok(beforeCapture.failed_case_ids.includes(id));assert.ok(!afterCapture.failed_case_ids.includes(id));}
const afterTyping=originalObservations.find(row=>row.sha===originals.subjects[2]&&row.side==='after');
assert.ok(!afterTyping.failed_case_ids.includes('non-null-value-retains-selection/zero'));
assert.ok(afterTyping.failed_case_ids.includes('optional-updated-display-retains-matching-selected-value'),'literal original display callback defect was not observed');
const mutations=[
  ['omit-null-reset-clear','_assignOptionValue','if (value == null) {','if (false) {'],
  ['restore-falsy-reset-clear','_assignOptionValue','if (value == null) {','if (!value) {'],
  ['emit-programmatic-deselection','_assignOptionValue','this._clearPreviousSelectedOption(null, false);','this._clearPreviousSelectedOption(null);'],
  ['retain-stale-optional-selection','_handleInput','} else if (this.panelOpen && !this.autocomplete.requireSelection) {','} else if (false) {'],
  ['clear-required-selection-while-typing','_handleInput','} else if (this.panelOpen && !this.autocomplete.requireSelection) {','} else if (this.panelOpen) {'],
  ['pass-option-to-display-callback','_handleInput','this._getDisplayValue(selectedOption.value)','this._getDisplayValue(selectedOption)'],
  ['recapture-on-repeated-attach','_attachOverlay','const wasOpen = this.panelOpen;','this._valueOnAttach = valueOnAttach;\n    const wasOpen = this.panelOpen;'],
  ['omit-original-attach-capture','_attachOverlay','this._valueOnAttach = valueOnAttach;',''],
  ['recapture-on-filtered-opening','_subscribeToClosingActions','this._emitOpened();','this._valueOnAttach = this._element.nativeElement.value;\n                  this._emitOpened();'],
],mutants=[];
for(const [id,method,from,to]of mutations){
  const {file,node}=owner(candidate,'_MatAutocompleteTriggerBase'),selected=node.members.find(n=>n.name?.getText(file)===method);assert.ok(selected,method);
  const text=selected.getText(file);assert.equal(text.split(from).length,2,id);
  const changed=candidate.slice(0,selected.getStart(file))+text.replace(from,to)+candidate.slice(selected.end);
  const rows=await observations(await type(changed,'_MatAutocompleteTriggerBase')),failed=rows.filter(row=>row.result==='fail').map(row=>row.id);
  assert.ok(failed.length,id+' survived');mutants.push({id,result:'rejected',failed_case_ids:failed});
}
const report={schema_version:1,line,node:process.version,typescript:ts.version,subjects:originals.subjects,
  source:{path:candidatePath,sha256:hash(candidate)},originals:{path:originalPath,sha256:hash(originalRaw)},
  producer:{path:'tests/autocomplete_selection_state_probe.mjs',sha256:hash(read('tests/autocomplete_selection_state_probe.mjs'))},
  scope:'Complete patched owned, tagged, both retained minimum peer and original before/after prototype methods. Real FormControl value-accessor callbacks and RxJS closing/option-change streams; explicit synthetic panel/option/overlay receivers and controlled render notifications. Visibility, close teardown, focus/open eligibility, sizing, label, modal ownership and key-manager hooks are substituted. Constructors, field initializers, Angular rendering/DI, real DOM outside-click/geometry, packed artifact, runtime/compiler/RxJS/peer-floor execution are excluded.',
  executed_whole_methods:['_handleInput','writeValue','_assignOptionValue','_updateNativeInputValue','_clearPreviousSelectedOption','_attachOverlay','_subscribeToClosingActions','_setValueAndClose'],
  actual_installed_minimum_source_matched_line:line,
  cases_per_source:14,actual,peers,tagged_baseline:baseline,original_observations:originalObservations,mutants,
  native_tests_or_canonical_dispositions_changed:false,actual_native_artifact_or_floor_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],gzipSync(JSON.stringify(report,null,2)+'\n'),{flag:'wx'});
console.log(JSON.stringify({line,cases_per_source:14,minimum_peers:2,original_source_versions:6,mutants_rejected:mutants.length,
  actual_native_artifact_or_floor_executed:false}));
