# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual table graph and private production row with reaped-child recovery."""
import json
from pathlib import Path
import subprocess
import unittest

from test_base_class_guard_plan import restore_known_mutations

ROOT = Path(__file__).resolve().parents[1]
EXTRA = b'// guard graph population control\n'
EXTRA_PATHS = ('guard-plan-population-control.tmp', 'guard-plan-population-control.spec.ts')


class TableGuardGraphTests(unittest.TestCase):
    def run_probe(self, name, *arguments):
        paths = ('scripts/base-class-removal-canonical-stage.mjs',
                 'projects/ngx-material-legacy/legacy-table/row.ts',
                 'projects/ngx-material-legacy/legacy-button/button.ts',
                 'scripts/legacy-removal-owner-source.mjs')
        before = {ROOT / path: (ROOT / path).read_bytes() for path in paths}
        extras = [ROOT / 'projects/ngx-material-legacy/legacy-table' / n for n in EXTRA_PATHS]
        self.assertTrue(all(not p.exists() and not p.is_symlink() for p in extras))
        try:
            child = subprocess.run(['node', str(ROOT / 'tests' / name), *arguments], cwd=ROOT,
                                   capture_output=True, text=True, timeout=60)
        finally:
            errors = []
            try:
                restore_known_mutations(before)
            except RuntimeError as error:
                errors.append(error)
            for path in extras:
                if path.is_symlink():
                    errors.append(RuntimeError('Foreign population-control link preserved: ' + str(path)))
                    continue
                if path.exists():
                    if not path.is_file() or path.read_bytes() != EXTRA:
                        errors.append(RuntimeError('Foreign population-control bytes preserved: ' + str(path)))
                        continue
                    path.unlink()
            if errors:
                raise ExceptionGroup('Test input recovery requires attention', errors)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        return json.loads(child.stdout)

    def static_constructor_probe(self, mode, faults):
        report = self.run_probe('table_static_reference_batch_probe.mjs', mode)
        self.assertEqual((report['result'], report['mode']), ('pass', mode))
        self.assertTrue(report['actual_static_table_constructor'])
        self.assertTrue(report['static_metadata_batch_observed'])
        self.assertEqual(report['same_callback_mutations_rejected'], faults)
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['complete_owner_success'])
        self.assertFalse(report['compiler_or_build_executed'])

    def test_static_metadata_uses_actual_batch_and_fresh_members(self):
        self.static_constructor_probe('positive', 0)

    def test_static_metadata_batch_rejects_same_callback_old_and_new_bytes(self):
        self.static_constructor_probe('batch', 2)

    def test_static_member_rejects_same_callback_old_and_new_bytes(self):
        self.static_constructor_probe('member', 2)

    def test_actual_table_source_stage_and_legacy_tool_nodes(self):
        report = self.run_probe('table_guard_graph_probe.mjs')
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['actual_table_source_stage_and_legacy_tool_nodes'], 3)
        self.assertEqual(report['rejected_faults'], 26)
        self.assertEqual(report['alternate_scheduler_reentry_controls'], 6)
        self.assertEqual(report['table_population_cold_late_controls'], 2)
        self.assertEqual(report['same_consumed_source_mutation_controls'], 2)
        self.assertEqual(report['source_inspector_controls'], 3)
        self.assertTrue(report['ignored_spec_population_preserved'])
        self.assertTrue(report['projected_ledger_preserved'])
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['full_composed_owner_executed'])
        self.assertFalse(report['compiler_or_build_executed'])

    def test_actual_binding_final_rejects_base_source_mutation(self):
        report = self.run_probe('source_binding_guard_graph_probe.mjs')
        self.assertEqual(report['result'], 'pass')
        self.assertTrue(report['actual_base_ledger_binding_reached'])
        self.assertTrue(report['child_final_rejected_late_mutation'])
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['complete_owner_success'])

    def test_binding_nested_narrow_projection_and_exception_recovery(self):
        report = self.run_probe('source_binding_guard_graph_probe.mjs', 'exception')
        self.assertEqual((report['result'], report['mode']), ('pass', 'exception'))
        self.assertTrue(report['narrow_frame_executed'])
        self.assertTrue(report['exception_recovered'])
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['complete_owner_success'])

    def test_actual_private_source_lane_row_final_scope(self):
        report = self.run_probe('source_lane_production_route_probe.mjs')
        self.assertEqual(report['result'], 'pass')
        self.assertTrue(report['actual_private_production_row_reached'])
        self.assertTrue(report['earlier_base_source_fault_rejected_by_outer_final'])
        self.assertTrue(report['source_only_control_excludes_narrow_frame'])
        self.assertTrue(report['final_directly_invoked_by_scheduler'])
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['complete_owner_success'])
        self.assertFalse(report['compiler_or_build_executed'])


if __name__ == '__main__':
    unittest.main()
