# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original collector programs, exact wrappers, and closed receipts."""
import ast
import copy
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.packed_collector_history import _inputs, PINS, validate_complete_collector_receipt

ROOT = Path(__file__).resolve().parents[1]


class PackedCollectorHistory(unittest.TestCase):
    def test_registry_source_and_receipt_corruption_controls(self):
        command = ['node', 'tests/packed_collector_history_probe.mjs']
        if os.environ.get('NGX_PACKED_COLLECTOR_HISTORY_DIAGNOSTIC'):
            command.append(os.environ['NGX_PACKED_COLLECTOR_HISTORY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['rejection_controls'], 62)
        self.assertEqual(report['original_methods'], 10)
        self.assertEqual(report['current_collector_writer_probe_and_contract_identity_count'], 14)
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])

    def test_all_original_methods_remain_and_four_current_bodies_are_unchanged(self):
        data, prior, _, _ = _inputs(ROOT); changed = 0; current = 0
        for entry in data['entries']:
            original = next(m for m in prior['originals'] if m['path'] == entry['program'])
            before = original['text']; after = (ROOT/entry['program']).read_text(); expected = before
            for start, end in original['substitutions']:
                self.assertEqual(expected.count(start), 1); expected = expected.replace(start, end)
            self.assertEqual(after, expected)
            methods = lambda s: {n.name: ast.get_source_segment(s, n) for n in ast.walk(ast.parse(s))
                                 if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')}
            a, b = methods(before), methods(after)
            self.assertEqual(set(a), set(b))
            for name in a:
                if entry['delegated_case_id'].endswith('.'+name):
                    self.assertNotEqual(a[name], b[name]); changed += 1
                else:
                    self.assertEqual(a[name], b[name]); current += 1
        self.assertEqual(changed, 6); self.assertEqual(current, 4)

    def test_complete_outer_receipt_and_late_current_mutations(self):
        data, _, _, _ = _inputs(ROOT)
        good = dict(line=data['line'], id=data['id'], inputs_sha256=PINS[data['line']],
                    case_ids=data['case_ids'], current_collector_writer_probe_and_contract_identity_count=14,
                    current_guard_passed_before_and_after=True, packed_check_unchanged=True,
                    original_programs_unchanged=True, historical_post_execution_clean=True,
                    temporary_graph_removed=True, actual_current_source_native_packed_or_floor_qualified=False,
                    g11_claim='not-passed', node_observations=[dict(probe=e['probe'],
                    summary=dict(line=data['line'], derived_cases=106, actual_native_executed=False)) for e in data['entries']])
        validate_complete_collector_receipt(data, good)
        mutations = [lambda r: r.update(line='foreign'), lambda r: r.update(id='foreign'),
                     lambda r: r.update(inputs_sha256='0'*64), lambda r: r['case_ids'].pop(),
                     lambda r: r['node_observations'].pop(), lambda r: r['node_observations'][0].update(probe='foreign'),
                     lambda r: r['node_observations'][0]['summary'].update(derived_cases=105),
                     lambda r: r['node_observations'][0]['summary'].update(actual_native_executed=True),
                     lambda r: r.update(current_collector_writer_probe_and_contract_identity_count=13),
                     lambda r: r.update(g11_claim='passed'),
                     lambda r: r.update(actual_current_source_native_packed_or_floor_qualified=True)]
        for key in ['current_guard_passed_before_and_after', 'packed_check_unchanged', 'original_programs_unchanged',
                    'historical_post_execution_clean', 'temporary_graph_removed']:
            mutations.append(lambda r, key=key: r.update({key: False}))
        for mutate in mutations:
            bad = copy.deepcopy(good); mutate(bad)
            with self.assertRaises(AssertionError): validate_complete_collector_receipt(data, bad)
        from tests import packed_collector_history as helper
        from unittest.mock import patch
        # Even a previously successful cached execution cannot bypass fresh
        # source, wrapper, matrix, prior or registry validation.
        original_raw = helper._raw
        with patch.object(helper, '_execute', return_value=json.dumps(good)) as cached:
            helper.assert_recorded_collector_case(self, ROOT, data['entries'][0]['delegated_case_id'])
            for path in [data['current_identical_subjects'][0]['path'], data['entries'][0]['program'],
                         data['matrix']['path'], data['protected'][0]['path'], data['prior']['path'], helper.INPUT]:
                def altered(root, member, path=path):
                    raw = original_raw(root, member)
                    return raw + b'\n' if member == path else raw
                with patch.object(helper, '_raw', side_effect=altered), self.assertRaises(AssertionError):
                    helper.assert_recorded_collector_case(self, ROOT, data['entries'][0]['delegated_case_id'])
            self.assertEqual(cached.call_count, 1)

    def test_cli_rejects_selectors_and_missing_report_argument(self):
        for args in [['--family', 'radio-identity'], ['--report'], ['foreign']]:
            child = subprocess.run(['node', 'scripts/run-packed-collector-history.mjs', *args],
                                   cwd=ROOT, capture_output=True, text=True, timeout=30)
            self.assertEqual(child.returncode, 2)


if __name__ == '__main__':
    unittest.main()
