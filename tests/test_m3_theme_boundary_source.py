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
PREFIX = 'compatibility/rc/21x-c04-m3-theme-boundary-'
SHAS = ['3f544ef015fbb8c56e991d4e0a9a539d9e153577','027b171c91fc880aef3b3a66cb7c5d0f5c419501','305af4f0e0e0f68e929b6aeb328296ac42295c16','0df4d082e0aab1958fdbe5aa48fef0203079abc2','32981cc4500a8c0065574bfb1357d2d8a78494de']
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
        assert len(row['sections']) == [5,7,6,1,5][index]
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
    assert statuses == data['actual_status_occurrences'] == {'M':21,'D':1,'A':2}
    assert (hunks,blobs,absent,data['original_file_occurrences'],data['original_hunks']) == (42,45,3,24,42)
    tagged = data['tagged_reference'];assert tagged['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
    assert [v['path'] for v in tagged['members']] == worksheet['tag_source_paths']
    assert len(tagged['members']) == len({v['path'] for v in tagged['members']}) == 21
    for value in tagged['members']:
        body = value['body'].encode();assert oid('blob',body) == value['blob'] and HASH(body) == value['sha256'] and len(body) == value['bytes']
    token = next(v for v in tagged['members'] if v['path']=='src/material/_token-theming.scss')
    assert token['blob'] == '0783e8e5bb061d6337a83e81b9486a51248c5cf7'
    assert token['body'] == data['reviews'][0]['sections'][2]['before']['body']
    return dict(commits=5,files=24,hunks=42,present_blob_occurrences=45,explicit_absences=3,tagged_sources=21)


class M3ThemeBoundarySourceTests(unittest.TestCase):
    def test_complete_originals_added_deleted_files_and_identity_faults(self):
        raw = (ROOT/(PREFIX+'originals.json.gz')).read_bytes();self.assertEqual(HASH(raw),'9fd83918610ec1133fe0f31d74a6b01c96155dff3c4913167c045b716d242805')
        data = json.loads(gzip.decompress(raw));verify_originals(data)
        for fault in ['commit','parent','missing-BUILD','missing-deletion','missing-added-module','missing-CODEOWNERS','missing-hunk','original-body','tagged-body','present-added-before','present-deleted-after','nonempty-absence','changed-mode','wrong-count']:
            changed = copy.deepcopy(data)
            added = next(s for s in changed['reviews'][1]['sections'] if s['status']=='A')
            deleted = next(s for s in changed['reviews'][0]['sections'] if s['status']=='D')
            if fault=='commit':changed['reviews'][0]['raw_commit'] += '\n'
            elif fault=='parent':changed['reviews'][0]['parent'] = ZERO
            elif fault=='missing-BUILD':changed['reviews'][0]['sections'].pop(0)
            elif fault=='missing-deletion':changed['reviews'][0]['sections'].remove(deleted)
            elif fault=='missing-added-module':changed['reviews'][1]['sections'].remove(added)
            elif fault=='missing-CODEOWNERS':changed['reviews'][2]['sections'].pop(0)
            elif fault=='missing-hunk':changed['reviews'][4]['sections'][-1]['hunks'].pop()
            elif fault=='original-body':added['after']['body'] += '\n'
            elif fault=='tagged-body':changed['tagged_reference']['members'][-1]['body'] += '\n'
            elif fault=='present-added-before':added['before']['blob'] = oid('blob',b'');added['before']['absent'] = False
            elif fault=='present-deleted-after':deleted['after']['blob'] = oid('blob',b'');deleted['after']['absent'] = False
            elif fault=='nonempty-absence':added['before']['body'] = '\n'
            elif fault=='changed-mode':added['before_mode'] = '100644'
            else:changed['original_hunks'] += 1
            with self.subTest(fault=fault),self.assertRaises(AssertionError):verify_originals(changed)
        replay = json.loads(gzip.decompress((ROOT/(PREFIX+'originals-offline-replay.json.gz')).read_bytes()));verify_originals(replay)
        self.assertEqual(replay['reviews'],data['reviews']);self.assertEqual(replay['tagged_reference'],data['tagged_reference']);self.assertEqual(replay['seed_capsule_sha256'],HASH(raw))
        self.assertFalse(any(v['origin']=='pinned-upstream-raw' for v in replay['acquisitions']))
        env = {**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
        absent = json.loads(data['worksheet_at_capture'])['tagged_absent_paths']
        self.assertEqual(len(absent),4)
        out = subprocess.check_output(['git','--git-dir=/home/parallels/.cache/angular-components.git','ls-tree','-r','-z',data['tagged_reference']['commit'],'--',*absent],env=env)
        self.assertEqual(out,b'')

    def test_actual_finite_Sass_exports_warnings_helpers_and_coexistence(self):
        command = ['node','tests/m3_theme_boundary_source_probe.mjs']
        if os.environ.get('M3_BOUNDARY_REPORT'):command.append(os.environ['M3_BOUNDARY_REPORT'])
        child = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-5000:]);report = json.loads(child.stdout)
        for key,value in [('historical_default_CSS_cases',16),('historical_warning_and_density_cases',6),('original_inspection_cases',8),('coexistence_source_compile_cases',4),('compiled_warning_faults_rejected',1),('compiled_inspection_faults_rejected',1),('compiled_contamination_faults_rejected',1),('source_rejections',7)]:self.assertEqual(report[key],value,key)
        self.assertFalse(report['fresh_measurement_matches_recorded']);self.assertTrue(report['fresh_current_measurement_matches_finite_successor']);self.assertTrue(report['old_report_and_26_program_transport_preserved']);self.assertEqual(report['current_producer_execution_line'],'21.x');self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__=='__main__':unittest.main()
