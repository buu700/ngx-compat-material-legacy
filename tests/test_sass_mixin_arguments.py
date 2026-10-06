"""Pure configurable-mixin roster, resolver fence and admission negative checks."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_mixin_argument_admission import mixin_argument_assertion_ok,mixin_argument_measurements_ok
from sass_mixin_fixture import mixin_receipt
class SassMixinArgumentTests(unittest.TestCase):
    def test_complete_argument_roster_and_actual_measurement_fence(self):
        code=r"""
import assert from 'node:assert/strict';
import {mixinArgumentCatalog,mixinArgumentCaseIds,measureMixinArgument,mixinArgumentResultsMatch,runMixinArgumentContracts} from './scripts/sass-mixin-arguments.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
const catalog=mixinArgumentCatalog();assert.equal(mixinArgumentCaseIds().length,498);
assert.equal(new Set(catalog.cases.map(p=>p.mixin)).size,249);
const dir=mkdtempSync(join(tmpdir(),'mixin-argument-fence-'));
try {
 const original=join(dir,'original'),candidate=join(dir,'candidate');mkdirSync(original);mkdirSync(candidate);
 const referenceEntry=join(original,'_index.scss'),entry=join(candidate,'_index.scss');writeFileSync(entry,'// synthetic candidate');writeFileSync(referenceEntry,'// synthetic original');
 let calls=0;
 const sass={compileString(program,options){calls++;assert.match(program,/define-palette\(m.\$indigo-palette, 700/);assert.equal(options.style,'expanded');const location=program.includes(pathToFileURL(referenceEntry).href)?referenceEntry:entry;return {css:program.slice(program.indexOf('.sass-argument-probe')),loadedUrls:[pathToFileURL(location)]};}};
 const result=runMixinArgumentContracts({sass,entry,loadPaths:[],allowedRoots:[candidate],line:'main',referenceEntry,referenceRoot:original,identity:{synthetic:true}});
 assert.equal(result.ok,true);assert.equal(calls,996);assert.equal(result.results.every(p=>p.mutation_rejected),true);
 const observed=result.results[0];assert.equal(mixinArgumentResultsMatch(observed.expected,observed.actual),true);
 assert.equal(mixinArgumentResultsMatch(observed.expected,{...observed.actual,css:'wrong'}),false);
 assert.equal(mixinArgumentResultsMatch(observed.expected,observed.mutation),false);
 assert.throws(()=>measureMixinArgument({compileString(){return {css:'',loadedUrls:[pathToFileURL(referenceEntry)]};}},entry,[],catalog,catalog.cases[0],[candidate]),/outside/);
 assert.equal(mixinArgumentResultsMatch({css:'',css_bytes:0,css_sha256:'wrong'},{css:'',css_bytes:0,css_sha256:'wrong'}),false);
}finally {rmSync(dir,{recursive:true,force:true});}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_all_cases_reject_wrong_css_sources_arguments_binding_and_mutation(self):
        raw=(ROOT/'fixtures/sass/mixin-argument-contracts.json').read_bytes();catalog=json.loads(raw)
        for line in ('main','21.x'):
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
            seen_variants=set()
            for probe in catalog['cases']:
                body=mixin_receipt(ROOT,active,probe['case_id'],'synthetic-invocation')
                self.assertTrue(mixin_argument_assertion_ok(ROOT,active,body,'synthetic-invocation'))
                if probe['variant'] in seen_variants:continue
                seen_variants.add(probe['variant'])
                for key,value in [('line','foreign'),('call',''),('argument','$changed'),('binding',{}),('expected',{}),('identity',{}),('mutation',{}),('mutation_rejected',False)]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic-invocation'),key)
                wrong=copy.deepcopy(body);wrong['expected']['sources']=copy.deepcopy(wrong['actual']['sources']);self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic-invocation'))
                wrong=copy.deepcopy(body);wrong['actual']['css']='incorrect nonempty CSS';self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'synthetic-invocation'))
    def test_rendered_measurements_do_not_accept_a_full_css_mismatch(self):
        active=SimpleNamespace(binding={'source_line':'main'},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        body=mixin_receipt(ROOT,active,'mixin-argument/all-legacy-component-themes/custom-full-theme','one')
        body['actual']['css']='.different { color: blue; }'
        body['actual']['css_sha256']=hashlib.sha256(body['actual']['css'].encode()).hexdigest()
        body['actual']['css_bytes']=len(body['actual']['css'].encode())
        self.assertTrue(mixin_argument_measurements_ok(ROOT,body))
        self.assertFalse(mixin_argument_assertion_ok(ROOT,active,body,'one'))
if __name__=='__main__':unittest.main()
