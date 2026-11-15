# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Discoverable source-only controls; these do not grant execution admission."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
MAIN = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.')


@unittest.skipUnless(MAIN, 'main-only source successors')
class CurrentSourceProbeDiscoveryTest(unittest.TestCase):
    def run_probe(self, name, marker, *arguments):
        child = subprocess.run(['node', 'tests/' + name + '.mjs', *map(str, arguments)],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        self.assertIn(marker, child.stdout)

    def test_select_dialog_v8(self):
        self.run_probe('select_dialog_source_v8_test', 'select/dialog v8: positive and negative controls passed')

    def test_authored_tab_continuation(self):
        self.run_probe('current_authored_tab_continuation_probe', 'PASS authored tab finite chain')

    def test_matrix_continuation(self):
        self.run_probe('current_tool_matrix_v8_fixture_probe', 'PASS matrix source mutation')

    def test_historical_live_comparison(self):
        self.run_probe('historical_live_comparison_regression_probe', 'PASS historical allowlist comparison')

    def test_historical_select_caller(self):
        self.run_probe('historical_repair_select_source_v8_probe', 'PASS: main v8 transitions')

    def test_inventory_caller_reference(self):
        self.run_probe('inventory_caller_current_reference_probe', 'PASS current inventory reference', ROOT)


if __name__ == '__main__':
    unittest.main()
