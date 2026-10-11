"""Full original test membership and a bounded import cleanup predicate."""
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


class TestImportCleanupTests(unittest.TestCase):
    def test_complete_subjects_and_program_mutations(self):
        run = subprocess.run(['node', 'tests/upstream_test_import_cleanup_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['subjects'], 31)
        self.assertEqual(report['complete_changed_files'], 79)
        self.assertEqual(report['qualified_SHAs'], 22)
        self.assertEqual(report['residual_SHAs'], 9)
        self.assertEqual(report['negative_controls'], 30)
        self.assertFalse(report['native_or_packed_qualified'])

    def test_shipped_checker_rejects_lost_membership_and_non_json_bypass(self):
        body = json.loads((ROOT / EVIDENCE).read_text())
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        slider_path = 'compatibility/f10/disposition-ledger/evidence/closeout-three-slider-input-source-review.json'
        slider = json.loads((ROOT / slider_path).read_text())
        with tempfile.TemporaryDirectory(prefix='.test-import-review-', dir=ROOT) as directory:
            tmp = Path(directory)
            def run(candidate=None, name='baseline'):
                args = ['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission',
                    '--line', body['line'], '--report', str(tmp / (name + '.json'))]
                if candidate is not None:
                    ledger_file = tmp / (name + '-ledger.json')
                    ledger_file.write_text(json.dumps(candidate))
                    args += ['--ledger', str(ledger_file)]
                result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
                self.assertIn(result.returncode, [0, 1], result.stdout + result.stderr)
                return result.returncode, json.loads(result.stdout)
            _, baseline = run()
            altered = copy.deepcopy(body)
            affected = next(r for r in altered['reviews'] if r['source_analysis']['recovered_seed_paths'])
            affected['paths'] = [p for p in affected['paths']
                if p not in affected['source_analysis']['recovered_seed_paths']]
            for name, report, extension, expected in [
                ('lost-example', altered, 'json', 31),
                ('test-json-bypass', body, 'txt', 31),
                ('slider-json-bypass', slider, 'txt', 3),
            ]:
                with self.subTest(name=name):
                    evidence_file = tmp / (name + '.' + extension)
                    evidence_file.write_text(json.dumps(report))
                    candidate = copy.deepcopy(ledger)
                    shas = {r['sha'] for r in report['reviews']}
                    for row in candidate['entries']:
                        if row['sha'] in shas:
                            row['evidence_report'] = str(evidence_file.relative_to(ROOT))
                    status, observed = run(candidate, name)
                    self.assertEqual(status, 1)
                    self.assertEqual(observed['missing_evidence'], baseline['missing_evidence'] + expected)
                    self.assertEqual(observed['g11_claim'], 'not-passed')
