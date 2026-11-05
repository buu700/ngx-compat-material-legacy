# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Candidate-fixture model gate wiring only; no Sass/packed/native qualification."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
import sass_ordinary_control_gate as gate
import current_sass_spinner_snack_admission as current
from test_current_sass_source import candidate_fixture,NODE
from sass_mixin_fixture import mixin_receipt
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_ordinary_control_css import ordinary_checkbox_button_expected_css,legacy_datepicker_button_expected_css

def measured(css):return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))

class OrdinaryControlGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-');cls.root=Path(cls.temp.name);cls.line=candidate_fixture(cls.root)
        paths={p for p,_,_ in current.PINS}|set(gate._DEPENDENCIES)|{'scripts/sass-spinner-snack-bridge-contract.mjs'}|{'scripts/sass_ordinary_control_gate.py','scripts/sass-ordinary-control-gate.mjs','scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py'}
        # JS direct guard pins include pure JS expected-model dependencies.
        for match in re.finditer(r"\['([^']+)','[0-9a-f]{64}'\]",(ROOT/'scripts/sass-ordinary-control-gate.mjs').read_text()):paths.add(match[1])
        for path in paths:
            dest=cls.root/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/path).read_bytes())
        cls.hook=None
        def read(path):
            if cls.hook is not None:
                fn,cls.hook=cls.hook,None;fn()
            return (cls.root/path).read_bytes()
        cls.context=gate.OrdinaryControlGateContext(cls.root,read=read);cls.state=gate._CONTEXTS[cls.context]
        cls.descriptor=gate.ordinary_control_gate_descriptor(cls.context)
        manifest=dict(run_id='ordinary-modeled-run',source=dict(line=cls.line,commit='a'*40,git_tree_sha='b'*40,content_sha256='c'*64),artifacts=[dict(id='library',sha256='d'*64)])
        binding=dict(run_id=manifest['run_id'],source_line=cls.line,source_commit='a'*40,source_tree='b'*40,source_content_sha256='c'*64,artifacts_sha256=hashlib.sha256(json.dumps(manifest['artifacts'],sort_keys=True,separators=(',',':')).encode()).hexdigest())
        cls.active=SimpleNamespace(manifest=manifest,binding=binding);cls.invocation='ordinary-modeled-invocation';cls.bodies=[];cls.unmodeled=[]
        rows=json.loads((ROOT/'compatibility/rc/ordinary-control-css-python-vectors-v1.json').read_bytes())['rows'];direct={r['case_id']:r for r in rows[:24]};nested={r['case_id']:r for r in rows[24:65]}
        default_catalog=json.loads((ROOT/'fixtures/sass/default-aggregate-contracts.json').read_bytes());oracle=cls.state['oracle']
        def default_original(case):
            name=case.split('/')[1];inv=oracle['members']['mixins'][name]['invocation']
            if case in direct and direct[case]['original']['css_sha256']==inv['css_sha256']:return direct[case]['original']['css']
            if case in default_catalog['cases']:return default_catalog['cases'][case]['original_css']
            if name=='checkbox-theme':
                parts=[direct['mixin-css/checkbox-'+d]['original']['css']for d in ['color','density','typography']]
                for a in ['\n','\n\n']:
                    for b in ['\n','\n\n']:
                        css=parts[0]+a+parts[1]+b+parts[2]
                        if measured(css)['css_sha256']==inv['css_sha256']:return css
            # Any extracted before must have exactly the immutable individual oracle hash.
            for parent in default_catalog['cases'].values():
                css=parent['original_css'];n=inv['css_bytes']
                for match in re.finditer(r'(?m)^\.?[a-z@.#]',css):
                    piece=css[match.start():match.start()+n]
                    if measured(piece)['css_sha256']==inv['css_sha256']:return piece
            return None
        for case in (c for c in gate.ORDINARY_CONTROL_GATE_CASES if not c.startswith('owned-aggregate/')):
            plan=cls.state['plans'][case];default=case.startswith('mixin-css/')
            if default:
                before=default_original(case)
                if before is None:cls.unmodeled.append(case);continue
                body=default_aggregate_receipt(cls.active,case,cls.invocation) if case in default_catalog['cases'] else {}
            else:
                body=mixin_receipt(ROOT,cls.active,case,cls.invocation)
                before=body['expected']['css'] if 'current_companion'in body else (direct.get(case)or nested[case])['original']['css']
            body.update(case_id=case,kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=cls.line,run_id=manifest['run_id'],invocation_id=cls.invocation,binding=copy.deepcopy(binding),tarball_sha256='d'*64,error=None,mutation_rejected=True,comparison=gate.ORDINARY_CONTROL_CONTRACT,current_ordinary_controls=copy.deepcopy(cls.descriptor),identity=gate._identity(cls.state,case))
            body.update({k:v for k,v in plan.items()if k!='program_sha256'})
            body['expected']={**measured(before), 'program_sha256':plan['program_sha256'],'sources':[dict(root=0,**cls.state['catalog']['original_entry_identity'])]}
            body['actual']={**measured('pending'),'program_sha256':plan['program_sha256'],'sources':copy.deepcopy(cls.state['current_sources']),'line':cls.line,'sass_version':cls.state['branch']['compiler']}
            expected=gate._prior(cls.state,body)
            if expected is None:cls.unmodeled.append(case);continue
            body['actual'].update(measured(expected));body['mutation']=measured(expected+'\n.wrong-nonempty-mixin { color: red; }\n')
            if default:body.update(oracle=gate._PACKET['oracle']['path'],oracle_sha256=gate._PACKET['oracle']['sha256'],actual_measurement=copy.deepcopy(body['actual']),expected_sha256=body['expected']['css_sha256'],expected_bytes=body['expected']['css_bytes'],actual_sha256=body['actual']['css_sha256'],actual_bytes=body['actual']['css_bytes'])
            cls.bodies.append(body)
        cls.js=None

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def accepts(self,body):return gate.ordinary_control_gate_assertion_ok(self.root,self.active,body,self.invocation,context=self.context)

    def test_finite_scope_and_modeled_positive_transport(self):
        self.assertEqual(len(gate.ORDINARY_CONTROL_GATE_CASES),65);self.assertEqual(len(gate.ORDINARY_CONTROL_DEFAULT_CASES),15)
        self.assertEqual(sum(case.startswith('owned-aggregate/')for case in gate.ORDINARY_CONTROL_GATE_CASES),20)
        self.assertEqual(self.unmodeled,[],'retain exact missing fixture gap rather than fake source authority')
        selected=[self.bodies[i] for i in [1,7,13,22,26,28,31,44]]
        for body in selected:self.assertTrue(self.accepts(body),body['case_id'])

    def test_representative_metadata_artifact_and_raw_css_controls(self):
        for body in [self.bodies[1],next(b for b in self.bodies if 'legacy-button-theme/custom-full' in b['case_id'])]:
            for field in ['css','source','program','identity','descriptor','library','binding','mutation']:
                bad=copy.deepcopy(body)
                if field=='css':bad['actual'].update(measured(bad['actual']['css']+'\n.foreign { color: red; }'))
                elif field=='source':bad['actual']['sources'].pop()
                elif field=='program':bad['actual']['program_sha256']='0'*64
                elif field=='identity':bad['identity']['material_version']='foreign'
                elif field=='descriptor':bad['current_ordinary_controls']['case_ids'].pop()
                elif field=='library':bad['tarball_sha256']='0'*64
                elif field=='binding':bad['binding']['source_tree']='0'*40
                else:bad['mutation_rejected']=False
                self.assertFalse(self.accepts(bad),(body['case_id'],field))
        for case in ['owned-aggregate/unknown/repeat','mixin-css/fab-theme']:
            bad=copy.deepcopy(self.bodies[1]);bad['case_id']=case;self.assertFalse(self.accepts(bad))

    def test_live_nested_payload_and_private_context(self):
        body=copy.deepcopy(self.bodies[1]);self.__class__.hook=lambda:body['current_ordinary_controls']['case_ids'].pop()
        self.assertFalse(self.accepts(body));self.assertIsNone(self.__class__.hook)
        self.assertFalse(gate.ordinary_control_gate_assertion_ok(self.root,self.active,self.bodies[1],self.invocation,context=SimpleNamespace(line=self.line)))

    def test_javascript_actual_context_and_inventory_routes(self):
        payload=dict(root=str(self.root),line=self.line,bodies=self.bodies,unmodeled=self.unmodeled)
        proc=subprocess.run([NODE,str(ROOT/'tests/sass_ordinary_control_gate_probe.mjs')],cwd=ROOT,input=json.dumps(payload),text=True,capture_output=True,timeout=90)
        self.assertEqual(proc.returncode,0,proc.stderr)
        self.__class__.js=json.loads(proc.stdout);self.assertEqual(self.js['positives'],8)
        export=os.environ.get('ORDINARY_CONTROL_GATE_RECEIPT')
        if export:
            receipt=ROOT/export
            assert receipt.parent==ROOT/'compatibility/rc' and receipt.name.startswith('ordinary-control-gate-') and receipt.suffix=='.json'
            assert not receipt.exists()
            receipt.write_text(json.dumps(dict(schema_version=1,line=self.line,modeled_current_fixture=True,case_ids=gate.ORDINARY_CONTROL_GATE_CASES,modeled_expectations=len(self.bodies),physical_python_positives=8,js=self.js,python_controls='4focusedmethods; candidate fixture contexts and strict envelope/mutation/raw CSS checks',new_compiles=0,packed_runs=0,original_reference_observer_positive_execution=False,product_applied=False,g11_claim='not-passed'),indent=2)+'\n')

if __name__=='__main__':unittest.main()
