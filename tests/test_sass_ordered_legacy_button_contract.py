# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite ordered legacy button contract and complete-CSS mutation controls."""
import copy
import hashlib
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sass_ordered_legacy_button_admission import ordered_legacy_button_assertion_ok


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


class OrderedLegacyButtonContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # The positive uses the independent original-CSS model. The integration
        # run must separately feed real packed candidate CSS to this contract.
        code = r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {ORDERED_LEGACY_BUTTON_CASES,ORDERED_LEGACY_BUTTON_PEER_FILES,orderedLegacyButtonExpectedCss} from './scripts/sass-ordered-legacy-button-contract.mjs';
import {orderedCssResults} from './scripts/sass-ordered-css.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex'),ids=Object.keys(ORDERED_LEGACY_BUTTON_CASES),files=[],fixtures=[],css={};
for(const id of ids){const p=ORDERED_LEGACY_BUTTON_CASES[id],value=orderedLegacyButtonExpectedCss(id);assert.equal(typeof value,'string');css[id]=value;files.push({file:id+'.css',status:'blocked',baseline_sha256:p.reference_sha256,candidate_sha256:sha(value)});fixtures.push({id,status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:p.fixture_sha256,css_sha256:sha(value)});}
const report={fixtures,sass:'dart-sass\t1.104.1\t(Sass Compiler)\t[Dart]\ndart2js\t3.13.3\t(Dart Compiler)\t[Dart]',installed:{'@angular/material':{version:'22.1.7',manifest_sha256:ORDERED_LEGACY_BUTTON_PEER_FILES['node_modules/@angular/material/package.json']}}};
const rows=orderedCssResults({files},report,css,ORDERED_LEGACY_BUTTON_PEER_FILES).filter(r=>ids.includes(r.case_id));assert.ok(rows.every(r=>r.result==='pass'));
for(const id of ids){
 const wrong=structuredClone(css),changed=wrong[id].replace(/--mat-button-[a-z0-9-]+: [^;]+;/,'--mat-button-invalid: wrong;');assert.notEqual(changed,wrong[id]);wrong[id]=changed;
 const reportWrong=structuredClone(report),record=reportWrong.fixtures.find(r=>r.id===id);record.css_sha256=sha(changed);
 const filesWrong=structuredClone(files),row=filesWrong.find(r=>r.file===id+'.css');row.candidate_sha256=sha(changed);
 assert.equal(orderedCssResults({files:filesWrong},reportWrong,wrong,ORDERED_LEGACY_BUTTON_PEER_FILES).find(r=>r.case_id===id).result,'fail');
 const missing=structuredClone(css);delete missing[id];assert.equal(orderedCssResults({files},report,missing,ORDERED_LEGACY_BUTTON_PEER_FILES).find(r=>r.case_id===id).result,'fail');
 const duplicated=structuredClone(files);duplicated.push(structuredClone(files.find(r=>r.file===id+'.css')));assert.equal(orderedCssResults({files:duplicated},report,css,ORDERED_LEGACY_BUTTON_PEER_FILES).find(r=>r.case_id===id).result,'fail');
}
const badPeer=structuredClone(ORDERED_LEGACY_BUTTON_PEER_FILES);badPeer['node_modules/@angular/material/fesm2022/button.mjs']='0'.repeat(64);assert.ok(orderedCssResults({files},report,css,badPeer).filter(r=>ids.includes(r.case_id)).every(r=>r.result==='fail'));
process.stdout.write(JSON.stringify(rows));
'''
        run = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                             capture_output=True, text=True, timeout=20, check=False)
        if run.returncode:
            raise AssertionError(run.stderr)
        cls.rows = json.loads(run.stdout)

    def test_complete_model_is_admitted_for_each_finite_case(self):
        self.assertEqual(len(self.rows), 3)
        for row in self.rows:
            self.assertTrue(ordered_legacy_button_assertion_ok(row), row['case_id'])

    def test_rehashed_css_defects_are_rejected(self):
        for row in self.rows:
            css = row['actual_measurement']['css']
            token = re.search(r'  --mat-button-[a-z0-9-]+: [^;]+;\n', css)
            tokens = list(re.finditer(r'  --mat-button-[a-z0-9-]+: [^;]+;\n', css))
            legacy = re.search(r'  --mdc-[a-z0-9-]+: [^;]+;\n', css)
            self.assertIsNotNone(token)
            self.assertIsNotNone(legacy)
            self.assertGreaterEqual(len(tokens), 2)
            first, second = tokens[:2]
            changes = {
                'unrelated historical declaration': css[:legacy.start()] + '  --mdc-example: wrong;\n' + css[legacy.end():],
                'missing current token': css[:token.start()] + css[token.end():],
                'wrong current token': css[:token.start()] + token.group().replace(': ', ': invalid-') + css[token.end():],
                'wrong token order': css[:first.start()] + second.group() + css[first.end():second.start()] + first.group() + css[second.end():],
                'wrong datepicker scope': css.replace('.mat-datepicker-content .mat-mdc-button {', '.unrelated .mat-mdc-button {', 1),
                'wrong custom color': re.sub(r'(--mat-button-(?:text|filled|protected|outlined)-(?:container|label-text)-color): #[0-9a-f]+;', r'\1: #abcdef;', css, count=1),
            }
            for label, changed in changes.items():
                with self.subTest(case=row['case_id'], defect=label):
                    self.assertTrue(changed != css, label)
                    wrong = copy.deepcopy(row)
                    measurement = wrong['actual_measurement']
                    measurement['css'] = changed
                    measurement['css_sha256'] = sha(changed)
                    measurement['css_bytes'] = len(changed.encode())
                    measurement['compiled_record']['css_sha256'] = sha(changed)
                    wrong['candidate_sha256'] = sha(changed)
                    self.assertFalse(ordered_legacy_button_assertion_ok(wrong))

    def test_wrong_subject_or_peer_source_is_rejected(self):
        for row in self.rows:
            for label, edit in [
                ('wrong reference', lambda x: x.update(reference_sha256='0' * 64)),
                ('wrong fixture', lambda x: x.update(fixture_sha256='0' * 64)),
                ('missing peer file', lambda x: x['current_infrastructure']['consumer_peer_files'].pop('node_modules/@angular/material/fesm2022/button.mjs')),
                ('wrong peer', lambda x: x['current_infrastructure'].update(peer_version='23.0.0')),
                ('wrong compiler', lambda x: x['actual_measurement'].update(sass_version='forged')),
            ]:
                with self.subTest(case=row['case_id'], defect=label):
                    wrong = copy.deepcopy(row)
                    edit(wrong)
                    self.assertFalse(ordered_legacy_button_assertion_ok(wrong))


if __name__ == '__main__':
    unittest.main()
