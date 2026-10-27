# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import unittest


class HistoricalConsumerModuleGraphTests(unittest.TestCase):
    def test_real_modules_and_source_fixture_strings_are_distinct(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(['node', 'tests/historical_consumer_module_graph_probe.mjs'], cwd=root,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr[-4000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['actual_modules'], 4)
        self.assertEqual(report['quoted_fixture_imports_excluded'], 3)
        self.assertEqual(report['exact_data_inputs_preserved'], 2)
        self.assertEqual(report['negative_controls'], 6)
        self.assertFalse(report['actual_historical_programs_executed'])
        self.assertFalse(report['current_source_or_native_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
