# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Restored immutable original bytes; neither storage nor fixtures qualify G11."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from tests.chip_history_union import historical_product_diff
from tests.native_date_source_context import project_native_date_context

ROOT=Path(__file__).resolve().parents[1]
ORIGINALS={
    '0affe5aaa704fa0bf923b1be3266515e41d5e350':'e23855b20aa8d34737e8d1622f6059046ccc6b501dded221b0cbe55d7f8a3c77',
    '39b0f5521960f93af96943968961f1ba3e241307':'cac83ee0420a613e7e1afcd21211b9c1e6b2763edca066c2850fb3f134e7415b',
    '5ad259a25e4b6d6346ee62954fe461f4500c9cee':'5da01039cdf98b22f163c51ddeb69bed795c9da542451d4e1e2602fc114ae4de',
    'b423c0e0b754b1f1d118d17e022981c357c3aa68':'0fc17a9693eca8bb91cf85b9e1bd5129acf63ccc8a761482a7e8e2ba5d9dd31d',
}
READER_PINS={'main':'dace7f8cbc7b13cb80a863fb782526cadaddbb15e44fcdca7761abfd91cb4750',
    '21.x':'16b4a632326bb180417e5ab94c354f287271ca019782d6b6c35c8b22f56d839a'}

class OriginalPatchStorage(unittest.TestCase):
    def test_all_declared_original_bytes_and_exact_reader_change(self):
        projected,read=project_native_date_context(ROOT)
        task=json.loads(read('compatibility/rc/original-patch-storage-worksheet.json'));parent=task['source_parent'];line=task['line']
        entries={e['sha']:e for e in projected['entries']}
        self.assertEqual(set(task['subjects']),set(ORIGINALS))
        for sha,expected in ORIGINALS.items():
            entry=entries[sha];review=json.loads((ROOT/entry['evidence_report']).read_bytes());raw=(ROOT/review['patch_file']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(),expected)
            self.assertEqual(review['diff_sha256'],expected);self.assertEqual(entry['individual_proof']['diff_sha256'],expected)
            self.assertEqual(entry['individual_proof']['affected_branches'],[line])
            self.assertEqual((ROOT/entry['evidence_report']).read_bytes(),subprocess.check_output(['git','show',parent+':'+entry['evidence_report']],cwd=ROOT))
            self.assertEqual(entry['final_disposition'],'do-not-adopt')
        auth=json.loads((ROOT/'compatibility/rc/original-patch-storage-authentication.json').read_bytes())
        self.assertEqual(auth['restored_files'],3 if line=='main' else 4)
        self.assertEqual(auth['full_original_spec_hunks_reconstructed'],239)
        self.assertFalse(auth['actual_native_packed_or_floor_qualified']);self.assertEqual(auth['g11_claim'],'not-passed')
        rule_bytes=(ROOT/'compatibility/rc/original-patch-storage-reader-edits.json').read_bytes()
        self.assertEqual(hashlib.sha256(rule_bytes).hexdigest(),READER_PINS[line]);rule=json.loads(rule_bytes)
        self.assertEqual(rule['source_parent'],parent)
        before=subprocess.check_output(['git','show',parent+':'+rule['path']],cwd=ROOT)
        self.assertEqual(hashlib.sha256(before).hexdigest(),rule['before_sha256'])
        self.assertEqual(before.decode().count(rule['before']),1)
        after=read(rule['path'])
        self.assertEqual(after,before.decode().replace(rule['before'],rule['after']).encode())
        self.assertEqual(hashlib.sha256(after).hexdigest(),rule['after_sha256'])
        for member in ['compatibility/f10/disposition-ledger/ledger.json','compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json',
                       'scripts/check-upstream-audit-disposition.mjs','scripts/upstream-individual-evidence-scope.mjs','scripts/spec-date-tooltip-slider-source-review.mjs','scripts/authenticated-single-spec-review.mjs',
                       'compatibility/rc/spec-date-tooltip-slider-source-subjects.json.gz','compatibility/rc/spec-date-tooltip-slider-source-acquisition.json.gz']:
            self.assertEqual(read(member),subprocess.check_output(['git','show',parent+':'+member],cwd=ROOT))
        self.assertEqual(historical_product_diff(ROOT,parent,read,name_only=True),b'')

    def test_actual_checker_binding_positives_and_mutations_remain_incomplete_overall(self):
        child=subprocess.run(['node','tests/original_patch_storage_probe.mjs'],cwd=ROOT,text=True,capture_output=True,timeout=60)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:])
        row=json.loads(child.stdout.strip().splitlines()[-1])
        self.assertEqual(row['actual_checker_controls'],32);self.assertEqual(row['positive_binding_controls'],8);self.assertEqual(row['rejected_binding_controls'],24)
        self.assertEqual(row['original_spec_hunks_reconstructed'],239);self.assertEqual(row['complete_original_source_side_blobs'],14)
        self.assertEqual(row['authored_use_status_labels_deliberately_insufficient'],1736)
        self.assertTrue(row['test_only_sensitivity_trigger']);self.assertTrue(row['fixture_only'])
        self.assertFalse(row['production_checker_or_real_ledger_changed']);self.assertFalse(row['actual_native_packed_or_floor_qualified'])
        self.assertEqual(row['g11_claim'],'not-passed')
        manifest=json.loads((ROOT/'package.json').read_bytes())
        self.assertEqual(row['actual_branch_typescript'],manifest['devDependencies']['typescript'])

if __name__=='__main__':unittest.main()
