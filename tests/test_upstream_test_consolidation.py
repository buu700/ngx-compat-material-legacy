"""Complete original consolidation scope and fail-closed source admission."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UpstreamTestConsolidationTests(unittest.TestCase):
    def test_original_sources_and_real_cli_reject_modified_evidence(self):
        result = subprocess.run(
            ['node', 'scripts/run-historical-source-probe.mjs', 'test-consolidation-source'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['subjects'], 32)
        self.assertEqual(observed['patch_paths'], 111)
        self.assertEqual(observed['exact_relocations'], 27)
        self.assertEqual(observed['pending_residuals'], 0)
        self.assertEqual(observed['individual_source_reviews'], 5)
        self.assertEqual(observed['retained_historical_sources'], 12)
        self.assertEqual(observed['positive_entry_bindings'], 32)
        self.assertEqual(observed['negative_controls'], 25)
        self.assertIn('cli-terminal-label', observed['controls'])
        self.assertIn('cli-non-json-pointer', observed['controls'])
        self.assertIn('cli-individual-review-bypass', observed['controls'])
        self.assertIn('lost-legacy-appearance', observed['controls'])
        self.assertIn('lost-distinct-option-token', observed['controls'])
        self.assertFalse(observed['actual_original_tests_or_product_runtime_executed'])
        self.assertEqual(observed['g11_claim'], 'not-passed')
