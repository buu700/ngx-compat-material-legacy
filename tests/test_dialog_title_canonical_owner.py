# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent complete-byte title integration and current tool/native guards."""
import copy
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogTitleCanonicalOwnerTests(unittest.TestCase):
    def test_independent_complete_byte_transition(self):
        from current_sass_canonical_test_scope import historical424_ledger_test_subject
        subject = historical424_ledger_test_subject(ROOT)
        from dialog_title_canonical_ledger_patch import verify_title_successor, LEDGER, SHA
        report = verify_title_successor()
        self.assertEqual(report['individual_decisions'], 1)
        self.assertTrue(report['exact_theming_successor_verified'])
        self.assertTrue(report['exact_inspection_successor_verified'])
        self.assertTrue(report['exact_selector_density_successor_verified'])
        self.assertTrue(report['exact_button_tokenization_successor_verified'])
        self.assertTrue(report['exact_button_token_repairs_successor_verified'])
        self.assertTrue(report['exact_surface_m3_theme_successor_verified'])
        self.assertTrue(report['exact_slider_m3_repairs_successor_verified'])
        self.assertTrue(report['exact_control_m3_theme_successor_verified'])
        self.assertTrue(report['exact_foundation_m3_theme_successor_verified'])
        self.assertTrue(report['exact_core_tokenization_successor_verified'])
        self.assertTrue(report['exact_remaining_unthemable_successor_verified'])
        self.assertEqual(report['metadata_tokens'], 14)
        self.assertEqual(report['unselected_entry_bytes_preserved'], 1682)
        from unthemable_ledger_patch import spans
        raw = subject['comparison']
        data = json.loads(raw)
        text, _, ranges = spans(raw)
        with tempfile.TemporaryDirectory(prefix='ngx-title-independent-') as directory:
            candidate = Path(directory) / 'candidate.json'
            candidate.write_bytes(raw)
            verify_title_successor(candidate=candidate)
            for fault in ['title', 'other', 'metadata', 'header', 'security', 'clearance']:
                value = copy.deepcopy(data)
                if fault in ['title', 'other']:
                    i = next(i for i, row in enumerate(value['entries']) if (row['sha'] == SHA) == (fault == 'title'))
                    value['entries'][i]['reason'] += ' altered'
                    start, end = ranges[i]
                    pattern = r'^      "reason": ("(?:\\.|[^"\\])*")'
                    replacement = json.dumps(value['entries'][i]['reason'], ensure_ascii=False)
                elif fault == 'metadata':
                    i = next(i for i, row in enumerate(value['entries']) if row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members'))
                    value['entries'][i]['individual_proof']['historical_behavior']['source_members'][5]['sha256'] = '0' * 64
                    start, end = ranges[i]
                    pattern = r'"path": "scripts/upstream-historical-behavior-evidence\.mjs",\n\s+"sha256": ("[0-9a-f]{64}")'
                    replacement = json.dumps('0' * 64)
                elif fault == 'security':
                    i = next(i for i, row in enumerate(value['entries']) if row['final_disposition'] == 'security-review')
                    value['entries'][i]['final_disposition'] = 'do-not-adopt'
                    start, end = ranges[i]
                    pattern = r'"final_disposition": ("security-review")'
                    replacement = json.dumps('do-not-adopt')
                else:
                    start, end = 0, len(text)
                    if fault == 'header':
                        value['open_or_deferred'] += 1
                        pattern = r'^  "open_or_deferred": (\d+)'
                        replacement = str(value['open_or_deferred'])
                    else:
                        value['g11_claim'] = 'passed'
                        pattern = r'^  "g11_claim": ("not-passed")'
                        replacement = json.dumps('passed')
                matches = list(re.finditer(pattern, text[start:end], re.MULTILINE))
                self.assertEqual(len(matches), 1, fault)
                match = matches[0]
                a, b = start + match.start(1), start + match.end(1)
                changed = (text[:a] + replacement + text[b:]).encode()
                self.assertEqual(json.loads(changed), value, 'change only the intended semantic fault')
                candidate.write_bytes(changed)
                with self.subTest(fault=fault), self.assertRaises(AssertionError):
                    verify_title_successor(candidate=candidate)
        if os.environ.get('DIALOG_TITLE_CANONICAL_RECONSTRUCTION_REPORT'):
            with Path(os.environ['DIALOG_TITLE_CANONICAL_RECONSTRUCTION_REPORT']).open('x') as stream:
                json.dump(report, stream, indent=2); stream.write('\n')
        subject['assert_current']()

    def test_current_readers_and_actual_root_native_rejection(self):
        command = ['node', 'tests/dialog_title_canonical_owner_probe.mjs']
        if os.environ.get('DIALOG_TITLE_CANONICAL_OWNER_REPORT'):
            command.append(os.environ['DIALOG_TITLE_CANONICAL_OWNER_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6500:])
        report = json.loads(child.stdout)
        self.assertEqual(report['registered_source_contracts'], 67)
        self.assertEqual(report['unmarked_historical_tool_readers_rejected'], 6)
        self.assertEqual(report['actual_root_checker_cases'], 2)
        self.assertEqual(report['forged_metadata_capabilities_rejected'], 2)
        self.assertTrue(report['prior_owner_byte_identical'])
        self.assertTrue(report['root_checker_byte_identical'])
        self.assertTrue(report['main_product_and_reader_source_checks_passed'])
        self.assertTrue(report['native_missing_after_source_closure_rejected'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
