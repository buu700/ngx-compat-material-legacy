# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact source references, real fresh checks and cold/late corruption controls."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class DialogTitleSourceContextTests(unittest.TestCase):
    def test_exact_product_transition_reader_hooks_and_live_source_failures(self):
        command=['node','tests/dialog_title_source_context_probe.mjs']
        if os.environ.get('DIALOG_TITLE_SOURCE_CONTEXT_REPORT'):
            command.append(os.environ['DIALOG_TITLE_SOURCE_CONTEXT_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        report=json.loads(child.stdout)
        self.assertEqual(report['metadata_cases'],35)
        self.assertEqual(report['rejections'],90)
        self.assertEqual(report['reader_hooks'],9)
        self.assertTrue(report['actual_fresh_build_source_positive'])
        self.assertTrue(report['actual_testing_source_positive'])
        self.assertTrue(report['both_real_source_checkers_reject_post_success_product_faults'])
        self.assertTrue(report['canonical_ledger_unchanged'])
        self.assertEqual(report['historical_tool_metadata_images'],9)
        self.assertEqual(report['historical_tool_metadata_faults_rejected'],23)
        self.assertEqual(report['declared_peer_link_reads'],2)
        self.assertEqual(report['source_traversal_or_nested_or_other_peer_links_rejected'],6)
        self.assertFalse(report['raw_current_readers_expose_old_product_or_tool_bytes'])
        self.assertTrue(report['general_source_qualification_passed_21x'])
        self.assertEqual(report['current_raw_dialog_graph_members'],49)
        self.assertTrue(report['historical_title_metadata_unwrapped_for_current_admission'])
        self.assertEqual(report['fake_current_before_frames_rejected'],2)
        self.assertEqual(report['general_source_product_faults_rejected'],2)
        self.assertTrue(report['main_source_reader_port_qualified'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
if __name__=='__main__':unittest.main()
