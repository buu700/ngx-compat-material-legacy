# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Generated packed-browser fixture source, callbacks and no runtime overclaim."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
sha = lambda b: hashlib.sha256(b).hexdigest()


class ChipFocusBrowser(unittest.TestCase):
    def test_generated_fixture_and_whole_probe_callback_controls(self):
        command = ['node','tests/chip_focus_browser_probe.mjs']
        if os.environ.get('NGX_CHIP_FOCUS_BROWSER_DIAGNOSTIC'):
            command.append(os.environ['NGX_CHIP_FOCUS_BROWSER_DIAGNOSTIC'])
        child = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['selected_fixture_runs'],8)
        self.assertEqual(report['current_selected_fixture_passes'],4)
        self.assertEqual(report['before_selected_fixture_rejections'],4)
        self.assertEqual(report['whole_probe_callback_runs'],4)
        self.assertEqual(report['controls'],86)
        self.assertFalse(report['actual_angular_browser_packed_or_floor_execution'])

    def test_original_provenance_and_existing_form_contract_are_retained(self):
        task = json.loads((ROOT/'compatibility/rc/chip-focus-browser-worksheet.json').read_bytes())
        ref = task['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        self.assertEqual(prior['source_parent'],task['source_parent'])
        self.assertEqual(len(prior['sources']),4)
        for member in prior['sources']:
            before=subprocess.check_output(['git','--no-replace-objects','show',prior['source_parent']+':'+member['path']],cwd=ROOT)
            self.assertEqual(before,member['text'].encode());self.assertEqual(sha(before),member['sha256'])
        blur=prior['sources'][-1]
        self.assertEqual((ROOT/blur['path']).read_bytes(),blur['text'].encode())
        required=(ROOT/'scripts/browser-required-cells.mjs').read_text()
        forms=(ROOT/'scripts/browser-form-families.mjs').read_text()
        probe=(ROOT/'scripts/browser-required-probe.js').read_text()
        for text in [required,forms]:
            self.assertIn('${chipFocusLifecycleFixtureMembers()}',text)
            self.assertIn('data-chip-focus-lifecycle',text)
            self.assertIn('data-chip-focus-outside',text)
            self.assertIn('MatLegacyChip,',text)
        self.assertIn('legacyChipBlurNativeOkay, chipFocusLifecycleNativeOkay',required)
        self.assertIn('returnByValue: true, awaitPromise',forms)
        self.assertIn("'window.__chipFocusLifecycle()', true",forms)
        self.assertIn('legacyChipBlurNativeOkay(families.chips.blur)',forms)
        self.assertIn('chipFocusLifecycleNativeOkay(families.chips.focus_lifecycle)',forms)
        self.assertIn('families.chips.chip_selected_class',forms)
        self.assertIn('legacyFormFieldOutlineSequenceOkay',forms)
        self.assertIn('lab.resetChipFormState();',probe)
        self.assertIn('legacyChipBlurNativeOkay(observation) && chipFocusLifecycleNativeOkay(lifecycle)',probe)
        self.assertIn('JSON.stringify({focus_lifecycle: lifecycle, blur: observation})',probe)
        self.assertIn('window.__status !== owner',probe)
        self.assertFalse(task['actual_native_packed_or_floor_qualified'])
        self.assertFalse(task['ready_for_Actions'])


if __name__ == '__main__':
    unittest.main()
