# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public Provider type equivalence is separate from provider execution."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProviderAnnotationTypeContractTests(unittest.TestCase):
    def test_complete_public_type_closure_and_finite_annotation_scope(self):
        command = ['node', 'tests/provider_annotation_type_probe.mjs']
        if os.environ.get('PROVIDER_ANNOTATION_TYPE_DIAGNOSTIC'):
            command.append(os.environ['PROVIDER_ANNOTATION_TYPE_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('uses', 3), ('constants', 4), ('assignments', 52),
                                ('equalities', 26), ('mutants_rejected', 18)]:
            self.assertEqual(observed[field], expected, field)
        self.assertFalse(observed['actual_provider_DI_Angular_AOT_native_packed_or_floor_execution'])
