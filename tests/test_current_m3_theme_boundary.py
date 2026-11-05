# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Strict retained M3 reports, with no source constructor or compiler execution."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
NODE='/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
class CurrentM3ThemeBoundaryTests(unittest.TestCase):
    def test_exact_raw_report_composition_and_mutations(self):
        command=[NODE,'tests/current_m3_theme_boundary_probe.mjs']
        if os.environ.get('CURRENT_M3_MODEL_REPORT'):command.append(os.environ['CURRENT_M3_MODEL_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-6000:])
        report=json.loads(child.stdout)
        self.assertEqual(report['checks'],340)
        self.assertEqual([r['line'] for r in report['lines']],['21.x','main'])
        for row in report['lines']:
            self.assertEqual(row['changed_css_rows'],4)
            self.assertEqual(row['retained_unchanged_css_rows'],12)
            self.assertEqual(row['transport_programs_reconstructed'],26)
        for key in ['source_constructors','compiler_calls','producer_runs']:self.assertEqual(report[key],0)
        self.assertFalse(report['actual_source_or_artifact_acceptance'])
if __name__=='__main__':unittest.main()
