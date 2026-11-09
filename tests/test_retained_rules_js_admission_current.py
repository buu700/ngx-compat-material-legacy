# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Current rules-js admission and independent program-source replay agree."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedRulesJsAdmissionCurrentTests(unittest.TestCase):
    def test_actual_current_admission(self):
        child = subprocess.run(['node', 'tests/retained_rules_js_admission_current_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual((row['individual_decisions'], row['original_file_occurrences'], row['original_hunks']), (3, 135, 195))
        self.assertEqual((row['current_members'], row['bound'], row['negative_controls']), (1120, 1202, 21))
        self.assertTrue(row['fresh_complete_original_and_current_analysis'])
        self.assertFalse(row['retained_epoch_or_root_CLI_executed'])
        self.assertFalse(row['current_native_packed_or_floor_or_G11_qualified'])

    def test_independent_program_replays(self):
        with TemporaryDirectory(prefix='rules-js-paired-program-') as temporary:
            paths = [Path(temporary) / 'javascript.json', Path(temporary) / 'python.json']
            commands = [['node', 'tests/retained_rules_js_program_probe.mjs', str(paths[0])],
                        [sys.executable, 'tests/retained_rules_js_program_probe.py', str(paths[1])]]
            with ThreadPoolExecutor(max_workers=2) as pool:
                children = list(pool.map(lambda command: subprocess.run(command, cwd=ROOT, capture_output=True,
                                                                        text=True, timeout=900), commands))
            for child in children:
                self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
            rows = [json.loads(path.read_text()) for path in paths]
            for row in rows:
                self.assertEqual((len(row['bound']), len(row['transitions'])), (520, 103))
                self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recoveries']), (12, 12, 12))
                self.assertFalse(row['historical_programs_executed'])
                self.assertFalse(row['artifact_or_audit_admission_granted'])
            self.assertEqual(rows[0]['transitions'], rows[1]['transitions'])
            own = {'scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py',
                   'scripts/current-tool-matrix-source.mjs', 'scripts/current_tool_matrix_source.py'}
            shared = [{ref['path']: ref for ref in row['bound'] if ref['path'] not in own} for row in rows]
            self.assertEqual(len(shared[0]), 518)
            self.assertEqual(shared[0], shared[1])
