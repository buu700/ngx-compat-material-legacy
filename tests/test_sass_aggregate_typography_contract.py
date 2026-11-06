"""Full original hierarchy/control preservation across both typography models."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_aggregate_typography_admission import AGGREGATE_TYPOGRAPHY_CASES,aggregate_typography_results_match
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from stepper_repaired_snapshot import repaired_mixin_receipt as mixin_receipt, frozen_sources_stale

def rehash(body,css):
    body['actual'].update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
    wrong=css+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))

class AggregateTypographyContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,mixin_receipt(ROOT,active,case,'typography')

    def test_complete_css_rejects_rehashed_hierarchy_control_fallback_and_peer_defects(self):
        for line in ['main','21.x']:
            for case,entry in AGGREGATE_TYPOGRAPHY_CASES.items():
                active,body=self.receipt(line,case);self.assertTrue(aggregate_typography_results_match(body));self.assertTrue(frozen_sources_stale(ROOT,body['actual']['sources']));self.assertFalse(mixin_argument_assertion_ok(ROOT,active,body,'typography'))
                css=body['actual']['css'];font='Legacy Family' if entry['profile']=='legacy' else 'Custom Family'
                changes=[css+'\n.extra { color: red; }',css.replace('margin: 0 0 16px','margin: 0 0 17px'),
                    css.replace('.mat-tree-node','.changed-tree-node'),css.replace('font-family: '+font,'font-family: Changed Family'),
                    css.replace('--mat-toolbar-title-text-size: 20px','--mat-toolbar-title-text-size: 21px'),
                    css.replace('--mat-badge-container-shape: 50%','--mat-badge-container-shape: 49%'),
                    css.replace('--mat-divider-width: 1px','--mat-divider-width: 2px'),
                    css.replace('--mat-grid-list-tile-header-secondary-text-size: 12px','--mat-grid-list-tile-header-secondary-text-size: 13px'),
                    css.replace('var(--mat-tree-node-text-size, '+('19' if entry['profile']=='legacy' else '14')+'px)','var(--mat-tree-node-text-size, 99px)')]
                owned='.mat-option' if entry['profile']=='legacy' else '--mat-option-label-text-font'
                changes.append(css.replace(owned,owned+'-changed'))
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed)
                    self.assertFalse(aggregate_typography_results_match(wrong))

    def test_wrong_profile_source_program_scope_and_original_are_rejected(self):
        fixture=json.loads((ROOT/'tests/sass_aggregate_typography_fixture.json').read_bytes())
        for line in ['main','21.x']:
            for case,entry in AGGREGATE_TYPOGRAPHY_CASES.items():
                _,body=self.receipt(line,case)
                for key,value in [('line','foreign'),('sources',[]),('program_sha256','0'*64),('peer_version','16.2.14')]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(aggregate_typography_results_match(wrong),key)
                for source in body['current_companion']['peer']['sources']:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources']=[s for s in wrong['current_companion']['peer']['sources'] if s['path']!=source['path']];self.assertFalse(aggregate_typography_results_match(wrong),source['path'])
                wrong=copy.deepcopy(body);other='2018' if entry['profile']=='legacy' else 'legacy';wrong['current_companion']['peer']=fixture['peers'][other+'-'+line];self.assertFalse(aggregate_typography_results_match(wrong))
                wrong=copy.deepcopy(body);peer=wrong['current_companion']['peer'];peer['css']+='\n.unrelated { color: red; }';peer['css_sha256']=hashlib.sha256(peer['css'].encode()).hexdigest();peer['css_bytes']=len(peer['css'].encode());self.assertFalse(aggregate_typography_results_match(wrong))
                for key,value in [('case_id','mixin-argument/all-component-themes/custom-full-theme'),('comparison','historical-exact'),('line','foreign')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(aggregate_typography_results_match(wrong))
                wrong=copy.deepcopy(body);wrong['current_companion']['classification']='approved-exception';self.assertFalse(aggregate_typography_results_match(wrong))
                wrong=copy.deepcopy(body);e=wrong['expected'];e['css']+='\n.other { color: red; }';e['css_sha256']=hashlib.sha256(e['css'].encode()).hexdigest();e['css_bytes']=len(e['css'].encode());self.assertFalse(aggregate_typography_results_match(wrong))

    def test_javascript_independently_composes_exact_whole_css(self):
        code=r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {AGGREGATE_TYPOGRAPHY_CASES,aggregateTypographyExpectedCss,aggregateTypographyResultsMatch} from './scripts/sass-aggregate-typography-contract.mjs';
import {repairedStepperCss} from './tests/stepper-repaired-snapshot.mjs';
const f=JSON.parse(readFileSync('tests/sass_aggregate_typography_fixture.json')),sha=s=>createHash('sha256').update(s).digest('hex'),measure=css=>({css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)});
for(const line of ['main','21.x'])for(const [id,entry] of Object.entries(AGGREGATE_TYPOGRAPHY_CASES)){
 const original=measure(f.originals[id]),frozen=measure(f.candidate_inputs[id+'-'+line]),actual=measure(repairedStepperCss(frozen.css,line)),peer=f.peers[entry.profile+'-'+line];
 if(actual.css!==frozen.css)assert.equal(aggregateTypographyResultsMatch(id,original,frozen,peer),false);
 assert.equal(aggregateTypographyExpectedCss(id,original,peer),actual.css);assert.ok(aggregateTypographyResultsMatch(id,original,actual,peer));
 for(const css of [actual.css+'\n.unrelated { color: red; }',actual.css.replace('margin: 0 0 16px','margin: 0 0 17px')])assert.equal(aggregateTypographyResultsMatch(id,original,measure(css),peer),false);
 const wrong=structuredClone(peer);wrong.sources=[];assert.equal(aggregateTypographyExpectedCss(id,original,wrong),null);
 const other=f.peers[(entry.profile==='legacy'?'2018':'legacy')+'-'+line];assert.equal(aggregateTypographyExpectedCss(id,original,other),null);
 assert.equal(aggregateTypographyExpectedCss('mixin-argument/all-component-themes/custom-full-theme',original,peer),null);
 assert.equal(aggregateTypographyExpectedCss(id,measure(original.css+'\n.other { color: red; }'),peer),null);
}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
