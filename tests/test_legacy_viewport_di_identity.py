"""Owned viewport identity is finite and must not fall through to the private peer."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LegacyViewportIdentityTests(unittest.TestCase):
    def test_exact_shared_core_class_and_eligible_original_parameters(self):
        code = r'''
import assert from 'node:assert/strict';
import {ownedViewportIdentity} from './scripts/api-di-observe.mjs';
class Owned {} class SameName {}
const param={ident:'ViewportRuler',imported:'ViewportRuler',spec:'@angular/cdk/scrolling'};
for(const family of ['legacy-autocomplete','legacy-progress-spinner','legacy-select','legacy-tabs']) {
 assert.equal(ownedViewportIdentity(family,param,{_LegacyViewport:Owned},Owned),true);
 assert.equal(ownedViewportIdentity(family,param,{_LegacyViewport:Owned},SameName),false);
 assert.equal(ownedViewportIdentity(family,param,{},Owned),false);
 assert.equal(ownedViewportIdentity(family,param,{_LegacyViewport:undefined},undefined),false);
 for(const changed of [{...param,ident:'Other'},{...param,imported:'Other'},{...param,spec:'foreign'},
  {...param,spec:'@angular/cdk/overlay'}])assert.equal(ownedViewportIdentity(family,changed,{_LegacyViewport:Owned},Owned),null);
}
assert.equal(ownedViewportIdentity('legacy-table',param,{_LegacyViewport:Owned},Owned),null);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
