# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Check current NgZone forwarding lineage and narrow resolver exception."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


class NgZoneCurrentWrapperRouting(unittest.TestCase):
    def test_lineage_and_resolver_scope(self):
        report = json.loads((ROOT / 'compatibility/rc/ng-zone-forwarding-current-wrapper-routing-5628.json').read_text())
        self.assertEqual((report['line'], report['node'], report['git']), ('main', 'v24.21.0', 'git version 2.55.0'))
        row = report['wrapper']
        self.assertEqual(row['path'], 'tests/test_ng_zone_forwarding.py')
        self.assertEqual(row['previous_commit'], 'cdee8672eb721a4e9c9b72caabb3ddcc6b41bab2')
        old = subprocess.check_output(['git', '--no-replace-objects', 'show', row['previous_commit'] + ':' + row['path']], cwd=ROOT)
        current = (ROOT / row['path']).read_bytes()
        diff = subprocess.check_output(['git', '--no-replace-objects', 'diff', '--no-ext-diff', '--no-renames', row['previous_commit'], '--', row['path']], cwd=ROOT)
        self.assertEqual((sha(old), sha(current), sha(diff)), (row['previous_sha256'], row['current_sha256'], row['full_diff_sha256']))
        self.assertEqual(diff.decode(), row['full_diff'])
        self.assertEqual(len(report['transitions']), 4)
        for transition in report['transitions']:
            out = subprocess.run(['git', 'diff', '--no-index', '--', transition['prior'], transition['current']], cwd=ROOT, capture_output=True)
            self.assertEqual(out.returncode, 1)
            self.assertEqual((sha(out.stdout), out.stdout.decode()), (transition['full_diff_sha256'], transition['full_diff']))
        self.assertEqual(len(report['evidence']), 11)
        for item in report['evidence']:
            self.assertEqual(sha((ROOT / item['path']).read_bytes()), item['sha256'])
        data = json.loads((ROOT / 'compatibility/rc/ng-zone-forwarding-current-5628-diagnostic-v3.json').read_text())
        self.assertEqual((len(data['cases']), len(data['results']), len(data['source_controls'])), (8, 10, 10))
        checkbox = next(x for x in data['cases'] if x['file'] == 'legacy-checkbox/checkbox.ts')
        self.assertFalse(checkbox['constructor_and_field_initialization_match'])
        self.assertTrue(checkbox['constructor_except_owned_resolver_matches'])
        self.assertTrue(all(len(x['cases']) == 8 and len(x['mutations']) == 24 for x in data['results']))
        self.assertTrue(all(not x['native_or_packed_qualified'] for x in data['results']))
