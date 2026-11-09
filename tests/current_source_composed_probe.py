# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
from scripts.current_sass_tool_references import CurrentSassToolReferences as make
root=Path.cwd()
def read(p): return (root/p).read_bytes()
c02path='compatibility/rc/current-sass-c02-source-successor-v1.json';hintpath='compatibility/rc/current-sass-authored-hint-source-v1.json';dpath='compatibility/rc/main-current-inventory-de40-helper-source-v1.json'
c02=json.loads(read(c02path));hint=json.loads(read(hintpath));de40=json.loads(read(dpath))
paths=list(dict.fromkeys([c02path,hintpath,dpath,'compatibility/rc/current-tool-ledger-source-epoch-23-successor-v1.json','compatibility/rc/current-tool-ledger-source-epoch-24-successor-v1.json','compatibility/rc/main-bidi-current-inventory-owner-source-v2.json','scripts/current-inventory-source-subject.mjs','scripts/inventory-reference-live-source-epoch.mjs','compatibility/f10/disposition-ledger/ledger.json','compatibility/f10/disposition-ledger/evidence/c04-six-selectors-current-integration-v2/INTEGRATION.json','compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-use-reviews/radio-focus-origin-current-source-v1.json','compatibility/rc/radio-focus-origin-current-source-proof-v1.json',*[x['path'] for x in c02['transitions']],*[x['path'] for x in c02['new_committed_inputs']],*[x['path'] for x in hint['updates']],*[x['path'] for x in hint['support']],*[x['path'] for x in de40['updates']]]))
bad=None
def supplied(p):return read(p)+(b' ' if p==bad else b'')
def fails(fn):
 try:fn()
 except (AssertionError,ValueError,RuntimeError):return
 raise AssertionError('corruption unexpectedly accepted')
subject=make(root,read=supplied)
for path in paths:
 bad=path;fails(subject.assert_current);fails(lambda:make(root,read=supplied));bad=None;subject.assert_current();f=root/path;raw=f.read_bytes()
 try:f.write_bytes(raw+b' ');fails(subject.assert_current);fails(lambda:make(root))
 finally:f.write_bytes(raw)
 subject.assert_current()
for row in c02['transitions']:
 assert subject.qualify(row['before'])==row['after'];assert subject.qualify({**row['before'],'sha256':'0'*64}) is None
for row in [*[x for x in hint['updates'] if x['path'].endswith('.mjs')],*de40['updates']]:assert subject.qualify(row['before']) is None
active=False;nested=False;guard=None
def reentrant(p):
 global nested
 raw=read(p)
 if active and not nested:
  nested=True
  try:guard.assert_current()
  except (AssertionError,ValueError,RuntimeError):pass
 return raw
guard=make(root,read=reentrant);active=True;fails(guard.assert_current);assert nested;active=False;guard.assert_current()
print(json.dumps(dict(result='pass',paths=len(paths),cold_late_physical=len(paths),cold_late_callback=len(paths),identity_reentry_recovery=True,g11_claim='not-passed')))
