# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Historical CVA metadata is reconstructed without admitting stale current source."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class DialogTitleCvaMetadataTests(unittest.TestCase):
    def test_original_reconstruction_current_raw_guards_and_overlay_boundaries(self):
        command=['node','tests/dialog_title_cva_metadata_probe.mjs']
        if os.environ.get('DIALOG_TITLE_CVA_METADATA_REPORT'):
            command.append(os.environ['DIALOG_TITLE_CVA_METADATA_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=240)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        report=json.loads(child.stdout)
        self.assertEqual(report['selected_roles'],241)
        self.assertEqual(report['accessor_roles'],6)
        self.assertEqual(report['original_ledger_images_verified'],2)
        self.assertEqual(report['current_raw_title_images_verified'],2)
        self.assertEqual(report['current_raw_dialog_graph_members'],49)
        self.assertEqual(report['source_tool_and_applied_metadata_faults_rejected'],18)
        for key in ['default_current_mode_rejects_stale_source','metadata_mode_is_explicit','metadata_overlay_cannot_override_fixed_title_images','current_admission_unwraps_overlay_to_raw','canonical_metadata_and_SHA_ledger_unchanged']:
            self.assertTrue(report[key],key)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
if __name__=='__main__':unittest.main()
