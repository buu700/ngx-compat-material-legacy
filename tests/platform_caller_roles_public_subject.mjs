/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public service resolution in an isolated peer process; no application. */
import assert from 'node:assert/strict';
import '@angular/compiler';
import {Injector,PLATFORM_ID,inject,runInInjectionContext} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
const states=[['browser','browser'],['server','server'],['empty',''],['undefined',undefined],['null',null],['false',false]],cases=[];
Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Platform public boundary probe'}});
for(const present of [false,true])for(const [id,value]of states){
 Object.defineProperty(globalThis,'document',{configurable:true,value:present?{}:undefined});
 const injector=Injector.create({providers:[Platform,{provide:PLATFORM_ID,useValue:value}]});
 const platform=injector.get(Platform),same=injector.get(Platform),optional=runInInjectionContext(injector,()=>inject(Platform,{optional:true}));
 assert.equal(platform instanceof Platform,true);assert.equal(same,platform);assert.equal(optional,platform);assert.equal(typeof platform.isBrowser,'boolean');
 cases.push({id:id+':'+(present?'DOM':'no-DOM'),isBrowser:platform.isBrowser,same_public_token_instance:true,optional_inject_identity:true});
}
const empty=Injector.create({providers:[{provide:Platform,useValue:null}]});
assert.equal(empty.get(Platform,null),null);assert.equal(runInInjectionContext(empty,()=>inject(Platform,{optional:true})),null);
cases.push({id:'explicit-null-public-provider',optional_value:null});
console.log(JSON.stringify({cases,public_service_factory_only:true,explicit_Platform_constructor_calls:0,app_component_zone_or_native_executed:false,actual_packed_or_floor_qualified:false}));
