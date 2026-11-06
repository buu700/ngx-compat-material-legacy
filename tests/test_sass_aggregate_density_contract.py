"""Complete aggregate comparison and fail-closed finite member composition."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_aggregate_density_admission import AGGREGATE_DENSITY_CASES,aggregate_density_results_match
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from stepper_repaired_snapshot import repaired_mixin_receipt as mixin_receipt, frozen_sources_stale

def rehash(body,css):
    body['actual'].update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
    wrong=css+'\n.wrong-nonempty-mixin { color: red; }\n'
    body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))

class AggregateDensityContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,mixin_receipt(ROOT,active,case,'density')

    def test_full_css_preserves_owned_prefix_and_all_original_values(self):
        for line in ['main','21.x']:
            for case in AGGREGATE_DENSITY_CASES:
                active,body=self.receipt(line,case)
                self.assertTrue(aggregate_density_results_match(body))
                self.assertTrue(frozen_sources_stale(ROOT,body['actual']['sources']))
                self.assertFalse(mixin_argument_assertion_ok(ROOT,active,body,'density'))
                original=body['actual']['css']
                changes=[original+'\n.extra { display: block; }',
                    original.replace('var(--mat-tree-node-min-height, 40px)','var(--mat-tree-node-min-height, 41px)'),
                    original.replace('.mat-tree-node {','.changed-tree-node {'),
                    original.replace('--mat-stepper-header-height: 64px','--mat-stepper-header-height: 65px'),
                    original.replace('--mat-standard-button-toggle-height: 40px','--mat-standard-button-toggle-height: 41px')]
                if '/all-component-densities/' in case:
                    changes.extend([original.replace('min-height: 48px','min-height: 49px'),original.replace('.mat-mdc-form-field-infix','.changed-form-field-infix')])
                for css in changes:
                    self.assertNotEqual(css,original)
                    wrong=copy.deepcopy(body);rehash(wrong,css)
                    self.assertFalse(aggregate_density_results_match(wrong))

    def test_missing_wrong_or_foreign_peer_member_and_scope_fail(self):
        for line in ['main','21.x']:
            for case in AGGREGATE_DENSITY_CASES:
                _,body=self.receipt(line,case)
                for family in ['expansion','stepper','toolbar','tree','button-toggle']:
                    wrong=copy.deepcopy(body);del wrong['current_companion']['peers'][family]
                    self.assertFalse(aggregate_density_results_match(wrong))
                    for key,value in [('line','foreign'),('program_sha256','0'*64),('peer_version','16.2.14'),('sources',[])]:
                        wrong=copy.deepcopy(body);wrong['current_companion']['peers'][family][key]=value
                        self.assertFalse(aggregate_density_results_match(wrong),family+' '+key)
                    wrong=copy.deepcopy(body);peer=wrong['current_companion']['peers'][family];peer['css']+='\n.other { color: red; }';peer['css_sha256']=hashlib.sha256(peer['css'].encode()).hexdigest();peer['css_bytes']=len(peer['css'].encode())
                    self.assertFalse(aggregate_density_results_match(wrong))
                for key,value in [('case_id','mixin-argument/all-component-themes/custom-full-theme'),('comparison','historical-exact'),('line','foreign')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(aggregate_density_results_match(wrong))
                wrong=copy.deepcopy(body);wrong['current_companion']['contract']='approved-exception';self.assertFalse(aggregate_density_results_match(wrong))
                wrong=copy.deepcopy(body);e=wrong['expected'];e['css']+='\n.extra { color: red; }';e['css_sha256']=hashlib.sha256(e['css'].encode()).hexdigest();e['css_bytes']=len(e['css'].encode());self.assertFalse(aggregate_density_results_match(wrong))

    def test_javascript_requires_whole_css_and_complete_qualified_members(self):
        code=r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {AGGREGATE_DENSITY_CASES,aggregateDensityExpectedCss,aggregateDensityResultsMatch} from './scripts/sass-aggregate-density-contract.mjs';
import {repairedStepperCss} from './tests/stepper-repaired-snapshot.mjs';
const f=JSON.parse(readFileSync('tests/sass_aggregate_density_fixture.json')),sha=s=>createHash('sha256').update(s).digest('hex');
const measure=css=>({css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)});
for(const line of ['main','21.x'])for(const id of Object.keys(AGGREGATE_DENSITY_CASES)){
 const original=measure(f.originals[id]),frozen=measure(f.candidate_inputs[id+'-'+line]),actual=measure(repairedStepperCss(frozen.css,line)),peers=f.peers[line];
 if(actual.css!==frozen.css)assert.equal(aggregateDensityResultsMatch(id,original,frozen,peers),false);
 assert.equal(aggregateDensityExpectedCss(id,original,peers),actual.css);assert.ok(aggregateDensityResultsMatch(id,original,actual,peers));
 for(const css of [actual.css+'\n.extra { color: red; }',actual.css.replace('40px','41px')])assert.equal(aggregateDensityResultsMatch(id,original,measure(css),peers),false);
 for(const family of Object.keys(peers)){const wrong=structuredClone(peers);delete wrong[family];assert.equal(aggregateDensityExpectedCss(id,original,wrong),null);}
 const wrong=structuredClone(peers);wrong.toolbar.line='foreign';assert.equal(aggregateDensityExpectedCss(id,original,wrong),null);
 assert.equal(aggregateDensityExpectedCss('mixin-argument/all-component-themes/custom-full-theme',original,peers),null);
 assert.equal(aggregateDensityExpectedCss(id,measure(original.css+'\n.extra { color: red; }'),peers),null);
}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
