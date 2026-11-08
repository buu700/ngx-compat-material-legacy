# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Only five exact tab constructor changes and the sourced render request may settle."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]

class TabHeaderContextTests(unittest.TestCase):
    def test_finite_constructor_records_and_mandatory_node_receipt(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {tabHeaderProfile,tabHeaderObservationProblems,approvedTabHeaderSignatureRecord} from './scripts/api-tab-header-context.mjs';
import {settleDi} from './scripts/api-completeness.mjs';
const defs=[['MatLegacyPaginatedTabHeader','MatPaginatedTabHeader','tabs/paginated-tab-header.ts'],['MatLegacyTabHeader','MatLegacyTabHeader','legacy-tabs/tab-header.ts'],['MatLegacyTabNav','MatLegacyTabNav','legacy-tabs/tab-nav-bar/tab-nav-bar.ts'],['_MatLegacyTabHeaderBase','_MatTabHeaderBase','tabs/tab-header.ts'],['_MatLegacyTabNavBase','_MatTabNavBase','tabs/tab-nav-bar/tab-nav-bar.ts']];
const qualified=JSON.parse(readFileSync('tests/fixtures/api-tab-header-qualified.json','utf8')).rows;
let rejected=0;
for(const [name,sourceName,source] of defs){
 const factory=originalFactoryContract('/original/src/material/'+source,sourceName),symbol={symbol_id:'legacy-tabs/primary/'+name,family:'legacy-tabs',kind:'primary',name,shape:{originalFactory:factory,originalFactoryContext:originalCompilerFactoryContext(factory)}};
 const profile=tabHeaderProfile(symbol),nav=name.includes('Nav'),names=nav?['ElementRef','Directionality','NgZone','ChangeDetectorRef','ViewportRuler','Platform','ANIMATION_MODULE_TYPE']:['ElementRef','ChangeDetectorRef','ViewportRuler','Directionality','NgZone','Platform','ANIMATION_MODULE_TYPE'];
 const row={symbol,...structuredClone(qualified[symbol.symbol_id])};assert.deepEqual(tabHeaderObservationProblems(row),[]);assert.equal(settleDi(row,[]).status,'intentional-legacy-difference');
 const order=nav?'ElementRef,Directionality,NgZone,ChangeDetectorRef,ViewportRuler,Platform,string?':'ElementRef,ChangeDetectorRef,ViewportRuler,Directionality,NgZone,Platform,string?',historical='public constructor('+(name==='MatLegacyPaginatedTabHeader'?order.replace('ElementRef,','ElementRef<HTMLElement>,'):order)+')',actual=historical.replace('ViewportRuler','_LegacyViewport');
 const record={symbol_id:symbol.symbol_id,classification:'intentional-legacy-difference',historical_signature:historical,owned_signature:actual,rationale:'specific supported contract'},packed={signatures:[actual]};assert.equal(approvedTabHeaderSignatureRecord(symbol,packed,record),true);
 for(const mutate of [x=>delete x.factory_tab_header_context,x=>x.factory_outcome='threw',x=>x.factory_returned_owned_instance=false,x=>x.factory_node_kind='template',x=>x.factory_context_modules=[],x=>x.factory_context='forged',x=>x.runtime_requests[0].identity_matched=false,x=>x.runtime_requests[0].observed_label='forged',x=>x.runtime_requests.pop(),x=>x.observed[0]='forged',x=>x.factory_tab_header_context.total_requests++,x=>x.factory_tab_header_context.constructor_arity++,x=>x.factory_tab_header_context.child_scope_matched=false,x=>x.factory_tab_header_context.fixture_destroyed=false,x=>x.factory_tab_header_context.request.optional=true,x=>x.factory_tab_header_context.request.host=true,x=>x.factory_tab_header_context.source.file='elsewhere/fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs',x=>x.factory_tab_header_context.source.sha256='0'.repeat(64),x=>x.factory_tab_header_context.source.owner_text_sha256='0'.repeat(64),x=>x.factory_tab_header_context.source.helper_text_sha256='0'.repeat(64),x=>x.factory_tab_header_context.source.core_version='22.1.8',x=>x.factory_tab_header_context.source.cdk_version='22.1.8',x=>x.factory_tab_header_context.source.owner_export='other',x=>x.factory_tab_header_context.source.selected_export='other',x=>x.factory_tab_header_context.source.owner_local='forged',x=>x.factory_tab_header_context.source.selected_local='forged',x=>x.factory_tab_header_context.source.owner_start++,x=>x.factory_tab_header_context.source.owner_end--,x=>x.factory_tab_header_context.source.field_start++,x=>x.factory_tab_header_context.source.field_end--,x=>x.factory_tab_header_context.source.field_start=0,x=>x.factory_tab_header_context.source.field_end=x.factory_tab_header_context.source.owner_end,x=>x.runtime_requests[profile.viewport_index].identity_matched=true,x=>x.runtime_requests[profile.viewport_index].intentional_token_difference.historical_provider_selects_actual=true,x=>x.runtime_requests[profile.viewport_index].observed_label='foreign',x=>x.factory_tab_header_context.extra=true]){const x=structuredClone(row);mutate(x);assert.ok(tabHeaderObservationProblems(x).length);assert.equal(settleDi(x,[]).result,'fail');rejected++;}
 for(const mutate of [x=>x.symbol_id='foreign',x=>x.historical_signature='foreign',x=>x.owned_signature='foreign',x=>x.classification='match',x=>x.rationale='',x=>x.construction_contract='waiver']){const x=structuredClone(record);mutate(x);assert.equal(approvedTabHeaderSignatureRecord(symbol,packed,x),false);rejected++;}
 for(const mutate of [x=>x.shape.originalFactoryContext.source_sha256='0'.repeat(64),x=>x.shape.originalFactoryContext.parameter_factory_key='foreign',x=>x.shape.originalFactoryContext.factory_parameters.pop()]){const x=structuredClone(symbol);mutate(x);assert.throws(()=>tabHeaderProfile(x));rejected++;}
}
assert.equal(rejected,225);
'''
        run=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=20)
        self.assertEqual(run.returncode,0,(run.stdout+run.stderr)[-5000:])

    def test_source_binding_rejects_decoy_and_shadowed_symbols(self):
        code=r'''
import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {tabHeaderSourceScopes} from './scripts/api-tab-header-context.mjs';
const classes=new Function(`class MatPaginatedTabHeader { _renderInjector = tabHeaderRenderInjector(); constructor(a,b,c,d,e,f,g) {} }\nclass MatLegacyTabHeader extends MatPaginatedTabHeader {}\nreturn {MatPaginatedTabHeader,MatLegacyTabHeader};`)();
const Owner=classes.MatPaginatedTabHeader,Type=classes.MatLegacyTabHeader,owned={MatLegacyPaginatedTabHeader:Owner,MatLegacyTabHeader:Type};
const owner=Owner.toString(),selected=Type.toString(),helper='function tabHeaderRenderInjector() { try { assertInInjectionContext(tabHeaderRenderInjector); } catch { return null; } return inject(Injector); }';
const prefix="import {inject, Injector, assertInInjectionContext} from '@angular/core';\n",tail='\nexport { MatPaginatedTabHeader as MatLegacyPaginatedTabHeader, MatLegacyTabHeader };\n',source=prefix+helper+'\n'+owner+'\n'+selected+tail;
const comment=owner.split('\n').map(x=>'// '+x).join('\n');
const changes=[source.replace(owner,'const decoy = () => ('+owner+'); class MatPaginatedTabHeader {}'),source.replace(owner,'const decoy = ('+owner+'); class MatPaginatedTabHeader {}'),source.replace(owner,comment+'\nclass MatPaginatedTabHeader {}'),source.replace('MatPaginatedTabHeader as MatLegacyPaginatedTabHeader','MatLegacyTabHeader as MatLegacyPaginatedTabHeader'),source.replace('MatLegacyTabHeader };','MatPaginatedTabHeader as MatLegacyTabHeader };'),source.replace(selected,'class MatLegacyTabHeader {}'),source+'\nconst tabHeaderRenderInjector = () => null;',source+'\nfunction inject() {}',source+'\nclass Injector {}',source+'\nconst assertInInjectionContext = () => {};',source.replace('function tabHeaderRenderInjector()','function tabHeaderRenderInjector(inject)'),source.replace('function tabHeaderRenderInjector()','function tabHeaderRenderInjector(Injector)'),source.replace('function tabHeaderRenderInjector() {','function tabHeaderRenderInjector() { const inject = () => null;'),source.replace('function tabHeaderRenderInjector() {','function tabHeaderRenderInjector() { const Injector = {};')];
const dir=mkdtempSync(join(tmpdir(),'tab-header-binding-'));try{const f=join(dir,'bundle.mjs');writeFileSync(f,source);const good=tabHeaderSourceScopes(Type,owned,f,'MatLegacyTabHeader');assert.equal(good.proof.owner_local,'MatPaginatedTabHeader');assert.equal(good.proof.selected_local,'MatLegacyTabHeader');for(const altered of changes){assert.notEqual(altered,source);writeFileSync(f,altered);assert.throws(()=>tabHeaderSourceScopes(Type,owned,f,'MatLegacyTabHeader'));}writeFileSync(f,comment+'\n'+source);assert.equal(tabHeaderSourceScopes(Type,owned,f,'MatLegacyTabHeader').proof.selected_export,'MatLegacyTabHeader');}finally{rmSync(dir,{recursive:true,force:true});}
assert.equal(changes.length,14);
'''
        run=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=20)
        self.assertEqual(run.returncode,0,(run.stdout+run.stderr)[-5000:])
