/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete construction phases; genuine zones, explicit parent/service protocols. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [line,mode,production]=process.argv.slice(2);
if(production==='true')globalThis.ngDevMode=false;
if(mode==='zoneful')await import('zone.js/node');
await import('@angular/compiler');
const core=await import('@angular/core');
const payload=JSON.parse(readFileSync(new URL('./ng-zone-forwarding-payload.json',import.meta.url)));
let app,zone;
if(line==='original')zone=new core.NgZone({enableLongStackTrace:false});
else {
  const common=await import('@angular/common'),browser=await import('@angular/platform-browser');
  app=await browser.createApplication({providers:[
    core[mode==='zoneful'?'provideZoneChangeDetection':'provideZonelessChangeDetection'](),
    {provide:common.IMAGE_CONFIG,useValue:{disableImageSizeWarning:true,disableImageLazyLoadWarning:true}},
    {provide:core.DOCUMENT,useValue:{head:{children:[]}}},
    {provide:core.RendererFactory2,useValue:{createRenderer:()=>({})}},
  ]});
  zone=app.injector.get(core.NgZone);
  if(mode==='zoneless')assert.equal(typeof globalThis.Zone,'undefined');
}
class Parent {
  constructor(...args){this.capturedArgs=args;}
}
class LegacyTooltipComponentProtocol {}
class RippleRendererProtocol {
  constructor(...args){this.args=args;this.setups=[];}
  setupTriggerEvents(target){this.setups.push(target);}
}
const load=(text,name)=>new Function('Parent','LegacyTooltipComponent','RippleRenderer',text+'\nreturn '+name+';')
  (Parent,LegacyTooltipComponentProtocol,RippleRendererProtocol);
const forwarded=(row,value)=>row.target==='super'?value.capturedArgs:value._tabLinkRipple.args;
const cases=[],mutations=[];
try {
  for(const row of payload) {
    const args=Array.from({length:row.parameterCount},(_,index)=>Object.freeze({index,role:'constructor-service-protocol'}));
    for(const[index,name]of row.parameterNames.entries()) {
      if(name==='elementRef')args[index]=new core.ElementRef(Object.freeze({role:'host-protocol'}));
      if(name==='tabIndex')args[index]='3';
      if(name==='animationMode')args[index]='NoopAnimations';
    }
    args[row.zoneIndex]=zone;
    const Old=load(row.original,row.name),Current=load(row.current,row.name),old=new Old(...args),current=new Current(...args);
    assert.ok(forwarded(row,old)[row.parentZoneIndex]===zone,'original forwards caller zone identity');
    assert.ok(forwarded(row,current)[row.parentZoneIndex]===zone,'current forwards caller zone identity');
    assert.equal(current.capturedArgs.length,old.capturedArgs.length,'complete parent argument count');
    current.capturedArgs.forEach((value,index)=>assert.ok(value===old.capturedArgs[index],
      'every parent argument retains original identity/value'));
    const fields=Object.keys(old).filter(key=>key!=='capturedArgs').sort();
    assert.deepEqual(Object.keys(current).filter(key=>key!=='capturedArgs').sort(),fields);
    for(const field of fields) {
      if(field==='_tabLinkRipple') {
        assert.ok(current[field] instanceof RippleRendererProtocol&&old[field] instanceof RippleRendererProtocol);
        assert.ok(current[field].args[0]===current&&old[field].args[0]===old,'renderer owns matching leaf');
        assert.equal(current[field].args.length,old[field].args.length);
        current[field].args.slice(1).forEach((value,index)=>assert.ok(value===old[field].args[index+1]));
        const element=args[row.parameterNames.indexOf('elementRef')].nativeElement;
        assert.equal(current[field].setups.length,1);assert.equal(old[field].setups.length,1);
        assert.ok(current[field].setups[0]===element&&old[field].setups[0]===element);
      }else assert.deepEqual(current[field],old[field],'historical field initialization: '+field);
    }
    cases.push({file:row.file,original_and_current_construction_phase:'pass',same_zone_forwarded:true,
      complete_argument_and_field_initialization:'pass'});
    for(const [id,text]of Object.entries(row.mutations)) {
      const Mutated=load(text,row.name),value=new Mutated(...args);
      const got=forwarded(row,value),expected=forwarded(row,old);
      assert.ok(got.length!==expected.length||got.some((arg,index)=>
        index!==0||row.target==='super'?arg!==expected[index]:arg!==value),
        'forwarding mutant must be detected');
      mutations.push({file:row.file,id,result:'rejected'});
    }
  }
  assert.equal(cases.length,8);assert.equal(mutations.length,24);
  console.log(JSON.stringify({cases,mutations,genuine_public_zone:true,
    zoneless_public_provider_used:mode==='zoneless',parent_and_other_services_protocols:true,
    owned_or_original_ripple_renderer_executed:false,
    actual_legacy_component_or_factory_or_node_DI_executed:false,native_or_packed_qualified:false}));
}finally{app?.destroy();if(app)core.destroyPlatform();}
