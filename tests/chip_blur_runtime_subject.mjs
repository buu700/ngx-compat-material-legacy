/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole chip, explicit traits/ripple/DOM, genuine zone/queries/forms/key manager. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production,baseline]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),forms=await import('@angular/forms'),a11y=await import('@angular/cdk/a11y');
const rx=await import('rxjs'),ops=await import('rxjs/operators');
const payload=JSON.parse(readFileSync(new URL('./chip-blur-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else{
 const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
 app=await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
  {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
  {provide:core.DOCUMENT,useValue:{head:{children:[]}}},{provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
 zone=app.injector.get(core.NgZone);if(mode==='zoneless')assert.equal(typeof globalThis.Zone,'undefined');
}
const drain=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(js=payload.candidate,listJs=payload.list,{input=false}={}){
 const exports={};let rippleCleanups=0,created=0,setups=0;
 class TraitsProtocol{constructor(element){this._elementRef=element;this.disableRipple=false;}}
 class RippleProtocol{constructor(){created++;}setupTriggerEvents(){setups++;}_removeTriggerEvents(){rippleCleanups++;}}
 new Function('exports','TraitsProtocol','RippleRenderer','Subject','Subscription','EventEmitter','take',js)
  (exports,TraitsProtocol,RippleProtocol,rx.Subject,rx.Subscription,core.EventEmitter,ops.take);
 const Type=exports.Replay;assert.equal(Type.length,8,'historical-constructor-arity');
 const classes=new Set(),children=[],host={tagName:'MAT-CHIP',hasAttribute:()=>false,
  classList:{add:name=>classes.add(name)},appendChild:node=>children.push(node),focus(){}};
 const document={createElement:()=>({classList:{add:name=>classes.add(name)}})};
 const instance=new Type(new core.ElementRef(host),zone,{isBrowser:false},null,{markForCheck(){}},document,undefined,'0');
 assert.equal(created,1);assert.equal(setups,1);assert.equal(children.length,1);assert.equal(classes.has('mat-chip-ripple'),true);
 const listExports={};new Function('exports','merge',listJs)(listExports,rx.merge);
 const list=new listExports.ListReplay(),control=new forms.FormControl('value'),blurs=[];
 const query=new core.QueryList();query.reset([instance]);
 Object.assign(list,{chips:query,_keyManager:new a11y.FocusKeyManager(query),disabled:false,_chipInput:input?{focused:false}:null,
  stateChanges:new rx.Subject(),_changeDetectorRef:{markForCheck(){}},_onTouched:()=>control.markAsTouched()});
 instance._onBlur.subscribe(event=>blurs.push(event.chip===instance));list._listenToChipsFocus();
 return{instance,list,control,blurs,rippleCleanups:()=>rippleCleanups,
  close(){instance.ngOnDestroy();list._chipFocusSubscription.unsubscribe();list._chipBlurSubscription.unsubscribe();list._keyManager.destroy();query.destroy();}};
}
async function normal(js,listJs,expected=true,input=false){
 const f=fixture(js,listJs,{input});
 try{
  zone.run(()=>{f.instance.focus();assert.equal(f.list.focused,true);f.instance._blur();
   assert.equal(f.instance._hasFocus,true,'blur-is-deferred');assert.equal(f.control.touched,false);});
  await drain();if(input)await drain();
  assert.equal(f.instance._hasFocus,!expected,'blur-clears-chip-focus');
  assert.equal(f.list.focused,!expected,'list-focus-tracks-blur');
  assert.equal(f.control.touched,expected,'blur-marks-real-control-touched');
  assert.deepEqual(f.blurs,expected?[true]:[],'blur-emits-once');
  zone.run(()=>{});await drain();assert.deepEqual(f.blurs,expected?[true]:[],'blur-does-not-repeat');
  return{chipFocused:f.instance._hasFocus,listFocused:f.list.focused,touched:f.control.touched,blurs:[...f.blurs]};
 }finally{f.close();await drain();}
}
async function canceled(js=payload.candidate){
 const f=fixture(js,payload.list);
 try{zone.run(()=>{f.instance.focus();f.instance._blur();f.instance.ngOnDestroy();});await drain();
  assert.deepEqual(f.blurs,[],'destroy-cancels-pending-blur');assert.equal(f.instance._hasFocus,true,'destroy-retains-focus-for-removal-observer');
  assert.equal(f.instance._blurSubscription?.closed,true,'destroy-releases-blur-request');
 }finally{f.close();await drain();}
}
async function refocused(js=payload.candidate){
 const f=fixture(js,payload.list);
 try{zone.run(()=>{f.instance.focus();f.instance._blur();f.instance.focus();});await drain();
  assert.deepEqual(f.blurs,[],'refocus-cancels-stale-blur');assert.equal(f.instance._hasFocus,true);assert.equal(f.control.touched,false);
 }finally{f.close();await drain();}
}
async function repeated(js=payload.candidate){
 const f=fixture(js,payload.list);
 try{zone.run(()=>{f.instance.focus();f.instance._blur();f.instance._blur();});await drain();
  assert.deepEqual(f.blurs,[true],'only-current-blur-emits');
 }finally{f.close();await drain();}
}
async function afterDestroy(js=payload.candidate){
 const f=fixture(js,payload.list);
 try{f.instance.ngOnDestroy();const request=f.instance._blurSubscription;zone.run(()=>f.instance._blur());await drain();
  assert.equal(f.instance._blurSubscription,request,'destroyed-chip-rejects-blur-request');assert.deepEqual(f.blurs,[]);
  f.instance.ngOnDestroy();assert.equal(f.rippleCleanups(),1,'destroy-cleans-ripple-once');
 }finally{f.close();await drain();}
}
const cases=[],mutations=[];
async function check(id,operation){try{await operation();cases.push({id,result:'pass'});}catch(error){if(baseline!=='true')throw error;cases.push({id,result:'fail',error:error.message});}}
try{
 const expected=baseline==='true'?mode==='zoneful':true;
 const original=await normal(payload.original,payload.originalList,mode==='zoneful'),candidate=await normal(payload.candidate,payload.list,expected);
 if(mode==='zoneful')assert.deepEqual(candidate,original);
 const withInput=await normal(payload.candidate,payload.list,expected,true);
 await check('destroy-before-stable',()=>canceled());await check('refocus-before-stable',()=>refocused());
 await check('repeated-blur',()=>repeated());await check('request-after-destroy',()=>afterDestroy());
 if(line!=='original'&&baseline!=='true'){
  const reject=async(id,operation,message)=>{await assert.rejects(operation,error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));mutations.push({id,rejected:true});};
  if(mode==='zoneless')await reject('prior-zone-only-wait',()=>normal(payload.mutations.prior,payload.list),'blur-clears-chip-focus');
  await reject('destroy-keeps-pending-blur',()=>canceled(payload.mutations.noDestroyCancel),'destroy-releases-blur-request');
  await reject('refocus-keeps-pending-blur',()=>refocused(payload.mutations.noFocusCancel),'refocus-cancels-stale-blur');
  await reject('repeated-blur-keeps-prior-request',()=>repeated(payload.mutations.noReplaceCancel),'only-current-blur-emits');
  await reject('post-destroy-blur-request',()=>afterDestroy(payload.mutations.noEntryGuard),'destroyed-chip-rejects-blur-request');
 }
 console.log(JSON.stringify({original,candidate,withInput,cases,mutations,genuine_public_zone:true,genuine_public_form_control:true,
  genuine_public_application:!!app,whole_chip_constructor_executed:true,list_selected_complete_members_only:true,
  native_executed:false,actual_legacy_node_DI_executed:false}));
}finally{app?.destroy();core.destroyPlatform();}
