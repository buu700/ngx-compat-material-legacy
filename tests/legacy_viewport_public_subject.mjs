/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observations} from './legacy_viewport_observations.mjs';
const typeMetadata = new WeakMap();
Reflect.metadata = (key,value) => target => {
  const record=typeMetadata.get(target)||new Map(); record.set(key,value); typeMetadata.set(target,record);
};
Reflect.getOwnMetadata = (key,target) => typeMetadata.get(target)?.get(key);
const [line, mode, production] = process.argv.slice(2);
if (production === 'true') globalThis.ngDevMode = false;
if (mode === 'zoneful') await import('zone.js/node');
await import('@angular/compiler');
const core = await import('@angular/core'), common = await import('@angular/common');
const browser = await import('@angular/platform-browser'), platform = await import('@angular/cdk/platform');
const rxjs = await import('rxjs'), operators = await import('rxjs/operators');
const registrations = [], removals = [], listeners = new Map();
const windowProtocol = {innerWidth:640, innerHeight:480,
  addEventListener(name,listener) {registrations.push({name,inside:core.NgZone.isInAngularZone()});listeners.set(name,listener);},
  removeEventListener(name,listener) {assert.equal(listeners.get(name),listener);listeners.delete(name);removals.push(name);}};
const documentProtocol = {defaultView:windowProtocol, head:{children:[]}, body:{scrollTop:0,scrollLeft:0},
  documentElement:{getBoundingClientRect:()=>({top:0,left:0})}};
globalThis.window = windowProtocol; globalThis.document = documentProtocol;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Viewport protocol'}});
let app, zone;
if (line === 'original') zone = new core.NgZone({enableLongStackTrace:false});
else {
  app = await browser.createApplication({providers:[core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
    {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
    {provide:core.DOCUMENT,useValue:documentProtocol}, {provide:core.PLATFORM_ID,useValue:'browser'},
    {provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}}]});
  zone = app.injector.get(core.NgZone);
}
const pi = core.Injector.create({providers:[{provide:core.PLATFORM_ID,useValue:'browser'}]});
const si = core.Injector.create({providers:[{provide:core.PLATFORM_ID,useValue:'server'}]});
const makePlatform = isBrowser => line==='original' ? new platform.Platform(isBrowser?'browser':'server')
  : core.runInInjectionContext(isBrowser?pi:si,()=>new platform.Platform());
const payload = JSON.parse(readFileSync(new URL('./legacy-viewport-public-payload.json',import.meta.url)));
function load(emitted, symbol) {
  const exports = {}, dependencies = {'@angular/core':{...core,DOCUMENT:core.DOCUMENT||common.DOCUMENT},'@angular/common':{...common,DOCUMENT:core.DOCUMENT||common.DOCUMENT},
    '@angular/cdk/platform':platform,rxjs,'rxjs/operators':operators};
  new Function('exports','require',emitted)(exports,spec=>{assert.ok(dependencies[spec],spec);return dependencies[spec];});
  return exports[symbol];
}
const candidateType = load(payload.source,'_LegacyViewport');
const environment = {zone, isInAngularZone:core.NgZone.isInAngularZone, platform:makePlatform};
const cases = [], mutations = [];
try {
  const original = await observations(load(payload.reference,'ViewportRuler'),environment);
  assert.ok(original.every(c=>c.result==='pass'),JSON.stringify(original.filter(c=>c.result==='fail')));
  const candidate = await observations(candidateType,environment);
  assert.deepEqual(candidate,original);
  cases.push(...candidate.map(c=>c.id));
  // Actual emitted decorator metadata drives the genuine Angular JIT factory.
  // The original16 Core token route aliases only DOCUMENT from public Common.
  assert.equal(candidateType.ɵprov.providedIn,'root');
  assert.deepEqual(Reflect.getOwnMetadata('design:paramtypes',candidateType),[platform.Platform,core.NgZone,Object]);
  const providers = [{provide:platform.Platform,useValue:makePlatform(true)}, {provide:core.NgZone,useValue:zone},
    {provide:core.DOCUMENT||common.DOCUMENT,useValue:documentProtocol}, candidateType];
  const parent = app?.injector || core.Injector.NULL;
  const root = app?.injector || core.createEnvironmentInjector(providers,parent);
  const children = [core.createEnvironmentInjector([],root),core.createEnvironmentInjector([],root)];
  const listenerBaseline = new Set(listeners.keys());
  const registrationStart = registrations.length, removalStart = removals.length;
  const owned = zone.run(()=>root.get(candidateType));
  assert.equal(children[0].get(candidateType),owned);assert.equal(children[1].get(candidateType),owned);
  assert.deepEqual(registrations.slice(registrationStart),[{name:'resize',inside:false},{name:'orientationchange',inside:false}]);
  let completes = 0; owned.change(0).subscribe({complete:()=>completes++});
  children.forEach(c=>c.destroy());assert.equal(completes,0);assert.equal(listeners.size,listenerBaseline.size+2);
  if(app){app.destroy();app=null;}else root.destroy();
  assert.equal(completes,1);assert.deepEqual(new Set(listeners.keys()),listenerBaseline);
  assert.deepEqual(removals.slice(removalStart),['resize','orientationchange']);
  cases.push('genuine-environment-injector-shared-owner-and-child-root-teardown');
  for(const [id,text] of Object.entries(payload.mutations)) {
    if(id==='insideZone' && mode==='zoneless')continue;
    const changed = await observations(load(text,'_LegacyViewport'),environment);
    assert.notDeepEqual(changed,original,id+' escaped');
    mutations.push({id,failed_cases:changed.filter((c,i)=>JSON.stringify(c)!==JSON.stringify(original[i])).map(c=>c.id)});
  }
  console.log(JSON.stringify({line,mode,production:production==='true',cases,mutations,original,candidate,
    genuine_public_zone_platform_and_environment_injectors:true,root_provided_in_registration_exercised:line!=='original',
    packed_generated_DI_or_native_DOM_qualified:false}));
} finally {pi.destroy();si.destroy();app?.destroy();if(line!=='original')core.destroyPlatform();}
