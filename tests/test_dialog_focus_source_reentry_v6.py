# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""A caught nested focus operation cannot make the enclosing source sweep pass."""
import json,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from dialog_focus_finite_source_successor_v6 import DialogFocusFiniteSourceV6
from tests.test_current_sass_source import candidate_fixture
class FocusReentryTests(unittest.TestCase):
 def test_caught_nested_entries_and_late_mutation(self):
  with tempfile.TemporaryDirectory(prefix='ngx-focus-reentry-') as td:
   root=Path(td);self.assertEqual(candidate_fixture(root),'main');packet=json.loads((root/'compatibility/rc/parent-main-dialog-focus-sass-source-v6.json').read_bytes());ref={k:packet['before'][k] for k in ('path','sha256','bytes')}
   state={'mode':None,'owner':None,'last':None};target=root/ref['path'];original=target.read_bytes()
   def read(path):
    raw=(root/path).read_bytes();mode=state['mode']
    if mode and (mode!='mutate' or path==state['last']):
     state['mode']=None;owner=state['owner']
     if mode=='mutate':target.write_bytes(original+b'\n// changed\n')
     else:
      try:{'current':owner.assert_current,'physical':owner.assert_physical,'qualify':lambda:owner.qualify(ref),'historical':lambda:owner.historical_reference(ref)}[mode]()
      except AssertionError:pass
    return raw
   s=DialogFocusFiniteSourceV6(root,line='main',read=read);state['owner']=s;state['last']=[r['path'] for r in s.bound if not r['path'].startswith('node_modules/')][-1];self.assertNotEqual(state['last'],ref['path'])
   for mode in ('current','physical','qualify','historical','mutate'):
    with self.subTest(mode=mode):
     state['mode']=mode
     try:
      with self.assertRaises(AssertionError):s.assert_current()
     finally:target.write_bytes(original)
     s.assert_current()
   program="""import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {dialogFocusFiniteSourceSuccessor} from './scripts/dialog-focus-finite-source-v6.mjs';const root=process.argv[1],packet=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-main-dialog-focus-sass-source-v6.json'))),{path,sha256,bytes}=packet.before,ref={path,sha256,bytes},file=join(root,path),original=readFileSync(file);let owner,mode=null,last=null;const read=p=>{const b=readFileSync(join(root,p)),m=mode;if(m&&(m!=='mutate'||p===last)){mode=null;if(m==='mutate')writeFileSync(file,Buffer.concat([original,Buffer.from('\\n// changed\\n')]));else try{({current:()=>owner.assertCurrent(),physical:()=>owner.assertPhysical(),qualify:()=>owner.qualify(ref),historical:()=>owner.historicalReference(ref)})[m]()}catch{}}return b};owner=dialogFocusFiniteSourceSuccessor({root,line:'main',read});last=owner.bound.filter(r=>!r.path.startsWith('node_modules/')).at(-1).path;assert.notEqual(last,path);for(const m of ['current','physical','qualify','historical','mutate']){mode=m;try{assert.throws(()=>owner.assertCurrent(),m)}finally{writeFileSync(file,original)}owner.assertCurrent()}let calls=0;assert.throws(()=>owner.qualify({get path(){calls++;return path},sha256}));assert.equal(calls,0);assert.throws(()=>owner.qualify(new Proxy(ref,{})));assert.throws(()=>owner.qualify(Object.assign(Object.create({}),ref)));assert.throws(()=>owner.qualify({...ref,[Symbol('x')]:1}));"""
   child=subprocess.run(['node','--input-type=module','-e',program,str(root)],cwd=ROOT,text=True,capture_output=True,timeout=120)
   self.assertEqual(child.returncode,0,child.stdout+child.stderr)
