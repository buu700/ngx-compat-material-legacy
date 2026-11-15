# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bind historical/current wrapper transitions and current probe evidence."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'compatibility/rc/framework-current-wrapper-routing-5628.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


class FrameworkCurrentWrapperRouting(unittest.TestCase):
    def test_exact_wrapper_transition_and_current_evidence(self):
        report = json.loads(REPORT.read_text())
        self.assertEqual((report['line'], report['node'], report['git']),
                         ('main', 'v24.21.0', 'git version 2.55.0'))
        self.assertEqual(report['previous_commit'], 'cdee8672eb721a4e9c9b72caabb3ddcc6b41bab2')
        expected = {'tests/test_property_decorator_uses.py',
                    'tests/test_parameter_decorator_uses.py', 'tests/test_element_ref_uses.py'}
        self.assertEqual({row['path'] for row in report['wrappers']}, expected)
        self.assertEqual(len(report['wrappers']), 3)
        for row in report['wrappers']:
            old = subprocess.check_output(['git', '--no-replace-objects', 'show',
                                           row['previous_commit'] + ':' + row['path']], cwd=ROOT)
            current = (ROOT / row['path']).read_bytes()
            diff = subprocess.check_output(['git', '--no-replace-objects', 'diff', '--no-ext-diff',
                                            '--no-renames', row['previous_commit'], '--', row['path']], cwd=ROOT)
            self.assertEqual(sha(old), row['previous_sha256'])
            self.assertEqual(sha(current), row['current_sha256'])
            self.assertEqual(sha(diff), row['full_diff_sha256'])
            self.assertEqual(diff.decode(), row['full_diff'])
            self.assertEqual(row['exit_code'], 0)
        refs = report['current_evidence'] + [report['prior_current_source_failures']]
        self.assertEqual(len(refs), 10)
        for ref in refs:
            data = (ROOT / ref['path']).read_bytes()
            self.assertEqual(sha(data), ref['sha256'])
            self.assertNotEqual(sha(data + b'changed'), ref['sha256'])
        failures = json.loads((ROOT / report['prior_current_source_failures']['path']).read_text())
        self.assertEqual({x['test'] for x in failures['results']}, {Path(x).name for x in expected})
        self.assertTrue(all(x['exit_code'] != 0 for x in failures['results']))
