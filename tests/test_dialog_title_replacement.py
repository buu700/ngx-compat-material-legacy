# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent complete patch identities and actual finite Sass observations."""
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
PREFIX = 'compatibility/rc/21x-c04-dialog-title-replacement-'
SHAS = ['642d886ef117721a34c98055391c9055fde29607']
ZERO = '0' * 40
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def oid(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def verify_originals(data):
    assert [r['sha'] for r in data['reviews']] == SHAS
    assert HASH(data['worksheet_at_capture'].encode()) == data['inputs'][1]['sha256']
    worksheet = json.loads(data['worksheet_at_capture']);assert worksheet['selected_sha_ids'] == SHAS
    raw = (ROOT / data['inputs'][0]['path']).read_bytes()
    assert HASH(raw) == data['inputs'][0]['sha256'] == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
    census = {r['sha']:r for r in json.loads(gzip.decompress(raw))['commits']};assert len(census) == 1697
    hunks, blobs, absent, statuses = 0, 0, 0, {}
    for index, row in enumerate(data['reviews']):
        original = census[row['sha']]
        assert oid('commit',row['raw_commit'].encode()) == row['sha'] and row['raw_commit'] == original['raw_commit']
        assert row['parent'] == original['parents'][0]
        assert len(row['sections']) == [9][index]
        assert [s['path'] for s in row['sections']] == [m['path'] for m in original['complete_changed_files']]
        assert row['frozen_seed_paths'] == original['ledger_comparison']['listed_paths']
        assert ''.join(s['patch'] for s in row['sections']) == row['diff'] and HASH(row['diff'].encode()) == row['diff_sha256']
        for section, member in zip(row['sections'],original['complete_changed_files']):
            status = section['status'];statuses[status] = statuses.get(status,0)+1
            assert status == member['status'] and status in ('M','A','D')
            assert (section['before_mode'],section['after_mode']) == {'M':('100644','100644'),'A':('000000','100644'),'D':('100644','000000')}[status]
            assert (section['before_mode'],section['after_mode']) == (member['before_mode'],member['after_mode'])
            assert HASH(section['patch'].encode()) == section['patch_sha256']
            pair = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40})(?: 100644)?$',section['patch']);assert pair
            for side, blob in [('before',pair[1]),('after',pair[2])]:
                value = section[side];body = value['body'].encode()
                assert value['blob'] == member[side+'_blob'] == blob and HASH(body) == value['sha256'] and len(body) == value['bytes']
                if blob == ZERO:
                    assert (status,side) in [('A','before'),('D','after')] and section[side+'_mode'] == '000000'
                    assert value['absent'] is True and body == b'';absent += 1
                else:
                    assert oid('blob',body) == blob and not value.get('absent',False);blobs += 1
            parts = re.split(r'(?=^@@ )',section['patch'],flags=re.M)[1:]
            assert parts == [h['text'] for h in section['hunks']] and parts
            before, result, cursor = section['before']['body'].splitlines(keepends=True), [], 0
            for hunk in section['hunks']:
                assert HASH(hunk['text'].encode()) == hunk['sha256']
                header, *lines = hunk['text'].splitlines(keepends=True);assert header.strip() == hunk['header']
                match = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',header);assert match
                old = [line[1:] for line in lines if line[0] in ' -'];new = [line[1:] for line in lines if line[0] in ' +']
                assert all(line[0] in ' +-' for line in lines) and len(old) == int(match[2] or 1) and len(new) == int(match[4] or 1)
                start = int(match[1])-1 if old else int(match[1]);assert start >= cursor and before[start:start+len(old)] == old
                result.extend(before[cursor:start]);result.extend(new);cursor = start+len(old);hunks += 1
            result.extend(before[cursor:]);assert ''.join(result) == section['after']['body']
    assert statuses == data['actual_status_occurrences'] == {'M':9}
    assert (hunks,blobs,absent,data['original_file_occurrences'],data['original_hunks']) == (21,18,0,9,21)
    tagged = data['tagged_reference'];assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert [v['path'] for v in tagged['members']] == worksheet['tag_source_paths']
    assert len(tagged['members']) == len({v['path'] for v in tagged['members']}) == 18
    for value in tagged['members']:
        body = value['body'].encode();assert oid('blob',body) == value['blob'] and HASH(body) == value['sha256'] and len(body) == value['bytes']
    for section in data['reviews'][0]['sections']:
        assert section['after']['body'] == next(value['body'] for value in tagged['members'] if value['path']==section['path'])
    return dict(commits=1,files=9,hunks=21,present_blob_occurrences=18,explicit_absences=0,tagged_sources=18)


class DialogTitleReplacementTests(unittest.TestCase):
    def test_complete_originals_and_exact_untouched_tag_with_faults(self):
        raw=(ROOT/(PREFIX+'originals.json.gz')).read_bytes();self.assertEqual(HASH(raw),'8050f240fa4a48d260ef0a69ae9a7c46c3e9bea6cdac12ac44b4b314adc6709f')
        data=json.loads(gzip.decompress(raw));verify_originals(data)
        for fault in ['commit','parent','missing-CDK','missing-legacy','missing-API-guard','missing-hunk','original-body','tagged-body','mode','hunk-count','seed-paths','tag-id']:
            value=copy.deepcopy(data);row=value['reviews'][0]
            if fault=='commit':row['raw_commit']+='\n'
            elif fault=='parent':row['parent']=ZERO
            elif fault=='missing-CDK':row['sections'].pop(0)
            elif fault=='missing-legacy':row['sections'].pop(4)
            elif fault=='missing-API-guard':row['sections'].pop(-1)
            elif fault=='missing-hunk':row['sections'][3]['hunks'].pop()
            elif fault=='original-body':row['sections'][0]['before']['body']+='\n'
            elif fault=='tagged-body':value['tagged_reference']['members'][0]['body']+='\n'
            elif fault=='mode':row['sections'][0]['after_mode']='000000'
            elif fault=='hunk-count':value['original_hunks']+=1
            elif fault=='seed-paths':row['frozen_seed_paths'].pop()
            else:value['tagged_reference']['commit']=ZERO
            with self.subTest(fault=fault),self.assertRaises(AssertionError):verify_originals(value)
        replay=json.loads(gzip.decompress((ROOT/(PREFIX+'originals-offline-replay.json.gz')).read_bytes()));verify_originals(replay)
        self.assertEqual(replay['reviews'],data['reviews']);self.assertEqual(replay['tagged_reference'],data['tagged_reference']);self.assertEqual(replay['seed_capsule_sha256'],HASH(raw))
        self.assertFalse(any(v['origin']=='pinned-upstream-raw' for v in replay['acquisitions']))

    def test_real_title_lifecycles_tagged_oracle_and_runtime_faults(self):
        command=['node','tests/dialog_title_replacement_probe.mjs']
        if os.environ.get('DIALOG_TITLE_REPORT'):command.append(os.environ['DIALOG_TITLE_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        output=(child.stdout+child.stderr)
        self.assertEqual(child.returncode,0,output[-6000:]);r=json.loads(child.stdout)
        for key,n in [('original_after_cases',15),('tagged_cases',15),('owned_cases',18),('original_before_counterexamples',6),('compiled_lifecycle_mutants_rejected',9),('source_rejections',8)]:self.assertEqual(r[key],n,key)
        self.assertTrue(r['fresh_measurement_matches_recorded']);self.assertFalse(r['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__=='__main__':unittest.main()
