/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete constructor/member replay, protocol trait parent and DOM, genuine public framework hooks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=text=>createHash('sha256').update(text).digest('hex');
const paths={field:'projects/ngx-material-legacy/legacy-form-field/form-field.ts',helper:'projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts'};
const originalPath='reference/material-16.2.14/control-forwarding-sources/form-field.ts',read=path=>readFileSync(join(root,path),'utf8');
const candidate=read(paths.field),helper=read(paths.helper),original=read(originalPath);
assert.equal(hash(original),'c32e86f1be87568387a09abcd7e6c47e6cb33fd63ea0cff8b224e98073dd1726');
const parse=text=>{const source=ts.createSourceFile('subject.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);return source;};
const printer=ts.createPrinter({removeComments:true}),print=(node,source)=>printer.printNode(ts.EmitHint.Unspecified,node,source);
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,removeComments:true}}).outputText;
function owner(text){const source=parse(text),node=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyFormField');assert.ok(node);return{source,node};}
function program(text){const{source,node}=owner(text);const cls=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],node.name,undefined,node.heritageClauses,node.members);
 const transformed=ts.transform(cls,[context=>node=>{const visit=node=>ts.isDecorator(node)?undefined:ts.visitEachChild(node,visit,context);return ts.visitNode(node,visit);}]);
 try{return emit('let nextUniqueId=0;\nconst floatingLabelScale=0.75,outlineGapPadding=5;\n'+print(transformed.transformed[0],source));}finally{transformed.dispose();}}
const helperProgram=text=>{const source=parse(text);return emit(source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getFullText(source)).join('\n'));};
const baseline=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','8d0ec0572:'+paths.field],{cwd:root,encoding:'utf8'});
const before=owner(baseline),after=owner(candidate),ctor=subject=>subject.node.members.find(ts.isConstructorDeclaration),oldCtor=ctor(before),newCtor=ctor(after);
assert.equal(oldCtor.parameters.length,7);assert.equal(newCtor.parameters.length,8);
assert.deepEqual(newCtor.parameters.slice(0,7).map(n=>print(n,after.source)),oldCtor.parameters.map(n=>print(n,before.source)));
assert.equal(print(oldCtor.body,before.source),print(newCtor.body,after.source));
assert.equal(newCtor.parameters[7].name.text,'_injector');assert.equal(newCtor.parameters[7].type.getText(after.source),'Injector');assert.ok(newCtor.parameters[7].questionToken);assert.equal(ts.getDecorators(newCtor.parameters[7]),undefined);
const tagged=owner(original);
assert.equal(print(after.node.members.find(node=>node.name?.text==='_shouldLabelFloat').body,after.source),
 print(tagged.node.members.find(node=>node.name?.text==='_shouldLabelFloat').body,tagged.source),'label-body-matches-immutable-tag');
for(const name of ['updateOutlineGap','_getStartEnd','_isAttachedToDOM']){
 const oracle=tagged.node.members.find(n=>n.name?.text===name),now=after.node.members.find(n=>n.name?.text===name);
 assert.equal(print(now,after.source),print(oracle,tagged.source),'geometry-matches-immutable-tag');
}
assert.equal(after.node.members.some(n=>['_cachedShadowRoot','_resolveShadowRoot'].includes(n.name?.text)),false);
const labelFrameBefore=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','e3889b00f:'+paths.field],{cwd:root,encoding:'utf8'});
const geometryBefore=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','show','385e7d41d:'+paths.field],{cwd:root,encoding:'utf8'});

for(const text of [original,candidate]){const source=parse(text);const declarations=source.statements.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations);
 assert.equal(declarations.find(n=>n.name.text==='floatingLabelScale').initializer.getText(source),'0.75');assert.equal(declarations.find(n=>n.name.text==='outlineGapPadding').initializer.getText(source),'5');}
const changed=(text,from,to)=>{const value=text.replace(from,to);assert.notEqual(value,text);return value;};
const mutations={
 priorLabelGuard:program(labelFrameBefore),
 noFrameCancellation:program(changed(candidate,"    if (typeof cancelAnimationFrame === 'function') {\n      this._directionFrames.forEach(frameId => cancelAnimationFrame(frameId));\n    }\n",'')),
 noFrameCallbackGuard:program(changed(candidate,'              if (!this._formFieldDestroyed) {\n                this.updateOutlineGap();\n              }','              this.updateOutlineGap();')),
 noFieldDestroyFlag:program(changed(candidate,'    this._formFieldDestroyed = true;','')),
 noDirectionSubscriptionCleanup:program(changed(candidate,'this._dir.change.pipe(takeUntil(this._destroyed)).subscribe','this._dir.change.subscribe')),
 visibleOffsetParent:program(changed(candidate,'return rootNode && rootNode !== element;', 'return rootNode && rootNode !== element && element.offsetParent !== null;')),
 staleShadowRoot:program(changed(candidate,'return rootNode && rootNode !== element;', 'const cached=(this as any).__cachedRoot ??= rootNode; return rootNode && rootNode !== element && rootNode === cached;')),
 priorGeometry:program(geometryBefore),
 noFallback:program(changed(candidate,'return document.documentElement!.contains(element);','return false;')),
 noLabelScale:program(changed(candidate,'labelWidth * floatingLabelScale + outlineGapPadding * 2','labelWidth + outlineGapPadding * 2')),
 priorWait:program(changed(candidate,'afterFormFieldRender(this._ngZone, this._injector)','this._ngZone.onStable')),
 noDestroy:program(changed(candidate,'        .pipe(takeUntil(this._destroyed)).subscribe(() => {','        .subscribe(() => {')),
 noFlag:program(changed(candidate,'if (this._outlineGapCalculationNeededOnStable)','if (true)')),
 leakedRender:helperProgram(changed(helper,'      rendered?.destroy();','')),
 premature:helperProgram(changed(helper,'if (zone.isStable)','if (true)')),
 oneShot:helperProgram(changed(helper,'  });\n}', '  }).pipe(take(1));\n}')),
 noErrorCleanup:helperProgram(changed(helper,'      stable.unsubscribe();\n      throw error;','      throw error;'))};
const loaded=prepareMaterialPublicSubjects(root),results=[];
try{
 const compilerPath=process.env.CLOSEOUT_TYPESCRIPT_ROOT?join(process.env.CLOSEOUT_TYPESCRIPT_ROOT,'lib/typescript.js'):require.resolve('typescript'),compiler=require(compilerPath),types=[],contracts=[];
 for(const model of loaded.models.filter(m=>m.line!=='original')){
  const attachment=print(after.node.members.find(node=>node.name?.text==='_isAttachedToDOM'),after.source);
  const fixture=helper+`\nimport {Injector as PublicInjector,NgZone as PublicZone,ElementRef as PublicElementRef} from '@angular/core';
class AttachmentReceipt{constructor(private _elementRef:PublicElementRef<HTMLElement>){}${attachment}}
new AttachmentReceipt(new PublicElementRef(document.body));
declare const zone:PublicZone,injector:PublicInjector;
const renders:Observable<void>=afterFormFieldRender(zone,injector);afterFormFieldRender(zone);afterFormFieldRender(zone,null);
class TrailingInjector{constructor(first:string,private _injector?:PublicInjector){}}
new TrailingInjector('old call');new TrailingInjector('new call',injector);
// @ts-expect-error Existing required constructor arguments remain required.
new TrailingInjector();
// @ts-expect-error The additional parameter uses the real public Injector type.
new TrailingInjector('value',{});
// @ts-expect-error The zone argument uses the real public type.
afterFormFieldRender({},injector);
// @ts-expect-error The injector argument uses the real public type.
afterFormFieldRender(zone,{});
// @ts-expect-error Render observations are void rather than boolean.
const flags:Observable<boolean>=afterFormFieldRender(zone,injector);
// @ts-expect-error Public stability is readonly.
zone.isStable=true;
`;
  const path=join(model.root,'form-field-render-helper-consumer.ts');writeFileSync(path,fixture);
  const p=compiler.createProgram([path],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:false,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=compiler.getPreEmitDiagnostics(p);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));types.push({line:model.line,negative_checks:6,fixture_sha256:hash(fixture),actual_legacy_constructor_compiled:false});
  for(const[path,text]of model.sources)if(path.startsWith('@angular/core/')&&path.endsWith('.d.ts')){const source=parse(text);
   for(const node of source.statements)if((ts.isFunctionDeclaration(node)&&node.name?.text==='afterEveryRender')||(ts.isInterfaceDeclaration(node)&&node.name.text==='AfterRenderRef')){
    assert.ok(!ts.getJSDocTags(node).some(tag=>['deprecated','internal','experimental','developerPreview'].includes(tag.tagName.text)));contracts.push({line:model.line,path,source_sha256:hash(text),name:node.name.text,whole:node.getText(source)});}}
 }
 assert.equal(contracts.filter(c=>c.name==='afterEveryRender').length,4);assert.equal(contracts.filter(c=>c.name==='AfterRenderRef').length,2);
 for(const model of loaded.models){const zoneSubject=installNgZonePublicSubject(model,root);
  writeFileSync(join(model.root,'form-field-render-payload.json'),JSON.stringify({original:program(original),labelFrameBefore:program(labelFrameBefore),candidate:program(candidate),helper:helperProgram(helper),mutations}));
  for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless'])for(const production of[false,true]){
   const script=`${production?'globalThis.ngDevMode=false;':''}
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
${mode==='zoneful'?"await import('zone.js/node');":''}
await import('@angular/compiler');const core=await import('@angular/core'),rx=await import('rxjs'),ops=await import('rxjs/operators'),forms=await import('@angular/forms');
const payload=JSON.parse(readFileSync(new URL('./form-field-render-payload.json',import.meta.url)));
let app,zone,shell;
${model.line==='original'?`zone=new core.NgZone({enableLongStackTrace:false});`:`
const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
const host={children:[]},renderer={data:{},destroy(){},createElement:name=>({name,children:[]}),createComment:text=>({textContent:text}),createText:text=>({textContent:text}),
 appendChild(parent,child){parent.children.push(child);child.parent=parent;},insertBefore(parent,child){parent.children.push(child);child.parent=parent;},
 removeChild(parent,child){if(parent)parent.children=parent.children.filter(item=>item!==child);},selectRootElement:()=>host,parentNode:node=>node.parent??null,nextSibling:()=>null,
 setAttribute(){},removeAttribute(){},addClass(){},removeClass(){},setStyle(){},removeStyle(){},setProperty(node,key,value){node[key]=value;},setValue(node,value){node.textContent=value;},listen:()=>()=>{}};
app=await browser.createApplication({providers:[core.${mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'}(),
 {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
 {provide:core.DOCUMENT,useValue:{head:{children:[],querySelectorAll:()=>[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>renderer}}]});zone=app.injector.get(core.NgZone);
class RenderShell{}core.Component({selector:'render-shell',standalone:true,template:'',changeDetection:core.ChangeDetectionStrategy.OnPush})(RenderShell);
shell=core.createComponent(RenderShell,{environmentInjector:app.injector,hostElement:host});app.attachView(shell.hostView);
${mode==='zoneless'?"assert.equal(typeof globalThis.Zone,'undefined');":''}
`}
let callbacks=0;const trackedRender=(callback,options)=>core.afterEveryRender(()=>{callbacks++;callback();},options);
function helper(js){const exports={};new Function('exports','afterEveryRender','ApplicationRef','Observable','take',js)(exports,trackedRender,core.ApplicationRef,rx.Observable,ops.take);return exports.afterFormFieldRender;}
function fixture(js=payload.candidate,helperJs=payload.helper,injector=app?.injector,boundary={}){
 let attached=!boundary.detached,visible=true,labelWidth=boundary.labelWidth??80,labelStart=120,labelRight=200,writes=0;
 let frameId=0,canceledFrames=0;const frames=new Map(),capturedFrames=[];
 let currentRoot;const shadowA={host:{}},shadowB={host:{}};const doc={documentElement:{contains:()=>attached}};
 const style=()=>new Proxy({},{set(target,key,value){writes++;target[key]=value;return true;}}),starts=[{style:style()},{style:style()}],gaps=[{style:style()},{style:style()}];
 const native={getRootNode:()=>attached?(currentRoot??doc):native,offsetParent:boundary.fixed?null:{},classList:{add(){},remove(){}}};
 if(boundary.noRootMethod)delete native.getRootNode;
 if(boundary.shadow)currentRoot=shadowA;
 const container={getBoundingClientRect:()=>({left:100,right:300,width:visible?(boundary.width??200):0,height:visible?40:0}),
  querySelectorAll:selector=>selector.includes(',')?[...starts,...gaps]:selector.endsWith('-start')?starts:gaps,querySelector:selector=>boundary.prefixSuffix&&['.mat-form-field-prefix','.mat-form-field-suffix'].includes(selector)?{getBoundingClientRect:()=>({width:30})}:null};
 const label={textContent:'Label',children:[{get offsetWidth(){return labelWidth;},getBoundingClientRect:()=>({left:labelStart,right:labelRight})}]};
 class ProtocolColor{constructor(element){this._elementRef=element;this.color=this.defaultColor='primary';}}
 const exports={},values={_MatFormFieldBase:ProtocolColor,Subject:rx.Subject,Subscription:rx.Subscription,merge:rx.merge,fromEvent:rx.fromEvent,
 filter:ops.filter,map:ops.map,pairwise:ops.pairwise,startWith:ops.startWith,take:ops.take,takeUntil:ops.takeUntil,
 afterFormFieldRender:helper(helperJs),legacyAnimationsDisabled:()=>true,document:doc,
 getShadowRoot:()=>currentRoot??null,requestAnimationFrame:boundary.frames?callback=>{const id=frameId++;frames.set(id,callback);capturedFrames.push(callback);return id;}:undefined,
 cancelAnimationFrame:boundary.frames&&!boundary.noCancel?id=>{canceledFrames++;frames.delete(id);}:undefined};
 new Function('exports',...Object.keys(values),js)(exports,...Object.values(values));
 const cdr=shell?.changeDetectorRef??{markForCheck(){},detectChanges(){}},dir={value:'ltr',change:new rx.Subject()};
 let directionSubscriptions=0;const subscribe=dir.change.subscribe.bind(dir.change);
 dir.change.subscribe=(...args)=>{const sub=subscribe(...args);directionSubscriptions++;sub.add(()=>directionSubscriptions--);return sub;};
 const args=[new core.ElementRef(native),cdr,dir,{appearance:'outline'},{isBrowser:true},zone,'NoopAnimations'];
 if(injector!=null)args.push(injector);const instance=new exports.MatLegacyFormField(...args);
 if(js===payload.candidate)assert.equal(instance._injector,injector??undefined,'optional-injector-assignment');
 const control=new forms.FormControl('value'),accessor={stateChanges:new rx.Subject(),placeholder:'',errorState:false,controlType:'mat-input',
  ngControl:{control,valueChanges:control.valueChanges},setDescribedByIds(){}};
 const query=()=>{const q=new core.QueryList();q.reset([]);return q;};
 Object.assign(instance,{_control:accessor,_previousControl:accessor,_previousControlValidatorFn:null,_prefixChildren:query(),_suffixChildren:query(),
  _hintChildren:query(),_errorChildren:query(),_labelChildNonStatic:{},_connectionContainerRef:new core.ElementRef(container),_label:new core.ElementRef(label)});
 return{instance,dir,starts,gaps,accessor,frames,capturedFrames,directionSubscriptions:()=>directionSubscriptions,
  changeDirection(value){dir.value=value;labelRight=value==='rtl'?260:200;dir.change.next(value);},canceledFrames:()=>canceledFrames,
  flushFrames(){for(const[id,callback]of [...frames]){frames.delete(id);zone.runOutsideAngular(callback);}},counts:()=>writes,snapshot:()=>({start:starts.map(n=>n.style.width??null),gap:gaps.map(n=>n.style.width??null)}),
  prefix(){labelStart=150;labelRight=230;instance._prefixChildren.notifyOnChanges();},hide(){visible=false;},show(){visible=true;},
  detach(){attached=false;},attach(){attached=true;},empty(){label.textContent='';},rtl(){dir.value='rtl';labelRight=280;instance._prefixChildren.notifyOnChanges();},
  reparent(){currentRoot=shadowB;labelWidth=120;}};
}
function geometry(js=payload.candidate){
 const rows=[];
 for(const [id,boundary,expected]of [
  ['long-prefix-suffix',{labelWidth:640,width:200,prefixSuffix:true},{start:['15px','15px'],gap:['490px','490px']}],
  ['fixed-host',{fixed:true},{start:['15px','15px'],gap:['70px','70px']}],
  ['document-fallback',{noRootMethod:true},{start:['15px','15px'],gap:['70px','70px']}],
  ['detached-fallback',{noRootMethod:true,detached:true},{start:[null,null],gap:[null,null]}],
  ['detached-root',{detached:true},{start:[null,null],gap:[null,null]}],
  ['shadow-reparent',{shadow:true},{start:['15px','15px'],gap:['70px','70px']}],
 ]){
  const f=fixture(js,payload.helper,null,boundary);
  try{
   f.instance.updateOutlineGap();assert.deepEqual(f.snapshot(),expected,'tagged-geometry-'+id);
   if(boundary.shadow){f.reparent();f.instance.updateOutlineGap();assert.deepEqual(f.snapshot().gap,['100px','100px'],'tagged-geometry-reparented-shadow');}
   rows.push({id,snapshot:f.snapshot()});
  }finally{f.instance.ngOnDestroy();}
 }
 return rows;
}
function labelMatrix(js=payload.candidate){
 const f=fixture(js,payload.helper,null),rows=[];
 try{
  for(const appearance of ['legacy','standard','fill','outline'])for(const floatLabel of ['auto','always','never'])
   for(const label of [false,true])for(const placeholder of [false,true])for(const childPlaceholder of [false,true])
    for(const controlFloat of [false,true])for(const animating of [false,true]){
     f.instance.appearance=appearance;f.instance.floatLabel=floatLabel;f.instance._labelChildNonStatic=label?{}:undefined;
     f.instance._labelChildStatic=undefined;f.instance._placeholderChild=childPlaceholder?{}:undefined;
     f.accessor.placeholder=placeholder?'Placeholder':'';f.accessor.shouldLabelFloat=controlFloat;f.instance._showAlwaysAnimate=animating;
     rows.push({appearance,floatLabel,label,placeholder,childPlaceholder,controlFloat,animating,
       hasLabel:f.instance._hasLabel(),hasFloatingLabel:f.instance._hasFloatingLabel(),shouldFloat:f.instance._shouldLabelFloat(),
       hidePlaceholder:f.instance._hideControlPlaceholder(),canFloat:f.instance._canLabelFloat(),alwaysFloat:f.instance._shouldAlwaysFloat()});
    }
  return rows;
 }finally{f.instance.ngOnDestroy();}
}
function directionLifetime(kind,js=payload.candidate){
 const noRAF=kind==='no-raf',f=fixture(js,payload.helper,null,{frames:!noRAF,noCancel:kind==='no-cancel'});
 try{
  zone.run(()=>f.instance.ngAfterContentInit());f.instance._outlineGapCalculationNeededOnStable=false;
  assert.equal(f.directionSubscriptions(),1,'direction-subscription-installed');
  const before=f.counts();
  if(kind==='live'||noRAF){
   zone.run(()=>f.changeDirection('rtl'));
   if(!noRAF){assert.equal(f.counts(),before,'direction-measurement-waits-for-frame');assert.equal(f.frames.size,1);f.flushFrames();}
   assert.deepEqual(f.snapshot().start,['35px','35px'],'live-direction-geometry');
   assert.equal(f.instance._directionFrames?.size??0,0,'delivered-direction-frame-released');
  }else if(kind==='reentrant'){
   f.instance._stateChanges=new rx.Subscription(()=>f.changeDirection('rtl'));
  }else{
   zone.run(()=>{f.changeDirection('rtl');f.changeDirection('ltr');});assert.equal(f.frames.size,2);
  }
  const captured=[...f.capturedFrames],writes=f.counts();f.instance.ngOnDestroy();
  assert.equal(f.directionSubscriptions(),0,'destroy-releases-direction-subscription');
  if(kind!=='no-cancel')assert.equal(f.frames.size,0,'destroy-cancels-owned-direction-frames');
  assert.equal(f.instance._directionFrames?.size??0,0,'destroy-releases-direction-frame-handles');
  f.flushFrames();for(const callback of captured)zone.runOutsideAngular(callback);
  assert.equal(f.counts(),writes,'destroyed-field-cannot-deliver-frame-writes');
  zone.run(()=>f.changeDirection('rtl'));assert.equal(f.frames.size,0,'destroyed-direction-cannot-schedule');
  assert.equal(f.counts(),writes,'destroyed-direction-cannot-measure');
  return{kind,captured_frames:captured.length,canceled:f.canceledFrames(),pending_after_destroy:f.frames.size};
 }finally{f.instance.ngOnDestroy();}
}
function frameBaseline(js){
 const f=fixture(js,payload.helper,null,{frames:true});
 try{
  zone.run(()=>f.instance.ngAfterContentInit());f.instance._outlineGapCalculationNeededOnStable=false;
  zone.run(()=>{f.dir.value='rtl';f.dir.change.next('rtl');f.dir.value='ltr';f.dir.change.next('ltr');});
  const before=f.frames.size;f.instance.ngOnDestroy();const pending=f.frames.size,writes=f.counts();f.flushFrames();
  return{scheduled:before,pending_after_destroy:pending,writes_after_destroy:f.counts()-writes,canceled:f.canceledFrames()};
 }finally{f.instance.ngOnDestroy();}
}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));function render(){shell?.changeDetectorRef.markForCheck();app?.tick();}
function turn(fn){zone.run(()=>{fn();${mode==='zoneful'?"render();":''}});render();}
async function sequence(js=payload.candidate,helperJs=payload.helper,injector=app?.injector,expected=true){const f=fixture(js,helperJs,injector),states=[];
 try{zone.run(()=>{f.instance.ngAfterContentInit();${mode==='zoneful'?"render();assert.equal(f.counts(),0,'zoneful-render-cannot-preempt-stability');":''}});render();await drain();
 if(expected)assert.deepEqual(f.snapshot(),{start:['15px','15px'],gap:['70px','70px']},'initial-outline');else assert.deepEqual(f.snapshot(),{start:[null,null],gap:[null,null]},'historical-zoneless-outline-pending');states.push(f.snapshot());
 const before=f.counts();turn(()=>{});await drain();assert.equal(f.counts(),before,'idle-render-does-no-gap-work');
 turn(()=>f.prefix());await drain();if(expected)assert.deepEqual(f.snapshot().start,['45px','45px'],'prefix-outline-updated');states.push(f.snapshot());
 turn(()=>{f.hide();f.prefix();});await drain();const hidden=f.counts();turn(()=>f.show());await drain();if(expected)assert.ok(f.counts()>hidden,'hidden-outline-retried-after-render');states.push(f.snapshot());
 turn(()=>f.rtl());await drain();if(expected)assert.deepEqual(f.snapshot().start,['15px','15px'],'rtl-outline-updated');states.push(f.snapshot());
 turn(()=>{f.empty();f.prefix();});await drain();if(expected)assert.deepEqual(f.snapshot(),{start:['0','0'],gap:['0','0']},'empty-label-zeroes-gaps');states.push(f.snapshot());return states;
 }finally{f.instance.ngOnDestroy();}}
async function canceled(js=payload.candidate,helperJs=payload.helper){const f=fixture(js,helperJs),before=callbacks;
 zone.run(()=>{f.instance.ngAfterContentInit();f.instance.ngOnDestroy();});render();await drain();assert.equal(callbacks,before,'canceled-continuous-render-hook');assert.equal(f.counts(),0,'no-gap-work-after-destroy');render();assert.equal(callbacks,before,'no-later-continuous-render-hook');}
async function errorCleanup(js){let active=0;const emitter=zone.onStable,subscribe=emitter.subscribe,subs=[];
 emitter.subscribe=function(...args){const sub=subscribe.apply(this,args);subs.push(sub);active++;sub.add(()=>active--);return sub;};const bad=core.Injector.create({providers:[{provide:core.ApplicationRef,useFactory:()=>{throw new Error('expected-lookup-error');}}]});
 try{let error;helper(js)(zone,bad).subscribe({error:value=>error=value});assert.equal(error?.message,'expected-lookup-error');assert.equal(active,0,'lookup-error-cleans-zone-subscription');}
 finally{emitter.subscribe=subscribe;subs.forEach(sub=>sub.unsubscribe());bad.destroy();}}
try{
 const old=await sequence(payload.original,payload.helper,app?.injector,${mode==='zoneful'}),candidate=await sequence();${mode==='zoneful'?'assert.deepEqual(candidate,old);':''}
 await canceled();await errorCleanup(payload.helper);let manual=null;${mode==='zoneful'?"manual=await sequence(payload.candidate,payload.helper,null);assert.deepEqual(manual,old);":''}
 const labelsReference=labelMatrix(payload.original),labelsBefore=labelMatrix(payload.labelFrameBefore);
 const labelDifferences=labelsReference.filter((row,index)=>JSON.stringify(row)!==JSON.stringify(labelsBefore[index]));
 assert.ok(labelDifferences.length>0,'authored-label-guard-difference-reproduced');
 const labelsCandidate=labelMatrix();assert.deepEqual(labelsCandidate,labelsReference,'tagged-label-state-matrix');
 const directions=['live','queued','no-raf','no-cancel','reentrant'].map(kind=>directionLifetime(kind));
 const frameOriginal=frameBaseline(payload.original),frameBefore=frameBaseline(payload.labelFrameBefore);
 assert.equal(frameBefore.pending_after_destroy,2);assert.equal(frameBefore.writes_after_destroy,8);
 const geometryReference=geometry(payload.original),geometryCandidate=geometry();assert.deepEqual(geometryCandidate,geometryReference);
 const mutations=[];${model.line!=='original'?`
 const reject=async(id,op,message)=>{await assert.rejects(async()=>op(),error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
 if(${mode==='zoneless'}){
  await reject('prior-zone-only-outline-wait',()=>sequence(payload.mutations.priorWait),'initial-outline');
  await reject('destroy-without-render-unsubscribe',()=>canceled(payload.mutations.noDestroy),'canceled-continuous-render-hook');
  await reject('retained-continuous-render-handle',()=>canceled(payload.candidate,payload.mutations.leakedRender),'canceled-continuous-render-hook');
 }else await reject('removed-stability-guard',()=>sequence(payload.candidate,payload.mutations.premature),'zoneful-render-cannot-preempt-stability');
 await reject('authored-no-label-guard',()=>assert.deepEqual(labelMatrix(payload.mutations.priorLabelGuard),labelsReference,'tagged-label-state-matrix'),'tagged-label-state-matrix');
 await reject('missing-direction-frame-cancellation',()=>directionLifetime('queued',payload.mutations.noFrameCancellation),'destroy-cancels-owned-direction-frames');
 await reject('missing-direction-callback-guard',()=>directionLifetime('queued',payload.mutations.noFrameCallbackGuard),'destroyed-field-cannot-deliver-frame-writes');
 await reject('missing-field-destruction-flag',()=>directionLifetime('reentrant',payload.mutations.noFieldDestroyFlag),'destroy-cancels-owned-direction-frames');
 await reject('retained-direction-subscription',()=>directionLifetime('queued',payload.mutations.noDirectionSubscriptionCleanup),'destroy-releases-direction-subscription');
 await reject('pre-existing-notch-cap',()=>geometry(payload.mutations.priorGeometry),'tagged-geometry-long-prefix-suffix');
 await reject('visible-offset-parent-only',()=>geometry(payload.mutations.visibleOffsetParent),'tagged-geometry-fixed-host');
 await reject('cached-shadow-root',()=>geometry(payload.mutations.staleShadowRoot),'tagged-geometry-reparented-shadow');
 await reject('missing-document-fallback',()=>geometry(payload.mutations.noFallback),'tagged-geometry-document-fallback');
 await reject('lost-historical-label-scale',()=>geometry(payload.mutations.noLabelScale),'tagged-geometry-long-prefix-suffix');
 await reject('continuous-hook-reduced-to-once',()=>sequence(payload.candidate,payload.mutations.oneShot),'prefix-outline-updated');
 await reject('idle-render-forces-measurement',()=>sequence(payload.mutations.noFlag),'idle-render-does-no-gap-work');
 await reject('lookup-error-leaks-zone-subscription',()=>errorCleanup(payload.mutations.noErrorCleanup),'lookup-error-cleans-zone-subscription');
 `:''}
 console.log(JSON.stringify({old,candidate,manual,callbacks,label_matrix_cases:labelsReference.length,label_difference_count:labelDifferences.length,label_difference_samples:labelDifferences.slice(0,3),directions,frameOriginal,frameBefore,geometryReference,geometryCandidate,mutations,genuine_public_application:!!app,
  whole_source_constructors_replayed:true,actual_legacy_traits_node_DI_or_DOM_qualified:false,native_executed:false}));
}finally{shell?.destroy();app?.destroy();core.destroyPlatform();}
`;
   const path=join(model.root,'form-field-render-runtime-'+mode+'-'+production+'.mjs');writeFileSync(path,script);
   const value=JSON.parse(execFileSync(process.execPath,['--max-old-space-size=512',path],{cwd:model.root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));results.push({line:model.line,mode,production,zone_subject:zoneSubject,...value});
  }
 }
 const report={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',sources:Object.values(paths).map(path=>({path,sha256:hash(read(path))})),
  reference:{path:originalPath,sha256:hash(original)},node:process.version,binding_parser:ts.version,namespace_capsule_sha256:loaded.capsule_hash,results,public_contracts:contracts,
  constructor_change:{original_parameters:7,current_parameters:8,old_parameters_and_authored_body_identical:true,new_optional_trailing_Injector:true,actual_node_DI_compiled_or_executed:false},
  geometry_methods_equal_immutable_tag:true,label_decision_matches_tagged_body:true,type_compilation:{compiler:compiler.version,compiler_source_sha256:hash(readFileSync(compilerPath)),subjects:types},
  scope:'Complete original/owned field constructor and members with a protocol color-trait parent; Angular decorators removed. Genuine public NgZone/QueryList/FormControl and current public application/continuous render hook. A real Angular OnPush shell/view and ChangeDetectorRef drive current render cycles with a protocol renderer; this is not a legacy field Angular view. Control wrapper, DOM geometry/styles/document attachment, direction and disabled-motion policy are protocols; original uses a change-detector protocol. Original standard geometry is exercised independently; candidate geometry methods match the immutable tagged methods; long-label/prefix/suffix, fixed offset-parent, document fallback, detachment and shadow reparenting are protocol observations, not native DOM qualification. No actual legacy traits/node DI/AOT/packed/native geometry, consumer builds or Rx/Node floor qualification.',
  native_or_actual_legacy_instances_qualified:false,g11_claim:'not-passed'};assert.equal(results.length,10);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:report.line,subjects:10,mutation_rejections:results.flatMap(r=>r.mutations).length,compiler:compiler.version,native_executed:false,actual_legacy_instances_qualified:false}));
}finally{loaded.dispose();}
