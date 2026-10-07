"""Badge shape conformance preserves historical accessibility and motion bytes."""
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
from sass_badge_shape_admission import BADGE_SHAPE_CASES
from sass_mixin_fixture import mixin_receipt
def active(line):return SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
def css_replace(row,css):row.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))

class BadgeShapeAdmission(unittest.TestCase):
    def test_both_themes_and_lines_and_rehashed_owned_mutations(self):
        for line in ['main','21.x']:
            run=active(line)
            for case in BADGE_SHAPE_CASES:
                body=mixin_receipt(ROOT,run,case,'one');self.assertTrue(mixin_argument_assertion_ok(ROOT,run,body,'one'),(line,case))
                css=body['actual']['css'];edits=[body['expected']['css'],css+'\n.unrelated { color: red; }',css.replace('.cdk-high-contrast-active','.renamed'),css.replace('(forced-colors: active)','(forced-colors: none)'),css.replace('transform 200ms','transform 300ms'),css.replace('scale(0.6)','scale(0.4)'),css.replace('16px','18px'),css.replace('--mat-badge-legacy-container-size','--different-size'),css.replace('Custom Family','Wrong Family')]
                for edit in edits:
                    self.assertNotEqual(edit,css)
                    wrong=copy.deepcopy(body);css_replace(wrong['actual'],edit);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),case)
                wrong=copy.deepcopy(body);css_replace(wrong['expected'],css);self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
                wrong=copy.deepcopy(body);wrong.pop('current_companion');self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))

    def test_independent_peer_and_cdk_identity_and_finite_scope(self):
        run=active('main');body=mixin_receipt(ROOT,run,next(iter(BADGE_SHAPE_CASES)),'one')
        for key,value in [('line','21.x'),('peer_version','22.2.0'),('peer_package_json_sha256','f'*64),('program','@use candidate;'),('program_sha256','f'*64),('sources',[])]:
            wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        for index in [0,2]:
            for key,value in [('root',2),('path','../candidate.scss'),('sha256','f'*64),('bytes',1)]:
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][index][key]=value;self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];css_replace(p,p['css'].replace('border-radius: 0','border-radius: 1px'));self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
        for case in ['mixin-argument/badge-color/custom-full-theme','mixin-argument/datepicker-theme/custom-full-theme','mixin-argument/all-component-themes/custom-full-theme']:
            wrong=mixin_receipt(ROOT,run,case,'one');wrong['current_companion']=copy.deepcopy(body['current_companion']);wrong['comparison']='current-companion-contract';self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),case)

    def test_javascript_whole_css_and_scope_negatives(self):
        rows=[mixin_receipt(ROOT,active(line),case,'one') for line in ['main','21.x'] for case in BADGE_SHAPE_CASES]
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {badgeShapeResultsMatch} from './scripts/sass-badge-shape-contract.mjs';const sha=s=>createHash('sha256').update(s).digest('hex');
for(const row of JSON.parse(readFileSync(0,'utf8'))){
 const peer=row.current_companion.peer;const match=(o=row.expected,a=row.actual,p=peer,id=row.case_id)=>badgeShapeResultsMatch(id,o,a,p);
 assert.equal(match(),true);assert.equal(match(row.expected,row.expected),false);assert.equal(match(row.expected,row.mutation),false);
 assert.equal(match(row.expected,row.actual,peer,'mixin-argument/all-component-themes/custom-full-theme'),false);
 const css=row.actual.css.replace('transform 200ms','transform 300ms');assert.equal(match(row.expected,{...row.actual,css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)}),false);
 for(const key of ['peer_version','peer_package_json_sha256','program','program_sha256','css_sha256'])assert.equal(match(row.expected,row.actual,{...peer,[key]:'wrong'}),false,key);
 const p=structuredClone(peer);p.sources=p.sources.filter(s=>s.root!==1);assert.equal(match(row.expected,row.actual,p),false,'CDK source proof missing');
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,input=json.dumps(rows),text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
