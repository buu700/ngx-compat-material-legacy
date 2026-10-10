# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class RippleHydrationSSRTests(unittest.TestCase):
    def test_actual_matching_server_DOM_and_genuine_peer_directive(self):
        command=['node','--max-old-space-size=512','tests/ripple_hydration_ssr_probe.mjs']
        if os.environ.get('CLOSEOUT_HYDRATION_SSR_REPORT'):
            command.append(os.environ['CLOSEOUT_HYDRATION_SSR_REPORT'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['subjects'],8)
        self.assertEqual(report['SSR_cases'],8)
        self.assertEqual(report['host_rejection_cases'],8)
        self.assertTrue(report['genuine_server_DOM_and_peer_directive'])
        self.assertFalse(report['native_client_or_replay_executed'])
