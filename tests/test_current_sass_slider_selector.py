# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded report models on real proposed sources; no C04 tool owner or compiler."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'scripts'), str(ROOT / 'tests')]
from test_current_sass_source import candidate_fixture, NODE


class CurrentSliderSelectorTests(unittest.TestCase):
    def test_report_relationships_and_current_source_fixture(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as directory:
            root = Path(directory)
            self.assertEqual(candidate_fixture(root), '21.x')
            paths = ['scripts/current-sass-slider-selector-reports.mjs',
                     'compatibility/rc/21x-c04-selector-density-source-review.json',
                     'compatibility/rc/21x-c04-slider-m3-repairs-source-review.json',
                     'compatibility/rc/21x-c04-inspection-compatibility-source-review.json']
            for family in ['selector-density', 'slider-m3-repairs']:
                paths.extend('compatibility/rc/21x-c04-' + family + '-' + name + '.json'
                             for name in ['individual-review', 'canonical-transition'])
                paths.append('scripts/upstream-' + family + '-admission.cjs')
            for path in paths:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((ROOT / path).read_bytes())
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_slider_selector_probe.mjs'), str(root)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=30)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
            report = json.loads(child.stdout)
            self.assertEqual(report['line'], '21.x')
            self.assertEqual(report['result'], 'pass')
            self.assertEqual(report['checks_passed'], len(report['checks']))
            self.assertEqual(report['getter_calls'], 0)
            self.assertTrue(report['actual_four_module_source_fixture'])
            self.assertFalse(report['current_C04_tool_constructor_executed'])
            self.assertFalse(report['actual_source_producers_or_handlers_executed'])
            self.assertEqual(report['compiler_calls'], 0)
            self.assertEqual(report['selector_caller_modules'], 20)
            self.assertEqual(report['selector_calls'], 41)
            self.assertEqual(report['current_public_boundaries'], 8)
            self.assertEqual(report['historical_public_boundaries'], 4)
            self.assertFalse(report['artifact_or_audit_credit'])
            if os.environ.get('CURRENT_SLIDER_SELECTOR_REPORT'):
                with open(os.environ['CURRENT_SLIDER_SELECTOR_REPORT'], 'x') as destination:
                    json.dump(report, destination, indent=2)
                    destination.write('\n')


if __name__ == '__main__':
    unittest.main()
