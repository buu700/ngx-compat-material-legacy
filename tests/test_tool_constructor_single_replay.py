# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Construction closes supplied callbacks over the complete current frame."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]


class SingleReplayConstructorTests(unittest.TestCase):
    def run_group(self,group,expected):
        commands=[['node','tests/tool_constructor_single_replay_probe.mjs','--group='+group],
                  [sys.executable,'tests/tool_constructor_single_replay_probe.py','--group='+group]]
        with ThreadPoolExecutor(max_workers=2) as pool:
            children=list(pool.map(lambda cmd:subprocess.run(cmd,cwd=ROOT,capture_output=True,
                                                             text=True,timeout=120),commands))
        for child in children:
            self.assertEqual(child.returncode,0,child.stdout+child.stderr)
            report=json.loads(child.stdout)
            self.assertEqual(report['result'],'pass')
            self.assertEqual(report['checks'],expected)

    def test_cold_inputs(self):
        self.run_group('cold',['cold drift cannot be restored by first callback',
                              'nonphysical supplied member rejects','warm cold drift rejects before callback'])

    def test_caught_reentry(self):
        self.run_group('reentry',['caught root reentry rejects and recovers'])

    def test_final_callback(self):
        self.run_group('last',['last callback mutation rejects and recovers'])

    def test_reference_metadata(self):
        self.run_group('metadata',['changed reference metadata rejects and recovers'])
