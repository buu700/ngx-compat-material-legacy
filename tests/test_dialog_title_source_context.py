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
        self.assertEqual(report['metadata_cases'],13)
        self.assertEqual(report['rejections'],37)
        self.assertEqual(report['reader_hooks'],5)
        self.assertTrue(report['actual_fresh_build_source_positive'])
        self.assertTrue(report['actual_testing_source_positive'])
        self.assertTrue(report['both_real_source_checkers_reject_post_success_product_faults'])
        self.assertTrue(report['canonical_ledger_unchanged'])
        self.assertFalse(report['main_source_reader_port_qualified'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
if __name__=='__main__':unittest.main()
