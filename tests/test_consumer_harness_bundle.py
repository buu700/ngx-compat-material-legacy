"""Bundled harness inputs cannot borrow workspace or linked package sources."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ConsumerHarnessBundleTests(unittest.TestCase):
    def test_input_scope_rejects_escape_and_symlinks(self):
        code=r'''
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isolatedHarnessInputs} from './scripts/bundle-consumer-harness.mjs';
const base=mkdtempSync(join(tmpdir(),'consumer-bundle-scope-'));
try{
 const consumer=join(base,'consumer');mkdirSync(consumer);writeFileSync(join(consumer,'entry.js'),'// own source');
 const outside=join(base,'borrowed.js');writeFileSync(outside,'// unrelated source');symlinkSync(outside,join(consumer,'linked.js'));
 assert.equal(isolatedHarnessInputs(consumer,{inputs:{'entry.js':{}}})[0].path,'entry.js');
 assert.throws(()=>isolatedHarnessInputs(consumer,{inputs:{}}));
 for(const input of ['../borrowed.js',outside,'linked.js'])assert.throws(()=>isolatedHarnessInputs(consumer,{inputs:{[input]:{}}}));
}finally{rmSync(base,{recursive:true,force:true});}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
