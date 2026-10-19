# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""An exact review copy cannot replace or rewrite its authenticated original."""
import ast,copy,gzip,hashlib,json,sys,unittest
from pathlib import Path
from tests.ripple_global_options_integration import historical_protected_bytes, historical_task_diff
from unittest.mock import patch
import tests.test_upstream_audit_disposition as audit
ROOT,LEDGER,MECHANICAL=audit.ROOT,audit.LEDGER,audit.MECHANICAL
sha=lambda b:hashlib.sha256(b).hexdigest()
class ImportCleanupReviewHistory(unittest.TestCase):
    def setUp(self):
        self.helper=audit.UpstreamAuditDispositionTests('test_history_guards_reject_missing_pending_and_changed_later_proofs')
        self.entry=next(e for e in json.loads(LEDGER.read_bytes())['entries']
                        if e.get('batch_id')=='closeout-complete31-test-import-cleanup-predicate'
                        and (MECHANICAL/(e['sha']+'.json')).exists())
        self.old_path=(MECHANICAL/(self.entry['sha']+'.json')).relative_to(ROOT).as_posix()
        self.old_report=json.loads((ROOT/self.old_path).read_bytes())
        self.current_path=ROOT/self.entry['evidence_report'];self.body=json.loads(self.current_path.read_bytes())
    def check(self,entry=None,old_path=None):
        self.helper.assert_import_cleanup_history(entry or self.entry,self.old_report,old_path or self.old_path)
    def test_current_copy_and_authenticated_original_both_retain_history(self):
        self.check();previous=self.body['chip_source_scope_requalification']['prior_review']
        preserved=copy.deepcopy(self.entry);preserved['evidence_report']=previous['path']
        preserved['source_check']['evidence_report_sha256']=previous['sha256'];self.check(preserved)
        self.assertEqual(len(self.body['reviews']),31)
    def test_forged_pointers_membership_seals_and_resealed_copy_reject(self):
        for mutate in [lambda e:e.update(prior_entry_preserved_in='compatibility/rc/unrelated.json'),
                       lambda e:e.update(evidence_report='compatibility/rc/unrelated.json'),
                       lambda e:e['source_check'].update(evidence_report_sha256='0'*64),
                       lambda e:e['source_check'].update(review_membership='0'*40),
                       lambda e:e['source_check'].update(diff_sha256='0'*64)]:
            entry=copy.deepcopy(self.entry);mutate(entry)
            with self.assertRaises(AssertionError):self.check(entry)
        with self.assertRaises(AssertionError):self.check(old_path='compatibility/rc/unrelated.json')
        mutations=[lambda b:b['chip_source_scope_requalification'].update(source_parent='0'*40),
                   lambda b:b['chip_source_scope_requalification']['prior_review'].update(sha256='0'*64),
                   lambda b:b['chip_source_scope_requalification'].update(actual_native_packed_or_floor_qualified=True),
                   lambda b:b['chip_source_scope_requalification'].update(source_scope_only=False),
                   lambda b:b['reviews'][0].update(decision='changed original judgment'),
                   lambda b:b['ownership_context']['inputs'][0].update(sha256='0'*64),
                   lambda b:b.update(extra_unreviewed_field=True),
                   lambda b:b.pop('chip_source_scope_requalification')]
        original=Path.read_bytes
        for mutate in mutations:
            changed=copy.deepcopy(self.body);mutate(changed);raw=json.dumps(changed).encode()
            entry=copy.deepcopy(self.entry);entry['source_check']['evidence_report_sha256']=sha(raw)
            def read(path):return raw if path==self.current_path else original(path)
            with patch.object(Path,'read_bytes',read),self.assertRaises(AssertionError):self.check(entry)
    def test_changed_original_or_live_source_context_rejects(self):
        original=Path.read_bytes
        for relative in [self.entry['prior_entry_preserved_in'],'testing/legacy-runner/historical-inventory.json']:
            target=ROOT/relative
            def read(path):return original(path)+b'\n' if path==target else original(path)
            with patch.object(Path,'read_bytes',read),self.assertRaises(AssertionError):self.check()
    def test_all_original_assertions_and_other_methods_remain_byte_identical(self):
        self.assertEqual(unittest.TestLoader().loadTestsFromModule(sys.modules[__name__]).countTestCases(),4)
        task=json.loads((ROOT/'compatibility/rc/import-cleanup-review-history-worksheet.json').read_bytes());ref=task['prior']
        stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        before=prior['source']['text'];after=(ROOT/prior['source']['path']).read_text()
        def method(source):
            tree=ast.parse(source)
            return next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='assert_import_cleanup_history')
        a,b=method(before),method(after);self.assertIsInstance(b.body[0],ast.If)
        self.assertEqual([ast.dump(n,include_attributes=False) for n in a.body],[ast.dump(n,include_attributes=False) for n in b.body[1:]])
        self.assertEqual(after.replace(ast.get_source_segment(after,b),ast.get_source_segment(before,a),1),before)
        for m in prior['protected']:self.assertEqual(sha(historical_protected_bytes(ROOT,m['path'])),m['sha256'])
