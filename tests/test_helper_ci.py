# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""CI partitioning preserves membership and executes real fixture children."""
import ast
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('helper_ci_subject', ROOT / 'scripts/helper_ci.py')
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


class HelperCiTests(unittest.TestCase):
    def fixture(self, directory, *, fail=False, skip=False):
        root = Path(directory)
        folder = root / 'tests'
        folder.mkdir()
        paths = []
        for nested in [False, True]:
            parent = folder / 'nested' if nested else folder
            parent.mkdir(exist_ok=True)
            path = parent / ('test_ci_fixture_' + uuid.uuid4().hex + '.py')
            body = "from pathlib import Path\nimport unittest\nclass Fixture(unittest.TestCase):\n"
            body += " def test_body(self):\n"
            if skip and nested:
                body += "  self.skipTest('fixture optional environment')\n"
            else:
                body += '  Path(' + repr(str(root / ('nested-ran' if nested else 'root-ran'))) + ").write_text('ran')\n"
                if fail and nested:
                    body += "  self.fail('fixture child failure')\n"
            path.write_text(body)
            paths.append(path.relative_to(root).as_posix())
        loaded, baseline = ci.discover_tests(root)
        plan = {'modules': [{**ci.source(root, path), 'test_ids': [t.id() for t in loaded[path]]} for path in sorted(loaded)],
                'groups': ci.groups_for(sorted(loaded)), 'sources': [ci.source(root, path) for path in paths]}
        return root, plan, loaded, baseline

    def test_round_robin_covers_every_module_once_and_is_bounded(self):
        paths = [f'tests/test_{i:04}.py' for i in range(569)]
        groups = ci.groups_for(paths)
        self.assertEqual(len(groups), 143)
        self.assertEqual(sorted(p for g in groups for p in g['modules']), sorted(paths))
        self.assertTrue(all(len(g['modules']) <= 4 for g in groups))
        for invalid in [[], ['a', 'a'], [str(i) for i in range(1025)]]:
            with self.assertRaises(ValueError):
                ci.groups_for(invalid)

    def test_public_discovery_includes_nonpackage_nested_modules_and_real_execution(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan, loaded, baseline = self.fixture(td)
            self.assertEqual(len(loaded), 2)
            self.assertEqual(len(baseline), 1)
            report = ci.run_unit_group(root, plan, loaded, plan['groups'][0]['id'], stream=io.StringIO())
            self.assertEqual(report['result'], 'pass')
            self.assertEqual(report['tests_run'], 2)
            self.assertTrue((root / 'root-ran').exists() and (root / 'nested-ran').exists())

    def test_real_failed_unit_case_remains_failed(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan, loaded, _ = self.fixture(td, fail=True)
            report = ci.run_unit_group(root, plan, loaded, plan['groups'][0]['id'], stream=io.StringIO())
            self.assertEqual(report['result'], 'fail')
            self.assertEqual(report['tests_run'], 2)
            self.assertEqual(len(report['failures']), 1)

    def test_optional_test_skip_is_recorded_without_changing_old_unittest_semantics(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan, loaded, _ = self.fixture(td, skip=True)
            report = ci.run_unit_group(root, plan, loaded, plan['groups'][0]['id'], stream=io.StringIO())
            self.assertEqual(report['tests_run'], 2)
            self.assertEqual(len(report['skipped']), 1)
            self.assertEqual(report['result'], 'pass')

    def test_changed_sources_and_unknown_group_reject_before_execution(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan, loaded, _ = self.fixture(td)
            with self.assertRaises(ValueError):
                ci.run_unit_group(root, plan, loaded, 'unknown', stream=io.StringIO())
            (root / plan['sources'][0]['path']).write_text('# changed\n')
            with self.assertRaises(ValueError):
                ci.run_unit_group(root, plan, loaded, plan['groups'][0]['id'], stream=io.StringIO())
            self.assertFalse((root / 'root-ran').exists())

    def test_duplicate_module_names_and_import_failures_reject_discovery(self):
        for fault in ['duplicate', 'import-error', 'empty']:
            with self.subTest(fault=fault), tempfile.TemporaryDirectory() as td:
                root = Path(td)
                (root / 'tests/nested').mkdir(parents=True)
                name = 'test_ci_fixture_' + uuid.uuid4().hex + '.py'
                (root / 'tests' / name).write_text('raise RuntimeError("fixture import failure")\n' if fault == 'import-error' else '# empty fixture\n')
                if fault == 'duplicate':
                    (root / 'tests/nested' / name).write_text('# duplicate\n')
                with self.assertRaises(ValueError):
                    ci.discover_tests(root)

    def needs(self):
        result = {name: {'result': 'success'} for name in ci.DEPENDENCIES}
        result['helper-plan']['outputs'] = {'source_commit': 'a' * 40, 'plan_digest': 'b' * 64,
                                            'test_matrix': json.dumps({'group': ['group-001']}),
                                            'phase_matrix': json.dumps({'phase': ['one', 'two']})}
        return result

    def test_aggregate_requires_every_job_to_succeed(self):
        valid = self.needs()
        ci.verify_needs(valid, commit='a' * 40, phase_ids=['one', 'two'])
        for dependency in ci.DEPENDENCIES:
            for status in ['failure', 'cancelled', 'skipped', '']:
                bad = copy.deepcopy(valid)
                bad[dependency]['result'] = status
                with self.subTest(dependency=dependency, status=status), self.assertRaises(ValueError):
                    ci.verify_needs(bad, commit='a' * 40, phase_ids=['one', 'two'])
        for fault in ['missing-job', 'extra-job', 'wrong-commit', 'missing-digest', 'empty-groups', 'duplicate-groups', 'missing-phase', 'duplicate-phase']:
            bad = copy.deepcopy(valid)
            if fault == 'missing-job':
                bad.pop('helper-static')
            elif fault == 'extra-job':
                bad['extra'] = {'result': 'success'}
            else:
                outputs = bad['helper-plan']['outputs']
                key, value = {'wrong-commit': ('source_commit', 'c' * 40), 'missing-digest': ('plan_digest', ''),
                              'empty-groups': ('test_matrix', '{"group":[]}'),
                              'duplicate-groups': ('test_matrix', '{"group":["group-001","group-001"]}'),
                              'missing-phase': ('phase_matrix', '{"phase":["one"]}'),
                              'duplicate-phase': ('phase_matrix', '{"phase":["one","one"]}')}[fault]
                outputs[key] = value
            with self.subTest(fault=fault), self.assertRaises(ValueError):
                ci.verify_needs(bad, commit='a' * 40, phase_ids=['one', 'two'])

    def phase_fixture(self, directory, *, fault=None):
        root = Path(directory)
        (root / 'tests').mkdir()
        (root / 'input.json').write_text('{}\n')
        subjects = [ci.source(root, 'input.json')]
        result = {'line': 'main', 'result': 'pass', 'phase': 'fixture', 'cases': ['positive'], 'rejected': ['negative'],
                  'subjects': subjects, 'full_retained_roster_executed': False,
                  'actual_native_artifact_browser_floor_or_full_audit_qualified': False,
                  'current_native_packed_or_floor_or_g11_credit': False}
        if fault == 'wrong-control':
            result['rejected'] = []
        if fault == 'wrong-subject':
            result['subjects'] = []
        if fault == 'overclaim':
            result['full_retained_roster_executed'] = True
        code = "import{writeFileSync}from'node:fs';writeFileSync('child-executed','yes');\n"
        code += 'console.log(JSON.stringify(' + json.dumps(result) + '));\n'
        if fault == 'failure':
            code += 'process.exit(7);\n'
        if fault == 'late-source':
            code += "writeFileSync('input.json','changed');\n"
        (root / 'tests/packed_upstream_ledger_epoch_probe.mjs').write_text(code)
        plan = {'line': 'main', 'retained': {'subjects': subjects, 'phases': [{'id': 'fixture', 'cases': ['positive'], 'rejected': ['negative']}]},
                'sources': subjects + [ci.source(root, 'tests/packed_upstream_ledger_epoch_probe.mjs')]}
        return root, plan

    def test_real_phase_child_and_corruption_controls(self):
        for fault in [None, 'failure', 'wrong-control', 'wrong-subject', 'overclaim', 'late-source']:
            with self.subTest(fault=fault), tempfile.TemporaryDirectory() as td:
                root, plan = self.phase_fixture(td, fault=fault)
                report = ci.run_retained_phase(root, plan, 'fixture')
                self.assertTrue((root / 'child-executed').exists())
                self.assertEqual(report['result'], 'pass' if fault is None else 'fail')
                if fault == 'failure':
                    self.assertEqual(report['child_exit_code'], 7)

    def test_unknown_phase_refuses_before_child_execution(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan = self.phase_fixture(td)
            with self.assertRaises(ValueError):
                ci.run_retained_phase(root, plan, 'unknown')
            self.assertFalse((root / 'child-executed').exists())

    def test_branch_static_commands_and_main_coherence_remain_exact(self):
        parent = '56d819dce2d0ba116c031cb52200d7a2ee8747ef' if (ROOT / 'scripts/run-helper-checks.py').exists() else '14d79197c54b5d0fa14e6c06ecd611a564281c8d'
        path, actual, coherence = ci.static_configuration(ROOT)
        original = subprocess.check_output(['git', '--no-replace-objects', 'show', parent + ':' + path], cwd=ROOT, text=True)
        tree = ast.parse(original)
        checks = ast.literal_eval(next(n.value for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'CHECKS' for t in n.targets)))
        expected = [command for command in checks if command not in ci.DISCOVERY_COMMANDS]
        if coherence:
            expected += [['python3', '-B', 'compatibility/handoff/codex-closeout/tools/validate_handoff.py'],
                         ['python3', '-B', '-m', 'unittest', 'discover', '-s', 'compatibility/handoff/codex-closeout/tools', '-p', 'test_*.py'],
                         ['node', 'scripts/motion-lifecycle-smoke.mjs']]
            old_main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
            stop = next(i for i, n in enumerate(old_main.body) if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Name) and n.value.func.id == 'run_checks')
            current = ast.parse((ROOT / path).read_bytes())
            moved = next(n for n in current.body if isinstance(n, ast.FunctionDef) and n.name == 'check_coherence')
            self.assertEqual([ast.dump(n) for n in moved.body], [ast.dump(n) for n in old_main.body[1:stop]])
        self.assertEqual(actual, expected)
        self.assertFalse(any(command in ci.DISCOVERY_COMMANDS for command in actual))

    def test_report_paths_cannot_be_reused(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / 'report.json'
            ci.write_report(path, {'result': 'fixture'})
            with self.assertRaises(FileExistsError):
                ci.write_report(path, {'result': 'different'})
            self.assertEqual(json.loads(path.read_bytes())['result'], 'fixture')

    def test_workflow_preserves_product_jobs_and_requires_full_helper_aggregation(self):
        parent = '56d819dce2d0ba116c031cb52200d7a2ee8747ef' if (ROOT / 'scripts/run-helper-checks.py').exists() else '14d79197c54b5d0fa14e6c06ecd611a564281c8d'
        original = subprocess.check_output(['git', '--no-replace-objects', 'show', parent + ':.github/workflows/ci.yml'], cwd=ROOT, text=True)
        current = (ROOT / '.github/workflows/ci.yml').read_text()
        self.assertEqual(current.split('jobs:\n')[0], original.split('jobs:\n')[0])
        source_regressions = (
            '      - name: Dialog focus and motion source lifecycle regressions\n'
            '        run: |\n'
            '          just chainman exec -- node scripts/dialog-initial-focus-source-test.mjs\n'
            '          just chainman exec -- node scripts/dialog-motion-source-test.mjs\n'
            '\n'
        )
        self.assertEqual(current.count(source_regressions), 1)
        self.assertEqual(current.split('  packed-consumer-aot:\n')[1].replace(source_regressions, ''),
                         original.split('  packed-consumer-aot:\n')[1])
        helper = current.split('  packed-consumer-aot:\n')[0]
        old_required = original.split('  helper-checks:\n')[1].split('    name: ')[1].splitlines()[0]
        gate = helper.split('  helper-checks:\n')[1]
        self.assertIn('    name: ' + old_required + '\n', gate)
        self.assertIn('    if: always()\n', gate)
        self.assertIn('    needs: [helper-plan, helper-static, helper-unit-tests, helper-retained-phases]\n', gate)
        self.assertIn('          HELPER_NEEDS: ${{ toJSON(needs) }}', gate)
        self.assertIn('run: python3 scripts/helper_ci.py gate', gate)
        self.assertNotIn('continue-on-error', helper)
        self.assertNotIn('|| true', helper)
        self.assertEqual(helper.count('      fail-fast: false'), 2)
        self.assertIn('      max-parallel: 4\n', helper)
        self.assertIn('      max-parallel: 2\n', helper)
        self.assertEqual(helper.count('just chainman setup javascript'), 4)
        self.assertEqual(helper.count('--expected-plan "$EXPECTED_HELPER_PLAN"'), 3)
        self.assertIn('matrix: ${{ fromJSON(needs.helper-plan.outputs.test_matrix) }}', helper)
        self.assertIn('matrix: ${{ fromJSON(needs.helper-plan.outputs.phase_matrix) }}', helper)

    def test_every_original_retained_python_assertion_survives_shared_population_validation(self):
        from collections import Counter
        path = 'tests/test_packed_upstream_ledger_epoch.py'
        parent = '56d819dce2d0ba116c031cb52200d7a2ee8747ef' if (ROOT / 'scripts/run-helper-checks.py').exists() else '14d79197c54b5d0fa14e6c06ecd611a564281c8d'
        old = ast.parse(subprocess.check_output(['git', '--no-replace-objects', 'show', parent + ':' + path], cwd=ROOT))
        current = ast.parse((ROOT / path).read_bytes())
        def method(tree):
            return next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == 'test_current_subjects_gate_the_exact_historical_ledger')
        def assertions(node):
            return Counter(ast.dump(n) for n in ast.walk(node) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name) and n.func.value.id == 'self' and n.func.attr.startswith('assert'))
        shared = next(n for n in current.body if isinstance(n, ast.FunctionDef) and n.name == 'verify_retained_population')
        self.assertEqual(assertions(method(current)) + assertions(shared), assertions(method(old)))
        owner = ci.load_script(ROOT, path, 'helper_ci_retained_assertions')
        # Recorded actual output is a validator fixture only. It carries no
        # current-source or full-roster qualification in this test.
        recorded = json.loads((ROOT / 'compatibility/rc/c04-retained-ledger-phases-stage-population.json').read_bytes())['summary']
        expected = recorded['original_dispositions_changed']
        owner.verify_retained_population(recorded, expected)
        fields = set()
        for node in ast.walk(shared):
            if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id == 'report' and isinstance(node.slice, ast.Constant) and type(recorded.get(node.slice.value)) in (int, bool):
                fields.add(node.slice.value)
        self.assertGreaterEqual(len(fields), 6)
        for field in sorted(fields):
            bad = copy.deepcopy(recorded)
            bad[field] = not bad[field] if isinstance(bad[field], bool) else bad[field] + 1
            with self.subTest(counter=field), self.assertRaises(AssertionError):
                owner.verify_retained_population(bad, expected)

    def test_ci_phase_invokes_required_python_counter_validator(self):
        with tempfile.TemporaryDirectory() as td:
            root, plan = self.phase_fixture(td)
            plan['retained']['phases'][0]['id'] = 'canonical'
            probe = root / 'tests/packed_upstream_ledger_epoch_probe.mjs'
            probe.write_text(probe.read_text().replace('"phase": "fixture"', '"phase": "canonical"'))
            validator = root / 'tests/test_packed_upstream_ledger_epoch.py'
            validator.write_text("def verify_ci_phase_contract(report, catalogue):\n raise AssertionError('fixture required counter failed')\n")
            plan['sources'] = [ci.source(root, row['path']) for row in plan['sources']] + [ci.source(root, validator.relative_to(root).as_posix())]
            report = ci.run_retained_phase(root, plan, 'canonical')
            self.assertEqual(report['child_exit_code'], 0)
            self.assertEqual(report['result'], 'fail')
            self.assertIn('fixture required counter failed', report['error'])
