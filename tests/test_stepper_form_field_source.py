# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Source-only form-field continuation controls in copied physical fixtures."""
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stepper_current_peer_source_v6 import StepperCurrentPeerSourceV4


def fixture(destination):
    """Copy the union of the actual paired bound populations, never hard-link files."""
    assert destination.is_dir() and not destination.is_symlink() and destination.resolve()!=ROOT.resolve()
    js="import {createStepperCurrentPeerSourceV4} from './scripts/stepper-current-peer-source-v6.mjs';console.log(JSON.stringify(createStepperCurrentPeerSourceV4({root:process.cwd()}).bound));"
    js_rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True,timeout=30))
    rows=StepperCurrentPeerSourceV4(ROOT).bound+js_rows
    expected={}
    for row in rows:
        path=row['path']
        assert not pathlib.PurePosixPath(path).is_absolute() and all(x not in ('','.','..') for x in path.split('/'))
        if path in expected: assert expected[path]==row
        expected[path]=row
    for path,row in expected.items():
        source=ROOT/path;raw=source.read_bytes()
        assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
        target=destination/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        assert target.read_bytes()==raw and not target.is_symlink()
    git_dir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True,timeout=30).strip()
    pointer=destination/'.git';pointer.write_text('gitdir: '+git_dir+'\n');pointer.chmod(0o444)


class StepperFormFieldSourceTests(unittest.TestCase):
    def test_callback_physical_mutation_reentry_and_recovery(self):
        with tempfile.TemporaryDirectory(prefix='ngx-stepper-form-field-source-') as temporary:
            root=pathlib.Path(temporary);fixture(root)
            path='projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss'
            target=root/path
            active=False
            def read(p):
                b=(root/p).read_bytes()
                return b+b' foreign' if active and p==path else b
            source=StepperCurrentPeerSourceV4(root,read=read);source.assert_current()
            active=True
            with self.assertRaises(AssertionError):source.assert_current()
            active=False;source.assert_current()
            original=target.read_bytes()
            try:
                target.write_bytes(original+b' foreign')
                with self.assertRaises(AssertionError):source.assert_current()
            finally:target.write_bytes(original)
            source.assert_current()
            nested=False;holder=None
            def reentrant(p):
                b=(root/p).read_bytes()
                if nested and p==path:
                    try:holder.assert_current()
                    except AssertionError:pass
                return b
            holder=StepperCurrentPeerSourceV4(root,read=reentrant);nested=True
            with self.assertRaises(AssertionError):holder.assert_current()
            nested=False;holder.assert_current()
            result=subprocess.run(['node',str(ROOT/'tests/stepper_form_field_source_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('stepper form-field JS controls pass',result.stdout)
if __name__=='__main__':unittest.main()
