# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Tagged focus repair, public original/minimum replay and stable historical IDs."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


class ChipListFocusContract(unittest.TestCase):
    def test_original_and_minimum_public_managers_reproduce_and_repair_contract(self):
        result=subprocess.run(['node','--experimental-vm-modules','--max-old-space-size=768','tests/chip_list_focus_contract_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=75)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-9000:])
        report=json.loads(result.stdout);self.assertEqual(len(report['observations']),3);self.assertEqual(len(report['mutations']),12)
        for row in report['observations']:
            self.assertEqual(len(row['cases']),9);self.assertEqual(row['cases'],report['observations'][0]['cases'])
        for row in report['baseline']:self.assertEqual(row['previous_candidate_drift'],['later-active','disabled-active'])
        self.assertEqual(report['source_contract_mutations_rejected'],6)
        self.assertFalse(report['native_execution']);self.assertFalse(report['contract']['actual_native_packed_or_floor_qualified'])
        self.assertEqual(report['g11_claim'],'not-passed')

    def test_whole_original_patches_and_preserved_historical_roster(self):
        task=json.loads((ROOT/'compatibility/rc/chip-list-contract-worksheet.json').read_bytes())
        def capsule(ref):
            stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);return json.loads(raw)
        prior=capsule(task['prior']);originals=capsule(task['originals'])['subjects']
        reference=task['reference'];self.assertEqual(sha((ROOT/reference['path']).read_bytes()),reference['sha256'])
        census_path=ROOT/'compatibility/rc/upstream-complete-patch-census.json.gz';pin=json.loads((ROOT/'compatibility/rc/upstream-complete-patch-census-checkpoint.json').read_bytes())['census']
        self.assertEqual(sha(census_path.read_bytes()),pin['sha256']);census={r['sha']:r for r in json.loads(gzip.decompress(census_path.read_bytes()))['commits']}
        for subject in originals:
            with self.subTest(sha=subject['sha']),TemporaryDirectory(prefix='ngx-classic-chip-original-') as work:
                original=census[subject['sha']];self.assertEqual(subject['raw_commit'],original['raw_commit']);self.assertEqual(subject['parent'],original['parents'][0]);self.assertEqual(len(subject['members']),1)
                self.assertEqual(sha(subject['diff'].encode()),subject['diff_sha256'])
                for member,identity in zip(subject['members'],original['complete_changed_files']):
                    self.assertEqual(member['path'],identity['path'])
                    for side in ['before','after']:
                        data=member[side]['text'].encode();self.assertEqual(sha(data),member[side]['sha256']);blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();self.assertEqual(blob,identity[side+'_blob']);self.assertEqual(blob,member[side]['git_blob'])
                    p=Path(work)/member['path'];p.parent.mkdir(parents=True,exist_ok=True);p.write_text(member['before']['text'])
                for options in [['--check'],[]]:
                    result=subprocess.run(['git','--no-replace-objects','apply','--whitespace=nowarn',*options,'-'],cwd=work,input=subject['diff'].encode(),capture_output=True);self.assertEqual(result.returncode,0,result.stderr.decode())
                for member in subject['members']:self.assertEqual((Path(work)/member['path']).read_text(),member['after']['text'])
        result=subprocess.run(['node','--input-type=module','-e',"import {deriveHistoricalRoster} from './scripts/historical-case-roster.mjs';console.log(JSON.stringify(deriveHistoricalRoster()));"],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr);current=json.loads(result.stdout);byid={r['case_id']:r for r in current['cases']}
        for old in prior['roster']['cases']:self.assertEqual(byid[old['case_id']],old)
        self.assertEqual(current['discovery_negative_ids'],prior['roster']['discovery_negative_ids']);self.assertEqual(len(current['ids']),2227)
        added=[r for r in current['cases'] if r['case_id'] not in set(prior['roster']['ids'])]
        self.assertEqual([r['index'] for r in added],[88,89,90,91]);self.assertTrue(all(r['candidate'].endswith('legacy-chips/chip-list.spec.ts') for r in added))
        matrix=json.loads((ROOT/'compatibility/rc/matrices/full-verify.json').read_bytes());groups=next(r for r in matrix['checks'] if r['check_id']=='historical-legacy-artifact')['acceptance']['cases_by_line'][task['line']]
        self.assertEqual(set(groups['original-and-shared-cases']),set(current['ids']));self.assertEqual(groups['discovery-negatives'],current['discovery_negative_ids']);self.assertEqual(sum(map(len,groups.values())),2232)
        old_matrix=json.loads(next(s['text'] for s in prior['sources'] if s['path']=='compatibility/rc/matrices/full-verify.json'));oldgroups=next(r for r in old_matrix['checks'] if r['check_id']=='historical-legacy-artifact')['acceptance']['cases_by_line'][task['line']]
        self.assertEqual(groups['original-and-shared-cases'][:-4],oldgroups['original-and-shared-cases'])
