# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""The menu caller successor must retain the old scope and actual current sources."""
import gzip
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


class MenuCallerSourceSuccessorTests(unittest.TestCase):
    def test_source_and_identity_boundaries(self):
        proof_bytes = (ROOT / 'compatibility/rc/menu-caller-source-successor-v2.json').read_bytes()
        self.assertEqual(sha(proof_bytes), '1b061fc8afe174d7b56f429401155b1ed737811458f03628090aae585213a544')
        proof = json.loads(proof_bytes)
        old_bytes = (ROOT / proof['prior_capture']['path']).read_bytes()
        self.assertEqual(sha(old_bytes), proof['prior_capture']['sha256'])
        prior = json.loads(gzip.decompress(old_bytes))
        self.assertEqual([x['previous_complete_record'] for x in proof['selected']], prior['selected'])
        self.assertEqual(len(proof['selected']), 17)
        self.assertEqual(len({tuple(x['triple'].values()) for x in proof['selected']}), 17)
        for item in proof['selected']:
            source = item['current_source']
            self.assertEqual(sha((ROOT / source['path']).read_bytes()), source['sha256'])
            self.assertTrue(item['decision'])
        key = lambda row: (row['triple']['file'], row['triple']['symbol'])
        cases = {key(row): row for row in proof['selected']}
        def bindings(file, symbol):
            return cases[(file, symbol)]['current_source']['bindings']
        for file in ['legacy-menu/menu.ts', 'legacy-menu/internal/menu-trigger-base.ts']:
            self.assertFalse(any(x['module'] == '@angular/material/menu' for x in bindings(file, 'MAT_MENU_PANEL')))
        self.assertTrue(any(x['imported'] == '_LegacyMenuItemBase' for x in bindings('legacy-menu/internal/menu-trigger-base.ts', 'MatMenuItem')))
        self.assertFalse(any(x['module'] == '@angular/material/menu' for x in bindings('legacy-menu/internal/menu-trigger-base.ts', 'MatMenuItem')))
        self.assertTrue(any(x['imported'] == 'MatLegacyMenuContent' for x in bindings('legacy-menu/internal/menu-panel.ts', 'MatMenuContent')))
        material = json.loads((ROOT / 'node_modules/@angular/material/package.json').read_text())
        self.assertEqual(material['version'], '22.1.7')
        for peer in proof['peer_material_22_1_7_sources']:
            self.assertEqual(sha((ROOT / peer['path']).read_bytes()), peer['sha256'])
        evidence = proof['observations']['integration_record']
        integration_bytes = (ROOT / evidence['path']).read_bytes()
        self.assertEqual(sha(integration_bytes), '54b03be88958c17a3dc7653b4e9ad4fef0fe4dac653fbf6b3f0317c7fd9fc6e6')
        self.assertEqual(evidence['sha256'], sha(integration_bytes))
        artifact_sha = '2828f71233d13791de86971a6d18bdc35d88d8285a9c0ed30ad624a8dff9fbe1'
        self.assertEqual(proof['observations']['tarball_sha256'], artifact_sha)
        self.assertIn(artifact_sha, json.loads(integration_bytes)['manifest']['files'].values())
        receipt_ref = proof['observations']['runtime_receipt']
        receipt_bytes = (ROOT / receipt_ref['path']).read_bytes()
        self.assertEqual(sha(receipt_bytes), '8a041ee44f980ed8762147622c6c29e9b2b249500c2e4c678fb2d5b8b7733629')
        self.assertEqual(sha(receipt_bytes), receipt_ref['sha256'])
        receipt = json.loads(receipt_bytes)
        self.assertEqual(receipt['tarball_sha256'], artifact_sha)
        self.assertEqual(receipt['integration_record'], evidence)
        self.assertEqual(len(receipt['source_members']), 52)
        for source in receipt['source_members']:
            self.assertEqual(sha((ROOT / source['path']).read_bytes()), source['sha256'])
        for item in receipt['producer_and_output']:
            self.assertEqual(sha(item['exact_bytes_utf8'].encode()), item['sha256'])
        outputs = {item['role']: item['exact_bytes_utf8'] for item in receipt['producer_and_output']}
        self.assertEqual(json.loads(outputs['development'])['mode'], 'development')
        self.assertEqual(json.loads(outputs['production'])['mode'], 'production')
        self.assertIn('rejected', outputs['negative_control'])
        self.assertEqual(proof['g02_claim'], 'not-passed')
        self.assertEqual(proof['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
