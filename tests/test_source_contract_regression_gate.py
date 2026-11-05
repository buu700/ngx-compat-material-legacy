# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise mandatory RC mechanics with synthetic evidence, never G11 credit."""
import ast
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'tests'))
import rc_acceptance as acceptance
from test_rc_acceptance import CompleteFixture, write_json


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verify = load('source_regression_gate_coordinator', ROOT / 'scripts/rc-verify.py')
producer = load('source_regression_gate_producer', ROOT / 'scripts/check-source-contract-regressions.py')
CHECK = 'source-contract-regressions'


def rebind_synthetic_matrix(fixture):
    """Create a consistent synthetic cut to test contract failure, not drift."""
    write_json(fixture.matrix_path, fixture.matrix)
    fixture.matrix_sha = acceptance.sha256_file(fixture.matrix_path)
    fixture.run['expected_matrix']['sha256'] = fixture.matrix_sha
    fixture.write_pack_record()
    fixture.binding = acceptance.binding_for(fixture.run, fixture.matrix_sha)
    for cid, report in fixture.reports.items():
        report['binding'] = fixture.binding
        if cid == 'pack-library':
            report['prepack_binding'] = fixture.pack_record['binding']
        fixture.save_report(cid)
    fixture.save_execution_record()


class GateContractTests(unittest.TestCase):
    def test_actual_matrix_and_independent_crosswalk_require_both_suites_on_both_lines(self):
        self.assertEqual(acceptance.CHECK_CONTRACT[CHECK],
                         (('G11',), 'source', ('source',), ('current-source-regressions',)))
        matrix = acceptance.read_json(ROOT / 'compatibility/rc/matrices/full-verify.json')
        row = acceptance.validate_matrix(matrix)[CHECK]
        self.assertIs(row['required'], True)
        self.assertIs(row['implemented'], True)
        for line in ('main', '21.x'):
            self.assertEqual(acceptance.expected_cases(row, line), producer.IDS)
        for mode in ('omitted', 'not-required', 'missing-group', 'missing-checker', 'missing-browser', 'substituted-case', 'unresolved-cases'):
            candidate = copy.deepcopy(matrix)
            target = next(r for r in candidate['checks'] if r['check_id'] == CHECK)
            if mode == 'omitted':
                candidate['checks'].remove(target)
            elif mode == 'not-required':
                target['required'] = False
            elif mode == 'missing-group':
                target['acceptance']['cases_by_line']['21.x'].pop('current-source-regressions')
            else:
                group = target['acceptance']['cases_by_line']['21.x']
                if mode == 'missing-checker':
                    group['current-source-regressions'] = producer.IDS[1:]
                elif mode == 'missing-browser':
                    group['current-source-regressions'] = producer.IDS[:1]
                elif mode == 'unresolved-cases':
                    group['current-source-regressions'] = None
                else:
                    group['current-source-regressions'] = [producer.IDS[0], 'substituted/weak-case']
            with self.subTest(mode=mode), self.assertRaises(acceptance.EvidenceError):
                acceptance.validate_matrix(candidate)

    def test_disabled_implementation_stays_incomplete_with_consistent_synthetic_cut(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = CompleteFixture(Path(directory))
            row = next(r for r in fixture.matrix['checks'] if r['check_id'] == CHECK)
            row['implemented'] = False
            rebind_synthetic_matrix(fixture)
            result = fixture.evaluate()
            self.assertIn('runner not implemented', str(result['incomplete_checks'][CHECK]))

    def test_missing_failed_stale_or_mismatched_evidence_cannot_rescue_gate(self):
        for mode in ('uninvoked', 'failed-child', 'missing-report', 'stale-nonce',
                     'wrong-run', 'wrong-line', 'source-mismatch', 'changed-output', 'slice'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                fixture = CompleteFixture(Path(directory))
                report = fixture.reports[CHECK]
                if mode == 'uninvoked':
                    del fixture.exits[CHECK]
                elif mode == 'failed-child':
                    fixture.exits[CHECK] = 7
                elif mode == 'missing-report':
                    (fixture.run_dir / 'reports' / (CHECK + '.json')).unlink()
                elif mode == 'stale-nonce':
                    report['invocation_id'] = 'old-nonce'
                elif mode == 'wrong-run':
                    report['run_id'] = 'old-run'
                elif mode == 'wrong-line':
                    report['line'] = '21.x'
                elif mode == 'source-mismatch':
                    report['binding'] = {**fixture.binding, 'source_commit': 'f' * 40}
                elif mode == 'changed-output':
                    (fixture.run_dir / report['outputs'][0]['path']).write_text('changed assertion bytes')
                else:
                    report['coverage'] = 'slice'
                if mode != 'missing-report':
                    fixture.save_report(CHECK)
                result = fixture.evaluate()
                self.assertEqual(result['automatic_product_result'], 'incomplete')
                self.assertIn(CHECK, result['incomplete_checks'])

    def test_real_producer_envelope_is_accepted_only_as_synthetic_evaluator_evidence(self):
        for line in ('main', '21.x'):
            with self.subTest(line=line), tempfile.TemporaryDirectory() as directory:
                fixture = CompleteFixture(Path(directory), line=line)
                row = next(r for r in fixture.matrix['checks'] if r['check_id'] == CHECK)
                for current in ('main', '21.x'):
                    row['acceptance']['cases_by_line'][current]['current-source-regressions'] = producer.IDS
                rebind_synthetic_matrix(fixture)
                report_path = fixture.run_dir / 'reports' / (CHECK + '.json')
                report_path.unlink()
                output = fixture.run_dir / acceptance.assertion_directory(CHECK, fixture.invocations[CHECK])
                request = {'run_id': fixture.run['run_id'], 'invocation': fixture.invocations[CHECK],
                           'line': line, 'binding': fixture.binding, 'run_dir': fixture.run_dir, 'output': output}
                cases = [{'case_id': case_id, 'result': 'pass'} for case_id in producer.IDS]
                self.assertTrue(producer.write_acceptance(request, cases,
                                {'synthetic': 'envelope test; no source suite ran'}, ('a' * 40, 'b' * 40)))
                result = fixture.evaluate()
                self.assertIn(CHECK, result['complete_checks'], result)
                self.assertEqual(result['g_gates_claimed'], [])
                with self.assertRaises(FileExistsError):
                    producer.write_acceptance(request, cases, {}, ('a' * 40, 'b' * 40))


class CoordinatorExecutionTests(unittest.TestCase):
    def test_real_coordinator_invokes_python_with_fresh_authority_and_records_actual_exit(self):
        for outcome in (0, 7):
            with self.subTest(outcome=outcome), tempfile.TemporaryDirectory() as directory:
                fixture = CompleteFixture(Path(directory))
                run = verify.RunEvidence(fixture.run, fixture.run_dir, fixture.matrix_sha)
                results, implemented = {}, []
                report_path = fixture.run_dir / 'reports' / (CHECK + '.json')
                child_body = {}

                def child(command, **kwargs):
                    self.assertEqual(command, [sys.executable, str(fixture.root / 'scripts/check-source-contract-regressions.py')])
                    self.assertEqual(kwargs['cwd'], fixture.root)
                    env = kwargs['env']
                    self.assertEqual(env['RC_CHECK_ID'], CHECK)
                    self.assertEqual(env['RC_RUN_ID'], fixture.run['run_id'])
                    self.assertEqual(json.loads(env['RC_EVIDENCE_BINDING']), run.binding)
                    self.assertEqual(env['RC_INVOCATION_ID'], run.invocations[CHECK])
                    self.assertEqual(Path(env['RC_ASSERTION_OUTPUT_DIR']), fixture.run_dir /
                                     acceptance.assertion_directory(CHECK, run.invocations[CHECK]))
                    self.assertTrue(Path(env['RC_ASSERTION_OUTPUT_DIR']).is_dir())
                    child_body.update(coverage='complete', marker='synthetic current child', invocation_id=env['RC_INVOCATION_ID'])
                    write_json(report_path, child_body)
                    return subprocess.CompletedProcess(command, outcome)

                inherited = {'RC_CHECK_ID': 'foreign', 'RC_RUN_ID': 'old',
                             'RC_INVOCATION_ID': 'old-nonce', 'RC_ASSERTION_OUTPUT_DIR': '/foreign',
                             'RC_EVIDENCE_BINDING': '{}'}
                with patch.object(verify, 'ROOT', fixture.root), patch.object(verify, 'ACTIVE_RUN', run), \
                     patch.object(verify.subprocess, 'run', side_effect=child), patch.dict(verify.os.environ, inherited):
                    verify.run_source_contract_regressions(fixture.run_dir, fixture.run['run_id'], 'main', results, implemented)
                self.assertEqual(run.exit_codes[CHECK], outcome)
                self.assertEqual(results, {CHECK: 'pass' if outcome == 0 else 'fail'})
                self.assertEqual(implemented, [CHECK])
                self.assertEqual(acceptance.read_json(report_path), child_body)

    def test_actual_main_calls_regressions_once_before_upstream_admission(self):
        tree = ast.parse((ROOT / 'scripts/rc-verify.py').read_text())
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'main')
        calls = [node for node in ast.walk(main) if isinstance(node, ast.Call)]
        regressions = [node for node in calls if isinstance(node.func, ast.Name) and node.func.id == 'run_source_contract_regressions']
        upstream = [node for node in calls if isinstance(node.func, ast.Name) and node.func.id == 'run_node'
                    and node.args and isinstance(node.args[0], ast.Constant)
                    and node.args[0].value == 'scripts/check-upstream-audit-disposition.mjs']
        self.assertEqual(len(regressions), 1)
        self.assertEqual(len(upstream), 1)
        self.assertLess(regressions[0].lineno, upstream[0].lineno)
        self.assertEqual(verify.SCRIPT_CHECKS['scripts/check-source-contract-regressions.py'], CHECK)


if __name__ == '__main__':
    unittest.main()
