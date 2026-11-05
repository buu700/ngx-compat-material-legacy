# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact fourteen-entry admission, unchanged old rows, and mandatory source dispatch."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RemainingUnthemableAdmissionTests(unittest.TestCase):
    def test_independent_transition_and_rejections(self):
        from remaining_unthemable_canonical_ledger_patch import derive_remaining_unthemable_successor, verify_remaining_unthemable_successor, SHAS
        from unthemable_ledger_patch import spans
        before, after = derive_remaining_unthemable_successor()
        text, _, ranges = spans(after)
        data = json.loads(after)
        with tempfile.TemporaryDirectory(prefix='ngx-theming-independent-') as directory:
            candidate = Path(directory) / 'candidate.json'
            candidate.write_bytes(after)
            report = verify_remaining_unthemable_successor(candidate)
            self.assertEqual(report['individual_decisions'], 14)
            self.assertEqual(report['unselected_entry_bytes_preserved'], 1683)
            self.assertEqual(report['security_reviews_unchanged'], 1)
            for fault in [*['entry-'+str(i)for i in range(14)], 'other-entry', 'proof', 'security', 'header', 'clearance']:
                changed = copy.deepcopy(data)
                if fault in ['header', 'clearance']:
                    key = 'closed_dispositions' if fault == 'header' else 'g11_claim'
                    changed[key] = 425 if fault == 'header' else 'passed'
                    old = '  "' + key + '": ' + json.dumps(data[key])
                    new = '  "' + key + '": ' + json.dumps(changed[key])
                    self.assertEqual(text[:text.index('"entries": [')].count(old), 1)
                    raw = text.replace(old, new, 1).encode()
                else:
                    if fault.startswith('entry-') or fault == 'proof':
                        sha = SHAS[int(fault.split('-')[1]) if fault.startswith('entry-') else 0]
                        i = next(i for i, row in enumerate(changed['entries']) if row['sha'] == sha)
                    elif fault == 'security':
                        i = next(i for i, row in enumerate(changed['entries']) if row['final_disposition'] == 'security-review')
                    else:
                        i = next(i for i, row in enumerate(changed['entries']) if row['sha'] not in SHAS)
                    row = changed['entries'][i]
                    if fault == 'proof':
                        row['individual_proof']['remaining_unthemable_source_scope']['handler']['sha256'] = '0' * 64
                    elif fault == 'security':
                        row['final_disposition'] = 'do-not-adopt'
                    else:
                        row['reason'] += ' altered'
                    start, end = ranges[i]
                    raw = (text[:start] + json.dumps(row, indent=2).replace('\n', '\n    ') + text[end:]).encode()
                self.assertEqual(json.loads(raw), changed, 'only the intended semantic fault')
                candidate.write_bytes(raw)
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_remaining_unthemable_successor(candidate)
        self.assertEqual(json.loads(before)['closed_dispositions'], 410)

    def test_current_source_and_real_root_checker(self):
        from remaining_unthemable_canonical_ledger_patch import SHAS
        destination = os.environ.get('REMAINING_UNTHEMABLE_ADMISSION_REPORT')
        phases = ['tools', *['source/' + sha for sha in SHAS], 'canonical', *['root/'+sha for sha in SHAS]]
        reports = []
        for phase in phases:
            output = ''
            if destination:
                path = Path(destination)
                output = str(path.with_name(path.stem + '-phase-' + phase.replace('/', '-') + '.json'))
            command = ['node', 'tests/remaining_unthemable_admission_probe.mjs', output, phase]
            start = time.monotonic()
            child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
            self.assertEqual(child.returncode, 0, phase + '\n' + (child.stdout + child.stderr)[-7000:])
            observed = json.loads(child.stdout)
            self.assertEqual(observed['phase'], phase)
            self.assertEqual(observed['result'], 'pass')
            observed['elapsed_seconds'] = round(time.monotonic() - start, 3)
            reports.append(observed)
            print(f'phase {phase}: pass ({observed["elapsed_seconds"]}s)', file=sys.stderr, flush=True)
        canonical=next(row for row in reports if row['phase']=='canonical')
        roots=[row for row in reports if row['phase'].startswith('root/')]
        self.assertEqual(len(roots),14)
        self.assertTrue(all(row['missing_source_requirement_mutant_detected']for row in roots))
        report = dict(canonical)
        report.update(phase='all-phases-complete', phase_results=[
            dict(phase=row['phase'], result=row['result'], elapsed_seconds=row['elapsed_seconds'])
            for row in reports])
        report['elapsed_seconds'] = round(sum(row['elapsed_seconds'] for row in reports), 3)
        for key in ['pure_metadata_cases', 'metadata_rejections', 'source_rejections',
                    'real_root_positive_rows', 'real_root_rejected_rows']:
            report[key] = sum(row[key] for row in reports)
        report['rejected'] = [item for row in reports for item in row['rejected']]
        report['late_original_patch_in_tool_role_rejected'] = reports[0]['late_original_patch_in_tool_role_rejected']
        report['missing_source_requirement_mutant_detected'] = all(row['missing_source_requirement_mutant_detected']for row in roots)
        report['canonical_phase_executed'] = canonical['canonical_phase_executed']
        report['root_phase_executed'] = all(row['root_phase_executed']for row in roots)
        self.assertEqual(report['pure_metadata_cases'], 14)
        self.assertEqual(report['metadata_rejections'], 308)
        self.assertEqual(report['source_rejections'], 196)
        self.assertEqual(report['historical_registered_source_contracts'], 67)
        from current_sass_canonical_test_scope import current_canonical_registry_subject
        registry_subject = current_canonical_registry_subject(ROOT)
        self.assertEqual(report['registered_source_contracts'], registry_subject['registered_source_contracts'])
        registry_subject['assert_current']()
        self.assertEqual(report['prior_registry_records_preserved'], 53)
        self.assertTrue(report['current_registry_tool_bindings_verified'])
        self.assertTrue(report['all_current_tool_bindings_retained'])
        self.assertTrue(report['late_original_patch_in_tool_role_rejected'])
        self.assertTrue(report['canonical_whole_body_fresh_source_checked'])
        self.assertEqual(report['canonical_bound_members'], 660)
        self.assertEqual(report['canonical_metadata_rejections'], 8)
        self.assertEqual(report['canonical_late_source_rejections'], 25)
        self.assertEqual(report['canonical_cache_or_guard_mutants_rejected'], 2)
        self.assertEqual(report['canonical_late_metadata_mutants_rejected'], 2)
        self.assertEqual(report['metadata_after_source_mutants_rejected'], 1)
        self.assertEqual(report['real_root_positive_rows'], 14)
        self.assertEqual(report['real_root_rejected_rows'], 56)
        self.assertTrue(report['missing_source_requirement_mutant_detected'])
        self.assertEqual(report['individual_decisions'], 14)
        self.assertEqual(report['unselected_entries_preserved'], 1683)
        self.assertEqual(len(report['rejected']), 626)
        self.assertEqual(len(set(report['rejected'])), 626)
        self.assertFalse(report['canonical_ledger_applied'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')
        if destination:
            with Path(destination).open('x') as handle:
                handle.write(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    unittest.main()
