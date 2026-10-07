"""Fresh draft packs preserve old artifacts and coordinator input evidence."""
import json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class FreshPackDirectory(unittest.TestCase):
    def invoke(self,out,**values):
        env={k:v for k,v in os.environ.items() if not k.startswith('RC_')}
        env.update(RC_PACK_DRAFT_FAIL='1',**values)
        return subprocess.run(['node',str(ROOT/'scripts/pack-draft-run.mjs'),'--line','main','--out',str(out)],cwd=ROOT,env=env,capture_output=True,text=True)
    def test_empty_directory_reaches_injected_prebuild_stop(self):
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'new';r=self.invoke(out)
            self.assertEqual(r.returncode,1,r.stderr);self.assertIn('before ng-packagr',r.stderr)
            self.assertEqual(list(out.iterdir()),[])
    def test_old_or_unrelated_content_is_never_erased(self):
        for name in ['library.tgz','pack-meta.json','run.json','reports/old.json','unrelated.txt']:
            with self.subTest(name=name),tempfile.TemporaryDirectory() as temp:
                out=Path(temp);p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'prior evidence')
                r=self.invoke(out);self.assertEqual(r.returncode,2,r.stderr)
                self.assertNotIn('before ng-packagr',r.stderr);self.assertEqual(p.read_bytes(),b'prior evidence')
    def test_only_exact_unused_coordinator_context_can_proceed(self):
        for mutation in ['none','stale','wrong-invocation','wrong-binding','old-evidence','extra-file']:
            with self.subTest(mutation=mutation),tempfile.TemporaryDirectory() as temp:
                out=Path(temp);invocation='a'*32;run='synthetic-run'
                binding={'phase':'prepack','source_line':'main','run_id':run,'source_commit':'b'*40}
                record={'check_id':'pack-library','status':'running','exit_code':None,'finished_at':None,'run_id':run,'invocation_id':invocation,'binding':binding.copy()}
                evidence=out/'evidence'/'pack-library'/invocation;evidence.mkdir(parents=True)
                if mutation=='stale':record['status']='completed'
                if mutation=='wrong-invocation':record['invocation_id']='c'*32
                if mutation=='wrong-binding':record['binding']['source_commit']='d'*40
                if mutation=='old-evidence':(evidence/'old.json').write_text('old')
                if mutation=='extra-file':(out/'old.tgz').write_text('old')
                p=out/'pack-execution.json';p.write_text(json.dumps(record));before=p.read_bytes()
                r=self.invoke(out,RC_CHECK_ID='pack-library',RC_RUN_ID=run,RC_INVOCATION_ID=invocation,RC_EVIDENCE_BINDING=json.dumps(binding,sort_keys=True))
                self.assertEqual(r.returncode,1 if mutation=='none' else 2,r.stderr)
                self.assertEqual(p.read_bytes(),before);self.assertTrue(evidence.is_dir())
