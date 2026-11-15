# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite density source successor controls against copied physical input."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from select_program_transition_source_v2 import select_program_transitions
from test_current_sass_source import candidate_fixture

class DensitySourceAe9Tests(unittest.TestCase):
    def test_physical_mutation_and_paired_js_guards(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as tmp:
            root=Path(tmp);candidate_fixture(root)
            for path in ('scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py'):
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            refs,guard=select_program_transitions(root,'main');self.assertEqual(len(refs),4);guard()
            packet=root/'compatibility/rc/current-main-density-source-ae9-successor-v1.json';saved=packet.read_bytes()
            try:
                packet.write_bytes(saved+b' ')
                with self.assertRaises(AssertionError):guard()
            finally:packet.write_bytes(saved)
            guard()
            result=subprocess.run(['node',str(ROOT/'tests/density_source_ae9_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('forged, reentry, late and recovery pass',result.stdout)
if __name__=='__main__':unittest.main()
