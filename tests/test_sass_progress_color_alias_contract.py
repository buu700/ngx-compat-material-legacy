"""Color alias conformance cannot alter historical motion, SVG, values or scope."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_progress_color_alias_admission import PROGRESS_COLOR_ALIAS_CASES
from sass_mixin_fixture import mixin_receipt
def active(line):
    return SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
def change_css(row,value):
    row.update(css=value,css_sha256=hashlib.sha256(value.encode()).hexdigest(),css_bytes=len(value.encode()))

class ProgressColorAliasAdmission(unittest.TestCase):
    def test_four_cases_on_each_line_and_owned_css_negatives(self):
        for line in ['main','21.x']:
            run=active(line)
            for case in PROGRESS_COLOR_ALIAS_CASES:
                body=mixin_receipt(ROOT,run,case,'one');self.assertTrue(mixin_argument_assertion_ok(ROOT,run,body,'one'),(line,case))
                css=body['actual']['css']
                edits=[body['expected']['css'],css+'\n.unrelated { color: red; }',css.replace('.mat-mdc-progress-bar','.renamed'),css.replace('@keyframes mdc-linear-progress-buffering','@keyframes renamed'),css.replace('--mdc-linear-progress-track-color','--wrong-track-color'),css.replace('rgba(48, 63, 159, 0.25)','rgba(48, 63, 159, 0.5)'),css.replace('data:image/svg+xml','removed:image/svg+xml'),css.replace('--mat-progress-bar-active-indicator-color','--wrong-active-color')]
                for edit in edits:
                    wrong=copy.deepcopy(body);change_css(wrong['actual'],edit);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),case)
                wrong=copy.deepcopy(body);change_css(wrong['expected'],css);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
                wrong=copy.deepcopy(body);wrong.pop('current_peer_alias');self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))

    def test_peer_identity_and_other_case_scope(self):
        run=active('main');body=mixin_receipt(ROOT,run,next(iter(PROGRESS_COLOR_ALIAS_CASES)),'one')
        for key,value in [('line','21.x'),('peer_version','22.2.0'),('program','@use candidate;'),('program_sha256','f'*64),('peer_package_json_sha256','f'*64),('sources',[])]:
            wrong=copy.deepcopy(body);wrong['current_peer_alias']['peer'][key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        for key,value in [('root',2),('path','../candidate.scss'),('sha256','f'*64),('bytes',1)]:
            wrong=copy.deepcopy(body);wrong['current_peer_alias']['peer']['sources'][0][key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        wrong=copy.deepcopy(body);peer=wrong['current_peer_alias']['peer'];change_css(peer,peer['css'].replace('#303f9f','red'));self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
        for case in ['mixin-argument/legacy-progress-bar-color/custom-full-theme','mixin-argument/badge-color/custom-full-theme','mixin-argument/all-component-themes/custom-full-theme']:
            other=mixin_receipt(ROOT,run,case,'one');other['current_peer_alias']=copy.deepcopy(body['current_peer_alias']);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,other,'one'),case)
        wrong=copy.deepcopy(body);wrong['current_companion']=copy.deepcopy(body['current_peer_alias']);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))

    def test_javascript_complete_css_and_mutation_scope(self):
        rows=[mixin_receipt(ROOT,active(line),case,'one') for line in ['main','21.x'] for case in PROGRESS_COLOR_ALIAS_CASES]
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {progressColorAliasResultsMatch} from './scripts/sass-progress-color-alias-contract.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
for(const row of JSON.parse(readFileSync(0,'utf8'))){
 const peer=row.current_peer_alias.peer;const match=(o=row.expected,a=row.actual,p=peer,id=row.case_id)=>progressColorAliasResultsMatch(id,o,a,p);
 assert.equal(match(),true);assert.equal(match(row.expected,row.expected),false);assert.equal(match(row.expected,row.mutation),false);
 assert.equal(match(row.expected,row.actual,peer,'mixin-argument/legacy-progress-bar-color/custom-full-theme'),false);
 for(const key of ['line','peer_version','peer_package_json_sha256','program','program_sha256','css_sha256'])assert.equal(match(row.expected,row.actual,{...peer,[key]:'wrong'}),false,key);
 const css=row.actual.css.replace('@keyframes mdc-linear-progress-buffering','@keyframes renamed');assert.equal(match(row.expected,{...row.actual,css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)}),false);
 for(const change of [{root:2},{path:'../candidate.scss'},{sha256:'f'.repeat(64)},{bytes:1}]){const p=structuredClone(peer);Object.assign(p.sources[0],change);assert.equal(match(row.expected,row.actual,p),false);}
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,input=json.dumps(rows),text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
