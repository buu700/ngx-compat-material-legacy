# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current authored peer routes cannot disappear behind the frozen denominator."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentAuthoredUseInventoryTests(unittest.TestCase):
    def test_discovery_binding_and_both_actual_admission_predicates(self):
        result = subprocess.run(['node', 'tests/current_authored_use_inventory_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['fixture_discovered_routes'], 12)
        self.assertEqual(observed['whole_discovery_mutants_rejected'], 3)
        self.assertEqual(observed['admission_negative_controls'], 20)
        self.assertEqual(observed['shipped_admission_predicates'], 2)
        self.assertEqual(observed['shipped_predicate_mutants_detected'], 2)
        self.assertTrue(observed['positive_complete_source_bound_fixture'])
        self.assertFalse(observed['product_peer_or_component_runtime_qualified'])

    def test_actual_checker_reports_missing_new_route_and_preserves_frozen_roster(self):
        ledger = json.loads((ROOT / 'compatibility/f10/authored-dependency-current-dispositions.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            candidate = temporary / 'current-dispositions.json'
            report = temporary / 'admission.json'
            for omitted in [False, True]:
                body = {**ledger, 'symbol_uses': ledger['symbol_uses'][1:] if omitted else ledger['symbol_uses']}
                candidate.write_text(json.dumps(body))
                result = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                    '--admission', '--line', ledger['line'], '--current-symbols', str(candidate),
                    '--report', str(report)], cwd=ROOT, capture_output=True, text=True)
                self.assertIn(result.returncode, [0, 1], result.stdout + result.stderr)
                observed = json.loads(result.stdout)
                self.assertEqual(result.returncode,
                    0 if observed['disposition_admission'] == 'pass' else 1)
                if omitted:
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                live = observed['current_authored_use_inventory']
                self.assertEqual(live['inventory']['missing'], 1 if omitted else 0)
                self.assertEqual(live['inventory']['complete'], not omitted)
                self.assertEqual(live['additional_uses'], ledger['symbol_use_count'])
                self.assertEqual(observed['authored_use_inventory']['expected'], 1736)
                self.assertEqual(observed['authored_use_inventory']['observed'], 1736)
                self.assertEqual(observed['g11_claim'], 'not-passed')
                saved = json.loads(report.read_text())
                self.assertEqual(saved['current_authored_use_inventory'], live)
