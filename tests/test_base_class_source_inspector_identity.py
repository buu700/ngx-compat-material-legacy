# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The source-lane precheck uses its owner's exact captured function identity."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BaseClassSourceInspectorIdentityTests(unittest.TestCase):
    def test_owner_identity_survives_epoch_import_order_and_rejects_accessors(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=process.cwd(),require=createRequire(join(root,'package.json'));
const admission=require('./scripts/upstream-base-class-removal-admission.cjs');
const descriptor=Object.getOwnPropertyDescriptor(admission,'inspectSource');
assert.ok(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function');
const leaf=await import(pathToFileURL(join(root,'scripts/base-class-removal-owner-source.mjs')).href);
const check=leaf.assertBaseClassRemovalSourceInspectorIdentity;
check();let rejected=0,getterCalls=0;
try {
 Object.defineProperty(admission,'inspectSource',{...descriptor,value:function alteredInspector(){}});
 assert.throws(check,error=>error.code==='ERR_ASSERTION');rejected++;
 // Force a new epoch evaluation even if the leaf's dependencies loaded it earlier.
 await import(pathToFileURL(join(root,'scripts/packed-upstream-ledger-epoch.mjs')).href+'?identity-order-control');
 assert.throws(check,error=>error.code==='ERR_ASSERTION');rejected++;
 Object.defineProperty(admission,'inspectSource',{configurable:true,enumerable:descriptor.enumerable,get(){getterCalls++;return descriptor.value;}});
 assert.throws(check,error=>error.code==='ERR_ASSERTION');rejected++;
 assert.equal(getterCalls,0);
} finally {Object.defineProperty(admission,'inspectSource',descriptor);}
check();
for (const key of ['loadedSourceReferences','loadedProducerFunctionSha256']) {
 const before=Object.getOwnPropertyDescriptor(admission,key);
 try {
  Object.defineProperty(admission,key,{...before,value:Object.freeze([])});
  assert.throws(check,error=>error.code==='ERR_ASSERTION');rejected++;
  Object.defineProperty(admission,key,{configurable:true,get(){getterCalls++;return before.value;}});
  assert.throws(check,error=>error.code==='ERR_ASSERTION');rejected++;
 } finally {Object.defineProperty(admission,key,before);}
 check();
}
console.log(JSON.stringify({result:'pass',rejected,getter_calls:getterCalls,owner_executed:false}));
"""
        child = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        self.assertEqual(json.loads(child.stdout), dict(result='pass', rejected=7,
                         getter_calls=0, owner_executed=False))


    def test_inspector_or_metadata_poisoned_before_owner_import_rejects_before_callback(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
const root=process.cwd(),require=createRequire(join(root,'package.json'));
const admission=require('./scripts/upstream-base-class-removal-admission.cjs');
const key=process.argv[1],before=Object.getOwnPropertyDescriptor(admission,key);
let forwarded=0,calls=0;
Object.defineProperty(admission,key,{...before,value:function forwardingFake(...args){forwarded++;return Reflect.apply(before.value,this,args);}});
try {
 const leaf=await import(pathToFileURL(join(root,'scripts/base-class-removal-owner-source.mjs')).href);
 assert.throws(()=>leaf.baseClassRemovalOwnerSourceSubject({root,read:path=>{
   calls++;Object.defineProperty(admission,key,before);return readFileSync(join(root,path));
 }}),error=>error.code==='ERR_ASSERTION'&&/unauthenticated loaded base-class/.test(error.message));
 assert.equal(calls,0);assert.equal(forwarded,0);
 console.log(JSON.stringify({result:'pass',key,callbacks:calls,forwarded}));
} finally {Object.defineProperty(admission,key,before);}
"""
        for key in ('inspectSource', 'metadataOk'):
            with self.subTest(key=key):
                child = subprocess.run(['node', '--input-type=module', '-e', script, key], cwd=ROOT,
                                       capture_output=True, text=True, timeout=30)
                self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
                self.assertEqual(json.loads(child.stdout), dict(result='pass', key=key, callbacks=0, forwarded=0))


    def test_loaded_handler_or_cached_producer_cannot_hide_behind_restored_disk(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.cwd(),require=createRequire(join(root,'package.json'));
const [which,path,old,replacement]=process.argv.slice(1);
const file=join(root,path),before=readFileSync(file);
assert.equal(before.toString().split(old).length,2);
let leaf,calls=0;
try {
 writeFileSync(file,before.toString().replace(old,replacement));
 if(which==='handler') {
   leaf=await import(pathToFileURL(join(root,'scripts/base-class-removal-owner-source.mjs')).href);
 } else {
   await import(pathToFileURL(file).href);
   writeFileSync(file,before);
   leaf=await import(pathToFileURL(join(root,'scripts/base-class-removal-owner-source.mjs')).href);
 }
 writeFileSync(file,before);
 assert.throws(()=>leaf.baseClassRemovalOwnerSourceSubject({root,read:p=>{
   calls++;return readFileSync(join(root,p));
 }}),error=>error.code==='ERR_ASSERTION'&&/loaded base-class/.test(error.message));
 assert.equal(calls,0);
 assert.ok(readFileSync(file).equals(before));
 console.log(JSON.stringify({result:'pass',which,callbacks:calls,physical_restored:true}));
} finally {writeFileSync(file,before);}
"""
        replacements = (
            ('handler', 'scripts/upstream-base-class-removal-admission.cjs',
             '  return row.after;', '  return row.before;'),
            ('producer', 'scripts/historical-contract-repair-source.mjs',
             'export function historicalContractRepairSourceSubject({root=process.cwd(),read:providedRead}={}){',
             'export function historicalContractRepairSourceSubject({root=process.cwd(),read:providedRead}={}){ /* cached producer drift */'),
            ('repair-private', 'scripts/historical-contract-repair-source.mjs',
             'function original(root,parent,path){',
             "function original(root,parent,path){throw new Error('cached private helper');"),
            ('original-private', 'scripts/upstream-base-class-removal-source.mjs',
             'const gitHash=(kind,raw)=>',
             "const gitHash=(kind,raw)=> {throw new Error('cached private helper');}; const ignoredGitHash=(kind,raw)=>"),
            ('review-private', 'compatibility/rc/21x-base-class-removal-source-final-review.mjs',
             'const memberKey = row =>',
             "const memberKey = row => {throw new Error('cached private helper');}; const ignoredMemberKey = row =>"),
        )
        for which, path, old, new in replacements:
            file = ROOT / path
            before = file.read_bytes()
            changed = before.decode().replace(old, new).encode()
            self.assertNotEqual(changed, before)
            try:
                child = subprocess.run(['node', '--input-type=module', '-e', script, which, path, old, new], cwd=ROOT,
                                       capture_output=True, text=True, timeout=30)
            finally:
                if file.is_symlink() or not file.is_file():
                    raise RuntimeError('Unexpected missing/linked source preserved: ' + str(file))
                if file.read_bytes() == changed:
                    file.write_bytes(before)
                self.assertEqual(file.read_bytes(), before, 'Foreign source bytes preserved')
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            self.assertEqual(json.loads(child.stdout), dict(result='pass', which=which, callbacks=0, physical_restored=True))


if __name__ == '__main__':
    unittest.main()
