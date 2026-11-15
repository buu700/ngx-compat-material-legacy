# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
"""Current radio dependency review and original independently replayed controls."""
import json
import subprocess
import unittest

class RadioDispatcherF9Review(unittest.TestCase):
    def probe(self, *args):
        r = subprocess.run(['node', *args], capture_output=True, text=True, timeout=180, check=True)
        return json.loads(r.stdout.strip().splitlines()[-1])
    def test_historical_dispatcher_and_owner_controls(self):
        d = self.probe('tests/radio_dispatcher_f9_historical_probe.mjs')
        o = self.probe('tests/radio_dispatcher_f9_historical_probe.mjs', '--owner')
        self.assertEqual((d['roles'], d['methods'], d['contexts'], d['negative_controls']), (2, 7, 5, 9))
        self.assertEqual((o['cases'], o['negative_controls']), (7, 6))
    def test_exact_source_admission(self):
        r = self.probe('tests/radio_dispatcher_f9_admission_probe.mjs')
        self.assertEqual((r['selected'], r['dispatcher_contexts'], r['cleanup_contexts']), (2, 5, 5))
        self.assertEqual((r['cleanup_faults'], r['source_faults']), (3, 10))
        self.assertTrue(r['structural_output_only'])
