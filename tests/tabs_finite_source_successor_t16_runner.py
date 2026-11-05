# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual T16 base-class frame preflight controls in a disposable copy."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('TABS_SUCCESSOR_NODE', 'node')

class TabsFiniteSuccessorT16Tests(unittest.TestCase):
    def test_cached_helper_is_checked_at_actual_frame_entry(self):
        with tempfile.TemporaryDirectory(prefix='tabs-t16-', dir=ROOT.parent.parent) as temp:
            scratch = Path(temp) / ROOT.name
            scratch.mkdir()
            members = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
                                     cwd=ROOT, check=True, capture_output=True).stdout
            subprocess.run(['rsync', '-a', '--from0', '--files-from=-', str(ROOT)+'/', str(scratch)+'/'],
                           input=members, check=True)
            (scratch / '.git').write_bytes((ROOT / '.git').read_bytes())
            subprocess.run(['cp', '-a', '--reflink=auto', str(ROOT / 'node_modules'), str(scratch / 'node_modules')], check=True)
            reports = []
            for mode in ('baseline', 'cached-image', 'cached-function'):
                child = subprocess.run([NODE, str(scratch / 'tests/tabs_finite_source_successor_t16_probe.mjs'), mode],
                                       cwd=scratch, capture_output=True, text=True, timeout=120)
                self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
                result = json.loads(child.stdout)
                self.assertEqual(result['mode'], mode)
                self.assertEqual(result['result'], 'pass')
                self.assertFalse(result['full_owner_executed'])
                reports.append(result)
            self.assertEqual(len({r['helper_sha256'] for r in reports}), 1)
            self.assertTrue(all(r['identities'] == reports[0]['identities'] for r in reports))
            print(json.dumps({'scope':'21.x actual base-class frame preflight only','reports':reports},sort_keys=True))

if __name__ == '__main__':
    unittest.main()
