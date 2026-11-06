"""Whole historical prefixes,peer output and invocation/artifact bindings remain exact."""
import copy,hashlib,importlib.util,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_default_companion_admission import DEFAULT_COMPANION_CASES,default_companion_assertion_ok,default_companion_envelope_ok
from stepper_repaired_snapshot import repaired_default_companion_receipt as default_companion_receipt, repaired_stepper_css

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()));body.update(actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])

class DefaultCompanionContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,default_companion_receipt(active,case,'default-companion')

    def test_all_whole_models_reject_changed_owned_scope_and_peer_styles(self):
        for line in ['main','21.x']:
            for case,e in DEFAULT_COMPANION_CASES.items():
                active,body=self.receipt(line,case);self.assertTrue(default_companion_assertion_ok(body));self.assertTrue(default_companion_envelope_ok(active,body,'default-companion'))
                css=body['actual_measurement']['css'];peer=body['current_companion']['peer']['css']
                self.assertEqual(css,repaired_stepper_css((e['original_css']+e['separator'] if e['original_css'] else '')+peer,line))
                changes=[css+'\n.unrelated { color:red; }',css.replace('.sass-api-probe','.foreign-scope',1)]
                # Preserve syntactically valid CSS while dropping all owned rules
                # or changing the complete current contribution's declaration.
                if e['original_css']:changes.append(peer)
                import re
                found=re.search(r'\n  ([\w-]+): ([^;]+);',peer);self.assertIsNotNone(found)
                changed_peer=peer[:found.start()]+peer[found.start():].replace(found.group(0),'\n  '+found.group(1)+': initial;',1)
                changes.append((e['original_css']+e['separator'] if e['original_css'] else '')+changed_peer)
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed);self.assertFalse(default_companion_assertion_ok(wrong));self.assertFalse(default_companion_envelope_ok(active,wrong,'default-companion'))

    def test_scope_profile_peer_sources_and_run_library_binding_cannot_be_forged(self):
        for line in ['main','21.x']:
            for case in DEFAULT_COMPANION_CASES:
                active,body=self.receipt(line,case)
                for key,value in [('case_id','mixin-css/button-theme'),('expected_sha256','0'*64),('expected_bytes',-1),('expected_bytes',False),('line','foreign'),('comparison','historical-exact')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_companion_assertion_ok(wrong),key)
                for key,value in [('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(default_companion_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(default_companion_assertion_ok(wrong),key)
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0]['sha256']='0'*64;self.assertFalse(default_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/bridges/_m2-system.scss'];self.assertFalse(default_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];p['css']+='\n.unrelated {color:red}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(default_companion_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['current_infrastructure']=None;self.assertFalse(default_companion_assertion_ok(wrong))
                for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('oracle_sha256','0'*64),('result','fail'),('exit_code',1)]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_companion_envelope_ok(active,wrong,'default-companion'),key)

    def test_actual_coordinator_rejects_unknown_and_conflicting_metadata(self):
        spec=importlib.util.spec_from_file_location('default_companion_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            for case in DEFAULT_COMPANION_CASES:
                active,body=self.receipt(line,case);v.ACTIVE_RUN=active;self.assertTrue(v._sass_seal_assertion_ok(body,'default-companion'))
                wrong=copy.deepcopy(body);del wrong['current_companion'];self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-companion'))
                wrong=copy.deepcopy(body);wrong['case_id']='mixin-css/button-theme';self.assertFalse(v._sass_seal_assertion_ok(wrong,'default-companion'))

    def test_javascript_models_and_inventory_keep_all651_cases_and_fail_mutations(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {DEFAULT_COMPANION_CASES,DEFAULT_COMPANION_CONTRACT,defaultCompanionExpectedCss,defaultCompanionMeasurementOk,defaultCompanionResultsMatch} from './scripts/sass-default-companion-contract.mjs';
import {compareInventory,classifyPending} from './scripts/sass-api-inventory.mjs';
import {remeasureStepper} from './tests/stepper-repaired-snapshot.mjs';
const f=JSON.parse(readFileSync('tests/sass_default_companion_fixture.json')),c=JSON.parse(readFileSync('fixtures/sass/default-companion-contracts.json')),source=JSON.parse(readFileSync('tests/'+f.source_fixture)),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([n,e])=>[n,{css:'',sha256:e.invocation.css_sha256}]));
 for(const id of Object.keys(DEFAULT_COMPANION_CASES)){
  const saved=f.measurements[id+'-'+line],frozen={...saved,sources:source.source_sets[saved.source_set]},m=remeasureStepper(frozen,line),stored=f.peers[id+'-'+line],peer={...stored,sources:c.peer_inputs[stored.source_set].sources},contract={classification:'conforming-current-companion',contract:DEFAULT_COMPANION_CONTRACT,peer};
  const got={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_companion:contract};css[id.slice(10)]=got;
  if(m.css!==frozen.css)assert.equal(defaultCompanionResultsMatch(id,{css:frozen.css,sha256:frozen.css_sha256,actual_measurement:frozen,current_companion:contract},contract),false);
  assert.equal(defaultCompanionExpectedCss(id,peer),m.css);assert.ok(defaultCompanionMeasurementOk(id,m,line));assert.ok(defaultCompanionResultsMatch(id,got,contract));
  const changed=structuredClone(got);changed.css+='\n.unrelated {color:red}';changed.sha256=sha(changed.css);changed.actual_measurement.css=changed.css;changed.actual_measurement.css_sha256=changed.sha256;changed.actual_measurement.css_bytes=Buffer.byteLength(changed.css);assert.equal(defaultCompanionResultsMatch(id,changed,contract),false);
  const stale=structuredClone(got);stale.actual_measurement.css+='\n.stale {color:red}';stale.actual_measurement.css_sha256=sha(stale.actual_measurement.css);assert.equal(defaultCompanionResultsMatch(id,stale,contract),false);
  const p=structuredClone(peer);p.sources=[];assert.equal(defaultCompanionExpectedCss(id,p),null);
 }
 const staleGroups=[
  ['finite ordinary density aggregate differs',['all-component-densities']],
  ['finite ordinary controls default contract differs',['all-legacy-component-colors','all-legacy-component-themes','all-legacy-component-typographies','button-color','button-density','button-theme','button-typography','checkbox-color','checkbox-density','checkbox-theme','checkbox-typography','legacy-button-color','legacy-button-theme','legacy-button-typography','private-all-legacy-component-densities']],
  ['finite ordinary card default contract differs',['card-color','card-density','card-theme','card-typography']],
  ['finite private card comparison differs',['private-check-duplicate-theme-styles']],
  ['finite spinner/snack default contract differs',['progress-spinner-color','progress-spinner-theme','snack-bar-color','snack-bar-theme','snack-bar-typography']]
 ];
 const stale=Object.fromEntries(staleGroups.flatMap(([reason,names])=>names.map(name=>['mixin-css/'+name,reason])));
 assert.equal(Object.keys(stale).length,26);
 for(const id of Object.keys(stale))assert.deepEqual(Object.keys(css[id.slice(10)]).sort(),['css','sha256']);
 const results=compareInventory(o,o.members,css);assert.equal(results.length,651);
 assert.deepEqual(Object.fromEntries(results.filter(r=>r.result!=='pass').map(r=>[r.case_id,r.reason])),stale);
 assert.equal(results.filter(r=>r.result==='pass').length,625);
 for(const id of Object.keys(DEFAULT_COMPANION_CASES)){
  const changed={...css,[id.slice(10)]:{...css[id.slice(10)],css:css[id.slice(10)].css+'\n.unrelated {color:red}'}};changed[id.slice(10)].sha256=sha(changed[id.slice(10)].css);
  const changedResults=classifyPending(compareInventory(o,o.members,changed),{decisions:[]});
  assert.deepEqual(changedResults.filter(r=>r.result!=='pass').map(r=>r.case_id).sort(),[...Object.keys(stale),id].sort());
  for(const [staleId,reason] of Object.entries(stale))assert.equal(changedResults.find(r=>r.case_id===staleId).reason,reason);
 }
 const foreign={...css,'button-theme':{...css['button-theme'],current_companion:css['badge-color'].current_companion}};assert.ok(compareInventory(o,o.members,foreign).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));
 const conflicting={...css,'badge-color':{...css['badge-color'],current_infrastructure:null}};assert.ok(compareInventory(o,o.members,conflicting).some(r=>r.case_id==='mixin-css/badge-color'&&r.result==='fail'));
}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
