"""Finite sort conformance cannot accept another case, stale peer, or CSS edit."""
import copy
import hashlib
from pathlib import Path
import sys
import json
import subprocess
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_sort_companion_admission import SORT_CASES
from sass_mixin_fixture import mixin_receipt

class SortCompanionAdmission(unittest.TestCase):
    def test_javascript_composition_and_mutation_scope(self):
        records=[]
        for line in ['main','21.x']:
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
            records.extend(mixin_receipt(ROOT,active,case,'one') for case in SORT_CASES)
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {sortCompanionResultsMatch,sortCompanionExpectedCss} from './scripts/sass-sort-companion-contract.mjs';
for(const row of JSON.parse(readFileSync(0,'utf8'))){
 const peer=row.current_companion.peer;
 const matches=(original=row.expected,actual=row.actual,p=peer,id=row.case_id)=>sortCompanionResultsMatch(id,original,actual,p);
 assert.equal(matches(),true);
 for(const key of ['peer_version','peer_package_json_sha256','program','program_sha256','css_sha256']){
  assert.equal(matches(row.expected,row.actual,{...peer,[key]:'incorrect'}),false,key);
 }
 assert.equal(matches(row.expected,row.expected),false,'missing current bridge');
 assert.equal(matches(row.expected,row.mutation),false,'unrelated added declaration');
 assert.equal(matches(row.expected,row.actual,{...peer,line:'unsupported'}),false);
 assert.equal(matches(row.expected,row.actual,peer,'mixin-argument/all-legacy-component-themes/custom-full-theme'),false);
 assert.equal(matches({...row.expected,css:'.wrong { color: red; }'}),false);
 for(const change of [{root:2},{path:'../candidate.scss'},{sha256:'f'.repeat(64)},{bytes:1}]){
  const p=structuredClone(peer);Object.assign(p.sources[0],change);assert.equal(matches(row.expected,row.actual,p),false);
 }
 assert.equal(sortCompanionExpectedCss(row.case_id,{},peer),null);
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,input=json.dumps(records),text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_all_four_cases_on_each_line_and_css_scope_negatives(self):
        for line in ['main','21.x']:
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
            for case in SORT_CASES:
                body=mixin_receipt(ROOT,active,case,'one')
                self.assertTrue(mixin_argument_assertion_ok(ROOT,active,body,'one'))
                for edit in [lambda css:css+'\n.owned { color: red; }',
                             lambda css:css.replace('.mat-sort-header-arrow','.changed'),
                             lambda css:css.replace('var(--mat-sort-arrow-color, ','var(--different-token, '),
                             lambda css:css.replace('color: var(','background: var('),
                             lambda css:css.replace('rgba(0, 0, 0, 0.87)','red').replace('white','red')]:
                    wrong=copy.deepcopy(body);css=edit(wrong['actual']['css'])
                    wrong['actual'].update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
                    self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'),case)
                wrong=copy.deepcopy(body);wrong['actual']=copy.deepcopy(wrong['expected'])
                self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'))
                wrong=copy.deepcopy(body);wrong.pop('current_companion')
                self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'))

    def test_wrong_peer_program_source_identity_and_scope_are_rejected(self):
        active=SimpleNamespace(binding={'source_line':'main'},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        body=mixin_receipt(ROOT,active,next(iter(SORT_CASES)),'one')
        for key,value in [('line','21.x'),('peer_version','22.2.0'),('peer_package_json_sha256','f'*64),
                          ('program','@use candidate;'),('program_sha256','f'*64),('sources',[])]:
            wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value
            self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'),key)
        for key,value in [('root',2),('path','../candidate.scss'),('sha256','f'*64),('bytes',1)]:
            wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0][key]=value
            self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'),key)
        wrong=copy.deepcopy(body);wrong['current_companion']['classification']='approved-exception'
        self.assertFalse(mixin_argument_assertion_ok(ROOT,active,wrong,'one'))
        other=mixin_receipt(ROOT,active,'mixin-argument/all-legacy-component-themes/custom-full-theme','one')
        other['current_companion']=copy.deepcopy(body['current_companion'])
        self.assertFalse(mixin_argument_assertion_ok(ROOT,active,other,'one'))
        other.pop('current_companion');other['comparison']='current-companion-contract'
        self.assertFalse(mixin_argument_assertion_ok(ROOT,active,other,'one'))
