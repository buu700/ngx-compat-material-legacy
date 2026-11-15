# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Committed private-card source successor controls in a copied fixture."""
from pathlib import Path
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
import sass_private_card_gate as gate
from test_current_sass_source import candidate_fixture

class PrivateCardSourceE7Tests(unittest.TestCase):
    def test_physical_source_and_packet_rejection_and_recovery(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as tmp:
            root=Path(tmp);candidate_fixture(root)
            paths=set(gate._PINS)|{'scripts/sass_private_card_gate.py','scripts/sass-private-card-gate.mjs',
                'compatibility/rc/current-main-private-card-js-source-e7-v1.json',
                'scripts/current-sass-spinner-snack-contract.mjs','scripts/sass-spinner-snack-bridge-contract.mjs'}
            for path in paths:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            context=gate.PrivateCardGateContext(root);context.assert_current()
            for path in ('compatibility/rc/current-main-private-card-js-source-e7-v1.json',
                         'scripts/sass-private-card-gate.mjs','scripts/sass_private_card_gate.py',
                         'scripts/select-program-transition-source-v2.mjs',
                         'compatibility/rc/current-main-density-source-ae9-successor-v1.json'):
                with self.subTest(path=path):
                    target=root/path;saved=target.read_bytes()
                    try:
                        target.write_bytes(saved+b' foreign')
                        with self.assertRaises((AssertionError,ValueError)):context.assert_current()
                    finally:target.write_bytes(saved)
                    context.assert_current()
if __name__=='__main__':unittest.main()
