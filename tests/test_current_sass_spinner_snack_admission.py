# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Candidate fixture composition; reused historical CSS, no compiles or actual packed run."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

import current_sass_spinner_snack_admission as subject
import sass_spinner_snack_bridge_admission as frozen
from test_current_sass_source import candidate_fixture, NODE

PREFIX = 'compatibility/rc/current-sass-spinner-snack-'
def digest(value): return hashlib.sha256(value.encode() if type(value) is str else value).hexdigest()
def measured(css): return dict(css=css, css_sha256=digest(css), css_bytes=len(css.encode()))


class CurrentDirectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-')
        cls.root = Path(cls.temp.name)
        cls.line = candidate_fixture(cls.root)
        for path in ['scripts/current-sass-spinner-snack-contract.mjs', 'scripts/current_sass_spinner_snack_admission.py', 'scripts/sass-spinner-snack-bridge-contract.mjs', 'scripts/sass_spinner_snack_bridge_admission.py']:
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / path).read_bytes())
        cls.packet = json.loads((ROOT / 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
        cls.branch = cls.packet['branches'][cls.line]
        cls.rows = json.loads((ROOT / cls.branch['observation']['path']).read_bytes())['rows']
        cls.catalog, cls.provenance, cls.lock = [json.loads((ROOT / cls.packet[k]['path']).read_bytes()) for k in ['catalog', 'provenance', 'reference_lock']]
        cls.controls, cls.checks = dict(hook=None, target=None, trace=None), []
        def callback(path):
            if cls.controls['trace'] is not None:
                cls.controls['trace'].append(path)
            if cls.controls['hook'] is not None:
                hook, cls.controls['hook'] = cls.controls['hook'], None
                hook(path)
            return b'wrong' if path == cls.controls['target'] else (cls.root / path).read_bytes()
        cls.callback = staticmethod(callback)
        cls.context = subject.CurrentSpinnerSnackContract(cls.root, read=callback)
        cls.js_result = None

    @classmethod
    def tearDownClass(cls):
        if cls.js_result is not None and os.environ.get('CURRENT_SASS_SPINNER_SNACK_REPORT_VERSION'):
            report = dict(schema_version=1, line=cls.line, role='Current direct15 isolated candidate-source context controls; modeled packed envelopes only',
                python_checks=cls.checks, js=cls.js_result, source_set_successors=cls.context.source_set_successors,
                canonical_descriptor=cls.context.descriptor, reused_prior_css_rows=15, old_physical_constructor_executed=False,
                old_branded_assertion_validator_executed=False, fresh_compiles=0, actual_packed_assertions=0,
                workspace_product_changed=False, existing_gate_reader_manifest_golden_changed=False,
                current_ordinary_CSS_or_aggregate_or_browser_floor_fullowner_qualified=False, g11_claim='not-passed')
            version = os.environ['CURRENT_SASS_SPINNER_SNACK_REPORT_VERSION']
            assert re.fullmatch(r'v[0-9]+', version)
            path = ROOT / (PREFIX + 'controls-' + ('21x' if cls.line == '21.x' else 'main') + '-' + version + '.json')
            assert not path.exists()
            path.write_text(json.dumps(report, indent=2) + '\n')
        cls.temp.cleanup()

    def check(self, name, expected, value):
        self.assertIs(value, expected, name)
        self.checks.append(name)

    def model(self, row):
        spec = next(p for p in self.branch['cases'] if p['case_id'] == row['case_id'])
        manifest = dict(run_id='modeled-current-direct-' + self.line,
            source=dict(line=self.line, commit='2' * 40, git_tree_sha='3' * 40, content_sha256='4' * 64), artifacts=[dict(id='library', sha256='1' * 64)])
        binding = dict(run_id=manifest['run_id'], source_line=self.line, source_commit=manifest['source']['commit'], source_tree=manifest['source']['git_tree_sha'],
            source_content_sha256=manifest['source']['content_sha256'], artifacts_sha256=digest(json.dumps(manifest['artifacts'], sort_keys=True, separators=(',', ':'))))
        current_hash = next(s for s in self.context.source_set_successors if s['historical_sha256'] == spec['source_set_sha256'])['current_sha256']
        original = dict(**measured(row['historical']['css']), program_sha256=spec['program_sha256'], sources=[dict(root=0, **self.catalog['original_entry_identity'])])
        actual = dict(**measured(row['current']['css']), program_sha256=spec['program_sha256'], sources=self.context.source_sets[current_hash])
        default = row['case_id'].startswith('mixin-css/')
        identity = dict(material_version='16.2.14', material_manifest_sha256=self.provenance['isolated_environment']['material_manifest_sha256'],
            lock_sha256=self.packet['reference_lock']['sha256'], material_integrity=self.lock['packages']['node_modules/@angular/material']['integrity'],
            catalog=self.packet['oracle' if default else 'catalog']['path'], catalog_sha256=self.packet['oracle' if default else 'catalog']['sha256'],
            expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=self.branch['compiler'])
        invocation = 'modeled-invocation'
        body = dict(kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0, line=self.line,
            run_id=manifest['run_id'], invocation_id=invocation, binding=copy.deepcopy(binding), mutation_rejected=True, error=None,
            case_id=row['case_id'], mixin=spec['mixin'], variant=spec['variant'], call=spec['call'], comparison=subject.SPINNER_SNACK_BRIDGE_CONTRACT,
            tarball_sha256=manifest['artifacts'][0]['sha256'], identity=identity, current_spinner_snack_bridge=self.context.descriptor,
            expected=original, actual=actual, mutation=measured(actual['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'))
        return dict(context=self.context, body=body, active=dict(manifest=manifest, binding=binding), invocation=invocation)

    def test_01_positive_finite_current_context_and_no_old_constructor(self):
        old_constructor, old_assertion = frozen.SpinnerSnackBridgeContract.__init__, frozen.spinner_snack_bridge_assertion_ok
        def forbidden(*args, **kwargs): raise RuntimeError('frozen constructor/assertion must not run')
        frozen.SpinnerSnackBridgeContract.__init__ = forbidden
        frozen.spinner_snack_bridge_assertion_ok = forbidden
        try:
            independent = subject.CurrentSpinnerSnackContract(self.root)
            self.assertEqual(independent.descriptor, self.context.descriptor)
            for row in self.rows:
                self.check('modeled current-source assertion ' + row['case_id'], True, subject.current_spinner_snack_assertion_ok(**self.model(row)))
        finally:
            frozen.SpinnerSnackBridgeContract.__init__, frozen.spinner_snack_bridge_assertion_ok = old_constructor, old_assertion
        self.assertFalse(hasattr(self.context, 'source_context'))

    def test_02_cold_metadata_and_exposed_views(self):
        def set_value(v, path, value):
            current = v
            for key in path[:-1]: current = current[key]
            current[path[-1]] = value
        mutants = {
            'line': (['body', 'line'], 'foreign'), 'case': (['body', 'case_id'], 'mixin-css/all-component-colors'),
            'program': (['body', 'actual', 'program_sha256'], '0' * 64), 'source': (['body', 'actual', 'sources', 0, 'sha256'], '0' * 64),
            'compiler': (['body', 'identity', 'sass_version'], 'foreign'), 'current_compiler': (['body', 'actual', 'sass_version'], 'foreign'), 'current_line': (['body', 'actual', 'line'], 'foreign'),
            'run': (['body', 'run_id'], 'wrong'), 'invocation': (['body', 'invocation_id'], 'wrong'), 'library': (['body', 'tarball_sha256'], '0' * 64),
            'binding': (['body', 'binding', 'source_commit'], '0' * 40), 'active_source': (['active', 'manifest', 'source', 'commit'], '0' * 40),
            'active_artifact': (['active', 'manifest', 'artifacts', 0, 'sha256'], '0' * 64), 'producer': (['body', 'current_spinner_snack_bridge', 'source_subject', 'sha256'], '0' * 64),
            'comparison': (['body', 'comparison'], 'approved'), 'companion': (['body', 'current_companion'], {}),
        }
        for name, (path, value) in mutants.items():
            v = self.model(self.rows[0]); set_value(v, path, value)
            self.check('cold metadata rejects ' + name, False, subject.current_spinner_snack_assertion_ok(**v))
        for name in ['historical_set', 'missing_source', 'duplicate_source', 'missing_mutation', 'fake_context']:
            v = self.model(self.rows[0])
            if name == 'historical_set': v['body']['actual']['sources'] = copy.deepcopy(self.branch['source_sets'][self.branch['cases'][0]['source_set_sha256']])
            elif name == 'missing_source': v['body']['actual']['sources'].pop()
            elif name == 'duplicate_source': v['body']['actual']['sources'].append(v['body']['actual']['sources'][0])
            elif name == 'missing_mutation': del v['body']['mutation']
            else: v['context'] = object.__new__(subject.CurrentSpinnerSnackContract)
            self.check(name + ' rejects', False, subject.current_spinner_snack_assertion_ok(**v))
        descriptor = self.context.descriptor; descriptor['source_modules'][0]['sha256'] = '0' * 64
        sets = self.context.source_sets; sets[next(iter(sets))][0]['sha256'] = '0' * 64
        self.check('public view mutation preserves private authority', True, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))

    def test_03_live_source_and_metadata_guards(self):
        for path in ['scripts/current_sass_spinner_snack_admission.py', self.packet['oracle']['path'], 'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss']:
            with self.assertRaises(AssertionError): subject.CurrentSpinnerSnackContract(self.root, read=lambda p, path=path: b'wrong' if p == path else (self.root / p).read_bytes())
            self.checks.append('cold callback rejects ' + path)
            self.controls['target'] = path
            self.check('late callback rejects ' + path, False, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))
            self.controls['target'] = None
        v = self.model(self.rows[0]); self.controls['hook'] = lambda p: v['body'].__setitem__('call', 'changed')
        self.check('live body mutation rejects', False, subject.current_spinner_snack_assertion_ok(**v))
        class DescriptorTrap(dict):
            def __getitem__(self, key): raise RuntimeError('custom mapping must never execute')
        v = self.model(self.rows[0]); self.controls['hook'] = lambda p: v['body'].__setitem__('identity', DescriptorTrap(v['body']['identity']))
        self.check('late custom mapping rejects without executing it', False, subject.current_spinner_snack_assertion_ok(**v))
        path = 'scripts/current_sass_spinner_snack_admission.py'; file = self.root / path; before = file.read_bytes()
        self.controls['hook'] = lambda p: file.write_bytes(before + b'\n# fixture mutation\n')
        try: self.check('physical fixture mutation rejects', False, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))
        finally: file.write_bytes(before); self.controls['hook'] = None
        self.controls['trace'] = []; self.context.assert_current(); count = len(self.controls['trace']); self.controls['trace'] = None
        seen = 0
        def last_callback(path):
            nonlocal seen
            seen += 1
            if seen < count:
                self.controls['hook'] = last_callback
            else:
                file.write_bytes(before + b'\n# last fixture callback\n')
        self.controls['hook'] = last_callback
        try:
            self.check('last direct-context callback cannot mutate an earlier fixture member', False, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))
            self.assertEqual(seen, count)
        finally: file.write_bytes(before); self.controls['hook'] = None
        self.check('authentic restoration passes', True, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))

    def test_04_js_independent_parity(self):
        child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_spinner_snack_probe.mjs'), str(self.root)], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(child.returncode, 0, child.stderr)
        result = json.loads(child.stdout)
        self.assertEqual(result['descriptor'], self.context.descriptor)
        self.assertEqual(result['source_set_successors'], self.context.source_set_successors)
        self.assertEqual(result['current_source_set_keys'], list(self.context.source_sets))
        self.assertEqual(result['metadata_getter_calls'], 0)
        self.assertEqual(result['reused_css_rows'], 15)
        self.assertGreaterEqual(len(result['checks']), 50)
        type(self).js_result = result
        self.checks.append('independent JS/Python canonical descriptor and source-set parity')

    def test_05_v4_product_cold_late_and_final_callback(self):
        product = 'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts'
        earlier = 'projects/ngx-material-legacy/legacy-select/select.html'
        with self.assertRaises(AssertionError):
            subject.CurrentSpinnerSnackContract(self.root, read=lambda p: b'wrong' if p == product else (self.root / p).read_bytes())
        self.controls['target'] = product
        self.check('v4 product late callback rejects', False, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))
        self.controls['target'] = None
        file = self.root / earlier
        original = file.read_bytes()
        self.controls['trace'] = []
        self.context.assert_current()
        count = len(self.controls['trace'])
        self.controls['trace'] = None
        seen = 0
        def last_callback(_):
            nonlocal seen
            seen += 1
            if seen < count:
                self.controls['hook'] = last_callback
            else:
                file.write_bytes(original + b'\n<!-- changed -->\n')
        self.controls['hook'] = last_callback
        try:
            self.check('v4 product final callback rejects', False, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))
            self.assertEqual(seen, count)
        finally:
            file.write_bytes(original)
            self.controls['hook'] = None
        self.check('v4 product restored', True, subject.current_spinner_snack_assertion_ok(**self.model(self.rows[0])))


if __name__ == '__main__': unittest.main()
