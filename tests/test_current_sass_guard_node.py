# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual five-module source guard on an isolated physical consumer fixture."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import candidate_fixture, NODE
ROOT=Path(__file__).resolve().parents[1]
class CurrentSassGuardNodeTests(unittest.TestCase):
    def test_actual_leaf_phases_freshness_reentry_and_later_scope(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as temp:
            root=Path(temp); candidate_fixture(root)
            child=subprocess.run([NODE,str(ROOT/'tests/current_sass_guard_node_probe.mjs'),str(root)],cwd=ROOT,text=True,capture_output=True,timeout=60)
            self.assertEqual(child.returncode,0,child.stdout+child.stderr)
            result=json.loads(child.stdout)
            self.assertEqual(result['result'],'pass')
            self.assertEqual(result['controls'],18)
            self.assertTrue(result['actual_subject'] and result['restoration_passed'])
            self.assertFalse(result['complete_owner_success'])
