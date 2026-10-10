/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual Core and complete helper code; parent classes/borrowed services are protocols. */
import assert from 'node:assert/strict';
await import('@angular/compiler');
const core=await import('@angular/core');
const [line,mode]=process.argv.slice(2);
if(mode==='production')core.enableProdMode();
const cases=[];
for(let index=0;index<3;index++) {
  const {constructWithPublicDependencies:construct}=await import('./borrowed-helper-'+index+'.mjs');
  const check=(id,fn)=>{fn();cases.push({helper:index,id});};
  const token=new core.InjectionToken('borrowed'),other=new core.InjectionToken('borrowed'),missing=new core.InjectionToken('missing');
  const value={scope:'supplied'},providers=[{provide:token,useValue:value}];
  check('exact-borrowed-token-value-and-parent-target-identities',()=>{
    class Parent {value=core.inject(token);}
    class Child extends Parent {}
    const instance=construct(Parent,Child,providers);
    assert.equal(instance.value,value);assert.ok(instance instanceof Parent&&instance instanceof Child);
    assert.equal(Object.getPrototypeOf(instance),Child.prototype);
  });
  check('same-description-token-remains-distinct',()=>{
    class Parent {first=core.inject(token);second=core.inject(other);}
    const second={};const instance=construct(Parent,Parent,[...providers,{provide:other,useValue:second}]);
    assert.equal(instance.first,value);assert.equal(instance.second,second);
  });
  check('missing-optional-token-null-and-required-token-error',()=>{
    class Optional {value=core.inject(missing,{optional:true});}
    class Required {value=core.inject(missing);}
    assert.equal(construct(Optional,Optional,[]).value,null);
    assert.throws(()=>construct(Required,Required,[]),/No provider|NG0201/);
  });
  check('explicit-null-and-undefined-values-do-not-fall-through',()=>{
    class Parent {first=core.inject(token);second=core.inject(other);}
    const instance=construct(Parent,Parent,[{provide:token,useValue:undefined},{provide:other,useValue:null}]);
    assert.equal(instance.first,undefined);assert.equal(instance.second,null);
  });
  check('duplicate-supplied-token-retains-last-map-value',()=>{
    class Parent {value=core.inject(token);}
    const last={};assert.equal(construct(Parent,Parent,[...providers,{provide:token,useValue:last}]).value,last);
  });
  check('ambient-context-cannot-replace-manual-values-and-is-restored',()=>{
    const ambient=core.Injector.create({providers:[{provide:token,useValue:'ambient'}]});
    class Parent {value=core.inject(token);}
    try {core.runInInjectionContext(ambient,()=>{
      assert.equal(core.inject(token),'ambient');assert.equal(construct(Parent,Parent,providers).value,value);
      assert.equal(core.inject(token),'ambient');
    });}finally{ambient.destroy();}
    assert.throws(()=>core.inject(token),/NG0203|injection context/);
  });
  check('throwing-parent-restores-outer-context-and-does-not-own-values',()=>{
    let destroyed=0;const borrowed={ngOnDestroy(){destroyed++;}};
    const ambient=core.Injector.create({providers:[{provide:token,useValue:'ambient'}]});
    class Throws {constructor(){assert.equal(core.inject(token),borrowed);throw Error('controlled constructor failure');}}
    try {core.runInInjectionContext(ambient,()=>{
      assert.throws(()=>construct(Throws,Throws,[{provide:token,useValue:borrowed}]),/controlled constructor failure/);
      assert.equal(core.inject(token),'ambient');assert.equal(destroyed,0);
    });}finally{ambient.destroy();}
    assert.equal(destroyed,0);
  });
  check('parent-initializes-once-and-consumer-derived-fields-run',()=>{
    let initialized=0;
    class Parent {value=core.inject(token);constructor(){initialized++;}}
    class Legacy extends Parent {constructor(){return construct(Parent,new.target,providers);}}
    class Consumer extends Legacy {marker='consumer';}
    const instance=new Consumer();assert.equal(initialized,1);assert.equal(instance.marker,'consumer');
    assert.ok(instance instanceof Consumer&&instance instanceof Legacy&&instance instanceof Parent);
    assert.equal(instance.value,value);
  });
  check('hydrated-supplied-services-are-never-registered-for-destruction',()=>{
    let destroyed=0;const borrowed={ngOnDestroy(){destroyed++;}};
    class Parent {value=core.inject(token);}
    const instance=construct(Parent,Parent,[{provide:token,useValue:borrowed}]);
    assert.equal(instance.value,borrowed);assert.equal(destroyed,0);
  });
}
console.log(JSON.stringify({line,mode,cases,whole_helpers_executed:3,parent_and_service_values_are_protocols:true,
  actual_legacy_components_or_node_DI_executed:false,g11_claim:'not-passed'}));
