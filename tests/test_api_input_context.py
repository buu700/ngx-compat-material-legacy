"""Input retirement requires original provenance and complete actual-parent/behavior evidence."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InputContextTests(unittest.TestCase):
    def test_original_token_identity_and_strict_receipt(self):
        code = r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {INPUT_SYMBOL,inputContract,inputLegacyTokenMatches,inputObservationProblems} from './scripts/api-input-context.mjs';
const originalFactory=originalFactoryContract('/original/src/material/legacy-input/input.ts','MatLegacyInput');
const symbol={symbol_id:INPUT_SYMBOL,family:'legacy-input',kind:'primary',name:'MatLegacyInput',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
const contract=inputContract(symbol);assert.equal(contract.original_constructor_arity,10);assert.equal(contract.owned_constructor_arity,0);assert.equal(contract.runtime_requests.length,1);
let originalMutants=0,tokenMutants=0,receiptMutants=0;
for(const change of [s=>s.family='foreign',s=>s.kind='testing',s=>s.name='Foreign',s=>s.shape.originalFactory.declaration+=' ',s=>s.shape.originalFactoryContext.parameter_factory_key='foreign',s=>s.shape.originalFactoryContext.factory_parameters.pop(),s=>s.shape.originalFactoryContext.factory_parameters[2].self=false,s=>s.shape.originalFactoryContext.source_sha256='0'.repeat(64),s=>s.shape.originalFactoryContext.extra='waiver']){
 const bad=structuredClone(symbol);change(bad);assert.throws(()=>inputContract(bad));originalMutants++;
}
const old={},current={},twin={},param=contract.runtime_requests[0],field={MAT_LEGACY_FORM_FIELD:old},peer={MAT_FORM_FIELD:current};
assert.equal(inputLegacyTokenMatches(symbol,param,field,peer,old),true);
for(const token of [current,twin,null,{}]){assert.equal(inputLegacyTokenMatches(symbol,param,field,peer,token),false);tokenMutants++;}
assert.equal(inputLegacyTokenMatches(symbol,param,field,{MAT_FORM_FIELD:old},old),false);tokenMutants++;
for(const change of [p=>p.optional=false,p=>p.self=true,p=>p.spec='@angular/material/form-field',p=>p.ident='MAT_FORM_FIELD']){const bad=structuredClone(param);change(bad);assert.throws(()=>inputLegacyTokenMatches(symbol,bad,field,peer,old));tokenMutants++;}
const flags={optional:false,self:false,skipSelf:false,host:false};
const source=file=>({file,sha256:'a'.repeat(64),class_text_sha256:'b'.repeat(64)});
const x={symbol_id:INPUT_SYMBOL,original_constructor_arity:10,owned_constructor_arity:0,constructor_calls:1,public_parent_identity_matched:true,owned_field_ast_verified:true,
 sources:{parent:source('/peer/fesm2022/input.mjs'),owned:source('/owned/fesm2022/ngx-compat-material-legacy-legacy-input.mjs')},
 total_requests:15,retained_requests:1,classified_requests:14,public_control_outcome:'returned',
 parent_requests:Array.from({length:14},(_,index)=>({index,identity_matched:true,unresolved:false,...flags})),
 control_requests:Array.from({length:14},(_,index)=>({index,...flags})),
 original_native_node_identical:true,borrowed_services_identical:true,legacy_token_distinct:true,legacy_field_value_identical:true,caller_kind:'legacy',genuine_legacy_parent_control_scope:true,
 behavior_checks:['native-value-roundtrip-and-empty-state','historical-direct-write-boolean-coercion','public-id-write','aria-described-by-roundtrip-and-removal','public-focus-target','actual-legacy-placeholder-promotion-and-standard-restoration','external-native-value-notification'].map(id=>({id,result:'pass'})),
 state_changes_completed:true,borrowed_autofill_destroy_calls:0,borrowed_parent_destroy_calls:0,borrowed_context_alive:true};
const row={symbol,factory_outcome:'returned',factory_input_context:x};assert.deepEqual(inputObservationProblems(row),[]);
// Every required nested field is challenged independently. Extra waiver fields
// and malformed source/request/behavior values cannot qualify the observation.
function challenge(value,path=[]){
 if(!value||typeof value!=='object')return;
 for(const [key,child]of Object.entries(value)){
  const bad=structuredClone(row),parent=path.reduce((v,k)=>v[k],bad.factory_input_context);delete parent[key];assert.ok(inputObservationProblems(bad).length,'missing '+[...path,key].join('.'));receiptMutants++;
  if(child&&typeof child==='object')challenge(child,[...path,key]);
  else{const bad=structuredClone(row),parent=path.reduce((v,k)=>v[k],bad.factory_input_context);parent[key]=typeof child==='boolean'?!child:typeof child==='number'?child+1:'foreign';assert.ok(inputObservationProblems(bad).length,'changed '+[...path,key].join('.'));receiptMutants++;}
 }
 if(!Array.isArray(value)){const bad=structuredClone(row),parent=path.reduce((v,k)=>v[k],bad.factory_input_context);parent.extra='waiver';assert.ok(inputObservationProblems(bad).length,'extra '+path.join('.'));receiptMutants++;}
}
challenge(x);
for(const change of [r=>delete r.factory_input_context,r=>r.factory_outcome='threw',r=>r.factory_input_context.parent_requests.reverse(),r=>r.factory_input_context.behavior_checks.reverse(),r=>r.factory_input_context.control_requests[0].optional=true]){
 const bad=structuredClone(row);change(bad);assert.ok(inputObservationProblems(bad).length);receiptMutants++;
}
assert.equal(originalMutants,9);assert.equal(tokenMutants,9);assert.ok(receiptMutants>400);
for(const id of ['foreign','constructor','__proto__'])assert.equal(inputContract({symbol_id:id}),null);
console.log(JSON.stringify({originalMutants,tokenMutants,receiptMutants}));
'''
        result = subprocess.run(
            ['node', '--input-type=module', '-e', code], cwd=ROOT,
            capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-5500:])
