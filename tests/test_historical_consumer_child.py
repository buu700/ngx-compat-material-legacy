# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import unittest


class HistoricalConsumerChildTests(unittest.TestCase):
    def test_timeout_stops_owned_child_and_descendants(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run(['node', 'tests/historical_consumer_child_probe.mjs'], cwd=root,
                               capture_output=True, text=True, timeout=15)
        self.assertEqual(child.returncode, 0, child.stderr[-4000:])
        report = json.loads(child.stdout)
        self.assertTrue(report['successful_child_preserved'])
        self.assertTrue(report['timeout_detected'])
        self.assertTrue(report['timed_child_and_grandchild_stopped'])
        self.assertFalse(report['wrapper_timeouts_extended'])


if __name__ == '__main__':
    unittest.main()
