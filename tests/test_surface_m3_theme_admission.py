# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact three-entry admission, unchanged old rows, and mandatory source dispatch."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SurfaceM3ThemeAdmissionTests(unittest.TestCase):
    def test_independent_transition_and_rejections(self):
        from surface_m3_theme_canonical_ledger_patch import derive_surface_m3_theme_successor, verify_surface_m3_theme_successor, SHAS
        from unthemable_ledger_patch import spans
        before, after = derive_surface_m3_theme_successor()
        text, _, ranges = spans(after)
        data = json.loads(after)
        with tempfile.TemporaryDirectory(prefix='ngx-theming-independent-') as directory:
            candidate = Path(directory) / 'candidate.json'
            candidate.write_bytes(after)
            report = verify_surface_m3_theme_successor(candidate)
            self.assertEqual(report['individual_decisions'], 3)
            self.assertEqual(report['unselected_entry_bytes_preserved'], 1694)
            self.assertEqual(report['security_reviews_unchanged'], 1)
            for fault in ['entry-0', 'entry-1', 'entry-2', 'other-entry', 'proof', 'security', 'header', 'clearance']:
                changed = copy.deepcopy(data)
                if fault in ['header', 'clearance']:
                    key = 'closed_dispositions' if fault == 'header' else 'g11_claim'
                    changed[key] = 396 if fault == 'header' else 'passed'
                    old = '  "' + key + '": ' + json.dumps(data[key])
                    new = '  "' + key + '": ' + json.dumps(changed[key])
                    self.assertEqual(text[:text.index('"entries": [')].count(old), 1)
                    raw = text.replace(old, new, 1).encode()
                else:
                    if fault.startswith('entry-') or fault == 'proof':
                        sha = SHAS[int(fault[-1]) if fault.startswith('entry-') else 0]
                        i = next(i for i, row in enumerate(changed['entries']) if row['sha'] == sha)
                    elif fault == 'security':
                        i = next(i for i, row in enumerate(changed['entries']) if row['final_disposition'] == 'security-review')
                    else:
                        i = next(i for i, row in enumerate(changed['entries']) if row['sha'] not in SHAS)
                    row = changed['entries'][i]
                    if fault == 'proof':
                        row['individual_proof']['surface_m3_theme_source_scope']['handler']['sha256'] = '0' * 64
                    elif fault == 'security':
                        row['final_disposition'] = 'do-not-adopt'
                    else:
                        row['reason'] += ' altered'
                    start, end = ranges[i]
                    raw = (text[:start] + json.dumps(row, indent=2).replace('\n', '\n    ') + text[end:]).encode()
                self.assertEqual(json.loads(raw), changed, 'only the intended semantic fault')
                candidate.write_bytes(raw)
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_surface_m3_theme_successor(candidate)
        self.assertEqual(json.loads(before)['closed_dispositions'], 392)

    def test_current_source_and_real_root_checker(self):
        command = ['node', 'tests/surface_m3_theme_admission_probe.mjs']
        if os.environ.get('SURFACE_M3_THEME_ADMISSION_REPORT'):
            command.append(os.environ['SURFACE_M3_THEME_ADMISSION_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['pure_metadata_cases'], 3)
        self.assertEqual(report['metadata_rejections'], 54)
        self.assertEqual(report['source_rejections'], 39)
        self.assertEqual(report['historical_registered_source_contracts'], 67)
        from current_sass_canonical_test_scope import current_canonical_registry_subject
        registry_subject = current_canonical_registry_subject(ROOT)
        self.assertEqual(report['registered_source_contracts'], registry_subject['registered_source_contracts'])
        registry_subject['assert_current']()
        self.assertEqual(report['prior_registry_records_preserved'], 35)
        self.assertEqual(report['historical_registry_tool_bindings'], 140)
        self.assertTrue(report['current_registry_tool_bindings_verified'])
        self.assertTrue(report['all_current_tool_bindings_retained'])
        self.assertTrue(report['late_original_patch_in_tool_role_rejected'])
        self.assertTrue(report['canonical_whole_body_fresh_source_checked'])
        self.assertEqual(report['historical_canonical_bound_members'], 641)
        self.assertTrue(report['canonical_bound_matches_exact_current_union'])
        self.assertEqual(report['canonical_metadata_rejections'], 8)
        self.assertEqual(report['canonical_late_source_rejections'], 14)
        self.assertEqual(report['canonical_cache_or_guard_mutants_rejected'], 2)
        self.assertEqual(report['real_root_positive_rows'], 3)
        self.assertEqual(report['real_root_rejected_rows'], 12)
        self.assertTrue(report['missing_source_requirement_mutant_detected'])
        self.assertEqual(report['individual_decisions'], 3)
        self.assertEqual(report['unselected_entries_preserved'], 1694)
        self.assertEqual(len(report['rejected']), 125)
        self.assertEqual(len(set(report['rejected'])), 125)
        self.assertFalse(report['canonical_ledger_applied'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
