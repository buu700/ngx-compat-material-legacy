# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Genuine historical repair subject guard, with exact-known parent recovery."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'compatibility/rc/historical-contract-repair-source-inputs.json'
DRIFT = b'\n// historical repair guard test drift\n'

class HistoricalRepairGuardNodeTests(unittest.TestCase):
    def test_real_guard_faults(self):
        if TARGET.is_symlink() or not TARGET.is_file():
            raise RuntimeError('unexpected historical repair target type')
        before = TARGET.read_bytes()
        try:
            result = subprocess.run(['node', str(ROOT / 'tests/historical_repair_guard_node_probe.mjs')], cwd=ROOT, capture_output=True, text=True, timeout=60)
        finally:
            if TARGET.is_symlink() or not TARGET.is_file():
                raise RuntimeError('foreign historical repair target preserved')
            raw = TARGET.read_bytes()
            if raw == before + DRIFT:
                TARGET.write_bytes(before)
            elif raw != before:
                raise RuntimeError('foreign historical repair target bytes preserved')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['same_callback_old_new'], 2)
        self.assertEqual(report['direct_alternate_side_reentry'], 4)
        for key in ('cold', 'late_final', 'exception_recovery'):
            self.assertTrue(report[key])
        self.assertEqual(report['g11_claim'], 'not-passed')
