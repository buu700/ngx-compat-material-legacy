# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Check class current wrapper lineage and retained source obligations."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


class ClassCurrentWrapperRouting(unittest.TestCase):
    def test_lineage_and_retained_obligations(self):
        report = json.loads((ROOT / 'compatibility/rc/change-detector-current-wrapper-routing-5628.json').read_text())
        self.assertEqual((report['line'], report['node'], report['git']), ('main', 'v24.21.0', 'git version 2.55.0'))
        row = report['wrapper']
        self.assertEqual(row['path'], 'tests/test_change_detector_uses.py')
        self.assertEqual(row['previous_commit'], 'cdee8672eb721a4e9c9b72caabb3ddcc6b41bab2')
        old = subprocess.check_output(['git', '--no-replace-objects', 'show', row['previous_commit'] + ':' + row['path']], cwd=ROOT)
        current = (ROOT / row['path']).read_bytes()
        diff = subprocess.check_output(['git', '--no-replace-objects', 'diff', '--no-ext-diff', '--no-renames', row['previous_commit'], '--', row['path']], cwd=ROOT)
        self.assertEqual((sha(old), sha(current), sha(diff)), (row['previous_sha256'], row['current_sha256'], row['full_diff_sha256']))
        self.assertEqual(diff.decode(), row['full_diff'])
        helper = report['helper_transition']
        out = subprocess.run(['git', 'diff', '--no-index', '--', helper['prior'], helper['current']], cwd=ROOT, capture_output=True)
        self.assertEqual(out.returncode, 1)
        self.assertEqual((sha(out.stdout), out.stdout.decode()), (helper['full_diff_sha256'], helper['full_diff']))
        self.assertEqual(len(report['evidence']), 5)
        for item in report['evidence']:
            self.assertEqual(sha((ROOT / item['path']).read_bytes()), item['sha256'])
        data = json.loads((ROOT / 'compatibility/rc/change-detector-current-5628-diagnostic-v3.json').read_text())
        self.assertEqual((data['frozen_uses'], data['current_uses'], data['supplementary_uses']), (38, 42, 4))
        self.assertEqual(len(data['calls']), 100)
        self.assertTrue(data['prior_roles_and_call_counts_reconciled'])
        self.assertEqual(data['g11_claim'], 'not-passed')
