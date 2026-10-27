# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent complete original reconstruction and real historical Sass faults."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-c04-modern-control-base-'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()
SHAS = ['68096ec9d34aae793a7b3037c39e6ae7d1700933', 'c572dc4bf4d48448699288aeac2be14db0186a86',
        '65c97170d2b3d239fda25bd049ec417e0098fe12', '7c16cc8b659133167f1b875dcfe77ca806bfe876']
PATHS = [
    ['src/material/_index.scss', 'src/material/button/_fab-theme.scss', 'src/material/button/fab.scss'],
    ['src/material/_index.scss', 'src/material/slider/_slider-theme.scss', 'src/material/slider/slider.scss'],
    ['src/material/_index.scss', 'src/material/snack-bar/_snack-bar-theme.scss', 'src/material/snack-bar/snack-bar-container.scss'],
    ['src/material/_index.scss', 'src/material/list/_list-theme.scss', 'src/material/list/list.scss'],
]


def object_id(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def verify_originals(data):
    assert [row['sha'] for row in data['reviews']] == SHAS
    assert HASH(data['worksheet_at_capture'].encode()) == data['inputs'][1]['sha256']
    worksheet = json.loads(data['worksheet_at_capture'])
    assert worksheet['selected_sha_ids'] == SHAS
    assert data['inputs'][0]['path'] == 'compatibility/rc/upstream-complete-patch-census.json.gz'
    raw = (ROOT / data['inputs'][0]['path']).read_bytes()
    assert HASH(raw) == data['inputs'][0]['sha256'] == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
    census = {row['sha']: row for row in json.loads(gzip.decompress(raw))['commits']}
    assert len(census) == 1697
    count = 0
    for number, row in enumerate(data['reviews']):
        authentic = census[row['sha']]
        assert object_id('commit', row['raw_commit'].encode()) == row['sha']
        assert row['raw_commit'] == authentic['raw_commit']
        assert row['parent'] == authentic['parents'][0]
        assert HASH(row['diff'].encode()) == row['diff_sha256']
        assert [section['path'] for section in row['sections']] == PATHS[number]
        assert [member['path'] for member in authentic['complete_changed_files']] == PATHS[number]
        assert ''.join(section['patch'] for section in row['sections']) == row['diff']
        assert [len(section['hunks']) for section in row['sections']] == [1, 3 if number == 3 else 2, 1]
        assert row['frozen_seed_paths'] == authentic['ledger_comparison']['listed_paths']
        assert len(row['frozen_seed_paths']) == 2 and 'src/material/_index.scss' not in row['frozen_seed_paths']
        for section, original_member in zip(row['sections'], authentic['complete_changed_files']):
            assert HASH(section['patch'].encode()) == section['patch_sha256']
            index = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644$', section['patch'])
            assert index
            for side, blob in [('before', index[1]), ('after', index[2])]:
                member = section[side]
                raw = member['body'].encode()
                assert object_id('blob', raw) == member['blob'] == blob == original_member[side + '_blob']
                assert HASH(raw) == member['sha256'] and len(raw) == member['bytes']
            before, result, cursor = section['before']['body'].splitlines(keepends=True), [], 0
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
                assert before[start:start + len(old)] == old
                result.extend(before[cursor:start]); result.extend(new); cursor = start + len(old)
                count += 1
            result.extend(before[cursor:])
            assert ''.join(result) == section['after']['body']
    assert count == 17 and data['original_hunks'] == count and data['original_file_occurrences'] == 12
    tagged = data['tagged_reference']
    assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert [row['path'] for row in tagged['members']] == worksheet['tag_source_paths']
    assert len(tagged['members']) == len({row['path'] for row in tagged['members']}) == 17
    for member in tagged['members']:
        raw = member['body'].encode()
        assert object_id('blob', raw) == member['blob'] and HASH(raw) == member['sha256'] and len(raw) == member['bytes']
    return dict(commits=4, original_files=12, original_hunks=count, before_after_blobs=24, tagged_sources=17)


class ModernControlBaseSourceTests(unittest.TestCase):
    def test_complete_originals_and_real_identity_failures(self):
        raw = (ROOT / (PREFIX + 'originals.json.gz')).read_bytes()
        self.assertEqual(HASH(raw), 'd9460655c30d17096c08123b394dfbb3f886b460fcda8819ab7005ef226fa782')
        data = json.loads(gzip.decompress(raw))
        self.assertEqual(verify_originals(data)['original_hunks'], 17)
        for fault in ['missing-commit', 'missing-root-file', 'missing-list-import-hunk', 'commit-identity',
                      'original-blob', 'tagged-blob', 'wrong-parent', 'missing-tagged-root']:
            changed = copy.deepcopy(data)
            if fault == 'missing-commit': changed['reviews'].pop()
            elif fault == 'missing-root-file': changed['reviews'][0]['sections'].pop(0)
            elif fault == 'missing-list-import-hunk': changed['reviews'][3]['sections'][1]['hunks'].pop(0)
            elif fault == 'commit-identity': changed['reviews'][0]['raw_commit'] += '\n'
            elif fault == 'original-blob': changed['reviews'][0]['sections'][0]['before']['body'] += '\n'
            elif fault == 'tagged-blob': changed['tagged_reference']['members'][0]['body'] += '\n'
            elif fault == 'wrong-parent': changed['reviews'][0]['parent'] = '0' * 40
            else: changed['tagged_reference']['members'].pop(0)
            with self.subTest(fault=fault), self.assertRaises(AssertionError): verify_originals(changed)

    def test_real_Sass_contracts_and_mutations(self):
        source_root = os.environ.get('MODERN_CONTROL_REVIEW_SOURCE_ROOT', str(ROOT))
        output = os.environ.get('MODERN_CONTROL_REVIEW_REPORT')
        command = ['node', 'tests/modern_control_base_source_probe.mjs']
        if output: command += [output, source_root]
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['public_legacy_CSS_cases'], 12)
        self.assertEqual(result['direct_legacy_color_cases'], 4)
        self.assertEqual(result['actual_selector_CSS_faults_rejected'], 4)
        self.assertEqual(result['rejection_controls'], 19)
        self.assertTrue(result['repeat_measurement_identical'])
        self.assertFalse(result['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__': unittest.main()
