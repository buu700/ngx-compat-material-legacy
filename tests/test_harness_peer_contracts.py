"""Public peer interface differences and exact key forwarding contexts."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class HarnessPeerContractTests(unittest.TestCase):
    def test_actual_keys_and_explicit_peer_type_differences(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/harness_peer_contract_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 14)
        self.assertEqual(report['population'], {'erased-type': 21, 'key-member': 3})
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['key_contexts'], 12)
        self.assertEqual(report['original_and_owned_protocol_cases_per_subject'], 52)
        self.assertEqual(report['mutations'], 15)
        self.assertFalse(report['native_executed'])
