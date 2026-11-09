# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
from scripts.current_sass_tool_references import CurrentSassToolReferences as make
root=Path.cwd()
def read(p):return (root/p).read_bytes()
c02=json.loads(read('compatibility/rc/current-sass-c02-source-successor-v1.json'));hint=json.loads(read('compatibility/rc/current-sass-authored-hint-source-v1.json'));de40=json.loads(read('compatibility/rc/main-current-inventory-de40-helper-source-v1.json'));subject=make(root)
for row in c02['transitions']:
 assert subject.qualify(row['before'])==row['after'];assert subject.qualify({**row['before'],'sha256':'0'*64}) is None
for row in [*[x for x in hint['updates'] if x['path'].endswith('.mjs')],*de40['updates']]:assert subject.qualify(row['before']) is None
def fails(fn):
 try:fn()
 except (AssertionError,ValueError,RuntimeError):return
 raise AssertionError('unexpected acceptance')
active=False;nested=False;guard=None
def reentrant(p):
 global nested
 raw=read(p)
 if active and not nested:
  nested=True
  try:guard.assert_current()
  except (AssertionError,ValueError,RuntimeError):pass
 return raw
guard=make(root,read=reentrant);active=True;fails(guard.assert_current);assert nested;active=False;guard.assert_current();f=root/'scripts/current_sass_tool_references.py';raw=f.read_bytes()
try:f.write_bytes(raw+b' ');fails(lambda:make(root));fails(subject.assert_current)
finally:f.write_bytes(raw)
subject.assert_current();bad=False
def callback(p):return read(p)+(b' ' if bad and p=='scripts/current_sass_tool_references.py' else b'')
bound=make(root,read=callback);bad=True;fails(bound.assert_current);fails(lambda:make(root,read=callback));bad=False;bound.assert_current();print(json.dumps(dict(result='pass',c02_identities=len(c02['transitions']),support_identities_null=4,reentry=True,owner_self_physical=True,owner_self_callback=True,recovery=True,g11_claim='not-passed')))
