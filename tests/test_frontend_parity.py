"""Frontend binding negatives remain cheap; Actions executes real ng generate."""
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from migration_frontend_admission import frontend_assertion_ok,SCHEMATIC_FILES,CLI_FILES
from migration_workspace_admission import old_workspace_ids
from migration_frontend_fixture import frontend_receipt

class FrontendParityTests(unittest.TestCase):
    def test_required_run_and_no_repack_or_alternate_runtime(self):
        code=r'''
import assert from 'node:assert/strict';
import {parseFrontendArgs,ensureAngularNode} from './scripts/check-frontend-parity.mjs';
import {readFileSync} from 'node:fs';
for(const args of [[],['--out','/tmp/no-run'],['--library-tarball','/tmp/fallback'],['--run','x','--run','y']])assert.throws(()=>parseFrontendArgs(args));
const tools=JSON.parse(readFileSync('toolchain-lock.json'));
if(process.versions.node!==tools.repository.node)assert.throws(()=>ensureAngularNode(),/pinned private Node/);
else assert.equal(ensureAngularNode(),process.execPath);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(result.returncode,0,result.stderr)
        for script in ['check-frontend-parity.mjs','check-packaged-schematic.mjs']:
            result=subprocess.run(['node','scripts/'+script,'--out','/tmp/not-written-frontends.json'],cwd=ROOT,text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0);self.assertIn('--run requires a path',result.stderr)
    def test_real_archive_identities_and_fixed_fixture_values_admit_only_own_bound_routes(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp);artifacts=[]
            for id,names in [('library',SCHEMATIC_FILES),('migrate-cli',CLI_FILES)]:
                archive=directory/(id+'.tgz')
                with tarfile.open(archive,'w:gz') as t:
                    for name in names:
                        data=('synthetic support file '+name).encode();info=tarfile.TarInfo(name);info.size=len(data);t.addfile(info,io.BytesIO(data))
                artifacts.append(dict(id=id,path=archive.name,bytes=archive.stat().st_size,sha256=hashlib.sha256(archive.read_bytes()).hexdigest()))
            for line in ['main','21.x']:
                active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':artifacts},run_dir=directory)
                for group in ['frontend-parity','packaged-schematic']:
                    for fixture in old_workspace_ids(ROOT):
                        body=frontend_receipt(ROOT,active,group+'/'+fixture,'synthetic-invocation')
                        self.assertTrue(frontend_assertion_ok(ROOT,active,body,'synthetic-invocation'),body['case_id'])
                        for key,value in [('line','foreign'),('binding',{}),('artifacts',{}),('schematic_support_files',[]),('after','wrong-but-nonempty'),('node_version','99.0.0')]:
                            bad=copy.deepcopy(body);bad[key]=value
                            self.assertFalse(frontend_assertion_ok(ROOT,active,bad,'synthetic-invocation'),(body['case_id'],key))
                body=frontend_receipt(ROOT,active,'frontend-parity/'+next(iter(old_workspace_ids(ROOT))),'synthetic-invocation');body['cli_support_files']=[]
                self.assertFalse(frontend_assertion_ok(ROOT,active,body,'synthetic-invocation'))
if __name__=='__main__':unittest.main()
