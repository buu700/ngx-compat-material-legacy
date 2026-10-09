"""Finite caller configs retain original metadata, exact inputs, scopes and borrowed lifetime."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
PRELUDE = r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {callerConfigProfile,createCallerConfigContext,observeCallerConfigInputs,callerConfigLifetimeEvidence,callerConfigObservationProblems} from './scripts/api-caller-config-context.mjs';
const symbols=[['legacy-dialog','MatLegacyDialogContainer','dialog-container'],['legacy-dialog','_MatLegacyDialogContainerBase','public-api'],['legacy-snack-bar','MatLegacySnackBarContainer','snack-bar-container'],['legacy-snack-bar','_MatLegacySnackBarContainerBase','public-api']].map(([family,name,file])=>{
 const originalFamily=name.startsWith('_MatLegacy')?family.replace('legacy-',''):family;
 const originalName=name.startsWith('_MatLegacy')?name.replace('Legacy',''):name;
 const originalFactory=originalFactoryContract('/original/src/material/'+originalFamily+'/'+file+'.ts',originalName);
 return {symbol_id:family+'/primary/'+name,family,name,kind:'primary',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
});
'''
class CallerConfigContextTests(unittest.TestCase):
    def probe(self, code):
        result = subprocess.run(['node','--input-type=module','-e',PRELUDE+code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-8000:])

    def test_exact_original_profiles_and_public_config_tokens_cannot_resolve_through_owned_aliases(self):
        self.probe(r'''
import {originalPublicParentTokenRole} from './scripts/api-public-parent-token-role.mjs';
import {expectedFactoryDi,runtimeTokenIdentity} from './scripts/api-di-observe.mjs';
let rejected=0,publicRoles=0;
for(const symbol of symbols){
 const profile=callerConfigProfile(symbol);assert.ok(profile);
 for(const change of [s=>s.name='Other',s=>s.family='Other',s=>s.kind='testing',s=>s.shape.originalFactory.declaration+=' ',s=>s.shape.originalFactoryContext.parameter_factory_key='foreign',s=>s.shape.originalFactoryContext.factory_parameters[profile.parameter_index].optional=true,s=>s.shape.originalFactoryContext.factory_parameters[profile.parameter_index].self=true,s=>s.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){
  const bad=structuredClone(symbol);change(bad);assert.throws(()=>callerConfigProfile(bad));rejected++;
 }
 const param=expectedFactoryDi(symbol.shape)[profile.parameter_index],role=originalPublicParentTokenRole(symbol,param);
 if(role){
  publicRoles++;class Public{}class Owned extends Public{}class Twin{}
  const load=async spec=>{assert.equal(spec,profile.public_spec);return {[profile.public_export]:Public};};
  const args=[symbol.family,param,{Own:Owned},{[param.ident]:['Own']}];
  assert.equal(await runtimeTokenIdentity(...args,Public,load,null,symbol),true);
  for(const value of [Owned,Twin,{},null]){assert.equal(await runtimeTokenIdentity(...args,value,load,null,symbol),false);rejected++;}
 }
}
assert.equal(publicRoles,3);assert.equal(rejected,44);for(const id of ['foreign','__proto__','constructor'])assert.equal(callerConfigProfile({symbol_id:id}),null);
''')

    def test_constructor_config_parent_scope_overlay_and_lifetime_values_are_strict(self):
        self.probe(r'''
class ElementRef{constructor(nativeElement){this.nativeElement=nativeElement;}}
class OverlayRef{}
for(const symbol of symbols){
 const profile=callerConfigProfile(symbol);
 function fixture(){
  class Peer{}class Owned extends Peer{}
  const state=createCallerConfigContext(profile,{[profile.owner_export]:Owned},{[profile.public_export]:Peer},{OverlayRef},{});
  const element={},host={},pane={parentNode:host};host.parentNode={};
  state.ref=new OverlayRef();state.ref.hostElement=host;state.ref.overlayElement=pane;state.refHost=host;state.refPane=pane;
  const getter=(token,_fallback,flags)=>flags?.self?null:token===OverlayRef?state.ref:state.config;
  const f={element:{element:new ElementRef(element),injector:{get:getter},destroyed:false},parentNode:{injector:{get:()=>state.config},destroyed:false},template:{destroyed:false},component:{hostView:{destroyed:false}},environment:{destroyed:false}};
  const capture={constructor_calls:1,inputs:Array(profile.constructor_arity)};capture.inputs[profile.parameter_index]=state.config;capture.inputs[profile.element_index]=new ElementRef(element);if(profile.overlay_index!==null)capture.inputs[profile.overlay_index]=state.ref;
  return {state,f,capture};
 }
 const good=fixture();assert.equal(observeCallerConfigInputs(good.state,good.capture,good.f,{ElementRef}).constructor_config_identical,true);
 assert.equal(callerConfigLifetimeEvidence(good.state,good.f).borrowed_nodes_alive_after_teardown,true);
 for(const change of [x=>x.capture.constructor_calls=0,x=>x.capture.inputs.push(null),x=>x.capture.inputs[profile.parameter_index]={},x=>x.state.config={},x=>x.f.parentNode.injector.get=()=>({}),x=>x.f.element.injector.get=(_t,_f,flags)=>flags?.self?null:{},x=>x.f.element.injector.get=()=>x.state.config,x=>x.capture.inputs[profile.element_index]={nativeElement:x.f.element.element.nativeElement},x=>x.capture.inputs[profile.element_index]=new ElementRef({})]){
  const bad=fixture();change(bad);assert.throws(()=>observeCallerConfigInputs(bad.state,bad.capture,bad.f,{ElementRef}));
 }
 const mutated=fixture();mutated.state.config.data={case:'wrong'};assert.throws(()=>callerConfigLifetimeEvidence(mutated.state,mutated.f));
 const cyclic=fixture();const graph={};graph.self=graph;cyclic.state.config.data=graph;assert.throws(()=>callerConfigLifetimeEvidence(cyclic.state,cyclic.f),error=>error.message.length<200);
 for(const key of ['component','environment','parentNode','element','template']){
  const bad=fixture();if(key==='component')bad.f.component.hostView.destroyed=true;else bad.f[key].destroyed=true;
  const evidence=callerConfigLifetimeEvidence(bad.state,bad.f);assert.ok(Object.values(evidence).includes(false));
 }
 if(profile.overlay_index!==null){
  for(const change of [x=>x.capture.inputs[profile.overlay_index]={},x=>x.state.ref={}]){
   const bad=fixture();change(bad);assert.throws(()=>observeCallerConfigInputs(bad.state,bad.capture,bad.f,{ElementRef}));
  }
  for(const change of [x=>x.state.refDisposed=true,x=>x.state.ref.hostElement={},x=>x.state.ref.overlayElement={},x=>x.state.refHost.parentNode=null,x=>x.state.refPane.parentNode={}]){
   const bad=fixture();change(bad);assert.equal(callerConfigLifetimeEvidence(bad.state,bad.f).borrowed_overlay_alive_after_teardown,false);
  }
 }
}
''')

    def test_serialized_configuration_receipts_reject_missing_forged_scope_or_teardown(self):
        self.probe(r'''
let rejected=0;
for(const symbol of symbols){
 const profile=callerConfigProfile(symbol),evidence={profile,constructor_calls:1,constructor_arity:profile.constructor_arity,
  owned_public_config_instance:true,constructor_config_identical:true,parent_self_config_identical:true,child_ancestor_config_identical:true,child_self_config_absent:true,constructor_child_element_identical:true,
  genuine_public_overlay:profile.overlay_index===null?null:true,constructor_overlay_identical:profile.overlay_index===null?null:true,
  caller_config_unchanged_after_teardown:true,borrowed_overlay_alive_after_teardown:profile.overlay_index===null?null:true,borrowed_parent_alive_after_teardown:true,borrowed_nodes_alive_after_teardown:true,borrowed_environment_alive_after_teardown:true};
 const row={symbol,factory_outcome:'returned',factory_caller_config_context:evidence};assert.deepEqual(callerConfigObservationProblems(row),[]);
 for(const key of Object.keys(evidence)){
  const missing=structuredClone(row);delete missing.factory_caller_config_context[key];assert.ok(callerConfigObservationProblems(missing).length);rejected++;
  const wrong=structuredClone(row);wrong.factory_caller_config_context[key]=key==='profile'?{...profile,owner_export:'Foreign'}:false;assert.ok(callerConfigObservationProblems(wrong).length);rejected++;
 }
 for(const change of [r=>delete r.factory_caller_config_context,r=>r.factory_caller_config_context.extra='waiver',r=>r.factory_caller_config_context.profile.parameter_index++,r=>r.factory_caller_config_context.profile.original_source_sha256='0'.repeat(64)]){
  const bad=structuredClone(row);change(bad);assert.ok(callerConfigObservationProblems(bad).length);rejected++;
 }
}
assert.equal(rejected,144);
''')
if __name__ == '__main__':unittest.main()
