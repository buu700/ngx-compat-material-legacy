# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current main A11y/component integration supplements the immutable historical replay."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PRIOR_PINS = {
    'main': '8f526b397123f93800d74ae0dd6a6643afa5759184bd2fc4b084fcb6617cab9f',
    '21.x': 'a9b12d24c967ecb4404e95864368b53489519960618b6f8b12031128cda5d29e',
}


class A11yCallerCurrentEpochIntegration(unittest.TestCase):
    def _authenticated_prior_line(self, compressed):
        digest = hashlib.sha256(compressed).hexdigest()
        line = next((line for line, pin in PRIOR_PINS.items() if pin == digest), None)
        self.assertIsNotNone(line, 'changed a11y prior capture')
        capture = json.loads(gzip.decompress(compressed))
        self.assertEqual(capture['line'], line, 'prior capture line does not match its exact pin')
        return line

    def test_historical_receipt_and_actual_current_epoch_are_separate(self):
        compressed = (ROOT / 'compatibility/rc/a11y-caller-prior.json.gz').read_bytes()
        line = self._authenticated_prior_line(compressed)
        forged = gzip.compress(json.dumps({**json.loads(gzip.decompress(compressed)), 'line': '21.x'}).encode())
        with self.assertRaises(AssertionError):
            self._authenticated_prior_line(forged)
        if line != 'main':
            self.skipTest('current-epoch integration is main-only; the existing 21.x historical route is unchanged')
        command = ['node', 'tests/a11y_caller_current_epoch_integration_probe.mjs']
        report_path = os.environ.get('NGX_A11Y_CALLER_CURRENT_EPOCH_DIAGNOSTIC')
        with tempfile.TemporaryDirectory(prefix='a11y-current-integration-') as temporary:
            command.append(report_path or str(Path(temporary) / 'report.json'))
            child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['a11y_exact_roles'], 16)
        self.assertEqual(report['a11y_historical_graph_files'], 118)
        self.assertEqual(report['a11y_current_graph_files'], 116)
        self.assertEqual(report['component_historical_receipt']['rows'], 73)
        self.assertEqual(report['component_historical_receipt']['sha256'],
                         '24cb5555d22af0f57332d6c1eb236c6afb30aaaf12dfe884d54009b5c5ee097e')
        self.assertEqual(report['component_current_epoch_review']['rows'], 73)
        self.assertEqual(report['component_current_epoch_review']['epoch'],
                         'fdef9be37d516b922efc5301c8f16d0e456f4d48')
        self.assertFalse(report['old_receipt_used_as_current_evidence'])
        self.assertEqual(report['canonical_closures_integrated'], 0)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
