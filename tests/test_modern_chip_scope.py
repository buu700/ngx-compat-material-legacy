# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original hunks and genuine current chip source ownership."""
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


class ModernChipScope(unittest.TestCase):
    def test_current_AST_boundary_rejects_real_import_export_and_subtype_routes(self):
        command=['node','tests/modern_chip_scope_probe.mjs']
        if os.environ.get('NGX_MODERN_CHIP_SCOPE_DIAGNOSTIC'):command.append(os.environ['NGX_MODERN_CHIP_SCOPE_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-9000:])
        report=json.loads(result.stdout.strip().splitlines()[-1]);self.assertEqual(report['subjects'],3)
        self.assertEqual(report['original_blobs'],10);self.assertGreater(report['typescript_members'],300)
        self.assertEqual(report['semantic_mutation_controls'],20);self.assertEqual(report['prose_controls'],3)
        self.assertEqual(report['archive_and_membership_controls'],4);self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_all_original_hunks_apply_to_all_authenticated_source_preimages(self):
        task=json.loads((ROOT/'compatibility/rc/modern-chip-scope-worksheet.json').read_bytes());ref=task['original_subjects'];stored=(ROOT/ref['path']).read_bytes()
        self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);subjects=json.loads(raw)['subjects']
        census_path=ROOT/'compatibility/rc/upstream-complete-patch-census.json.gz'
        pin=json.loads((ROOT/'compatibility/rc/upstream-complete-patch-census-checkpoint.json').read_bytes())['census']
        self.assertEqual(sha(census_path.read_bytes()),pin['sha256'])
        census={row['sha']:row for row in json.loads(gzip.decompress(census_path.read_bytes()))['commits']}
        self.assertEqual([r['sha'] for r in subjects],task['subjects'])
        for subject in subjects:
            with self.subTest(sha=subject['sha']),TemporaryDirectory(prefix='ngx-original-chip-patch-') as directory:
                original=census[subject['sha']];self.assertEqual(subject['raw_commit'],original['raw_commit']);self.assertEqual(subject['parent'],original['parents'][0])
                changed=original['complete_changed_files'];self.assertEqual([m['path'] for m in subject['members']],[m['path'] for m in changed])
                for member,identity in zip(subject['members'],changed):
                    for side in ['before','after']:
                        data=member[side]['text'].encode();self.assertEqual(sha(data),member[side]['sha256'])
                        blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();self.assertEqual(blob,identity[side+'_blob']);self.assertEqual(blob,member[side]['git_blob'])
                    path=Path(directory)/member['path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_text(member['before']['text'])
                for flags in [['--check'],[]]:
                    result=subprocess.run(['git','--no-replace-objects','apply','--whitespace=nowarn',*flags,'-'],cwd=directory,input=subject['diff'].encode(),capture_output=True)
                    self.assertEqual(result.returncode,0,result.stderr.decode())
                for member in subject['members']:self.assertEqual((Path(directory)/member['path']).read_text(),member['after']['text'])
        # Preserve the no-ledger-write assertion at the exact sealed foundation
        # subject. The subsequent migration tests independently check all current
        # rows and reject every unrelated byte change.
        admission=json.loads((ROOT/'compatibility/rc/modern-chip-admission-worksheet.json').read_bytes())
        current=subprocess.check_output(['git','--no-replace-objects','show',admission['source_parent']+':compatibility/f10/disposition-ledger/ledger.json'],cwd=ROOT)
        before=subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':compatibility/f10/disposition-ledger/ledger.json'],cwd=ROOT)
        self.assertEqual(current,before)
        self.assertEqual(subprocess.check_output(['git','diff',task['source_parent'],'--','projects','testing','reference','fixtures'],cwd=ROOT),b'')
