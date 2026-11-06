# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.

"""Exercise admission with actual archive bytes, never a parser mock."""
import copy
import hashlib
import io
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from migration_workspace_admission import old_workspace_assertion_ok
from migration_workspace_fixture import workspace_receipt
from migration_cli_fixture import CLI_MEMBERS, cli_payload, write_cli_archive

class CliArchiveAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.directory=Path(self.temp.name)
        self.artifact=write_cli_archive(self.directory)
        self.active=SimpleNamespace(run_dir=self.directory,binding={'source_line':'main'},manifest={
            'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},self.artifact]})
        self.body=workspace_receipt(ROOT,self.active,'old-workspace/upgraded-consumer','one')
        self.assertTrue(self.accept())
    def accept(self):
        return old_workspace_assertion_ok(ROOT,self.active,self.body,'one')
    def replace_archive(self,raw):
        (self.directory/self.artifact['path']).write_bytes(raw)
        self.artifact.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
        self.body['artifacts']['migrate-cli']=self.artifact['sha256']
        self.body['upgraded_consumer']['cli_sha256']=self.artifact['sha256']
    def archive(self, entries):
        data=io.BytesIO()
        with tarfile.open(fileobj=data,mode='w:gz') as archive:
            for name,payload,kind in entries:
                item=tarfile.TarInfo(name);item.type=kind;item.size=len(payload) if kind==tarfile.REGTYPE else 0
                archive.addfile(item,io.BytesIO(payload) if item.size else None)
        return data.getvalue()
    def test_forged_claims_and_field_swap_are_rejected(self):
        original=copy.deepcopy(self.body)
        for field,value in [('sha256','0'*64),('bytes',1)]:
            self.body=copy.deepcopy(original);self.body['cli_support'][0][field]=value;self.assertFalse(self.accept(),field)
        self.body=copy.deepcopy(original);self.body['cli'],self.body['cli_support'][0]=self.body['cli_support'][0],self.body['cli'];self.assertFalse(self.accept())
        self.body=original;(self.directory/self.artifact['path']).write_bytes(b'tamper');self.assertFalse(self.accept())
    def test_invalid_archives_are_rejected_even_with_matching_hash(self):
        valid=[(name,cli_payload(name),tarfile.REGTYPE) for name in CLI_MEMBERS]
        for name,entries in [
            ('duplicate',valid+[valid[0]]),('traversal',valid+[('package/../escape',b'x',tarfile.REGTYPE)]),
            ('link',valid+[('package/link',b'',tarfile.SYMTYPE)]),('missing',valid[:-1]),
            ('oversize',valid+[('package/large',b'x'*(10*1024*1024+1),tarfile.REGTYPE)])]:
            with self.subTest(name=name):
                self.replace_archive(self.archive(entries));self.assertFalse(self.accept())
        self.replace_archive(b'\x1f\x8b\x08\x00'+b'\0'*6+b'\xff'*100);self.assertFalse(self.accept())
