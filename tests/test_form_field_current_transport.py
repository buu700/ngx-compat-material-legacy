# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Historical data comparison and current-source fixture transport controls."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import form_field_full_inventory_fixture as fixture

ROOT=Path(__file__).resolve().parents[1]

class FormFieldCurrentTransportTests(unittest.TestCase):
    def test_authenticated_data_mutation_and_recovery(self):
        with tempfile.TemporaryDirectory(prefix='form-field-transport-data-') as tmp:
            root=Path(tmp)
            for path in fixture.HISTORICAL_DATA:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            git_dir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip()
            (root/'.git').write_text('gitdir: '+git_dir+'\n')
            with patch.object(fixture,'ROOT',root):
                expected=fixture.historical_data();self.assertEqual(len(expected),12)
                path=root/fixture.HISTORICAL_DATA[0];saved=path.read_bytes()
                try:
                    path.write_bytes(saved+b' ')
                    with self.assertRaisesRegex(AssertionError,'historical comparison data changed'):fixture.historical_data()
                finally:path.write_bytes(saved)
                self.assertEqual(fixture.historical_data(),expected)
    def test_current_physical_source_smoke(self):
        env=dict(os.environ,FORM_COLOR_FIXTURE_SMOKE='1')
        child=subprocess.run([os.sys.executable,str(ROOT/'tests/form_field_full_inventory_fixture.py')],cwd=ROOT,env=env,capture_output=True,text=True,timeout=30)
        self.assertEqual(child.returncode,0,child.stderr)
        result=json.loads(child.stdout)
        self.assertFalse(result['historical_programs_executed'])
        self.assertTrue(result['fixture_only'])
        self.assertGreater(result['current_source_bound_count'],0)
if __name__=='__main__':unittest.main()
