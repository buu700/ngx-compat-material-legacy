# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original reconstruction includes deletion and independently bounded absences."""
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
PREFIX = 'compatibility/rc/21x-c04-form-field-tokenization-'
SHAS = ['98f610d192015599d8e0ce1a0f2a455c31ced558','c0b3aa524115e9b2b2b5fabd2e7cec44111b8e0e']
ZERO = '0' * 40
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def oid(kind, raw): return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def verify_originals(data):
    assert [row['sha'] for row in data['reviews']] == SHAS
    assert HASH(data['worksheet_at_capture'].encode()) == data['inputs'][1]['sha256']
    worksheet = json.loads(data['worksheet_at_capture']); assert worksheet['selected_sha_ids'] == SHAS
    raw = (ROOT / data['inputs'][0]['path']).read_bytes()
    assert HASH(raw) == data['inputs'][0]['sha256'] == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
    census = {row['sha']:row for row in json.loads(gzip.decompress(raw))['commits']}; assert len(census) == 1697
    hunks, blobs, absences, statuses = 0,0,0,{}
    for number,row in enumerate(data['reviews']):
        authentic = census[row['sha']]
        assert oid('commit',row['raw_commit'].encode()) == row['sha'] and row['raw_commit'] == authentic['raw_commit']
        assert row['parent'] == authentic['parents'][0]
        assert len(row['sections']) == (11 if number == 0 else 6)
        assert [s['path'] for s in row['sections']] == [m['path'] for m in authentic['complete_changed_files']]
        assert row['frozen_seed_paths'] == authentic['ledger_comparison']['listed_paths']
        assert ''.join(s['patch'] for s in row['sections']) == row['diff'] and HASH(row['diff'].encode()) == row['diff_sha256']
        for section,member in zip(row['sections'],authentic['complete_changed_files']):
            status = section['status'];statuses[status] = statuses.get(status,0)+1
            assert status == member['status'] and status in ['M','D']
            assert (section['before_mode'],section['after_mode']) == (member['before_mode'],member['after_mode'])
            assert HASH(section['patch'].encode()) == section['patch_sha256']
            index = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40})(?: 100644)?$',section['patch']);assert index
            for side,blob in [('before',index[1]),('after',index[2])]:
                body = section[side];raw = body['body'].encode()
                assert body['blob'] == member[side+'_blob'] == blob and HASH(raw) == body['sha256'] and len(raw) == body['bytes']
                if blob == ZERO:
                    assert status == 'D' and side == 'after' and section[side+'_mode'] == '000000'
                    assert raw == b'' and body['absent'] is True;absences += 1
                else:
                    assert oid('blob',raw) == blob and not body.get('absent',False);blobs += 1
            patch_hunks = re.split(r'(?=^@@ )',section['patch'],flags=re.M)[1:]
            assert patch_hunks == [h['text'] for h in section['hunks']] and patch_hunks
            before,result,cursor = section['before']['body'].splitlines(keepends=True),[],0
            for h in section['hunks']:
                assert HASH(h['text'].encode()) == h['sha256'];header,*lines = h['text'].splitlines(keepends=True)
                assert header.strip() == h['header'];match = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',header);assert match
                old = [line[1:] for line in lines if line[0] in ' -'];new = [line[1:] for line in lines if line[0] in ' +']
                assert all(line[0] in ' +-' for line in lines) and len(old) == int(match[2] or 1) and len(new) == int(match[4] or 1)
                start = int(match[1])-1 if old else int(match[1]);assert start >= cursor and before[start:start+len(old)] == old
                result.extend(before[cursor:start]);result.extend(new);cursor = start+len(old);hunks += 1
            result.extend(before[cursor:]);assert ''.join(result) == section['after']['body']
    assert statuses == data['actual_status_occurrences'] == {'M':16,'D':1}
    assert (hunks,blobs,absences,data['original_file_occurrences'],data['original_hunks']) == (32,33,1,17,32)
    tagged = data['tagged_reference'];assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert [r['path'] for r in tagged['members']] == worksheet['tag_source_paths']
    assert len(tagged['members']) == len({r['path'] for r in tagged['members']}) == 29
    for member in tagged['members']:
        raw = member['body'].encode();assert oid('blob',raw) == member['blob'] and HASH(raw) == member['sha256'] and len(raw) == member['bytes']
    return dict(commits=2,files=17,hunks=32,before_after_blobs=33,explicit_absences=1,tagged_sources=29)


class FormFieldTokenizationSourceTests(unittest.TestCase):
    def test_complete_originals_deletion_and_real_identity_failures(self):
        raw = (ROOT/(PREFIX+'originals.json.gz')).read_bytes();self.assertEqual(HASH(raw),'e33b0311916a938d9752abad9211326bcf0e608426996d7e5ba927e04ca1ea0c')
        data = json.loads(gzip.decompress(raw));self.assertEqual(verify_originals(data)['hunks'],32)
        for fault in ['commit','missing-BUILD','missing-deletion','missing-typography-hunk','original-blob','wrong-parent','tagged-blob','fake-empty-present-file','nonempty-absent-file','changed-mode','wrong-hunk-count']:
            changed = copy.deepcopy(data);deleted = next(s for s in changed['reviews'][0]['sections'] if s['status']=='D')
            if fault == 'commit': changed['reviews'][0]['raw_commit'] += '\n'
            elif fault == 'missing-BUILD': changed['reviews'][0]['sections'].pop(3)
            elif fault == 'missing-deletion': changed['reviews'][0]['sections'].remove(deleted)
            elif fault == 'missing-typography-hunk': changed['reviews'][1]['sections'][0]['hunks'].pop()
            elif fault == 'original-blob': changed['reviews'][0]['sections'][0]['before']['body'] += '\n'
            elif fault == 'wrong-parent': changed['reviews'][0]['parent'] = ZERO
            elif fault == 'tagged-blob': changed['tagged_reference']['members'][0]['body'] += '\n'
            elif fault == 'fake-empty-present-file': deleted['after']['blob'] = oid('blob',b'');deleted['after']['absent'] = False
            elif fault == 'nonempty-absent-file': deleted['after']['body'] = '\n'
            elif fault == 'changed-mode': deleted['after_mode'] = '100644'
            else: changed['original_hunks'] += 1
            with self.subTest(fault=fault),self.assertRaises(AssertionError):verify_originals(changed)
        replay = json.loads(gzip.decompress((ROOT/(PREFIX+'originals-offline-replay.json.gz')).read_bytes()));verify_originals(replay)
        self.assertEqual(replay['reviews'],data['reviews']);self.assertEqual(replay['tagged_reference'],data['tagged_reference'])
        self.assertEqual(replay['seed_capsule_sha256'],HASH(raw))
        self.assertFalse(any(r['origin']=='pinned-upstream-raw' for r in replay['acquisitions']))
        self.assertEqual(sum(r['origin']=='verified-absent-tree-member' for r in replay['acquisitions']),1)

    def test_real_legacy_state_and_typography_contracts_with_faults(self):
        command = ['node','tests/form_field_tokenization_source_probe.mjs']
        if os.environ.get('FIELD_TOKEN_REVIEW_REPORT'):command.append(os.environ['FIELD_TOKEN_REVIEW_REPORT'])
        child = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=150)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r = json.loads(child.stdout)
        for key,value in [('historical_default_CSS_cases',5),('finite_state_cases',6),('original_snapshots',4),('exact_typography_recipes',4),('compiled_faults_rejected',3),('explicit_absent_module_rejected',1),('source_rejections',6)]:self.assertEqual(r[key],value,key)
        self.assertTrue(r['fresh_measurement_matches_recorded']);self.assertFalse(r['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':unittest.main()
