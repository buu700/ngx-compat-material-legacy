"""Complete slider-input patches cannot borrow legacy-source applicability."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SliderInputScopeTests(unittest.TestCase):
    def test_original_contexts_and_applicability_counterexamples(self):
        run = subprocess.run(['node', 'tests/upstream_slider_input_scope_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['reviewed_shas'], 3)
        self.assertEqual(report['full_changed_files'], 8)
        self.assertEqual(report['retained_original_contexts'], 8)
        self.assertEqual(report['negative_controls'], 20)
        self.assertFalse(report['native_iOS_browser_or_packed_qualified'])

    def test_shipped_checker_rejects_missing_public_guard_and_test_hunks(self):
        path = 'compatibility/f10/disposition-ledger/evidence/closeout-three-slider-input-source-review.json'
        body = json.loads((ROOT / path).read_text())
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        with tempfile.TemporaryDirectory(prefix='.slider-input-review-', dir=ROOT) as directory:
            temporary = Path(directory)
            baseline = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--admission', '--line', body['line'], '--report', str(temporary / 'baseline.json')],
                cwd=ROOT, capture_output=True, text=True)
            self.assertIn(baseline.returncode, [0, 1], baseline.stderr)
            baseline_report = json.loads(baseline.stdout)
            body['reviews'][0]['paths'] = [p for p in body['reviews'][0]['paths']
                if not p.endswith('.spec.ts') and not p.startswith('tools/')]
            altered = temporary / 'altered.json'
            altered.write_text(json.dumps(body))
            for entry in ledger['entries']:
                if entry['sha'] in [r['sha'] for r in body['reviews']]:
                    entry['evidence_report'] = str(altered.relative_to(ROOT))
            candidate = temporary / 'ledger.json'
            candidate.write_text(json.dumps(ledger))
            run = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--admission', '--line', body['line'], '--ledger', str(candidate),
                '--report', str(temporary / 'observed.json')], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(run.returncode, 1)
            observed = json.loads(run.stdout)
            # Only the first commit lost hunks; the two complete reviews remain valid.
            self.assertEqual(observed['missing_evidence'], baseline_report['missing_evidence'] + 1)
            self.assertEqual(observed['g11_claim'], 'not-passed')
