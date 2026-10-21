/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Published/reference token identities and manual historical leaf constructors. */
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const line=process.argv[2],mode=process.argv[3]??'development';
await import('@angular/compiler');
const core=await import('@angular/core');
if(mode==='production')core.enableProdMode();
const peer=await import('@angular/material/form-field');
const original=line==='original',owned=original?await import('@angular/material/legacy-form-field'):
  await import(pathToFileURL(join(process.cwd(),'projects/ngx-material-legacy/legacy-form-field/public-api.mjs')));
const cases=[],tokens=[],leaf=[];
const names=['FORM_FIELD','ERROR','PREFIX','SUFFIX'];
for(const [index,name] of names.entries()) {
  const legacy=owned['MAT_LEGACY_'+name],modern=peer['MAT_'+name];
  assert.ok(legacy instanceof core.InjectionToken);assert.ok(modern instanceof core.InjectionToken);
  assert.equal(legacy===modern,original,'legacy token isolation '+name);
  for(const previous of tokens)assert.notEqual(legacy,owned['MAT_LEGACY_'+previous.name]);
  cases.push(name+':export-identity');
  const description=legacy.toString().replace(/^InjectionToken /,''),lookalike=new core.InjectionToken(description);
  assert.equal(lookalike.toString(),legacy.toString());assert.notEqual(lookalike,legacy);
  const empty=core.Injector.create({providers:[{provide:lookalike,useValue:'imposter'}]});
  assert.equal(empty.get(legacy,null),null);cases.push(name+':same-description-miss');
  assert.equal(core.runInInjectionContext(empty,()=>core.inject(legacy,{optional:true})),null);cases.push(name+':optional-missing');empty.destroy();
  const providers=[{provide:legacy,useValue:'legacy:'+index}];
  if(!original)providers.push({provide:modern,useValue:'modern:'+index});
  const parent=core.Injector.create({providers});
  assert.equal(parent.get(legacy),'legacy:'+index);cases.push(name+':exact-provider');
  assert.equal(parent.get(modern),(original?'legacy:':'modern:')+index);cases.push(name+':modern-coexistence');
  const child=core.Injector.create({providers:[{provide:legacy,useValue:'nearest:'+index}],parent});
  assert.equal(core.runInInjectionContext(child,()=>core.inject(legacy)),'nearest:'+index);
  assert.equal(core.runInInjectionContext(child,()=>core.inject(legacy,{skipSelf:true})),'legacy:'+index);
  assert.equal(child.get(modern),(original?'nearest:':'modern:')+index);cases.push(name+':nearest-and-skipSelf');
  child.destroy();parent.destroy();
  tokens.push({name,legacy_same_as_modern:legacy===modern,exact_provider:true,lookalike_missing:true,nearest_and_skipSelf:true,modern_isolation:!original});
}
assert.equal(owned.MatLegacyFormFieldControl,peer.MatFormFieldControl);cases.push('control:public-query-provider-class-alias');
assert.deepEqual(Object.keys(new owned.MatLegacyPrefix()),[]);cases.push('prefix:manual-construction');
assert.deepEqual(Object.keys(new owned.MatLegacySuffix()),[]);cases.push('suffix:manual-construction');
for(const ariaLive of [undefined,null,'','assertive','off']) {
  const attributes=new Map(ariaLive?[['aria-live',ariaLive]]:[]),calls=[];
  const node={setAttribute:(name,value)=>{calls.push([name,value]);attributes.set(name,value);}},element=new core.ElementRef(node);
  const error=new owned.MatLegacyError(ariaLive,element),expected=ariaLive||'polite';
  assert.equal(attributes.get('aria-live'),expected);assert.deepEqual(calls,ariaLive?[]:[['aria-live','polite']]);
  assert.equal(error.id,'mat-error-'+leaf.length);
  leaf.push({input:ariaLive===undefined?'undefined':ariaLive,id:error.id,aria_live:attributes.get('aria-live'),calls});cases.push('error:aria-live:'+String(ariaLive));
}
assert.equal(cases.length,32);
console.log(JSON.stringify({line,mode,Core:core.VERSION.full,cases,tokens,observations:{prefix_keys:[],suffix_keys:[],leaf},
  token_identity_difference_is_intentional_owned_legacy_isolation:true,control_public_alias:true,
  real_public_injector_executed:true,template_or_actual_native_query_provider_matching_executed:false,
  error_element_is_borrowed_attribute_protocol:true,owned_form_field_AOT_factory_executed:false,
  actual_native_packed_AOT_or_full_floor_qualified:false}));
