# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual 21.x constructor controls in an explicitly enrolled private fixture."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('LEGACY_BATCH_NODE','node')
FIXTURE=Path(os.environ.get('LEGACY_BATCH_SOURCE_FIXTURE',ROOT)).resolve()
class LegacyStaticReferenceBatchTests(unittest.TestCase):
    def run_group(self, group):
        with tempfile.TemporaryDirectory(prefix='legacy-batch-',dir=ROOT.parent.parent) as temp:
            scratch=Path(temp)/ROOT.name;scratch.mkdir()
            files=subprocess.run(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=FIXTURE,check=True,capture_output=True).stdout
            subprocess.run(['rsync','-a','--from0','--files-from=-',str(FIXTURE)+'/',str(scratch)+'/'],input=files,check=True)
            (scratch/'.git').write_bytes((FIXTURE/'.git').read_bytes())
            subprocess.run(['cp','-a','--reflink=auto',str(FIXTURE/'node_modules'),str(scratch/'node_modules')],check=True)
            probe=scratch/'tests/legacy_static_reference_batch_probe.mjs'
            # The probe is this test's own exact bytes even if the enrolled fixture predates it.
            probe.write_bytes((ROOT/'tests/legacy_static_reference_batch_probe.mjs').read_bytes())
            names=['scripts/legacy-removal-owner-source.mjs','scripts/table-local-compilation-owner-source.mjs',
                   'scripts/current-sass-tool-references.mjs','compatibility/rc/parent-base-class-tool-successor-inputs-v3.json',
                   'tests/legacy_static_reference_batch_probe.mjs']
            identities={p:hashlib.sha256((scratch/p).read_bytes()).hexdigest() for p in names}
            child=subprocess.run([NODE,str(probe),group],cwd=scratch,capture_output=True,text=True,timeout=900)
            self.assertEqual(child.returncode,0,child.stdout+child.stderr)
            result=json.loads(child.stdout);self.assertEqual((result['result'],result['group']),('pass',group))
            self.assertFalse(result['full_owner_pass']);result['actual_scratch_identities']=identities
            result['fixture_source']=str(FIXTURE);result['fixture_enrollment_is_not_release_qualification']=True
            print(json.dumps(result,sort_keys=True))
    def test_actual_constructor_baseline(self):self.run_group('baseline')
    def test_last_row_final_faults(self):self.run_group('final')
    def test_real_table_semantics(self):self.run_group('table')
    def test_real_legacy_constructor_fault_lifetimes(self):self.run_group('constructor')
if __name__=='__main__':unittest.main()
