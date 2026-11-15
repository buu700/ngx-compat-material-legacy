# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Provisional epoch census on a disposable Git checkout; no source admission."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
NODE=shutil.which('node')
SOURCE='c22d3446936d25a34503881b96c0d16bf5be5793'
SCRIPT='scripts/prepare-bidi-physical-epoch.mjs'

class ProvisionalBidiEpoch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if NODE is None or subprocess.check_output([NODE,'--version'],text=True).strip() != 'v'+(ROOT/'.node-version').read_text().strip():
            raise RuntimeError('Run in the pinned workspace Node environment')
        cls.tmp=tempfile.TemporaryDirectory(prefix='ngx-bidi-epoch-fixture-')
        cls.root=Path(cls.tmp.name)/'repo'
        cls.env={k:v for k,v in os.environ.items() if k not in {'GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_CONFIG_COUNT','GIT_CONFIG_PARAMETERS'}}
        cls.env.update(GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1',GIT_TERMINAL_PROMPT='0')
        subprocess.run(['git','clone','--shared','--quiet','--no-checkout',str(ROOT),str(cls.root)],check=True,env=cls.env)
        subprocess.run(['git','-c','core.hooksPath=/dev/null','checkout','--quiet','--detach',SOURCE],cwd=cls.root,check=True,env=cls.env)
        shutil.copyfile(ROOT/SCRIPT,cls.root/SCRIPT)

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def run_census(self,commit=SOURCE):
        return subprocess.run([NODE,SCRIPT,commit],cwd=self.root,env=self.env,capture_output=True,text=True,timeout=90)

    def test_actual_git_census_and_physical_conflicts(self):
        positive=self.run_census();self.assertEqual(positive.returncode,0,positive.stderr[-4000:])
        body=json.loads(positive.stdout);self.assertEqual((body['old_members'],body['current_members'],len(body['transitions'])),(510,510,27))
        self.assertEqual(sum(row['was_bidi_pinned'] for row in body['transitions']),13)
        self.assertIn('not-qualification',body['role'])
        mismatch=self.run_census('0'*40);self.assertNotEqual(mismatch.returncode,0);self.assertIn('target differs from actual HEAD',mismatch.stderr)
        target=self.root/'projects/ngx-material-legacy/legacy-button/button.ts';before=target.read_bytes()
        try:
            target.write_bytes(before+b'\n// fixture change\n');result=self.run_census();self.assertNotEqual(result.returncode,0);self.assertIn('physical differs from committed source',result.stderr)
        finally: target.write_bytes(before)
        extra=self.root/'projects/ngx-material-legacy/legacy-button/fixture-untracked.ts'
        try:
            extra.write_text('// fixture\n');result=self.run_census();self.assertNotEqual(result.returncode,0);self.assertIn('physical membership',result.stderr)
        finally: extra.unlink(missing_ok=True)
        self.assertEqual(self.run_census().returncode,0)
        # A later metadata-only commit may bind the actual prior source cut.
        (self.root/'fixture-epoch-marker').write_text('metadata only\n')
        subprocess.run(['git','add','fixture-epoch-marker'],cwd=self.root,env=self.env,check=True)
        subprocess.run(['git','-c','user.name=fixture','-c','user.email=fixture@example.invalid',
                        '-c','core.hooksPath=/dev/null','commit','-qm','metadata only'],cwd=self.root,env=self.env,check=True)
        code="import {inspectBidiEpoch as f} from './scripts/prepare-bidi-physical-epoch.mjs'; const x=f({target:'"+SOURCE+"',requireHead:false}); if(x.current_members!==510) throw Error('population');"
        later=subprocess.run([NODE,'--input-type=module','-e',code],cwd=self.root,env=self.env,capture_output=True,text=True,timeout=90)
        self.assertEqual(later.returncode,0,later.stderr[-4000:])
        self.assertNotEqual(self.run_census().returncode,0)  # CLI capture requires actual HEAD.
        extra.write_text('// committed unreviewed membership\n')
        subprocess.run(['git','add',str(extra.relative_to(self.root))],cwd=self.root,env=self.env,check=True)
        subprocess.run(['git','-c','user.name=fixture','-c','user.email=fixture@example.invalid',
                        '-c','core.hooksPath=/dev/null','commit','-qm','unreviewed product member'],cwd=self.root,env=self.env,check=True)
        latest=subprocess.check_output(['git','rev-parse','HEAD'],cwd=self.root,env=self.env,text=True).strip()
        membership=self.run_census(latest)
        self.assertNotEqual(membership.returncode,0);self.assertIn('unreviewed product membership transition',membership.stderr)

if __name__=='__main__': unittest.main()
