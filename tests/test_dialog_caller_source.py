# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source capture does not earn API, runtime, native, or release credit."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerSource(unittest.TestCase):
    def test_authenticated_capture_bindings_and_unchanged_obligations(self):
        command = ['node', 'tests/dialog_caller_source_probe.mjs']
        if os.environ.get('NGX_DIALOG_CALLER_SOURCE_DIAGNOSTIC'):
            command.append(os.environ['NGX_DIALOG_CALLER_SOURCE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['selected'], 18)
        self.assertEqual(report['complete_source_graph'], 49)
        self.assertEqual(report['current_peer_bindings'], 17)
        self.assertEqual(report['owned_original_container_replacement'], 1)
        self.assertEqual(report['source_input_corruptions_rejected'], 53)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures_integrated'], 0)
        self.assertEqual(report['official_open_routes'], 31)
        self.assertTrue(report['all1697_1736_315_obligations_and_six_packed_CVA_roles_retained'])
        self.assertFalse(report['public_API_types_runtime_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
