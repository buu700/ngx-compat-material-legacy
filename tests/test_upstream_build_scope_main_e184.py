"""Finite main source-scope receipt; this is not an audit or security pass."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UpstreamBuildScopeMainE184Tests(unittest.TestCase):
    def test_report_and_input_mutations_are_rejected(self):
        result = subprocess.run(
            ['node', 'tests/upstream_build_scope_main_e184_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        result_data = json.loads(result.stdout)
        self.assertEqual(result_data['cases'], 15)
        self.assertEqual(result_data['negative_controls'], 17)
        self.assertEqual(result_data['line'], 'main')
