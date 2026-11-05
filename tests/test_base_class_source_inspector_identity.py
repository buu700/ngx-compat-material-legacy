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
console.log(JSON.stringify({result:'pass',rejected,getter_calls:getterCalls,owner_executed:false}));
"""
        child = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        self.assertEqual(json.loads(child.stdout), dict(result='pass', rejected=3,
                         getter_calls=0, owner_executed=False))


if __name__ == '__main__':
    unittest.main()
