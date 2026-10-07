"""Finite tree conformance preserves original rules and authentic peer tokens."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from sass_mixin_argument_admission import mixin_argument_assertion_ok
from sass_tree_companion_admission import TREE_CASES
from sass_mixin_fixture import mixin_receipt


def active(line):
    return SimpleNamespace(binding={'source_line': line}, manifest={
        'run_id': 'synthetic', 'artifacts': [dict(id='library', sha256='c' * 64)]})


def replace_css(result, css):
    result.update(css=css, css_sha256=hashlib.sha256(css.encode()).hexdigest(),
                  css_bytes=len(css.encode()))


class TreeCompanionAdmission(unittest.TestCase):
    def test_all_eight_cases_on_each_line_and_missing_bridge(self):
        for line in ['main', '21.x']:
            run = active(line)
            for case in TREE_CASES:
                with self.subTest(line=line, case=case):
                    body = mixin_receipt(ROOT, run, case, 'one')
                    self.assertTrue(mixin_argument_assertion_ok(ROOT, run, body, 'one'))
                    wrong = copy.deepcopy(body)
                    wrong['actual'] = copy.deepcopy(wrong['expected'])
                    self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))
                    wrong = copy.deepcopy(body)
                    wrong.pop('current_companion')
                    self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))

    def test_rehashed_rule_value_and_declaration_order_mutations_fail(self):
        run = active('main')
        for case in TREE_CASES:
            body = mixin_receipt(ROOT, run, case, 'one')
            css = body['actual']['css']
            edits = [css + '\n.owned { color: red; }',
                     css.replace('.mat-tree', '.changed'),
                     css.replace('--mat-tree-', '--wrong-tree-')]
            for before, after in [('white', 'red'), ('#424242', 'red'),
                                  ('Custom Family', 'Wrong Family'), ('14px', '19px'),
                                  ('400', '500'), ('40px', '48px')]:
                if before in css:
                    edits.append(css.replace(before, after))
            declarations = css.splitlines()
            positions = [i for i, value in enumerate(declarations) if value.startswith('  --mat-tree-')]
            if len(positions) > 1:
                a, b = positions[:2]
                declarations[a], declarations[b] = declarations[b], declarations[a]
                edits.append('\n'.join(declarations))
            for edit in edits:
                with self.subTest(case=case, edit=edit):
                    wrong = copy.deepcopy(body)
                    replace_css(wrong['actual'], edit)
                    self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))
            wrong = copy.deepcopy(body)
            replace_css(wrong['expected'], body['expected']['css'] + '\n.owned { color: red; }')
            self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))

    def test_peer_program_source_identity_and_finite_scope(self):
        run = active('main')
        body = mixin_receipt(ROOT, run, next(iter(TREE_CASES)), 'one')
        for key, value in [('line', '21.x'), ('peer_version', '22.2.0'),
                           ('peer_package_json_sha256', 'f' * 64),
                           ('program', '@use candidate;'), ('program_sha256', 'f' * 64),
                           ('sources', [])]:
            wrong = copy.deepcopy(body)
            wrong['current_companion']['peer'][key] = value
            self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'), key)
        for key, value in [('root', 2), ('path', '../candidate.scss'),
                           ('sha256', 'f' * 64), ('bytes', 1)]:
            wrong = copy.deepcopy(body)
            wrong['current_companion']['peer']['sources'][0][key] = value
            self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'), key)
        for case in ['mixin-argument/all-legacy-component-themes/custom-full-theme',
                     'mixin-argument/badge-color/custom-full-theme']:
            wrong = mixin_receipt(ROOT, run, case, 'one')
            wrong['current_companion'] = copy.deepcopy(body['current_companion'])
            wrong['comparison'] = 'current-companion-contract'
            self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))
        wrong = copy.deepcopy(body)
        wrong['current_companion']['classification'] = 'approved-exception'
        self.assertFalse(mixin_argument_assertion_ok(ROOT, run, wrong, 'one'))

    def test_javascript_composition_and_mutation_scope(self):
        records = [mixin_receipt(ROOT, active(line), case, 'one')
                   for line in ['main', '21.x'] for case in TREE_CASES]
        code = r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {treeCompanionResultsMatch,treeCompanionExpectedCss} from './scripts/sass-tree-companion-contract.mjs';
for(const row of JSON.parse(readFileSync(0,'utf8'))){
 const peer=row.current_companion.peer;
 const matches=(original=row.expected,actual=row.actual,p=peer,id=row.case_id)=>treeCompanionResultsMatch(id,original,actual,p);
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
 assert.equal(treeCompanionExpectedCss(row.case_id,{},peer),null);
}
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                                input=json.dumps(records), text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
