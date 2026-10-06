"""Original CDK inheritance and cross-artifact observation cache regressions."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class InheritedFactoryContractTests(unittest.TestCase):
    def test_cdk_reference_is_lock_authenticated_original_metadata(self):
        raw=(ROOT/'reference/material-16.2.14/cdk-factory-metadata.json').read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),'86a98330dda8255dfd6666363aecc2b08ea0730cd39f8f31af998dd0987d4a72')
        data=json.loads(raw);lock=ROOT/'reference/material-16.2.14/environment-package-lock.json'
        self.assertEqual(data['lock_sha256'],hashlib.sha256(lock.read_bytes()).hexdigest())
        self.assertEqual(data['package'],'@angular/cdk');self.assertEqual(data['version'],'16.2.14')
        self.assertEqual(data['integrity'],json.loads(lock.read_text())['packages']['node_modules/@angular/cdk']['integrity'])
        self.assertEqual(data['tarball_sha256'],'a499ba0fee46784441b92587e43b17ec72d9bd383f78ea14954eaa62c781bad7')
        self.assertEqual(len(data['factories']),135)

    def test_inherited_expectation_and_artifact_module_cache(self):
        code=r'''
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadRuntimeModule,expectedFactoryDi} from './scripts/api-di-observe.mjs';
import {originalFactoryContract} from './scripts/api-surface.mjs';
for(const name of ['MatLegacyHeaderRowDef','MatLegacyFooterRowDef','MatLegacyRowDef']) {
 const original=originalFactoryContract('/untouched/src/material/legacy-table/row.ts',name);
 assert.equal(original.deps_kind,'inherited');
 const expected=expectedFactoryDi({diParams:[],originalFactory:original});
 assert.deepEqual(expected.map(p=>[p.ident,p.optional]),[['TemplateRef',false],['IterableDiffers',false],['CDK_TABLE',true]]);
 const bad=structuredClone(original);bad.inherited_factory.declaration=bad.inherited_factory.declaration.replace('token: CDK_TABLE','token: BrokenToken');
 assert.throws(()=>expectedFactoryDi({originalFactory:bad}),/unrecognized/);
}
const temp=mkdtempSync(join(tmpdir(),'different-artifact-modules-'));
try {
 const a=join(temp,'a'),b=join(temp,'b');
 for(const [root,value] of [[a,'first-artifact'],[b,'second-artifact']]) {
  mkdirSync(join(root,'fesm2022'),{recursive:true});
  writeFileSync(join(root,'fesm2022/ngx-compat-material-legacy-legacy-button.mjs'),`export const subject=${JSON.stringify(value)};`);
 }
 assert.equal((await loadRuntimeModule(a,'legacy-button','primary')).subject,'first-artifact');
 assert.equal((await loadRuntimeModule(b,'legacy-button','primary')).subject,'second-artifact');
 assert.equal(await loadRuntimeModule(a,'legacy-button','testing'),null);
 writeFileSync(join(a,'fesm2022/ngx-compat-material-legacy-legacy-button-testing.mjs'),"export const subject='new-testing-entry';");
 assert.equal((await loadRuntimeModule(a,'legacy-button','testing')).subject,'new-testing-entry');
} finally {rmSync(temp,{recursive:true,force:true});}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
