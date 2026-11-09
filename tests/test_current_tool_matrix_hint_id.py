# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Hint-source transition against physical inputs, with no artifact admission."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.current_tool_matrix_source import CurrentToolMatrixSource

ROOT = Path(__file__).resolve().parents[1]
PACKET = 'compatibility/rc/current-tool-matrix-hint-id-source-successor-v1.json'

class CurrentToolMatrixHintIdTest(unittest.TestCase):
    def test_physical_history_callbacks_and_js_mirror(self):
        baseline=CurrentToolMatrixSource(ROOT)
        with tempfile.TemporaryDirectory(prefix='matrix-hint-id-',dir=os.environ.get('TMPDIR')) as temp:
            root=Path(temp)
            for ref in baseline.bound:
                path=ref['path']; dest=root/path; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(ROOT/path,dest)
            js_owner='scripts/current-tool-matrix-source.mjs'; shutil.copyfile(ROOT/js_owner,root/js_owner)
            gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
            (root/'.git').write_text('gitdir: '+gitdir+'\n')
            packet=json.loads((root/PACKET).read_bytes()); paths=[PACKET,packet['source_review']['path'],*[x['path'] for x in packet['transitions']]]
            source=CurrentToolMatrixSource(root); source.assert_current()
            for path in paths:
                file=root/path; original=file.read_bytes()
                try:
                    file.write_bytes(original+b'\n')
                    with self.assertRaises(AssertionError): CurrentToolMatrixSource(root)
                    with self.assertRaises(AssertionError): source.assert_current()
                finally: file.write_bytes(original)
                source.assert_current()
                def forged(p): return b'changed' if p==path else (root/p).read_bytes()
                with self.assertRaises(AssertionError): CurrentToolMatrixSource(root,read=forged)
            for transition in (x for x in packet['transitions'] if x['prior_exists']):
                old=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+transition['path']],cwd=root)
                def historical(p): return old if p==transition['path'] else (root/p).read_bytes()
                with self.assertRaises(AssertionError): CurrentToolMatrixSource(root,read=historical)
            entered=False
            def nested(p):
                nonlocal entered
                if not entered:
                    entered=True
                    try: CurrentToolMatrixSource(root)
                    except RuntimeError: pass
                return (root/p).read_bytes()
            with self.assertRaises(AssertionError): CurrentToolMatrixSource(root,read=nested)
            self.assertTrue(entered)
            with self.assertRaises(AssertionError): source.comparison_bytes(dict(source.before,sha256='0'*64))
            source.assert_current()
            child=subprocess.run(['node',str(ROOT/'tests/current_tool_matrix_hint_id_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=60)
            self.assertEqual(child.returncode,0,child.stderr)
            result=json.loads(child.stdout);self.assertEqual(result['result'],'pass');self.assertEqual(result['cold_late_physical'],6);self.assertEqual(result['historical_callbacks'],3)
