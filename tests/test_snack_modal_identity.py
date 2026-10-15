# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Both genuine generations must keep modal ownership tokens independent."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SnackModalIdentityTests(unittest.TestCase):
    def test_actual_methods_and_suffix_only_reversions(self):
        result = subprocess.run(['node', 'tests/snack_modal_identity_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('contexts', 20), ('original_reference_positive', 4),
                ('current_positive_contexts', 8), ('suffix_only_reversion_contexts', 8),
                ('expected_reproduced_failures', 4), ('source_reversal_negatives', 3),
                ('owned_modules', 95), ('owned_resources', 22)]:
            self.assertEqual(observed[field], expected, field)
        self.assertFalse(observed['actual_modal_or_packed_nodes_qualified'])
