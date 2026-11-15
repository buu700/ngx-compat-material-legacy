# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""48e source continuation physical controls in a temporary candidate fixture."""
import pathlib
import subprocess
import sys
import tempfile
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from test_current_sass_source import candidate_fixture
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract

class SpinnerSource48eTests(unittest.TestCase):
    def test_physical_callbacks_reentry_and_recovery(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as tmp:
            root=pathlib.Path(tmp);candidate_fixture(root)
            for path in ('scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py','scripts/sass-spinner-snack-bridge-contract.mjs'):
                out=root/path;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes((ROOT/path).read_bytes())
            packet='compatibility/rc/current-main-sass-form-field-executable-source-v1.json';target=root/packet;saved=target.read_bytes()
            mode='';last='';holder=None
            def read(path):
                nonlocal mode
                raw=(root/path).read_bytes()
                if mode=='forged' and path==packet:return raw+b' '
                if mode=='nested' and path=='scripts/current_sass_spinner_snack_admission.py':
                    try:holder.assert_current()
                    except AssertionError:pass
                if mode=='late' and path==last:
                    mode='';target.write_bytes(saved+b' ')
                return raw
            holder=CurrentSpinnerSnackContract(root,read=read);last=holder.bound[-1]['path']
            mode='forged'
            with self.assertRaises(AssertionError):holder.assert_current()
            mode='';holder.assert_current()
            mode='nested'
            with self.assertRaises(AssertionError):holder.assert_current()
            mode='';holder.assert_current()
            try:
                mode='late'
                with self.assertRaises(AssertionError):holder.assert_current()
            finally:mode='';target.write_bytes(saved)
            holder.assert_current()
            try:
                target.write_bytes(saved+b' ')
                with self.assertRaises(AssertionError):CurrentSpinnerSnackContract(root)
            finally:target.write_bytes(saved)
            holder.assert_current()
            result=subprocess.run(['node',str(ROOT/'tests/spinner_source_48e_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('forged, nested, late and recovery controls pass',result.stdout)
if __name__=='__main__':unittest.main()
