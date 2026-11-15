/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exact candidate-only compiler and real node constructor-mode evidence. */
import {qualifyCombinedArtifactSubject} from './api-combined-d70-image.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

import {verifyAttributeSourceTransition} from './api-attribute-owned-mode-transitions.mjs';
const profiles=Object.freeze({
 "legacy-checkbox/primary/MatLegacyCheckbox": {
  "shape": "82049aa62139c7ebb69eb370196cabed6ed0de83976a69c34b7f9f9485b89f91",
  "index": 5,
  "arity": 7,
  "bundle": "352d23bedf35011b87f2db2e23f2da59149f017b1920167e0e400ef636971e06",
  "attributes": [
   [
    4,
    "tabindex"
   ]
  ],
  "owner": "MatLegacyCheckbox"
 },
 "legacy-chips/primary/MatLegacyChip": {
  "shape": "80040e35499ed1a5bfaff1c75ab5c254cedb776a3d740cf6e83609111793d063",
  "index": 6,
  "arity": 8,
  "bundle": "ca7dac40b117486985d9e764b833412f9425aae42fb37bab6503f6bed991ced7",
  "attributes": [
   [
    7,
    "tabindex"
   ]
  ],
  "owner": "MatLegacyChip"
 },
 "legacy-radio/primary/MatLegacyRadioButton": {
  "shape": "6b918402cc6d7fa6330e3dbe5b0f8d146c60bbe827768a0e125b60cf44a3be8c",
  "index": 5,
  "arity": 8,
  "bundle": "2b00873d856dfc49351d2e44e7f17cd5dbd223f7cd73d0b1eb5292f208fba27f",
  "attributes": [
   [
    7,
    "tabindex"
   ]
  ],
  "owner": "MatLegacyRadioButton"
 },
 "legacy-slide-toggle/primary/MatLegacySlideToggle": {
  "shape": "3e1494e0e0956beabb286ef3981a252fea3d3732791ebd6ff066434965bdd92c",
  "index": 5,
  "arity": 6,
  "bundle": "461246711812ac9939bada6c62466f4636fbe9ad025b56ebe94e0ce2e49071a7",
  "attributes": [
   [
    3,
    "tabindex"
   ]
  ],
  "owner": "MatLegacySlideToggle"
 },
 "legacy-slider/primary/MatLegacySlider": {
  "shape": "8ccfe859855b83fff61494151f84faeffa0c4eaf75ecc1fd05b4bd08fa4a84fa",
  "index": 7,
  "arity": 8,
  "bundle": "0dfee667986006b316c3250592d608f54d0f7a15f41b26c1903da1b7c572e657",
  "attributes": [
   [
    4,
    "tabindex"
   ]
  ],
  "owner": "MatLegacySlider"
 },
 "legacy-tabs/primary/MatLegacyTabLink": {
  "shape": "1bc9958009f1da6157c43a96f01bf31bae41179b73a1942d3b190c233f47fed6",
  "index": 7,
  "arity": 8,
  "bundle": "d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4",
  "attributes": [
   [
    5,
    "tabindex"
   ]
  ],
  "owner": "MatLegacyTabLink"
 },
 "legacy-tabs/primary/_MatLegacyTabLinkBase": {
  "shape": "7864844ad23aaba5dc377a4259b668e62d9d8f4d4b5c77bcaa5e201845f1f1aa",
  "index": 5,
  "arity": 6,
  "bundle": "d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4",
  "attributes": [
   [
    3,
    "tabindex"
   ]
  ],
  "owner": "_MatTabLinkBase"
 },
 "legacy-form-field/primary/MatLegacyFormField": {
  "shape": "e205167b693101e4f7f2ed409f996aa72735202f4e5bc58e31a73151b8f64aca",
  "index": 6,
  "arity": 7,
  "bundle": "ee222f0c8709cef79ac3bc149a758f5f8e50b8dc8f512477ada8cdbbec771475",
  "attributes": [],
  "owner": "MatLegacyFormField"
 }
});
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),sha=x=>createHash('sha256').update(x).digest('hex');
export const attributeOwnedModeProfile=symbol=>profiles[symbol?.symbol_id]??null;
export function qualifyAttributeOwnedMode({symbol,Type,parameterType,core,owned,exports,source,compiler,metadata,originalParameters,context}){
 const p=attributeOwnedModeProfile(symbol);assert.ok(p);assert.equal(sha(JSON.stringify(symbol.shape)),p.shape);assert.deepEqual(originalParameters,symbol.shape.originalFactoryContext.factory_parameters);assert.equal(originalParameters.length,p.arity);
 assert.deepEqual(originalParameters.filter(x=>x.attribute).map(x=>[x.index,x.attribute]),p.attributes);const historical=originalParameters[p.index];assert.equal(historical.ident,'ANIMATION_MODULE_TYPE');assert.equal(historical.imported,'ANIMATION_MODULE_TYPE');assert.equal(historical.spec,'@angular/platform-browser/animations');assert.equal(historical.optional,true);for(const f of ['self','skipSelf','host'])assert.equal(Boolean(historical[f]),false);
 assert.ok(context?.tarball&&context.packageRoot);const archive=readFileSync(context.tarball);const subject=qualifyCombinedArtifactSubject(archive,context.packageRoot);assert.ok(subject);const raw=readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-'+symbol.family+'.mjs'));assert.equal(sha(raw),p.bundle);assert.equal(source,raw.toString());
 const mapsRaw=readFileSync(join(root,'compatibility/rc/qualification/api-attribute-owned-mode-v1/maps.json'));assert.equal(sha(mapsRaw),'5bee39b99907be55823a8bd6e22f73a03bb4b364891ec7d71157685d65fd615a');const entry=JSON.parse(mapsRaw).families[symbol.family],mapRaw=readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-'+symbol.family+'.mjs.map'));assert.equal(sha(mapRaw),entry.map_sha256);const map=JSON.parse(mapRaw);assert.equal(map.sources.length,entry.sources.length);assert.equal(map.sourcesContent.length,entry.sources.length);map.sources.forEach((name,i)=>{assert.equal(name.replace(/^\.\.\/\.\.\/\.\.\//,''),entry.sources[i].path);assert.equal(sha(map.sourcesContent[i]),entry.sources[i].sha256);});
 if(['legacy-checkbox','legacy-chips','legacy-radio','legacy-slide-toggle','legacy-slider'].includes(symbol.family))verifyAttributeSourceTransition(symbol.family,map);
 const coreSource=readFileSync(join(context.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-core.mjs'),'utf8');assert.equal(coreSource.split(Function.prototype.toString.call(owned.getLegacyAnimationsState)).length,2);
 assert.equal(exports[symbol.name],Type);assert.equal(parameterType.name,p.owner);for(const selected of new Set([Type,parameterType])){const text=Function.prototype.toString.call(selected);assert.equal(source.split(text).length,2);}
 assert.equal(compiler.parameter_class_name,p.owner);assert.equal(metadata.length,p.arity+(symbol.family==='legacy-form-field'?1:0));assert.equal(compiler.parameters.length,metadata.length);assert.deepEqual(compiler.parameters[p.index],{index:p.index,token_expression:'@ngx-compat/material-legacy/legacy-core#LEGACY_ANIMATION_MODE',attribute:null,optional:true,self:false,skipSelf:false,host:false});
 assert.notEqual(owned.LEGACY_ANIMATION_MODE,core.ANIMATION_MODULE_TYPE);const m=metadata[p.index],inject=(m.decorators||[]).filter(x=>x.type===core.Inject);assert.equal(inject.length,1);assert.equal(inject[0].args.length,1);assert.equal(inject[0].args[0],owned.LEGACY_ANIMATION_MODE);assert.equal((m.decorators||[]).filter(x=>x.type===core.Optional).length,1);assert.ok(metadata.every(x=>!(x.decorators||[]).some(d=>d.type===core.Inject&&d.args?.[0]===core.ANIMATION_MODULE_TYPE)));
 return {symbol_id:symbol.symbol_id,artifact_sha256:subject.artifact_sha256,bundle_sha256:p.bundle,constructor_index:p.index,di_index:originalParameters.slice(0,p.index).filter(x=>!x.attribute).length,original_arity:p.arity,attributes:p.attributes,owned_token_distinct:true,old_token_absent_from_metadata:true};
}
export function captureAttributeOwnedMode(proof,capture,core,owned,layout,node,requests,runFactory){
 const p=profiles[proof?.symbol_id];assert.ok(p);assert.equal(capture?.constructor_calls,1);assert.equal(capture.inputs.length,p.arity+(proof.symbol_id.includes('/MatLegacyFormField')?1:0));assert.equal(capture.inputs[p.index],node.injector.get(owned.LEGACY_ANIMATION_MODE,null,{optional:true}));assert.ok(requests.every(r=>r.token!==core.ANIMATION_MODULE_TYPE));
 const modeControl=runFactory(()=>core.inject(owned.LEGACY_ANIMATION_MODE,{optional:true}),core.Injector,core.runInInjectionContext,{injector:node.injector});assert.equal(modeControl.outcome,'returned');assert.equal(modeControl.requests.length,1);assert.equal(modeControl.requests[0].token,owned.LEGACY_ANIMATION_MODE);assert.equal(modeControl.value,capture.inputs[p.index]);
 const policy=runFactory(()=>owned.getLegacyAnimationsState(),core.Injector,core.runInInjectionContext,{injector:node.injector});assert.equal(policy.outcome,'returned');assert.ok(['enabled','di-disabled','reduced-motion'].includes(policy.value));const roles=policy.requests.map(r=>{assert.ok(!r.unresolved);if(r.token===owned.LEGACY_ANIMATIONS_TEST_OVERRIDE)return 'override';if(r.token===owned.MATERIAL_ANIMATIONS)return 'material';if(r.token===owned.LEGACY_ANIMATION_MODE)return 'mode';if(r.token===layout.MediaMatcher)return 'media';throw Error('unexpected ambient policy request');});assert.ok([['override'],['override','material'],['override','material','mode'],['override','material','mode','media']].some(x=>isDeepStrictEqual(x,roles)));policy.requests.forEach((r,i)=>{assert.equal(Boolean(r.optional),roles[i]!=='media');for(const f of ['self','skipSelf','host'])assert.equal(Boolean(r[f]),false);});
 const value=capture.value,mode=capture.inputs[p.index];const modeKind=mode==='NoopAnimations'?'noop':mode===null?'absent':'other';const override=node.injector.get(owned.LEGACY_ANIMATIONS_TEST_OVERRIDE,null,{optional:true});assert.ok(override===null||['enabled','di-disabled','reduced-motion'].includes(override));const materialConfig=node.injector.get(owned.MATERIAL_ANIMATIONS,null,{optional:true}),materialDisabled=Boolean(materialConfig?.animationsDisabled);let reduced=false;try{reduced=Boolean(node.injector.get(layout.MediaMatcher).matchMedia('(prefers-reduced-motion)').matches);}catch{}const measured=override||(materialDisabled||modeKind==='noop'?'di-disabled':reduced?'reduced-motion':'enabled');assert.equal(policy.value,measured);let effective;
 if(proof.symbol_id.includes('/MatLegacyChip'))effective=value._animationsDisabled?'NoopAnimations':'enabled';
 else if(proof.symbol_id.includes('RadioButton')||proof.symbol_id.includes('SlideToggle'))effective=value._noopAnimations?'NoopAnimations':'enabled';
 else if(proof.symbol_id.includes('TabLink'))effective=value.rippleConfig.animation?.enterDuration===0&&value.rippleConfig.animation?.exitDuration===0?'NoopAnimations':'enabled';
 else if(proof.symbol_id.includes('FormField'))effective=value._animationsEnabled?'enabled':'NoopAnimations';
 else effective=value._animationMode==='NoopAnimations'?'NoopAnimations':'enabled';
 const expected=modeKind==='noop'||policy.value!=='enabled'?'NoopAnimations':'enabled';assert.equal(effective,expected);return {...proof,constructor_calls:1,stored_provider_input_identical:true,old_token_requested:false,provider_mode:modeKind,input_was_noop:mode==='NoopAnimations',policy_override:override,material_disabled:materialDisabled,reduced_motion:reduced,ambient_state:policy.value,policy_requests:roles,effective_mode:effective};
}
export function attributeOwnedModeReceiptProblems(receipt,symbol,{tarball}={}){const p=attributeOwnedModeProfile(symbol);if(!p)return [];if(sha(JSON.stringify(symbol.shape))!==p.shape)return ['owned attribute constructor-mode original shape differs'];let subject;try{subject=tarball&&qualifyCombinedArtifactSubject(readFileSync(tarball));if(!subject)return ['owned attribute constructor-mode artifact evidence incomplete'];}catch{return ['owned attribute constructor-mode artifact evidence incomplete'];}const expected={symbol_id:symbol.symbol_id,artifact_sha256:subject.artifact_sha256,bundle_sha256:p.bundle,constructor_index:p.index,di_index:p.index-p.attributes.filter(([i])=>i<p.index).length,original_arity:p.arity,attributes:p.attributes,owned_token_distinct:true,old_token_absent_from_metadata:true,constructor_calls:1,stored_provider_input_identical:true,old_token_requested:false,provider_mode:receipt?.provider_mode,input_was_noop:receipt?.input_was_noop,policy_override:receipt?.policy_override,material_disabled:receipt?.material_disabled,reduced_motion:receipt?.reduced_motion,ambient_state:receipt?.ambient_state,policy_requests:receipt?.policy_requests,effective_mode:receipt?.effective_mode};const roles=receipt?.policy_requests;return ['absent','noop','other'].includes(receipt?.provider_mode)&&receipt.input_was_noop===(receipt.provider_mode==='noop')&&(receipt.policy_override===null||['enabled','di-disabled','reduced-motion'].includes(receipt.policy_override))&&typeof receipt.material_disabled==='boolean'&&typeof receipt.reduced_motion==='boolean'&&receipt.ambient_state===(receipt.policy_override||(receipt.material_disabled||receipt.input_was_noop?'di-disabled':receipt.reduced_motion?'reduced-motion':'enabled'))&&Array.isArray(roles)&&isDeepStrictEqual(roles,receipt.policy_override?['override']:receipt.material_disabled?['override','material']:receipt.input_was_noop?['override','material','mode']:['override','material','mode','media'])&&receipt.effective_mode===(receipt.input_was_noop||receipt.ambient_state!=='enabled'?'NoopAnimations':'enabled')&&isDeepStrictEqual(receipt,expected)?[]:['owned attribute constructor-mode evidence incomplete'];}
