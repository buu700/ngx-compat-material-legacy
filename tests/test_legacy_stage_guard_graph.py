# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real legacy source phase controls with reaped-child exact recovery."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'compatibility/rc/21x-legacy-removal-admission-source-successor.json'
EXTRA = ROOT / 'projects/ngx-material-legacy/legacy-table/legacy-guard-population-control.spec.ts'
DRIFT = b'\n// legacy graph callback drift\n'
POPULATION = b'// legacy graph population control\n'


class LegacyStageGuardGraphTests(unittest.TestCase):
    def run_group(self, group, count):
        before = TARGET.read_bytes()
        self.assertFalse(EXTRA.exists() or EXTRA.is_symlink())
        try:
            child = subprocess.run(['node', str(ROOT / 'tests/legacy_stage_guard_graph_probe.mjs'), group],
                                   cwd=ROOT, capture_output=True, text=True, timeout=60)
        finally:
            errors = []
            if TARGET.is_symlink() or not TARGET.is_file():
                errors.append(RuntimeError('Foreign legacy input type preserved'))
            else:
                current = TARGET.read_bytes()
                if current == before + DRIFT:
                    TARGET.write_bytes(before)
                elif current != before:
                    errors.append(RuntimeError('Foreign legacy input bytes preserved'))
            if EXTRA.is_symlink():
                errors.append(RuntimeError('Foreign legacy population link preserved'))
            elif EXTRA.exists():
                if not EXTRA.is_file() or EXTRA.read_bytes() != POPULATION:
                    errors.append(RuntimeError('Foreign legacy population bytes preserved'))
                else:
                    EXTRA.unlink()
            if errors:
                raise ExceptionGroup('Legacy source recovery requires attention', errors)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['group'], group)
        self.assertEqual(report['rejected_faults'], count)
        self.assertTrue(report['actual_source_node'])
        self.assertTrue(report['restoration_passed'])
        self.assertFalse(report['complete_owner_success'])
        self.assertFalse(report['compiler_or_build_executed'])

    def test_actual_source_cold_physical_population_and_inspector(self):
        self.run_group('cold', 5)

    def test_actual_source_fresh_consumption_reentry_and_phase_recovery(self):
        self.run_group('consume', 9)

    def test_actual_source_finals_follow_later_callbacks(self):
        self.run_group('late', 3)
