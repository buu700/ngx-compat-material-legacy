# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import sys
import subprocess
import tempfile
import unittest
import json
from pathlib import Path
source_root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(source_root/'scripts'))
from select_dialog_finite_source_successor_v8 import SelectDialogFiniteSourceV8
spec='projects/ngx-material-legacy/legacy-select/select.spec.ts';menu='projects/ngx-material-legacy/legacy-menu/menu.spec.ts';packet='compatibility/rc/parent-main-select-escape-lifecycle-source-v8.json'
old=dict(path=spec,sha256='0026c159543c040dc5e8c85baf25f37ec12130cab91841ff651eb96c797940fc',bytes=233115)
new=dict(path=spec,sha256='b5d7beb6119249251920eb98e9503b9b86cc35ef9349ac82bb290c38e804ac0a',bytes=238826)

class SelectDialogPythonV8Test(unittest.TestCase):
    @unittest.skipUnless(json.loads((source_root / 'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.'), 'main-only finite successor')
    def test_source_guards_and_recovery(self):
        source=SelectDialogFiniteSourceV8(source_root,line='main')
        git_dir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=source_root,text=True).strip()
        with tempfile.TemporaryDirectory(prefix='select-dialog-v8-') as tmp:
            root=Path(tmp)
            (root/'.git').write_text('gitdir: '+git_dir+'\n')
            for row in source.bound:
                target=root/row['path']
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((source_root/row['path']).read_bytes())
            create=lambda read=None:SelectDialogFiniteSourceV8(root,line='main',read=read)
            def fails(f):
                try:f()
                except AssertionError:return
                raise AssertionError('expected rejection')
            x=create();assert x.qualify(old)==new
            assert x.qualify(dict(path=menu,sha256='1f6c9025f1b04dc994e5e77247399546a2464c2281a01a46adeb50c828322321',bytes=144721))==dict(path=menu,sha256='1618f102fbd28b4d8c8eeb1b2d71e10e409f2ad103ebf8082e2b0d27517d6d65',bytes=144775)
            fails(lambda:x.qualify(dict(old,sha256='0'*64)))
            for path in (spec,menu,packet):
                p=root/path;saved=p.read_bytes()
                try:p.write_bytes(saved+b'x');fails(x.assert_physical);fails(create)
                finally:p.write_bytes(saved)
            fails(lambda:create(lambda p:b'bad' if p==spec else (root/p).read_bytes()))
            armed=[False];box={}
            def nested(p):
                if armed[0]:
                    try:box['owner'].assert_current()
                    except AssertionError:pass
                return (root/p).read_bytes()
            box['owner']=create(nested);armed[0]=True;fails(box['owner'].assert_current)
            armed[0]=False;target=dict(old)
            def mutate(p):
                if armed[0] and p==spec:target['bytes']=1
                return (root/p).read_bytes()
            x=create(mutate);armed[0]=True;fails(lambda:x.qualify(target))
            armed[0]=False;saved=(root/spec).read_bytes()
            def cross(p):
                b=(root/p).read_bytes()
                if armed[0] and p==menu:(root/spec).write_bytes(saved+b'x')
                return b
            x=create(cross)
            try:armed[0]=True;fails(x.assert_current)
            finally:(root/spec).write_bytes(saved)
            create().assert_current();print('Python select/dialog v8 controls passed')


if __name__ == '__main__':
    unittest.main()
