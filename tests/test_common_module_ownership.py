"""Original common check bodies, flags, cleanup and test-mode behavior are retained."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
REF=ROOT/'reference/material-16.2.14/error-helper-sources'
def body(source,header):
    start=source.index(header);start=source.index('{',start)+1;depth=1
    for end in range(start,len(source)):
        if source[end]=='{':depth+=1
        if source[end]=='}':depth-=1
        if not depth:return source[start:end]
    raise AssertionError('unbalanced method')
class CommonModuleOwnershipTests(unittest.TestCase):
    def test_untouched_originals_and_unchanged_check_bodies(self):
        proof=json.loads((ROOT/'compatibility/rc/common-module-ownership-source-proof.json').read_text())
        for name,pin in proof['originals'].items():self.assertEqual(hashlib.sha256((REF/name).read_bytes()).hexdigest(),pin)
        original=(REF/'common-module.ts').read_text();owned=(ROOT/proof['owned']['path']).read_text()
        self.assertEqual(hashlib.sha256(owned.encode()).hexdigest(),proof['owned']['after_sha256'])
        for header in ['private _checkIsEnabled(', 'function _checkDoctypeIsDefined(', 'function _checkThemeIsPresent(', 'function _checkCdkVersionMatch(']:
            self.assertEqual(body(owned,header),body(original,header))
        helper=(ROOT/'projects/ngx-material-legacy/legacy-core/internal/test-environment.ts').read_text()
        self.assertEqual(helper.replace(' * Copyright (c) 2026 Ryan Lester.\n','',1),(REF/'test-environment.ts').read_text())
        self.assertNotIn('._applyBodyHighContrastModeCssClasses(',owned)
        self.assertIn('imports: [BidiModule, A11yModule]',owned)
        self.assertNotIn('initializedContrastDetectors',owned)
        self.assertIn('inject(HighContrastModeDetector)._applyBodyHighContrastModeCssClasses()',proof['minimum_public_cdk_proof']['a11y_module_initialization_excerpt'])
        self.assertIn('if (isDevMode())',owned)
        sanity=(ROOT/'projects/ngx-material-legacy/legacy-core/internal/sanity-checks.ts').read_text()
        for name in ['doctype','theme','version']:self.assertIn(name+': boolean;',sanity);self.assertNotIn(name+'?:',sanity)
        self.assertIn("'mat-sanity-checks'",sanity)
        self.assertIn("getHighContrastMode(): HighContrastMode",proof['minimum_public_cdk_proof']['detector_declaration'])
        self.assertTrue(any('HighContrastModeDetector' in line for line in proof['minimum_public_cdk_proof']['public_exports']))

    def test_original_compiled_constructor_has_contextual_platform_injection(self):
        script=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedFactoryDi} from './scripts/api-di-observe.mjs';
import {originalFactoryContract} from './scripts/api-surface.mjs';
const compiled=readFileSync('reference/material-16.2.14/error-helper-sources/common-module-compiled.txt','utf8');
const prefix=compiled.slice(compiled.indexOf('class MatCommonModule'),compiled.indexOf('    static { this.ɵfac'))+'\n}';
const Platform={};
const direct=[{ident:'HighContrastModeDetector',optional:false},{ident:'MATERIAL_SANITY_CHECKS',optional:true},{ident:'DOCUMENT',optional:false}];
const original=originalFactoryContract('/untouched/src/material/core/common-behaviors/common-module.ts','MatCommonModule');
const shape={diParams:direct,originalFactory:original};
for(const mode of [undefined,true,false]) {
 const requested=[];
 const inject=(token,options)=>{assert.equal(token,Platform);requested.push({ident:'Platform',optional:options.optional});return null;};
 // Only the untouched original16 private call is modeled as a no-op here.
 // No current private method or candidate constructor provides expectations.
 const Original=new Function('inject','Platform','_isTestEnvironment','ngDevMode','return '+prefix)(inject,Platform,()=>false,mode);
 new Original({_applyBodyHighContrastModeCssClasses(){}},false,{});
 const devMode=mode!==false;
 assert.deepEqual(expectedFactoryDi(shape,{devMode}),devMode?[...direct,{ident:'Platform',imported:'Platform',spec:'@angular/cdk/platform',optional:true}]:direct);
 assert.deepEqual(requested,devMode?[{ident:'Platform',optional:true}]:[]);
}
assert.throws(()=>expectedFactoryDi(shape),/missing.*dev-mode/);
assert.throws(()=>expectedFactoryDi({...shape,originalFactory:{...original,source_sha256:'0'.repeat(64)}},{devMode:true}),/unrecognized/);
assert.deepEqual(expectedFactoryDi({diParams:direct},{devMode:true}),direct);
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_original_check_functions_and_flags_execute(self):
        source=(REF/'common-module.ts').read_text()
        payload={key:body(source,header) for key,header in {
            'enabled':'private _checkIsEnabled(', 'doctype':'function _checkDoctypeIsDefined(',
            'theme':'function _checkThemeIsPresent(', 'version':'function _checkCdkVersionMatch(',
        }.items()}
        payload['test']=body((REF/'test-environment.ts').read_text(),'export function _isTestEnvironment(')
        script=r"""
import assert from 'node:assert/strict';
const p=JSON.parse(process.argv[1]);
const makeTest=(value)=>new Function('__karma__','jasmine','jest','Mocha',p.test)(...value);
assert.equal(makeTest([undefined,undefined,undefined,undefined]),false);
for(let index=0;index<4;index++){const values=[undefined,undefined,undefined,undefined];values[index]={};assert.equal(makeTest(values),true);}
const enabled=new Function('name','_isTestEnvironment',p.enabled);
for(const name of ['doctype','theme','version']) {
 assert.equal(enabled.call({_sanityChecks:true},name,()=>false),true);
 assert.equal(enabled.call({_sanityChecks:false},name,()=>false),false);
 assert.equal(enabled.call({_sanityChecks:{[name]:true}},name,()=>false),true);
 assert.equal(enabled.call({_sanityChecks:{}},name,()=>false),false);
 assert.equal(enabled.call({_sanityChecks:true},name,()=>true),false);
}
let warnings=[];const logger={warn:message=>warnings.push(message)};
const doctype=new Function('doc','console',p.doctype);
doctype({doctype:{}},logger);assert.equal(warnings.length,0);
doctype({doctype:null},logger);assert.equal(warnings.length,1);assert.ok(warnings[0].includes('doctype'));
let appended=0,removed=0;const element={classList:{add:name=>assert.equal(name,'mat-theme-loaded-marker')},remove(){removed++;}};
const doc={createElement:()=>element,body:{appendChild:node=>{assert.equal(node,element);appended++;}}};
const theme=new Function('doc','isBrowser','getComputedStyle','console',p.theme);
for(const computed of [null,{display:'none'},{display:'block'}])theme(doc,true,()=>computed,logger);
assert.equal(appended,3);assert.equal(removed,3);assert.equal(warnings.length,2);
theme({body:null},true,()=>{throw Error('unexpected style');},logger);
theme(doc,false,()=>{throw Error('unexpected style');},logger);assert.equal(appended,3);
const version=new Function('VERSION','CDK_VERSION','console',p.version);
version({full:'21.2.14'},{full:'21.2.14'},logger);assert.equal(warnings.length,2);
version({full:'21.2.14'},{full:'21.2.13'},logger);assert.equal(warnings.length,3);assert.ok(warnings[2].includes('21.2.13'));
"""
        result=subprocess.run(['node','--input-type=module','-e',script,json.dumps(payload)],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
