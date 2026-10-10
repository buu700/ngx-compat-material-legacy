/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public Core operations. Values/class-token fixtures are explicit protocols. */
import assert from 'node:assert/strict';
await import('@angular/compiler');
const core=await import('@angular/core');
const [line,mode]=process.argv.slice(2);assert.ok(['development','production'].includes(mode));
if(mode==='production')core.enableProdMode();
const cases=[],check=(id,run)=>{run();cases.push(id);};
const token=new core.InjectionToken('caller'),other=new core.InjectionToken('caller'),missing=new core.InjectionToken('missing');
const supplied={scope:'service'},user={scope:'view-container'},local={scope:'local-child'};
const parent=core.Injector.create({providers:[{provide:token,useValue:supplied}],name:'service-protocol'});
const userParent=core.Injector.create({providers:[{provide:token,useValue:user}],parent,name:'view-container-protocol'});
const child=core.Injector.create({providers:[{provide:other,useValue:local}],parent:userParent,name:'local-protocol'});
try{
 check('object-create-and-supplied-value-identity',()=>{assert.equal(parent.get(token),supplied);assert.equal(userParent.get(token),user);assert.equal(child.get(other),local);});
 check('public-injector-token-is-the-exact-receiver',()=>{assert.equal(parent.get(core.Injector),parent);assert.equal(child.get(core.Injector),child);});
 check('caller-view-container-parent-precedes-service-parent',()=>{assert.equal(child.get(token),user);const fallback=core.Injector.create({providers:[],parent});try{assert.equal(fallback.get(token),supplied);}finally{fallback.destroy();}});
 check('same-description-token-is-not-an-alias',()=>{assert.notEqual(token,other);assert.equal(child.get(other),local);assert.throws(()=>parent.get(other));});
 check('generic-get-fallback-required-and-object-optional',()=>{const fallback={};assert.equal(child.get(missing,fallback),fallback);assert.throws(()=>child.get(missing));assert.equal(child.get(missing,undefined,{optional:true}),null);});
 check('self-and-skip-self-use-object-options',()=>{assert.throws(()=>child.get(token,undefined,{self:true}));assert.equal(userParent.get(token,undefined,{skipSelf:true}),supplied);});
 check('class-token-get-is-a-cached-supplied-object',()=>{class Service{}const value={marker:'supplied service'};const injector=core.Injector.create({providers:[{provide:Service,useValue:value}]});try{assert.equal(injector.get(Service),value);assert.equal(injector.get(Service),value);}finally{injector.destroy();}});
 check('nested-public-context-restores-outer-injector',()=>{core.runInInjectionContext(parent,()=>{assert.equal(core.inject(token),supplied);core.runInInjectionContext(userParent,()=>assert.equal(core.inject(token),user));assert.equal(core.inject(token),supplied);});});
 check('throwing-context-restores-outer-and-clears-outside-context',()=>{core.runInInjectionContext(parent,()=>{assert.throws(()=>core.runInInjectionContext(userParent,()=>{throw Error('controlled nested failure');}),/controlled nested failure/);assert.equal(core.inject(token),supplied);});assert.throws(()=>core.inject(token),/NG0203|injection context/);});
 check('value-only-child-config-ref-and-data-identities',()=>{
  const configToken=new core.InjectionToken('config'),refToken=new core.InjectionToken('ref'),dataToken=new core.InjectionToken('data');
  const config={},ref={},data={};const first=core.Injector.create({providers:[{provide:configToken,useValue:config}],parent:userParent});
  const second=core.Injector.create({providers:[{provide:refToken,useValue:ref},{provide:dataToken,useValue:data}],parent:userParent});
  try{assert.equal(first.get(configToken),config);assert.equal(second.get(refToken),ref);assert.equal(second.get(dataToken),data);assert.equal(first.get(token),user);assert.equal(second.get(token),user);}
  finally{second.destroy();first.destroy();}
 });
 check('child-destroy-does-not-own-inherited-parent-values',()=>{let destroyed=0;const ownedToken=new core.InjectionToken('parent-owned'),value={ngOnDestroy(){destroyed++;}};
  const owner=core.Injector.create({providers:[{provide:ownedToken,useValue:value}]}),borrower=core.Injector.create({providers:[],parent:owner});
  try{assert.equal(borrower.get(ownedToken),value);borrower.destroy();assert.equal(destroyed,0);assert.equal(owner.get(ownedToken),value);}
  finally{owner.destroy();}assert.equal(destroyed,1);
 });
 check('destroying-locally-registered-useValue-invokes-its-hook',()=>{let destroyed=0;const ownedToken=new core.InjectionToken('local-value'),value={ngOnDestroy(){destroyed++;}};
  const injector=core.Injector.create({providers:[{provide:ownedToken,useValue:value}]});assert.equal(injector.get(ownedToken),value);assert.equal(destroyed,0);injector.destroy();assert.equal(destroyed,1);
 });
 console.log(JSON.stringify({line,mode,cases,whole_public_core_executed:true,values_and_class_targets_are_protocols:true,actual_legacy_components_executed:false,automatic_application_or_node_di_qualified:false}));
}finally{child.destroy();userParent.destroy();parent.destroy();}
