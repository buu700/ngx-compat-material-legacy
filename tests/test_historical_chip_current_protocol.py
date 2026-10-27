# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import unittest


class HistoricalChipCurrentProtocolTests(unittest.TestCase):
    def test_original_protocol_assertions_apply_to_actual_current_method(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(['node', 'tests/historical_chip_current_protocol_probe.mjs'], cwd=root,
                                capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stderr[-4000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['actual_current_owned_method_protocol_cases'], 5)
        self.assertEqual(report['authentic_before_method_rejected'], 2)
        self.assertEqual(report['unexpected_change_event_mutants_rejected'], 2)
        self.assertEqual([(case['mode'], case['result']) for case in report['cases']], [
            ('empty-programmatic', 'pass'), ('empty-removed', 'pass'),
            ('neighbor-middle', 'pass'), ('neighbor-tail', 'pass'), ('unchanged', 'pass'),
            ('authentic-before-method-empty-programmatic', 'rejected'),
            ('authentic-before-method-empty-removed', 'rejected'),
            ('unexpected-change-event-empty-programmatic', 'rejected'),
            ('unexpected-change-event-empty-removed', 'rejected'),
        ])
        self.assertEqual(report['current_subject']['required_full_case_ids'], 2236)
        self.assertFalse(report['original_protocol']['assertions_or_expected_results_changed'])
        self.assertFalse(report['current_subject']['historical_read_used_for_current_subject'])
        self.assertFalse(report['actual_Angular_view_DOM_packed_artifact_browser_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
