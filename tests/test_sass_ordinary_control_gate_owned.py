# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Next20owned finite relationships;3physical representatives, no compiler."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
import sass_ordinary_control_gate as gate
import test_sass_ordinary_control_gate as prior_fixture
from test_sass_ordinary_control_gate import measured
from test_current_sass_source import NODE
from sass_mixin_fixture import owned_aggregate_receipt
from sass_mixin_argument_admission import mixin_argument_assertion_ok

class OwnedOrdinaryControlGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        prior_fixture.OrdinaryControlGateTests.setUpClass();cls.root=prior_fixture.OrdinaryControlGateTests.root;cls.context=prior_fixture.OrdinaryControlGateTests.context;cls.state=prior_fixture.OrdinaryControlGateTests.state;cls.line=prior_fixture.OrdinaryControlGateTests.line;cls.active=prior_fixture.OrdinaryControlGateTests.active;cls.invocation=prior_fixture.OrdinaryControlGateTests.invocation
        for path in ['fixtures/sass/function-contracts.json','scripts/sass_mixin_argument_admission.py']:
            dest=cls.root/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/path).read_bytes())
        packet=json.loads((ROOT/'fixtures/sass/owned-aggregate-contracts.json').read_bytes());vectors=json.loads((ROOT/'compatibility/rc/ordinary-control-css-python-vectors-v1.json').read_bytes());rows={r['case_id']:r for r in vectors['rows'][24:65]};cls.bodies=[]
        for probe in packet['cases']:
            case=probe['case_id'];plan=cls.state['plans'][case];body=owned_aggregate_receipt(ROOT,cls.active,case,cls.invocation)
            before=body['expected']['css'] if case in gate.RIPPLE_COLOR_OWNED_CASES else rows[case]['original']['css']
            body.update(probe);body.update(identity=gate._identity(cls.state,case),current_ordinary_controls=copy.deepcopy(prior_fixture.OrdinaryControlGateTests.descriptor),comparison=gate.ORDINARY_CONTROL_CONTRACT,error=None)
            body['expected']={**measured(before),'program_sha256':plan['reference_program_sha256'],'sources':copy.deepcopy(body['expected']['sources']) if case in gate.RIPPLE_COLOR_OWNED_CASES else [dict(root=0,**packet['original_entry_identity'])]}
            body['actual']={**measured('pending'),'program_sha256':plan['program_sha256'],'sources':copy.deepcopy(cls.state['current_sources']),'line':cls.line,'sass_version':cls.state['branch']['compiler']}
            expected=gate._prior(cls.state,body)
            assert type(expected) is str,case
            body['actual'].update(measured(expected));body['mutation']=measured(expected+'\n.wrong-nonempty-mixin { color: red; }\n');body['mutation_rejected']=True
            cls.bodies.append(body)
        cls.representatives=[next(b for b in cls.bodies if b['case_id']=='owned-aggregate/'+dim+'/modern-light')for dim in ['themes','typographies','densities']]
        cls.js=None

    @classmethod
    def tearDownClass(cls):prior_fixture.OrdinaryControlGateTests.tearDownClass()

    def accepts(self,body):return gate.ordinary_control_gate_assertion_ok(self.root,self.active,body,self.invocation,context=self.context)

    def test_owned20_pure_whole_css_and_exact_distinct_programs(self):
        self.assertEqual(len(gate.ORDINARY_CONTROL_GATE_CASES),65);self.assertEqual(len(self.bodies),20)
        self.assertEqual(len(gate.ORDINARY_CONTROL_DEFAULT_CASES),15)
        for body in self.bodies:
            self.assertEqual(body['actual']['css'],gate._prior(self.state,body),body['case_id'])
            self.assertNotEqual(body['expected']['program_sha256'],body['actual']['program_sha256'])
            self.assertNotEqual(body['expected']['css'],body['actual']['css'])
        self.assertEqual(sum('/densities/'in b['case_id']for b in self.bodies),5)

    def test_three_actual_physical_context_routes_and_metadata_negatives(self):
        for body in self.representatives:
            self.assertTrue(self.accepts(body),body['case_id'])
            for field in ['reference_program','actual_program','catalog','role','actual_css','surrounding','unknown_id']:
                bad=copy.deepcopy(body)
                if field=='reference_program':bad['expected']['program_sha256']=bad['actual']['program_sha256']
                elif field=='actual_program':bad['actual']['program_sha256']=bad['expected']['program_sha256']
                elif field=='catalog':bad['identity']['catalog']='fixtures/sass/mixin-argument-contracts.json'
                elif field=='role':bad['reference_call']='foreign'
                elif field=='actual_css':bad['actual'].update(measured(bad['expected']['css']))
                elif field=='surrounding':bad['actual'].update(measured(bad['actual']['css']+'\n.foreign { color: red; }'))
                else:bad['case_id']='owned-aggregate/unknown/modern-light'
                self.assertFalse(self.accepts(bad),(body['case_id'],field))

    def test_actual_owned_admission_dispatch_and_js_routes(self):
        gate._ROOT_CONTEXTS[self.root.absolute()]=self.context
        self.assertTrue(mixin_argument_assertion_ok(self.root,self.active,self.representatives[0],self.invocation))
        payload=dict(root=str(self.root),line=self.line,bodies=self.representatives)
        proc=subprocess.run([NODE,str(ROOT/'tests/sass_ordinary_control_gate_owned_probe.mjs')],cwd=ROOT,input=json.dumps(payload),text=True,capture_output=True,timeout=45)
        self.assertEqual(proc.returncode,0,proc.stderr);self.__class__.js=json.loads(proc.stdout)
        export=os.environ.get('ORDINARY_CONTROL_GATE_RECEIPT')
        if export:
            receipt=ROOT/export
            assert receipt.parent==ROOT/'compatibility/rc' and receipt.name.startswith('ordinary-control-gate-') and receipt.suffix=='.json'
            assert not receipt.exists()
            receipt.write_text(json.dumps(dict(schema_version=1,line=self.line,owned_catalog_sha256=gate._hash(gate._OWNED_RAW),owned_relationships=20,actual_physical_representatives=3,actual_python_owned_dispatcher=1,js=self.js,new_compiles=0,all45routes_reexecuted=False,actual_packed_runs=0,source_before_css='10rippleguarded authenticbeforecapsules+10syntheticphaseframes forpuremodel tests; no fake originalsourceauthority claimed',g11_claim='not-passed'),indent=2)+'\n')

if __name__=='__main__':unittest.main()
