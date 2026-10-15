# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One complete modern visual-thumb fix cannot borrow a legacy runtime claim."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SHA = '41766330b6993628dc511bf8595b8d58dd495c22'


class SliderThumbDestroyTests(unittest.TestCase):
    def test_complete_subject_applicability_and_method_controls(self):
        command = ['node', 'tests/upstream_slider_thumb_destroy_probe.mjs']
        if os.environ.get('SLIDER_THUMB_DESTROY_DIAGNOSTIC'):
            command.append(os.environ['SLIDER_THUMB_DESTROY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        output = json.loads(child.stdout)
        self.assertEqual(output['full_changed_files'], 2)
        self.assertEqual(output['original_hunks'], 3)
        self.assertEqual(output['negative_controls'], 26)
        self.assertFalse(output['actual_constructors_Angular_views_native_packed_or_floor_execution'])

    def test_shipped_checker_rejects_omitted_spec_and_renamed_bypass(self):
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        entry = next(row for row in ledger['entries'] if row['sha'] == SHA)
        proof = json.loads((ROOT / entry['evidence_report']).read_text())
        with tempfile.TemporaryDirectory(prefix='.slider-thumb-review-', dir=ROOT) as temporary:
            directory = Path(temporary)
            for name in ['complete', 'missing-spec', 'renamed-bypass']:
                changed = copy.deepcopy(ledger)
                row = next(row for row in changed['entries'] if row['sha'] == SHA)
                body = copy.deepcopy(proof)
                if name != 'complete':
                    body['paths'].pop()
                if name == 'renamed-bypass':
                    body['role'] = 'generic-complete'
                    row['individual_proof']['proof_kind'] = 'complete-source-review'
                body_path = directory / (name + '-body.json')
                body_path.write_text(json.dumps(body))
                row['evidence_report'] = str(body_path.relative_to(ROOT))
                candidate = directory / (name + '-ledger.json')
                candidate.write_text(json.dumps(changed))
                child = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission',
                    '--line', proof['line'], '--ledger', str(candidate), '--report', str(directory / (name + '.json'))],
                    cwd=ROOT, text=True, capture_output=True)
                self.assertIn(child.returncode, [0, 1], child.stderr)
                report = json.loads((directory / (name + '.json')).read_text())
                failures = [r for r in report['evidence_failures'] if r['sha'] == SHA]
                self.assertEqual(bool(failures), name != 'complete', name)
                if failures:
                    self.assertEqual(failures[0]['reason'], 'invalid-slider-thumb-destroy-scope')
                self.assertEqual(report['g11_claim'], 'not-passed')
