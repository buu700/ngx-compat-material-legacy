# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""OSV querybatch rows fail closed; this is not a live advisory lookup."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dependency_osv_schema', ROOT / 'scripts/check-dependency-eligibility.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class OsvBatchSchemaTests(unittest.TestCase):
    def test_valid_empty_and_independent_ids_remain_intact(self):
        rows, unresolved = m._vuln_rows([('one', '1.0.0'), ('two', '2.0.0')], [{}, {'vulns': [
            {'id': 'GHSA-example-one', 'modified': '2026-11-07T00:00:00Z'},
            {'id': 'CVE-2026-12345', 'modified': '2026-11-07T00:00:00Z'},
        ]}])
        self.assertEqual(rows['one@1.0.0']['vulns'], [])
        self.assertEqual([x['id'] for x in rows['two@2.0.0']['vulns']], ['GHSA-example-one', 'CVE-2026-12345'])
        self.assertEqual(unresolved, ['two@2.0.0', 'two@2.0.0'])

    def test_workspace_invalid_rows_never_become_empty_success(self):
        cases = [None, [], {'error': 'failed'}, {'unknown': 1}, {'vulns': None},
                 {'vulns': {}}, {'vulns': [None]}, {'vulns': [{}]}, {'vulns': [{'id': ''}]},
                 {'vulns': [{'id': 'same'}, {'id': 'same'}]}, {'vulns': [{'id': 'a', 'modified': 'wrong'}]},
                 {'vulns': [{'id': 'a', 'summary': 1}]}, {'next_page_token': 'more'},
                 {'vulns': [], 'next_page_token': ''}]
        for value in cases:
            with self.subTest(row=value):
                rows, unresolved = m._vuln_rows([('fixture', '1.0.0')], [value])
                self.assertEqual(rows, {})
                self.assertTrue(unresolved)
        for packages, results in [([('x', '1'), ('y', '2')], [{}]),
                                  ([('x', '1')], [{}, {}]),
                                  ([('x', '1'), ('x', '1')], [{}, {}])]:
            self.assertTrue(m._osv_workspace_batch_error(packages, results))

    def test_both_transports_reject_bad_envelopes(self):
        packages = [('x', '1.0.0')]
        subjects = {'queries': [{'id': 'npm/x@1.0.0', 'query': {'package': {'name': 'x', 'ecosystem': 'npm'}, 'version': '1.0.0'}}]}
        invalid = [None, {}, {'results': None}, {'results': []}, {'results': [{}, {}]},
                   {'results': [{}], 'error': 'failed'}, {'results': [{}], 'error': None},
                   {'results': [{}], 'unexpected': True}, {'results': [{}], 'next_page_token': 'more'}]
        for body in invalid:
            with self.subTest(body=body), patch.object(m, '_http_json', return_value=(200, body, '')):
                status, results, error = m._osv_batch(packages)
                self.assertEqual(status, 200)
                self.assertTrue(error)
                tool = m.query_tool_advisories(subjects)
                self.assertEqual(tool['result'], 'unknown')
                self.assertTrue(tool['error'])
        with patch.object(m, '_http_json', return_value=(200, {'results': [{}]}, '')):
            self.assertEqual(m._osv_batch(packages), (200, [{}], ''))
            self.assertEqual(m.query_tool_advisories(subjects)['result'], 'queried')

    def test_tool_batch_rejects_invalid_or_paginated_results(self):
        subjects = {'queries': [{'id': 'npm/x@1.0.0', 'query': {'package': {'name': 'x', 'ecosystem': 'npm'}, 'version': '1.0.0'}}]}
        for row in (None, {'error': 'failed'}, {'next_page_token': 'more'}, {'vulns': [{'id': ''}]}):
            with self.subTest(row=row), patch.object(m, '_http_json', return_value=(200, {'results': [row]}, '')):
                result = m.query_tool_advisories(subjects)
                self.assertEqual(result['result'], 'unknown')
                self.assertEqual(result['uncovered'], ['npm/x@1.0.0'])
        with patch.object(m, '_http_json', return_value=(200, {'results': [{}]}, '')):
            self.assertEqual(m.query_tool_advisories(subjects)['result'], 'queried')

    def test_complete_producer_marks_malformed_batch_unknown(self):
        from contextlib import ExitStack
        from datetime import datetime, timedelta, timezone
        now = datetime(2026, 11, 7, tzinfo=timezone.utc)
        tool = {'result': 'queried', 'http_status': 200, 'rows': [], 'uncovered': [], 'error': ''}
        cases = [(None, False), ({'error': 'failed'}, False), ({'next_page_token': 'more'}, False),
                 ({'vulns': [{'id': ''}]}, False), ({}, True), ('envelope-error', False),
                 ('envelope-extra', False)]
        real_batch = m._osv_batch
        for bad, valid in cases:
            def fake_batch(packages, capture=None):
                results = [bad] + [{} for _ in range(len(packages) - 1)]
                if bad in ('envelope-error', 'envelope-extra'):
                    results = [{} for _ in packages]
                    body = {'results': results, ('error' if bad == 'envelope-error' else 'unknown'): 'failed'}
                    with patch.object(m, '_http_json', return_value=(200, body, '')):
                        return real_batch(packages, capture)
                if capture is not None:
                    capture.update(queries=[{'package': {'name': n, 'ecosystem': 'npm'}, 'version': v} for n, v in packages])
                return 200, results, ''
            mocks = [
                patch.object(m, 'physical_subject_binding', return_value={'line': 'main', 'fixture': True}),
                patch.object(m, 'lock_packages', return_value=[('fixture', '1.0.0')]),
                patch.object(m, 'tool_advisory_subjects', return_value={'queries': []}),
                patch.object(m, 'query_tool_advisories', return_value=tool),
                patch.object(m, '_osv_batch', side_effect=fake_batch),
                patch.object(m, '_npm_publish_time', return_value=(now - timedelta(days=30), '')),
                patch.object(m, '_node_publish_time', return_value=(now - timedelta(days=30), '')),
                patch.object(m, 'assess_age_exceptions', return_value={'active': {}, 'expired': [], 'problems': []}),
                patch.object(m, 'load_finding_dispositions', return_value={}),
                patch.object(m, 'refresh_exception_patch_status'),
                patch.object(m, 'tool_advisory_coverage_ok', return_value=True),
                patch.object(m, 'classify_tool_findings', return_value={'unresolved': [], 'errors': []}),
            ]
            with self.subTest(row=bad), ExitStack() as stack:
                for item in mocks:
                    stack.enter_context(item)
                live = m.perform_lookup(ROOT, now)
            if valid:
                self.assertEqual(live['result'], 'queried')
                self.assertEqual(live['rows']['fixture@1.0.0']['vulns'], [])
                self.assertFalse(live['uncovered'])
            else:
                self.assertEqual(live['result'], 'unknown')
                expected = 'advisory batch' if isinstance(bad, str) else 'advisory batch row 0'
                self.assertIn(expected, live['lookup_evidence']['osv']['result_error'])
                self.assertEqual(live['rows'], {})
                self.assertTrue(live['uncovered'])
                self.assertFalse(live['vendor_ok'])

    def test_returned_withdrawn_and_other_ids_are_not_suppressed(self):
        record = json.loads((ROOT / 'compatibility/rc/dependency-dispositions/braces-3.0.3.json').read_bytes())
        record['_dependency_scope_ok'] = True
        from datetime import datetime, timezone
        now = datetime(2026, 11, 7, tzinfo=timezone.utc)
        for ids in (['GHSA-vfj7-8cjw-p6xm'], ['GHSA-other-test'], ['GHSA-vfj7-8cjw-p6xm', 'GHSA-other-test']):
            rows, unresolved = m._vuln_rows([('braces', '3.0.3')], [{'vulns': [{'id': x} for x in ids]}])
            result = m.classify_live_findings(rows, unresolved, {'braces@3.0.3': [record]}, now)
            self.assertEqual(result['unresolved'], ['braces@3.0.3'])
            self.assertEqual(result['excepted'], [])


if __name__ == '__main__':
    unittest.main()
