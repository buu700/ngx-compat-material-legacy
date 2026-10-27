# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One source decision retains exact metadata, real compiler and owner checks."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests'))


class TokenBuildAdmissionTests(unittest.TestCase):
    def test_mandatory_scope_and_fresh_source(self):
        child = subprocess.run(['node', 'tests/token_build_admission_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        self.assertTrue(report['pure_metadata_without_filesystem_or_compiler_bindings'])
        self.assertTrue(report['positive_shared_scope_and_fresh_compiler'])
        self.assertEqual(report['rejection_controls'], 13)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])

    def test_independent_canonical_delta_and_mutations(self):
        from token_build_ledger_patch import verify_token_build_successor, LEDGER, SHA
        report = verify_token_build_successor()
        self.assertEqual(report['unselected_entry_bytes_preserved'], 1696)
        self.assertEqual(report['pending_dispositions'], 1339)
        original = json.loads((ROOT / LEDGER).read_bytes())
        with tempfile.TemporaryDirectory(prefix='ngx-token-build-delta-') as directory:
            candidate = Path(directory) / 'ledger.json'
            for fault in ('selected', 'unselected', 'header', 'clearance'):
                value = json.loads(json.dumps(original))
                if fault == 'selected':
                    del next(row for row in value['entries'] if row['sha'] == SHA)['individual_proof']['mdc_token_source_scope']
                elif fault == 'unselected':
                    next(row for row in value['entries'] if row['sha'] != SHA)['reason'] += ' unreviewed'
                elif fault == 'header':
                    value['open_or_deferred'] += 1
                else:
                    value['g11_claim'] = 'passed'
                candidate.write_text(json.dumps(value, indent=2) + '\n')
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_token_build_successor(candidate=candidate)

    def test_actual_shared_owner_and_root_checker(self):
        child = subprocess.run(['node', 'tests/token_build_ledger_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_source_admissions'], 27)
        self.assertEqual(report['previous_source_admissions'], 21)
        self.assertEqual(report['real_root_checker_positive'], 1)
        self.assertEqual(report['real_root_checker_rejections'], 3)
        self.assertEqual(report['rejection_controls'], 8)
        self.assertTrue(report['current_raw_reader_identity_preserved'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
