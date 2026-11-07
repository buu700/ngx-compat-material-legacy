# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact main Stepper current source; old strict reader remains fail-closed."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from test_stepper_sixth_source import fixture

class StepperCurrentPeerV4Tests(unittest.TestCase):
    def test_current_exact_old_reader_rejects_and_js_python_agree(self):
        with tempfile.TemporaryDirectory(prefix='stepper-peer-v4-') as scratch:
            root=Path(scratch)
            line,prior=fixture(root)
            if line!='main': self.skipTest('main-only current peer successor')
            # V4 is exercised on its own historical physical frame in this disposable fixture.
            style='projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss'
            historical=subprocess.check_output(['git','show','d74c0d083077f227ea237aff33f42f6c75e76214:'+style],cwd=ROOT)
            self.assertNotEqual((ROOT/style).read_bytes(),historical)
            (root/style).write_bytes(historical)
            for path in ('scripts/stepper-current-peer-source-v4.mjs','scripts/stepper_current_peer_source_v4.py','compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json'):
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            def module(name,path):
                spec=importlib.util.spec_from_file_location(name,root/path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
            old=module('old_stepper','scripts/stepper_sixth_source.py')
            with self.assertRaises(AssertionError):old.StepperSixthSource(root)
            new=module('new_stepper','scripts/stepper_current_peer_source_v4.py');s=new.StepperCurrentPeerSourceV4(root)
            packet=json.loads((root/new.NEXT_PACKET).read_bytes());self.assertEqual(len(s.bound),296)
            for ref in (prior['before_git'],packet['transition']['before'],packet['transition']['after']):
                self.assertEqual(s.qualify(ref)['sha256'],packet['transition']['after']['sha256'])
            with self.assertRaises(AssertionError):s.qualify(dict(packet['transition']['before'],sha256='0'*64))
            with self.assertRaises(AssertionError):s.qualify(dict(packet['transition']['before'],bytes=1))
            with self.assertRaises(AssertionError):new.StepperCurrentPeerSourceV4(root,read=lambda _:b'foreign')
            for path in (new.BRIDGE,new.NEXT_PACKET,new.PRIOR_HELPER['path'],'projects/ngx-material-legacy/styles/stepper/_stepper-theme.scss','projects/ngx-material-legacy/package.json'):
                target=root/path;saved=target.read_bytes()
                try:
                    target.write_bytes(saved+b' cold')
                    with self.assertRaises((AssertionError,ValueError)):new.StepperCurrentPeerSourceV4(root)
                    with self.assertRaises(AssertionError):s.assert_current()
                finally:target.write_bytes(saved)
                armed=[False];last=s.bound[-1]['path']
                def callback(member):
                    result=(root/member).read_bytes()
                    if armed[0] and member==last:
                        armed[0]=False;target.write_bytes(saved+b' late')
                    return result
                live=new.StepperCurrentPeerSourceV4(root,read=callback)
                try:
                    armed[0]=True
                    with self.assertRaises(AssertionError):live.assert_current()
                finally:target.write_bytes(saved)
                live.assert_current()
            version_path=root/'projects/ngx-material-legacy/package.json';version_raw=version_path.read_bytes()
            version=json.loads(version_raw);version['version']='21.0.0';other_version=json.dumps(version).encode()
            with self.assertRaises(AssertionError):new.StepperCurrentPeerSourceV4(root,read=lambda member:other_version if member=='projects/ngx-material-legacy/package.json' else (root/member).read_bytes())
            try:
                version_path.write_text(json.dumps(version))
                with self.assertRaises(AssertionError):s.assert_current()
                with self.assertRaises(AssertionError):new.StepperCurrentPeerSourceV4(root)
            finally:version_path.write_bytes(version_raw)
            with self.assertRaises(AttributeError):s._active=False
            state={'armed':False};holder={}
            def reentrant(member):
                raw=(root/member).read_bytes()
                if state['armed']:
                    state['armed']=False
                    with self.assertRaises(AssertionError):holder['source'].assert_current()
                return raw
            holder['source']=new.StepperCurrentPeerSourceV4(root,read=reentrant)
            state['armed']=True
            with self.assertRaises(AssertionError):holder['source'].assert_current()
            holder['source'].assert_current()
            result=subprocess.run(['node',str(ROOT/'tests/stepper_current_peer_source_v4_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=90)
            self.assertEqual(result.returncode,0,result.stderr)
            js=json.loads(result.stdout);self.assertEqual(js['transition'],s.transition);self.assertEqual(js['source_set'],s.source_set)
            self.assertEqual((js['line'],js['bound'],js['negative_paths']),('main',296,5))

if __name__=='__main__':unittest.main()
