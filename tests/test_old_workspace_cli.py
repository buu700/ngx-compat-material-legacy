"""Artifact acquisition negatives stay cheap; Actions executes the upgraded workspace."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]

class OldWorkspaceCliTests(unittest.TestCase):
    def test_no_workspace_cli_fallback(self):
        result=subprocess.run(['node','scripts/check-old-workspace-cli.mjs','--out','/tmp/not-written-old-workspace.json'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,2,result.stdout+result.stderr)
        self.assertIn('--run requires a path',result.stderr)

    def test_cli_acquisition_requires_exact_bound_artifact(self):
        line='main' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('22.') else '21.x'
        version='22.0.0-rc.0' if line=='main' else '21.0.0-rc.0'
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp);archive=directory/'cli.tgz'
            files={'package/package.json':json.dumps({'name':'@ngx-compat/material-legacy-migrate-cli','version':version,'engines':{'node':'>=18.0.0'}}),'package/bin/migrate-legacy.js':'// synthetic CLI\n','package/lib/ts-rewrite.js':'// synthetic transform\n','package/lib/sass-rewrite.js':'// synthetic transform\n','package/LICENSE':'MIT synthetic fixture'}
            def pack(link=False):
                with tarfile.open(archive,'w:gz') as t:
                    for name,data in files.items():
                        b=data.encode();member=tarfile.TarInfo(name);member.size=len(b);t.addfile(member,io.BytesIO(b))
                    if link:
                        member=tarfile.TarInfo('package/escape');member.type=tarfile.SYMTYPE;member.linkname='/tmp';t.addfile(member)
            library=directory/'library.tgz';library.write_bytes(b'synthetic library, not product')
            def manifest():
                return dict(schema_version=1,stage='draft',template=False,purpose='entry',run_id='synthetic',source={'line':line},artifacts=[dict(id=id,path=p.name,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for id,p in [('library',library),('migrate-cli',archive)]])
            def execute(data,output):
                (directory/'run.json').write_text(json.dumps(data))
                code="import {resolveMigrationRun,extractMigrationCli} from './scripts/migration-run-inputs.mjs';const x=resolveMigrationRun(process.argv[1]);const c=extractMigrationCli(x,process.argv[2]);console.log(JSON.stringify(c.identities));"
                env={k:v for k,v in os.environ.items() if not k.startswith('RC_')}
                return subprocess.run(['node','--input-type=module','-e',code,str(directory/'run.json'),str(directory/output)],cwd=ROOT,env=env,capture_output=True,text=True)
            pack();data=manifest();result=execute(data,'one');self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(len(json.loads(result.stdout)),5)
            bad=json.loads(json.dumps(data));bad['source']['line']='21.x' if line=='main' else 'main';self.assertNotEqual(execute(bad,'two').returncode,0)
            archive.write_bytes(archive.read_bytes()+b'tamper');self.assertNotEqual(execute(data,'three').returncode,0)
            pack(link=True);self.assertNotEqual(execute(manifest(),'four').returncode,0)
