# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The exact tooltip repair retains source signatures, geometry policy and lifetime."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TooltipScrollClipping(unittest.TestCase):
    def test_candidate_and_current_evidence(self):
        command = ['node', 'tests/tooltip_scroll_clipping_guard.mjs']
        if os.environ.get('NGX_TOOLTIP_CLIP_APPLIED'):
            command.append('--applied')
        if os.environ.get('NGX_TOOLTIP_CLIP_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_TOOLTIP_CLIP_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['reference_candidate_state_cases'], 490)
        self.assertEqual(report['runtime_source_mutants_rejected'], 60)
        self.assertEqual(report['strict_public_models'], 3)
        self.assertEqual(report['genuine_zone_contexts'], 10)
        self.assertEqual(report['source_evidence_corruptions_rejected'], 43)
        self.assertEqual(report['changes_after_cached_reads_rejected'], 2)
        self.assertTrue(report['public_signatures_imports_and_all33_resources_unchanged'])
        self.assertEqual(report['canonical_closures'], 0)
        self.assertFalse(report['actual_directive_native_geometry_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
