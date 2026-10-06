"""Source policy and fail-closed semantic receipts, without local Sass/install work."""
import copy
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_function_admission import function_assertion_ok
from sass_function_fixture import function_receipt
class SassFunctionContractTests(unittest.TestCase):
    def test_all_exported_functions_have_argument_bearing_probes(self):
        catalog=json.loads((ROOT/'fixtures/sass/function-contracts.json').read_text())
        oracle=json.loads((ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_text())
        self.assertEqual({p['function'] for p in catalog['cases']},set(oracle['members']['functions']))
        self.assertEqual(len(catalog['cases']),57)
        code=r'''
import assert from 'node:assert/strict';
import {functionCaseIds,functionResultsMatch} from './scripts/sass-function-contracts.mjs';
import {createHash} from 'node:crypto';
const value='expected';const row={value,value_sha256:createHash('sha256').update(value).digest('hex'),value_bytes:8};
assert.equal(functionCaseIds().length,57);
assert.equal(functionResultsMatch(row,row),true);
assert.equal(functionResultsMatch(row,{...row,value:'nonempty-wrong'}),false);
assert.equal(functionResultsMatch(row,{...row,value_sha256:'0'.repeat(64)}),false);
assert.equal(functionResultsMatch({},{}),false);
import {measureFunction,functionCatalog} from './scripts/sass-function-contracts.mjs';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'sass-function-root-'));
try {
 const allowed=join(dir,'allowed');mkdirSync(allowed);const entry=join(allowed,'_index.scss');writeFileSync(entry,'// synthetic');
 const foreign=join(dir,'foreign.scss');writeFileSync(foreign,'// synthetic foreign');
 const fake=path=>({compileString(program,options){options.logger.debug('source-derived-value');return {loadedUrls:[pathToFileURL(path)]};}});
 const catalog=functionCatalog();const probe=catalog.cases[0];
 assert.equal(measureFunction(fake(entry),entry,[],catalog,probe,[allowed]).sources[0].path,'_index.scss');
 assert.throws(()=>measureFunction(fake(foreign),entry,[],catalog,probe,[allowed]),/outside/);
 assert.throws(()=>measureFunction({compileString(program,options){options.logger.debug('one');options.logger.debug('two');return {loadedUrls:[]};}},entry,[],catalog,probe,[allowed]),/exactly one/);
} finally {rmSync(dir,{recursive:true,force:true});}

'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
    def test_admission_rejects_copied_stale_incomplete_and_self_expected_values(self):
        catalog=json.loads((ROOT/'fixtures/sass/function-contracts.json').read_text())
        for line in ['main','21.x']:
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
            for probe in catalog['cases']:
                body=function_receipt(ROOT,active,probe['case_id'],'synthetic-invocation')
                self.assertTrue(function_assertion_ok(ROOT,active,body,'synthetic-invocation'))
                for key,value in [('line','foreign'),('expression','m.define-palette(m.$red-palette)'),('mutation_rejected',False),('identity',{}),('binding',{}),('expected',{})]:
                    if body.get(key)==value:continue
                    wrong=copy.deepcopy(body);wrong[key]=value
                    self.assertFalse(function_assertion_ok(ROOT,active,wrong,'synthetic-invocation'),key)
                for role in ['expected','actual']:
                    wrong=copy.deepcopy(body);wrong[role]['value']='incorrect-but-nonempty'
                    self.assertFalse(function_assertion_ok(ROOT,active,wrong,'synthetic-invocation'))
                wrong=copy.deepcopy(body);wrong['expected']['sources']=copy.deepcopy(wrong['actual']['sources'])
                self.assertFalse(function_assertion_ok(ROOT,active,wrong,'synthetic-invocation'))
if __name__=='__main__':unittest.main()
