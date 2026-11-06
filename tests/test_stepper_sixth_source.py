# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite sixth Sass source guard, exercised in an isolated physical fixture."""
from pathlib import Path
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
PACKET = 'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json'
BRIDGE = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'

def fixture(destination):
    packet=json.loads((ROOT/PACKET).read_bytes())
    version=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version']
    line='21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    assert line
    v2=json.loads((ROOT/packet['previous_packet']['path']).read_bytes())
    css=json.loads((ROOT/v2['historical_css_packet']['path']).read_bytes())
    source=json.loads((ROOT/v2['historical_source_packet']['path']).read_bytes())['branches'][line]
    rows=next(iter(css['branches'][line]['source_sets'].values()))
    owned=[row for row in rows if row['root']==0]
    assert len(owned)==286
    paths={PACKET,packet['previous_packet']['path'],'projects/ngx-material-legacy/package.json',
           'scripts/stepper-sixth-source.mjs','scripts/stepper_sixth_source.py'}
    paths.update(v2[key]['path'] for key in ('historical_source_packet','historical_css_packet','protected_input_packet','style_template_census'))
    paths.update('projects/ngx-material-legacy/'+row['path'] for row in owned)
    for path in sorted(paths):
        target=destination/path;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes((ROOT/path).read_bytes())
    gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
    (destination/'.git').write_text('gitdir: '+gitdir+'\n')
    return line,packet['branches'][line]

class StepperSixthSourceTests(unittest.TestCase):
    def test_physical_callback_reference_and_js_parity(self):
        for line_expected in ('21.x','main'):
            version=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version']
            line='21.x' if version.startswith('21.') else 'main'
            if line!=line_expected:continue
            with tempfile.TemporaryDirectory(prefix='ngx-stepper-sixth-source-test-') as scratch:
                root=Path(scratch);line,branch=fixture(root)
                spec=importlib.util.spec_from_file_location('isolated_stepper_sixth',root/'scripts/stepper_sixth_source.py')
                module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
                subject=module.StepperSixthSource(root)
                self.assertEqual(len(subject.bound),293)
                with self.assertRaises(TypeError):subject._bound[0]['sha256']='0'*64
                with self.assertRaises(TypeError):subject._branch['reviewed_after']['sha256']='0'*64
                with self.assertRaises(AttributeError):subject._bound=[]
                alias=Path(str(root)+'-alias')
                try:
                    alias.symlink_to(root,target_is_directory=True)
                    with self.assertRaises(AssertionError):module.StepperSixthSource(alias)
                finally:alias.unlink()
                optimized="""import importlib.util,sys
from pathlib import Path
root=Path(sys.argv[1]);mode=sys.argv[2]
spec=importlib.util.spec_from_file_location('optimized_stepper',root/'scripts/stepper_sixth_source.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
s=m.StepperSixthSource(root,read=(lambda _:b'wrong') if mode=='callback' else None)
if mode=='predecessor':s.qualify({'path':'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','sha256':'0'*64})
"""
                for mode in ('callback','predecessor'):
                    optimized_result=subprocess.run([sys.executable,'-O','-c',optimized,str(root),mode],capture_output=True,text=True)
                    self.assertNotEqual(optimized_result.returncode,0,mode)
                    self.assertIn('optimized Python cannot run Stepper source authority',optimized_result.stderr)
                self.assertEqual(subject.qualify(branch['before_git'])['sha256'],branch['reviewed_after']['sha256'])
                self.assertEqual(subject.qualify(branch['reviewed_after'])['sha256'],branch['reviewed_after']['sha256'])
                self.assertIsNone(subject.qualify({'path':'elsewhere.scss','sha256':'0'*64}))
                with self.assertRaises(AssertionError):subject.qualify({'path':BRIDGE,'sha256':'0'*64})
                with self.assertRaises(AssertionError):subject.qualify({'path':BRIDGE,'sha256':branch['before_git']['sha256'],'bytes':1})
                with self.assertRaises(AssertionError):module.StepperSixthSource(root,read=lambda _:b'wrong')
                for path in (BRIDGE,'projects/ngx-material-legacy/styles/stepper/_stepper-theme.scss',
                             'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',PACKET,'scripts/stepper_sixth_source.py'):
                    file=root/path;prior=file.read_bytes()
                    try:
                        file.write_bytes(prior+b'\n# changed\n')
                        with self.assertRaises(AssertionError):subject.assert_physical()
                        if path==BRIDGE:
                            with self.assertRaises(AssertionError):subject.qualify(branch['before_git'])
                        with self.assertRaises(AssertionError):module.StepperSixthSource(root)
                    finally:file.write_bytes(prior)
                    subject.assert_current()
                early=root/'projects/ngx-material-legacy/_index.scss';original=early.read_bytes()
                last=subject.bound[-1]['path'];armed=[False]
                def callback(path):
                    raw=(root/path).read_bytes()
                    if armed[0] and path==last:
                        armed[0]=False;early.write_bytes(original+b'\n# late\n')
                    return raw
                guarded=module.StepperSixthSource(root,read=callback)
                try:
                    armed[0]=True
                    with self.assertRaises(AssertionError):guarded.assert_current()
                finally:early.write_bytes(original)
                guarded.assert_current()
                child=subprocess.run([NODE,str(ROOT/'tests/stepper_sixth_source_probe.mjs'),str(root)],
                                     cwd=ROOT,capture_output=True,text=True,timeout=45)
                self.assertEqual(child.returncode,0,child.stderr)
                report=json.loads(child.stdout)
                self.assertEqual(report['line'],line)
                self.assertEqual(report['transition'],subject.transition)
                self.assertEqual(report['source_set_sha256'],subject.source_set['v3_current_sha256'])
                self.assertEqual(report['bound_count'],len(subject.bound))

if __name__=='__main__':unittest.main()
