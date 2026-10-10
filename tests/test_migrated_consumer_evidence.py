"""Retained consumer files enter the coordinator snapshot; synthetic receipts only."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from test_rc_acceptance import CompleteFixture,write_json
from migration_workspace_fixture import workspace_receipt
from migration_workspace_admission import old_workspace_ids,SUPPORT_FILES
import rc_acceptance as acceptance

class MigratedConsumerEvidenceTests(unittest.TestCase):
    def test_actual_line_coordinator_seals_support_and_detects_tamper(self):
        spec=importlib.util.spec_from_file_location('migrated_evidence_verify',ROOT/'scripts/rc-verify.py');verify=importlib.util.module_from_spec(spec);spec.loader.exec_module(verify)
        source_line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('21.') else 'main'
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);fixture=CompleteFixture(root,line=source_line)
            for path in ['package.json','projects/ngx-material-legacy/package.json','scripts/migrated-consumer-proof.mjs','fixtures/migration/cases.json','reference/material-16.2.14/PROVENANCE.json','toolchain-lock.json','compatibility/rc/consumer-floor-plan.json']:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
            actual=json.loads((ROOT/'compatibility/rc/matrices/full-verify.json').read_text())
            row=next(row for row in actual['checks'] if row['check_id']=='migration-packaged')
            fixture.matrix['checks']=[row if item['check_id']=='migration-packaged' else item for item in fixture.matrix['checks']]
            write_json(fixture.matrix_path,fixture.matrix);fixture.matrix_sha=acceptance.sha256_file(fixture.matrix_path)
            fixture.run['expected_matrix']['sha256']=fixture.matrix_sha
            fixture.write_pack_record();fixture.binding=acceptance.binding_for(fixture.run,fixture.matrix_sha);fixture.save_execution_record()
            active=verify.RunEvidence(fixture.run,fixture.run_dir,fixture.matrix_sha)
            invocation=active.invocation('migration-packaged');fixture.invocations['migration-packaged']=invocation
            directory=fixture.run_dir/acceptance.assertion_directory('migration-packaged',invocation);directory.mkdir(parents=True,exist_ok=True)
            ids=acceptance.expected_cases(row,source_line)
            for case in ids:
                if case in old_workspace_ids(ROOT) or case=='old-workspace/upgraded-consumer':body=workspace_receipt(ROOT,active,case,invocation)
                else:body={'case_id':case,'result':'pass','kind':'assertion','line':source_line}
                write_json(directory/(case.replace('/','__')+'.json'),body)
            path=fixture.run_dir/'reports/migration-packaged.json';path.unlink()
            with patch.object(verify,'ROOT',root),patch.object(verify,'MATRIX_PATH',fixture.matrix_path),patch.object(verify,'ACTIVE_RUN',active),patch.object(verify,'transaction_assertion_ok',return_value=True),patch.object(verify,'frontend_assertion_ok',return_value=True):
                verify.write_migration_packaged_report(fixture.run_dir,fixture.run['run_id'],source_line,exit_code=0)
            report=json.loads(path.read_text());self.assertEqual(report['coverage'],'complete');self.assertEqual(report['line'],source_line)
            support=[record for record in report['outputs'] if '/upgraded-consumer/' in record['path']]
            self.assertEqual(len(support),len(SUPPORT_FILES));self.assertEqual(len(report['outputs']),len(ids)+len(SUPPORT_FILES))
            fixture.save_execution_record()
            def evaluate():return acceptance.evaluate_run(root,fixture.run_path,matrix_sha256=fixture.matrix_sha,binding=fixture.binding,process_results=fixture.exits,invocation_ids=fixture.invocations)
            result=evaluate();self.assertIn('migration-packaged',result['complete_checks'],result['incomplete_checks'])
            for record in support:
                target=fixture.run_dir/record['path'];original=target.read_bytes();target.write_bytes(original+b'tamper')
                self.assertNotIn('migration-packaged',evaluate()['complete_checks'],record['path']);target.write_bytes(original)
