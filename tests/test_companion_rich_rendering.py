"""Rich companion input contexts must be measured, including narrow-only bindings."""
from pathlib import Path
import subprocess,json,unittest
ROOT=Path(__file__).resolve().parents[1]
def node(body):
    code="import * as cases from './scripts/companion-computed-cases.mjs'; const out=(x)=>console.log(JSON.stringify(x));\n"+body
    result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
    if result.returncode: raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class RichRenderedScenarioTests(unittest.TestCase):
    def test_rich_inputs_and_all_consumers_are_required(self):
        result=node("""
import assert from 'node:assert/strict';
assert.equal(cases.RICH_THEME_IDS.length,4);
for(const id of cases.RICH_THEME_IDS){
 const theme=cases.THEMES[id];
 assert.deepEqual(theme.primary,['indigo','700','200','900','300']);
 assert.deepEqual(theme.warn,['red','900']);
 assert.equal(theme.density,'-2');
 assert.equal(theme.customTypography,true);
 for(const binding of cases.BINDINGS)assert.ok(binding.scenarios.includes(id)||binding.scenarios.includes('narrow-'+id));
}
const candidate=cases.candidateScss(),oracle=cases.oracleScss();
for(const source of [candidate,oracle])assert.ok(source.includes('19px, 27px, 600')&&source.includes('Closeout Font')&&source.includes('0.03em'));
for(const family of cases.COMPANIONS) assert.ok(candidate.includes(`@include legacy.${family}-theme(`));
assert.ok(candidate.includes('.ccs-bridge-light')&&candidate.includes('legacy.all-current-companion-bridges'));
assert.ok(candidate.includes('legacy.define-typography-level'));
assert.ok(!candidate.includes('m2-define-typography-level'));
assert.ok(oracle.includes('mat.m2-define-typography-level'));
const binding=cases.BINDINGS.find(b=>b.scenarios.includes(cases.RICH_THEME_IDS[0]));
const sentinel=cases.sentinelTable([binding])[binding.token];
const observed={found:true,value:'rgb(1, 2, 3)',token_value:'rgb(1, 2, 3)'};
const obs={oracle:Object.fromEntries(binding.scenarios.map(id=>[id,observed])),candidate:Object.fromEntries(binding.scenarios.map(id=>[id,observed])),bridge:Object.fromEntries(binding.scenarios.map(id=>[id,observed])),negative:{found:true,value:sentinel.marker,token_value:sentinel.value}};
assert.equal(cases.assessCase(binding,obs,sentinel).result,'pass');
obs.candidate[cases.RICH_THEME_IDS[0]]={...observed,value:'rgb(7, 8, 9)'};
assert.equal(cases.assessCase(binding,obs,sentinel).result,'fail');
delete obs.candidate[cases.RICH_THEME_IDS[0]];
assert.equal(cases.assessCase(binding,obs,sentinel).result,'fail');
obs.candidate[cases.RICH_THEME_IDS[0]]=observed;
obs.bridge[cases.RICH_THEME_IDS[0]]={...observed,value:'rgb(7, 8, 9)'};
assert.equal(cases.assessCase(binding,obs,sentinel).result,'fail');
delete obs.bridge[cases.RICH_THEME_IDS[0]];
assert.equal(cases.assessCase(binding,obs,sentinel).result,'fail');
out(true);
""")
        self.assertTrue(result)
