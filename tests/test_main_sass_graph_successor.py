# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite main graph successor accepts only its authenticated physical images."""
import json,os,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from main_sass_graph_successor import MainSassGraphSuccessor,PACKET

class MainSassGraphTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
  (self.root/'.git').write_text('gitdir: '+gitdir+'\n')
  packet=json.loads((ROOT/PACKET).read_bytes())
  surface_path='compatibility/rc/parent-main-sass-common-surface-source-v1.json';surface=json.loads((ROOT/surface_path).read_bytes());self.surface=surface
  paths=[PACKET,surface_path,surface['review']['path']]+[r['path'] for r in packet['transitions'] if r['after'] is not None]+[r['path'] for r in packet['support']]+[r['path'] for r in surface['transitions']]
  for path in paths:
   dest=self.root/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dest)
  self.packet=packet
 def tearDown(self):self.tmp.cleanup()
 def test_physical_deleted_mutation_and_bad_callback(self):
  s=MainSassGraphSuccessor(self.root,None);s.assert_current();self.assertEqual(len(s.removed),2)
  row=self.packet['transitions'][0];old={k:row['before'][k] for k in ('path','sha256','bytes')};current={k:row['after'][k] for k in ('path','sha256','bytes')};self.assertEqual(s.qualify(old),current)
  with self.assertRaises(AssertionError):s.qualify(dict(old,sha256='0'*64))
  target=self.root/row['path'];original=target.read_bytes();target.write_bytes(original+b'\n');
  with self.assertRaises(AssertionError):s.assert_current()
  target.write_bytes(original);s.assert_current()
  removed=self.root/s.removed[0];removed.parent.mkdir(parents=True,exist_ok=True);removed.write_text('restored')
  with self.assertRaises(AssertionError):s.assert_current()
  removed.unlink();s.assert_current()
  with self.assertRaises(AssertionError):MainSassGraphSuccessor(self.root,lambda p:b'wrong')
 def test_all_44_common_surface_images_and_rehashed_mutations(self):
  s=MainSassGraphSuccessor(self.root,None);self.assertEqual(len(self.surface['transitions']),44)
  for row in self.surface['transitions']:
   with self.subTest(path=row['path']):
    before={k:row['before'][k] for k in ('path','sha256','bytes')};after={k:row['after'][k] for k in ('path','sha256','bytes')}
    self.assertEqual(s.qualify(before),after)
    target=self.root/row['path'];raw=target.read_bytes()
    try:
     target.write_bytes(raw+b'\n// changed\n')
     with self.assertRaises(AssertionError):s.assert_current()
    finally:target.write_bytes(raw)
  s.assert_current()
  program="""import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {mainSassGraphSuccessor} from './scripts/main-sass-graph-successor.mjs';const root=process.argv[1],p=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-main-sass-common-surface-source-v1.json'))),s=mainSassGraphSuccessor({root});assert.equal(p.transitions.length,44);for(const row of p.transitions){const {path,sha256,bytes}=row.before;assert.deepEqual(s.qualify({path,sha256,bytes}),{path,sha256:row.after.sha256,bytes:row.after.bytes});const file=join(root,path),old=readFileSync(file);try{writeFileSync(file,Buffer.concat([old,Buffer.from('\\n// changed\\n')]));assert.throws(()=>s.assertCurrent())}finally{writeFileSync(file,old)}}s.assertCurrent();"""
  child=subprocess.run(['node','--input-type=module','-e',program,str(self.root)],cwd=ROOT,capture_output=True,text=True,timeout=120);self.assertEqual(child.returncode,0,child.stdout+child.stderr)
 def test_symlink_root_is_rejected_in_both_languages(self):
  link=self.root.parent/(self.root.name+'-link');link.symlink_to(self.root,target_is_directory=True)
  try:
   with self.assertRaises(AssertionError):MainSassGraphSuccessor(link,None)
   script="import assert from 'node:assert/strict';import {mainSassGraphSuccessor} from './scripts/main-sass-graph-successor.mjs';assert.throws(()=>mainSassGraphSuccessor({root:process.argv[1]}));"
   child=subprocess.run(['node','--input-type=module','-e',script,str(link)],cwd=ROOT,text=True,capture_output=True,timeout=60);self.assertEqual(child.returncode,0,child.stderr)
  finally:link.unlink()
 def test_optimized_python_rejects_graph_authority(self):
  code="import sys;sys.path.insert(0,sys.argv[1]);from main_sass_graph_successor import MainSassGraphSuccessor;MainSassGraphSuccessor(sys.argv[2],None)"
  child=subprocess.run([sys.executable,'-O','-c',code,str(ROOT/'scripts'),str(self.root)],capture_output=True,text=True,timeout=30)
  self.assertNotEqual(child.returncode,0);self.assertIn('optimized Python cannot authenticate Sass graph',child.stderr)
 def test_caught_reentry_is_sticky_in_both_languages(self):
  state={'armed':False,'subject':None}
  def read(path):
   if state['armed']:
    state['armed']=False
    try:state['subject'].assert_current()
    except AssertionError:pass
   return (self.root/path).read_bytes()
  s=MainSassGraphSuccessor(self.root,read);state.update(armed=True,subject=s)
  with self.assertRaises(AssertionError):s.assert_current()
  s.assert_current()
  script="""import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join} from 'node:path';import {mainSassGraphSuccessor} from './scripts/main-sass-graph-successor.mjs';const root=process.argv[1];let s,armed=false;const read=p=>{if(armed){armed=false;try{s.assertCurrent()}catch{}}return readFileSync(join(root,p));};s=mainSassGraphSuccessor({root,read});armed=true;assert.throws(()=>s.assertCurrent());s.assertCurrent();assert.throws(()=>mainSassGraphSuccessor({root,read:()=>Buffer.from('wrong')}));"""
  child=subprocess.run(['node','--input-type=module','-e',script,str(self.root)],cwd=ROOT,capture_output=True,text=True,timeout=60)
  self.assertEqual(child.returncode,0,child.stdout+child.stderr)
