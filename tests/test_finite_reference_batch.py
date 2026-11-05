# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real finite tool-reference batch controls in disposable physical fixtures."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROBE = ROOT / 'tests/finite_reference_batch_probe.mjs'
DRIFT = b'\n// finite reference batch probe drift\n'

spec = importlib.util.spec_from_file_location('current_tool_tests', ROOT / 'tests/test_current_sass_tool_references.py')
test_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(test_module)


def recover_fixture(root, before):
    for path, raw in before.items():
        if path.is_symlink() or not path.is_file():
            raise RuntimeError('Unexpected deleted or linked fixture member: ' + str(path))
        current = path.read_bytes()
        if current == raw:
            continue
        if current == raw + DRIFT:
            path.write_bytes(raw)
            continue
        raise RuntimeError('Unexpected fixture bytes preserved: ' + str(path))


class FiniteReferenceBatchTests(unittest.TestCase):
    def run_group(self, group):
        with tempfile.TemporaryDirectory(prefix='ngx-reference-batch-') as temp:
            fixture = Path(temp)
            line = test_module.current_tool_fixture(fixture)
            before = {p: p.read_bytes() for p in fixture.rglob('*') if p.is_file()}
            try:
                child = subprocess.run(['node', str(PROBE), str(fixture), group], cwd=ROOT,
                                       capture_output=True, text=True, timeout=60)
            finally:
                recover_fixture(fixture, before)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertEqual((report['result'], report['group']), ('pass', group))
            self.assertTrue(report['actual_tool_reference_subject'])
            self.assertFalse(report.get('product_owner_or_admission_claim', False))
            self.assertEqual(report['g11_claim'], 'not-passed')
            return line, report

    def test_stable_semantics_and_fresh_duplicate_reads(self):
        line, report = self.run_group('semantics')
        self.assertIn(line, ('21.x', 'main'))
        self.assertTrue(report['positionwise_existing_operation_conformance'])
        self.assertTrue(report['unknown_side_null'])
        self.assertTrue(report['unknown_comparison_throws'])
        self.assertEqual(report['duplicate_target_fresh_reads'], 2)
        self.assertTrue(report['all_inputs_validated_before_callbacks'])

    def test_cold_and_physical_freshness_controls(self):
        line, report = self.run_group('freshness')
        self.assertIn(line, ('21.x', 'main'))
        self.assertTrue(report['cold_rejected_before_callback'])
        self.assertTrue(report['forged_provided_bytes_rejected'])
        self.assertTrue(report['nonbuffer_provided_value_rejected'])
        self.assertTrue(report['same_callback_physical_mutation_rejected'])
        self.assertTrue(report['late_earlier_target_mutation_rejected_after_later_request'])
        self.assertTrue(report['clean_retry'])

    def test_input_reentry_and_exception_recovery(self):
        line, report = self.run_group('reentry')
        self.assertIn(line, ('21.x', 'main'))
        self.assertTrue(report['input_mutation_rechecked_after_last_callback'])
        self.assertEqual(report['batch_and_public_operation_reentry_before_nested_callbacks'], 6)
        self.assertTrue(report['pure_owns_reference_available_during_batch'])
        self.assertTrue(report['provided_exception_identity_and_clean_retry'])


if __name__ == '__main__':
    unittest.main()
