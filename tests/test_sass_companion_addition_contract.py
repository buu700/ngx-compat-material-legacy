"""Complete original CSS plus exact independently measured peer-only addition."""
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
from sass_companion_addition_admission import COMPANION_ADDITION_CASES
from stepper_repaired_snapshot import repaired_mixin_receipt as mixin_receipt

def active(line):
    return SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})

def css_replace(result,css):
    result.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))

class CompanionAdditionAdmission(unittest.TestCase):
    def test_all62_both_lines_and_rehashed_css_mutations(self):
        for line in ['main','21.x']:
            run=active(line)
            for case in COMPANION_ADDITION_CASES:
                body=mixin_receipt(ROOT,run,case,'one')
                self.assertTrue(mixin_argument_assertion_ok(ROOT,run,body,'one'),(line,case))
                css=body['actual']['css'];edits=[css+'\n.unrelated { color: red; }',css.replace('.sass-argument-probe','.renamed'),css.replace('--mat-','--different-')]
                declarations=css.splitlines();positions=[i for i,s in enumerate(declarations) if s.startswith('  --mat-')]
                if len(positions)>1:
                    a,b=positions[:2];declarations[a],declarations[b]=declarations[b],declarations[a];edits.append('\n'.join(declarations))
                if body['expected']['css']:edits.append(body['current_companion']['peer']['css'])
                for edit in edits:
                    wrong=copy.deepcopy(body);css_replace(wrong['actual'],edit)
                    self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),(line,case))
                wrong=copy.deepcopy(body);css_replace(wrong['expected'],body['expected']['css']+'\n.unrelated { color: red; }')
                self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
                wrong=copy.deepcopy(body);wrong.pop('current_companion')
                self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))

    def test_peer_identity_and_scope(self):
        run=active('main');body=mixin_receipt(ROOT,run,next(iter(COMPANION_ADDITION_CASES)),'one')
        for key,value in [('line','21.x'),('peer_version','22.2.0'),('peer_package_json_sha256','f'*64),('program','@use candidate;'),('program_sha256','f'*64),('sources',[])]:
            wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value
            self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        for key,value in [('root',2),('path','../candidate.scss'),('sha256','f'*64),('bytes',1)]:
            wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0][key]=value
            self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'),key)
        wrong=copy.deepcopy(body);peer=wrong['current_companion']['peer'];css_replace(peer,peer['css'].replace('4px','8px'))
        self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))
        for case in ['mixin-argument/badge-theme/custom-full-theme','mixin-argument/datepicker-density/custom-full-theme','mixin-argument/all-legacy-component-themes/custom-full-theme']:
            wrong=mixin_receipt(ROOT,run,case,'one');wrong['current_companion']=copy.deepcopy(body['current_companion']);wrong['comparison']='current-companion-contract'
            self.assertFalse(mixin_argument_assertion_ok(ROOT,run,wrong,'one'))

    def test_javascript_composition_and_negatives(self):
        records=[mixin_receipt(ROOT,active(line),case,'one') for line in ['main','21.x'] for case in COMPANION_ADDITION_CASES]
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {companionAdditionResultsMatch} from './scripts/sass-companion-addition-contract.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
for(const row of JSON.parse(readFileSync(0,'utf8'))){
 const peer=row.current_companion.peer;const match=(original=row.expected,actual=row.actual,p=peer,id=row.case_id)=>companionAdditionResultsMatch(id,original,actual,p);
 assert.equal(match(),true);assert.equal(match(row.expected,row.mutation),false);
 assert.equal(match(row.expected,row.actual,peer,'mixin-argument/all-component-themes/custom-full-theme'),false);
 for(const key of ['peer_version','peer_package_json_sha256','program','program_sha256','css_sha256'])assert.equal(match(row.expected,row.actual,{...peer,[key]:'wrong'}),false,key);
 const css=peer.css+'\n.unrelated { color: red; }';assert.equal(match(row.expected,row.actual,{...peer,css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)}),false);
 for(const change of [{root:2},{path:'../candidate.scss'},{sha256:'f'.repeat(64)},{bytes:1}]){const p=structuredClone(peer);Object.assign(p.sources[0],change);assert.equal(match(row.expected,row.actual,p),false);}
}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,input=json.dumps(records),capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
