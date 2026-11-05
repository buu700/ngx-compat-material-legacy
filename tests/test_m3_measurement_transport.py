# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Full relocation equality, exact old-program reconstruction and source enforcement."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class M3MeasurementTransportTests(unittest.TestCase):
    def test_portable_measurements_historical_identity_and_real_faults(self):
        command = ['node', 'tests/m3_measurement_transport_probe.mjs']
        if os.environ.get('M3_TRANSPORT_REPORT'):command.append(os.environ['M3_TRANSPORT_REPORT'])
        child = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(len(report['portable_lines']),2)
        self.assertEqual(report['logical_and_historical_programs_each_line'],26)
        self.assertEqual(report['metadata_before_images'],2)
        self.assertEqual(report['rejections'],16)
        for key in ['raw_execution_reader_unchanged','historical_portable_code_delta_preserved','current_exact_tool_successor_guarded','exact_four_peer_file_read_transport_verified','current_and_relocated_measurements_equal','canonical_ledger_unchanged','all_temporary_roots_removed']:
            self.assertTrue(report[key],key)
        self.assertEqual(report['current_producer_execution_lines'],['21.x'])
        self.assertFalse(report['main_current_producer_executed'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__=='__main__':unittest.main()
