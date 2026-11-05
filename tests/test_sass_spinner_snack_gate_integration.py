# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current gate contexts on an exact candidate fixture; no compiles or actual packed run."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
import sass_spinner_snack_gate_integration as gate
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from test_current_sass_source import candidate_fixture,NODE
import test_current_sass_spinner_snack_admission as direct_fixture
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_mixin_fixture import mixin_receipt
from sass_ordinary_aggregate_admission import insert_ordinary_checkbox_button_into_aggregate_model
from current_sass_card_aggregate import insert_card_into_aggregate_model

def measured(css):return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))

class SpinnerSnackGateIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-');cls.root=Path(cls.temp.name)
        cls.line=candidate_fixture(cls.root)
        paths=['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass_spinner_snack_gate_integration.py',
            'scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py',
            'scripts/sass-spinner-snack-bridge-contract.mjs','scripts/sass_spinner_snack_bridge_admission.py',
            'scripts/sass-spinner-snack-aggregate-contract.mjs','scripts/sass-default-aggregate-contract.mjs',
            'scripts/sass-ordinary-aggregate-contract.mjs','compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs',
            'scripts/current-sass-card-aggregate-contract.mjs','compatibility/rc/ordinary-card-public-bridge-model-v1.mjs',
            'scripts/sass-aggregate-color-theme-contract.mjs','scripts/sass-aggregate-typography-contract.mjs','scripts/sass-ripple-color-contract.mjs',*gate._DEPENDENCIES]
        for path in set(paths):
            dest=cls.root/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/path).read_bytes())
        cls.controls=dict(hook=None);cls.checks=[];cls.js_result=None
        def read(path):
            if cls.controls['hook'] is not None:
                hook,cls.controls['hook']=cls.controls['hook'],None;hook()
            return (cls.root/path).read_bytes()
        cls.context=gate.SpinnerSnackGateContext(cls.root,read=read)
        packet=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes());branch=packet['branches'][cls.line]
        direct=json.loads((ROOT/branch['observation']['path']).read_bytes());aggregate=json.loads((ROOT/('compatibility/rc/parent-spinner-snack-aggregate-integration-'+('21' if cls.line=='21.x' else 'main')+'-v1.json')).read_bytes())
        owner=direct_fixture.CurrentDirectTests();owner.context=CurrentSpinnerSnackContract(cls.root);owner.packet=packet;owner.line=cls.line;owner.branch=branch
        owner.catalog,owner.provenance,owner.lock=[json.loads((ROOT/packet[k]['path']).read_bytes()) for k in ['catalog','provenance','reference_lock']]
        seed=owner.model(direct['rows'][0]);cls.active=SimpleNamespace(**seed['active']);cls.invocation=seed['invocation'];descriptor=gate.spinner_snack_gate_descriptor(cls.context);cls.bodies=[]
        current_sources=next(iter(owner.context.source_sets.values()))
        for row in direct['rows']:
            body=owner.model(row)['body']
            if row['case_id'].startswith('mixin-argument/'):body.update(next(p for p in owner.catalog['cases'] if p['case_id']==row['case_id']))
            else:body.update(oracle=packet['oracle']['path'],oracle_sha256=packet['oracle']['sha256'],expected_sha256=body['expected']['css_sha256'],expected_bytes=body['expected']['css_bytes'],actual_sha256=body['actual']['css_sha256'],actual_bytes=body['actual']['css_bytes'],actual_measurement=copy.deepcopy(body['actual']))
            cls.bodies.append(body)
        for row in aggregate['rows']:
            case=row['case_id'];body=default_aggregate_receipt(cls.active,case,cls.invocation) if case.startswith('mixin-css/') else mixin_receipt(ROOT,cls.active,case,cls.invocation)
            ordinary_css=insert_ordinary_checkbox_button_into_aggregate_model(case_id=case,css=row['current']['css']);assert ordinary_css is not None
            current_css=insert_card_into_aggregate_model(case_id=case,css=ordinary_css);assert current_css is not None
            actual={**measured(current_css),'program_sha256':row['current']['logical_program_sha256'],'line':cls.line,'sass_version':branch['compiler'],'sources':copy.deepcopy(current_sources)}
            body.update(current_spinner_snack_bridge=copy.deepcopy(descriptor),error=None)
            if case.startswith('mixin-css/'):body.update(actual_measurement=actual,actual_sha256=actual['css_sha256'],actual_bytes=actual['css_bytes'])
            else:
                body['identity']['sass_version']=branch['compiler'];body['actual']=actual;body['mutation']=measured(actual['css']+'\n.wrong-nonempty-mixin { color: red; }\n')
            cls.bodies.append(body)

    @classmethod
    def tearDownClass(cls):
        if cls.js_result is not None and os.environ.get('CURRENT_SASS_SPINNER_SNACK_GATE_RECEIPT'):
            report=dict(schema_version=1,line=cls.line,python_controls=cls.checks,js=cls.js_result,actual_candidate_contexts=True,
                case_roster=gate.SPINNER_SNACK_GATE_CASES,modeled_packed_envelopes=True,prior_compiled_CSS_rows_reused=24,
                fresh_compiles=0,actual_packed_runs=0,broad_inventory_or_actual_coordinator_dispatch=False,workspace_product_changed=False,
                ordinary_CSS_browser_floor_fullowner_qualified=False,g11_claim='not-passed')
            path=ROOT/os.environ['CURRENT_SASS_SPINNER_SNACK_GATE_RECEIPT']
            assert path.parent==ROOT/'compatibility/rc' and path.name.startswith('current-sass-spinner-snack-gate-controls-') and path.suffix=='.json'
            assert not path.exists();path.write_text(json.dumps(report,indent=2)+'\n')
        cls.temp.cleanup()

    def accepts(self,body):return gate.spinner_snack_gate_assertion_ok(self.root,self.active,body,self.invocation,context=self.context)

    def test_all24_candidate_source_transport_cases(self):
        self.assertEqual({b['case_id'] for b in self.bodies},set(gate.SPINNER_SNACK_GATE_CASES));self.assertEqual(len(self.bodies),24)
        for body in self.bodies:
            self.assertTrue(self.accepts(body),body['case_id']);self.checks.append('current candidate source positive '+body['case_id'])

    def test_representative_envelope_source_and_css_failures(self):
        for body in [self.bodies[0],self.bodies[15],self.bodies[18]]:
            for kind in ['descriptor','run','artifact','css']:
                bad=copy.deepcopy(body)
                if kind=='descriptor':bad['current_spinner_snack_bridge']['source_modules'].pop()
                elif kind=='run':bad['run_id']='foreign'
                elif kind=='artifact':bad['tarball_sha256']='0'*64
                else:
                    actual=bad.get('actual',bad.get('actual_measurement'));actual.update(measured(actual['css']+'\n.foreign { color: red; }\n'))
                self.assertFalse(self.accepts(bad),(body['case_id'],kind));self.checks.append('reject '+kind+' '+body['case_id'])

    def test_representative_optional_metadata_and_callback_closure(self):
        body=copy.deepcopy(self.bodies[0])
        for key,value in [('line','foreign'),('sass_version','foreign compiler')]:
            bad=copy.deepcopy(body);bad['actual'][key]=value;bad['actual_measurement'][key]=value
            self.assertFalse(self.accepts(bad));self.checks.append('direct contradictory '+key+' rejects')
        live=copy.deepcopy(body);self.controls['hook']=lambda:live.__setitem__('current_spinner_snack_bridge',{})
        self.assertFalse(self.accepts(live));self.checks.append('live descriptor mutation rejects')
        fake=object.__new__(gate.SpinnerSnackGateContext)
        self.assertFalse(gate.spinner_snack_gate_assertion_ok(self.root,self.active,body,self.invocation,context=fake));self.checks.append('unregistered gate context rejects')

    def test_javascript_current_context_and_descriptor_parity(self):
        completed=subprocess.run([NODE,str(ROOT/'tests/sass_spinner_snack_gate_probe.mjs')],cwd=ROOT,input=json.dumps(dict(line=self.line,bodies=self.bodies,candidate_root=str(self.root),focused_current_context=True)),capture_output=True,text=True)
        self.assertEqual(completed.returncode,0,completed.stderr);report=json.loads(completed.stdout)
        self.assertEqual(report['descriptor'],gate.spinner_snack_gate_descriptor(self.context));self.assertEqual(len(report['controls']),30);self.assertEqual(report['actual_compiles'],0)
        type(self).js_result=report;self.checks.append('JS/Python canonical descriptor parity')

if __name__=='__main__':unittest.main()
