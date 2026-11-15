/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT license; see LICENSE.
 */
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
export const DIALOG_SERVICE_MODE_SYMBOL='legacy-dialog/primary/MatLegacyDialog';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fileHash='02cbd08f4d1e656cbbfb08e80fa6dd9606222ace6e600b0f7b777642f17b03ac',mapHash='c24f325f2a9f9b1c50dd62fff06f9b192a74a0fd470e60a368aab25552a633be';
const flags=['optional','self','skipSelf','host'];
const labels=['Overlay','Injector','Location','mat-dialog-default-options','mat-dialog-scroll-strategy','MatLegacyDialog','OverlayContainer','LEGACY_ANIMATION_MODE'];
export function dialogServiceModeProfile(symbol){
 if(symbol?.symbol_id!==DIALOG_SERVICE_MODE_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-dialog');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyDialog');
 const context=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(symbol.shape.originalFactoryContext,context);
 const params=originalContextDi(symbol.shape);assert.equal(context.factory_parameters.length,8);assert.equal(params.length,8);assert.equal(params[7].imported,'ANIMATION_MODULE_TYPE');
 assert.deepEqual(params.map(p=>[p.ident,p.spec,!!p.optional,!!p.self,!!p.skipSelf,!!p.host]),[
  ['Overlay','@angular/cdk/overlay',false,false,false,false],['Injector','@angular/core',false,false,false,false],['Location','@angular/common',true,false,false,false],
  ['MAT_LEGACY_DIALOG_DEFAULT_OPTIONS',null,true,false,false,false],['MAT_LEGACY_DIALOG_SCROLL_STRATEGY',null,false,false,false,false],
  ['MatLegacyDialog',null,true,false,true,false],['OverlayContainer','@angular/cdk/overlay',false,false,false,false],
  ['ANIMATION_MODULE_TYPE','@angular/platform-browser/animations',true,false,false,false]]);
 return {symbol_id:DIALOG_SERVICE_MODE_SYMBOL,original_factory_key:context.parameter_factory_key,original_source_sha256:context.source_sha256,arity:8,index:7};
}
/** Called only with the actual captured public compiler factory and its live node. */
export function observeDialogServiceMode(symbol,Type,owned,core,material,capture,requests,fixture,packageRoot,artifactContext){
 const profile=dialogServiceModeProfile(symbol);assert.ok(profile);assert.equal(Type,owned.dialog.MatLegacyDialog);
 assert.ok(artifactContext?.tarball,'dialog service mode requires the packed library');
 const subject=qualifyCombinedArtifactSubject(readFileSync(artifactContext.tarball),packageRoot);assert.ok(subject,'dialog service mode packed artifact differs');
 const file=resolve(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs'),bytes=readFileSync(file),mapBytes=readFileSync(file+'.map');
 assert.equal(sha(bytes),fileHash);assert.equal(sha(mapBytes),mapHash);
 const source=bytes.toString(),text=Function.prototype.toString.call(Type),base=Function.prototype.toString.call(Object.getPrototypeOf(Type));
 assert.ok(source.includes(text)&&source.indexOf(text)===source.lastIndexOf(text));assert.ok(source.includes(base)&&source.indexOf(base)===source.lastIndexOf(base));
 const map=JSON.parse(mapBytes);for(const [suffix,hash] of [['/legacy-dialog/dialog.ts','f61dfeed66de6b3f52507fa6876fa6d7cf32f1786b3cf45486586d5bb18391a0'],['/legacy-dialog/internal/dialog-base.ts','4926702c9f5aaafa17c7489692da5b67dcdde261d79cafd0628f95a4134ea61a']]){const hits=map.sources.map((s,i)=>s.endsWith(suffix)?i:-1).filter(i=>i>=0);assert.equal(hits.length,1);assert.equal(sha(map.sourcesContent[hits[0]]),hash);}
 const token=owned.core.LEGACY_ANIMATION_MODE,old=core.ANIMATION_MODULE_TYPE;assert.ok(token&&old&&token!==old&&token!==material.MATERIAL_ANIMATIONS);
 assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,8);assert.ok(capture.value instanceof Type);assert.equal(capture.value._hasInjectionContext,true);
 const mode=capture.inputs[7];assert.equal(mode,fixture.element.injector.get(token,null,{optional:true}));assert.equal(capture.value._animationMode,mode);
 const matches=requests.filter(r=>r.token===token);assert.equal(matches.length,1);assert.equal(requests.filter(r=>r.token===old).length,0);
 const req=matches[0];assert.equal(Boolean(req.unresolved),false);for(const flag of flags)assert.equal(Boolean(req[flag]),flag==='optional');
 // Each old-only provider and owned-only provider is isolated; no alias or name comparison.
 const oldOnly=core.Injector.create({providers:[{provide:old,useValue:'NoopAnimations'}]});const ownedOnly=core.Injector.create({providers:[{provide:token,useValue:'BrowserAnimations'}],parent:oldOnly});
 try{assert.equal(oldOnly.get(token,null),null);assert.equal(ownedOnly.get(old),'NoopAnimations');assert.equal(ownedOnly.get(token),'BrowserAnimations');}finally{ownedOnly.destroy();oldOnly.destroy();}
 return {profile,source:{artifact_sha256:subject.artifact_sha256,file_sha256:fileHash,map_sha256:mapHash,owner_sha256:sha(text),base_sha256:sha(base)},constructor_calls:1,raw_mode:mode??null,stored_raw_mode:true,node_owned_token:true,owned_token_distinct:true,old_token_requested:false,old_only_provider_selects_owned:false,request:{optional:true,self:false,skipSelf:false,host:false,unresolved:false},behavior:null};
}
/** Exercise public open through the CDK boundary without opening a renderer-dependent overlay. */
export function challengeDialogServiceMode(evidence,value,Type,capture,fixture,core,owned){
 const sentinel={},cases=[];const dialog=value._dialog,original=dialog.open;
 const captureOpen=(target,config)=>{let received;dialog.open=(_content,options)=>{received=options;throw sentinel;};try{target.open(class TestContent{}, {autoFocus:false,restoreFocus:false,...config});assert.fail('CDK boundary was not reached');}catch(e){if(e!==sentinel)throw e;}finally{dialog.open=original;}return received.disableAnimations===true;};
 const make=mode=>core.Injector.create({providers:[{provide:owned.core.LEGACY_ANIMATION_MODE,useValue:mode}],parent:fixture.element.injector});
 const noop=make('NoopAnimations'),browser=make('BrowserAnimations');
 try{
  // Config injector wins over view-container injector and the constructor's raw mode.
  for(const [id,config,want] of [['config-noop',{injector:noop},true],['config-browser',{injector:browser},false],['view-container-noop',{viewContainerRef:{injector:noop}},true],['config-precedes-view',{injector:browser,viewContainerRef:{injector:noop}},false]]){assert.equal(captureOpen(value,config),want,id);cases.push(id);}
  for(const [mode,want] of [['NoopAnimations',true],['BrowserAnimations',false]]){const args=[...capture.inputs];args[7]=mode;const manual=new Type(...args);try{assert.equal(manual._hasInjectionContext,false);assert.equal(manual._animationMode,mode);assert.equal(captureOpen(manual,{injector:want?browser:noop}),want);cases.push('manual-'+mode);}finally{manual.ngOnDestroy();}}
  assert.equal(fixture.component.hostView.destroyed,false);assert.equal(fixture.element.destroyed,false);assert.equal(fixture.environment.destroyed,false);
 }finally{noop.destroy();browser.destroy();}
 evidence.behavior={cases,public_open_cdk_boundary:true,borrowed_context_alive:true,borrowed_alive_after_service_teardown:false};return evidence;
}
export function dialogServiceModeProblems(row,artifactContext){
 if(row?.symbol?.symbol_id!==DIALOG_SERVICE_MODE_SYMBOL)return [];
 let profile;try{profile=dialogServiceModeProfile(row.symbol);}catch{return ['original dialog service mode contract differs'];}
 const x=row.factory_dialog_service_mode_context,r=row.runtime_requests?.[7];
 const original=originalContextDi(row.symbol.shape);
 const requests=row.runtime_requests;
 if(!Array.isArray(requests)||requests.length!==8||requests.some((q,i)=>!q||q.expected_ident!==original[i].ident||q.expected_spec!==original[i].spec||q.observed_label!==labels[i]||q.unresolved!==false||q.identity_matched!==(i!==7)||flags.some(f=>q[f]!==Boolean(original[i][f])||q['expected_'+f]!==Boolean(original[i][f]))))return ['dialog service original constructor inputs differ'];
 let packed=null;try{packed=artifactContext?.tarball&&qualifyCombinedArtifactSubject(readFileSync(artifactContext.tarball),artifactContext.packageRoot);}catch{}
 if(!packed||row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true||row.factory_node_kind!=='element'||!x||!isDeepStrictEqual(x.profile,profile)||x.source?.artifact_sha256!==packed?.artifact_sha256||x.source?.file_sha256!==fileHash||x.source?.map_sha256!==mapHash||x.source?.owner_sha256!=='0f94d4afb4a3a8e55354e124c011b6a55d6f4b2f84917f5abc47289cd1f97915'||x.source?.base_sha256!=='febafe054918036fcd470faa74b34ca72dec307913a758433e3e82a49c81eb6e'||x.constructor_calls!==1||x.raw_mode!==null||x.stored_raw_mode!==true||x.node_owned_token!==true||x.owned_token_distinct!==true||x.old_token_requested!==false||x.old_only_provider_selects_owned!==false||!isDeepStrictEqual(x.request,{optional:true,self:false,skipSelf:false,host:false,unresolved:false})||!isDeepStrictEqual(x.behavior,{cases:['config-noop','config-browser','view-container-noop','config-precedes-view','manual-NoopAnimations','manual-BrowserAnimations'],public_open_cdk_boundary:true,borrowed_context_alive:true,borrowed_alive_after_service_teardown:true})||!isDeepStrictEqual(r.intentional_token_difference,{historical:'@angular/core#ANIMATION_MODULE_TYPE',actual:'@ngx-compat/material-legacy/legacy-core#LEGACY_ANIMATION_MODE',historical_provider_selects_actual:false,classification:'distinct owned legacy motion configuration'}))return ['dialog service owned-mode identity, behavior or lifetime evidence incomplete'];
 return [];
}
