# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Public constructor controls reject wrong identities, scope and stripped evidence."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class PublicConstructorInternalsTests(unittest.TestCase):
    def test_actual_public_constructor_control_and_mutations(self):
        result=subprocess.run(['node','tests/api_public_constructor_internals_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=25)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])

    def test_actual_public_export_source_and_fresh_physical_bytes(self):
        result=subprocess.run(['node','tests/api_public_constructor_source_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=25)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
