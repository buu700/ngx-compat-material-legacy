# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current ledger admission does not overwrite historical source evidence."""
import json
import hashlib
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
# A measured fresh qualification takes ~43s, including ~27s of real Sass
# compilation. This probe deliberately repeats fresh qualification for cold
# mutations and earlier complete states; it must not reuse admission success.
# Allow the complete control roster to finish in CI. Local iteration uses the
# bounded source-context and individual qualification probes instead.
RETAINED_LEDGER_TIMEOUT_SECONDS = 1800


class PackedUpstreamLedgerEpochTests(unittest.TestCase):
    def test_current_metadata_population_is_exact(self):
        raw=(ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes()
        ledger=json.loads(raw);entries=ledger['entries']
        closed={'irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present'}
        pending={'open','needs-individual-review','security-review'}
        self.assertEqual(len(entries),1697)
        self.assertEqual(len({r['sha'] for r in entries}),1697)
        self.assertTrue(all(r['final_disposition'] in closed|pending for r in entries))
        self.assertEqual(ledger['closed_dispositions'],sum(r['final_disposition'] in closed for r in entries))
        self.assertEqual(ledger['open_or_deferred'],sum(r['final_disposition'] in pending for r in entries))
        self.assertEqual(ledger['g11_claim'],'not-passed')
        manifest=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())
        if manifest['version'].startswith('21.'):
            worksheet=json.loads((ROOT/'compatibility/rc/21x-remaining-disposition-worksheet.json').read_bytes())
            expected={r['sha'] for r in entries if r['final_disposition'] in pending}
            self.assertEqual(set(worksheet['selected_sha_ids']),expected)
            self.assertEqual(len(worksheet['selected_sha_ids']),len(expected))
            self.assertEqual(worksheet['unresolved_count'],len(expected))
            self.assertEqual(worksheet['selected_security_review_population'],sum(r['final_disposition']=='security-review' for r in entries))
            self.assertEqual(worksheet['ledger_subject']['sha256'],hashlib.sha256(raw).hexdigest())
            self.assertEqual(sum(group['entries'] for group in worksheet['main_reference_classes']),len(expected))
            self.assertEqual(worksheet['g11_claim'],'not-passed')

    def test_current_subjects_gate_the_exact_historical_ledger(self):
        result = subprocess.run(['node', 'tests/packed_upstream_ledger_epoch_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True,
                                timeout=RETAINED_LEDGER_TIMEOUT_SECONDS)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 14 if report['line'] == '21.x' else 13)
        self.assertEqual(len(report['rejected']), 62 if report['line'] == '21.x' else 56)
        self.assertEqual(report['original_dispositions_changed'], 41 if report['line'] == '21.x' else 13)
        self.assertEqual(report['selection_source_decisions'], 3)
        self.assertEqual(report['selection_registry_digest_updates'], 11)
        if report['line'] == '21.x':
            self.assertEqual(report['complete_ledger_frames'],21)
            self.assertEqual(report['title_source_decisions'],1)
            self.assertEqual(report['title_registry_metadata_tokens'],14)
        self.assertEqual(report['canonical_entries'], 1697)
        self.assertEqual(report['changed_scalar_tokens'], 179)
        self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])
