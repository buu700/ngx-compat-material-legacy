"""Reject historical, accessibility, motion and provenance defects in aggregates."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_aggregate_color_theme_admission import AGGREGATE_COLOR_THEME_CASES,aggregate_color_theme_results_match
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from stepper_repaired_snapshot import repaired_mixin_receipt as mixin_receipt, frozen_sources_stale

def rehash(body,css):
    body['actual'].update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
    wrong=css+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))

class AggregateColorThemeContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,mixin_receipt(ROOT,active,case,'color-theme')

    def test_whole_css_rejects_rehashed_owned_motion_accessibility_and_fallback_defects(self):
        for line in ['main','21.x']:
            for case,entry in AGGREGATE_COLOR_THEME_CASES.items():
                active,body=self.receipt(line,case);self.assertTrue(aggregate_color_theme_results_match(body));self.assertTrue(frozen_sources_stale(ROOT,body['actual']['sources']));self.assertFalse(mixin_argument_assertion_ok(ROOT,active,body,'color-theme'))
                css=body['actual']['css'];legacy=entry['profile']=='legacy';theme='-themes/' in case
                replacements=[('.mat-card' if legacy else '.mat-mdc-card','.changed-card'),
                    ('.mat-button' if legacy else '.mat-mdc-button','.changed-button'),
                    ('.cdk-high-contrast-active .sass-argument-probe .mat-badge-content','.missing-historical-class'),
                    ('forced-colors: active','forced-colors: none'),
                    ('outline: solid 1px','outline: solid 2px'),
                    ('var(--mat-badge-container-shape, 50%)','var(--mat-badge-container-shape, 49%)'),
                    ('var(--mat-badge-legacy-small-size-container-size, 16px)','var(--mat-badge-legacy-small-size-container-size, 17px)'),
                    ('var(--mat-badge-legacy-container-size, 22px)','var(--mat-badge-legacy-container-size, 23px)'),
                    ('var(--mat-badge-legacy-large-size-container-size, 28px)','var(--mat-badge-legacy-large-size-container-size, 29px)'),
                    ('transition: transform 200ms ease-in-out','transition: transform 0ms ease-in-out'),
                    ('var(--mat-sort-arrow-color,','var(--wrong-sort-arrow-color,'),
                    ('var(--mat-tree-node-text-color,','var(--wrong-tree-node-text-color,'),
                    ('--mat-toolbar-container-background-color','--wrong-toolbar-background-color'),
                    ('.mat-icon.mat-primary','.changed-icon.mat-primary')]
                if not legacy:replacements.extend([('@keyframes mdc-linear-progress-buffering','@keyframes changed-progress-buffering'),('data:image/svg+xml','data:image/changed-svg'),('--mat-progress-bar-active-indicator-color','--wrong-progress-active-color')])
                if theme:replacements.extend([('var(--mat-icon-button-touch-target-display, none)','var(--mat-icon-button-touch-target-display, block)'),('var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size))','var(--mat-icon-button-state-layer-size, 99px)'),('var(--mat-tree-node-min-height, 40px)','var(--mat-tree-node-min-height, 99px)'),('font-family: '+('Legacy Family' if legacy else 'Custom Family'),'font-family: Changed Family'),('padding: 8px','padding: 9px')])
                changes=[css+'\n.extra { color: red; }']
                if not legacy:
                    import re
                    for token in ['state-layer-color','hover-state-layer-opacity','focus-state-layer-opacity']:
                        changes.append(re.sub(r'(--mat-form-field-'+token+r':) [^;]+;',r'\1 initial;',css))
                    block=re.search(r'(?m)^\.sass-argument-probe \{\n  --mat-form-field-state-layer-color:[^{}]+\n\}',css);self.assertIsNotNone(block)
                    changes.extend([css[:block.start()]+css[block.end():],css[:block.start()]+css[block.end():]+'\n'+block[0]])
                else:self.assertNotIn('--mat-form-field-hover-state-layer-opacity:',css)
                for old,new in replacements:
                    self.assertIn(old,css,(case,old));changes.append(css.replace(old,new,1))
                for changed in changes:
                    self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed)
                    self.assertFalse(aggregate_color_theme_results_match(wrong))

    def test_wrong_profile_line_sources_program_scope_and_original_are_rejected(self):
        fixture=json.loads((ROOT/'tests/sass_aggregate_color_theme_fixture.json').read_bytes())
        for line in ['main','21.x']:
            for case,entry in AGGREGATE_COLOR_THEME_CASES.items():
                _,body=self.receipt(line,case)
                for key,value in [('line','foreign'),('sources',[]),('program_sha256','0'*64),('peer_version','16.2.14')]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer'][key]=value;self.assertFalse(aggregate_color_theme_results_match(wrong),key)
                peer=body['current_companion']['peer']
                for source in [s for s in peer['sources'] if s['root']==1 or s['path'] in ['_index.scss','badge/_badge-theme.scss','progress-bar/_progress-bar-theme.scss','button/_icon-button-theme.scss','core/theming/_palette.scss']]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'].remove(source);self.assertFalse(aggregate_color_theme_results_match(wrong),source['path'])
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'][0]['sha256']='0'*64;self.assertFalse(aggregate_color_theme_results_match(wrong))
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']['sources'].append(dict(root=1,path='unrelated.scss',sha256='0'*64,bytes=1));self.assertFalse(aggregate_color_theme_results_match(wrong))
                other=next(k for k in fixture['peers'] if k.endswith('-'+line) and k!=entry['peer_profile']+'-'+line)
                wrong=copy.deepcopy(body);wrong['current_companion']['peer']=fixture['peers'][other];self.assertFalse(aggregate_color_theme_results_match(wrong))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peer'];p['css']+='\n.unrelated { color: red; }';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(aggregate_color_theme_results_match(wrong))
                for key,value in [('case_id','mixin-argument/all-component-typographies/custom-full-theme'),('comparison','historical-exact'),('line','foreign')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(aggregate_color_theme_results_match(wrong))
                wrong=copy.deepcopy(body);wrong['current_companion']['classification']='approved-exception';self.assertFalse(aggregate_color_theme_results_match(wrong))
                wrong=copy.deepcopy(body);e=wrong['expected'];e['css']+='\n.other { color: red; }';e['css_sha256']=hashlib.sha256(e['css'].encode()).hexdigest();e['css_bytes']=len(e['css'].encode());self.assertFalse(aggregate_color_theme_results_match(wrong))
                wrong=copy.deepcopy(body);wrong['current_peer_alias']={'classification':'conforming-current-infrastructure'};self.assertFalse(mixin_argument_assertion_ok(ROOT,self.receipt(line,case)[0],wrong,'color-theme'))

    def test_javascript_independently_composes_and_rejects_complete_css_defects(self):
        code=r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {AGGREGATE_COLOR_THEME_CASES,aggregateColorThemeExpectedCss,aggregateColorThemeResultsMatch,aggregateColorThemePeerProgram} from './scripts/sass-aggregate-color-theme-contract.mjs';
import {remeasureStepper} from './tests/stepper-repaired-snapshot.mjs';
const f=JSON.parse(readFileSync('tests/sass_aggregate_color_theme_fixture.json')),sha=s=>createHash('sha256').update(s).digest('hex'),measure=css=>({css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)});
for(const line of ['main','21.x'])for(const [id,entry] of Object.entries(AGGREGATE_COLOR_THEME_CASES)){
 const original=measure(f.originals[id]),stored=f.measurements[id+'-'+line],source=JSON.parse(readFileSync('tests/'+f.source_fixture)),frozen={...stored,sources:source.source_sets[stored.source_set]},actual=remeasureStepper(frozen,line),peer=f.peers[entry.peer_profile+'-'+line];
 if(actual.css!==frozen.css)assert.equal(aggregateColorThemeResultsMatch(id,original,frozen,peer),false);
 assert.equal(aggregateColorThemePeerProgram(id),peer.program);assert.equal(aggregateColorThemeExpectedCss(id,original,peer),actual.css);assert.ok(aggregateColorThemeResultsMatch(id,original,actual,peer));
 const changes=[actual.css+'\n.unrelated { color: red; }',actual.css.replace('.cdk-high-contrast-active .sass-argument-probe .mat-badge-content','.missing-historical-class'),actual.css.replace('transition: transform 200ms','transition: transform 0ms'),actual.css.replace('var(--mat-badge-container-shape, 50%)','var(--mat-badge-container-shape, 49%)')];
 if(id.includes('-themes/'))changes.push(actual.css.replace('var(--mat-icon-button-touch-target-display, none)','var(--mat-icon-button-touch-target-display, block)'));
 if(entry.profile==='2018')changes.push(actual.css.replace('@keyframes mdc-linear-progress-buffering','@keyframes wrong-buffering'),actual.css.replace('data:image/svg+xml','data:image/wrong-svg'));
 for(const css of changes){assert.notEqual(css,actual.css);assert.equal(aggregateColorThemeResultsMatch(id,original,{...actual,...measure(css)},peer),false);}
 for(const source of peer.sources.filter(s=>s.root===1||s.path==='badge/_badge-theme.scss')){const wrong=structuredClone(peer);wrong.sources=wrong.sources.filter(s=>s.root!==source.root||s.path!==source.path);assert.equal(aggregateColorThemeExpectedCss(id,original,wrong),null);}
 const wrong=structuredClone(peer);wrong.sources[0].sha256='0'.repeat(64);assert.equal(aggregateColorThemeExpectedCss(id,original,wrong),null);
 const key=Object.keys(f.peers).find(k=>k.endsWith('-'+line)&&k!==entry.peer_profile+'-'+line);assert.equal(aggregateColorThemeExpectedCss(id,original,f.peers[key]),null);
 assert.equal(aggregateColorThemeExpectedCss('mixin-argument/all-component-typographies/custom-full-theme',original,peer),null);
 assert.equal(aggregateColorThemeExpectedCss(id,measure(original.css+'\n.other { color: red; }'),peer),null);
}
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
