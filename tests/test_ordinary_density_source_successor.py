# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact density proof input transitions on a disposable source fixture."""
import json, subprocess, tempfile, unittest
from pathlib import Path
from test_current_sass_source import candidate_fixture, ROOT
from sass_ordinary_density_gate import OrdinaryDensityGateContext
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
class OrdinaryDensitySourceSuccessorTests(unittest.TestCase):
    def test_exact_sources_and_physical_drift(self):
        with tempfile.TemporaryDirectory(prefix='density-source-') as temp:
            root=Path(temp)
            if candidate_fixture(root)!='main':self.skipTest('main only')
            manifest=json.loads((ROOT/'fixtures/sass/ordinary-density-proof-inputs.json').read_bytes())
            paths=[r['path'] for r in manifest['files']]+[r['path'] for r in CurrentSpinnerSnackContract(ROOT).bound if not r['path'].startswith('node_modules/')]+['scripts/sass-spinner-snack-bridge-contract.mjs','fixtures/sass/ordinary-density-proof-inputs.json','compatibility/rc/current-main-density-input-successor-v1.json']
            for path in paths:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            (root/'.density-successor-disposable').write_text('disposable\n')
            packet=json.loads((root/'compatibility/rc/current-main-density-input-successor-v1.json').read_bytes());source=OrdinaryDensityGateContext(root)
            for path in (packet['updates'][0]['path'],packet['updates'][1]['path'],'compatibility/rc/current-main-density-input-successor-v1.json'):
                file=root/path;old=file.read_bytes()
                try:
                    file.write_bytes(old+b' foreign')
                    with self.assertRaises((AssertionError,ValueError)):OrdinaryDensityGateContext(root)
                    with self.assertRaises((AssertionError,ValueError)):source.assert_current()
                finally:file.write_bytes(old)
                source.assert_current()
            result=subprocess.run(['node',str(ROOT/'tests/ordinary_density_source_successor_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=180)
            self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(json.loads(result.stdout),dict(result='pass',exact_updates=5,cold_late=3))
