"""Names and descriptions cannot establish constructor DI object identity."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class RuntimeDiObjectIdentity(unittest.TestCase):
    def test_exact_objects_finite_original_aliases_and_fail_closed_resolution(self):
        code=r'''
import assert from 'node:assert/strict';
import {originalRuntimeAliases,runtimeTokenIdentity,injectionTokenMatches} from './scripts/api-di-observe.mjs';
class Token{constructor(description){this.description=description;}toString(){return 'InjectionToken '+this.description;}}
const token=new Token('original'), twin=new Token('original');
const param={ident:'SERVICE',imported:'SERVICE',spec:'@angular/core'};
const importer=async spec=>{assert.equal(spec,'@angular/core');return {SERVICE:token};};
assert.equal(await runtimeTokenIdentity('family',param,{}, {},token,importer),true);
assert.equal(await runtimeTokenIdentity('family',param,{}, {},twin,importer),false);
assert.equal(await runtimeTokenIdentity('family',param,{}, {},token,async()=>({OTHER:token})),false);
assert.equal(await runtimeTokenIdentity('family',param,{}, {},token,async()=>{throw new Error('missing peer');}),false);
const symbols=[{family:'family',name:'PUBLIC',shape:{runtimeName:'Original'}},{family:'family',name:'ALIAS',shape:{runtimeName:'Original'}},{family:'other',name:'FOREIGN',shape:{runtimeName:'Original'}},{family:'family',name:'PUBLIC_TOKEN',shape:{tokenName:'ORIGINAL_TOKEN'}}];
const aliases=originalRuntimeAliases(symbols,'family');assert.deepEqual(aliases,{Original:['PUBLIC','ALIAS'],ORIGINAL_TOKEN:['PUBLIC_TOKEN']});
for(const spec of ['./local','@angular/material/original']){
 const p={ident:'Original',imported:'Original',spec};
 const load=async()=>{throw new Error('known original aliases must not fall back');};
 assert.equal(await runtimeTokenIdentity('family',p,{PUBLIC:token,ALIAS:token},aliases,token,load),true);
 assert.equal(await runtimeTokenIdentity('family',p,{PUBLIC:token,ALIAS:token},aliases,twin,load),false);
 assert.equal(await runtimeTokenIdentity('family',p,{PUBLIC:token},aliases,token,load),false);
 assert.equal(await runtimeTokenIdentity('family',p,{PUBLIC:token,ALIAS:twin},aliases,token,load),false);
}
assert.equal(await runtimeTokenIdentity('family',{ident:'Unexported',imported:'Unexported',spec:'./local'},{},{},token),false);
for(const ident of ['__proto__','constructor'])assert.equal(await runtimeTokenIdentity('family',{ident,imported:ident,spec:'./local'},{},{},token),false);
assert.equal(await runtimeTokenIdentity('legacy-core',{ident:'MATERIAL_SANITY_CHECKS',spec:'@angular/material/core'},{MATERIAL_LEGACY_SANITY_CHECKS:token},{},twin,importer),false);
assert.equal(injectionTokenMatches(token,Token,'original'),true);
assert.equal(injectionTokenMatches({toString:()=>String(token)},Token,'original'),false);
assert.equal(injectionTokenMatches(new Token('original-extra'),Token,'original'),false);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
