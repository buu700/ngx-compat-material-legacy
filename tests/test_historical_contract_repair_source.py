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


if __name__ == '__main__':
    unittest.main()
