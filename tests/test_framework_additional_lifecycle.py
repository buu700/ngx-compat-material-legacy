# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public additional lifecycle imports are not runtime/DI evidence."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AdditionalLifecycleTests(unittest.TestCase):
    def test_complete_existing_model_and_additional_boundary_controls(self):
        command = ['node', 'tests/framework_additional_lifecycle_probe.mjs']
        if os.environ.get('FRAMEWORK_ADDITIONAL_LIFECYCLE_DIAGNOSTIC'):
            command.append(os.environ['FRAMEWORK_ADDITIONAL_LIFECYCLE_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('uses', 3), ('files', 3), ('original_uses', 96), ('original_files', 38),
                ('mutants_rejected', 13), ('assignments', 40), ('equalities', 20)]:
            self.assertEqual(observed[field], expected, field)
        self.assertFalse(observed['actual_hook_DI_Angular_native_packed_or_floor_execution'])
