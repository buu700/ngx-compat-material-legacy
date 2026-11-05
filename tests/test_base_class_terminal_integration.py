# @license
# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by the MIT license in LICENSE.
# Copyright (c) 2026 Ryan Lester.
"""Current terminal-stage source boundaries; no composed owner or compilation."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BaseClassTerminalIntegrationTests(unittest.TestCase):
    def test_private_registry_chain_keeps_physical_source_guards(self):
        result = subprocess.run(['node', str(ROOT / 'tests/base_class_terminal_integration_probe.mjs')],
                                cwd=ROOT, text=True, capture_output=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['private_comparison'], '70→69→68')
        self.assertTrue(report['unbranded_and_spoofed_capabilities_rejected'])
        self.assertTrue(report['late_callback_mutation_and_restoration'])
        self.assertEqual(report['final_callback_physical_mutation_rejections'], 3)
        self.assertFalse(report['full_composed_owner_executed'])
        self.assertFalse(report['compiler_or_build_executed'])


if __name__ == '__main__':
    unittest.main()
