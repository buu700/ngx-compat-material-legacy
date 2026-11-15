# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Physical source-owner controls in a private disposable checkout."""
import json
import os
from pathlib import Path
import shutil
import secrets
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
NODE=shutil.which('node')
COMMIT='f9aac126ea70fd83731b62305c07fdb993aa3334'
FILES=('scripts/authored-use-inventory.mjs','scripts/prepare-bidi-physical-epoch.mjs',
       'compatibility/f10/authored-dependency-dispositions.json',
       'compatibility/f10/authored-use-reviews/frozen-ngmodule-retired-source-f9-v1.json',
       'compatibility/rc/bidi-product-epoch-f9-v1.json',
       'compatibility/rc/bidi-product-epoch-f9-source-review-v1.json',
       'tests/authored_f9_physical_successor_probe.mjs')

class AuthoredF9Physical(unittest.TestCase):
    def test_positive_corruption_reentry_and_recovery(self):
        self.assertIsNotNone(NODE, 'Run in the pinned workspace environment: node is missing')
        self.assertEqual(subprocess.check_output([NODE,'--version'],text=True).strip(), 'v'+(ROOT/'.node-version').read_text().strip())
        env={k:v for k,v in os.environ.items() if k not in {'GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_CONFIG_COUNT','GIT_CONFIG_PARAMETERS'}}
        env.update(GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
        with tempfile.TemporaryDirectory(prefix='ngx-authored-f9-') as directory:
            parent=Path(directory);nonce=secrets.token_hex(32);(parent/'fixture-marker').write_text(nonce+'\n');env['NGX_AUTHORED_F9_FIXTURE_NONCE']=nonce;root=parent/'repo'
            subprocess.run(['git','clone','--shared','--quiet','--no-checkout',str(ROOT),str(root)],env=env,check=True)
            subprocess.run(['git','-c','core.hooksPath=/dev/null','checkout','--quiet','--detach',COMMIT],cwd=root,env=env,check=True)
            for name in FILES:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            result=subprocess.run([NODE,'tests/authored_f9_physical_successor_probe.mjs'],cwd=root,env=env,capture_output=True,text=True,timeout=300)
            self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-8000:]);report=json.loads(result.stdout)
            self.assertEqual((report['bidi'],report['ngmodule']),(23,23));self.assertFalse(report['runtime_or_g11_claim'])

if __name__=='__main__': unittest.main()
