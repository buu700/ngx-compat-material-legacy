# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Retired source roles remain obligations through source and callback changes."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentAuthoredEpochTests(unittest.TestCase):
    def test_live_source_retirements_and_callback_frames(self):
        for probe in (
            'current_form_field_retired_use_probe.mjs',
            'current_authored_full_admission_probe.mjs',
            'current_authored_physical_frame_probe.mjs',
        ):
            with self.subTest(probe=probe):
                child = subprocess.run(
                    ['node', str(ROOT / 'tests' / probe)], cwd=ROOT,
                    capture_output=True, text=True, timeout=120,
                )
                self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
