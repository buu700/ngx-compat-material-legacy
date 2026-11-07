# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact executable recipes and cold/late mutation controls in a fixture."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from test_current_sass_source import candidate_fixture
from stepper_program_transition_source import stepper_program_transitions
from select_program_transition_source import select_program_transitions
class StepperProgramTransitionTests(unittest.TestCase):
    def test_exact_transitions_and_physical_guards(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as scratch:
            root=Path(scratch);line=candidate_fixture(root)
            if line!='main':self.skipTest('main-only program transitions')
            for path in ('scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py','scripts/sass-private-card-gate.mjs'):
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            read=lambda path:(root/path).read_bytes()
            with self.assertRaises(AssertionError):stepper_program_transitions(root,line,read,private=True)
            refs,guard=select_program_transitions(root,line,read,private=True);self.assertEqual(len(refs),5)
            paths=['scripts/current-sass-source.mjs','scripts/current_sass_spinner_snack_admission.py','compatibility/rc/current-sass-select-spinner-executables-v2.json','scripts/select_program_transition_source.py','compatibility/rc/current-sass-select-private-gate-executable-v2.json']
            for path in paths:
                target=root/path;saved=target.read_bytes()
                try:
                    target.write_bytes(saved+b' foreign')
                    with self.assertRaises(AssertionError):select_program_transitions(root,line,read,private=True)
                    with self.assertRaises(AssertionError):guard()
                finally:target.write_bytes(saved)
                armed=[False];last='scripts/sass-private-card-gate.mjs'
                def callback(member):
                    raw=read(member)
                    if armed[0] and member==last:
                        armed[0]=False;target.write_bytes(saved+b' late')
                    return raw
                _,live=select_program_transitions(root,line,callback,private=True)
                try:
                    armed[0]=True
                    with self.assertRaises(AssertionError):live()
                finally:target.write_bytes(saved)
                live()
            child=subprocess.run(['node',str(ROOT/'tests/stepper_program_transition_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=90)
            self.assertEqual(child.returncode,0,child.stderr);result=json.loads(child.stdout)
            self.assertEqual(result['refs'],{k:v for k,v in refs.items() if k!='scripts/sass-private-card-gate.mjs'});self.assertEqual(result['negative_paths'],4)
if __name__=='__main__':unittest.main()
