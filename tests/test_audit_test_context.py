# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current native obligations and exact retained test/history transitions."""
import ast
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from tests.native_date_source_context import project_native_date_context
from unittest.mock import patch
from tests.audit_test_context import (assert_native_review,assert_runtime_roster,
    native_contracts,prior_source_entry,read_original_patch,read_review)

ROOT=Path(__file__).resolve().parents[1]
EDITS_PIN='f5aa792ea0e4c54b303e50572ef8c2db9f4f4901bf095ab56db00d7ddfd1d2ee'
LEDGER='compatibility/f10/disposition-ledger/ledger.json'

class AuditTestContext(unittest.TestCase):
    def test_exact_original_methods_and_finite_reader_edits(self):
        _,read=project_native_date_context(ROOT)
        task=json.loads(read('compatibility/rc/audit-test-current-context-worksheet.json'))
        file='tests/test_upstream_audit_disposition.py'
        if task['line']=='21.x':
            # This old main-only class was never present on21.x. The shared
            # current native contracts below are actually checked on this line.
            child=subprocess.run(['git','cat-file','-e',task['source_parent']+':'+file],cwd=ROOT,capture_output=True)
            self.assertNotEqual(child.returncode,0);self.assertFalse((ROOT/file).exists());return
        edits_raw=(ROOT/'compatibility/rc/audit-test-current-context-source-edits.json').read_bytes()
        self.assertEqual(hashlib.sha256(edits_raw).hexdigest(),EDITS_PIN)
        rules=json.loads(edits_raw)
        original=gzip.decompress((ROOT/'compatibility/rc/audit-test-current-context-original.py.gz').read_bytes())
        self.assertEqual(hashlib.sha256(original).hexdigest(),rules['before_sha256'])
        self.assertEqual(subprocess.check_output(['git','show',task['source_parent']+':'+file],cwd=ROOT),original)
        text=original.decode()
        for edit in rules['edits']:
            self.assertEqual(text.count(edit['before']),edit['occurrences'])
            text=text.replace(edit['before'],edit['after'])
        current=(ROOT/file).read_bytes();self.assertEqual(text.encode(),current)
        self.assertEqual(hashlib.sha256(current).hexdigest(),rules['after_sha256'])
        names=lambda raw:[n.name for n in ast.walk(ast.parse(raw)) if isinstance(n,ast.FunctionDef)]
        self.assertEqual(names(original),names(current))
        self.assertEqual(names(original),rules['original_methods'])
        self.assertEqual(names(current),rules['current_methods'])
        for member in [LEDGER,'compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json']:
            self.assertEqual(read(member),subprocess.check_output(['git','show',task['source_parent']+':'+member],cwd=ROOT))
        self.assertEqual(subprocess.check_output(['git','diff',task['source_parent'],'--name-only','--','projects','testing','reference','fixtures'],cwd=ROOT),b'')
        changed=subprocess.check_output(['git','diff',task['source_parent'],'--name-only','--','scripts'],cwd=ROOT).decode().splitlines()
        new_context={p for p in changed if read(p)!=(ROOT/p).read_bytes()}
        new_files={'scripts/upstream-native-date-evidence.mjs','scripts/native-date-packed-contract.mjs','scripts/native-date-packed-fixture.mjs','scripts/native-date-packed-source-context.mjs'}
        self.assertTrue(set(changed)-new_context-new_files<={'scripts/historical-source-replay.mjs'})
        if changed:
            # The subsequent coherence-frame step owns exactly the two
            # registry hash pins. The91 replay controls validate their values.
            import re
            member='scripts/historical-source-replay.mjs'
            before=subprocess.check_output(['git','show',task['source_parent']+':'+member],cwd=ROOT).decode()
            after=(ROOT/member).read_text()
            pattern=r"^const pins=\{main:'[0-9a-f]{64}','21\.x':'[0-9a-f]{64}'\};$"
            self.assertEqual(len(re.findall(pattern,before,re.M)),1)
            self.assertEqual(len(re.findall(pattern,after,re.M)),1)
            self.assertEqual(re.sub(pattern,'const pins=<frame>',before,flags=re.M),re.sub(pattern,'const pins=<frame>',after,flags=re.M))

    def test_all_registered_subjects_still_require_actual_coordinator_execution(self):
        contracts=native_contracts(ROOT)
        self.assertEqual(len(contracts['rows']),24 if contracts['line']=='main' else 23)
        entries=json.loads((ROOT/LEDGER).read_bytes())['entries'];indexed={e['sha']:e for e in entries}
        self.assertEqual(len(indexed),1697)
        for row in contracts['rows']:
            assert_native_review(self,ROOT,indexed[row['sha']])
            self.assertEqual(row['no_run'],{'ok':False,'detail':'missing coordinator run'})
        self.assertFalse(contracts['actual_native_or_packed_qualified'])
        if contracts['line']=='main':assert_runtime_roster(self,ROOT,entries)
        else:self.assertEqual(indexed['231f94f5557bb58afc0070585688b3014d541eb2']['final_disposition'],'security-review')

    def test_corrupted_source_proof_or_runtime_scope_is_not_a_source_judgment(self):
        entries={e['sha']:e for e in json.loads((ROOT/LEDGER).read_bytes())['entries']}
        for row in native_contracts(ROOT)['rows']:
            current=entries[row['sha']]
            mutations=[lambda e:e['individual_proof'].update(proof_kind='source-only-pass'),
                lambda e:e['individual_proof'].update(affected_branches=['foreign']),
                lambda e:e['individual_proof'][row['field']]['source_members'].pop(),
                lambda e:e['individual_proof'][row['field']].update(kind='borrowed-success'),
                lambda e:e.update(final_disposition='needs-individual-review')]
            for mutate in mutations:
                entry=copy.deepcopy(current);mutate(entry)
                with self.subTest(sha=row['sha']),self.assertRaises((AssertionError,KeyError)):
                    assert_native_review(self,ROOT,entry)
            body=read_review(ROOT,current)[0];body['g11_claim']='passed'
            with self.assertRaises(AssertionError):assert_native_review(self,ROOT,current,body)
        if native_contracts(ROOT)['line']=='main':
            source=json.loads((ROOT/LEDGER).read_bytes())['entries']
            for entries in [source[:-1],source+[source[0]]]:
                with self.assertRaises(AssertionError):assert_runtime_roster(self,ROOT,entries)

    def test_git_bound_prior_entry_identity_cannot_be_forged(self):
        import tests.audit_test_context as context
        sha='1597a2d85049e53e67eabdaa7f37efd1cfaad93e'
        entries={e['sha']:e for e in json.loads((ROOT/LEDGER).read_bytes())['entries']}
        if entries[sha].get('individual_proof') is None:
            #21.x has not adopted this main-only source review. Do not invent
            # a branch-native qualification from the other line's record.
            self.assertEqual(native_contracts(ROOT)['line'],'21.x');return
        entry=entries[sha];original=read_review(ROOT,entry);self.assertIn('ledger_commit',original[1]['prior_entry'])
        if native_contracts(ROOT)['line']=='main':
            prior_source_entry(ROOT,entry,lambda old,body,review:old['evidence_report'].startswith('compatibility/f10/disposition-ledger/evidence/mechanical/'))
        else:
            # The original21.x import row has no evidence pointer. Its exact
            # committed entry digest is still checked during this traversal;
            # no main mechanical review is fabricated for this branch.
            self.assertEqual(len(list(context.source_history(ROOT,entry))),1)
            reference=original[1]['prior_entry']
            prior=next(row for row in context.git_ledger(ROOT,reference['ledger_commit'])['entries'] if row['sha']==sha)
            self.assertEqual(prior['final_disposition'],'needs-individual-review')
            self.assertIsNone(prior['evidence_report'])
        for key,value in [('entry_sha256','0'*64),('ledger_path','../outside.json'),('ledger_commit','not-a-commit')]:
            body,review=copy.deepcopy(original)
            review['prior_entry'][key]=value
            original_reader=context.read_review
            def altered(root,current):
                return (body,review) if current['evidence_report']==entry['evidence_report'] else original_reader(root,current)
            with patch.object(context,'read_review',altered),self.subTest(field=key),self.assertRaises(AssertionError):
                list(context.source_history(ROOT,entry))

    def test_full_original_patch_in_authenticated_capsule_is_preserved(self):
        sha='0affe5aaa704fa0bf923b1be3266515e41d5e350'
        entries={e['sha']:e for e in json.loads((ROOT/LEDGER).read_bytes())['entries']}
        if entries[sha].get('individual_proof') is None:
            self.assertEqual(native_contracts(ROOT)['line'],'21.x');return
        body=read_review(ROOT,entries[sha])[1]
        raw=read_original_patch(ROOT,sha,body)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),body['diff_sha256'])
        self.assertGreater(raw.count(b'@@'),100)
        for mutate in [lambda b:b.update(diff_sha256='0'*64),lambda b:b['original_sources'].update(sha256='0'*64)]:
            wrong=copy.deepcopy(body);mutate(wrong)
            with self.assertRaises(AssertionError):read_original_patch(ROOT,sha,wrong)

if __name__=='__main__':unittest.main()
