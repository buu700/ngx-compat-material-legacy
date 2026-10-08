"""Compiler observations must agree; matching names/counts do not suffice."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class CompilerConstructorContractTests(unittest.TestCase):
    def test_factory_metadata_token_flags_attribute_mode_and_manual_writes(self):
        code=r"""
import assert from 'node:assert/strict';
import {compilerConstructorContract} from './scripts/api-compiler-constructor-contract.mjs';
const source=`import * as i0 from '@angular/core';
import {Attribute as Attr,ElementRef as El,Optional as Opt} from '@angular/core';
class Owned {
 static ɵfac=i0.ɵɵngDeclareFactory({type:Owned,deps:[{token:'aria-live',attribute:true},{token:i0.ElementRef,optional:true}],target:i0.ɵɵFactoryTarget.Directive});
}
i0.ɵɵngDeclareClassMetadata({type:Owned,ctorParameters:()=>[{type:undefined,decorators:[{type:Attr,args:['aria-live']}]},{type:El,decorators:[{type:Opt}]}]});`;
const result=compilerConstructorContract(source,'Owned');assert.equal(result.parameters.length,2);
assert.equal(result.parameters[0].attribute,'aria-live');assert.equal(result.parameters[1].token_expression,'@angular/core#ElementRef');assert.equal(result.parameters[1].optional,true);
for(const change of [
 s=>s.replace('token:i0.ElementRef','token:i0.Injector'),
 s=>s.replace('optional:true','optional:false'),
 s=>s.replace('attribute:true','attribute:false'),
 s=>s.replace("token:'aria-live'","token:'role'"),
 s=>s.replace('type:Opt','type:i0.Self'),
 s=>s.replace('type:Attr','type:Unknown'),
 s=>s.replace('token:i0.ElementRef','token:choose()'),
 s=>s+'\nOwned.ɵfac=()=>({});',
 s=>s+'\nObject.defineProperty(Owned,"ɵfac",{value:()=>({})});',
 s=>s+'\nOwned["ɵfac"]=()=>({});',
 s=>s+'\nfunction shadow(i0){return i0;}',
 s=>s.replace('deps:[','deps:null,removed:['),
]){const mutant=change(source);assert.notEqual(mutant,source);assert.throws(()=>compilerConstructorContract(mutant,'Owned'));}
assert.throws(()=>compilerConstructorContract(source,'Missing'));
const foreign=source.replaceAll("from '@angular/core'","from 'foreign/core'");assert.throws(()=>compilerConstructorContract(foreign,'Owned'));
const ambiguous=source.replace('{type:Owned,deps:','{type:Owned,type:Owned,deps:');assert.throws(()=>compilerConstructorContract(ambiguous,'Owned'));
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-6000:])
