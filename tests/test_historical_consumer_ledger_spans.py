# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import unittest


class HistoricalConsumerLedgerSpanTests(unittest.TestCase):
    def test_exact_replacement_preserves_other_entries_and_escaped_strings(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run(['node', 'tests/historical_consumer_ledger_spans_probe.mjs'], cwd=root,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr[-4000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['preview_replacements'], 65)
        self.assertEqual(report['unselected_entries_preserved'], 1632)
        self.assertEqual(report['invalid_replacements_rejected'], 3)
        self.assertFalse(report['canonical_ledger_written'])


if __name__ == '__main__':
    unittest.main()
