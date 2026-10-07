"""Whole historical prefixes,peer output and invocation/artifact bindings remain exact."""
import copy,hashlib,importlib.util,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_default_mapped_companion_admission import DEFAULT_MAPPED_COMPANION_CASES,default_mapped_companion_assertion_ok,default_mapped_companion_envelope_ok
from sass_default_mapped_companion_fixture import default_mapped_companion_receipt

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()));body.update(actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])

class DefaultMappedCompanionContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,default_mapped_companion_receipt(active,case,'default-mapped-companion')

    def test_all_whole_models_reject_changed_fallbacks_motion_scope_and_peer_styles(self):
        for line in ['main','21.x']:
            for case,e in DEFAULT_MAPPED_COMPANION_CASES.items():
                active,body=self.receipt(line,case);self.assertTrue(default_mapped_companion_assertion_ok(body));self.assertTrue(default_mapped_companion_envelope_ok(active,body,'default-mapped-companion'))
                css=body['actual_measurement']['css'];peer=body['current_companion']['peer']['css']
                changes=[css+'\n.unrelated { color:red; }',css.replace('.sass-api-probe','.foreign-scope',1),peer]
                if e['family']=='sort':
                    self.assertIn('var(--mat-sort-arrow-color, rgb(46%, 46%, 46%))',css)
                    changes.append(css.replace('rgb(46%, 46%, 46%)','red',1))
                elif e['family']=='tree':
                    self.assertTrue(css.endswith(peer))
                    if e['dimension'] in ['theme','typography']:
                        self.assertIn('font-family: Roboto, sans-serif;',css)
                        changes.append(css.replace('font-family: Roboto, sans-serif;','font-family: Custom Family;',1))
                    if e['dimension'] in ['theme','density']:
                        self.assertIn('var(--mat-tree-node-min-height, 48px)',css)
                        changes.append(css.replace('var(--mat-tree-node-min-height, 48px)','var(--mat-tree-node-min-height, 40px)',1))
                    if e['dimension'] in ['theme','color']:changes.append(css.replace('var(--mat-tree-container-background-color, white)','var(--mat-tree-container-background-color, black)',1))
                elif e['family']=='badge':
                    self.assertIn('.cdk-high-contrast-active .sass-api-probe .mat-badge-content',css)
                    self.assertIn('@media (forced-colors: active)',css)
                    self.assertIn('var(--mat-badge-container-shape, 50%)',css)
                    self.assertIn('var(--mat-badge-legacy-container-size, 22px)',css)
                    changes.extend([css.replace('.cdk-high-contrast-active','.lost-accessibility',1),css.replace('var(--mat-badge-container-shape, 50%)','var(--mat-badge-container-shape, 0)',1),css.replace('var(--mat-badge-legacy-container-size, 22px)','var(--mat-badge-legacy-container-size, 19px)',1),css.replace('transform: scale(0.6);','transform: scale(1);',1)])
                elif e['family']=='datepicker':
                    self.assertIn('--mdc-icon-button-state-layer-size: 40px;',css)
                    self.assertIn('padding: 8px;',css)
                    self.assertIn('display: var(--mat-icon-button-touch-target-display, none);',css)
                    changes.extend([css.replace('--mdc-icon-button-state-layer-size: 40px;','--mdc-icon-button-state-layer-size: 41px;',1),css.replace('padding: 8px;','padding: 9px;',1),css.replace('display: var(--mat-icon-button-touch-target-display, none);','display: var(--mat-icon-button-touch-target-display, block);',1)])
                else:
                    import re
                    # Stripping only the six aliases reconstructs the untouched reference.
                    self.assertEqual(re.sub(r'^  --mat-progress-bar-(?:active-indicator|track)-color: [^;]+;\n','',css,flags=re.M),e['original_css'])
                    changes.extend([css.replace('mdc-linear-progress-buffering','changed-motion',1),css.replace('background-color: ButtonBorder;','background-color: red;',1),re.sub(r'^    background-image: [^\n]+;\n','',css,count=1,flags=re.M),css.replace('--mat-progress-bar-active-indicator-color: #3f51b5;','--mat-progress-bar-active-indicator-color: red;',1)])
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed);self.assertFalse(default_mapped_companion_assertion_ok(wrong));self.assertFalse(default_mapped_companion_envelope_ok(active,wrong,'default-mapped-companion'))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];p['css']+='\n.unrelated { color:red; }';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());rehash(wrong,css+'\n.unrelated { color:red; }');self.assertFalse(default_mapped_companion_assertion_ok(wrong))

    def test_scope_profile_peer_sources_and_run_library_binding_cannot_be_forged(self):
        for line in ['main','21.x']:
            for case in DEFAULT_MAPPED_COMPANION_CASES:
                active,body=self.receipt(line,case)
                for key,value in [('actual_bytes',False),('case_id','mixin-css/button-theme'),('expected_sha256','0'*64),('expected_bytes',-1),('expected_bytes',False),('line','foreign'),('comparison','historical-exact')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_mapped_companion_assertion_ok(wrong),key)
                for key,value in [('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(default_mapped_companion_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(default_mapped_companion_assertion_ok(wrong),key)
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0]['sha256']='0'*64;self.assertFalse(default_mapped_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/bridges/_m2-system.scss'];self.assertFalse(default_mapped_companion_assertion_ok(wrong))
                if case=='mixin-css/badge-theme':
                    wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/core/style/_high-contrast.scss'];self.assertFalse(default_mapped_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];p['css']+='\n.unrelated {color:red}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(default_mapped_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['current_infrastructure']=None;self.assertFalse(default_mapped_companion_assertion_ok(wrong))
                for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('oracle_sha256','0'*64),('result','fail'),('exit_code',1)]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_mapped_companion_envelope_ok(active,wrong,'default-mapped-companion'),key)

    def test_actual_coordinator_rejects_unknown_and_conflicting_metadata(self):
        spec=importlib.util.spec_from_file_location('default_mapped_companion_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            for case in DEFAULT_MAPPED_COMPANION_CASES:
                active,body=self.receipt(line,case);v.ACTIVE_RUN=active;self.assertTrue(v._sass_seal_assertion_ok(body,'default-mapped-companion'))
                wrong=copy.deepcopy(body);del wrong['current_companion'];self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-mapped-companion'))
                wrong=copy.deepcopy(body);wrong['case_id']='mixin-css/button-theme';self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-mapped-companion'))

    def test_javascript_models_and_inventory_keep_all651_cases_and_fail_mutations(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {DEFAULT_MAPPED_COMPANION_CASES,DEFAULT_MAPPED_COMPANION_CONTRACT,defaultMappedCompanionExpectedCss,defaultMappedCompanionMeasurementOk,defaultMappedCompanionResultsMatch} from './scripts/sass-default-mapped-companion-contract.mjs';
import {compareInventory,classifyPending} from './scripts/sass-api-inventory.mjs';
const f=JSON.parse(readFileSync('tests/sass_default_mapped_companion_fixture.json')),c=JSON.parse(readFileSync('fixtures/sass/default-mapped-companion-contracts.json')),source=JSON.parse(readFileSync('tests/'+f.source_fixture)),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([n,e])=>[n,{css:'',sha256:e.invocation.css_sha256}]));
 for(const id of Object.keys(DEFAULT_MAPPED_COMPANION_CASES)){
  const saved=f.measurements[id+'-'+line],m={...saved,sources:source.source_sets[saved.source_set]},stored=f.peers[id+'-'+line],peer={...stored,sources:c.peer_inputs[stored.source_set].sources},contract={classification:'conforming-current-companion',contract:DEFAULT_MAPPED_COMPANION_CONTRACT,peer};
  const got={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_companion:contract};css[id.slice(10)]=got;
  assert.equal(defaultMappedCompanionExpectedCss(id,peer),m.css);assert.ok(defaultMappedCompanionMeasurementOk(id,m,line));assert.ok(defaultMappedCompanionResultsMatch(id,got,contract));
  const changed=structuredClone(got);changed.css+='\n.unrelated {color:red}';changed.sha256=sha(changed.css);changed.actual_measurement.css=changed.css;changed.actual_measurement.css_sha256=changed.sha256;changed.actual_measurement.css_bytes=Buffer.byteLength(changed.css);assert.equal(defaultMappedCompanionResultsMatch(id,changed,contract),false);
  const stale=structuredClone(got);stale.actual_measurement.css+='\n.stale {color:red}';stale.actual_measurement.css_sha256=sha(stale.actual_measurement.css);assert.equal(defaultMappedCompanionResultsMatch(id,stale,contract),false);
  const p=structuredClone(peer);p.sources=[];assert.equal(defaultMappedCompanionExpectedCss(id,p),null);
 }
 const results=compareInventory(o,o.members,css);assert.equal(results.length,651);assert.ok(results.every(r=>r.result==='pass'));
 for(const id of Object.keys(DEFAULT_MAPPED_COMPANION_CASES)){
  const changed={...css,[id.slice(10)]:{...css[id.slice(10)],css:css[id.slice(10)].css+'\n.unrelated {color:red}'}};changed[id.slice(10)].sha256=sha(changed[id.slice(10)].css);
  assert.deepEqual(classifyPending(compareInventory(o,o.members,changed),{decisions:[]}).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
 }
 const foreign={...css,'button-theme':{...css['button-theme'],current_companion:css['sort-color'].current_companion}};assert.ok(compareInventory(o,o.members,foreign).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));
 for(const field of ['current_companion','current_infrastructure']){const unknown={...css,'button-theme':{...css['button-theme'],[field]:null}};assert.ok(compareInventory(o,o.members,unknown).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));}
 const conflicting={...css,'sort-color':{...css['sort-color'],current_infrastructure:null}};assert.ok(compareInventory(o,o.members,conflicting).some(r=>r.case_id==='mixin-css/sort-color'&&r.result==='fail'));
}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
