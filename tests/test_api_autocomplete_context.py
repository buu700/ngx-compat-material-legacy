"""Original autocomplete inputs, explicit public view lookup and borrowed lifetime remain mandatory."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class AutocompleteContextTests(unittest.TestCase):
    def test_original_profile_legacy_field_role_and_public_lookup_receipt(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalFactoryContract} from './scripts/api-surface.mjs';import {originalCompilerFactoryContext,originalContextDi} from './scripts/api-original-factory-contexts.mjs';
import {AUTOCOMPLETE_SYMBOL,autocompleteProfile,autocompleteFormFieldTokenMatches,autocompleteObservationProblems} from './scripts/api-autocomplete-context.mjs';
const originalFactory=originalFactoryContract('/original/src/material/legacy-autocomplete/autocomplete-trigger.ts','MatLegacyAutocompleteTrigger');
const symbol={symbol_id:AUTOCOMPLETE_SYMBOL,family:'legacy-autocomplete',kind:'primary',name:'MatLegacyAutocompleteTrigger',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
assert.equal(autocompleteProfile(symbol).constructor_arity,11);let rejected=0;
for(const change of [x=>x.family='foreign',x=>x.kind='testing',x=>x.name='Foreign',x=>x.shape.originalFactory.declaration+=' ',x=>x.shape.originalFactoryContext.parameter_factory_key='foreign',x=>x.shape.originalFactoryContext.factory_parameters[2].optional=true,x=>x.shape.originalFactoryContext.factory_parameters[2].imported='Foreign',x=>x.shape.originalFactoryContext.factory_parameters.pop(),x=>x.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){const bad=structuredClone(symbol);change(bad);assert.throws(()=>autocompleteProfile(bad));rejected++;}
assert.equal(rejected,9);for(const id of ['foreign','constructor','__proto__'])assert.equal(autocompleteProfile({symbol_id:id}),null);
const old=originalContextDi(symbol.shape)[7],legacy={},current={},twin={};assert.equal(autocompleteFormFieldTokenMatches(symbol,old,{MAT_LEGACY_FORM_FIELD:legacy},{MAT_FORM_FIELD:current},legacy),true);
for(const token of [current,twin,null])assert.equal(autocompleteFormFieldTokenMatches(symbol,old,{MAT_LEGACY_FORM_FIELD:legacy},{MAT_FORM_FIELD:current},token),false);
assert.equal(autocompleteFormFieldTokenMatches(symbol,old,{MAT_LEGACY_FORM_FIELD:current},{MAT_FORM_FIELD:current},current),false);
for(const change of [x=>x.optional=false,x=>x.host=false,x=>x.spec='foreign',x=>x.imported='Foreign',x=>x.ident='Foreign']){const bad=structuredClone(old);change(bad);assert.throws(()=>autocompleteFormFieldTokenMatches(symbol,bad,{MAT_LEGACY_FORM_FIELD:legacy},{MAT_FORM_FIELD:current},legacy));}
const proof=JSON.parse(readFileSync('compatibility/rc/autocomplete-view-context-source-proof.json'));
const row={symbol,factory_outcome:'returned',factory_autocomplete_context:proof.autocomplete_controls[0].evidence};assert.deepEqual(autocompleteObservationProblems(row),[]);rejected=0;
const corrupt=change=>{const bad=structuredClone(row);change(bad.factory_autocomplete_context);assert.ok(autocompleteObservationProblems(bad).length);rejected++;};
for(const key of ['constructor_calls','constructor_arity','public_getter_reads','public_lookup_requests'])corrupt(x=>x[key]++);
for(const key of ['supplied_view_input_identical','supplied_view_node_self_scope','actual_service_instance','window_listener_delivery','window_listener_removed_on_teardown','borrowed_context_alive_after_teardown','borrowed_service_usable_after_teardown'])corrupt(x=>x[key]=false);
for(const key of ['symbol_id','parameter_factory_key','original_source_sha256'])corrupt(x=>x.profile[key]='foreign');corrupt(x=>x.profile.constructor_arity++);corrupt(x=>x.profile.view_index++);corrupt(x=>x.profile.extra='waiver');
for(const change of [x=>x.constructor_owner.public_export='Foreign',x=>x.constructor_owner.depth++,x=>x.constructor_owner.owned_class_identity_matched=false,x=>x.source.file='foreign',x=>x.source.sha256='',x=>x.source.owner_text_sha256='',x=>x.source.lookup_text_sha256='',x=>x.lookup.ident='Foreign',x=>x.lookup.spec='private',x=>x.lookup.token_identity_matched=false,x=>x.lookup.args_count++,x=>x.lookup.unresolved=true,x=>x.lookup.value_identical_to_independent_control=false,x=>x.lookup.extra='waiver',x=>x.extra='waiver'])corrupt(change);
for(const change of [x=>delete x.factory_autocomplete_context,x=>x.factory_outcome='threw']){const bad=structuredClone(row);change(bad);assert.ok(autocompleteObservationProblems(bad).length);rejected++;}
assert.equal(rejected,34);assert.equal(proof.autocomplete_controls.length,9);assert.equal(proof.manual_constructor_cases[0].outcome,'returned');
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
