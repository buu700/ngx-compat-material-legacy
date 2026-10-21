# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical candidate tests retain their original complete programs and case identities."""
import ast
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from tests.chip_recent_history import canonical_recorded_case
from tests.dialog_caller_history import candidate_history_inputs, validate_candidate_history_receipt

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerCandidateHistory(unittest.TestCase):
    def test_registry_and_current_applied_product_boundaries(self):
        child = subprocess.run(['node', 'tests/dialog_caller_history_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['registered_modules'], 3)
        self.assertEqual(result['original_cases'], 3)
        self.assertEqual(result['separate_current_applied_test_programs'], 2)
        self.assertEqual(result['metadata_corruptions_rejected'], 7)
        self.assertEqual(result['late_changes_rejected'], 2)
        self.assertEqual(result['invalid_selectors_rejected'], 2)
        self.assertTrue(result['current_product_still_applied'])
        self.assertTrue(result['existing_historical_runner_bytes_preserved'])
        self.assertEqual(result['original_cases_executed'], 0)

    def test_partial_missing_or_forged_receipts_never_satisfy_wrappers(self):
        data, _, _, _ = candidate_history_inputs(ROOT)
        receipt = dict(line=data['line'], id=data['id'], complete_registered_module_set=True,
                       selected_modules=[entry['module'] for entry in data['entries']], case_ids=data['case_ids'],
                       current_guard_passed_before_and_after=True, original_program_unchanged=True,
                       historical_post_execution_clean=True, temporary_graph_removed=True,
                       actual_current_source_native_packed_or_floor_qualified=False, g11_claim='not-passed')
        validate_candidate_history_receipt(data, receipt)
        mutations = [lambda r: r.update(complete_registered_module_set=False), lambda r: r['case_ids'].pop(),
                     lambda r: r['selected_modules'].pop(), lambda r: r.update(original_program_unchanged=False),
                     lambda r: r.update(current_guard_passed_before_and_after=False),
                     lambda r: r.update(historical_post_execution_clean=False),
                     lambda r: r.update(temporary_graph_removed=False),
                     lambda r: r.update(actual_current_source_native_packed_or_floor_qualified=True),
                     lambda r: r.update(g11_claim='passed')]
        for mutate in mutations:
            bad = copy.deepcopy(receipt)
            mutate(bad)
            with self.assertRaises(AssertionError):
                validate_candidate_history_receipt(data, bad)

    def test_all_original_programs_and_standard_case_names_are_preserved(self):
        data, prior, _, _ = candidate_history_inputs(ROOT)
        for entry in data['entries']:
            original = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                               'show', data['frame']['commit'] + ':' + entry['program']], cwd=ROOT)
            self.assertEqual(hashlib.sha256(original).hexdigest(), entry['program_sha256'])
            captured = next(member for member in prior['preimages'] if member['path'] == entry['program'])
            self.assertEqual(captured['text'].encode(), original)
            original_tree = ast.parse(original)
            current_tree = ast.parse((ROOT / entry['program']).read_text())
            def ids(tree):
                return [entry['module'] + '.' + cls.name + '.' + method.name
                        for cls in tree.body if isinstance(cls, ast.ClassDef)
                        for method in cls.body if isinstance(method, ast.FunctionDef) and method.name.startswith('test_')]
            self.assertEqual(ids(original_tree), entry['case_ids'])
            self.assertEqual(ids(current_tree), entry['case_ids'])
            def collected(suite):
                result = []
                for item in suite:
                    if isinstance(item, unittest.TestSuite):
                        result.extend(collected(item))
                    else:
                        result.append(item.id())
                return result
            self.assertEqual(collected(unittest.TestLoader().loadTestsFromName(entry['module'])), entry['case_ids'])
            discovered = collected(unittest.TestLoader().discover(str(ROOT / 'tests'), pattern=Path(entry['program']).name))
            self.assertEqual([canonical_recorded_case(entry, case) for case in discovered], entry['case_ids'])
            for case in entry['case_ids']:
                self.assertEqual(canonical_recorded_case(entry, case.removeprefix('tests.')), case)


if __name__ == '__main__':
    unittest.main()
