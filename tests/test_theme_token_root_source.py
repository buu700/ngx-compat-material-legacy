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
PREFIX = 'compatibility/rc/21x-c04-theme-token-root-'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()
SHAS = ['408c0b492f5d7edd6571b2287bb06aa89d582758','6cc6cf21f292d78c930cbda79c1f337bd6b82bfe']
PATHS = [['src/material/card/_card-theme.scss'],['src/material/tooltip/_tooltip-theme.scss']]


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
        assert [len(section['hunks']) for section in row['sections']] == ([5] if number == 0 else [3])
        assert row['frozen_seed_paths'] == authentic['ledger_comparison']['listed_paths']
        assert row['frozen_seed_paths'] == PATHS[number]
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
    assert count == 8 and data['original_hunks'] == count and data['original_file_occurrences'] == 2
    tagged = data['tagged_reference']
    assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert [row['path'] for row in tagged['members']] == worksheet['tag_source_paths']
    assert len(tagged['members']) == len({row['path'] for row in tagged['members']}) == 9
    for member in tagged['members']:
        raw = member['body'].encode()
        assert object_id('blob', raw) == member['blob'] and HASH(raw) == member['sha256'] and len(raw) == member['bytes']
    return dict(commits=2, original_files=2, original_hunks=count, before_after_blobs=4, tagged_sources=9)


def verify_helper_context(data, originals):
    assert data['originals']['sha256'] == 'e7343a775e1673e6cf7210cb4a58faafaa1da67f026bf013d1918b4d040340bd'
    assert len(data['contexts']) == 5
    expected = [(row['sha'], role, row['parent'] if role == 'before' else row['sha']) for row in originals['reviews'] for role in ['before','after']]
    expected.append((None, 'tagged16', originals['tagged_reference']['commit']))
    for context, (sha, role, commit) in zip(data['contexts'], expected):
        assert (context['review_sha'], context['role'], context['commit']) == (sha,role,commit)
        assert context['path'] == 'src/material/core/style/_sass-utils.scss'
        raw = context['body'].encode()
        assert object_id('blob', raw) == context['blob'] and HASH(raw) == context['sha256'] and len(raw) == context['bytes']
        assert context['tree_record'] == '100644 blob ' + context['blob'] + '\t' + context['path'] + '\0'
    assert len({row['blob'] for row in data['contexts']}) == 1


class ThemeTokenRootSourceTests(unittest.TestCase):
    def test_original_patches_helper_context_and_identity_failures(self):
        raw = (ROOT / (PREFIX + 'originals.json.gz')).read_bytes()
        self.assertEqual(HASH(raw), 'e7343a775e1673e6cf7210cb4a58faafaa1da67f026bf013d1918b4d040340bd')
        data = json.loads(gzip.decompress(raw))
        self.assertEqual(verify_originals(data)['original_hunks'], 8)
        context_raw = (ROOT / (PREFIX + 'helper-context.json')).read_bytes()
        self.assertEqual(HASH(context_raw),'45b5d569b49c782e60dbfa1923b9df70cf9a16306697d42200186b91f2a5babc')
        context = json.loads(context_raw); verify_helper_context(context,data)
        for fault in ['missing-commit','missing-import-hunk','missing-density-hunk','commit-identity','original-blob','wrong-parent','tagged-blob','missing-context','changed-helper','wrong-helper-commit','wrong-helper-tree']:
            changed, helper = copy.deepcopy(data),copy.deepcopy(context)
            if fault == 'missing-commit': changed['reviews'].pop()
            elif fault == 'missing-import-hunk': changed['reviews'][0]['sections'][0]['hunks'].pop(0)
            elif fault == 'missing-density-hunk': changed['reviews'][1]['sections'][0]['hunks'].pop()
            elif fault == 'commit-identity': changed['reviews'][0]['raw_commit'] += '\n'
            elif fault == 'original-blob': changed['reviews'][0]['sections'][0]['before']['body'] += '\n'
            elif fault == 'wrong-parent': changed['reviews'][0]['parent'] = '0' * 40
            elif fault == 'tagged-blob': changed['tagged_reference']['members'][0]['body'] += '\n'
            elif fault == 'missing-context': helper['contexts'].pop()
            elif fault == 'changed-helper': helper['contexts'][0]['body'] += '\n'
            elif fault == 'wrong-helper-commit': helper['contexts'][0]['commit'] = '0' * 40
            else: helper['contexts'][0]['tree_record'] += 'unreviewed'
            with self.subTest(fault=fault), self.assertRaises(AssertionError):
                verify_originals(changed); verify_helper_context(helper,changed)

    def test_actual_selector_relocation_legacy_outputs_and_mutations(self):
        command = ['node','tests/theme_token_root_source_probe.mjs']
        if os.environ.get('THEME_ROOT_REVIEW_REPORT'): command.append(os.environ['THEME_ROOT_REVIEW_REPORT'])
        child = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=150)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['original_selector_cases'],21)
        self.assertEqual(report['observable_selector_cases'],15)
        self.assertEqual(report['untouched16_modern_reference_cases'],18)
        self.assertEqual(report['actual_compiled_faults_rejected'],6)
        self.assertEqual(report['source_rejections'],7)
        self.assertTrue(report['fresh_measurement_matches_recorded'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__': unittest.main()
