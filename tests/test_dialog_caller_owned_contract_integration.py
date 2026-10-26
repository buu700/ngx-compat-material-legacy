# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The canonical owner preserves source and native obligations after dialog repair."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogOwnedContractIntegration(unittest.TestCase):
    def test_current_source_and_finite_historical_epochs(self):
        with tempfile.TemporaryDirectory(prefix='dialog-owned-contract-integration-') as tmp:
            report_path = Path(tmp) / 'report.json'
            result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'dialog-owned-integration', '--original-report', str(report_path)],
                                    cwd=ROOT, capture_output=True, text=True, timeout=180 + 180)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            report = json.loads(report_path.read_text())
            self.assertEqual(report['source_context_rebindings'], 45)
            self.assertEqual(report['selected_changes'], 45)
            self.assertEqual(report['source_insufficient'], 0)
            self.assertEqual(report['open'], 31)
            self.assertEqual(report['additional_obligations'], 315)
            self.assertTrue(report['all1697_semantic_dispositions_and_native_requirements_preserved'])
            self.assertTrue(report['historical_reader_unwrapped_for_raw_native_admission'])
            self.assertEqual(report['new_source_closures'], 0)


if __name__ == '__main__':
    unittest.main()
