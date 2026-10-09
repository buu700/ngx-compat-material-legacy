"""The finite resolver removal retains original evidence and requires actual caller/lifetime proof."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class MenuContentContextTests(unittest.TestCase):
    def test_original_constructor_and_scope_lifecycle_receipt_cannot_be_weakened(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {MENU_CONTENT_SYMBOL,menuContentContract,menuContentObservationProblems} from './scripts/api-menu-content-context.mjs';
const originalFactory=originalFactoryContract('/original/src/material/legacy-menu/menu-content.ts','MatLegacyMenuContent');
const symbol={symbol_id:MENU_CONTENT_SYMBOL,family:'legacy-menu',kind:'primary',name:'MatLegacyMenuContent',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
const contract=menuContentContract(symbol);assert.equal(contract.original_arity,7);assert.equal(contract.owned_arity,6);assert.equal(contract.removed_index,1);
assert.deepEqual(contract.runtime_requests.map(x=>x.ident),['TemplateRef','ApplicationRef','Injector','ViewContainerRef','DOCUMENT','ChangeDetectorRef']);
let originalRejected=0;
for(const change of [s=>s.family='foreign',s=>s.kind='testing',s=>s.name='Foreign',s=>s.shape.originalFactory.declaration+=' ',s=>s.shape.originalFactoryContext.parameter_factory_key='foreign',s=>s.shape.originalFactoryContext.factory_parameters[1].optional=true,s=>s.shape.originalFactoryContext.factory_parameters[1].imported='Foreign',s=>s.shape.originalFactoryContext.factory_parameters.pop(),s=>s.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){
 const bad=structuredClone(symbol);change(bad);assert.throws(()=>menuContentContract(bad));originalRejected++;
}
assert.equal(originalRejected,9);for(const id of ['foreign','constructor','__proto__'])assert.equal(menuContentContract({symbol_id:id}),null);
const proof=JSON.parse(readFileSync('compatibility/rc/menu-content-resolver-context-source-proof.json'));
const row={symbol,factory_outcome:'returned',factory_menu_content_context:proof.menu_content_controls[0].evidence};assert.deepEqual(menuContentObservationProblems(row),[]);
let rejected=0;
for(const change of [x=>x.symbol_id='foreign',x=>x.original_arity--,x=>x.owned_arity++,x=>x.removed_index=0,x=>x.removed_ident='Injector',x=>x.constructor_calls=0,x=>x.constructor_fields_identical=false,x=>x.caller_template_container_injector_scope_verified=false,x=>x.caller_app_document_identical=false,x=>x.attached_events--,x=>x.owned_views--,x=>x.borrowed_context_alive_after_owned_teardown=false,x=>x.owned_views_destroyed=false,x=>x.outlet_removed=false,x=>x.caller_detector_scope_verified=false,x=>x.steps.pop(),x=>x.steps.reverse(),x=>x.extra='waiver']){
 const bad=structuredClone(row);change(bad.factory_menu_content_context);assert.ok(menuContentObservationProblems(bad).length);rejected++;
}
for(let index=0;index<6;index++)for(const change of [x=>x.id='foreign',x=>x.result='fail',x=>x.extra='waiver']){
 const bad=structuredClone(row);change(bad.factory_menu_content_context.steps[index]);assert.ok(menuContentObservationProblems(bad).length);rejected++;
}
for(const change of [x=>delete x.factory_menu_content_context,x=>x.factory_outcome='threw']){const bad=structuredClone(row);change(bad);assert.ok(menuContentObservationProblems(bad).length);rejected++;}
assert.equal(rejected,38);assert.equal(proof.menu_content_controls.length,6);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
