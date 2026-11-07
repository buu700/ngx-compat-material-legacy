# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded current-source qualification, not Sass or artifact admission."""
import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from select_dialog_finite_source_successor_v7 import SelectDialogFiniteSourceV7
from dialog_focus_finite_source_successor_v6 import DialogFocusFiniteSourceV6
from current_sass_source import CurrentSassSource
class MainSassDomainTests(unittest.TestCase):
 def test_exact_qualifiers_and_bad_supplied_reader(self):
  select=SelectDialogFiniteSourceV7(ROOT);packet=json.loads((ROOT/'compatibility/rc/parent-main-select-menu-sass-source-v7.json').read_bytes())
  for row in packet['repairs']:
   old={k:row['before'][k] for k in ('path','sha256','bytes')};after={k:row['after'][k] for k in ('path','sha256','bytes')}
   self.assertEqual(select.qualify(old),after)
   with self.assertRaises(AssertionError):select.qualify(dict(old,sha256='0'*64))
  focus=DialogFocusFiniteSourceV6(ROOT,line='main');p=json.loads((ROOT/'compatibility/rc/parent-main-dialog-focus-sass-source-v6.json').read_bytes());old={k:p['before'][k] for k in ('path','sha256','bytes')};after={k:p['after'][k] for k in ('path','sha256','bytes')}
  self.assertEqual(focus.qualify(old),after)
  with self.assertRaises(AssertionError):focus.qualify(dict(old,bytes=old['bytes']+1))
  with self.assertRaises(AssertionError):SelectDialogFiniteSourceV7(ROOT,read=lambda _:b'bad')
  with self.assertRaises(AssertionError):DialogFocusFiniteSourceV6(ROOT,line='main',read=lambda _:b'bad')
  source=CurrentSassSource(ROOT);source.assert_current();self.assertGreater(len(source.bound),750)
 def test_javascript_matches_and_rejects_unqualified_inputs(self):
  script="""import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {selectDialogFiniteSuccessor} from './scripts/select-dialog-finite-source-v7.mjs';import {dialogFocusFiniteSourceSuccessor} from './scripts/dialog-focus-finite-source-v6.mjs';import {createCurrentSassSource} from './scripts/current-sass-source.mjs';import {readEvidenceMember} from './scripts/upstream-packed-run-evidence.mjs';const root=process.cwd(),read=p=>readEvidenceMember(root,p),selection=selectDialogFiniteSuccessor({root,line:'main',read}),packet=JSON.parse(readFileSync('compatibility/rc/parent-main-select-menu-sass-source-v7.json'));for(const row of packet.repairs){const {path,sha256,bytes}=row.before;assert.deepEqual(selection.qualify({path,sha256,bytes}),{path,sha256:row.after.sha256,bytes:row.after.bytes});assert.throws(()=>selection.qualify({path,sha256:'0'.repeat(64),bytes}));}const focus=dialogFocusFiniteSourceSuccessor({root,line:'main',read}),p=JSON.parse(readFileSync('compatibility/rc/parent-main-dialog-focus-sass-source-v6.json')),{path,sha256,bytes}=p.before;assert.deepEqual(focus.qualify({path,sha256,bytes}),{path,sha256:p.after.sha256,bytes:p.after.bytes});assert.throws(()=>focus.qualify({path,sha256,bytes:bytes+1}));assert.throws(()=>selectDialogFiniteSuccessor({root,line:'main',read:()=>Buffer.from('bad')}));const source=createCurrentSassSource({root});source.assertCurrent();assert.ok(source.bound.length>750);"""
  child=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True,timeout=120)
  self.assertEqual(child.returncode,0,child.stdout+child.stderr)
