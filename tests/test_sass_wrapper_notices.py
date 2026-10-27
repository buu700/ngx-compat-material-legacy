# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Seven comment-only ownership repairs; full Sass/packed gates remain separate."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()


class SassWrapperNotices(unittest.TestCase):
    def test_exact_prefixes_and_finite_reader_controls(self):
        result = subprocess.run(['node', 'tests/sass_wrapper_notice_probe.mjs'], cwd=ROOT,
                                text=True, capture_output=True, timeout=60, check=True)
        summary = json.loads(result.stdout)
        self.assertEqual((summary['positive'], summary['rejected']), (15, 76))
        self.assertFalse(summary['native_or_G13_qualified'])
        result = subprocess.run(['python3', 'tests/sass_wrapper_notice_refs.py'], cwd=ROOT,
                                text=True, capture_output=True, timeout=60, check=True)
        self.assertEqual(json.loads(result.stdout)['authenticated_originals'], 13)

    def test_retained_complete_css_and_warning_observations(self):
        proof = json.loads(gzip.decompress((ROOT / 'compatibility/rc/sass-wrapper-notice-css-observations.json.gz').read_bytes()))
        packet_ref = proof['source_packet']
        packet_bytes = (ROOT / packet_ref['path']).read_bytes()
        self.assertEqual(SHA(packet_bytes), packet_ref['sha256'])
        packet = json.loads(packet_bytes)
        self.assertEqual(proof['source_parent'], packet['source_parent'])
        driver = (ROOT / proof['observation_driver']['path']).read_bytes()
        self.assertEqual(SHA(driver), proof['observation_driver']['sha256'])
        notice = proof['retained_driver_notice_prefix'].encode()
        self.assertTrue(driver.startswith(notice))
        self.assertEqual(SHA(driver[len(notice):]), proof['original_observation_driver_body_sha256'])
        self.assertEqual(proof['before']['node'], proof['after']['node'])
        self.assertEqual(proof['before']['sass'], proof['after']['sass'])
        self.assertEqual(proof['before']['records'], proof['after']['records'])
        self.assertEqual(len(proof['after']['records']), 2)
        self.assertEqual([row['name'] for row in proof['after']['records']],
                         ['light-custom-typography-density0', 'dark-custom-typography-density-minus2'])
        for side in ('before', 'after'):
            self.assertEqual(proof[side]['source_subjects'], [dict(path=row['path'], **row[side]) for row in packet['subjects']])
            for row in proof[side]['records']:
                self.assertEqual(row['changed_wrappers_loaded'], 7)
                self.assertEqual(SHA(row['css'].encode()), row['css_sha256'])
                self.assertEqual(len(row['css'].encode()), row['css_bytes'])
                self.assertGreater(row['css_bytes'], 9000)
                self.assertGreater(row['loaded_modules'], 7)
        self.assertFalse(proof['actual_native_packed_rendered_or_floor_executed'])
        self.assertEqual(proof['g13_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
