"""Whole owned CSS,public peer provenance and run/library bindings must hold."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_default_core_cdk_admission import DEFAULT_CORE_CDK_CASES,default_core_cdk_assertion_ok,default_core_cdk_envelope_ok
from sass_default_core_cdk_fixture import default_core_receipt

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
    body.update(actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])

class DefaultCoreCdkContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,default_core_receipt(active,case,'core')

    def test_complete_css_rejects_rehashed_owned_motion_focus_and_infrastructure_defects(self):
        for line in ['main','21.x']:
            for case in DEFAULT_CORE_CDK_CASES:
                active,body=self.receipt(line,case);self.assertTrue(default_core_cdk_assertion_ok(body));self.assertTrue(default_core_cdk_envelope_ok(active,body,'core'))
                css=body['actual_measurement']['css'];changes=[css+'\n.unrelated {color:red}',css.replace('forced-colors: active','forced-colors: none',1),css.replace('.cdk-high-contrast-active','.removed-class',1)]
                if case.endswith('/core') or case.endswith('/legacy-core') or case.endswith('/ripple'):
                    changes.extend([css.replace('scale3d(0, 0, 0)','scale3d(1, 1, 1)',1),css.replace('transition: opacity, transform 0ms','transition: opacity, transform 99ms',1),css.replace('display: none','display: block',1)])
                if case.endswith('/core') or case.endswith('/legacy-core'):
                    changes.extend([css.replace('.cdk-overlay-container','.changed-overlay-container',1),css.replace('transition-duration: 1ms','transition-duration: 99ms',1),css.replace('touch-action: manipulation','touch-action: none',1)])
                if not case.endswith('/ripple') and 'submenu-icon' not in case:
                    changes.extend([css.replace('border-width, 3px','border-width, 9px',1),css.replace('--mat-focus-indicator-display: block','--mat-focus-indicator-display: none',1)])
                if 'submenu-icon' in case:changes.extend([css.replace('right: 16px','right: 99px',1),css.replace('fill: CanvasText','fill: transparent',1),css.replace('scaleX(-1)','scaleX(1)',1)])
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed)
                    self.assertFalse(default_core_cdk_assertion_ok(wrong));self.assertFalse(default_core_cdk_envelope_ok(active,wrong,'core'))

    def test_wrong_scope_program_source_floor_and_run_bindings_are_rejected(self):
        for line in ['main','21.x']:
            for case in DEFAULT_CORE_CDK_CASES:
                active,body=self.receipt(line,case)
                for key,value in [('case_id','mixin-css/button-theme'),('expected_sha256','0'*64),('expected_bytes',0),('line','foreign'),('comparison','historical-exact')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_core_cdk_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(default_core_cdk_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_infrastructure']['peer'][key]=value;self.assertFalse(default_core_cdk_assertion_ok(wrong),key)
                for source in body['current_infrastructure']['peer']['sources']:
                    wrong=copy.deepcopy(body);wrong['current_infrastructure']['peer']['sources'].remove(source);self.assertFalse(default_core_cdk_assertion_ok(wrong),source['path'])
                wrong=copy.deepcopy(body);p=wrong['current_infrastructure']['peer'];p['css']+='\n.unrelated {color:red}';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(default_core_cdk_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/core/style/_high-contrast.scss'];self.assertFalse(default_core_cdk_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['current_infrastructure']['classification']='approved-exception';self.assertFalse(default_core_cdk_assertion_ok(wrong))
                for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('oracle_sha256','0'*64),('result','fail'),('exit_code',1)]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(default_core_cdk_envelope_ok(active,wrong,'core'),key)

    def test_coordinator_checks_the_finite_scope_and_rejects_foreign_metadata(self):
        spec=importlib.util.spec_from_file_location('core_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            for case in DEFAULT_CORE_CDK_CASES:
                active,body=self.receipt(line,case);v.ACTIVE_RUN=active
                self.assertTrue(v._sass_seal_assertion_ok(body,'core'))
                wrong=copy.deepcopy(body);rehash(wrong,wrong['actual_measurement']['css']+'\n.unrelated {color:red}');self.assertFalse(v._sass_seal_assertion_ok(wrong,'core'))
                wrong=copy.deepcopy(body);wrong['case_id']='mixin-css/button-theme';self.assertFalse(v._sass_seal_assertion_ok(wrong,'core'))
                wrong=copy.deepcopy(body);del wrong['current_infrastructure'];self.assertFalse(v._sass_seal_assertion_ok(wrong,'core'))

    def test_javascript_compares_all_cases_and_keeps_owned_defects_failed(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {DEFAULT_CORE_CDK_CASES,DEFAULT_CORE_CDK_CONTRACT,defaultCoreCdkExpectedCss,defaultCoreCdkResultsMatch,defaultCoreCdkMeasurementOk} from './scripts/sass-default-core-cdk-contract.mjs';
import {compareInventory,classifyPending} from './scripts/sass-api-inventory.mjs';
const f=JSON.parse(readFileSync('tests/sass_default_core_cdk_fixture.json')),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([n,e])=>[n,{css:'',sha256:e.invocation.css_sha256}]));
 for(const id of Object.keys(DEFAULT_CORE_CDK_CASES)){
  const stored=f.measurements[id+'-'+line],m={...stored,sources:f.source_sets[stored.source_set]},peer=f.peers[line],contract={classification:'conforming-current-infrastructure',contract:DEFAULT_CORE_CDK_CONTRACT,peer};
  const got={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_infrastructure:contract};
  assert.equal(defaultCoreCdkExpectedCss(id,peer),m.css);assert.ok(defaultCoreCdkResultsMatch(id,got,contract));assert.ok(defaultCoreCdkMeasurementOk(id,m,line));
  css[id.slice(10)]=got;
  const wrong=structuredClone(got);wrong.css+='\n.unrelated {color:red}';wrong.sha256=sha(wrong.css);wrong.actual_measurement.css=wrong.css;wrong.actual_measurement.css_sha256=wrong.sha256;wrong.actual_measurement.css_bytes=Buffer.byteLength(wrong.css);
  assert.equal(defaultCoreCdkResultsMatch(id,wrong,contract),false);
  const empty=structuredClone(peer);empty.sources=[];assert.equal(defaultCoreCdkExpectedCss(id,empty),null);
 }
 const results=compareInventory(o,o.members,css);assert.equal(results.length,651);assert.ok(results.every(r=>r.result==='pass'));
 for(const id of Object.keys(DEFAULT_CORE_CDK_CASES)){
  const wrong=structuredClone(css);wrong[id.slice(10)].css+='\n.unrelated {color:red}';wrong[id.slice(10)].sha256=sha(wrong[id.slice(10)].css);
  const failures=classifyPending(compareInventory(o,o.members,wrong),{decisions:[]}).filter(r=>r.result!=='pass');assert.deepEqual(failures.map(r=>r.case_id),[id]);assert.equal(failures[0].status,'unexplained-failure');
 }
 const foreign=structuredClone(css);foreign['button-theme'].current_infrastructure=css.core.current_infrastructure;
 assert.ok(compareInventory(o,o.members,foreign).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));
}
'''
        r=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
