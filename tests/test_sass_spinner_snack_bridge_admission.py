# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent replay of existing CSS; assertion envelopes are modeled, not packed."""
from pathlib import Path
import copy
import hashlib
import json
import os
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sass_spinner_snack_bridge_admission as subject
from current_sass_spinner_snack_admission import (CurrentSpinnerSnackContract,
    current_spinner_snack_assertion_ok)

PREFIX = 'compatibility/rc/parallel-spinner-snack-css-contract-'
def digest(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()
def measured(css):
    return dict(css=css, css_sha256=digest(css), css_bytes=len(css.encode()))
def ref(path):
    raw = (ROOT / path).read_bytes()
    return dict(path=path, sha256=digest(raw), bytes=len(raw))

class SpinnerSnackBridgeAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.packet = json.loads((ROOT / (PREFIX + 'inputs-v1.json')).read_bytes())
        cls.line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        cls.branch = cls.packet['branches'][cls.line]
        cls.diagnostic = json.loads((ROOT / cls.branch['observation']['path']).read_bytes())
        cls.catalog = json.loads((ROOT / cls.packet['catalog']['path']).read_bytes())
        cls.provenance = json.loads((ROOT / cls.packet['provenance']['path']).read_bytes())
        cls.lock = json.loads((ROOT / cls.packet['reference_lock']['path']).read_bytes())
        cls.checks, cls.results, cls.completed = [], [], set()
        cls.controls = dict(target=None, hook=None)
        def callback(path):
            if cls.controls['hook'] is not None:
                action = cls.controls['hook']
                cls.controls['hook'] = None
                action()
            return b'nonphysical' if path == cls.controls['target'] else (ROOT / path).read_bytes()
        cls.context = CurrentSpinnerSnackContract(ROOT, read=callback)
    def yes(self, name, value):
        self.assertTrue(value, name)
        self.checks.append(name)
    def no(self, name, value):
        self.assertFalse(value, name)
        self.checks.append(name)
    def model(self, row):
        spec = next(value for value in self.branch['cases'] if value['case_id'] == row['case_id'])
        manifest = dict(run_id='modeled-direct-contract-' + self.line,
                        source=dict(line=self.line, commit='2' * 40, git_tree_sha='3' * 40, content_sha256='4' * 64),
                        artifacts=[dict(id='library', sha256='1' * 64)])
        binding = dict(run_id=manifest['run_id'], source_line=self.line, source_commit=manifest['source']['commit'],
                       source_tree=manifest['source']['git_tree_sha'], source_content_sha256=manifest['source']['content_sha256'],
                       artifacts_sha256=digest(json.dumps(manifest['artifacts'], sort_keys=True, separators=(',', ':'))))
        active, invocation = dict(manifest=manifest, binding=binding), 'modeled-invocation'
        original = dict(**measured(row['historical']['css']), program_sha256=spec['program_sha256'], sources=[dict(root=0, **self.catalog['original_entry_identity'])])
        source_key = next(row['current_sha256'] for row in self.context.source_set_successors if row['historical_sha256'] == spec['source_set_sha256'])
        actual = dict(**measured(row['current']['css']), program_sha256=spec['program_sha256'], sources=self.context.source_sets[source_key])
        default = row['case_id'].startswith('mixin-css/')
        identity = dict(material_version='16.2.14', material_manifest_sha256=self.provenance['isolated_environment']['material_manifest_sha256'],
                        lock_sha256=self.packet['reference_lock']['sha256'], material_integrity=self.lock['packages']['node_modules/@angular/material']['integrity'],
                        catalog=self.packet['oracle' if default else 'catalog']['path'], catalog_sha256=self.packet['oracle' if default else 'catalog']['sha256'],
                        expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=self.branch['compiler'])
        bridge = self.context.descriptor
        wrong = actual['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'
        body = dict(kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0,
                    line=self.line, run_id=manifest['run_id'], invocation_id=invocation, binding=copy.deepcopy(binding), mutation_rejected=True, error=None,
                    case_id=row['case_id'], mixin=row['mixin'], variant=row['variant'], call=row['call'], comparison=subject.SPINNER_SNACK_BRIDGE_CONTRACT,
                    tarball_sha256=manifest['artifacts'][0]['sha256'], identity=identity, current_spinner_snack_bridge=copy.deepcopy(bridge), expected=original, actual=actual, mutation=measured(wrong))
        return dict(body=body, active=active, invocation=invocation)
    def test_pure_exact_positions_and_full_original_css(self):
        self.assertEqual(tuple(row['case_id'] for row in self.diagnostic['rows']), subject.SPINNER_SNACK_BRIDGE_CASES)
        for row in self.diagnostic['rows']:
            family = 'progress-spinner' if row['mixin'].startswith('progress-spinner-') else 'snack-bar'
            dimension = row['mixin'][len(family) + 1:]
            args = dict(case_id=row['case_id'], line=self.line, original=row['historical'], actual=row['current'])
            self.yes('pure positive ' + row['case_id'], subject.spinner_snack_bridge_results_match(**args))
            self.yes('low-level positive ' + row['case_id'], subject.spinner_snack_positioned_token_results_match(family=family, dimension=dimension, original=row['historical'], actual=row['current']))
            expected = subject.spinner_snack_bridge_expected_css(case_id=row['case_id'], line=self.line, original=row['historical'])
            self.assertEqual(expected, row['current']['css'])
            self.results.append(dict(case_id=row['case_id'], expected_css_sha256=digest(expected), added_declarations=row['added_declarations']))
            aliases = [line for line in row['current']['css'].split('\n') if line.startswith('  --mat-progress-spinner-active-indicator') or line.startswith('  --mat-snack-bar-container') or line.startswith('  --mat-snack-bar-supporting-text')]
            self.assertEqual(len(aliases), row['added_declarations'])
            first = aliases[0]
            property_name = first.split(':', 1)[0]
            css = row['current']['css']
            mutants = dict(omission=css.replace(first + '\n', '', 1), wrong_value=css.replace(first, property_name + ': wrong;', 1),
                           moved_selector=css.replace('.mat-mdc-', '.moved-mdc-', 1), unrelated_rule=css + '\n.unrelated { color: red; }',
                           duplicate=css.replace(first, first + '\n' + first, 1), old_token_mutation=css.replace('--mdc-', '--unrelated-', 1),
                           reordered_alias=css.replace(first + '\n', '', 1).replace('{\n', '{\n' + first + '\n', 1))
            for name, mutant in mutants.items():
                self.no(name + ' ' + row['case_id'], subject.spinner_snack_bridge_results_match(**{**args, 'actual': measured(mutant)}))
            self.no('changed original ' + row['case_id'], subject.spinner_snack_bridge_results_match(**{**args, 'original': measured(row['historical']['css'] + '\n')}))
            self.assertIsNone(subject.spinner_snack_positioned_token_css(family=family, dimension=dimension, original_css=row['historical']['css'].replace('.mat-mdc-', '.unknown-', 1)))
            self.checks.append('unknown selector rejects ' + row['case_id'])
            for name, css in [('trailing newline', row['historical']['css'] + '\n'), ('unrelated original declaration', row['historical']['css'].replace('{\n', '{\n  --unrelated: red;\n', 1))]:
                self.assertIsNone(subject.spinner_snack_positioned_token_css(family=family, dimension=dimension, original_css=css))
                self.checks.append('strict low-level ' + name + ' ' + row['case_id'])
        for unknown in ['mixin-css/all-component-colors', 'mixin-css/all-component-themes', 'mixin-css/all-component-typographies',
                        'mixin-argument/all-component-colors/custom-full-theme', 'mixin-argument/all-component-colors/raw-color-config',
                        'mixin-argument/all-component-themes/custom-full-theme', 'mixin-argument/all-component-themes/custom-dark-theme',
                        'mixin-argument/all-component-typographies/custom-full-theme', 'mixin-argument/all-component-typographies/raw-typography-config']:
            self.assertIsNone(subject.spinner_snack_bridge_expected_css(case_id=unknown, line=self.line, original=self.diagnostic['rows'][0]['historical']))
            self.checks.append('excluded aggregate ' + unknown)
        self.assertIsNone(subject.spinner_snack_bridge_expected_css(case_id=self.diagnostic['rows'][0]['case_id'], line='unknown', original=self.diagnostic['rows'][0]['historical']))
        self.checks.append('unknown line rejects')
        self.completed.add('pure')
    def test_modeled_assertion_identity_and_live_guards(self):
        for row in self.diagnostic['rows']:
            self.yes('modeled artifact composition ' + row['case_id'], current_spinner_snack_assertion_ok(context=self.context, **self.model(row)))
        original = self.model(self.diagnostic['rows'][0])
        def change(path, value):
            def mutation(body):
                current = body
                for key in path[:-1]:
                    current = current[key]
                current[path[-1]] = value
            return mutation
        mutants = dict(unknown_line=change(['body', 'line'], 'unknown'), wrong_known_line=change(['body', 'line'], 'main' if self.line == '21.x' else '21.x'),
                       case=change(['body', 'case_id'], 'mixin-css/all-component-colors'), call=change(['body', 'call'], 'changed'),
                       program=change(['body', 'actual', 'program_sha256'], '0' * 64), source=change(['body', 'actual', 'sources', 0, 'sha256'], '0' * 64),
                       compiler=change(['body', 'current_spinner_snack_bridge', 'compiler_inputs', 0, 'sha256'], '0' * 64),
                       oracle=change(['body', 'identity', 'catalog_sha256'], '0' * 64), minimum=change(['body', 'current_spinner_snack_bridge', 'source_modules', 0, 'sha256'], '0' * 64),
                       run=change(['body', 'run_id'], 'wrong'), invocation=change(['body', 'invocation_id'], 'wrong'), library=change(['body', 'tarball_sha256'], '0' * 64),
                       binding=change(['body', 'binding', 'source_commit'], '0' * 40), active_source=change(['active', 'manifest', 'source', 'commit'], '0' * 40),
                       active_artifact=change(['active', 'manifest', 'artifacts', 0, 'sha256'], '0' * 64), producer=change(['body', 'current_spinner_snack_bridge', 'source_subject', 'sha256'], '0' * 64),
                       original_identity=change(['body', 'identity', 'expected_source'], 'candidate'), standalone_flag=change(['body'], dict(approved=True)))
        for name, action in mutants.items():
            value = copy.deepcopy(original)
            action(value)
            self.no('metadata ' + name, current_spinner_snack_assertion_ok(context=self.context, **value))
        for name in ['missing_source', 'duplicate_source', 'missing_mutation']:
            value = copy.deepcopy(original)
            if name == 'missing_source':
                value['body']['actual']['sources'].pop()
            elif name == 'duplicate_source':
                value['body']['actual']['sources'].append(value['body']['actual']['sources'][0])
            else:
                del value['body']['mutation']
            self.no(name, current_spinner_snack_assertion_ok(context=self.context, **value))
        fake = object.__new__(CurrentSpinnerSnackContract)
        self.no('unregistered context object cannot grant authority', current_spinner_snack_assertion_ok(context=fake, **original))
        paths = [self.packet['oracle']['path'], self.packet['catalog']['path'], self.packet['compiler_inputs'][2]['path'], self.context.descriptor['source_modules'][0]['path']]
        for path in paths:
            with self.assertRaises(AssertionError):
                CurrentSpinnerSnackContract(ROOT, read=lambda candidate, target=path: b'changed' if candidate == target else (ROOT / candidate).read_bytes())
            self.checks.append('cold callback ' + path)
        for path in [self.packet['oracle']['path'], self.packet['compiler_inputs'][2]['path']] + [row['path'] for row in self.context.descriptor['source_modules']]:
            self.controls['target'] = path
            self.no('late callback ' + path, current_spinner_snack_assertion_ok(context=self.context, **original))
            self.controls['target'] = None
            self.context.assert_current()
        live = copy.deepcopy(original)
        self.controls['hook'] = lambda: live['body'].__setitem__('call', 'changed-during-source-guard')
        self.no('live metadata mutation during source guard', current_spinner_snack_assertion_ok(context=self.context, **live))
        live['body']['call'] = original['body']['call']
        self.yes('authentic restoration after metadata/source faults', current_spinner_snack_assertion_ok(context=self.context, **live))
        self.completed.add('composition')
    @classmethod
    def tearDownClass(cls):
        if cls.completed != {'pure', 'composition'} or not os.environ.get('CURRENT_SASS_SPINNER_SNACK_MAINTAINED_RECEIPT'):
            return
        suffix = '21' if cls.line == '21.x' else 'main'
        report = dict(schema_version=1, line=cls.line, python='3.14.7', status='finite-direct-current-source-comparator-controls-pass', checks_passed=len(cls.checks), checks=cls.checks,
                      case_results=cls.results, source_inputs=[ref(path) for path in ['scripts/current_sass_spinner_snack_admission.py', 'scripts/current_sass_source.py', 'scripts/sass_spinner_snack_bridge_admission.py', PREFIX + 'inputs-v1.json', cls.packet['source_subject']['path'], cls.packet['source_packet']['path'], cls.branch['observation']['path']]],
                      pure_compiled_rows_reused=15, modeled_assertion_positives=15, actual_packed_assertions_executed=0, actual_independent_source_context_constructed=True,
                      current_source_descriptor=cls.context.descriptor, current_source_set_successors=cls.context.source_set_successors, old_physical_constructor_executed=False, current_source_module_count=4,
                      fresh_sass_compile_executed=False, existing_gates_or_goldens_edited=False, physical_files_mutated=False, indirect_aggregate_cases_qualified=0,
                      actual_native_packed_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed')
        path = ROOT / os.environ['CURRENT_SASS_SPINNER_SNACK_MAINTAINED_RECEIPT']
        assert path.parent == ROOT / 'compatibility/rc' and path.name.startswith('current-sass-spinner-snack-maintained-tests-python-controls-') and path.suffix == '.json'
        assert not path.exists()
        path.write_text(json.dumps(report, indent=2) + '\n')

if __name__ == '__main__':
    unittest.main()
