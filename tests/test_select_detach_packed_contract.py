# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real-scroll observations cannot be replaced by presence or callback markers."""
import json
import hashlib
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectDetachPackedContractTests(unittest.TestCase):
    def test_stale_source_proof_is_preserved_and_neither_line_is_closed(self):
        sha = '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e'
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        entry = next(row for row in ledger['entries'] if row['sha'] == sha)
        self.assertEqual(entry['final_disposition'], 'needs-individual-review')
        self.assertNotIn('individual_proof', entry)
        report = json.loads((ROOT / entry['evidence_report']).read_text())
        self.assertEqual(report['sha'], sha)
        self.assertEqual(report['status'], 'pending')
        self.assertFalse(report['actual_packed_or_native_executed'])
        patch = (ROOT / report['patch_file']).read_bytes()
        self.assertEqual(hashlib.sha256(patch).hexdigest(), report['diff_sha256'])
        self.assertEqual(report['diff_sha256'], 'b443861e8eabbfa6c7613fc26349a89e59d2b364493d426461957beb247b691a')
        self.assertEqual(report['complete_original_files'], [
            'src/material/select/select.html', 'src/material/select/select.spec.ts'])
        self.assertIn(b'overlay.scrollStrategies.close()', patch)
        self.assertIn(b'scrolledSubject.next()', patch)
        self.assertIn(b'expect(select.panelOpen).toBe(false)', patch)
        owned = ROOT / report['owned_context']['path']
        self.assertEqual(hashlib.sha256(owned.read_bytes()).hexdigest(), report['owned_context']['sha256'])
        self.assertIn('(detach)="close()"', owned.read_text())
        prior = report['prior_entry']
        if report['line'] == 'main':
            self.assertEqual(prior['final_disposition'], 'already-adapted')
            self.assertNotEqual(prior['individual_proof']['candidate_member']['sha256'],
                report['owned_context']['sha256'])
        else:
            self.assertEqual(report['line'], '21.x')
            self.assertEqual(prior['final_disposition'], 'needs-individual-review')
            self.assertNotIn('individual_proof', prior)

    def test_actual_collector_writer_and_original_source_guards(self):
        result = subprocess.run(['node', 'tests/select_detach_packed_contract_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('derived_cases', 106), ('retained_previous_cases', 104),
                ('negative_cases', 245), ('collector_mutants', 3), ('writer_cases', 3),
                ('source_reversal_negative_controls', 62)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_scroll_or_components_executed'])
        self.assertFalse(observed['native_browser_executed'])
