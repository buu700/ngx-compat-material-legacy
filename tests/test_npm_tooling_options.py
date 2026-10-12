# @license
# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.
"""Private npm profile and complete per-line invocation routing controls."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NpmToolingOptionsTests(unittest.TestCase):
    def test_profile_isolated_without_mutating_project_or_host_inputs(self):
        result = subprocess.run(['node', str(ROOT / 'tests/npm_tooling_options_probe.mjs')],
                                cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['rejected_commands'], 17)
        self.assertFalse(Path(report['cache']).exists(), 'owned process capsule was not cleaned')

    def test_each_reported_mutating_caller_uses_the_shared_owner(self):
        result = subprocess.run(['node', str(ROOT / 'tests/npm_tooling_caller_probe.mjs')],
                                cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version']
        self.assertEqual(report['calls'], 19 if version.startswith('21.') else 21)
        self.assertEqual(report['negative_controls'], 4)
        self.assertTrue(report['original_argv_workdir_timeouts_and_other_behavior_preserved'])

    def test_old_or_changed_profile_cannot_reuse_compiled_fixture_cache(self):
        result = subprocess.run(['node', str(ROOT / 'tests/npm_tooling_cache_probe.mjs')],
                                cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['stale_profile_cache_controls'], 8)
        self.assertFalse(report['npm_installs_or_builds_executed'])


if __name__ == '__main__':
    unittest.main()
