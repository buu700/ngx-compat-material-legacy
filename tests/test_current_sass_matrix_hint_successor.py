# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact matrix owner continuation across both current source guards."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.current_sass_tool_references import CurrentSassToolReferences
ROOT=Path(__file__).resolve().parents[1]

class CurrentSassMatrixHintSuccessorTest(unittest.TestCase):
    def test_owner_successor_lifetimes(self):
        baseline=CurrentSassToolReferences(ROOT)
        with tempfile.TemporaryDirectory(prefix='sass-matrix-hint-',dir=os.environ.get('TMPDIR')) as temp:
            root=Path(temp)
            for ref in baseline.bound:
                path=ref['path'];dst=root/path;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dst)
            js='scripts/current-sass-tool-references.mjs';shutil.copyfile(ROOT/js,root/js)
            gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip();(root/'.git').write_text('gitdir: '+gitdir+'\n')
            subject=CurrentSassToolReferences(root);subject.assert_current()
            refs=['compatibility/rc/current-tool-matrix-hint-id-owner-successor-v1.json','scripts/current-tool-matrix-source.mjs','scripts/current_tool_matrix_source.py']
            for path in refs:
                file=root/path;saved=file.read_bytes()
                try:
                    file.write_bytes(saved+b'\n')
                    with self.assertRaises(AssertionError):CurrentSassToolReferences(root)
                    with self.assertRaises(AssertionError):subject.assert_current()
                finally:file.write_bytes(saved)
                subject.assert_current()
            old_path='scripts/current_tool_matrix_source.py';old=subprocess.check_output(['git','--no-replace-objects','show','7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad:'+old_path],cwd=root)
            def historical(path):return old if path==old_path else (root/path).read_bytes()
            with self.assertRaises(AssertionError):CurrentSassToolReferences(root,read=historical)
            subject.assert_current()
            child=subprocess.run(['node',str(ROOT/'tests/current_sass_matrix_hint_probe.mjs'),str(root)],cwd=ROOT,text=True,capture_output=True,timeout=180)
            self.assertEqual(child.returncode,0,child.stderr)
            self.assertEqual(json.loads(child.stdout),dict(result='pass',cold_late_physical=3,historical_owner_callback_rejected=True))
