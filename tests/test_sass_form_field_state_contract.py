"""Whole historical CSS, precise insertion, minimum peers and artifact envelope stay mandatory."""
import copy
import hashlib
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sass_form_field_state_admission import FORM_FIELD_STATE_DEFAULT_CASES, FORM_FIELD_STATE_ARGUMENT_CASES, form_field_state_default_envelope_ok
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_form_field_state_fixture import form_field_state_receipt


def rehash(body, css):
    m = body['actual_measurement'] if body['case_id'] in FORM_FIELD_STATE_DEFAULT_CASES else body['actual']
    m.update(css=css, css_sha256=hashlib.sha256(css.encode()).hexdigest(), css_bytes=len(css.encode()))
    if 'actual_measurement' in body:
        body.update(actual_sha256=m['css_sha256'], actual_bytes=m['css_bytes'])
    else:
        wrong = css + '\n.wrong-nonempty-mixin { color: red; }\n'
        body['mutation'] = dict(css=wrong, css_sha256=hashlib.sha256(wrong.encode()).hexdigest(), css_bytes=len(wrong.encode()))


class FormFieldStateContractTests(unittest.TestCase):
    def receipt(self, line, case):
        active = SimpleNamespace(binding={'source_line': line}, manifest={'run_id': 'synthetic', 'artifacts': [dict(id='library', sha256='c' * 64)]})
        return active, form_field_state_receipt(active, case, 'form-field-state')

    def admitted(self, active, body):
        if body['case_id'] in FORM_FIELD_STATE_DEFAULT_CASES:
            return form_field_state_default_envelope_ok(active, body, 'form-field-state')
        return mixin_argument_assertion_ok(ROOT, active, body, 'form-field-state')

    def test_whole_original_css_and_all_three_variables_remain_exact(self):
        import re
        for line in ['main', '21.x']:
            for case, e in {**FORM_FIELD_STATE_DEFAULT_CASES, **FORM_FIELD_STATE_ARGUMENT_CASES}.items():
                active, body = self.receipt(line, case)
                self.assertTrue(self.admitted(active, body), case)
                css = (body.get('actual_measurement') or body['actual'])['css']
                changed = [e['original']['css'], css + '\n.unrelated { color: red; }',
                           css.replace('.mat-mdc-form-field:hover', '.mat-mdc-text-field-wrapper:hover', 1),
                           css.replace(e['scope'], '.foreign-scope', 1),
                           css.replace('--mdc-filled-text-field-caret-color:', '--foreign-token:', 1)]
                for token in ['state-layer-color', 'hover-state-layer-opacity', 'focus-state-layer-opacity']:
                    changed.append(re.sub(r'(--mat-form-field-' + token + r':) [^;]+;', r'\1 initial;', css))
                if e['dimension'] == 'theme':
                    # Leave every token intact but alter historical layout after the insertion.
                    changed.append(css.replace('min-height:', 'max-height:', 1))
                    changed.append(css.replace(e['peers'][line]['css'], '', 1) + '\n' + e['peers'][line]['css'])
                for value in changed:
                    self.assertNotEqual(value, css)
                    wrong = copy.deepcopy(body)
                    rehash(wrong, value)
                    self.assertFalse(self.admitted(active, wrong), case)

    def test_floor_program_sources_run_library_and_contract_cannot_be_forged(self):
        for line in ['main', '21.x']:
            for case in {**FORM_FIELD_STATE_DEFAULT_CASES, **FORM_FIELD_STATE_ARGUMENT_CASES}:
                active, body = self.receipt(line, case)
                for key, value in [('line', 'foreign'), ('run_id', 'foreign'), ('invocation_id', 'foreign'),
                                   ('binding', {}), ('tarball_sha256', '0' * 64), ('exit_code', 1), ('result', 'fail')]:
                    wrong = copy.deepcopy(body)
                    wrong[key] = value
                    self.assertFalse(self.admitted(active, wrong), key)
                for key, value in [('peer_version', '16.2.14'), ('program_sha256', '0' * 64), ('css_sha256', '0' * 64), ('sources', [])]:
                    wrong = copy.deepcopy(body)
                    wrong['current_companion']['peer'][key] = value
                    self.assertFalse(self.admitted(active, wrong), key)
                wrong = copy.deepcopy(body)
                wrong['current_companion']['peer']['sources'][0]['sha256'] = '0' * 64
                self.assertFalse(self.admitted(active, wrong))
                for value in ['historical-default-css-with-public-companion-addition', 'unknown']:
                    wrong = copy.deepcopy(body)
                    wrong['current_companion']['contract'] = value
                    self.assertFalse(self.admitted(active, wrong))
                wrong = copy.deepcopy(body)
                del wrong['current_companion']
                self.assertFalse(self.admitted(active, wrong))
                wrong = copy.deepcopy(body)
                m = wrong.get('actual_measurement') or wrong['actual']
                m['program_sha256'] = '0' * 64
                self.assertFalse(self.admitted(active, wrong))
                if case in FORM_FIELD_STATE_DEFAULT_CASES:
                    wrong = copy.deepcopy(body)
                    wrong['actual_measurement']['sources'] = [s for s in wrong['actual_measurement']['sources'] if s['path'] != 'styles/bridges/_form-field-state-overrides.scss']
                    self.assertFalse(self.admitted(active, wrong))

    def test_actual_coordinator_dispatches_only_the_finite_original_cases(self):
        spec = importlib.util.spec_from_file_location('form_field_coordinator', ROOT / 'scripts/rc-verify.py')
        verifier = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(verifier)
        for line in ['main', '21.x']:
            for case in {**FORM_FIELD_STATE_DEFAULT_CASES, **FORM_FIELD_STATE_ARGUMENT_CASES}:
                active, body = self.receipt(line, case)
                verifier.ACTIVE_RUN = active
                self.assertTrue(verifier._sass_seal_assertion_ok(body, 'form-field-state'))
                wrong = copy.deepcopy(body)
                wrong['case_id'] = case.replace('form-field', 'legacy-form-field')
                self.assertFalse(verifier._sass_seal_assertion_ok(wrong, 'form-field-state'))

    def test_javascript_models_keep651_and498_cases_and_reject_css_and_scope_mutations(self):
        code = r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {FORM_FIELD_STATE_DEFAULT_CASES,FORM_FIELD_STATE_ARGUMENT_CASES,FORM_FIELD_STATE_CONTRACT,formFieldStateDefaultResultsMatch,formFieldStateArgumentResultsMatch,formFieldStatePeerProgram} from './scripts/sass-form-field-state-contract.mjs';
import {compareInventory,classifyPending} from './scripts/sass-api-inventory.mjs';
import {mixinArgumentCaseIds} from './scripts/sass-mixin-arguments.mjs';
const c=JSON.parse(readFileSync('fixtures/sass/form-field-state-contracts.json')),f=JSON.parse(readFileSync('tests/form_field_state_contract_fixture.json')),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');
assert.equal(mixinArgumentCaseIds().length,498);
for(const id of ['__proto__','constructor','toString','unknown']){assert.equal(formFieldStatePeerProgram(id),null);assert.equal(formFieldStateDefaultResultsMatch(id,{},{}),false);assert.equal(formFieldStateArgumentResultsMatch(id,{},{},{}),false);}
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([name,e])=>[name,{css:'',sha256:e.invocation.css_sha256}]));
 for(const [id,e]of Object.entries(c.cases)){
  const m={...f.measurements[line][id],sources:f.source_sets[line]},peer={...f.peers[line][id],sources:c.peer_inputs[line]},contract={classification:'conforming-current-companion',contract:FORM_FIELD_STATE_CONTRACT,peer};
  const matches=(value,observedPeer=peer)=>e.kind==='default'?formFieldStateDefaultResultsMatch(id,{css:value.css,sha256:value.css_sha256,actual_measurement:value},{...contract,peer:observedPeer}):formFieldStateArgumentResultsMatch(id,e.original,value,observedPeer);
  assert.equal(matches(m),true,id);
  for(const changed of [e.original.css,m.css+'\n.unrelated {color:red}',m.css.replace('--mat-form-field-hover-state-layer-opacity:','--foreign-token:')])
   assert.equal(matches({...m,css:changed,css_sha256:sha(changed),css_bytes:Buffer.byteLength(changed)}),false,id);
  const p={...peer,sources:[]};assert.equal(matches(m,p),false);
  if(e.kind==='default')css[id.slice(10)]={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_companion:contract};
 }
 const results=compareInventory(o,o.members,css);assert.equal(results.length,651);assert.ok(results.every(r=>r.result==='pass'));
 for(const id of Object.keys(FORM_FIELD_STATE_DEFAULT_CASES)){
  const name=id.slice(10),changed=css[name].css+'\n.unrelated {color:red}',m={...css[name].actual_measurement,css:changed,css_sha256:sha(changed),css_bytes:Buffer.byteLength(changed)};
  const values={...css,[name]:{...css[name],css:changed,sha256:sha(changed),actual_measurement:m}};
  assert.deepEqual(classifyPending(compareInventory(o,o.members,values),{decisions:[]}).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
 }
 const foreign={...css,'legacy-form-field-color':{...css['form-field-color']}};
 assert.ok(compareInventory(o,o.members,foreign).some(r=>r.case_id==='mixin-css/legacy-form-field-color'&&r.result==='fail'));
}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_aggregate_insertion_requires_one_whole_original_prefix_and_exact_public_sources(self):
        code = r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {FORM_FIELD_STATE_AGGREGATE_CASES,insertFormFieldStateInAggregate} from './scripts/sass-form-field-state-contract.mjs';
const c=JSON.parse(readFileSync('fixtures/sass/form-field-state-contracts.json')),d=JSON.parse(readFileSync('tests/sass_default_aggregate_fixture.json')),dc=JSON.parse(readFileSync('fixtures/sass/default-aggregate-contracts.json')),a=JSON.parse(readFileSync('tests/sass_aggregate_color_theme_fixture.json')),ac=JSON.parse(readFileSync('fixtures/sass/aggregate-color-theme-contracts.json'));
assert.equal(Object.keys(FORM_FIELD_STATE_AGGREGATE_CASES).length,6);
for(const line of ['main','21.x'])for(const [id,field]of Object.entries(FORM_FIELD_STATE_AGGREGATE_CASES)){
 const e=c.cases[field],isDefault=id.startsWith('mixin-css/');
 const css=isDefault?d.measurements[id+'-'+line].css:a.candidate_inputs[id+'-'+line];
 const stored=isDefault?d.peers[dc.cases[id].profile+'-'+line]:a.peers[ac.cases[id].peer_profile+'-'+line];
 const peer=isDefault?{...stored,sources:dc.peer_inputs[line].sources}:stored;
 const addition='\n'+e.peers[line].css+'\n';assert.equal(css.split(addition).length,2);
 const base=css.replace(addition,'');assert.equal(insertFormFieldStateInAggregate(id,base,peer),css);
 for(const wrong of [base.replace(e.color.css,''),base+e.color.css,base.replace('--mdc-filled-text-field-caret-color:','--foreign-token:')])
  assert.equal(insertFormFieldStateInAggregate(id,wrong,peer),null);
 const missing=structuredClone(peer);missing.sources=missing.sources.filter(s=>s.path!=='form-field/_form-field-theme.scss');
 assert.equal(insertFormFieldStateInAggregate(id,base,missing),null);
 const changed=structuredClone(peer);changed.sources.find(s=>s.path==='form-field/_m3-form-field.scss').sha256='0'.repeat(64);
 assert.equal(insertFormFieldStateInAggregate(id,base,changed),null);
 for(const unknown of ['__proto__','constructor','unknown',id.replace('all-component','all-legacy-component')])
  assert.equal(insertFormFieldStateInAggregate(unknown,base,peer),null);
}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
