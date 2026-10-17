# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete modern input API patches and independent original classic contracts."""
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


class ChipInputApiScope(unittest.TestCase):
    def test_real_source_ownership_and_tagged_protocols_reject_api_behavior_corruptions(self):
        command=['node','tests/chip_input_api_scope_probe.mjs']
        if os.environ.get('NGX_CHIP_INPUT_API_SCOPE_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_INPUT_API_SCOPE_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual([report[k] for k in ['subjects','path_occurrences','original_hunks','existing_blob_occurrences']],[3,12,32,24])
        self.assertEqual(report['input_class_members'],29);self.assertEqual(report['list_tagged_members'],11)
        self.assertEqual(report['source_semantic_mutation_controls'],19);self.assertEqual(report['archive_reference_and_membership_controls'],6)
        self.assertEqual(report['separator_models'],3);self.assertEqual(report['separator_model_cases'],864)
        self.assertEqual(report['list_protocol_states'],6);self.assertEqual(report['stream_and_registration_protocols'],2)
        self.assertEqual(report['behavior_mutation_controls'],12);self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_all_32_original_hunks_apply_to_all_12_census_authenticated_paths(self):
        task=json.loads((ROOT/'compatibility/rc/chip-input-api-scope-worksheet.json').read_bytes());ref=task['originals'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);subjects=json.loads(raw)['subjects']
        pin=json.loads((ROOT/'compatibility/rc/upstream-complete-patch-census-checkpoint.json').read_bytes())['census'];censusbytes=(ROOT/pin['path']).read_bytes();self.assertEqual(sha(censusbytes),pin['sha256'])
        census={r['sha']:r for r in json.loads(gzip.decompress(censusbytes))['commits']};self.assertEqual(len(census),1697);self.assertEqual([r['sha'] for r in subjects],task['subjects'])
        total_paths=total_hunks=total_blobs=0
        for subject in subjects:
            with self.subTest(sha=subject['sha']),TemporaryDirectory(prefix='ngx-chip-input-api-original-') as directory:
                original=census[subject['sha']];self.assertEqual(subject['raw_commit'],original['raw_commit']);self.assertEqual(subject['parent'],original['parents'][0]);commit=subject['raw_commit'].encode()
                self.assertEqual(hashlib.sha1(b'commit '+str(len(commit)).encode()+b'\0'+commit).hexdigest(),subject['sha']);self.assertEqual(sha(subject['diff'].encode()),subject['diff_sha256'])
                changed=original['complete_changed_files'];self.assertEqual([r['path'] for r in subject['members']],[r['path'] for r in changed]);self.assertEqual([l.split(' b/')[1] for l in subject['diff'].splitlines() if l.startswith('diff --git ')],[r['path'] for r in changed])
                hunks=sum(l.startswith('@@ ') for l in subject['diff'].splitlines());self.assertEqual(hunks,subject['hunks']);total_hunks+=hunks
                for member,identity in zip(subject['members'],changed):
                    total_paths+=1;self.assertEqual(member['status'],'M');self.assertEqual(member['status'],identity['status'])
                    for side in ['before','after']:
                        data=member[side]['text'].encode();self.assertEqual(sha(data),member[side]['sha256']);blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();self.assertEqual(blob,identity[side+'_blob']);self.assertEqual(blob,member[side]['git_blob']);total_blobs+=1
                    path=Path(directory)/member['path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_text(member['before']['text'])
                for flags in [['--check'],[]]:
                    child=subprocess.run(['git','--no-replace-objects','apply','--whitespace=nowarn',*flags,'-'],cwd=directory,input=subject['diff'].encode(),capture_output=True,timeout=15);self.assertEqual(child.returncode,0,child.stderr.decode())
                for member in subject['members']:self.assertEqual((Path(directory)/member['path']).read_text(),member['after']['text'])
        self.assertEqual((total_paths,total_hunks,total_blobs),(12,32,24))

    def test_foundation_keeps_all_1697_ledger_entries_reviews_and_product_bytes(self):
        task=json.loads((ROOT/'compatibility/rc/chip-input-api-scope-worksheet.json').read_bytes());pin=task['prior'];stored=(ROOT/pin['path']).read_bytes();self.assertEqual(sha(stored),pin['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),pin['raw_sha256']);prior=json.loads(raw)
        self.assertEqual(prior['source_parent'],task['source_parent']);self.assertEqual(sha(prior['ledger_text'].encode()),prior['ledger_sha256']);self.assertEqual((ROOT/prior['ledger_path']).read_text(),prior['ledger_text'])
        for member in prior['reviews']+prior['owned_sources']:self.assertEqual(sha(member['text'].encode()),member['sha256']);self.assertEqual((ROOT/member['path']).read_text(),member['text'])
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff',task['source_parent'],'--','projects/ngx-material-legacy','reference'],cwd=ROOT),b'')
        self.assertEqual(subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','projects/ngx-material-legacy','reference'],cwd=ROOT),b'')
