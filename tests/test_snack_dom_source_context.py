# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source requalification preserves original reviews and real runtime gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SnackDomSourceContext(unittest.TestCase):
    def test_exact_bindings_raw_admission_and_historical_subject_guards(self):
        command = ['node', 'tests/snack_dom_source_context_probe.mjs']
        if os.environ.get('NGX_SNACK_CONTEXT_DIAGNOSTIC'):
            command.append(os.environ['NGX_SNACK_CONTEXT_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=360)
        self.assertEqual(child.returncode, 0, (child.stdout+child.stderr)[-14000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_scopes'], 75)
        self.assertEqual(report['authored_bindings'], 27)
        self.assertIn(report['raw_native_profiles'], [33, 34])
        self.assertEqual(report['source_insufficient'], 0)
        self.assertGreater(report['negative_controls'], 30)
        self.assertEqual(report['additional_caller_closures'], 65)
        self.assertEqual(report['remaining_Core_closures'], 16)
        self.assertEqual(report['Material_core_closures'], 37)
        self.assertEqual(report['new_semantic_closures'], 90)


if __name__ == '__main__':
    unittest.main()
