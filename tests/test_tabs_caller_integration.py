# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact tabs row integration preserves unrelated judgments and native gates."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabsCallerIntegration(unittest.TestCase):
    def test_exact_delta_and_current_owner_guards(self):
        with tempfile.TemporaryDirectory(prefix='tabs-integration-') as directory:
            out = Path(os.environ.get('NGX_TABS_INTEGRATION_DIAGNOSTIC', str(Path(directory) / 'report.json')))
            child = subprocess.run(['node', 'compatibility/rc/tabs-caller-integration-check.mjs', str(out)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=180)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
            report = json.loads(out.read_text())
        self.assertEqual(report['tabs_source_closures'], 21)
        self.assertEqual(report['cumulative_source_closures'], 212)
        self.assertEqual(report['frozen_valid'], 1636)
        self.assertEqual(report['additional_valid'], 260)
        self.assertEqual(report['source_insufficient'], 0)
        self.assertEqual(report['total_open'], 155)
        self.assertEqual([r['changed'] for r in report['restorations']], [17, 4])
        self.assertTrue(report['all1697_SHA_ledger_bytes_preserved'])
        self.assertTrue(report['prior191_closures_preserved'])
        self.assertTrue(report['prior63_rebindings_byte_preserved'])
        self.assertEqual(report['historical_source_subjects'], 14)
        self.assertEqual(report['new_historical_source_reader_layers'], 0)
        self.assertEqual(report['owner_dependency_corruptions_rejected'], 11)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertIn(len(report['raw_native_requirements']), [33, 34])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
