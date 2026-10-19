# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source/type/token contracts; this does not claim component qualification."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RippleGlobalOptionsReview(unittest.TestCase):
    def test_original_constructor_options_and_genuine_public_peer_boundary(self):
        command = ['node', '--max-old-space-size=640', 'tests/ripple_global_options_probe.mjs']
        if os.environ.get('NGX_RIPPLE_GLOBAL_OPTIONS_DIAGNOSTIC'):
            command.append(os.environ['NGX_RIPPLE_GLOBAL_OPTIONS_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['source_imports'], 6)
        self.assertEqual(report['public_subjects'], 3)
        self.assertEqual(report['construction_cases'], 270)
        self.assertEqual(report['injector_cases'], 45)
        self.assertEqual(report['runtime_mutations_rejected'], 18)
        self.assertEqual(report['source_and_declaration_controls'], 23)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
