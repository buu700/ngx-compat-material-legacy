"""Individual excluded test setup changes cannot borrow import-only admission."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = 'compatibility/f10/disposition-ledger/evidence/closeout-thirty-one-test-import-source-review.json'


class IndividualTestSetupTests(unittest.TestCase):
    def test_complete_source_operations_and_counterexamples(self):
        run = subprocess.run(['node', 'tests/upstream_individual_test_setup_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['individual_SHAs'], 6)
        self.assertEqual(report['complete_changed_files'], 20)
        self.assertEqual(report['checkbox_helper_calls'], 27)
        self.assertEqual(report['callback_wrappers'], 3)
        self.assertEqual(report['negative_controls'], 26)
        self.assertFalse(report['native_peer_setup_packed_or_floor_qualified'])

    def test_shipped_checker_rejects_unproved_closed_setup_review(self):
        body = json.loads((ROOT / EVIDENCE).read_text())
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        with tempfile.TemporaryDirectory(prefix='.individual-setup-', dir=ROOT) as directory:
            tmp = Path(directory)
            baseline = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--admission', '--line', body['line'], '--report', str(tmp / 'baseline.json')],
                cwd=ROOT, capture_output=True, text=True)
            self.assertIn(baseline.returncode, [0, 1], baseline.stdout + baseline.stderr)
            baseline_report = json.loads(baseline.stdout)
            candidate = copy.deepcopy(body)
            row = next(r for r in candidate['reviews'] if r.get('individual_setup_source_review'))
            del row['individual_setup_source_review']
            altered = tmp / 'review.json'
            altered.write_text(json.dumps(candidate))
            for row in ledger['entries']:
                if row['sha'] in {r['sha'] for r in body['reviews']}:
                    row['evidence_report'] = str(altered.relative_to(ROOT))
            ledger_file = tmp / 'ledger.json'
            ledger_file.write_text(json.dumps(ledger))
            observed = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--admission', '--line', body['line'], '--ledger', str(ledger_file),
                '--report', str(tmp / 'observed.json')], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(observed.returncode, 1, observed.stdout + observed.stderr)
            report = json.loads(observed.stdout)
            self.assertEqual(report['missing_evidence'], baseline_report['missing_evidence'] + 31)
            self.assertEqual(report['g11_claim'], 'not-passed')
