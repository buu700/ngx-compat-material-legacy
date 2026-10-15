# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Focus-before-click continuity strengthens the existing mandatory select cell."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectFocusClickPackedTests(unittest.TestCase):
    def test_actual_collector_and_previous_conditions_are_both_required(self):
        result = subprocess.run(['node', 'tests/select_focus_click_packed_contract_probe.mjs'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('derived_cases', 106), ('retained_previous_cases', 106),
                ('original_select_harness_conditions_retained', 3), ('negative_cases', 2016),
                ('collector_mutants', 4), ('writer_cases', 3), ('source_reversal_negative_controls', 55)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['existing_select_case_strengthened'])
        self.assertFalse(observed['actual_packed_focus_click_executed'])

    def test_complete_method_protocol_and_tagged_original_reversions(self):
        result = subprocess.run(['node', 'tests/select_focus_click_method_probe.mjs'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('positive_contexts', 2), ('original_expected_failures', 2),
                ('source_reversions_rejected', 7), ('disabled_empty_guard_contexts', 4)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['public_toggle_preserved'])
        self.assertFalse(observed['actual_constructor_or_Angular_node_or_native_or_packed_executed'])

    def test_source_judgment_requires_actual_artifact_behavior(self):
        sha = '1b6db8c89b00ace8aaa0e0824866acec5369635f'
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        entry = next(row for row in ledger['entries'] if row['sha'] == sha)
        self.assertEqual(entry['final_disposition'], 'already-adapted')
        self.assertEqual(entry['individual_proof']['proof_kind'], 'artifact-required-individual-behavior')
        self.assertEqual(entry['individual_proof']['artifact_behavior']['case_ids'], ['packed-consumer/harness/legacy-select'])
        report = json.loads((ROOT / entry['evidence_report']).read_text())
        self.assertEqual(report['status'], 'reviewed')
        self.assertEqual(report['judgment_stage'], 'source-complete-runtime-required')
        self.assertTrue(report['runtime_qualification']['required'])
        self.assertFalse(report['runtime_qualification']['qualified_by_this_document'])
        self.assertFalse(report['actual_packed_or_native_executed'])
        self.assertFalse(report['semantic_pass'])
        old = json.loads((ROOT / report['prior_pending_record']['path']).read_text())
        self.assertEqual(old['status'], 'pending')
        self.assertEqual(hashlib.sha256((ROOT / report['prior_pending_record']['path']).read_bytes()).hexdigest(), report['prior_pending_record']['sha256'])
        self.assertEqual(hashlib.sha256((ROOT / report['patch_file']).read_bytes()).hexdigest(), report['diff_sha256'])
        self.assertEqual(report['complete_original_files'], ['src/material/select/select.html', 'src/material/select/select.ts'])
        self.assertEqual(report['runtime_qualification']['case_ids'], ['packed-consumer/harness/legacy-select'])
        self.assertFalse(report['original_patch_has_test_hunk'])
