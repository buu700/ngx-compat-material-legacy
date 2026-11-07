# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Synthetic inventory checks; no product execution is implied."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rc_acceptance import EvidenceError, EvidenceSnapshot, TYPEAHEAD_CHECKER_FILES, register_typeahead_files


class TypeaheadInventoryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run = self.root / 'run'
        self.run.mkdir()
        self.paths = sorted(TYPEAHEAD_CHECKER_FILES | {'projects/ngx-material-legacy/a.ts', 'node_modules/.pnpm/peer/file.mjs'})
        self.records = []
        for name in self.paths:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(name)
            data = path.read_bytes()
            self.records.append({'root': 'repository', 'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
        self.snapshot = EvidenceSnapshot(self.root, self.run)

    def test_all_inputs_are_rechecked_after_registration(self):
        register_typeahead_files(self.snapshot, self.records)
        self.assertEqual(len(self.snapshot.inventory()), len(self.records))
        for name in ['projects/ngx-material-legacy/a.ts', 'node_modules/.pnpm/peer/file.mjs', 'scripts/revalidate-typeahead.mjs']:
            path = self.root / name
            original = path.read_bytes()
            path.write_bytes(b'changed')
            with self.assertRaises(EvidenceError): self.snapshot.revalidate()
            path.write_bytes(original)
        self.snapshot.revalidate()

    def test_unconstrained_duplicate_missing_and_symlink_inputs_reject(self):
        for records in [self.records + [self.records[0]], self.records[1:], self.records + [{'root':'repository','path':'outside/file','sha256':'0'*64,'bytes':1}]]:
            with self.assertRaises(EvidenceError): register_typeahead_files(EvidenceSnapshot(self.root,self.run), records)
        path = self.root / 'node_modules/.pnpm/peer/file.mjs'
        target = path.with_name('target.mjs')
        path.rename(target)
        path.symlink_to(target)
        with self.assertRaises(EvidenceError): register_typeahead_files(EvidenceSnapshot(self.root,self.run),self.records)

class TypeaheadSealerTest(unittest.TestCase):
    """A synthetic evaluator exercises the actual sealer's post-evaluation checks."""
    def setUp(self):
        import shutil
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run = self.root / 'run'
        self.run.mkdir()
        (self.root / 'scripts').mkdir()
        shutil.copy2(Path(__file__).resolve().parents[1] / 'scripts/seal-draft-run.mjs', self.root / 'scripts')
        self.inv = []
        def file(scope, name, data):
            base = self.root if scope == 'repository' else self.run
            path = base / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            row = {'root':scope, 'path':name, 'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data)}
            self.inv.append(row)
            return row
        import json
        self.file = file
        matrix = file('repository','compatibility/rc/matrices/full-verify.json',json.dumps({'id':'full-verify','checks':[{'check_id':'typeahead-execution','required':True}]}).encode())
        self.typeahead = [file('repository',name,('synthetic '+name).encode()) for name in sorted(TYPEAHEAD_CHECKER_FILES | {'projects/ngx-material-legacy/source.ts','node_modules/.pnpm/p/graph.mjs'})]
        records = {name:file('run',name,name.encode()) for name in ['execution-record.json','pack-execution.json','pack-meta.json','library.tgz']}
        report = file('run','reports/typeahead-execution.json',json.dumps({'outputs':[], 'run_id':'synthetic','check_id':'typeahead-execution','line':'main','result':'pass','exit_code':0,'failed':0}).encode())
        manifest = {'schema_version':1,'template':False,'stage':'draft','purpose':'candidate','reports':[],'run_id':'synthetic','source':{'line':'main','clean':True,'commit':'a'*40,'git_tree_sha':'b'*40},'execution_inputs':{'clean':True},'expected_matrix':{'path':matrix['path'],'sha256':matrix['sha256']},'artifacts':[{'id':'library',**{k:v for k,v in records['library.tgz'].items() if k != 'root'}}], 'execution_record':records['execution-record.json'],'pack_execution':records['pack-execution.json'],'pack_metadata':records['pack-meta.json'],'summary':{}}
        manifest_record = file('run','run.json',json.dumps(manifest).encode())
        self.matrix_sha = matrix['sha256']
        self.result = {'automatic_product_result':'pass','validated_manifest_sha256':manifest_record['sha256'],'validated_reports':{'typeahead-execution':report['sha256']},'validated_files':self.inv,'typeahead_validated_files':self.typeahead}

    def seal(self, mutation=''):
        import json, os, subprocess
        tools = self.root / 'bin'
        tools.mkdir(exist_ok=True)
        git = tools / 'git'
        git.write_text('#!' + sys.executable + '\nimport sys\nfrom pathlib import Path\nargs=sys.argv[1:]\n'
            + 'if args[-2:] == ["rev-parse", "HEAD"]: print("a"*40)\n'
            + 'elif args[-2:] == ["rev-parse", "HEAD^{tree}"]: print("b"*40)\n'
            + 'elif args[-6:] == ["status", "--porcelain", "--untracked-files=all", "--", ".", ":(exclude)compatibility/rc/reports"]:\n'
            + ' if Path("late-tracked.ts").exists(): print(" M late-tracked.ts")\n'
            + ' if Path("late-untracked.ts").exists(): print("?? late-untracked.ts")\n'
            + 'else: sys.exit(2)\n')
        git.chmod(0o755)
        wrapper = tools / 'python3'
        wrapper.write_text('#!' + sys.executable + '\nfrom pathlib import Path\n' + mutation + '\nprint(' + repr(json.dumps(self.result)) + ')\n')
        wrapper.chmod(0o755)
        return subprocess.run(['node',str(self.root / 'scripts/seal-draft-run.mjs'),'--run',str(self.run / 'run.json'),'--expected-matrix-sha256',self.matrix_sha],capture_output=True,text=True,env={**os.environ,'PATH':str(tools)+os.pathsep+os.environ['PATH']})

    def test_sealer_rehashes_source_graph_and_checker(self):
        for name in ['projects/ngx-material-legacy/source.ts','node_modules/.pnpm/p/graph.mjs','scripts/revalidate-typeahead.mjs']:
            with self.subTest(path=name):
                target = self.root / name
                original = target.read_bytes()
                result = self.seal('Path('+repr(str(target))+').write_bytes(b"late mutation")')
                self.assertNotEqual(result.returncode,0,result.stdout)
                self.assertIn('Validated evidence changed after evaluation',result.stderr)
                target.write_bytes(original)
        result = self.seal()
        self.assertEqual(result.returncode,0,result.stderr)

    def test_sealer_rejects_late_tracked_and_untracked_source(self):
        for name in ('late-tracked.ts', 'late-untracked.ts'):
            with self.subTest(path=name):
                target = self.root / name
                result = self.seal('Path('+repr(str(target))+').write_text("late source")')
                self.assertNotEqual(result.returncode,0)
                self.assertIn('Source checkout changed before sealing',result.stderr)
                target.unlink()
        report = self.root / 'compatibility/rc/reports/generated.json'
        report.parent.mkdir(parents=True)
        report.write_text('ignored report')
        self.assertEqual(self.seal().returncode,0)

    def test_sealer_rejects_missing_and_external_inventory(self):
        self.result['validated_files'] = [r for r in self.inv if r['path'] != 'node_modules/.pnpm/p/graph.mjs']
        result = self.seal()
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Missing typeahead input',result.stderr)
        self.result['validated_files'] = self.inv
        self.typeahead.append({'root':'repository','path':'other/file','sha256':'0'*64,'bytes':1})
        result = self.seal()
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Invalid typeahead validated input',result.stderr)

if __name__ == '__main__': unittest.main()
