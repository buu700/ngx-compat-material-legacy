# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real finite browser successor fault controls with known-byte recovery."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
SUFFIX = b'\n// browser zone successor fault\n'
class BrowserZoneSourceSuccessorTests(unittest.TestCase):
    def run_group(self, group):
        paths = [ROOT / 'scripts/browser-zone-source-successor.mjs', ROOT / 'scripts/browser-required-cells.mjs']
        before = {p: p.read_bytes() for p in paths}
        try:
            child = subprocess.run(['node', str(ROOT/'tests/browser_zone_source_successor_probe.mjs'), group], cwd=ROOT, capture_output=True, text=True, timeout=180)
        finally:
            errors = []
            for path, raw in before.items():
                if path.is_symlink() or not path.is_file():
                    errors.append(str(path)); continue
                current = path.read_bytes()
                if current == raw + SUFFIX: path.write_bytes(raw)
                elif current != raw: errors.append(str(path))
            if errors: raise RuntimeError('Foreign or missing bytes preserved: ' + ', '.join(errors))
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        return report

    def test_cold_late_and_exception_recovery(self):
        report = self.run_group('helper')
        for key in ('cold_before_callbacks', 'late_earlier_file_rejected', 'exception_same_subject_recovered'):
            self.assertTrue(report[key])

    def test_composed_source_and_proposal_cold_and_final(self):
        for group in ('source', 'proposal', 'owner'):
            with self.subTest(group=group):
                report = self.run_group(group)
                self.assertEqual(report['group'], group)
                self.assertTrue(report['composed_cold_before_callbacks'])
                self.assertTrue(report['composed_outer_final_rejected'])
                self.assertTrue(report['restoration_passed'])
if __name__ == '__main__': unittest.main()
