"""Modeled gate transport of existing source observations; no packed/runtime claim."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import subprocess
from types import SimpleNamespace
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from sass_spinner_snack_gate_integration import SpinnerSnackGateContext,spinner_snack_gate_descriptor
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_mixin_fixture import mixin_receipt
import test_sass_spinner_snack_bridge_admission as direct_fixture

def measured(css):
    return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))

class SpinnerSnackGateIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context=SpinnerSnackGateContext(ROOT)
        cls.line=cls.context.line
        packet=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
        branch=packet['branches'][cls.line]
        direct=json.loads((ROOT/branch['observation']['path']).read_bytes())
        aggregate=json.loads((ROOT/('compatibility/rc/parent-spinner-snack-aggregate-integration-'+('21' if cls.line=='21.x' else 'main')+'-v1.json')).read_bytes())
        owner=direct_fixture.SpinnerSnackBridgeAdmissionTests()
        owner.packet=packet;owner.line=cls.line;owner.branch=branch
        owner.catalog=json.loads((ROOT/packet['catalog']['path']).read_bytes())
        owner.provenance=json.loads((ROOT/packet['provenance']['path']).read_bytes())
        owner.lock=json.loads((ROOT/packet['reference_lock']['path']).read_bytes())
        seed=owner.model(direct['rows'][0]);cls.active=SimpleNamespace(**seed['active']);cls.invocation=seed['invocation']
        descriptor=spinner_snack_gate_descriptor(cls.context);cls.bodies=[]
        for row in direct['rows']:
            body=owner.model(row)['body']
            if row['case_id'].startswith('mixin-argument/'):
                body.update(next(p for p in owner.catalog['cases'] if p['case_id']==row['case_id']))
            else:
                body.update(oracle=packet['oracle']['path'],oracle_sha256=packet['oracle']['sha256'],expected_sha256=body['expected']['css_sha256'],expected_bytes=body['expected']['css_bytes'],actual_sha256=body['actual']['css_sha256'],actual_bytes=body['actual']['css_bytes'],actual_measurement=copy.deepcopy(body['actual']))
            cls.bodies.append(body)
        for row in aggregate['rows']:
            case=row['case_id']
            body=default_aggregate_receipt(cls.active,case,cls.invocation) if case.startswith('mixin-css/') else mixin_receipt(ROOT,cls.active,case,cls.invocation)
            actual={**measured(row['current']['css']),'program_sha256':row['current']['logical_program_sha256'],'line':cls.line,'sass_version':branch['compiler'],'sources':copy.deepcopy(next(iter(branch['source_sets'].values())))}
            body.update(current_spinner_snack_bridge=copy.deepcopy(descriptor),error=None)
            if case.startswith('mixin-css/'):
                body.update(actual_measurement=actual,actual_sha256=actual['css_sha256'],actual_bytes=actual['css_bytes'])
            else:
                body['identity']['sass_version']=branch['compiler'];body['actual']=actual
                body['mutation']=measured(actual['css']+'\n.wrong-nonempty-mixin { color: red; }\n')
            cls.bodies.append(body)
        spec=importlib.util.spec_from_file_location('spinner_snack_actual_coordinator',ROOT/'scripts/rc-verify.py')
        cls.coordinator=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.coordinator)
        cls.coordinator.ACTIVE_RUN=cls.active

    def test_actual_dispatcher_preserves_all24_selected_transport_cases(self):
        self.assertEqual(len(self.bodies),24)
        self.assertEqual(len({b['case_id'] for b in self.bodies}),24)
        for body in self.bodies:
            self.assertTrue(self.coordinator._sass_seal_assertion_ok(body,self.invocation),body['case_id'])
            if body['case_id'].startswith('mixin-argument/'):
                self.assertTrue(mixin_argument_assertion_ok(ROOT,self.active,body,self.invocation),body['case_id'])

    def test_actual_dispatcher_rejects_missing_source_and_independent_run_mutations(self):
        selected=[self.bodies[0],next(b for b in self.bodies if b['case_id']=='mixin-css/all-component-colors'),next(b for b in self.bodies if b['case_id']=='mixin-argument/all-component-colors/custom-full-theme')]
        for body in selected:
            for kind in ['descriptor','run','invocation','artifact','source','css']:
                wrong=copy.deepcopy(body)
                if kind=='descriptor':wrong.pop('current_spinner_snack_bridge')
                elif kind=='run':wrong['run_id']='foreign'
                elif kind=='invocation':wrong['invocation_id']='foreign'
                elif kind=='artifact':wrong['tarball_sha256']='0'*64
                else:
                    actual=wrong.get('actual',wrong.get('actual_measurement'))
                    if kind=='source':actual['sources'][0]['sha256']='0'*64
                    else:actual.update(measured(actual['css']+'\n.foreign { color: red; }\n'))
                self.assertFalse(self.coordinator._sass_seal_assertion_ok(wrong,self.invocation),(body['case_id'],kind))

    def test_all15_direct_cases_validate_optional_current_line_and_compiler(self):
        direct=[b for b in self.bodies if b.get('comparison')=='historical-spinner-snack-css-with-positioned-public-tokens']
        self.assertEqual(len(direct),15)
        for body in direct:
            correct=copy.deepcopy(body)
            fields=dict(line=self.line,sass_version=correct['identity']['sass_version'])
            correct['actual'].update(fields)
            if 'actual_measurement' in correct:correct['actual_measurement'].update(fields)
            self.assertTrue(self.coordinator._sass_seal_assertion_ok(correct,self.invocation),body['case_id'])
            for key,value in [('line','foreign'),('sass_version','foreign compiler')]:
                wrong=copy.deepcopy(correct);wrong['actual'][key]=value
                if 'actual_measurement' in wrong:wrong['actual_measurement'][key]=value
                self.assertFalse(self.coordinator._sass_seal_assertion_ok(wrong,self.invocation),(body['case_id'],key))

    def test_actual_javascript_inventory_and_drift_preserve_outer_aggregate_capsules(self):
        completed=subprocess.run(['node',str(ROOT/'tests/sass_spinner_snack_gate_probe.mjs')],cwd=ROOT,input=json.dumps(dict(line=self.line,bodies=self.bodies)),capture_output=True,text=True)
        self.assertEqual(completed.returncode,0,completed.stderr)
        report=json.loads(completed.stdout)
        self.assertEqual(report['api_case_ids'],651)
        self.assertEqual(len(report['controls']),10)
        self.assertEqual(report['actual_compiles'],0)

if __name__=='__main__':unittest.main()
