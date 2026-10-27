# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original patch identities and real historical Sass output failures."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-c04-unthemable-token-placement-'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()
SHAS = ['03a773a0237843fd1e1e600d0b9911eb924319bc', '047404067865a2452bfcb93b2374ac07aca319be',
        'ccd2d7fa72f4566ab2c2aeb78a5ac4b7d4149bbf', '593fc79ecbc6677f04e2d3707bff024b00a517e8',
        '06460d17703ef28a8fc89833c389c479b1ba6bcf']


def object_id(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def verify_originals(data):
    assert [row['sha'] for row in data['reviews']] == SHAS
    assert HASH(data['worksheet_at_capture'].encode()) == data['inputs'][1]['sha256']
    assert json.loads(data['worksheet_at_capture'])['selected_sha_ids'] == SHAS
    assert data['inputs'][0]['path'] == 'compatibility/rc/upstream-complete-patch-census.json.gz'
    assert HASH((ROOT / data['inputs'][0]['path']).read_bytes()) == data['inputs'][0]['sha256']
    count = 0
    for row in data['reviews']:
        family = row['family']
        assert object_id('commit', row['raw_commit'].encode()) == row['sha']
        assert HASH(row['diff'].encode()) == row['diff_sha256']
        assert [section['path'] for section in row['sections']] == ['src/material/_index.scss',
            f'src/material/{family}/_{family}-theme.scss', f'src/material/{family}/{family}.scss']
        assert ''.join(section['patch'] for section in row['sections']) == row['diff']
        assert [len(section['hunks']) for section in row['sections']] == [1, 2, 1]
        assert len(row['frozen_seed_paths']) == 2 and 'src/material/_index.scss' not in row['frozen_seed_paths']
        for section in row['sections']:
            assert HASH(section['patch'].encode()) == section['patch_sha256']
            index = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644$', section['patch'])
            assert index
            for side, blob in [('before', index[1]), ('after', index[2])]:
                member = section[side]
                raw = member['body'].encode()
                assert object_id('blob', raw) == member['blob'] == blob
                assert HASH(raw) == member['sha256'] and len(raw) == member['bytes']
            original, result, cursor = section['before']['body'].splitlines(keepends=True), [], 0
            assert re.split(r'(?=^@@ )', section['patch'], flags=re.M)[1:] == [h['text'] for h in section['hunks']]
            for hunk in section['hunks']:
                assert HASH(hunk['text'].encode()) == hunk['sha256']
                header, *lines = hunk['text'].splitlines(keepends=True)
                assert header.strip() == hunk['header']
                match = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', header)
                assert match and all(line[0] in ' +-' for line in lines)
                old = [line[1:] for line in lines if line[0] in ' -']
                new = [line[1:] for line in lines if line[0] in ' +']
                start = int(match[1]) - 1
                assert start >= cursor and len(old) == int(match[2] or 1) and len(new) == int(match[4] or 1)
                assert original[start:start + len(old)] == old
                result.extend(original[cursor:start]); result.extend(new); cursor = start + len(old)
                count += 1
            result.extend(original[cursor:])
            assert ''.join(result) == section['after']['body']
    assert count == 20
    tagged = data['tagged_reference']
    assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert len(tagged['members']) == len({row['path'] for row in tagged['members']}) == 21
    for member in tagged['members']:
        raw = member['body'].encode()
        assert object_id('blob', raw) == member['blob'] and HASH(raw) == member['sha256'] and len(raw) == member['bytes']
    return dict(commits=5, original_files=15, original_hunks=count, before_after_blobs=30, tagged_sources=21)


class UnthemableTokenSourceTests(unittest.TestCase):
    def test_complete_originals_and_real_identity_failures(self):
        raw = (ROOT / (PREFIX + 'originals.json.gz')).read_bytes()
        self.assertEqual(HASH(raw), '997e466e46efd9983304138a21491409bf37757243e48e7d89df4afbe75ff4b4')
        data = json.loads(gzip.decompress(raw))
        self.assertEqual(verify_originals(data)['original_hunks'], 20)
        for fault in ['missing-commit', 'missing-root-file', 'missing-theme-hunk', 'commit-identity', 'original-blob', 'tagged-blob']:
            changed = copy.deepcopy(data)
            if fault == 'missing-commit':
                changed['reviews'].pop()
            elif fault == 'missing-root-file':
                changed['reviews'][0]['sections'].pop(0)
            elif fault == 'missing-theme-hunk':
                changed['reviews'][0]['sections'][1]['hunks'].pop()
            elif fault == 'commit-identity':
                changed['reviews'][0]['raw_commit'] += '\n'
            elif fault == 'original-blob':
                changed['reviews'][0]['sections'][0]['before']['body'] += '\n'
            else:
                changed['tagged_reference']['members'][0]['body'] += '\n'
            with self.subTest(fault=fault), self.assertRaises(AssertionError):
                verify_originals(changed)

    def test_real_Sass_contracts_and_mutations(self):
        child = subprocess.run(['node', 'tests/unthemable_token_source_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['public_legacy_CSS_cases'], 15)
        self.assertEqual(result['direct_legacy_color_cases'], 5)
        self.assertEqual(result['actual_selector_CSS_faults_rejected'], 5)
        self.assertEqual(result['rejection_controls'], 13)
        self.assertTrue(result['repeat_measurement_identical'])
        self.assertFalse(result['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
