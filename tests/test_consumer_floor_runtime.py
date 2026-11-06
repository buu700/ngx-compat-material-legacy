# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Runtime selector/checker rejects corrupt and misidentified native binaries."""
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class RuntimeProfileTest(unittest.TestCase):
    def run_node(self,code):
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,env=os.environ)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
    def test_platform_and_corruption_controls(self):
        self.run_node(r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runtimeProfile,verifyRuntimeArchive,verifyRuntimeExecutable} from './scripts/consumer-floor-runtime.mjs';
const plan=JSON.parse(readFileSync('compatibility/rc/consumer-floor-plan.json'));
const p=runtimeProfile(plan,'linux','arm64','20.19.0');
assert.throws(()=>verifyRuntimeArchive(Buffer.from('corrupt'),p.pin));
assert.throws(()=>runtimeProfile(plan,'linux','riscv64','20.19.0'));
assert.throws(()=>runtimeProfile(plan,'linux','arm64','99.0.0'));
const child=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8'});assert.equal(r.status,0);return r;};
const actual=process.version.slice(1), wrong=actual==='0.0.0'?'0.0.1':'0.0.0';
assert.throws(()=>verifyRuntimeExecutable(process.execPath,wrong,`${process.platform}-${process.arch}`,child));
assert.throws(()=>verifyRuntimeExecutable(process.execPath,actual,'linux-impossible',child));
''')
    def test_real_native_runtime(self):
        if not os.environ.get('FLOOR_NODE_ARCHIVE') or not os.environ.get('FLOOR_NODE_BINARY'):
            self.skipTest('set verified native ARM64 runtime paths')
        self.run_node(r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runtimeProfile,verifyRuntimeArchive,verifyRuntimeExecutable} from './scripts/consumer-floor-runtime.mjs';
const plan=JSON.parse(readFileSync('compatibility/rc/consumer-floor-plan.json'));
const p=runtimeProfile(plan,'linux','arm64','20.19.0');
verifyRuntimeArchive(readFileSync(process.env.FLOOR_NODE_ARCHIVE),p.pin);
const child=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8'});assert.equal(r.status,0);return r;};
assert.equal(verifyRuntimeExecutable(process.env.FLOOR_NODE_BINARY,'20.19.0','linux-arm64',child).version,'v20.19.0');
''')
