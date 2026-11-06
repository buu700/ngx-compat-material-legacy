# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Card12 six-source contexts, retained CSS and modeled envelopes; no compiler."""
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

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sass_ordinary_card_gate as gate
from sass_ordinary_card_css import ORDINARY_CARD_CASES, ordinary_card_expected_css, ordinary_card_results_match
from test_current_sass_source import candidate_fixture, NODE


def digest(value):
    return hashlib.sha256(value.encode() if type(value) is str else value).hexdigest()


def measured(css):
    return dict(css=css, css_sha256=digest(css), css_bytes=len(css.encode()))


class OrdinaryCardGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-ordinary-card-gate-')
        cls.root = Path(cls.temp.name)
        cls.line = candidate_fixture(cls.root)
        for path in ['scripts/sass-ordinary-card-gate.mjs', 'scripts/sass_ordinary_card_gate.py', 'scripts/sass_ordinary_card_css.py',
                     'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs', 'compatibility/rc/ordinary-card-public-bridge-model-v2.mjs',
                     'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json']:
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / path).read_bytes())
        cls.packet = json.loads((ROOT / 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
        cls.branch = cls.packet['branches'][cls.line]
        cls.originals = json.loads((ROOT / 'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json').read_bytes())
        cls.rows = [r for r in cls.originals['cases'] if r['case_id'] in ORDINARY_CARD_CASES]
        cls.oracle, cls.catalog, cls.provenance, cls.lock = [json.loads((ROOT / cls.packet[k]['path']).read_bytes()) for k in ['oracle', 'catalog', 'provenance', 'reference_lock']]
        cls.controls = dict(hook=None, target=None)
        def callback(path):
            if cls.controls['hook'] is not None:
                hook, cls.controls['hook'] = cls.controls['hook'], None
                hook()
            return b'wrong' if path == cls.controls['target'] else (cls.root / path).read_bytes()
        cls.context = gate.OrdinaryCardGateContext(cls.root, read=callback)
        cls.descriptor = gate.ordinary_card_gate_descriptor(cls.context)
        modules = {r['path']: r for r in cls.descriptor['source']['source_modules']}
        cls.sources = []
        for row in next(iter(cls.branch['source_sets'].values())):
            current = modules.get('projects/ngx-material-legacy/' + row['path']) if row['root'] == 0 else None
            cls.sources.append(dict(row, sha256=current['sha256'], bytes=current['bytes']) if current else dict(row))
        cls.checks, cls.rejects, cls.js = [], [], None

    @classmethod
    def tearDownClass(cls):
        try:
            destination = os.environ.get('ORDINARY_CARD_GATE_REPORT')
            if destination:
                report = dict(schema_version=1, result='pass' if len(cls.checks)==14 and len(cls.rejects)==34 and cls.js is not None and cls.js['result']=='pass' else 'incomplete', line=cls.line, python_checks=cls.checks, python_rejected=cls.rejects,
                    js=cls.js, actual_six_source_constructor=True, source_population=len(cls.sources), reused_retained_batches=2,
                    fresh_compiles=0, actual_artifact_runs=0, workspace_card_applied=False, g11_claim='not-passed')
                with Path(destination).open('x') as output:
                    output.write(json.dumps(report, indent=2) + '\n')
        finally:
            cls.temp.cleanup()

    def model(self, row):
        case = row['case_id']
        default = case.startswith('mixin-css/')
        spec = dict(mixin=row['mixin'], variant='default', call=row['call']) if default else dict(next(r for r in self.catalog['cases'] if r['case_id'] == case))
        program = "@use '__entry__' as m;\n" + (self.oracle['standard_theme'] if default else self.catalog['setup']) + '\n' + spec['call'] + '\n'
        original = dict(row['original'], program_sha256=digest(program), sources=copy.deepcopy(self.originals['all_original_loaded_sources']))
        css = ordinary_card_expected_css(dict(caseId=case, originalCss=original['css']))
        self.assertIsInstance(css, str)
        actual = dict(measured(css), program_sha256=digest(program), sources=copy.deepcopy(self.sources), line=self.line, sass_version=self.branch['compiler'])
        manifest = dict(run_id='modeled-card-' + self.line, source=dict(line=self.line, commit='2' * 40, git_tree_sha='3' * 40, content_sha256='4' * 64), artifacts=[dict(id='library', sha256='1' * 64)])
        binding = dict(run_id=manifest['run_id'], source_line=self.line, source_commit=manifest['source']['commit'], source_tree=manifest['source']['git_tree_sha'], source_content_sha256=manifest['source']['content_sha256'], artifacts_sha256=digest(json.dumps(manifest['artifacts'], sort_keys=True, separators=(',', ':'))))
        identity = dict(material_version='16.2.14', material_manifest_sha256=self.provenance['isolated_environment']['material_manifest_sha256'], lock_sha256=self.packet['reference_lock']['sha256'], material_integrity=self.lock['packages']['node_modules/@angular/material']['integrity'], catalog=self.packet['oracle' if default else 'catalog']['path'], catalog_sha256=self.packet['oracle' if default else 'catalog']['sha256'], expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=self.branch['compiler'])
        invocation = 'modeled-invocation'
        body = dict(spec, kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0, line=self.line, run_id=manifest['run_id'], invocation_id=invocation, binding=copy.deepcopy(binding), mutation_rejected=True, error=None,
            comparison=gate.ORDINARY_CARD_CONTRACT, tarball_sha256=manifest['artifacts'][0]['sha256'], identity=identity, current_ordinary_card=copy.deepcopy(self.descriptor), expected=original, actual=actual, mutation=measured(css + '\n.wrong-nonempty-mixin { color: red; }\n'))
        body['case_id'] = case
        if default:
            body.update(oracle=self.packet['oracle']['path'], oracle_sha256=self.packet['oracle']['sha256'], expected_sha256=original['css_sha256'], expected_bytes=original['css_bytes'], actual_sha256=actual['css_sha256'], actual_bytes=actual['css_bytes'], actual_measurement=copy.deepcopy(actual))
        return dict(root=self.root, context=self.context, body=body, active=SimpleNamespace(manifest=manifest, binding=binding), invocation=invocation)

    def test_01_all_twelve_actual_context_modeled_envelopes(self):
        self.assertEqual(len(self.descriptor['source']['source_modules']), 6)
        self.assertEqual(len(self.rows), 12)
        self.assertEqual(sum(row['dimension'] in ('color', 'theme') for row in self.rows), 6)
        for row in self.rows:
            with self.subTest(case=row['case_id']):
                self.assertTrue(gate.ordinary_card_gate_assertion_ok(**self.model(row)))
                self.checks.append('actual-six-source/modeled-envelope/' + row['case_id'])
        copied = self.context.bound
        copied.clear()
        descriptor = gate.ordinary_card_gate_descriptor(self.context)
        descriptor['source']['source_modules'].clear()
        self.assertTrue(gate.ordinary_card_gate_assertion_ok(**self.model(self.rows[0])))
        self.checks.append('public-metadata-copied')

    def test_02_strict_whole_css_and_scope(self):
        for row in self.rows:
            args = self.model(row)
            body = args['body']
            self.assertTrue(ordinary_card_results_match(dict(caseId=row['case_id'], original=body['expected'], actual=body['actual'])))
            wrong = dict(body['actual'], **measured(body['actual']['css'] + '\n.extra { color: red; }'))
            self.assertFalse(ordinary_card_results_match(dict(caseId=row['case_id'], original=body['expected'], actual=wrong)))
            self.rejects.append('extra-css/' + row['case_id'])
        for row in self.originals['cases']:
            if row['case_id'] not in ORDINARY_CARD_CASES:
                self.assertIsNone(ordinary_card_expected_css(dict(caseId=row['case_id'], originalCss=row['original']['css'])))
                self.rejects.append('diagnostic/' + row['case_id'])
        for case in ['unknown', 'mixin-css/legacy-card-theme', 'mixin-css/all-component-themes']:
            self.assertIsNone(ordinary_card_expected_css(dict(caseId=case, originalCss='')))
            self.rejects.append('foreign-case/' + case)

    def test_03_representative_envelope_source_and_late_metadata(self):
        changes = {
            'line': lambda v: v['body'].update(line='foreign'),
            'compiler': lambda v: v['body']['actual'].update(sass_version='foreign'),
            'program': lambda v: v['body']['actual'].update(program_sha256='0' * 64),
            'source': lambda v: v['body']['actual']['sources'][0].update(sha256='0' * 64),
            'empty-source': lambda v: v['body']['actual'].update(sources=[]),
            'original-source': lambda v: v['body']['expected']['sources'].pop(),
            'descriptor': lambda v: v['body']['current_ordinary_card']['source']['source_modules'].pop(),
            'run': lambda v: v['body'].update(run_id='wrong'),
            'invocation': lambda v: v['body'].update(invocation_id='wrong'),
            'library': lambda v: v['body'].update(tarball_sha256='0' * 64),
            'mutation': lambda v: v['body'].pop('mutation'),
        }
        for name, change in changes.items():
            args = self.model(self.rows[0]);change(args)
            self.assertFalse(gate.ordinary_card_gate_assertion_ok(**args), name)
            self.rejects.append('cold/' + name)
        density = self.model(next(r for r in self.rows if r['dimension'] == 'density'))
        density['body']['actual']['sources'] = []
        density['body']['actual_measurement'] = density['body']['actual']
        self.assertFalse(gate.ordinary_card_gate_assertion_ok(**density))
        self.rejects.append('empty-density-source')
        args = self.model(self.rows[0]);args['context'] = SimpleNamespace(line=self.line, assert_current=lambda: None)
        self.assertFalse(gate.ordinary_card_gate_assertion_ok(**args))
        self.rejects.append('fake-context')
        args = self.model(self.rows[0])
        self.controls['hook'] = lambda: args['body'].update(call='changed')
        self.assertFalse(gate.ordinary_card_gate_assertion_ok(**args))
        self.rejects.append('late-metadata')
        self.controls['target'] = 'scripts/sass_ordinary_card_css.py'
        try:
            with self.assertRaises(AssertionError):
                self.context.assert_current()
        finally:
            self.controls['target'] = None
        self.context.assert_current()
        self.rejects.append('late-provided-tool-bytes')

    def test_04_js_physical_context_and_python_model_parity(self):
        child = subprocess.run([NODE, 'tests/ordinary_card_gate_probe.mjs', str(self.root)], cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['result'], 'pass')
        self.assertEqual(result['descriptor'], self.descriptor)
        self.assertEqual(result['source_population'], len(self.sources))
        self.assertEqual(len(result['retained_css_vectors']), 12)
        for vector in result['retained_css_vectors']:
            original = next(r for r in self.rows if r['case_id'] == vector['case_id'])['original']['css']
            self.assertEqual(ordinary_card_expected_css(dict(caseId=vector['case_id'], originalCss=original)), vector['css'])
        self.__class__.js = result
        self.checks.append('js-python-twelve-vector-and-descriptor-parity')


if __name__ == '__main__':
    unittest.main()
