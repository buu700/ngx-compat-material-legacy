"""Required parent profiles retain original identity, real constructor values and lifetime evidence."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PRELUDE = r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {requiredParentFactoryProfile,observeRequiredParentInputs,requiredParentContextObservationProblems} from './scripts/api-required-parent-context.mjs';
const symbols=[['legacy-chips','MatLegacyChipRemove','chip'],['legacy-list','MatLegacyListOption','selection-list'],...['MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell'].map(n=>['legacy-table',n,'cell'])].map(([family,name,file])=>{
 const originalFactory=originalFactoryContract('/original/src/material/'+family+'/'+file+'.ts',name);
 return {symbol_id:family+'/primary/'+name,family,name,kind:'primary',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
});
'''

class RequiredParentContextTests(unittest.TestCase):
    def run_probe(self, code):
        done = subprocess.run(['node', '--input-type=module', '-e', PRELUDE + code], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, (done.stdout + done.stderr)[-8000:])

    def test_profiles_reauthenticate_original_owner_parameters_and_scope(self):
        self.run_probe(r'''
let rejected=0;
for(const symbol of symbols){
 const profile=requiredParentFactoryProfile(symbol);assert.ok(profile);assert.equal(profile.symbol_id,symbol.symbol_id);
 for(const change of [s=>s.name='Other',s=>s.family='Other',s=>s.kind='testing',s=>s.shape.originalFactory.declaration+=' ',s=>s.shape.originalFactoryContext.parameter_factory_key='foreign',s=>s.shape.originalFactoryContext.factory_parameters[profile.parameter_index].optional=true,s=>s.shape.originalFactoryContext.factory_parameters[profile.parameter_index].self=true,s=>s.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){
  const bad=structuredClone(symbol);change(bad);assert.throws(()=>requiredParentFactoryProfile(bad));rejected++;
 }
}
assert.equal(requiredParentFactoryProfile({symbol_id:'foreign/primary/MatLegacyCell'}),null);assert.equal(rejected,40);
''')

    def test_constructor_values_reject_wrong_parent_moved_scope_and_destroyed_hosts(self):
        self.run_probe(r'''
class ElementRef{constructor(nativeElement){this.nativeElement=nativeElement;}}
class QueryList{}
for(const symbol of symbols){
 const profile=requiredParentFactoryProfile(symbol);
 function fixture(){
  class Owner{}const owner=new Owner();owner.options=new QueryList();owner._contentInitialized=true;
  const childElement={},parentElement={},child={element:new ElementRef(childElement),injector:{get(token,fallback,flags){return flags?.self?null:owner;}}};
  const value={parentNode:{owner,element:new ElementRef(parentElement),destroyed:false,injector:{get(){return owner;}}},element:child,component:{hostView:{destroyed:false}},environment:{destroyed:false}};
  const capture={constructor_calls:1,inputs:Array(profile.constructor_arity)};capture.inputs[profile.parameter_index]=owner;capture.inputs[profile.element_index]=new ElementRef(childElement);
  return {value,capture,Owner};
 }
 let good=fixture();assert.equal(observeRequiredParentInputs(profile,good.capture,good.value,good.Owner,good.Owner,{ElementRef,QueryList}).required_input_identical,true);
 for(const change of [f=>f.capture.constructor_calls=0,f=>f.capture.inputs.push(null),f=>f.capture.inputs[profile.parameter_index]={},f=>f.value.parentNode.owner={},f=>f.value.parentNode.injector.get=()=>({}),f=>f.value.element.injector.get=(_t,_f,flags)=>flags?.self?null:{},f=>f.value.element.injector.get=()=>f.value.parentNode.owner,f=>f.capture.inputs[profile.element_index]={nativeElement:f.value.element.element.nativeElement},f=>f.capture.inputs[profile.element_index]=new ElementRef({}),f=>f.value.parentNode.element=f.value.element.element,f=>f.value.parentNode.destroyed=true,f=>f.value.component.hostView.destroyed=true,f=>f.value.environment.destroyed=true]){
  const bad=fixture();change(bad);assert.throws(()=>observeRequiredParentInputs(profile,bad.capture,bad.value,bad.Owner,bad.Owner,{ElementRef,QueryList}));
 }
 if(profile.owner_export==='MatLegacySelectionList')for(const change of [f=>f.value.parentNode.owner.options={},f=>f.value.parentNode.owner._contentInitialized=false,f=>f.value.parentNode.owner._isDestroyed=true]){
  const bad=fixture();change(bad);assert.throws(()=>observeRequiredParentInputs(profile,bad.capture,bad.value,bad.Owner,bad.Owner,{ElementRef,QueryList}));
 }
}
''')

    def test_serialized_receipts_require_identity_node_initialization_and_borrowed_lifetime(self):
        self.run_probe(r'''
import {settleDi} from './scripts/api-completeness.mjs';
import {expectedFactoryDi} from './scripts/api-di-observe.mjs';
import {originalPublicParentTokenRole} from './scripts/api-public-parent-token-role.mjs';
let rejected=0;
for(const symbol of symbols){
 const profile=requiredParentFactoryProfile(symbol),evidence={profile,constructor_calls:1,constructor_arity:profile.constructor_arity,
  required_input_identical:true,owned_parent_instance:true,parent_self_provider_identical:true,child_ancestor_provider_identical:true,child_self_provider_absent:true,child_element_identical:true,separate_parent_node:true,angular_parent_initialized:true,borrowed_parent_alive_after_child_teardown:true,borrowed_nodes_alive_after_child_teardown:true,borrowed_environment_alive_after_child_teardown:true};
 const params=expectedFactoryDi(symbol.shape),row={symbol,problems:[],observed:params.map(p=>p.ident),factory_outcome:'returned',factory_required_parent_context:evidence,
 runtime_requests:params.map(p=>({expected_ident:p.ident,expected_spec:p.spec,identity_matched:true,unresolved:false,...Object.fromEntries(['optional','self','skipSelf','host'].flatMap(f=>[[f,Boolean(p[f])],['expected_'+f,Boolean(p[f])]])),public_parent_token_role:originalPublicParentTokenRole(symbol,p)}))};
 assert.deepEqual(requiredParentContextObservationProblems(row),[]);assert.equal(settleDi(row,[]).result,'pass');
 for(const key of Object.keys(evidence)){
  const missing=structuredClone(row);delete missing.factory_required_parent_context[key];assert.ok(requiredParentContextObservationProblems(missing).length);assert.equal(settleDi(missing,[]).result,'fail');rejected++;
  const wrong=structuredClone(row);wrong.factory_required_parent_context[key]=key==='profile'?{...profile,owner_export:'Foreign'}:false;assert.ok(requiredParentContextObservationProblems(wrong).length);assert.equal(settleDi(wrong,[]).result,'fail');rejected++;
 }
 for(const change of [r=>delete r.factory_required_parent_context,r=>r.factory_required_parent_context.extra='waiver',r=>r.factory_required_parent_context.profile.parameter_index++,r=>r.factory_required_parent_context.profile.original_source_sha256='0'.repeat(64)]){
  const bad=structuredClone(row);change(bad);assert.ok(requiredParentContextObservationProblems(bad).length);assert.equal(settleDi(bad,[]).result,'fail');rejected++;
 }
}
assert.equal(rejected,160);
''')

if __name__ == '__main__':
    unittest.main()
