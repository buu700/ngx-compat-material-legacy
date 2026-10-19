# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public Core/CDK view evidence; selected source conclusions stay ungranted."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreViewUseReview(unittest.TestCase):
    def test_complete_public_types_views_portals_and_faults(self):
        command = ['node', 'tests/core_view_use_probe.mjs']
        if os.environ.get('NGX_CORE_VIEW_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_CORE_VIEW_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=210)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        for field, expected in [('selected_uses', 35), ('candidate_files', 22), ('strict_type_subjects', 3),
                                ('negative_type_checks', 36), ('public_runtime_subjects', 10),
                                ('public_lifecycle_cases', 130), ('behavior_faults_rejected', 100),
                                ('source_corruption_controls', 35), ('new_use_closures', 0),
                                ('source_conclusions_qualified', 0)]:
            self.assertEqual(report[field], expected, field)
        self.assertFalse(report['actual_legacy_component_TestBed_browser_packed_or_floor_qualified'])

    def test_selected_rows_and_candidate_sources_remain_unchanged_and_open(self):
        prior = json.loads(gzip.decompress((ROOT/'compatibility/rc/core-view-use-prior.json.gz').read_bytes()))
        self.assertEqual(len(prior['selected']), 35)
        self.assertEqual(len({(m['ledger'], m['file'], m['module'], m['symbol']) for m in prior['selected']}), 35)
        for member in prior['ledger_preimages'] + prior['candidate_preimages']:
            self.assertEqual(hashlib.sha256((ROOT/member['path']).read_bytes()).hexdigest(), member['sha256'])
        for selected in prior['selected']:
            rows = json.loads((ROOT/selected['ledger']).read_bytes())['symbol_uses']
            found = [r for r in rows if all(r[k] == selected[k] for k in ['file', 'module', 'symbol'])]
            self.assertEqual(len(found), 1)
            self.assertEqual(found[0]['disposition'], 'open')
            self.assertNotEqual(found[0]['status'], 'reviewed')


if __name__ == '__main__':
    unittest.main()
