"""Modern unused fixtures cannot erase retained historical source coverage."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UnusedModernFixtureTests(unittest.TestCase):
    def test_original_templates_calls_and_individual_source_counterexamples(self):
        run = subprocess.run(['node', 'tests/upstream_unused_modern_fixture_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['individual_SHAs'], 3)
        self.assertEqual(report['complete_changed_files'], 7)
        self.assertEqual(report['unused_modern_fixtures'], 6)
        self.assertEqual(report['retained_direct_historical_create_calls'], 5)
        self.assertEqual(report['negative_controls'], 23)
        self.assertFalse(report['native_shadow_DOM_projection_or_packed_qualified'])
