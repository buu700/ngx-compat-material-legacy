"""Finite original public parent roles cannot resolve through owned aliases or labels."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]

class PublicParentTokenRoleTests(unittest.TestCase):
    def test_serialized_role_receipts_reject_missing_forged_identity_and_flags(self):
        code=r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {originalPublicParentTokenRole,publicParentTokenRoleObservationProblems} from './scripts/api-public-parent-token-role.mjs';
import {expectedFactoryDi} from './scripts/api-di-observe.mjs';import {settleDi} from './scripts/api-completeness.mjs';
let rejected=0;
for(const [family,name,file]of [['legacy-menu','MatLegacyMenuTrigger','menu-trigger'],['legacy-table','MatLegacyTextColumn','text-column'],...['MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell'].map(n=>['legacy-table',n,'cell'])]){
 const originalFactory=originalFactoryContract('/original/src/material/'+family+'/'+file+'.ts',name),symbol={symbol_id:family+'/primary/'+name,family,name,kind:'primary',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
 const params=expectedFactoryDi(symbol.shape),row={symbol,problems:[],observed:params.map(p=>p.ident),factory_outcome:'returned',runtime_requests:params.map(p=>({expected_ident:p.ident,expected_spec:p.spec,identity_matched:true,unresolved:false,...Object.fromEntries(['optional','self','skipSelf','host'].flatMap(f=>[[f,Boolean(p[f])],['expected_'+f,Boolean(p[f])]])),public_parent_token_role:originalPublicParentTokenRole(symbol,p)}))};
 assert.deepEqual(publicParentTokenRoleObservationProblems(row),[]);assert.equal(settleDi(row,[]).result,'pass');
 for(const [index,request]of row.runtime_requests.entries())if(request.public_parent_token_role){
  for(const change of [r=>delete r.public_parent_token_role,r=>r.public_parent_token_role.public_spec='foreign',r=>r.public_parent_token_role.public_export='OwnedAlias',r=>r.public_parent_token_role.parameter_index++,r=>r.public_parent_token_role.original_source_sha256='0'.repeat(64),r=>r.public_parent_token_role.extra='waiver',r=>r.identity_matched=false,r=>r.unresolved=true,r=>r.optional=!r.optional,r=>r.expected_self=!r.expected_self]){
   const bad=structuredClone(row);change(bad.runtime_requests[index]);assert.ok(publicParentTokenRoleObservationProblems(bad).length);assert.equal(settleDi(bad,[]).result,'fail');rejected++;
  }
 }
}
assert.equal(rejected,60);
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(done.returncode,0,done.stderr)

    def test_exact_original_factory_owner_parameter_and_actual_public_object(self):
        code=r'''
import assert from 'node:assert/strict';
import {originalFactoryContract} from './scripts/api-surface.mjs';
import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {originalPublicParentTokenRole} from './scripts/api-public-parent-token-role.mjs';
import {expectedFactoryDi,runtimeTokenIdentity} from './scripts/api-di-observe.mjs';
function original(family,name){const originalFactory=originalFactoryContract('/original/src/material/'+family+'/'+(family==='legacy-menu'?'menu-trigger':name==='MatLegacyTextColumn'?'text-column':'cell')+'.ts',name);return {symbol_id:family+'/primary/'+name,family,kind:'primary',name,shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};}
const requests=[['legacy-menu','MatLegacyMenuTrigger','MatMenuItem'],['legacy-table','MatLegacyTextColumn','CdkTable'],['legacy-table','MatLegacyTextColumn','TEXT_COLUMN_OPTIONS'],...['MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell'].map(n=>['legacy-table',n,'CdkColumnDef'])];let positives=0,negatives=0;
for(const [family,name,token]of requests){
 const symbol=original(family,name),param=expectedFactoryDi(symbol.shape).find(p=>p.ident===token),role=originalPublicParentTokenRole(symbol,param);assert.ok(role);assert.equal(role.public_export,token);
 const object=class PublicToken{},owned=class OwnedAlias{},twin=class PublicToken{};
 const importer=async spec=>{assert.equal(spec,role.public_spec);return {[token]:object};};
 // Deliberately conflicting original alias names must not replace the public parent.
 const args=[family,param,{OWNED:owned},{[token]:['OWNED']}];
 assert.equal(await runtimeTokenIdentity(...args,object,importer,null,symbol),true);positives++;
 for(const value of [owned,twin,{},null]){assert.equal(await runtimeTokenIdentity(...args,value,importer,null,symbol),false);negatives++;}
 for(const loader of [async()=>({}),async()=>({[token]:null}),async()=>{throw Error('missing public peer');}]){assert.equal(await runtimeTokenIdentity(...args,object,loader,null,symbol),false);negatives++;}
 for(const change of [s=>s.shape.originalFactoryContext.parameter_factory_key='foreign',s=>s.shape.originalFactoryContext.factory_parameters[role.parameter_index].optional=!s.shape.originalFactoryContext.factory_parameters[role.parameter_index].optional,s=>s.shape.originalFactory.declaration+=' ',s=>s.name='Foreign']){
  const bad=structuredClone(symbol);change(bad);assert.throws(()=>originalPublicParentTokenRole(bad,param));negatives++;
 }
 for(const change of [p=>p.spec='@angular/material/menu',p=>p.imported='Foreign',p=>p.optional=!p.optional,p=>p.host=true]){const bad={...param};change(bad);assert.throws(()=>originalPublicParentTokenRole(symbol,bad));negatives++;}
 assert.equal(originalPublicParentTokenRole({...symbol,symbol_id:'foreign/primary/'+name},param),null);
 assert.equal(await runtimeTokenIdentity(...args,object,importer,null),false,'unauthenticated local parent must not receive a public role');negatives++;
}
assert.equal(positives,6);assert.equal(negatives,96);
for(const name of ['MatLegacyColumnDef','MatLegacyHeaderRowDef','MatLegacyFooterRowDef','MatLegacyRowDef']){
 const factory=originalFactoryContract('/original/src/material/legacy-table/'+(name==='MatLegacyColumnDef'?'cell':'row')+'.ts',name),symbol={symbol_id:'legacy-table/primary/'+name,family:'legacy-table',kind:'primary',name,shape:{originalFactory:factory,originalFactoryContext:originalCompilerFactoryContext(factory)}};
 const param=expectedFactoryDi(symbol.shape).find(p=>p.ident==='CDK_TABLE');assert.ok(param);assert.equal(originalPublicParentTokenRole(symbol,param),null);
}
console.log(JSON.stringify({positive:positives,rejected:negatives,removed_private_roles:0}));
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
