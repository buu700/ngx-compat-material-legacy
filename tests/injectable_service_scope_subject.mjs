/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import '@angular/compiler';
import {Injectable,NgModule,InjectionToken,inject,createEnvironmentInjector,importProvidersFrom} from '@angular/core';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {line,variant}=JSON.parse(readFileSync(new URL('./injectable-scope-input.json',import.meta.url)));
const observations=[],dep=new InjectionToken('dependency'),missing=new InjectionToken('missing');
function fixture(legacy){
 let created=0,destroyed=0;
 class Service {
  parent=inject(Service,{optional:true,skipSelf:true});
  dependency=inject(dep);
  serial=++created;
  ngOnDestroy(){destroyed++;}
 }
 class Module {}
 Injectable(legacy?{providedIn:Module}:{})(Service);
 NgModule({providers:[{provide:dep,useValue:'module'},...(!legacy&&variant!=='missing-provider'?[Service]:[])]})(Module);
 const blank=createEnvironmentInjector([]),root=createEnvironmentInjector([importProvidersFrom(Module)],blank);
 assert.equal(blank.get(Service,null),null,'module-free injector must not own service');
 const rootService=root.get(Service);assert.equal(root.get(Service),rootService,'module singleton');assert.equal(rootService.parent,null);
 assert.equal(rootService.dependency,'module');
 const inherited=createEnvironmentInjector([],root);assert.equal(inherited.get(Service),rootService);
 const eagerModule=createEnvironmentInjector([importProvidersFrom(Module),...(!legacy&&variant==='reuse-parent'?[{provide:Service,useFactory:()=>inject(Service,{skipSelf:true})}]:[])],root),child=eagerModule.get(Service);assert.notEqual(child,rootService);assert.equal(child.parent,rootService);
 const deep=createEnvironmentInjector([importProvidersFrom(Module)],eagerModule),nested=deep.get(Service);assert.notEqual(nested,child);assert.equal(nested.parent,child);
 const overrideValue={override:true},override=createEnvironmentInjector([importProvidersFrom(Module),{provide:Service,useValue:overrideValue}],root);assert.equal(override.get(Service),overrideValue);
 const factory=createEnvironmentInjector([importProvidersFrom(Module),{provide:Service,useFactory:()=>overrideValue}],root);assert.equal(factory.get(Service),overrideValue);
 assert.equal(root.get(missing,null),null);
 inherited.destroy();assert.equal(destroyed,0,'inheriting scope must not destroy parent');deep.destroy();assert.equal(destroyed,1);assert.equal(root.get(Service),rootService);eagerModule.destroy();assert.equal(destroyed,2);root.destroy();assert.equal(destroyed,3);override.destroy();factory.destroy();blank.destroy();
 return {created,destroyed,child_delegation:true,module_absence:true,local_overrides:true,singleton:true};
}
const original=fixture(true),candidate=fixture(false);assert.deepEqual(candidate,original);observations.push('original-module-association-and-explicit-provider-have-equal-scope-lifetimes');
class ExplicitOnly {} Injectable()(ExplicitOnly);const i=createEnvironmentInjector([{provide:ExplicitOnly,useClass:ExplicitOnly}]);assert.ok(i.get(ExplicitOnly) instanceof ExplicitOnly);i.destroy();observations.push('no-automatic-provider-remains-explicit');
console.log(JSON.stringify({line,observations,original,candidate,scope:'Genuine public injector/NgModule/Injectable factories and explicit service constructor protocols. Full owned service/overlay/native/AOT/packed/floor behavior is separate.'}));
