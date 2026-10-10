# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A signaled owned server must not hang waiting for an already emitted close."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RippleHydrationServerCleanupTests(unittest.TestCase):
    def test_real_child_closed_by_signal_before_callback_cleanup(self):
        code = r'''
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {withServer} from './scripts/ripple-hydration-replay.mjs';
const consumer=mkdtempSync(join(tmpdir(),'hydration-closed-child-'));
try {
 mkdirSync(join(consumer,'dist/server'),{recursive:true});
 writeFileSync(join(consumer,'dist/server/server.mjs'),
  "console.log('__HYDRATION_ORIGIN__http://127.0.0.1:12345');setTimeout(()=>process.kill(process.pid,'SIGTERM'),50);\n");
 let called=false;
 await withServer({consumer,env:{...process.env}},async origin=>{
  assert.equal(origin,'http://127.0.0.1:12345');called=true;
  await new Promise(done=>setTimeout(done,150));
 });
 assert.equal(called,true);
} finally {rmSync(consumer,{recursive:true,force:true});}
'''
        run = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True, timeout=10)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
