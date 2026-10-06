import copy
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from migration_workspace_admission import old_workspace_assertion_ok, old_workspace_ids
from migration_workspace_fixture import workspace_receipt

class WorkspaceAdmissionTests(unittest.TestCase):
    def test_both_lines_and_unbound_or_failed_evidence(self):
        for line in ('main','21.x'):
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
            for case in [*old_workspace_ids(ROOT),'old-workspace/upgraded-consumer']:
                body=workspace_receipt(ROOT,active,case,'one')
                self.assertTrue(old_workspace_assertion_ok(ROOT,active,body,'one'),case)
                for field,value in [('tarball_used',False),('binding',{}),('line','foreign'),('invocation_id','borrowed'),('artifacts',{}),('material_manifest_sha256','f'*64),('cli_support',[])]:
                    bad=copy.deepcopy(body);bad[field]=value
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'),(case,field))
                for field,value in [('result','fail'),('skip_lib_check',True),('node','v18.0.0'),('versions',{}),('library_sha256','f'*64),('strict_templates',False)]:
                    bad=copy.deepcopy(body);bad['upgraded_consumer'][field]=value
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'),(case,field))
                bad=copy.deepcopy(body);bad['upgraded_consumer']['browser']['after']['value']=''
                self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'))
                if case!='old-workspace/upgraded-consumer':
                    bad=copy.deepcopy(body);bad['after']+='unrelated mutation'
                    self.assertFalse(old_workspace_assertion_ok(ROOT,active,bad,'one'))
