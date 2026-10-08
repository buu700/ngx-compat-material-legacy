/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createPublicFactoryContext} from './api-public-node-context.mjs';

const flags=['optional','self','skipSelf','host'];
const cells=[
 {id:'default',providers:[],disabled:false},
 {id:'global-options',options:{disabled:true,animation:{enterDuration:31,exitDuration:47},terminateOnPointerUp:true},disabled:false},
 {id:'material-disabled',material:true,disabled:true},
 {id:'noop-module',module:'NoopAnimations',disabled:true},
 {id:'shared-public-media-cache',reduced:true,disabled:null},
];
const sameRequests=(a,b)=>a.length===b.length&&a.every((request,index)=>request.token===b[index].token
 &&!request.unresolved&&!b[index].unresolved&&flags.every(flag=>Boolean(request[flag])===Boolean(b[index][flag])));

/** Genuine public parent and unchanged owned factory execute in real public Angular node/root contexts. */
export async function observeRippleFactory(Type,loaded,importModule,runFactory){
 const core=await importModule('@angular/core'),peer=await importModule('@angular/material/core'),layout=await importModule('@angular/cdk/layout');
 const comparison=[],behaviorProblems=[],counts={manualRejects:0,subclass:0,borrowedDestroyed:0,teardown:0};
 let primary;
 assert.equal(Type,peer.MatRipple,'shared public ripple identity differs');
 assert.equal(loaded.MatLegacyRippleModule,peer.MatRippleModule,'shared public ripple module identity differs');
 assert.equal(loaded.MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS,peer.MAT_RIPPLE_GLOBAL_OPTIONS,'shared public ripple configuration token differs');
 for(const cell of cells){
  let parentFixture,ownedFixture,parent,owned,priming;
  try{
   const providers=[core.importProvidersFrom(loaded.MatLegacyRippleModule),
    ...(cell.options?[{provide:peer.MAT_RIPPLE_GLOBAL_OPTIONS,useValue:cell.options}]:[]),
    ...(cell.material?[{provide:peer.MATERIAL_ANIMATIONS,useValue:{animationsDisabled:true}}]:[]),
    ...(cell.module?[{provide:core.ANIMATION_MODULE_TYPE,useValue:cell.module}]:[]),
    ...(cell.reduced?[{provide:layout.MediaMatcher,useValue:{matchMedia(query){assert.equal(query,'(prefers-reduced-motion)');return {matches:true};}}}]:[]),
   ];
   parentFixture=await createPublicFactoryContext(core,importModule,{providers});
   ownedFixture=await createPublicFactoryContext(core,importModule,{providers});
   // Current public MatRipple shares its first media measurement. Establish the
   // public control's cache before comparing two actual warm constructions. The
   // priming construction remains complete evidence; no request is discarded.
   priming=runFactory(()=>new peer.MatRipple(),core.Injector,core.runInInjectionContext,{injector:parentFixture.element.injector});
   assert.equal(priming.outcome,'returned',priming.error);
   const canonical=[core.ElementRef,peer.MATERIAL_ANIMATIONS,...(cell.material?[]:[core.ANIMATION_MODULE_TYPE]),
    ...(priming.requests.some(r=>r.token===layout.MediaMatcher)?[layout.MediaMatcher]:[]),
    core.NgZone,(await importModule('@angular/cdk/platform')).Platform,peer.MAT_RIPPLE_GLOBAL_OPTIONS,core.Injector];
   assert.equal(priming.requests.length,canonical.length);
   priming.requests.forEach((r,index)=>{assert.equal(r.token,canonical[index]);assert.equal(Boolean(r.optional),
    [peer.MATERIAL_ANIMATIONS,core.ANIMATION_MODULE_TYPE,peer.MAT_RIPPLE_GLOBAL_OPTIONS].includes(r.token));
    assert.equal(Boolean(r.self||r.skipSelf||r.host||r.unresolved),false);});
   parent=runFactory(()=>new peer.MatRipple(),core.Injector,core.runInInjectionContext,{injector:parentFixture.element.injector});
   owned=runFactory(Type.ɵfac,core.Injector,core.runInInjectionContext,{injector:ownedFixture.element.injector});
   if(cell.id==='default')primary=owned;
   assert.equal(parent.outcome,'returned',parent.error);assert.equal(owned.outcome,'returned',owned.error);
   assert.ok(owned.value instanceof Type&&owned.value instanceof peer.MatRipple);
   assert.ok(sameRequests(parent.requests,owned.requests),'actual token objects/options/control sequence differs');
   const parentConfig=parent.value.rippleConfig,ownedConfig=owned.value.rippleConfig;
   assert.deepEqual(ownedConfig,parentConfig);
   const motionDisabled=parentConfig.animation.enterDuration===0&&parentConfig.animation.exitDuration===0;
   if(cell.disabled!==null&&cell.disabled)assert.equal(motionDisabled,true);
   assert.equal(ownedConfig.animation.enterDuration===0&&ownedConfig.animation.exitDuration===0,motionDisabled);
   if(cell.options){assert.equal(owned.value.rippleDisabled,true);assert.equal(ownedConfig.terminateOnPointerUp,true);}
   owned.value.color='rgb(11,22,33)';assert.equal(owned.value.rippleConfig.color,'rgb(11,22,33)');
   owned.value.color='';assert.equal(owned.value.rippleConfig.color,'');
   owned.value.color=undefined;assert.equal(owned.value.rippleConfig.color,undefined);
   owned.value.animation={enterDuration:5,exitDuration:9};assert.deepEqual(owned.value.rippleConfig.animation,{enterDuration:5,exitDuration:9});
   owned.value.centered=true;owned.value.radius=17;assert.equal(owned.value.rippleConfig.centered,true);assert.equal(owned.value.rippleConfig.radius,17);
   const trigger=ownedFixture.document.createElement('button');owned.value.trigger=trigger;assert.equal(owned.value.trigger,trigger);
   owned.value.ngOnInit();owned.value.disabled=true;assert.equal(owned.value.disabled,true);owned.value.disabled=false;assert.equal(owned.value.disabled,false);
   if(cell.id==='default'){
    const injector=ownedFixture.element.injector;
    assert.equal(Type.length,0,'public constructor is not zero-argument');
    assert.throws(()=>new Type(),/NG0203|injection context/);
    class ConsumerRipple extends Type{marker='consumer';}
    const child=core.runInInjectionContext(injector,()=>new ConsumerRipple());assert.ok(child instanceof peer.MatRipple);assert.equal(child.marker,'consumer');
    child.ngOnInit();child.ngOnDestroy();counts.subclass++;
   }
   const ident=token=>token===core.ElementRef?'ElementRef':token===peer.MATERIAL_ANIMATIONS?'MATERIAL_ANIMATIONS'
    :token===core.ANIMATION_MODULE_TYPE?'ANIMATION_MODULE_TYPE':token===layout.MediaMatcher?'MediaMatcher'
    :token===core.NgZone?'NgZone':token===peer.MAT_RIPPLE_GLOBAL_OPTIONS?'MAT_RIPPLE_GLOBAL_OPTIONS'
    :token===core.Injector?'Injector':'Platform';
   comparison.push({context:cell.id,parent_outcome:parent.outcome,owned_outcome:owned.outcome,
    request_count:owned.requests.length,token_objects_equal:true,options_equal:true,shared_public_identity:true,
    configuration_equal:true,public_color_inputs_verified:true,
    motion_disabled:motionDisabled,public_motion_equal:true,priming_outcome:priming.outcome,
    media_measurement_requested:priming.requests.some(r=>r.token===layout.MediaMatcher),
    priming_requests:priming.requests.map((r,index)=>({ident:ident(canonical[index]),identity_matched:r.token===canonical[index],optional:Boolean(r.optional),self:Boolean(r.self),skipSelf:Boolean(r.skipSelf),host:Boolean(r.host),unresolved:Boolean(r.unresolved)})),
    public_inputs_verified:true,public_trigger_verified:true,owned_teardown:false,borrowed_alive:false});
   priming.value.ngOnDestroy();priming=null;parent.value.ngOnDestroy();parent=null;owned.value.ngOnDestroy();owned=null;counts.teardown+=3;
   assert.equal(ownedFixture.component.hostView.destroyed,false);assert.equal(ownedFixture.environment.destroyed,false);
   assert.equal(parentFixture.component.hostView.destroyed,false);assert.equal(parentFixture.environment.destroyed,false);
   assert.equal(ownedFixture.element.destroyed,false);assert.equal(parentFixture.element.destroyed,false);
   comparison.at(-1).owned_teardown=true;comparison.at(-1).borrowed_alive=true;
  }catch(error){behaviorProblems.push(cell.id+': '+String(error.message));}
  finally{
   try{priming?.value?.ngOnDestroy();parent?.value?.ngOnDestroy();owned?.value?.ngOnDestroy();parentFixture?.close();ownedFixture?.close();}
   catch(error){behaviorProblems.push(cell.id+' cleanup: '+String(error.message));}
  }
 }
 return {...(primary||{requests:[],outcome:'threw',error:'missing default ripple execution'}),behaviorProblems,counts,parentComparison:comparison,
  context:'actual owned ripple factory and independent public MatRipple on genuine Angular nodes/root providers; synthetic rendering, native/packed/floors separate'};
}

export function rippleFactoryObservationProblems(row,contract){
 const x=row.approved_construction,problems=[];
 if(!x||x.profile_id!==contract.profile_id||x.contract_sha256!==contract.contract_sha256
  ||row.factory_outcome!=='returned'||row.factory_returned_owned_instance!==true
  ||!Array.isArray(x.behavior_problems)||x.behavior_problems.length
  ||x.counts?.manualRejects!==0||x.counts.subclass!==1||x.counts.borrowedDestroyed!==0||x.counts.teardown!==15)
  return ['ripple public-parent construction/control evidence incomplete'];
 if(!Array.isArray(x.parent_comparison)||x.parent_comparison.length!==cells.length||cells.some((cell,index)=>{
  const actual=x.parent_comparison[index];
  if(!actual||typeof actual.media_measurement_requested!=='boolean'||cell.material&&actual.media_measurement_requested||cell.module&&actual.media_measurement_requested)return true;
  const primingNames=['ElementRef','MATERIAL_ANIMATIONS',...(cell.material?[]:['ANIMATION_MODULE_TYPE']),
   ...(actual.media_measurement_requested?['MediaMatcher']:[]),'NgZone','Platform','MAT_RIPPLE_GLOBAL_OPTIONS','Injector'];
  return actual.context!==cell.id||actual.parent_outcome!=='returned'||actual.owned_outcome!=='returned'
   ||actual.request_count!==(cell.material?6:7)
   ||['token_objects_equal','options_equal','shared_public_identity','configuration_equal','public_color_inputs_verified',
    'public_inputs_verified','public_trigger_verified','owned_teardown','borrowed_alive','public_motion_equal'].some(key=>actual[key]!==true)
   ||typeof actual.motion_disabled!=='boolean'||cell.disabled===true&&actual.motion_disabled!==true
   ||actual.priming_outcome!=='returned'||!Array.isArray(actual.priming_requests)||actual.priming_requests.length!==primingNames.length
   ||actual.priming_requests.some((r,index)=>r.ident!==primingNames[index]||r.identity_matched!==true||r.unresolved!==false
    ||r.self!==false||r.skipSelf!==false||r.host!==false||r.optional!==['MATERIAL_ANIMATIONS','ANIMATION_MODULE_TYPE','MAT_RIPPLE_GLOBAL_OPTIONS'].includes(r.ident));
 }))problems.push('ripple public-parent motion/configuration/lifetime cells incomplete');
 if(row.observed.length!==contract.runtime_requests.length||row.runtime_requests?.length!==contract.runtime_requests.length
  ||row.runtime_requests.some((request,index)=>request.identity_matched!==true||request.unresolved!==false
   ||flags.some(flag=>request[flag]!==Boolean(contract.runtime_requests[index][flag]))))problems.push('ripple actual token identity/options incomplete');
 return problems;
}
