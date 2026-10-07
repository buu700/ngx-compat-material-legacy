"""Closed markers cannot hide missing/duplicate authored-use identities."""
import json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class AuthoredUseInventoryTests(unittest.TestCase):
    def test_full_authenticated_roster_and_mutations(self):
        script=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authoredUseInventory} from './scripts/authored-use-inventory.mjs';
const expected=JSON.parse(readFileSync('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses;
assert.equal(expected.length,1736);
const rows=expected.map(row=>({...row,disposition:'closed',status:'reviewed'}));
const good=authoredUseInventory(expected,{status:'closed',symbol_uses:rows});
assert.equal(good.complete,true);assert.equal(good.open,0);
for(const list of [[],rows.slice(1),[...rows,rows[0]],rows.map((row,i)=>i===0?{...row,symbol:'outside-original-scope'}:row),rows.map((row,i)=>i===0?{disposition:'closed',status:'reviewed'}:row)]){
 assert.equal(authoredUseInventory(expected,{status:'closed',symbol_uses:list}).complete,false);
}
for(const state of ['inventory-seed','pending','security-review',undefined]){
 const changed=rows.map((row,i)=>i===0?{...row,status:state}:row);
 assert.equal(authoredUseInventory(expected,{symbol_uses:changed}).open,1);
}
assert.equal(authoredUseInventory(expected,{status:'closed'}).complete,false);
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
