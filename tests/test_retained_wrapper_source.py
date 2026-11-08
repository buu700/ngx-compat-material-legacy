"""Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]

class RetainedWrapperSourceTests(unittest.TestCase):
    def run_family(self,family):
        child=subprocess.run(['node','tests/retained_wrapper_source_payload_probe.mjs',family],cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,child.stdout+child.stderr)
        report=json.loads(child.stdout)
        self.assertEqual(report['result'],'pass')
        self.assertFalse(report['admission_granted'])
        return report

    def test_sass_original_metadata_bytes(self):
        report=self.run_family('sass')
        self.assertEqual((report['bound'],report['entries'],report['reports']),(32,12,12))
        self.assertTrue(report['original_entry_and_report_bytes_preserved'])

    def test_chip_original_metadata_and_current_descriptor(self):
        report=self.run_family('chip')
        self.assertEqual((report['bound'],report['entries'],report['reports']),(31,4,4))
        self.assertEqual(report['changed_product_descriptors'],1)
        self.assertTrue(report['original_entry_and_report_bytes_preserved'])

    def test_default_chip_source_stays_strict(self):
        self.assertTrue(self.run_family('chip-default')['default_historical_source_stays_strict'])

if __name__=='__main__':unittest.main()
