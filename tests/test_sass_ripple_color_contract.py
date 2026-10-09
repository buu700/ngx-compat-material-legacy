"""Finite insertion parity and corrupt CSS/original/peer/source evidence must fail."""
from pathlib import Path
import copy,hashlib,json,subprocess,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from sass_ripple_color_admission import RIPPLE_COLOR_BINDING_CASES,RIPPLE_COLOR_CONTROL_CASES,ripple_color_expected_css,ripple_color_results_match,insert_ripple_color_in_expected_model
CATALOG=json.loads((ROOT/'fixtures/sass/ripple-color-contracts.json').read_bytes())
sha=lambda text:hashlib.sha256(text.encode()).hexdigest()
class RippleColorContractTests(unittest.TestCase):
    def test_all39_both_lines_python_and_javascript_and_mutants(self):
        outputs={};mutants=0
        self.assertEqual(len(RIPPLE_COLOR_BINDING_CASES),39)
        self.assertEqual(len(RIPPLE_COLOR_CONTROL_CASES),3)
        for case,e in RIPPLE_COLOR_BINDING_CASES.items():
            original=dict(e['original'],sources=CATALOG['original_source_sets'][e['original']['source_set']])
            for line in ('main','21.x'):
                peer=copy.deepcopy(e['peers'][line]);peer['sources']=CATALOG['peer_source_sets'][peer['source_set']]
                expected=ripple_color_expected_css(case,original,peer)
                self.assertIsNotNone(expected,case)
                actual=dict(css=expected,css_sha256=sha(expected),css_bytes=len(expected.encode()))
                self.assertTrue(ripple_color_results_match(case,original,actual,peer),case)
                self.assertEqual(insert_ripple_color_in_expected_model(case,original['css'],peer,aggregate=True),expected)
                self.assertIsNone(insert_ripple_color_in_expected_model(case,expected,peer))
                outputs[case+'|'+line]=sha(expected)
                for css in [expected+'\n.unrelated {color:red}',expected.replace('--mat-ripple-color:','--unrelated-color:',1),expected.replace(e['slots'][0]['token'],'red',1),original['css']]:
                    bad=dict(css=css,css_sha256=sha(css),css_bytes=len(css.encode()))
                    self.assertFalse(ripple_color_results_match(case,original,bad,peer),case);mutants+=1
                for change in [lambda p:p.update(line='wrong'),lambda p:p.update(peer_version='99.0.0'),lambda p:p.update(peer_package_json_sha256='0'*64),lambda p:p.update(css_sha256='0'*64),lambda p:p.update(program_sha256='0'*64),lambda p:p['sources'][0].update(sha256='0'*64)]:
                    bad=copy.deepcopy(peer);change(bad)
                    self.assertIsNone(ripple_color_expected_css(case,original,bad),case);mutants+=1
                bad=copy.deepcopy(original);bad['css']+='\n.unrelated {color:red}';bad['css_sha256']=sha(bad['css']);bad['css_bytes']=len(bad['css'].encode())
                self.assertIsNone(ripple_color_expected_css(case,bad,peer));mutants+=1
                self.assertIsNone(insert_ripple_color_in_expected_model(case,original['css'].replace(e['slots'][0]['anchor'],'',1),peer));mutants+=1
                self.assertIsNone(insert_ripple_color_in_expected_model(case,original['css']+'\n'+e['slots'][0]['anchor'],peer));mutants+=1
        self.assertEqual(mutants,1014)
        script=r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {RIPPLE_COLOR_BINDING_CASES,RIPPLE_COLOR_CONTROL_CASES,rippleColorExpectedCss,rippleColorResultsMatch,insertRippleColorInExpectedModel} from './scripts/sass-ripple-color-contract.mjs';
const catalog=JSON.parse(readFileSync('fixtures/sass/ripple-color-contracts.json')),outputs={},sha=s=>createHash('sha256').update(s).digest('hex');let mutants=0;
for(const [id,e] of Object.entries(RIPPLE_COLOR_BINDING_CASES))for(const line of ['main','21.x']){
 const original={...e.original,sources:catalog.original_source_sets[e.original.source_set]},peer={...e.peers[line],sources:catalog.peer_source_sets[e.peers[line].source_set]};
 const expected=rippleColorExpectedCss(id,original,peer);assert.notEqual(expected,null,id);
 const actual={css:expected,css_sha256:sha(expected),css_bytes:Buffer.byteLength(expected)};assert.equal(rippleColorResultsMatch(id,original,actual,peer),true);
 assert.equal(insertRippleColorInExpectedModel(id,original.css,peer,{aggregate:true}),expected);assert.equal(insertRippleColorInExpectedModel(id,expected,peer),null);outputs[id+'|'+line]=sha(expected);
 for(const css of [expected+'\n.unrelated {color:red}',expected.replace('--mat-ripple-color:','--unrelated-color:'),expected.replace(e.slots[0].token,'red'),original.css]){assert.equal(rippleColorResultsMatch(id,original,{css,css_sha256:sha(css),css_bytes:Buffer.byteLength(css)},peer),false);mutants++;}
 for(const change of [p=>p.line='wrong',p=>p.peer_version='99.0.0',p=>p.peer_package_json_sha256='0'.repeat(64),p=>p.css_sha256='0'.repeat(64),p=>p.program_sha256='0'.repeat(64),p=>p.sources[0].sha256='0'.repeat(64)]){const bad=structuredClone(peer);change(bad);assert.equal(rippleColorExpectedCss(id,original,bad),null);mutants++;}
 const bad=structuredClone(original);bad.css+='\n.unrelated {color:red}';bad.css_sha256=sha(bad.css);bad.css_bytes=Buffer.byteLength(bad.css);assert.equal(rippleColorExpectedCss(id,bad,peer),null);mutants++;
 assert.equal(insertRippleColorInExpectedModel(id,original.css.replace(e.slots[0].anchor,''),peer),null);mutants++;
 assert.equal(insertRippleColorInExpectedModel(id,original.css+'\n'+e.slots[0].anchor,peer),null);mutants++;
}
assert.equal(mutants,1014);assert.equal(Object.keys(RIPPLE_COLOR_CONTROL_CASES).length,3);
for(const id of ['unknown',...Object.keys(RIPPLE_COLOR_CONTROL_CASES)])assert.equal(rippleColorExpectedCss(id,{},{}),null);
console.log(JSON.stringify(outputs));
"""
        run=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(run.returncode,0,run.stderr[-6000:]);self.assertEqual(json.loads(run.stdout),outputs)

    def test_exact_owned_source_caps_and_malformed_measurement_are_rejected(self):
        script=r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {rippleColorMeasurementOkay} from './scripts/sass-ripple-color-contract.mjs';
const c=JSON.parse(readFileSync('fixtures/sass/ripple-color-contracts.json')),id='mixin-css/ripple-color',e=c.cases[id],sha=s=>createHash('sha256').update(s).digest('hex');
const paths=['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss'];
const sources=paths.map(path=>{const b=readFileSync('projects/ngx-material-legacy/'+path);return {root:0,path,sha256:sha(b),bytes:b.length};});
const good={line:'main',program_sha256:e.program_sha256,css:'synthetic validator-only CSS',css_sha256:sha('synthetic validator-only CSS'),css_bytes:28,sass_version:c.sass_version,sources};
good.css_bytes=Buffer.byteLength(good.css);assert.equal(rippleColorMeasurementOkay(id,good,'main'),true);
let rejected=0;
for(const change of [m=>m.line='wrong',m=>m.program_sha256='0'.repeat(64),m=>m.css_sha256='0'.repeat(64),m=>m.css_bytes++,m=>m.sass_version='unknown',m=>m.sources.pop(),m=>m.sources.push({...m.sources[0]}),m=>m.sources[0].sha256='0'.repeat(64),m=>m.sources[0].bytes++,m=>m.sources[0].root=1,m=>m.sources[0].root=true,m=>m.sources[0].path='../escape']){
 const bad=structuredClone(good);change(bad);assert.equal(rippleColorMeasurementOkay(id,bad,'main'),false);rejected++;
}
assert.equal(rejected,12);console.log(JSON.stringify(good));
"""
        run=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(run.returncode,0,run.stderr[-5000:])
        from sass_ripple_color_admission import ripple_color_measurement_ok
        good=json.loads(run.stdout);self.assertTrue(ripple_color_measurement_ok('mixin-css/ripple-color',good,'main'))
        for change in [lambda x:x.update(line='wrong'),lambda x:x['sources'][0].update(sha256='0'*64),lambda x:x['sources'].pop(),lambda x:x['sources'][0].update(root=True)]:
            bad=copy.deepcopy(good);change(bad);self.assertFalse(ripple_color_measurement_ok('mixin-css/ripple-color',bad,'main'))
