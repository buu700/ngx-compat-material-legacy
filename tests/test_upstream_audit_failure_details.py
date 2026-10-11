#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Branch-independent negative coverage for the shipped upstream diagnostic roster."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class UpstreamAuditFailureDetailsTests(unittest.TestCase):
    def test_failure_details_name_exact_sha_and_reason(self):
        version = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version']
        line = '21.x' if version.startswith('21.') else 'main'
        missing_sha, unsafe_sha = '1' * 40, 'f' * 40
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            seed, ledger, report = [directory / name for name in ['seed.json', 'ledger.json', 'report.json']]
            seed.write_text(json.dumps({'commits': [{'sha': missing_sha}, {'sha': unsafe_sha}]}))
            ledger.write_text(json.dumps({'entries': [
                {'sha': missing_sha, 'final_disposition': 'irrelevant',
                 'evidence_report': 'compatibility/f10/disposition-ledger/evidence/no-such-detail-fixture.json'},
                {'sha': unsafe_sha, 'final_disposition': 'irrelevant', 'evidence_report': '../outside-evidence.json'},
            ]}))
            result = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--seed', str(seed), '--ledger', str(ledger), '--report', str(report),
                '--admission', '--line', line], cwd=ROOT, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
            body = json.loads(report.read_text())
            self.assertEqual(body['missing_evidence'], 2)
            self.assertEqual(body['evidence_failures'], [
                {'sha': missing_sha, 'reason': 'missing-file',
                 'evidence_report': 'compatibility/f10/disposition-ledger/evidence/no-such-detail-fixture.json'},
                {'sha': unsafe_sha, 'reason': 'missing', 'evidence_report': '../outside-evidence.json'},
            ])
            for name, count in [('sensitive', 'insufficient_sensitive'), ('inherited', 'insufficient_inherited'),
                                ('behavior', 'insufficient_behavior'), ('branch_applicability', 'missing_branch_applicability')]:
                self.assertEqual(len(body['insufficient_review_sha_ids'][name]), body[count])
            self.assertEqual(body['disposition_admission'], 'incomplete')
            self.assertEqual(body['g11_claim'], 'not-passed')
