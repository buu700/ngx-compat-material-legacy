# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run the real source guards on a disposable physical checkout image.

Only the scratch copy is faulted. Git objects are read-only inputs and peer dependencies are copied; this is not a package-build or dependency-isolation claim.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('TABS_SUCCESSOR_NODE', 'node')
WORKTREES = ROOT.parent.parent

class TabsFiniteSourceSuccessorTests(unittest.TestCase):
    def run_group(self, group):
        with tempfile.TemporaryDirectory(prefix='tabs-guard-', dir=WORKTREES) as temp:
            scratch = Path(temp) / ROOT.name
            scratch.mkdir()
            members = subprocess.run(['git', 'ls-files', '--cached', '--others',
                                      '--exclude-standard', '-z'], cwd=ROOT,
                                     check=True, capture_output=True).stdout
            subprocess.run(['rsync', '-a', '--from0', '--files-from=-',
                            str(ROOT) + '/', str(scratch) + '/'], input=members, check=True)
            (scratch / '.git').write_bytes((ROOT / '.git').read_bytes())
            subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT / 'node_modules'),
                            str(scratch / 'node_modules')], check=True)
            child = subprocess.run([NODE, str(scratch / 'tests/tabs_finite_source_successor_probe.mjs'), group],
                                   cwd=scratch, capture_output=True, text=True, timeout=300)
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual(result['result'], 'pass')
            self.assertTrue(result['actual_leaf'])
            self.assertEqual(result['actual_composed_owner'], group != 'leaf')
            self.assertFalse(result['full_owner_or_native_qualification'])
            print(json.dumps(result, sort_keys=True))
            return result

    def test_leaf(self):
        self.run_group('leaf')

    def test_repair(self):
        self.run_group('repair')

    def test_roster(self):
        self.run_group('roster')

if __name__ == '__main__':
    unittest.main()
