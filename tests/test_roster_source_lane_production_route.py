# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Negative actual epoch route with child-reap and exact-known recovery."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'compatibility/rc/current-roster-source-epoch-inputs.json'
DRIFT = b'\n// roster row final drift\n'


class RosterSourceLaneProductionRouteTests(unittest.TestCase):
    def test_actual_registered_roster_epoch_row_final(self):
        before = TARGET.read_bytes()
        try:
            child = subprocess.run(['node', str(ROOT / 'tests/roster_source_lane_production_route_probe.mjs')],
                                   cwd=ROOT, capture_output=True, text=True, timeout=60)
        finally:
            if TARGET.is_symlink() or not TARGET.is_file():
                raise RuntimeError('Foreign roster input type preserved')
            actual = TARGET.read_bytes()
            if actual == before + DRIFT:
                TARGET.write_bytes(before)
            elif actual != before:
                raise RuntimeError('Foreign roster bytes preserved')
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        for key in ('actual_registered_roster_epoch_route', 'actual_private_source_row_reached',
                    'roster_only_fault_rejected_by_scheduler_final', 'outside_selected_base_scope',
                    'public_roster_has_no_ledger_metadata_grant', 'restoration_passed'):
            self.assertTrue(report[key])
        self.assertEqual(report['result'], 'pass')
        self.assertFalse(report['complete_owner_success'])
        self.assertFalse(report['compiler_or_build_executed'])
