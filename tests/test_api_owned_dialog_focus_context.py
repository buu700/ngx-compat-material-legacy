"""Owned focus receipts require exact optional services, constructor owner and caller-view lifetime."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class OwnedDialogFocusContextTests(unittest.TestCase):
    def test_serialized_public_service_owner_scope_and_lifetime_evidence_is_mandatory(self):
        code=r'''
import assert from 'node:assert/strict';
import {ownedDialogFocusProfile,ownedDialogFocusObservationProblems} from './scripts/api-owned-dialog-focus-context.mjs';
const fields=[['_legacyChangeDetector','ChangeDetectorRef','@angular/core'],['_legacyDialogRef','DialogRef','@angular/cdk/dialog'],['_legacyFocusPlatform','Platform','@angular/cdk/platform'],['_legacyFocusRenderer','Renderer2','@angular/core']];let rejected=0;
for(const [name,depth]of [['MatLegacyDialogContainer',1],['_MatLegacyDialogContainerBase',0]]){
 const id='legacy-dialog/primary/'+name;assert.equal(ownedDialogFocusProfile(id).depth,depth);
 const evidence={symbol_id:id,constructor_owner:{public_export:'_MatLegacyDialogContainerBase',depth,owned_class_identity_matched:true},source:{file:'/test/fesm2022/ngx-compat-material-legacy-legacy-dialog.mjs',sha256:'1'.repeat(64),owner_text_sha256:'2'.repeat(64),helper_text_sha256:'3'.repeat(64)},total_requests:13,retained_requests:9,classified_requests:4,verified:true,public_control_outcome:'returned',detector_scope_verified:true,borrowed_context_alive_after_owned_teardown:true,requests:fields.map(([field,ident,spec])=>({field,ident,spec,identity_matched:true,value_matched:true,unresolved:false,optional:true,self:false,skipSelf:false,host:false}))};
 const row={symbol:{symbol_id:id},factory_outcome:'returned',factory_owned_dialog_focus_context:evidence};assert.deepEqual(ownedDialogFocusObservationProblems(row),[]);
 for(const change of [x=>x.symbol_id='foreign',x=>delete x.constructor_owner,x=>x.constructor_owner.depth++,x=>x.constructor_owner.public_export='Foreign',x=>x.constructor_owner.owned_class_identity_matched=false,x=>x.constructor_owner.extra='waiver',x=>x.source.file='/foreign.mjs',x=>x.source.sha256='',x=>x.source.owner_text_sha256='',x=>x.source.helper_text_sha256='',x=>x.total_requests++,x=>x.retained_requests++,x=>x.classified_requests--,x=>x.verified=false,x=>x.public_control_outcome='threw',x=>x.detector_scope_verified=false,x=>x.borrowed_context_alive_after_owned_teardown=false,x=>x.requests.pop(),x=>x.requests.reverse()]){
  const bad=structuredClone(row);change(bad.factory_owned_dialog_focus_context);assert.ok(ownedDialogFocusObservationProblems(bad).length);rejected++;
 }
 for(const index of [0,1,2,3])for(const change of [x=>x.field='foreign',x=>x.ident='twin',x=>x.spec='private',x=>x.identity_matched=false,x=>x.value_matched=false,x=>x.unresolved=true,x=>x.optional=false,x=>x.self=true,x=>x.skipSelf=true,x=>x.host=true,x=>x.extra='waiver']){
  const bad=structuredClone(row);change(bad.factory_owned_dialog_focus_context.requests[index]);assert.ok(ownedDialogFocusObservationProblems(bad).length);rejected++;
 }
 const missing=structuredClone(row);delete missing.factory_owned_dialog_focus_context;assert.ok(ownedDialogFocusObservationProblems(missing).length);rejected++;
}
assert.equal(rejected,128);for(const id of ['foreign','__proto__','constructor'])assert.equal(ownedDialogFocusProfile(id),null);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-6000:])

    def test_recorded_dialog_motion_wrapper_and_caller_evidence_is_mandatory(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {DIALOG_MOTION_SYMBOL,ownedSelectMotionProblems} from './scripts/api-owned-motion-context.mjs';
const proof=JSON.parse(readFileSync('compatibility/rc/owned-dialog-focus-context-source-proof.json'));
assert.equal(proof.dialog_focus_controls.length,8);
assert.equal(proof.dialog_motion_component_modes.length,7);
let rejected=0;
for(const cell of proof.dialog_motion_component_modes){
 const x=cell.evidence;assert.deepEqual(ownedSelectMotionProblems(x,DIALOG_MOTION_SYMBOL),[]);
 for(const change of [x=>delete x.sources.manual_wrapper,x=>x.sources.manual_wrapper.file='foreign',x=>x.sources.manual_wrapper.sha256='',x=>x.sources.manual_wrapper.function_text_sha256='',x=>delete x.constructor_owner,x=>x.constructor_owner.public_export='Foreign',x=>x.constructor_owner.depth++,x=>x.constructor_owner.owned_class_identity_matched=false,x=>x.caller.file='foreign',x=>x.component_enabled=!x.component_enabled]){
  const bad=structuredClone(x);change(bad);assert.ok(ownedSelectMotionProblems(bad,DIALOG_MOTION_SYMBOL).length);rejected++;
 }
}
assert.equal(rejected,70);
assert.deepEqual(proof.dialog_motion_component_modes.map(x=>[x.id,x.enabled]),[
 ['default-server-enabled',true],['override-enabled',true],['override-disabled',false],['override-reduced',false],['material-disabled',false],['noop-module',false],['enabled-override-with-original-noop',true],
]);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-6000:])
