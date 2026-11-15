# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact consumer continuation controls in an isolated physical source fixture."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from test_current_sass_source import candidate_fixture

ROOT=Path(__file__).resolve().parents[1]

class OrderedConsumerSuccessorTests(unittest.TestCase):
    def test_committed_images_and_physical_recovery(self):
        with tempfile.TemporaryDirectory(prefix='ngx-ordered-consumer-') as temporary:
            root=Path(temporary);candidate_fixture(root);(root/'.git').chmod(0o444)
            for part in ('scripts','fixtures/sass','reference/material-16.2.14/sass-css','tests/fixtures'):
                shutil.copytree(ROOT/part,root/part,dirs_exist_ok=True)
            manifest=json.loads((ROOT/'fixtures/sass/expected-isolation-inputs.json').read_text())
            for row in manifest['files']:
                path=row['path']
                if path.startswith('node_modules/'):continue
                dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/path).read_bytes())
            extra='compatibility/rc/current-main-density-input-successor-v1.json';dest=root/extra;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/extra).read_bytes())
            paths=['scripts/sass-ordered-aggregate-contract.mjs','scripts/sass_ordered_aggregate_admission.py','scripts/sass-ordinary-density-gate.mjs','scripts/sass_ordinary_density_gate.py','fixtures/sass/ordered-aggregate-consumer-1bf-source-successor.json']
            js="""import {readFileSync,writeFileSync} from 'node:fs';import {orderedButtonSourceGuard} from './scripts/sass-ordered-button-source-guard.mjs';const b=JSON.parse(readFileSync(0,'utf8'));const paths=JSON.parse(process.argv[1]);const run=()=>orderedButtonSourceGuard('main',b.actual_measurement.sources,b.current_companion.peers,b.actual_measurement.css);if(!run())throw Error('positive');for(const p of paths){let old=readFileSync(p);try{writeFileSync(p,Buffer.concat([old,Buffer.from('\\nchanged')]));if(run())throw Error('accepted '+p);}finally{writeFileSync(p,old)}if(!run())throw Error('recovery '+p)}console.log('JS physical controls passed');"""
            py="""import json,sys\nfrom pathlib import Path\nsys.path.insert(0,'scripts')\nfrom sass_ordered_button_source_guard import _check\npaths=json.loads(sys.argv[1]);_check('main')\nfor name in paths:\n p=Path(name);old=p.read_bytes()\n try:\n  p.write_bytes(old+b'\\nchanged')\n  try:_check('main')\n  except (ValueError,AssertionError,OSError):pass\n  else:raise AssertionError('accepted '+name)\n finally:p.write_bytes(old)\n _check('main')\nprint('Python physical controls passed')\n"""
            from types import SimpleNamespace
            from sass_ordered_aggregate_fixture import ordered_aggregate_receipt
            active=SimpleNamespace(binding={'source_line':'main'},manifest={'run_id':'run','artifacts':[{'id':'library','sha256':'a'*64}]})
            body=ordered_aggregate_receipt(active,'06-aggregate-and-companions','inv')
            compute="import {readFileSync} from 'node:fs';import {aggregateExpectedSuccessor,aggregateProjectedSources} from './scripts/sass-aggregate-source-successor-v2.mjs';const p=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify({result:aggregateExpectedSuccessor(process.cwd(),'main',p),sources:aggregateProjectedSources(process.cwd())}));"
            result=subprocess.run(['node','--input-type=module','-e',compute],cwd=root,input=json.dumps(body['current_companion']['peers']),text=True,capture_output=True,timeout=120,check=True)
            computed=json.loads(result.stdout);body['actual_measurement']['sources']=computed['sources'];body['actual_measurement']['css']=computed['result']['css']
            for command in (['node','--input-type=module','-e',js,json.dumps(paths)],['python3','-c',py,json.dumps(paths)]):
                result=subprocess.run(command,cwd=root,input=json.dumps(body),text=True,capture_output=True,timeout=240)
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                self.assertIn('physical controls passed',result.stdout)
