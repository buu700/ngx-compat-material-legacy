# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The committed current focus source is a finite physical successor."""
import json, subprocess, tempfile, unittest
from pathlib import Path
from test_current_sass_source import candidate_fixture, ROOT
from current_sass_source import CurrentSassSource

class CurrentSassFocusSuccessorTests(unittest.TestCase):
    def test_exact_and_cold_late_concordance(self):
        with tempfile.TemporaryDirectory(prefix='focus-source-') as temp:
            root=Path(temp)
            if candidate_fixture(root)!='main':self.skipTest('main only')
            packet=json.loads((root/'compatibility/rc/current-main-strong-focus-source-v1.json').read_bytes())
            source=CurrentSassSource(root);self.assertEqual(source.qualify(packet['before']),packet['after'])
            with self.assertRaises(AssertionError):source.qualify(dict(packet['before'],sha256='0'*64))
            for name in (packet['before']['path'],'compatibility/rc/current-main-strong-focus-source-v1.json',packet['review']['path'],'scripts/stepper_current_peer_source_v5.py'):
                file=root/name;old=file.read_bytes()
                try:
                    file.write_bytes(old+b' foreign')
                    with self.assertRaises(AssertionError):CurrentSassSource(root)
                    with self.assertRaises(AssertionError):source.assert_current()
                finally:file.write_bytes(old)
                armed=[False];last=source.bound[-1]['path']
                def reader(path):
                    raw=(root/path).read_bytes()
                    if armed[0] and path==last:armed[0]=False;file.write_bytes(old+b' late')
                    return raw
                live=CurrentSassSource(root,read=reader)
                try:
                    armed[0]=True
                    with self.assertRaises(AssertionError):live.assert_current()
                finally:file.write_bytes(old)
                live.assert_current()
            result=subprocess.run(['node',str(ROOT/'tests/current_sass_focus_successor_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=120)
            self.assertEqual(result.returncode,0,result.stderr);js=json.loads(result.stdout)
            self.assertEqual(js['transitions'],source.transitions);self.assertEqual(js['source_sets'],source.source_sets)
            runtime={'scripts/current_sass_source.py','scripts/stepper-sixth-source.mjs','scripts/stepper_sixth_source.py','scripts/canonical-source-guard-plan.mjs','scripts/dialog-focus-finite-source-successor.mjs','scripts/dialog_focus_finite_source_successor_v5.py'}
            self.assertEqual({r['path']:r for r in js['bound'] if r['path'] not in runtime},{r['path']:r for r in source.bound if r['path'] not in runtime})
