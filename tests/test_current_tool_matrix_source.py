# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Source-only MAIN matrix transition, not a runtime or release admission."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.current_tool_matrix_source import CurrentToolMatrixSource

ROOT = Path(__file__).resolve().parents[1]
PACKET = 'compatibility/rc/current-tool-matrix-source-successor-v1.json'
PRIOR = 'compatibility/rc/historical-registry-before-pointer-v1.json'
INPUT = 'compatibility/rc/current-tool-matrix-input-successor-v1.json'
INPUT_SPEC = 'projects/ngx-material-legacy/legacy-input/input.spec.ts'
FORM = 'projects/ngx-material-legacy/legacy-form-field/form-field.ts'
MATRIX = 'compatibility/rc/matrices/full-verify.json'
SPEC = 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts'

class CurrentToolMatrixSourceTest(unittest.TestCase):
    def test_ast_retained_records_and_adversarial_physical_guards(self):
        # Real source-derived roster; no browser or packed run follows from it.
        script = """import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {deriveHistoricalRoster} from './scripts/historical-case-roster.mjs';const packet=JSON.parse(readFileSync('compatibility/rc/current-tool-matrix-final-product-v1.json')),old=JSON.parse(readFileSync(packet.predecessor_registry.path)),expected=JSON.parse(readFileSync(packet.current_registry.path)),now=deriveHistoricalRoster(process.cwd());assert.deepEqual(now,expected);const ids=packet.new_cases.map(x=>x.case_id),restored=structuredClone(now);restored.cases=restored.cases.filter(x=>!ids.includes(x.case_id));restored.ids=restored.ids.filter(x=>!ids.includes(x));restored.direct_cases-=5;assert.deepEqual(restored,old);assert.equal(now.cases.length,2329);assert.equal(now.discovery_negative_ids.length,5);console.log('PASS actual AST 2324 preserved plus 5');"""
        child = subprocess.run(['node','--input-type=module','-e',script,str(ROOT / PRIOR),str(ROOT / INPUT)],cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,child.stderr)
        with tempfile.TemporaryDirectory(prefix='matrix-source-',dir=os.environ.get('TMPDIR')) as temp:
            root=Path(temp);packet=json.loads((ROOT/PACKET).read_bytes());input_packet=json.loads((ROOT/INPUT).read_bytes())
            final=json.loads((ROOT/'compatibility/rc/current-tool-matrix-final-product-v1.json').read_bytes()); extra={'compatibility/rc/current-tool-matrix-final-product-v1.json', final['predecessor_registry']['path'],final['current_registry']['path'],*[x['archive']['path'] for x in final['source_transitions']+final['structural_transitions']],*[x['after']['path'] for x in final['source_transitions']]}; files=extra | {'projects/ngx-material-legacy/package.json',PACKET,INPUT,PRIOR,MATRIX,SPEC,INPUT_SPEC,FORM,*[r['path'] for r in input_packet['reviews']],'scripts/current-tool-matrix-source.mjs','scripts/current_tool_matrix_source.py',*[r['path'] for r in packet['reviews']],'scripts/upstream-historical-behavior-evidence.mjs','testing/legacy-runner/historical-inventory.json'}
            # Include every physically bound current matrix input in the isolated frame.
            files.update(ref['path'] for ref in CurrentToolMatrixSource(ROOT).bound)
            for path in files:
                dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dest)
            gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip();(root/'.git').write_text('gitdir: '+gitdir+'\n')
            subject=CurrentToolMatrixSource(root);subject.assert_current();self.assertEqual(len(subject.comparison_bytes(subject.before)),subject.before['bytes']);self.assertEqual(len(subject.comparison_bytes(subject.intermediate)),subject.intermediate['bytes'])
            with self.assertRaises(AssertionError):subject.comparison_bytes(dict(subject.before,sha256='0'*64))
            hooks = []
            class Hostile:
                def __eq__(self, other):
                    hooks.append('eq')
                    try: CurrentToolMatrixSource(root)
                    except Exception: pass
                    return True
            class HostileDict(dict):
                def __getitem__(self, key):
                    hooks.append('getitem')
                    raise RuntimeError('getter called')
            for reference in (subject.before, subject.intermediate):
                for field in ('path', 'sha256', 'bytes'):
                    with self.assertRaises(AssertionError): subject.comparison_bytes(dict(reference, **{field: Hostile()}))
                with self.assertRaises(AssertionError): subject.comparison_bytes(HostileDict(reference))
            self.assertEqual(hooks, [])
            exposed_before = subject.before
            exposed_before['sha256'] = '0'*64
            with self.assertRaises(AssertionError): subject.comparison_bytes(exposed_before)
            exposed_intermediate = subject.intermediate
            exposed_intermediate['sha256'] = '0'*64
            with self.assertRaises(AssertionError): subject.comparison_bytes(exposed_intermediate)
            self.assertNotEqual(subject.intermediate['sha256'], '0'*64)
            exposed_after = subject.after
            exposed_after['path'] = 'projects/ngx-material-legacy/package.json'
            self.assertEqual(subject.after['path'], MATRIX)
            self.assertEqual(len(subject.comparison_bytes(subject.before)), subject.before['bytes'])
            optimized = """import sys; from scripts.current_tool_matrix_source import CurrentToolMatrixSource as S
try: S(sys.argv[1], read=lambda _:b'forged')
except AssertionError: pass
else: raise SystemExit('optimized interpreter accepted forged reader')
s=S(sys.argv[1]); ref=s.before; ref['sha256']='0'*64
try: s.comparison_bytes(ref)
except AssertionError: pass
else: raise SystemExit('optimized interpreter accepted altered predecessor')
calls=[]
class Hostile:
 def __eq__(self, other): calls.append('eq'); return True
for ref in (s.before,s.intermediate):
 for key in ('path','sha256','bytes'):
  candidate=dict(ref); candidate[key]=Hostile()
  try: s.comparison_bytes(candidate)
  except AssertionError: pass
  else: raise SystemExit('optimized interpreter accepted hostile value')
if calls: raise SystemExit('optimized interpreter executed hostile comparison')
from subprocess import check_output
from pathlib import Path
root=Path(sys.argv[1]); inventory='testing/legacy-runner/historical-inventory.json'; old=check_output(['git','--no-replace-objects','show','1e26eefba6fa380b520ae05cb6f9ff3ea734545a:'+inventory],cwd=root)
try: S(root,read=lambda path:old if path==inventory else (root/path).read_bytes())
except AssertionError: pass
else: raise SystemExit('optimized interpreter accepted historical inventory as current')
from pathlib import Path
root=Path(sys.argv[1]); target=root/'projects/ngx-material-legacy/legacy-input/input.spec.ts'; original=target.read_bytes(); state={'armed':False,'step':0}
def reader(path):
 raw=(root/path).read_bytes()
 if state['armed'] and state['step']==0: target.write_bytes(original+b'\\n'); state['step']=1
 elif state['armed'] and state['step']==1: target.write_bytes(original); state['step']=2
 return raw
subject=S(root,read=reader)
try:
 state['armed']=True
 try: subject.assert_current()
 except AssertionError: pass
 else: raise SystemExit('optimized interpreter accepted cross-callback drift')
 if state['step']!=1: raise SystemExit('unexpected callback restoration ordering')
finally: target.write_bytes(original)
"""
            for flags, env_patch in ((['-O'], {}), ([], {'PYTHONOPTIMIZE':'1'})):
                env = dict(os.environ, **env_patch)
                run = subprocess.run([os.sys.executable,*flags,'-c',optimized,str(root)],cwd=ROOT,env=env,capture_output=True,text=True,timeout=30)
                self.assertEqual(run.returncode,0,run.stderr or run.stdout)

            for path in (*extra,MATRIX,PACKET,INPUT,PRIOR,SPEC,INPUT_SPEC,FORM,*(r['path'] for r in input_packet['reviews']),*(r['path'] for r in packet['reviews']), 'scripts/upstream-historical-behavior-evidence.mjs', 'testing/legacy-runner/historical-inventory.json'):
                f=root/path;raw=f.read_bytes()
                try:
                    f.write_bytes(raw+b'\n')
                    with self.assertRaises(AssertionError):CurrentToolMatrixSource(root)
                    with self.assertRaises(AssertionError):subject.assert_current()
                    if path == INPUT:
                        code = "import sys; from scripts.current_tool_matrix_source import CurrentToolMatrixSource as S\ntry:S(sys.argv[1])\nexcept AssertionError:pass\nelse:raise SystemExit('optimized interpreter accepted changed input packet')"
                        for flags, env_patch in ((['-O'], {}), ([], {'PYTHONOPTIMIZE':'1'})):
                            check = subprocess.run([os.sys.executable,*flags,'-c',code,str(root)],cwd=ROOT,env=dict(os.environ, **env_patch),capture_output=True,text=True,timeout=30)
                            self.assertEqual(check.returncode,0,check.stderr or check.stdout)

                finally:f.write_bytes(raw)
                subject.assert_current()
            historical = subject.comparison_bytes(subject.before)
            def wrong(path):return historical if path==MATRIX else (root/path).read_bytes()
            with self.assertRaises(AssertionError):CurrentToolMatrixSource(root,read=wrong)
            inventory_path = 'testing/legacy-runner/historical-inventory.json'
            old_inventory = subprocess.check_output(['git','--no-replace-objects','show','1e26eefba6fa380b520ae05cb6f9ff3ea734545a:'+inventory_path],cwd=root)
            def old_inventory_reader(path): return old_inventory if path == inventory_path else (root/path).read_bytes()
            with self.assertRaises(AssertionError): CurrentToolMatrixSource(root, read=old_inventory_reader)
            armed=False;changed=False;f=root/MATRIX;raw=f.read_bytes()
            def late(path):
                nonlocal changed
                value=(root/path).read_bytes()
                if armed and not changed:f.write_bytes(raw+b'\n');changed=True
                return value
            live=CurrentToolMatrixSource(root,read=late)
            try:
                armed=True
                with self.assertRaises(AssertionError):live.assert_current()
                self.assertTrue(changed)
            finally:armed=False;f.write_bytes(raw)
            live.assert_current()
            cross_path = root / INPUT_SPEC
            cross_raw = cross_path.read_bytes()
            cross_armed = False
            cross_step = 0
            def cross_reader(path):
                nonlocal cross_step
                value = (root / path).read_bytes()
                if cross_armed and cross_step == 0:
                    cross_path.write_bytes(cross_raw + b'\n'); cross_step = 1
                elif cross_armed and cross_step == 1:
                    cross_path.write_bytes(cross_raw); cross_step = 2
                return value
            cross = CurrentToolMatrixSource(root, read=cross_reader)
            try:
                cross_armed = True
                with self.assertRaises(AssertionError): cross.assert_current()
                self.assertEqual(cross_step, 1, 'restoration callback must not run before rejection')
            finally:
                cross_armed = False
                cross_path.write_bytes(cross_raw)
            cross.assert_current()
            alias=root.parent/(root.name+'-alias');alias.symlink_to(root,target_is_directory=True)
            entered=False;trigger=False
            def reenter(path):
                nonlocal entered
                value=(root/path).read_bytes()
                if trigger and not entered:
                    entered=True
                    with self.assertRaises(RuntimeError):CurrentToolMatrixSource(alias)
                return value
            try:
                watched=CurrentToolMatrixSource(root,read=reenter);trigger=True
                with self.assertRaises(AssertionError):watched.assert_current()
                self.assertTrue(entered);trigger=False;watched.assert_current()
            finally:alias.unlink()
            node=subprocess.run(['node',str(ROOT/'tests/current_tool_matrix_source_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=60)
            self.assertEqual(node.returncode,0,node.stderr);js=json.loads(node.stdout)
            self.assertEqual(js['before'],subject.before);self.assertEqual(js['intermediate'],subject.intermediate);self.assertEqual(js['after'],subject.after)
            py_bound={x['path']:x for x in subject.bound if x['path']!='scripts/current_tool_matrix_source.py'}
            js_bound={x['path']:x for x in js['bound'] if x['path']!='scripts/current-tool-matrix-source.mjs'}
            self.assertEqual(py_bound,js_bound)
