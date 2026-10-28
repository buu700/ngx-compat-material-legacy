# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Main preserves its Sass and native-spec contracts while admitting exact title sources."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogTitleMainSourceContextTests(unittest.TestCase):
    def test_composed_current_sources_metadata_and_real_faults(self):
        command = ['node', 'tests/dialog_title_main_source_context_probe.mjs']
        if os.environ.get('DIALOG_TITLE_MAIN_SOURCE_REPORT'):
            command.append(os.environ['DIALOG_TITLE_MAIN_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['canonical_peer_reads'], 10)
        self.assertEqual(result['peer_root_or_path_faults_rejected'], 10)
        self.assertEqual(result['reference_cases'], 51)
        self.assertEqual(result['rejections'], 61)
        self.assertEqual(result['original_silent_Sass_prefixes'], 7)
        self.assertEqual(result['original_Sass_reader_hooks'], 6)
        self.assertEqual(result['original_native_spec_reader_hooks'], 7)
        self.assertEqual(result['title_reader_hooks'], 9)
        self.assertEqual(result['current_raw_dialog_graph_members'], 49)
        self.assertTrue(result['current_general_source_qualification_passed'])
        self.assertTrue(result['actual_fresh_build_source_positive'])
        self.assertTrue(result['canonical_SHA_ledger_unchanged'])
        self.assertFalse(result['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
