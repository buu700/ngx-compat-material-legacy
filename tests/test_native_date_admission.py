# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite actual native-date reader/CLI controls; synthetic runs qualify no product execution."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class NativeDateAdmission(unittest.TestCase):
    def test_actual_reader_semantics_and_CLI(self):
        command=['node','tests/upstream/native-date-admission.mjs']
        if os.environ.get('NGX_NATIVE_DATE_ADMISSION_DIAGNOSTIC'):
            command.append(os.environ['NGX_NATIVE_DATE_ADMISSION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['subjects'],1)
        self.assertEqual(report['full_packed_roster'],106)
        self.assertEqual(report['helper_controls'],28)
        self.assertEqual(report['cached_actual_reader_semantic_controls'],194)
        self.assertEqual(report['current_original_source_or_path_corruptions_rejected'],3)
        self.assertEqual(report['actual_CLI_controls'],16)
        self.assertTrue(report['registered_SHA_cannot_be_relabelled_away'])
        self.assertFalse(report['source_or_runtime_dispositions_changed'])
        self.assertFalse(report['actual_Angular_DI_or_artifact_factory_executed'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_exact_additional_registration_and_untouched_original_review(self):
        task=json.loads((ROOT/'compatibility/rc/native-date-admission-worksheet.json').read_bytes())
        stored=(ROOT/task['prior']['path']).read_bytes()
        self.assertEqual(hashlib.sha256(stored).hexdigest(),task['prior']['sha256'])
        raw=gzip.decompress(stored)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),task['prior']['raw_sha256'])
        prior=json.loads(raw)
        rules=json.loads((ROOT/'compatibility/rc/native-date-admission-checker-edits.json').read_bytes())
        member=rules['path'];before=subprocess.check_output(['git','show',task['source_parent']+':'+member],cwd=ROOT)
        self.assertEqual(prior['members'][0]['text'].encode(),before)
        text=before.decode()
        self.assertEqual(len(rules['edits']),3)
        for old,new in rules['edits']:
            self.assertEqual(text.count(old),1)
            text=text.replace(old,new)
        self.assertEqual((ROOT/member).read_bytes(),text.encode())
        original='compatibility/f10/disposition-ledger/evidence/closeout-native-date-source-review.json'
        self.assertEqual((ROOT/original).read_bytes(),subprocess.check_output(['git','show',task['source_parent']+':'+original],cwd=ROOT))
        self.assertEqual(json.loads((ROOT/original).read_bytes()),prior['native_review'])
