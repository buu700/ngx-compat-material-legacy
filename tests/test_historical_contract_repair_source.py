# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent derived references and false-success controls; no Node pass marker."""
from pathlib import Path
import json
import unittest
from unittest.mock import patch
import historical_contract_repair_source as subject

ROOT = Path(__file__).resolve().parents[1]


class HistoricalContractRepairReferenceTests(unittest.TestCase):
    def test_all_five_sources_and_narrowed_api_are_independently_derived(self):
        data = json.loads((ROOT / subject.SOURCE).read_bytes())
        for row in data['images']:
            for side in ['before', 'after']:
                value = {'path': row['path'], **row[side], 'annotation': 'retained'}
                expected = {'path': row['path'], **row['after'], 'annotation': 'retained'}
                self.assertEqual(subject.qualify_source_reference(value), expected)
        unselected = {'path': 'projects/ngx-material-legacy/_index.scss', 'sha256': '0' * 64}
        self.assertEqual(subject.qualify_source_reference(unselected), unselected)

    def test_source_unknown_hash_or_size_cannot_advance(self):
        data = json.loads((ROOT / subject.SOURCE).read_bytes())
        for row in data['images']:
            for bad in [{'path': row['path'], **row['before'], 'sha256': '0' * 64},
                        {'path': row['path'], **row['before'], 'bytes': row['before']['bytes'] + 1}]:
                with self.assertRaises(AssertionError):
                    subject.qualify_source_reference(bad)

    def test_all_tool_literals_and_original_comparison_bytes(self):
        data = json.loads((ROOT / subject.READERS).read_bytes())
        for row in data['tool_transitions']:
            for side in ['before', 'after']:
                value = {'path': row['path'], **row[side]}
                self.assertEqual(subject.qualify_tool_reference(value), {'path': row['path'], **row['after']})
                comparison = subject.tool_comparison_bytes(value)
                self.assertEqual(subject.digest(comparison), row[side]['sha256'])
                self.assertEqual(len(comparison), row[side]['bytes'])
            with self.assertRaises(AssertionError):
                subject.qualify_tool_reference({'path': row['path'], 'sha256': '0' * 64})

    def test_changed_registry_and_actual_source_or_tool_are_rejected(self):
        source = json.loads((ROOT / subject.SOURCE).read_bytes())['images'][0]
        tool = json.loads((ROOT / subject.READERS).read_bytes())['tool_transitions'][0]
        saved = subject._read
        for path, action in [
                (subject.SOURCE, lambda: subject.qualify_source_reference({'path': source['path'], **source['before']})),
                (subject.READERS, lambda: subject.qualify_tool_reference({'path': tool['path'], **tool['before']})),
                (source['path'], lambda: subject.qualify_source_reference({'path': source['path'], **source['before']})),
                (tool['path'], lambda: subject.qualify_tool_reference({'path': tool['path'], **tool['before']}))]:
            def altered(root, candidate, selected=path):
                raw = saved(root, candidate)
                return raw + b'\n/* changed bytes */\n' if candidate == selected else raw
            with patch.object(subject, '_read', altered):
                with self.assertRaises(AssertionError):
                    action()

    def test_owner_lane_extension_preserves_prior_rows_and_exact_intermediate(self):
        data = subject._tool_data(ROOT)
        if data['extension_kind'] == 'spinner-snack-c04-source':
            current = data
            data = subject._prior_c04_registry(ROOT, data)
            self.assertEqual(current['tool_transitions'][:17], data['tool_transitions'])
        prior_ref = data['prior_reader_registry']
        prior_raw = subject._original(str(ROOT), prior_ref['source_parent'], subject.READERS)
        prior = json.loads(prior_raw)
        self.assertEqual(len(prior['tool_transitions']), 15)
        unchanged = 0
        for old in prior['tool_transitions']:
            current = next(row for row in data['tool_transitions'] if row['path'] == old['path'])
            if old['path'] == 'scripts/packed-upstream-ledger-epoch.mjs':
                value = {'path': old['path'], **old['after'], 'annotation': 'retained'}
                self.assertEqual(subject.qualify_tool_reference(value),
                                 {'path': old['path'], **current['after'], 'annotation': 'retained'})
                comparison = subject.tool_comparison_bytes(value)
                self.assertEqual(subject.digest(comparison), old['after']['sha256'])
                self.assertEqual(len(comparison), 74930)
            else:
                self.assertEqual(current, old)
                unchanged += 1
        self.assertEqual(unchanged, 14)

    def test_only_authenticated_epoch_intermediate_can_advance(self):
        data = subject._tool_data(ROOT)
        row = next(row for row in data['tool_transitions']
                   if row['path'] == 'scripts/packed-upstream-ledger-epoch.mjs')
        middle = {'path': row['path'], 'sha256': '34a8c062367debddf81a5112be37e4aa603e4a3c6b9c8e5c7c34144995d62669', 'bytes': 74930}
        for action in [subject.qualify_tool_reference, subject.tool_comparison_bytes]:
            with self.assertRaises(AssertionError):
                action({**middle, 'bytes': 74931})
        before = subject._original(str(ROOT), row.get('source_parent', data['source_parent']), row['path']).decode()
        unknown = None
        for edit in row['literal_edits']:
            before = before.replace(edit['before'], edit['after'])
            digest = subject.digest(before.encode())
            if digest not in [row['before']['sha256'], row['after']['sha256'], middle['sha256']]:
                unknown = {'path': row['path'], 'sha256': digest, 'bytes': len(before.encode())}
                break
        self.assertIsNotNone(unknown)
        for action in [subject.qualify_tool_reference, subject.tool_comparison_bytes]:
            with self.assertRaises(AssertionError):
                action(unknown)
        saved = subject._original
        def changed_prior(root, parent, path):
            raw = saved(root, parent, path)
            return raw + b'\n' if path == subject.READERS else raw
        with patch.object(subject, '_original', changed_prior):
            for action in [subject.qualify_tool_reference, subject.tool_comparison_bytes]:
                with self.assertRaises(AssertionError):
                    action(middle)


    def test_c04_source_successor_preserves_exact_prior_rows_and_two_physical_images(self):
        data = subject._tool_data(ROOT)
        self.assertEqual(data['extension_kind'], 'spinner-snack-c04-source')
        prior = subject._prior_c04_registry(ROOT, data)
        self.assertEqual(data['tool_transitions'][:17], prior['tool_transitions'])
        self.assertEqual(len(data['tool_transitions']), 45)
        self.assertEqual(len(data['support_inputs']), 4)
        packet = json.loads((ROOT / 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json').read_bytes())
        for row in packet['branches']['21.x']['modules']:
            for side in ['before', 'current']:
                value = {'path': row['path'], **row[side], 'role': 'historical-source-comparison'}
                current = subject.qualify_spinner_snack_source_reference(value)
                self.assertEqual(current['sha256'], row['current']['sha256'])
                self.assertEqual(current['bytes'], row['current']['bytes'])
                self.assertEqual(current['role'], value['role'])
            for change in [{'sha256': '0' * 64}, {'bytes': row['before']['bytes'] + 1}]:
                with self.assertRaises(AssertionError):
                    subject.qualify_spinner_snack_source_reference({'path': row['path'], **row['before'], **change})
        saved = subject._read
        for ref in data['support_inputs']:
            def altered(root, path, selected=ref['path']):
                raw = saved(root, path)
                return raw + b'\n' if path == selected else raw
            with patch.object(subject, '_read', altered):
                with self.assertRaises(AssertionError):
                    subject._tool_data(ROOT)

if __name__ == '__main__':
    unittest.main()
