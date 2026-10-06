"""Owned legacy constructor tokens resolve through the finite packed export map."""
import subprocess
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class OwnedTokenIdentityTests(unittest.TestCase):
    def test_exact_objects_not_descriptions_or_unrelated_exports(self):
        script=r"""
import assert from 'node:assert/strict';
import {ownedTokenIdentity} from './scripts/api-di-observe.mjs';
for (const [family,names] of [
 ['legacy-form-field',['MAT_FORM_FIELD','MAT_ERROR','MAT_PREFIX','MAT_SUFFIX']],
 ['legacy-progress-bar',['MAT_PROGRESS_BAR_LOCATION','MAT_PROGRESS_BAR_DEFAULT_OPTIONS']],
]) for (const name of names) {
 const alias=name.replace('MAT_','MAT_LEGACY_');
 const token={toString:()=>`InjectionToken ${name}`};
 const twin={toString:()=>`InjectionToken ${name}`};
 const exports={[alias]:token};
 assert.equal(ownedTokenIdentity(family,{ident:name},exports,token),true);
 assert.equal(ownedTokenIdentity(family,{ident:name},exports,twin),false);
 assert.equal(ownedTokenIdentity(family,{ident:name},{[name]:token},token),false);
 assert.equal(ownedTokenIdentity(family,{ident:name},{},undefined),false);
 assert.equal(ownedTokenIdentity('unrelated',{ident:name},exports,token),null);
}
assert.equal(ownedTokenIdentity('legacy-progress-bar',{ident:'ElementRef'},{},{}),null);
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
