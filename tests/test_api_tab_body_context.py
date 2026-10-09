"""Tab-body zone partition must preserve authenticated original inputs and actual public identity."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class TabBodyContextTests(unittest.TestCase):
    def test_original_profiles_and_mandatory_zone_receipt(self):
        code=r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {tabBodyProfile,tabBodyObservationProblems} from './scripts/api-tab-body-context.mjs';
let originalRejected=0,receiptRejected=0;
for(const [name,sourceName,source]of [['MatLegacyTabBody','MatLegacyTabBody','legacy-tabs/tab-body.ts'],['_MatLegacyTabBodyBase','_MatTabBodyBase','tabs/tab-body.ts']]){
 const originalFactory=originalFactoryContract('/original/src/material/'+source,sourceName),symbol={symbol_id:'legacy-tabs/primary/'+name,family:'legacy-tabs',kind:'primary',name,shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
 const profile=tabBodyProfile(symbol);assert.equal(profile.constructor_arity,3);
 for(const change of [x=>x.family='foreign',x=>x.kind='testing',x=>x.name='Foreign',x=>x.shape.originalFactory.declaration+=' ',x=>x.shape.originalFactoryContext.parameter_factory_key='foreign',x=>x.shape.originalFactoryContext.factory_parameters[1].optional=false,x=>x.shape.originalFactoryContext.factory_parameters[0].imported='Foreign',x=>x.shape.originalFactoryContext.factory_parameters.pop(),x=>x.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){const bad=structuredClone(symbol);change(bad);assert.throws(()=>tabBodyProfile(bad));originalRejected++;}
 const receipt={profile,constructor_calls:1,constructor_arity:3,actual_element_identity_matched:true,source:{file:'/test/fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',sha256:'1'.repeat(64),owner_text_sha256:'2'.repeat(64),helper_text_sha256:'3'.repeat(64)},total_requests:8,retained_requests:7,classified_requests:1,verified:true,public_control_outcome:'returned',request:{ident:'NgZone',spec:'@angular/core',identity_matched:true,value_matched:true,unresolved:false,optional:true,self:false,skipSelf:false,host:false}};
 const row={symbol,factory_outcome:'returned',factory_tab_body_context:receipt};assert.deepEqual(tabBodyObservationProblems(row),[]);
 for(const change of [x=>x.profile.depth++,x=>x.profile.symbol_id='foreign',x=>x.profile.constructor_arity++,x=>x.profile.parameter_factory_key='foreign',x=>x.profile.extra='waiver',x=>x.constructor_calls++,x=>x.constructor_arity++,x=>x.actual_element_identity_matched=false,x=>x.source.file='foreign',x=>x.source.sha256='',x=>x.source.owner_text_sha256='',x=>x.source.helper_text_sha256='',x=>x.source.extra='waiver',x=>x.total_requests++,x=>x.retained_requests++,x=>x.classified_requests++,x=>x.verified=false,x=>x.public_control_outcome='threw',x=>x.request.ident='Twin',x=>x.request.spec='private',x=>x.request.identity_matched=false,x=>x.request.value_matched=false,x=>x.request.unresolved=true,x=>x.request.optional=false,x=>x.request.self=true,x=>x.request.skipSelf=true,x=>x.request.host=true,x=>x.request.extra='waiver',x=>x.extra='waiver']){const bad=structuredClone(row);change(bad.factory_tab_body_context);assert.ok(tabBodyObservationProblems(bad).length);receiptRejected++;}
 const missing=structuredClone(row);delete missing.factory_tab_body_context;assert.ok(tabBodyObservationProblems(missing).length);receiptRejected++;
}
assert.equal(originalRejected,18);assert.equal(receiptRejected,60);for(const id of ['foreign','constructor','__proto__'])assert.equal(tabBodyProfile({symbol_id:id}),null);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
