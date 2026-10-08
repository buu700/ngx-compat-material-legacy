"""Whole aggregate output,hierarchy,default profiles and artifact bindings stay exact."""
import copy,hashlib,importlib.util,json,re,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_default_aggregate_admission import DEFAULT_AGGREGATE_CASES,default_aggregate_assertion_ok,default_aggregate_envelope_ok
from sass_default_aggregate_fixture import default_aggregate_receipt

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()));body.update(actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])

class DefaultAggregateContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,default_aggregate_receipt(active,case,'default-aggregate')

    def test_whole_owned_prefix_hierarchy_motion_dimensions_and_scope_are_preserved(self):
        for line in ['main','21.x']:
            for case,e in DEFAULT_AGGREGATE_CASES.items():
                active,body=self.receipt(line,case);self.assertTrue(default_aggregate_assertion_ok(body));self.assertTrue(default_aggregate_envelope_ok(active,body,'default-aggregate'))
                css=body['actual_measurement']['css'];changes=[css+'\n.unrelated { color:red; }',css.replace('.sass-api-probe','.foreign-scope',1)]
                found=re.search(r'\n  ([\w-]+): ([^;\n]+);',css);self.assertIsNotNone(found)
                changes.append(css[:found.start()]+css[found.start():].replace(found.group(0),'\n  '+found.group(1)+': initial;',1))
                # Remove a complete syntactically valid block and recompute the hash.
                block=re.search(r'(?m)^\.sass-api-probe[^{}]* \{\n[^{}]*\n\}',css);self.assertIsNotNone(block)
                changes.append(css[:block.start()]+css[block.end():])
                self.assertIn('var(--mat-tree-',css)
                changes.append(css.replace('var(--mat-tree-','var(--changed-tree-',1))
                if e['profile'].startswith('typography'):
                    self.assertTrue(e['call'].endswith('(); }'))
                    self.assertIn('.mat-typography',css)
                    changes.append(css.replace('.mat-typography','.lost-hierarchy',1))
                elif e['profile'] in ['colors','themes']:
                    self.assertIn('.cdk-high-contrast-active',css)
                    changes.extend([css.replace('.cdk-high-contrast-active','.lost-accessibility',1),css.replace('transform: scale(0.6);','transform: scale(1);',1)])
                    if e['profile']=='themes':changes.append(css.replace('padding: 8px;','padding: 9px;',1))
                    if case in ['mixin-css/all-component-colors','mixin-css/all-component-themes']:
                        for token in ['state-layer-color','hover-state-layer-opacity','focus-state-layer-opacity']:
                            changes.append(re.sub(r'(--mat-form-field-'+token+r':) [^;]+;',r'\1 initial;',css))
                        block=re.search(r'(?m)^\.sass-api-probe \{\n  --mat-form-field-state-layer-color:[^{}]+\n\}',css);self.assertIsNotNone(block)
                        changes.extend([css[:block.start()]+css[block.end():],css[:block.start()]+css[block.end():]+'\n'+block[0]])
                    else:self.assertNotIn('--mat-form-field-hover-state-layer-opacity:',css)
                else:
                    self.assertIn('var(--mat-tree-node-min-height, 48px)',css)
                    changes.append(css.replace('var(--mat-tree-node-min-height, 48px)','var(--mat-tree-node-min-height, 40px)',1))
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed);self.assertFalse(default_aggregate_assertion_ok(wrong));self.assertFalse(default_aggregate_envelope_ok(active,wrong,'default-aggregate'))

    def test_profile_original_peer_sources_and_run_library_identity_cannot_be_forged(self):
        for line in ['main','21.x']:
            for case,e in DEFAULT_AGGREGATE_CASES.items():
                active,body=self.receipt(line,case)
                for key,value in [('case_id','mixin-css/button-theme'),('expected_sha256','0'*64),('expected_bytes',False),('actual_bytes',False),('line','foreign'),('comparison','historical-exact')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_aggregate_assertion_ok(wrong),key)
                for key,value in [('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(default_aggregate_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(default_aggregate_assertion_ok(wrong),key)
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0]['sha256']='0'*64;self.assertFalse(default_aggregate_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!=e['source_path']];self.assertFalse(default_aggregate_assertion_ok(wrong))
                if case=='mixin-css/private-all-legacy-component-densities':
                    wrong=copy.deepcopy(body);next(s for s in wrong['actual_measurement']['sources'] if s['root']==0 and s['path']==e['source_path'])['sha256']='0'*64;self.assertFalse(default_aggregate_assertion_ok(wrong))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];p['css']+='\n.unrelated {color:red}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(default_aggregate_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['current_infrastructure']=None;self.assertFalse(default_aggregate_assertion_ok(wrong))
                for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('oracle_sha256','0'*64),('result','fail'),('exit_code',1)]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_aggregate_envelope_ok(active,wrong,'default-aggregate'),key)
            a='mixin-css/all-component-typographies';b='mixin-css/all-legacy-component-typographies'
            _,left=self.receipt(line,a);_,right=self.receipt(line,b);wrong=copy.deepcopy(right);wrong['current_companion']['peer']=left['current_companion']['peer'];self.assertFalse(default_aggregate_assertion_ok(wrong))
            wrong=copy.deepcopy(right);rehash(wrong,left['actual_measurement']['css']);self.assertFalse(default_aggregate_assertion_ok(wrong))

    def test_actual_coordinator_requires_the_complete_finite_contract(self):
        spec=importlib.util.spec_from_file_location('default_aggregate_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            for case in DEFAULT_AGGREGATE_CASES:
                active,body=self.receipt(line,case);v.ACTIVE_RUN=active;self.assertTrue(v._sass_seal_assertion_ok(body,'default-aggregate'))
                wrong=copy.deepcopy(body);del wrong['current_companion'];self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-aggregate'))
                wrong=copy.deepcopy(body);wrong['case_id']='mixin-css/button-theme';self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-aggregate'))

    def test_javascript_models_keep_all651_ids_and_reject_each_rehashed_mutation(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {DEFAULT_AGGREGATE_CASES,DEFAULT_AGGREGATE_CONTRACT,defaultAggregateExpectedCss,defaultAggregateMeasurementOk,defaultAggregateResultsMatch} from './scripts/sass-default-aggregate-contract.mjs';
import {compareInventory,classifyPending} from './scripts/sass-api-inventory.mjs';
const f=JSON.parse(readFileSync('tests/sass_default_aggregate_fixture.json')),c=JSON.parse(readFileSync('fixtures/sass/default-aggregate-contracts.json')),source=JSON.parse(readFileSync('tests/'+f.source_fixture)),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([n,e])=>[n,{css:'',sha256:e.invocation.css_sha256}]));
 for(const [id,e] of Object.entries(DEFAULT_AGGREGATE_CASES)){
  const saved=f.measurements[id+'-'+line],selected=saved.source_fixture?JSON.parse(readFileSync('tests/'+saved.source_fixture)):source,m={...saved,sources:selected.source_sets[saved.source_set]},stored=f.peers[e.profile+'-'+line],peer={...stored,sources:c.peer_inputs[line].sources},contract={classification:'conforming-current-companion',contract:DEFAULT_AGGREGATE_CONTRACT,peer};
  const got={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_companion:contract};css[id.slice(10)]=got;
  assert.equal(defaultAggregateExpectedCss(id,peer),m.css);assert.ok(defaultAggregateMeasurementOk(id,m,line));assert.ok(defaultAggregateResultsMatch(id,got,contract));
  const changed=structuredClone(got);changed.css+='\n.unrelated {color:red}';changed.sha256=sha(changed.css);changed.actual_measurement.css=changed.css;changed.actual_measurement.css_sha256=changed.sha256;changed.actual_measurement.css_bytes=Buffer.byteLength(changed.css);assert.equal(defaultAggregateResultsMatch(id,changed,contract),false);
  const p=structuredClone(peer);p.sources=[];assert.equal(defaultAggregateExpectedCss(id,p),null);
 }
 const results=compareInventory(o,o.members,css);assert.equal(results.length,651);assert.ok(results.every(r=>r.result==='pass'));
 for(const id of Object.keys(DEFAULT_AGGREGATE_CASES)){
  const changed={...css,[id.slice(10)]:{...css[id.slice(10)],css:css[id.slice(10)].css+'\n.unrelated {color:red}'}};changed[id.slice(10)].sha256=sha(changed[id.slice(10)].css);
  assert.deepEqual(classifyPending(compareInventory(o,o.members,changed),{decisions:[]}).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
 }
 const any=css['all-component-themes'].current_companion;
 const unknown={...css,'button-theme':{...css['button-theme'],current_companion:any}};assert.ok(compareInventory(o,o.members,unknown).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));
 const conflicting={...css,'all-component-themes':{...css['all-component-themes'],current_infrastructure:null}};assert.ok(compareInventory(o,o.members,conflicting).some(r=>r.case_id==='mixin-css/all-component-themes'&&r.result==='fail'));
}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
