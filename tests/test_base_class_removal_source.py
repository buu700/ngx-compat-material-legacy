# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original authentication, never substantive implementation acceptance."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-base-class-removal-source-'


class BaseClassRemovalSourceTest(unittest.TestCase):
    def test_complete_original_objects_and_rejection_controls(self):
        command = ['node', 'tests/base_class_removal_source_probe.mjs']
        if os.environ.get('BASE_CLASS_REMOVAL_ORIGINAL_REPORT'):
            command.append(os.environ['BASE_CLASS_REMOVAL_ORIGINAL_REPORT'])
        child = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        for key, value in [('complete_original_files', 72), ('original_hunks_replayed', 329),
                           ('tagged_reference_members', 143), ('unique_authenticated_blobs', 219),
                           ('object_tree_blob_hunk_and_provenance_faults_rejected', 17),
                           ('cold_source_faults_rejected', 8), ('late_source_faults_rejected', 8)]:
            self.assertEqual(report[key], value)
        self.assertFalse(report['substantive_current_source_review_complete'])
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['canonical_decisions_changed'], 0)

    def test_independent_member_commit_and_patch_identities(self):
        packet = json.loads(gzip.decompress((ROOT / (PREFIX + 'originals.json.gz')).read_bytes()))
        git_hash = lambda kind, raw: hashlib.sha1((kind + ' ' + str(len(raw)) + '\0').encode() + raw).hexdigest()
        for commit in [packet['original_commit'], packet['parent_commit'], packet['tagged_reference']['commit']]:
            self.assertEqual(git_hash('commit', commit['raw'].encode()), commit['sha'])
        blobs = {}
        for member in [side for section in packet['sections'] for side in [section['before'], section['after']]] + packet['tagged_reference']['members']:
            raw = member['body'].encode()
            self.assertEqual(git_hash('blob', raw), member['blob'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(), member['sha256'])
            blobs[member['blob']] = raw
        self.assertEqual(len(blobs), 219)
        patch = ''.join(section['patch'] for section in packet['sections'])
        self.assertEqual(patch, packet['diff'])
        self.assertEqual(hashlib.sha256(patch.encode()).hexdigest(), '9407791dd755217128d0dd6f3c2c4542f1bcb8aaaa5ce3b8b745b07e190cf8d0')
        self.assertEqual(sum(len(section['hunks']) for section in packet['sections']), 329)
        for receipt in packet['anonymous_blob_receipts']:
            self.assertEqual(git_hash('blob', blobs[receipt['blob']]), receipt['blob'])
            self.assertEqual(hashlib.sha256(blobs[receipt['blob']]).hexdigest(), receipt['sha256'])
        worksheet = json.loads((ROOT / (PREFIX + 'worksheet.json')).read_bytes())
        for key in ['protected_ledger', 'protected_registry', 'protected_roster']:
            ref = worksheet[key]
            raw = (ROOT / ref['path']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), ref['sha256'])
            self.assertEqual(len(raw), ref['bytes'])


if __name__ == '__main__':
    unittest.main()
