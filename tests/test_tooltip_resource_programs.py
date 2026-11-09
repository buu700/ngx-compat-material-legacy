# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Paired current program identities retain exact historical comparisons."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TooltipResourceProgramTests(unittest.TestCase):
    def test_paired_exact_images_and_physical_controls(self):
        commands = [['node', 'tests/tooltip_resource_program_probe.mjs'],
                    [sys.executable, 'tests/tooltip_resource_program_probe.py']]
        with ThreadPoolExecutor(max_workers=2) as pool:
            children = list(pool.map(lambda command: subprocess.run(command, cwd=ROOT, capture_output=True,
                                                                   text=True, timeout=120), commands))
        reports = []
        for child in children:
            self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            report = json.loads(child.stdout); reports.append(report)
            self.assertEqual((len(report['bound']), len(report['transitions'])), (515, 99))
            self.assertEqual(report['program_images_preserved'], 6)
            self.assertEqual(report['physical_cold_late_recovery_targets'], 7)
            self.assertEqual(report['bad_supplied_program_readers_rejected'], 3)
            self.assertFalse(report['historical_programs_executed'])
            self.assertFalse(report['artifact_or_audit_admission_granted'])
        self.assertEqual(reports[0]['transitions'], reports[1]['transitions'])
        own = {'scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py',
               'scripts/current-tool-matrix-source.mjs', 'scripts/current_tool_matrix_source.py'}
        shared = [{row['path']: row for row in report['bound'] if row['path'] not in own} for report in reports]
        self.assertEqual(len(shared[0]), 513)
        self.assertEqual(shared[0], shared[1])
