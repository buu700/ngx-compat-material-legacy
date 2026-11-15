# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bind current InjectionToken census wrapper and historical identity evidence."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


class InjectionTokenCurrentWrapperRouting(unittest.TestCase):
    def test_lineage_and_named_identity_changes(self):
        report = json.loads((ROOT / 'compatibility/rc/injection-token-current-wrapper-routing-3962.json').read_text())
        self.assertEqual((report['line'], report['node'], report['git']), ('main', 'v24.21.0', 'git version 2.55.0'))
        row = report['wrapper']
        self.assertEqual(row['path'], 'tests/test_injection_token_uses.py')
        self.assertEqual(row['previous_commit'], '3962f7d302f63666b14ffab9d8c3b854eff776ce')
        old = subprocess.check_output(['git', '--no-replace-objects', 'show', row['previous_commit'] + ':' + row['path']], cwd=ROOT)
        current = (ROOT / row['path']).read_bytes()
        diff = subprocess.check_output(['git', '--no-replace-objects', 'diff', '--no-ext-diff', '--no-renames', row['previous_commit'], '--', row['path']], cwd=ROOT)
        self.assertEqual((sha(old), sha(current), sha(diff)), (row['previous_sha256'], row['current_sha256'], row['full_diff_sha256']))
        self.assertEqual(diff.decode(), row['full_diff'])
        helper = report['helper_transition']
        out = subprocess.run(['git', 'diff', '--no-index', '--', helper['prior'], helper['current']], cwd=ROOT, capture_output=True)
        self.assertEqual(out.returncode, 1)
        self.assertEqual((sha(out.stdout), out.stdout.decode()), (helper['full_diff_sha256'], helper['full_diff']))
        self.assertEqual(len(report['evidence']), 11)
        for item in report['evidence']:
            self.assertEqual(sha((ROOT / item['path']).read_bytes()), item['sha256'])
        current = json.loads((ROOT / 'compatibility/rc/injection-token-current-3962-diagnostic.json').read_text())
        self.assertTrue(current['prior_token_roles_reconciled'])
        self.assertEqual([x['distinct_identity_count'] for x in current['authored_tokens']], [27, 27, 27])
        self.assertEqual(current['g11_claim'], 'not-passed')
        proof = json.loads((ROOT / 'compatibility/rc/progress-token-identity-proof-3962.json').read_text())
        self.assertTrue(proof['current_legacy_alias_equals_public_peer'])
        self.assertTrue(proof['legacy_animation_mode_distinct'])
        self.assertEqual(len(proof['mutations']), 8)
        self.assertEqual(proof['g11_claim'], 'not-passed')
