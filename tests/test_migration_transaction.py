"""Cheap real CLI filesystem diagnostics; synthetic library is never product proof."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from migration_transaction_admission import TRANSACTION_IDS, transaction_assertion_ok

class MigrationTransactionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.directory=Path(cls.temp.name)
        cli=next((ROOT/'migration/dist').glob('*.tgz'));shutil.copyfile(cli,cls.directory/'cli.tgz')
        (cls.directory/'library.tgz').write_bytes(b'synthetic filesystem fixture; not product proof')
        line='main' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.') else '21.x'
        git=lambda ref:subprocess.check_output(['git','rev-parse',ref],cwd=ROOT,text=True).strip()
        artifacts=[dict(id=id,path=name,bytes=(cls.directory/name).stat().st_size,sha256=hashlib.sha256((cls.directory/name).read_bytes()).hexdigest()) for id,name in [('library','library.tgz'),('migrate-cli','cli.tgz')]]
        cls.manifest=dict(schema_version=1,stage='draft',run_id='filesystem-diagnostic',source=dict(line=line,commit=git('HEAD'),git_tree_sha=git('HEAD^{tree}')),artifacts=artifacts)
        cls.binding=dict(run_id=cls.manifest['run_id'],source_commit=git('HEAD'),source_tree=git('HEAD^{tree}'),source_line=line)
        cls.active=SimpleNamespace(binding=cls.binding,manifest=cls.manifest,run_dir=cls.directory)
        cls.run_path=cls.directory/'run.json';cls.run_path.write_text(json.dumps(cls.manifest))
        cls.output=cls.directory/'evidence/migration-packaged/filesystemdiagnostic';cls.output.mkdir(parents=True)
        cls.env={k:v for k,v in os.environ.items() if not k.startswith('RC_')}
        cls.env.update(RC_CHECK_ID='migration-packaged',RC_RUN_ID=cls.manifest['run_id'],RC_INVOCATION_ID='filesystemdiagnostic',RC_EVIDENCE_BINDING=json.dumps(cls.binding),RC_ASSERTION_OUTPUT_DIR=str(cls.output))
        result=cls.execute(['--run',str(cls.run_path),'--out',str(cls.directory/'report.json')])
        if result.returncode:raise AssertionError(result.stdout+result.stderr)
        cls.report=json.loads((cls.directory/'report.json').read_text())
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    @classmethod
    def execute(cls,args):return subprocess.run(['node','scripts/migration-transaction.mjs',*args],cwd=ROOT,env=cls.env,text=True,capture_output=True)
    def test_exact_artifact_bound_roster_and_recovery(self):
        self.assertEqual(self.report['case_ids'],TRANSACTION_IDS)
        self.assertEqual({p.stem for p in self.output.iterdir()},set(TRANSACTION_IDS))
        for body in self.report['assertions']:
            self.assertTrue(transaction_assertion_ok(ROOT,self.active,body,'filesystemdiagnostic'),body['case_id'])
        matrix=json.loads((ROOT/'compatibility/rc/matrices/full-verify.json').read_text())
        row=next(r for r in matrix['checks'] if r['check_id']=='migration-packaged')
        self.assertEqual(row['acceptance']['cases_by_line'][self.binding['source_line']]['transaction-negatives'],TRANSACTION_IDS)
    def test_rejects_unbound_copied_or_unobserved_passes(self):
        for original in self.report['assertions']:
            mutations=[('line','foreign'),('binding',{}),('artifacts',[]),('cli_support_files',[]),('fixture_peers_installed',True),('g04_claim','passed')]
            for key,value in mutations:
                body=copy.deepcopy(original);body[key]=value
                self.assertFalse(transaction_assertion_ok(ROOT,self.active,body,'filesystemdiagnostic'),(original['case_id'],key))
        body=copy.deepcopy(self.report['assertions'][6]);body['observed']['rewritten_before_failure']=0
        self.assertFalse(transaction_assertion_ok(ROOT,self.active,body,'filesystemdiagnostic'))
        body=copy.deepcopy(self.report['assertions'][7]);body['recovery'][0]['observed_backup_sha256']='0'*64
        self.assertFalse(transaction_assertion_ok(ROOT,self.active,body,'filesystemdiagnostic'))
    def test_missing_run_unknown_flag_and_existing_output_are_refused(self):
        for args in [[],['--out',str(self.directory/'absent.json')],['--unknown','x'],['--run',str(self.run_path),'--out',str(self.directory/'report.json')]]:
            self.assertNotEqual(self.execute(args).returncode,0,args)
    def test_wrong_line_and_tampered_artifact_are_refused(self):
        for mode in ['line','hash']:
            manifest=copy.deepcopy(self.manifest)
            if mode=='line':manifest['source']['line']='21.x' if self.binding['source_line']=='main' else 'main'
            else:manifest['artifacts'][1]['sha256']='0'*64
            path=self.directory/(mode+'-run.json');path.write_text(json.dumps(manifest))
            self.assertNotEqual(self.execute(['--run',str(path),'--out',str(self.directory/(mode+'-report.json'))]).returncode,0)
if __name__=='__main__':unittest.main()
