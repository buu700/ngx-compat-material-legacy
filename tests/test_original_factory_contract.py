"""Original factory metadata distinguishes attributes/non-injectable generic bases."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OriginalFactoryContractTests(unittest.TestCase):
    def test_locked_original_metadata_identity(self):
        path=ROOT/'reference/material-16.2.14/factory-metadata.json';raw=path.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),'1b124aab1f570e111647f8142cdea8066ae9db673efc405a6999c178709602b6')
        data=json.loads(raw);lock=ROOT/'reference/material-16.2.14/environment-package-lock.json'
        self.assertEqual(data['lock_sha256'],hashlib.sha256(lock.read_bytes()).hexdigest())
        self.assertEqual(data['integrity'],json.loads(lock.read_text())['packages']['node_modules/@angular/material']['integrity'])
        self.assertEqual(data['tarball_sha256'],'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b')
        self.assertEqual(len(data['factories']),402)
        for key in ['dialog/_MatDialogBase','paginator/_MatPaginatorBase']:
            self.assertEqual(data['factories'][key]['deps_kind'],'invalid')
            self.assertIn('deps: "invalid"',data['factories'][key]['declaration'])
        for key in ['legacy-chips/MatLegacyChip','legacy-radio/MatLegacyRadioButton']:
            self.assertEqual(data['factories'][key]['deps_kind'],'dependencies')
            self.assertEqual(data['factories'][key]['attributes'],['tabindex'])

    def test_factory_observer_keeps_invalid_throw_and_empty_return_distinct(self):
        code=r'''
import assert from 'node:assert/strict';
import {runFactory} from './scripts/api-di-observe.mjs';
import {originalFactoryContract} from './scripts/api-surface.mjs';
class FakeInjector {static create(){return new FakeInjector();}get(){return null;}}
const context=(injector,fn)=>fn();
const validEmpty=runFactory(()=>({}),FakeInjector,context);
const invalid=runFactory(()=>{throw new Error('This constructor was not compatible with Dependency Injection.');},FakeInjector,context);
assert.equal(validEmpty.outcome,'returned');assert.equal(validEmpty.error,null);
assert.equal(invalid.outcome,'threw');assert.match(invalid.error,/not compatible/);
assert.deepEqual(invalid.requests,[]);assert.deepEqual(validEmpty.requests,[]);
assert.equal(originalFactoryContract('/untouched/src/material/dialog/dialog.ts','_MatDialogBase').deps_kind,'invalid');
assert.equal(originalFactoryContract('/untouched/src/material/core/datetime/native-date-adapter.ts','NativeDateAdapter').deps_kind,'dependencies');
assert.equal(originalFactoryContract('/unrelated/candidate/dialog.ts','_MatDialogBase'),null);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
