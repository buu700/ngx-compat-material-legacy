"""Historical harness filter aliases reject unsupported modern predicates."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HarnessFilterReexportTests(unittest.TestCase):
    def test_authentic_declarations_and_owned_filter(self):
        result = subprocess.run(
            ['node', '--max-old-space-size=512', 'tests/harness_filter_reexports_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['frozen_cases']), 23)
        self.assertEqual(len(report['current_cases']), 19)
        self.assertEqual(report['stable_declarations'], 19)
        self.assertEqual(report['public_reexports'], 18)
        self.assertEqual(report['mutations'], 4)
        self.assertTrue(report['owned_menu_matches_tag'])
        self.assertTrue(report['menu_predicate_body_matches_tag'])
        self.assertEqual(report['type_compilation']['negative_checks'], 4)
        self.assertEqual(len(report['pending_input_filters']), 2)
        self.assertEqual(report['g11_claim'], 'not-passed')
