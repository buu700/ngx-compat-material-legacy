# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One context/language, three aggregate dimensions; modeled CSS, no compiler."""
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
from sass_ordinary_aggregate_admission import insert_ordinary_checkbox_button_into_aggregate_model
from current_sass_card_aggregate import insert_card_into_aggregate_model
from test_current_sass_source import candidate_fixture,NODE
from sass_default_aggregate_fixture import default_aggregate_receipt
from sass_mixin_fixture import mixin_receipt


def measured(css):
    return dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))


class CurrentOrdinaryAggregateGateTests(unittest.TestCase):
    def test_bounded_three_dimension_composition(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as temporary:
            root=Path(temporary);line=candidate_fixture(root)
            # The fixture owns real copies of guarded source/tools and read-only
            # references to the same authenticated peer package roots.
            paths=['scripts/sass-spinner-snack-gate-integration.mjs','scripts/sass-spinner-snack-bridge-contract.mjs',
                'scripts/current-sass-spinner-snack-contract.mjs','scripts/sass-spinner-snack-aggregate-contract.mjs',
                'scripts/current-sass-card-aggregate-contract.mjs','compatibility/rc/ordinary-card-public-bridge-model-v1.mjs',
                'scripts/sass-ordinary-aggregate-contract.mjs','compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs',
                'scripts/sass-default-aggregate-contract.mjs','scripts/sass-aggregate-color-theme-contract.mjs',
                'scripts/sass-aggregate-typography-contract.mjs','scripts/sass-ripple-color-contract.mjs',
                'scripts/sass_spinner_snack_gate_integration.py',*gate._DEPENDENCIES]
            for path in set(paths):
                destination=root/path;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((ROOT/path).read_bytes())
            context=gate.SpinnerSnackGateContext(root);state=gate._CONTEXTS[context]
            descriptor=gate.spinner_snack_gate_descriptor(context)
            manifest=dict(run_id='modeled-current-ordinary-aggregate-'+line,source=dict(line=line,commit='2'*40,git_tree_sha='3'*40,content_sha256='4'*64),artifacts=[dict(id='library',sha256='1'*64)])
            binding=dict(run_id=manifest['run_id'],source_line=line,source_commit=manifest['source']['commit'],source_tree=manifest['source']['git_tree_sha'],source_content_sha256=manifest['source']['content_sha256'],artifacts_sha256=hashlib.sha256(json.dumps(manifest['artifacts'],sort_keys=True,separators=(',',':')).encode()).hexdigest())
            active=SimpleNamespace(manifest=manifest,binding=binding);invocation='modeled-ordinary-aggregate-invocation'
            packet=json.loads((ROOT/('compatibility/rc/parent-spinner-snack-aggregate-integration-'+('21' if line=='21.x' else 'main')+'-v1.json')).read_bytes())
            cases=['mixin-css/all-component-colors','mixin-argument/all-component-themes/custom-full-theme','mixin-argument/all-component-typographies/raw-typography-config']
            bodies=[];controls=[]
            for case in cases:
                row=next(row for row in packet['rows'] if row['case_id']==case)
                body=default_aggregate_receipt(active,case,invocation) if case.startswith('mixin-css/') else mixin_receipt(ROOT,active,case,invocation)
                css=insert_ordinary_checkbox_button_into_aggregate_model(case_id=case,css=row['current']['css']);self.assertIsNotNone(css)
                # This archived row predates the separately owned card successor.
                css=insert_card_into_aggregate_model(case_id=case,css=css);self.assertIsNotNone(css)
                actual={**measured(css),'program_sha256':row['current']['logical_program_sha256'],'line':line,'sass_version':state['branch']['compiler'],'sources':copy.deepcopy(state['current_sources'])}
                body.update(current_spinner_snack_bridge=copy.deepcopy(descriptor),error=None)
                if case.startswith('mixin-css/'):
                    body.update(actual_measurement=actual,actual_sha256=actual['css_sha256'],actual_bytes=actual['css_bytes'])
                else:
                    body['identity']['sass_version']=state['branch']['compiler'];body['actual']=actual
                    body['mutation']=measured(css+'\n.wrong-nonempty-mixin { color: red; }\n')
                bodies.append(body)
            def accepts(body):return gate.spinner_snack_gate_assertion_ok(root,active,body,invocation,context=context)
            for body in bodies:
                self.assertTrue(accepts(body),body['case_id']);controls.append('composed aggregate positive '+body['case_id'])
            extra=copy.deepcopy(bodies[1]);extra['actual'].update(measured(extra['actual']['css']+'\n.foreign { color: red; }\n'))
            extra['mutation']=measured(extra['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n')
            self.assertFalse(accepts(extra));controls.append('coherent extra candidate CSS rejects')
            different=copy.deepcopy(bodies[0]);different['current_spinner_snack_bridge']['source_modules'].pop()
            self.assertFalse(accepts(different));controls.append('different current source descriptor rejects')
            peer=copy.deepcopy(bodies[1]);peer['current_companion']['peer']['line']='main' if line=='21.x' else '21.x'
            self.assertFalse(accepts(peer));controls.append('foreign peer line rejects')
            # One exact new dependency mutation on a disposable copy. Current
            # shared owner/reader graphs and real workspace inputs never change.
            path=root/'scripts/sass_ordinary_aggregate_admission.py';before=path.read_bytes()
            try:
                path.write_bytes(before+b'\n# copied dependency mutation\n')
                with self.assertRaises(AssertionError):context.assert_current()
                controls.append('new composer physical dependency mutation rejects')
            finally:path.write_bytes(before)
            completed=subprocess.run([NODE,str(ROOT/'tests/current_sass_ordinary_aggregate_gate_probe.mjs')],cwd=ROOT,
                input=json.dumps(dict(candidate_root=str(root),line=line,bodies=bodies)),capture_output=True,text=True)
            self.assertEqual(completed.returncode,0,completed.stderr);javascript=json.loads(completed.stdout)
            self.assertEqual(javascript['descriptor'],descriptor);self.assertEqual(javascript['contexts'],1)
            report=dict(schema_version=1,line=line,python_controls=controls,javascript=javascript,
                role='Actual current gate contexts on exact candidate fixture; modeled CSS/packed envelopes only',contexts_per_language=1,
                case_ids=cases,compiler_calls=0,old_original16_producer_executed=False,actual_packed_run=False,
                fresh_current_aggregate_CSS_qualified=False,broad_gate_matrix_rerun=False,fulltoolowner_constructed=False,
                browser_floor_fullowner_or_G11_qualified=False)
            export=os.environ.get('CURRENT_SASS_ORDINARY_AGGREGATE_GATE_RECEIPT')
            if export:
                destination=ROOT/export
                self.assertEqual(destination.parent,ROOT/'compatibility/rc')
                self.assertTrue(destination.name.startswith('current-sass-ordinary-aggregate-gate-controls-') and destination.suffix=='.json')
                self.assertFalse(destination.exists());destination.write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':unittest.main()
