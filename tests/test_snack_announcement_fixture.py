# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public Angular/portal wiring must expose missing and late announcements."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SnackAnnouncementFixtureTests(unittest.TestCase):
    def test_real_views_portals_and_direct_destruction(self):
        command = ['node', '--max-old-space-size=512', 'tests/snack_announcement_fixture_probe.mjs']
        if os.environ.get('CLOSEOUT_SNACK_ANNOUNCEMENT_FIXTURE_REPORT'):
            command.append(os.environ['CLOSEOUT_SNACK_ANNOUNCEMENT_FIXTURE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 8)
        self.assertEqual(report['cases'], 24)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['actual_legacy_container_executed'])
