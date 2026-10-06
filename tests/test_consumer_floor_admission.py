"""Floor admission rejects borrowed, stale, arithmetic-only or failed receipts."""
import copy
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from consumer_floor_admission import floor_assertion_ok, reviewed_configurations
from consumer_floor_fixture import write_floor_receipt

class FloorAdmissionTests(unittest.TestCase):
    def test_both_lines_and_invalid_receipts(self):
        plan=json.loads((ROOT/'compatibility/rc/consumer-floor-plan.json').read_text())
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line,'source_commit':'a'*40},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
                for case in reviewed_configurations(plan,line):
                    body=write_floor_receipt(ROOT,active,case,'one')
                    self.assertTrue(floor_assertion_ok(ROOT,active,body,'one'),case)
                    for field, value in [('runtime',{'version':'v24.21.0'}),('exit_code',1),('line','other'),('invocation_id','borrowed'),('binding',{}),('configuration',{}),('artifacts',{})]:
                        bad=copy.deepcopy(body);bad[field]=value
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'),(case,field))
                    self.assertFalse(floor_assertion_ok(ROOT,active,{'case_id':case,'kind':'assertion','result':'pass'},'one'))
                    if body['group']=='library-runtime':
                        bad=copy.deepcopy(body);bad['installed_versions']['rxjs']='7.8.2'
                        if body['installed_versions']['rxjs']!='7.8.2':self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
                        detail=active.run_dir/body['consumer_detail']['path'];detail.write_text('{}')
                        self.assertFalse(floor_assertion_ok(ROOT,active,body,'one'))
                    else:
                        bad=copy.deepcopy(body);bad['cli']['second_apply']['applied']=1
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
                        bad=copy.deepcopy(body);del bad['cli']['support_files']['lib/ts-rewrite.js']
                        self.assertFalse(floor_assertion_ok(ROOT,active,bad,'one'))
