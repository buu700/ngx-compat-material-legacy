# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Main-only select source mirror and callback immutability on disposable input."""
import copy,json,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from select_dialog_finite_source_successor_v6 import SelectDialogFiniteSourceV6
class SelectDialogPythonV6Tests(unittest.TestCase):
    def test_exact_js_python_and_callbacks(self):
        initial=SelectDialogFiniteSourceV6(ROOT,line='main')
        with tempfile.TemporaryDirectory(prefix='select-dialog-v6-') as scratch:
            root=Path(scratch);paths={r['path'] for r in initial.bound}
            paths.update(('scripts/select-dialog-finite-source-v6.mjs','scripts/select-dialog-finite-source-successor.mjs'))
            for path in paths:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip();(root/'.git').write_text('gitdir: '+gitdir+'\n')
            s=SelectDialogFiniteSourceV6(root,line='main');p=json.loads((root/'compatibility/rc/parent-select-dialog-menu-reviewed-repair-source-v6.json').read_bytes())
            for row in p['repairs']:
                expected=dict(path=row['path'],sha256=row['after']['sha256'],bytes=row['after']['bytes'])
                self.assertEqual(s.qualify({k:row['before'][k] for k in ('path','sha256','bytes')}),expected);self.assertEqual(s.qualify({k:row['after'][k] for k in ('path','sha256','bytes')}),expected)
                with self.assertRaises(AssertionError):s.qualify(dict(path=row['path'],sha256='0'*64))
            with self.assertRaises(AttributeError):s._active=False
            row=p['repairs'][0];incoming={k:row['before'][k] for k in ('path','sha256','bytes')};armed=[False]
            def read(path):
                data=(root/path).read_bytes()
                if armed[0]:armed[0]=False;incoming['sha256']='0'*64
                return data
            live=SelectDialogFiniteSourceV6(root,line='main',read=read);armed[0]=True
            with self.assertRaises(AssertionError):live.qualify(incoming)
            incoming['sha256']=row['before']['sha256'];live.assert_current()
            armed=[False];box={}
            def nested(path):
                data=(root/path).read_bytes()
                if armed[0]:
                    armed[0]=False
                    with self.assertRaises(AssertionError):box['owner'].assert_current()
                return data
            box['owner']=SelectDialogFiniteSourceV6(root,line='main',read=nested);armed[0]=True
            with self.assertRaises(AssertionError):box['owner'].assert_current()
            box['owner'].assert_current()
            path=root/'projects/ngx-material-legacy/package.json';before=path.read_bytes()
            try:
                value=json.loads(before);value['version']='21.0.0';path.write_text(json.dumps(value))
                with self.assertRaises(AssertionError):s.assert_current()
                with self.assertRaises(AssertionError):SelectDialogFiniteSourceV6(root,line='main')
            finally:path.write_bytes(before)
            child=subprocess.run(['node',str(ROOT/'tests/select_dialog_python_v6_concordance_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=120)
            self.assertEqual(child.returncode,0,child.stderr);result=json.loads(child.stdout)
            js={r['path']:r for r in result['bound'] if r['path'] not in ('scripts/select-dialog-finite-source-v6.mjs','scripts/select-dialog-finite-source-successor.mjs')}
            py={r['path']:r for r in s.bound if r['path'] not in ('scripts/select_dialog_finite_source_successor_v6.py','scripts/select_dialog_finite_source_successor_v4.py')}
            self.assertEqual(js,py)
if __name__=='__main__':unittest.main()
