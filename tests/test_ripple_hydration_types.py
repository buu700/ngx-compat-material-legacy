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


class RippleHydrationTypesTests(unittest.TestCase):
    def test_genuine_floor_types_and_actual_public_bootstrap(self):
        command=['node','--max-old-space-size=512','tests/ripple_hydration_types_probe.mjs']
        if os.environ.get('CLOSEOUT_HYDRATION_TYPES_REPORT'):
            command.append(os.environ['CLOSEOUT_HYDRATION_TYPES_REPORT'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report['subjects'],2)
        self.assertEqual(report['negative_checks'],4)
        self.assertFalse(report['native_AOT_or_packed_qualified'])
