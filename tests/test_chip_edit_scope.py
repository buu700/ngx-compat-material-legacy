# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole modern editing patches and the distinct classic chip source owner."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


class ChipEditScope(unittest.TestCase):
    def test_current_sources_reject_editing_API_routes_fields_and_structural_styles(self):
        command=['node','tests/chip_edit_scope_probe.mjs']
        if os.environ.get('NGX_CHIP_EDIT_SCOPE_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_EDIT_SCOPE_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual([report[k] for k in ['subjects','path_occurrences','hunks','existing_blob_occurrences','absent_preimages']],[3,23,65,45,1])
        self.assertGreater(report['typescript_members'],300);self.assertGreater(report['TS_and_resource_members'],report['typescript_members'])
        self.assertEqual(report['historical_MDC_facade_members'],2)
        self.assertEqual(report['semantic_mutation_controls'],31)
        self.assertEqual(report['independent_Sass_normalization_controls'],3);self.assertEqual(report['comment_identity_control'],1)
        self.assertEqual(report['archive_reference_and_membership_controls'],8)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_all_65_hunks_apply_to_census_authenticated_preimages_including_absent_new_harness(self):
        task=json.loads((ROOT/'compatibility/rc/chip-edit-scope-worksheet.json').read_bytes())
        ref=task['originals'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);subjects=json.loads(raw)['subjects']
        pin=json.loads((ROOT/'compatibility/rc/upstream-complete-patch-census-checkpoint.json').read_bytes())['census']
        census_bytes=(ROOT/pin['path']).read_bytes();self.assertEqual(sha(census_bytes),pin['sha256'])
        census={r['sha']:r for r in json.loads(gzip.decompress(census_bytes))['commits']}
        self.assertEqual(len(census),1697);self.assertEqual([s['sha'] for s in subjects],task['subjects'])
        total_paths=total_hunks=total_blobs=absent=0
        for subject in subjects:
            with self.subTest(sha=subject['sha']),TemporaryDirectory(prefix='ngx-chip-edit-original-') as directory:
                original=census[subject['sha']]
                self.assertEqual(subject['raw_commit'],original['raw_commit']);self.assertEqual(subject['parent'],original['parents'][0])
                raw_commit=subject['raw_commit'].encode();self.assertEqual(hashlib.sha1(b'commit '+str(len(raw_commit)).encode()+b'\0'+raw_commit).hexdigest(),subject['sha'])
                self.assertEqual(sha(subject['diff'].encode()),subject['diff_sha256'])
                changed=original['complete_changed_files'];self.assertEqual([m['path'] for m in subject['members']],[m['path'] for m in changed])
                self.assertEqual([l.split(' b/')[1] for l in subject['diff'].splitlines() if l.startswith('diff --git ')],[m['path'] for m in changed])
                hunks=sum(l.startswith('@@ ') for l in subject['diff'].splitlines());self.assertEqual(hunks,subject['hunks']);total_hunks+=hunks
                for member,identity in zip(subject['members'],changed):
                    total_paths+=1;self.assertEqual(member['status'],identity['status'])
                    for side in ['before','after']:
                        if member[side] is None:
                            self.assertEqual(side,'before');self.assertEqual(identity['status'],'A');self.assertEqual(identity[side+'_blob'],'0'*40);absent+=1
                            continue
                        data=member[side]['text'].encode();self.assertEqual(sha(data),member[side]['sha256'])
                        blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();self.assertEqual(blob,identity[side+'_blob']);self.assertEqual(blob,member[side]['git_blob']);total_blobs+=1
                    path=Path(directory)/member['path'];path.parent.mkdir(parents=True,exist_ok=True)
                    if member['before'] is not None:path.write_text(member['before']['text'])
                    else:self.assertFalse(path.exists())
                for flags in [['--check'],[]]:
                    result=subprocess.run(['git','--no-replace-objects','apply','--whitespace=nowarn',*flags,'-'],cwd=directory,input=subject['diff'].encode(),capture_output=True,timeout=15)
                    self.assertEqual(result.returncode,0,result.stderr.decode())
                for member in subject['members']:self.assertEqual((Path(directory)/member['path']).read_text(),member['after']['text'])
        self.assertEqual((total_paths,total_hunks,total_blobs,absent),(23,65,45,1))

    def test_foundation_retains_all_ledger_review_and_product_bytes(self):
        task=json.loads((ROOT/'compatibility/rc/chip-edit-scope-worksheet.json').read_bytes());pin=task['prior'];stored=(ROOT/pin['path']).read_bytes()
        self.assertEqual(sha(stored),pin['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),pin['raw_sha256']);prior=json.loads(raw)
        self.assertEqual(prior['source_parent'],task['source_parent'])
        parent=prior['source_parent']
        # This bounded foundation owns neither ledger nor product. Later admission
        # must preserve this exact stage and independently validate its live migration.
        self.assertEqual((ROOT/prior['ledger_path']).read_bytes(),prior['ledger_text'].encode())
        self.assertEqual(sha(prior['ledger_text'].encode()),prior['ledger_sha256'])
        for m in prior['reviews']+prior['owned_sources']:
            self.assertEqual(sha(m['text'].encode()),m['sha256']);self.assertEqual((ROOT/m['path']).read_bytes(),m['text'].encode())
        delta=subprocess.check_output(['git','--no-replace-objects','diff',parent,'--','projects/ngx-material-legacy','reference'],cwd=ROOT)
        self.assertEqual(delta,b'')
        untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','projects/ngx-material-legacy','reference'],cwd=ROOT)
        self.assertEqual(untracked,b'')
