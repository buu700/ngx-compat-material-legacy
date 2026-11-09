# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite Bidi routing against isolated physical inputs."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]

class BidiCurrentSourceContinuationTest(unittest.TestCase):
    def test_direct_routing_lifetimes(self):
        command="import {currentInventorySourceSubject as f} from './scripts/current-inventory-source-subject.mjs';console.log(JSON.stringify(f({root:process.cwd()}).bound))"
        refs=json.loads(subprocess.check_output(['node','--input-type=module','-e',command],cwd=ROOT,text=True))
        with tempfile.TemporaryDirectory(prefix='bidi-routing-',dir=os.environ.get('TMPDIR')) as temp:
            root=Path(temp)
            for ref in refs:
                dest=root/ref['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/ref['path'],dest)
            gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip();(root/'.git').write_text('gitdir: '+gitdir+'\n')
            child=subprocess.run(['node',str(ROOT/'tests/bidi_current_source_continuation_probe.mjs')],cwd=root,capture_output=True,text=True,timeout=90)
            self.assertEqual(child.returncode,0,child.stderr)
            actual=json.loads(child.stdout)
            self.assertEqual(actual,dict(result='pass',new_paths=9,cold_and_late_physical=9,cold_and_late_callback=9,old_program_callbacks_rejected=2,old_roster_callback_rejected=True,known_and_unknown_program_identities=True,accessor_not_invoked=True,reentrant=True,g11_claim='not-passed'))
