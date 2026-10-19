# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current native obligations stay live while earlier test models stay historical."""
import copy,gzip,hashlib,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import tests.audit_test_context as context
ROOT=Path(__file__).resolve().parents[1]
LIFECYCLE={'20bf71c40f565c59101b63b5a878d2ddb7fe251d',
           '7c9c898faac8daac1bbb20a0807168a74360760d','8e1711216f7d07324e311e0f6ada3d2426c7891e'}
class CurrentAuditNative(unittest.TestCase):
    def test_all_current_profiles_and_three_derived_source_reviews(self):
        contracts=context.native_contracts(ROOT);rows=contracts['rows']
        self.assertEqual(contracts['registry_modules'],13)
        self.assertEqual(len(rows),34 if contracts['line']=='main' else 33)
        self.assertEqual({r['sha'] for r in rows if r['lifecycle_source_review_validated']},LIFECYCLE)
        entries={e['sha']:e for e in json.loads((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes())['entries']}
        for row in rows:
            self.assertEqual(row['no_run'],{'ok':False,'detail':'missing coordinator run'})
            context.assert_native_review(self,ROOT,entries[row['sha']])
        self.assertFalse(contracts['actual_native_or_packed_qualified'])
        poisoned=context.native_contracts(ROOT);poisoned['rows'].clear()
        self.assertEqual(len(context.native_contracts(ROOT)['rows']),len(rows))

    def test_wrong_review_path_selected_body_and_late_document_bytes_reject(self):
        entries={e['sha']:e for e in json.loads((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes())['entries']}
        reader=context.read_review
        for sha in sorted(LIFECYCLE):
            entry=entries[sha];body,review=reader(ROOT,entry)
            wrong=copy.deepcopy(entry);wrong['evidence_report']='compatibility/rc/chip-lifecycle-scope-source-review.json'
            with self.subTest(sha=sha,path='foreign'),self.assertRaises(AssertionError):context.assert_native_review(self,ROOT,wrong)
            for mutate in [lambda b:b['reviews'].reverse(),lambda b:b.update(individual_proof=entry['individual_proof']),
                           lambda b:next(r for r in b['reviews'] if r['sha']==sha).update(native_admission_required=False)]:
                changed=copy.deepcopy(body);mutate(changed)
                def altered(root,current):
                    if current['sha']==sha:return changed,next(r for r in changed['reviews'] if r['sha']==sha)
                    return reader(root,current)
                with patch.object(context,'read_review',altered),self.subTest(sha=sha),self.assertRaises(AssertionError):context.assert_native_review(self,ROOT,entry)
            with tempfile.TemporaryDirectory(prefix='ngx-current-audit-document-') as temporary:
                path=Path(temporary)/'review.json';path.write_text(json.dumps(body)+'\n')
                original=context.member_path
                def member(root,name):return path if name==entry['evidence_report'] else original(root,name)
                with patch.object(context,'member_path',member),self.assertRaises(AssertionError):context.assert_native_review(self,ROOT,entry)

    def test_product_ledger_native_guards_and_original_helper_preimages_preserved(self):
        task=json.loads((ROOT/'compatibility/rc/current-audit-native-worksheet.json').read_bytes());ref=task['prior']
        stored=(ROOT/ref['path']).read_bytes();self.assertEqual(hashlib.sha256(stored).hexdigest(),ref['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(hashlib.sha256(raw).hexdigest(),ref['raw_sha256']);prior=json.loads(raw)
        for m in prior['protected']:self.assertEqual(hashlib.sha256((ROOT/m['path']).read_bytes()).hexdigest(),m['sha256'])
        before=next(m['text'] for m in prior['sources'] if m['path']=='tests/test_audit_test_context.py')
        expected=before.replace('current complete31/30 guard census','current complete34/33 guard census')
        expected=expected.replace("len(contracts['rows']),31 if contracts['line']=='main' else 30", "len(contracts['rows']),34 if contracts['line']=='main' else 33")
        self.assertNotEqual(expected,before);self.assertEqual((ROOT/'tests/test_audit_test_context.py').read_text(),expected)
