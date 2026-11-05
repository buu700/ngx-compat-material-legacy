# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
import sys,tempfile,subprocess,json,time
from pathlib import Path
root=Path(sys.argv[1]);sys.path.insert(0,str(root/'tests'))
from test_current_sass_source import candidate_fixture,NODE
with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as d:
 candidate_fixture(Path(d))
 out=root/'compatibility/rc'/('ordinary-card-five-source-aggregate-'+sys.argv[2]+'-v1.json')
 r=subprocess.run([NODE,str(root/'compatibility/rc/ordinary-card-five-source-aggregate-runner-v1.mjs'),str(root),d,str(out)],capture_output=True,text=True,cwd=root)
 print(r.stdout,end='');print(r.stderr,end='',file=sys.stderr)
 sys.exit(r.returncode)
