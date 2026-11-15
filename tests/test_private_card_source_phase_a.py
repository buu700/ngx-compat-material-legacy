# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Private-card JS source guard controls in a copied fixture."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from test_current_sass_source import candidate_fixture

class PrivateCardSourcePhaseATests(unittest.TestCase):
    def test_js_physical_rejection_and_recovery(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as tmp:
            root=Path(tmp);candidate_fixture(root)
            paths=('scripts/sass-private-card-gate.mjs','scripts/private-card-composition.mjs',
                   'scripts/private-card-peer-check.mjs','scripts/private_card_composition.py',
                   'scripts/current-sass-spinner-snack-contract.mjs','scripts/sass-spinner-snack-bridge-contract.mjs',
                   'fixtures/sass/private-card-peer-pins.json','fixtures/sass/private-card-peer.scss',
                   'compatibility/rc/original16-sass-source-diagnostic-identity.json',
                   'compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json',
                   'reference/material-16.2.14/PROVENANCE.json',
                   'reference/material-16.2.14/environment-package-lock.json')
            for path in paths:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            child=subprocess.run(['node',str(ROOT/'tests/private_card_source_phase_a_probe.mjs'),str(root)],cwd=ROOT,capture_output=True,text=True,timeout=30)
            self.assertEqual(child.returncode,0,child.stderr)
            self.assertIn('physical source rejection and recovery passed',child.stdout)
if __name__=='__main__':unittest.main()
