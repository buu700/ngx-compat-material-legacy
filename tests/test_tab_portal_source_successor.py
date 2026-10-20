# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact current source admission; native execution remains required."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabPortalSourceSuccessor(unittest.TestCase):
    def test_raw_source_successors_history_controls_and_native_requirements(self):
        command = ['node', 'tests/tab_portal_source_successor_probe.mjs']
        if os.environ.get('NGX_TAB_SOURCE_SUCCESSOR_DIAGNOSTIC'):
            command.append(os.environ['NGX_TAB_SOURCE_SUCCESSOR_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-16000:])
        body = json.loads(child.stdout)
        for name, value in [('existing_source_roles_requalified', 12), ('new_source_routes_qualified', 7),
                            ('frozen_reviewed', 1464), ('frozen_insufficient', 0),
                            ('additional_reviewed', 185), ('additional_open', 130),
                            ('additional_insufficient', 0), ('additional_uses', 315),
                            ('native_case_ids_retained', 54), ('untouched_frozen_row_bytes', 1724),
                            ('untouched_existing_additional_row_bytes', 308), ('untouched_SHA_row_bytes', 1696)]:
            self.assertEqual(body[name], value, name)
        self.assertGreaterEqual(body['current_context_corruptions_rejected'], 35)
        self.assertEqual(body['rejection_controls'], body['current_context_corruptions_rejected'] + 10)
        self.assertEqual(body['current_native_gate'], {'ok': False, 'detail': 'missing coordinator run'})
        self.assertTrue(body['late_mutation_rejected'])
        self.assertFalse(body['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
