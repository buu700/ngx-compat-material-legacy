"""Artifact admission rejects forged owned-only aggregate measurements."""
import copy,hashlib,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_mixin_fixture import mixin_receipt
class OwnedAggregateContracts(unittest.TestCase):
    def test_original_membership_roster_and_measurement_roles(self):
        code=r'''
import assert from 'node:assert/strict';
import {ownedAggregateCatalog,ownedAggregateCaseIds} from './scripts/sass-owned-aggregates.mjs';
const catalog=ownedAggregateCatalog();assert.equal(ownedAggregateCaseIds().length,20);
assert.equal(new Set(ownedAggregateCaseIds()).size,20);
for(const probe of catalog.cases){
 assert.equal((probe.reference_call.match(/@include m.legacy-/g)||[]).length,22*probe.arguments.length);
 assert.ok(!probe.reference_call.includes('all-owned-component'));
 assert.equal((probe.call.match(/@include m.all-owned-component-/g)||[]).length,probe.arguments.length);
 for(const family of catalog.original_membership.families)assert.ok(probe.reference_call.includes('m.legacy-'+family+'-theme('));
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
    def test_all_cases_bind_distinct_original_and_candidate_programs(self):
        raw=(ROOT/'fixtures/sass/owned-aggregate-contracts.json').read_bytes();catalog=json.loads(raw)
        for line in ('main','21.x'):
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
            for probe in catalog['cases']:
                body=mixin_receipt(ROOT,active,'mixin-argument/all-component-themes/custom-full-theme','synthetic')
                for key in ('mixin','argument'):body.pop(key)
                body.update(probe);body['identity'].update(catalog='fixtures/sass/owned-aggregate-contracts.json',catalog_sha256=hashlib.sha256(raw).hexdigest())
                for role in ('expected','actual'):
                    call=probe['reference_call'] if role=='expected' else probe['call']
                    program="@use '__entry__' as m;\n"+catalog['setup']+'\n'+call+'\n'
                    body[role]['program_sha256']=hashlib.sha256(program.encode()).hexdigest()
                self.assertTrue(mixin_argument_assertion_ok(ROOT,active,body,'synthetic'),probe['case_id'])
                for key,value in [('case_id','owned-aggregate/missing'),('reference_call',probe['call']),('call',probe['reference_call']),('arguments',[]),('binding',{}),('mutation_rejected',False),('identity',{})]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic'),(probe['case_id'],key))
                wrong=copy.deepcopy(body);wrong['actual']=copy.deepcopy(body['expected']);self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic'))
                wrong=copy.deepcopy(body);wrong['expected']=copy.deepcopy(body['actual']);self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic'))
                wrong=copy.deepcopy(body);wrong['actual']['css']='wrong nonempty CSS';self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic'))
