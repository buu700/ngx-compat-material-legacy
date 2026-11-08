# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

class HistoricalRepairToolBridgeTest(unittest.TestCase):
    def test_exact_source_and_fresh_supports(self):
        baseline = CurrentSassToolReferences(ROOT)
        with tempfile.TemporaryDirectory(prefix='tool-historical-bridge-') as temp:
            root = Path(temp)
            for ref in baseline.bound:
                target = root / ref['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / ref['path'], target)
            gitdir = subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
            (root / '.git').write_text('gitdir: ' + gitdir + '\n')
            source = CurrentSassToolReferences(root)
            packet = json.loads((root / 'compatibility/rc/current-tool-historical-repair-source-successor-v1.json').read_bytes())
            self.assertEqual(source.qualify(packet['before']), packet['after'])
            self.assertEqual(source.qualify(packet['after']), packet['after'])
            for ref in (packet['before'],packet['after']):
                self.assertEqual(hashlib.sha256(source.comparison_bytes(ref)).hexdigest(), ref['sha256'])
            self.assertIsNone(source.qualify({**packet['before'],'sha256':'0'*64}))
            with self.assertRaises(AssertionError): source.qualify({**packet['before'],'bytes':packet['before']['bytes']+1})
            paths = [packet['after']['path'],'compatibility/rc/current-tool-historical-repair-source-successor-v1.json',*(ref['path'] for ref in packet['supports'])]
            for path in paths:
                target=root/path; raw=target.read_bytes(); changed=bytes([raw[0]^1])+raw[1:]
                try:
                    target.write_bytes(changed)
                    with self.assertRaises(AssertionError): source.assert_current()
                    with self.assertRaises(AssertionError): CurrentSassToolReferences(root)
                finally:
                    target.write_bytes(raw)
                source.assert_current()

if __name__ == '__main__': unittest.main()
