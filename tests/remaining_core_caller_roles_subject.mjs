/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine Core/Node Zone; named non-Core tokens and service values are protocols. */
import assert from 'node:assert/strict';
await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core'),[line,mode]=process.argv.slice(2);if(mode==='production')core.enableProdMode();
const scopes=await import('./remaining-core-scopes.mjs'),cases=[],check=(id,fn)=>{fn();cases.push(id);};
check('public-dev-mode',()=>assert.equal(core.isDevMode(),mode==='development'));
const values=[['undefined',undefined],['null',null],['false',false],['true',true],['empty',''],['false-string','false'],['true-string','true'],['zero',0],['one',1],['negative',-1],['NaN',NaN],['Infinity',Infinity],['array',[]],['false-array',[false]],['object',{}],['boxed-false',new Boolean(false)],['boxed-false-string',new String('false')],['boxed-zero',new Number(0)],['symbol',Symbol('boolean')],['bigint-zero',0n],['throwing-string-conversion',{toString(){throw Error('unused conversion');}}]];
const booleans=values.map(([id,value])=>({id,value:core.booleanAttribute(value)}));assert.equal(booleans.length,21);
const localeValues=['en-US','fr','de','ja','zh-Hant','en_US','x-Custom'];
for(const locale of localeValues)check('locale-forwarding:'+locale,()=>{const injector=core.Injector.create({providers:[{provide:core.LOCALE_ID,useValue:locale}]});try{core.runInInjectionContext(injector,()=>{assert.equal(scopes.MAT_LEGACY_DATE_LOCALE_FACTORY(),locale);assert.equal(scopes.MAT_DATE_LOCALE_FACTORY(),locale);});}finally{injector.destroy();}});
check('locale-requires-context-and-provider-errors-propagate',()=>{assert.throws(()=>scopes.MAT_LEGACY_DATE_LOCALE_FACTORY(),/NG0203|injection context/);const error=Error('locale provider failure'),injector=core.Injector.create({providers:[{provide:core.LOCALE_ID,useFactory(){throw error;}}]});try{core.runInInjectionContext(injector,()=>assert.throws(()=>scopes.MAT_LEGACY_DATE_LOCALE_FACTORY(),e=>e===error));}finally{injector.destroy();}});
check('optional-nonce-explicit-values-and-missing-provider',()=>{for(const nonce of ['fixture-nonce','',null]){const injector=core.Injector.create({providers:[{provide:core.CSP_NONCE,useValue:nonce}]});try{core.runInInjectionContext(injector,()=>assert.equal(scopes.nonceValue(),nonce));}finally{injector.destroy();}}const empty=core.Injector.create({providers:[]});try{core.runInInjectionContext(empty,()=>assert.equal(scopes.nonceValue(),null));}finally{empty.destroy();}});
const borrowed={appearance:'legacy',_hasLabel:()=>false},documentValue={origin:'document-protocol'},detector={markForCheck(){}};
check('actual-inject-expression-values-and-optional-absence',()=>{const injector=core.Injector.create({providers:[{provide:scopes.MAT_LEGACY_FORM_FIELD,useValue:borrowed},{provide:scopes.DOCUMENT,useValue:documentValue},{provide:core.ChangeDetectorRef,useValue:detector}]});try{core.runInInjectionContext(injector,()=>{assert.equal(scopes.inputValue(),borrowed);assert.equal(scopes.snackDocument(),documentValue);assert.equal(scopes.menuDetector(),detector);});}finally{injector.destroy();}const empty=core.Injector.create({providers:[]});try{core.runInInjectionContext(empty,()=>assert.equal(scopes.inputValue(),null));}finally{empty.destroy();}});
check('required-inject-expressions-reject-missing-and-outside-context',()=>{const empty=core.Injector.create({providers:[]});try{core.runInInjectionContext(empty,()=>assert.throws(()=>scopes.menuDetector(),/NG0201|No provider/));}finally{empty.destroy();}for(const fn of [scopes.inputValue,scopes.snackDocument,scopes.menuDetector])assert.throws(fn,/NG0203|injection context/);});
const policy=[
 ['override', [{provide:scopes.LEGACY_ANIMATIONS_TEST_OVERRIDE,useValue:'reduced-motion'}], 'reduced-motion'],
 ['material-disabled',[{provide:scopes.MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}],'di-disabled'],
 ['module-disabled',[{provide:core.ANIMATION_MODULE_TYPE,useValue:'NoopAnimations'}],'di-disabled'],
 ['media-reduced',[{provide:scopes.MediaMatcher,useValue:{matchMedia:()=>({matches:true})}}],'reduced-motion'],
 ['media-enabled',[{provide:scopes.MediaMatcher,useValue:{matchMedia:()=>({matches:false})}}],'enabled'],
 ['missing-media',[],'enabled'],
 ['media-provider-error',[{provide:scopes.MediaMatcher,useFactory(){throw Error('media unavailable');}}],'enabled'],
];
for(const[id,providers,expected]of policy)check('actual-policy-inject-calls:'+id,()=>{const injector=core.Injector.create({providers});try{core.runInInjectionContext(injector,()=>assert.equal(scopes.getLegacyAnimationsState(),expected));}finally{injector.destroy();}});
check('policy-optional-provider-errors-before-media-catch-propagate',()=>{for(const token of [scopes.LEGACY_ANIMATIONS_TEST_OVERRIDE,scopes.MATERIAL_ANIMATIONS,core.ANIMATION_MODULE_TYPE]){const error=Error('policy provider failure'),injector=core.Injector.create({providers:[{provide:token,useFactory(){throw error;}}]});try{core.runInInjectionContext(injector,()=>assert.throws(()=>scopes.getLegacyAnimationsState(),e=>e===error));}finally{injector.destroy();}}});
check('owned-tab-zone-helper-keeps-manual-null-and-supplied-identity',()=>{assert.equal(scopes.tabBodyNgZone(),null);const zone={origin:'supplied-zone-protocol'},injector=core.Injector.create({providers:[{provide:core.NgZone,useValue:zone}]});try{core.runInInjectionContext(injector,()=>assert.equal(scopes.tabBodyNgZone(),zone));}finally{injector.destroy();}});
const mock=new scopes.MockNgZone();
check('test-only-mock-parent-and-apply-this-arguments-return-error',()=>{assert.ok(mock instanceof core.NgZone);const receiver={marker:'receiver'},error=Error('callback failure');assert.equal(mock.run(function(a,b){assert.equal(this,receiver);return a+b;},receiver,[3,4]),7);assert.equal(mock.run(()=>9),9);assert.throws(()=>mock.run(()=>{throw error;}),e=>e===error);assert.equal(mock.runOutsideAngular(()=>11),11);});
check('test-only-mock-keeps-intentional-synchronous-zone-override',()=>{const actual=new core.NgZone({enableLongStackTrace:false});actual.run(()=>{assert.equal(core.NgZone.isInAngularZone(),true);mock.runOutsideAngular(()=>assert.equal(core.NgZone.isInAngularZone(),true));});});
check('test-only-stable-emitter-cast-and-unsubscription',()=>{const events=[],subscription=mock.onStable.subscribe(value=>events.push(value));mock.simulateZoneExit();assert.deepEqual(events,[null]);subscription.unsubscribe();mock.simulateZoneExit();assert.deepEqual(events,[null]);});
const actualZone=new core.NgZone({enableLongStackTrace:false}),previousRAF=Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame');
try{
 check('actual-RAF-member-registers-outside-and-keeps-callback-order',()=>{let frame,called=0;globalThis.requestAnimationFrame=callback=>{assert.equal(core.NgZone.isInAngularZone(),false);frame=callback;return 17;};const receiver=new scopes.RafReceiver(actualZone);actualZone.run(()=>receiver._requestAnimationFrame(()=>{assert.equal(core.NgZone.isInAngularZone(),false);called++;}));assert.equal(called,0);assert.equal(receiver._animationFrame,17);globalThis.Zone.root.run(()=>frame(0));assert.equal(called,1);assert.equal(receiver._animationFrame,null);});
 check('actual-RAF-member-suppresses-stale-and-destroyed-work',()=>{for(const state of ['revision','destroyed']){let frame,called=0;globalThis.requestAnimationFrame=callback=>{frame=callback;return 19;};const receiver=new scopes.RafReceiver(actualZone);actualZone.run(()=>receiver._requestAnimationFrame(()=>called++));if(state==='revision')receiver._animationRevision++;else receiver._animationDestroyed=true;globalThis.Zone.root.run(()=>frame(0));assert.equal(called,0);}});
 check('actual-RAF-member-synchronous-fallback-remains-outside',()=>{delete globalThis.requestAnimationFrame;let called=0;const receiver=new scopes.RafReceiver(actualZone);actualZone.run(()=>receiver._requestAnimationFrame(()=>{assert.equal(core.NgZone.isInAngularZone(),false);called++;}));assert.equal(called,1);});
}finally{if(previousRAF)Object.defineProperty(globalThis,'requestAnimationFrame',previousRAF);else delete globalThis.requestAnimationFrame;}
console.log(JSON.stringify({line,mode,cases,boolean_cases:booleans,Core:core.VERSION.full,actual_MockNgZone_executed:true,actual_RAF_member_with_frame_protocol_executed:true,actual_Core_NgZone_and_Node_Zone_executed:true,non_Core_token_and_service_values_are_protocols:true,actual_dialog_components_or_default_nonce_root_factory_executed:false,actual_native_packed_or_full_floor_qualified:false}));
