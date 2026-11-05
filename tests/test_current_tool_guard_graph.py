# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual current-tool node lifetime and independent operations on copies."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from test_current_sass_tool_references import current_tool_fixture

ROOT = Path(__file__).resolve().parents[1]


class CurrentToolGuardGraphTests(unittest.TestCase):
    def test_actual_current_tool_node_and_nested_operations(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-tool-graph-') as directory:
            root = Path(directory)
            line = current_tool_fixture(root)
            child = subprocess.run(['node', str(ROOT / 'tests/current_tool_guard_graph_probe.mjs'), str(root)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=60)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout)
            self.assertEqual(report['result'], 'pass')
            self.assertEqual(report['line'], line)
            self.assertEqual(report['rejected_faults'], 12)
            self.assertTrue(report['actual_factory_node'])
            self.assertEqual(report['alternate_scheduler_reentry_controls'], 2)
            self.assertEqual(report['independent_nested_side_operations'], 3)
            self.assertEqual(report['side_operation_forged_reader_controls'], 3)
            self.assertTrue(report['restoration_passed'])
            self.assertFalse(report['product_owner_or_compiler_executed'])
            self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
