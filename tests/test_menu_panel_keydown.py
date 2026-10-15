# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One effective overlay route; absence of an old template listener is not failure."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuPanelKeydownTests(unittest.TestCase):
    def test_actual_current_dispatchers_and_complete_owned_method_controls(self):
        result = subprocess.run(['node', 'tests/menu_panel_keydown_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('compiler_contexts', 3), ('current_dispatcher_contexts', 2),
                ('body_events', 14), ('mutants_rejected', 12), ('template_mapping', 30)]:
            self.assertEqual(observed[field], expected, field)
        self.assertFalse(observed['product_changed'])
        self.assertFalse(observed['actual_packed_or_native_or_AOT_executed'])

    def test_incomplete_diagnosis_retained_and_explicitly_corrected(self):
        correction = json.loads((ROOT / 'compatibility/rc/menu-keydown-diagnosis-correction.json').read_text())
        prior = correction['superseded_diagnosis']
        self.assertEqual(hashlib.sha256((ROOT / prior['path']).read_bytes()).hexdigest(), prior['sha256'])
        self.assertTrue(prior['retained_unchanged'])
        verification = correction['verification']
        self.assertEqual(hashlib.sha256((ROOT / verification['path']).read_bytes()).hexdigest(), verification['sha256'])
        self.assertFalse(correction['product_HTML_CSS_SCSS_changed'])
        self.assertEqual(correction['new_use_or_SHA_closures'], 0)
        self.assertEqual(correction['g11_claim'], 'not-passed')
