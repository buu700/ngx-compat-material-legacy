"""Configured opener reports require real service/content/result and both lifetime orders."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class DialogOpenerContextTests(unittest.TestCase):
    def test_original_jit_factory_and_actual_open_close_unsubscribe_evidence_is_mandatory(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalFactoryContract} from './scripts/api-surface.mjs';import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {DIALOG_OPENER_SYMBOL,dialogOpenerProfile,dialogOpenerObservationProblems} from './scripts/api-dialog-opener-context.mjs';
const originalFactory=originalFactoryContract('/original/src/material/legacy-dialog/testing/dialog-opener.ts','MatTestLegacyDialogOpener');
const symbol={symbol_id:DIALOG_OPENER_SYMBOL,family:'legacy-dialog',kind:'testing',name:'MatTestLegacyDialogOpener',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
assert.equal(dialogOpenerProfile(symbol).constructor_arity,1);let rejected=0;
for(const change of [x=>x.family='foreign',x=>x.kind='primary',x=>x.name='Foreign',x=>x.shape.originalFactory.declaration+=' ',x=>x.shape.originalFactoryContext.parameter_factory_key='foreign',x=>x.shape.originalFactoryContext.factory_parameters[0].optional=true,x=>x.shape.originalFactoryContext.factory_parameters[0].imported='Foreign',x=>x.shape.originalFactoryContext.factory_parameters.pop(),x=>x.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){
 const bad=structuredClone(symbol);change(bad);assert.throws(()=>dialogOpenerProfile(bad));rejected++;
}
assert.equal(rejected,9);for(const id of ['foreign','constructor','__proto__'])assert.equal(dialogOpenerProfile({symbol_id:id}),null);
const proof=JSON.parse(readFileSync('compatibility/rc/dialog-opener-caller-context-source-proof.json'));
const row={symbol,factory_outcome:'returned',factory_dialog_opener_context:proof.dialog_opener_controls[0].evidence};assert.deepEqual(dialogOpenerObservationProblems(row),[]);rejected=0;
const changeEvidence=change=>{const bad=structuredClone(row);change(bad.factory_dialog_opener_context);assert.ok(dialogOpenerObservationProblems(bad).length);rejected++;};
for(const field of ['public_with_component_configured','genuine_caller_service_identical','genuine_owned_ref_content_container','actual_component_view','content_data_identical','service_registry_identity','fixture_motion_disabled','result_delivery','closed_content_destroyed','closed_service_registry_cleared','borrowed_context_alive_after_dialog_close','pending_close_unsubscribe_control','pending_keyboard_escape_control','public_static_configuration_cleared_on_teardown','borrowed_context_alive_after_opener_teardown'])changeEvidence(x=>x[field]=false);
for(const field of ['constructor_calls','constructor_arity'])changeEvidence(x=>x[field]++);
for(const field of ['symbol_id','parameter_factory_key','original_source_sha256'])changeEvidence(x=>x.profile[field]='foreign');
changeEvidence(x=>x.profile.constructor_arity++);changeEvidence(x=>x.profile.extra='waiver');changeEvidence(x=>x.extra='waiver');
for(const change of [x=>delete x.factory_dialog_opener_context,x=>x.factory_outcome='threw']){const bad=structuredClone(row);change(bad);assert.ok(dialogOpenerObservationProblems(bad).length);rejected++;}
assert.equal(rejected,25);assert.equal(proof.dialog_opener_controls.length,8);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
