# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Full Sass guard keeps all owners active for Stepper V4 qualification."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from current_sass_source import CurrentSassSource
from test_current_sass_source import candidate_fixture
class CurrentSassStepperV4Tests(unittest.TestCase):
    def test_composed_guard_and_javascript_concordance(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as scratch:
            root=Path(scratch);line=candidate_fixture(root)
            if line!='main':self.skipTest('main-only source successor')
            s=CurrentSassSource(root);packet=json.loads((root/'compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json').read_bytes())
            self.assertEqual(s.qualify(packet['transition']['before'])['sha256'],packet['transition']['after']['sha256'])
            focus=json.loads((root/'compatibility/rc/current-main-strong-focus-source-v1.json').read_bytes())
            self.assertEqual(focus['source_set_before'],packet['source_set']['v4_current_sha256'])
            self.assertEqual(s.source_set_successors[0]['current_sha256'],focus['source_set_after'])
            other=next(row for row in s.transitions if row['path']!=packet['transition']['after']['path']);target=root/other['path'];saved=target.read_bytes()
            try:
                target.write_bytes(saved+b' foreign')
                with self.assertRaises(AssertionError):s.qualify(packet['transition']['before'])
            finally:target.write_bytes(saved)
            s.assert_current()
            child=subprocess.run(['node',str(ROOT/'tests/current_sass_stepper_v4_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=120)
            self.assertEqual(child.returncode,0,child.stderr);js=json.loads(child.stdout)
            self.assertEqual(js['transitions'],s.transitions);self.assertEqual(js['sets'],s.source_sets);self.assertEqual(js['successors'],s.source_set_successors)
if __name__=='__main__':unittest.main()
