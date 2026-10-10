"""Whole consumer build and evidence retention controls; expensive work stays in Actions."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]

class MigratedConsumerBuildTests(unittest.TestCase):
    def test_actual_build_and_retention_protocols(self):
        result=subprocess.run(['node','tests/migrated_consumer_build_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
