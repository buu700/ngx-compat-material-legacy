# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rc_acceptance import DATEPICKER_LOADED_FILES, EvidenceError, EvidenceSnapshot, validate_datepicker_live_outputs

SHA = '2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b'

class DatepickerSealerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'root'
        self.run_dir = Path(self.temp.name) / 'run'
        self.root.mkdir(); self.run_dir.mkdir()
        self.prefix = 'evidence/upstream-audit-disposition/invoke/'
        (self.run_dir / self.prefix).mkdir(parents=True)
        for name in DATEPICKER_LOADED_FILES:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('trusted test checker')
        ledger = self.root / 'compatibility/f10/disposition-ledger/ledger.json'
        ledger.parent.mkdir(parents=True)
        ledger.write_text(json.dumps({'entries': [{'sha': SHA, 'individual_proof': {'proof_kind': 'main-datepicker-inherited-native'}}]}))
        self.binding = {'source_commit': 'a' * 40, 'source_tree': 'b' * 40}
        self.run = {'run_id': 'run'}; self.library = {'sha256': 'c' * 64, 'bytes': 10}
        self.cases = {'zoneless': {'baseline': False, 'negative': True}, 'zoneful': {'baseline': False, 'negative': True}}
        self.nonce = 'd' * 64; self.filename = f'datepicker-live-{self.nonce}.json'
        self.live_path = self.run_dir / self.prefix / self.filename
        self.live_path.write_text('{"raw":"fixture"}')
        self.live = self.record(self.live_path)
        self.row = {'sha': SHA, 'execution': 'live-packed-native-datepicker', 'output': self.filename,
                    'nonce': self.nonce, 'sha256': self.live['sha256'], 'bytes': self.live['bytes'],
                    'run_id': 'run', 'invocation_id': 'invoke', 'cases': self.cases, 'ok': False}
        self.assertion_path = self.run_dir / self.prefix / 'disposition-observations.json'
        self.write_assertion()
        self.report = {'outputs': [self.record(self.assertion_path), self.live]}

    def record(self, path):
        data = path.read_bytes()
        return {'path': path.relative_to(self.run_dir).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}

    def write_assertion(self):
        self.assertion_path.write_text(json.dumps({'run_id': 'run', 'invocation_id': 'invoke', 'binding': self.binding,
                                                   'inherited_execution_evidence': [self.row]}))

    def invoke(self):
        fake = SimpleNamespace(returncode=0, stderr='', stdout=json.dumps({'ok': True, 'record': self.live, 'cases': {SHA: self.cases}}))
        with patch('rc_acceptance.subprocess.run', return_value=fake):
            snapshot = EvidenceSnapshot(self.root, self.run_dir)
            result = validate_datepicker_live_outputs(snapshot, self.root, self.run_dir / 'run.json', self.run,
                                                       self.report, self.binding, 'invoke', self.library)
            snapshot.revalidate()
            return result

    def test_failed_case_is_retained_and_replayed(self):
        self.assertIn(self.live['path'], self.invoke())

    def test_omission_and_duplicate_rejected(self):
        self.report['outputs'] = self.report['outputs'][:1]
        with self.assertRaises(EvidenceError): self.invoke()
        self.report['outputs'].extend([self.live, self.live])
        with self.assertRaises(EvidenceError): self.invoke()

    def test_live_file_mutation_rejected(self):
        self.live_path.write_text('{"raw":"changed"}')
        with self.assertRaises(EvidenceError): self.invoke()

    def test_substituted_digest_and_relabelled_failure_rejected(self):
        self.report['outputs'][1] = dict(self.live, sha256='0' * 64)
        with self.assertRaises(EvidenceError): self.invoke()
        self.report['outputs'][1] = self.live
        self.row['ok'] = True; self.write_assertion(); self.report['outputs'][0] = self.record(self.assertion_path)
        with self.assertRaises(EvidenceError): self.invoke()

    def test_subject_omission_rejected(self):
        self.assertion_path.write_text(json.dumps({'run_id': 'run', 'invocation_id': 'invoke', 'binding': self.binding,
                                                   'inherited_execution_evidence': []}))
        self.report['outputs'][0] = self.record(self.assertion_path)
        with self.assertRaises(EvidenceError): self.invoke()

if __name__ == '__main__': unittest.main()
