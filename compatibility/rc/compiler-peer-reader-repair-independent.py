# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact owner delta and unchanged registry/product metadata."""
from pathlib import Path
import json,hashlib,subprocess,sys,time
prefix='compatibility/rc/compiler-peer-reader-repair-';result={};start=time.monotonic()
def identity(raw,ref):assert hashlib.sha256(raw).hexdigest()==ref['sha256']and len(raw)==ref['bytes']
for line,r in [('21.x',Path(sys.argv[1])),('main',Path(sys.argv[2]))]:
 w=json.loads((r/(prefix+'worksheet.json')).read_bytes());t=json.loads((r/(prefix+'owner-transition.json')).read_bytes());before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',w['source_parent']+':'+t['path']],cwd=r);identity(before,t['before']);s=before.decode()
 for e in t['literal_edits']:assert s.count(e['before'])==1;s=s.replace(e['before'],e['after'])
 assert s.encode()==(r/t['path']).read_bytes();identity(s.encode(),t['after'])
 for ref in w['protected_inputs']:identity((r/ref['path']).read_bytes(),ref)
 result[line]={'owner_literal_edits':len(t['literal_edits']),'registry_canonical_API113_and_current_rosters_unchanged':True,'product_files_changed':0}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-start,'lines':result,'current_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'};out=Path(sys.argv[3]);assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
