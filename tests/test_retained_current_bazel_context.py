# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Retained Bazel review uses current sources and preserves historical data."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedCurrentBazelContextTests(unittest.TestCase):
    def test_current_context_and_rejections(self):
        result = subprocess.run(['node', 'tests/retained_current_bazel_context_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['individual_source_rows'], 2)
        self.assertEqual((observed['historical_products'], observed['current_products']), (1142, 1120))
        self.assertEqual(observed['negative_controls'], 17)
        self.assertEqual(observed['mutation_recoveries'], 12)
        self.assertEqual(observed['retired_sources_read_as_current'], 0)
        self.assertFalse(observed['runtime_or_audit_pass'])
