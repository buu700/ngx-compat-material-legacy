# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
from scripts.current_sass_tool_references import CurrentSassToolReferences as make
root=Path.cwd()
def read(p):return (root/p).read_bytes()
packet_path='compatibility/rc/current-inventory-frozen-38-roster-source-v1.json';owner_path='compatibility/rc/current-inventory-frozen-38-owner-source-v1.json';packet=json.loads(read(packet_path));paths=[packet_path,owner_path,'scripts/current-inventory-source-subject.mjs',packet['after']['path'],*[x['path'] for x in packet['support']]];bad=None
def callback(p):return read(p)+(b' ' if p==bad else b'')
def fails(fn):
 try:fn()
 except (AssertionError,ValueError,RuntimeError):return
 raise AssertionError('unexpected acceptance')
subject=make(root,read=callback)
for path in paths:
 bad=path;fails(subject.assert_current);fails(lambda:make(root,read=callback));bad=None;subject.assert_current();f=root/path;raw=f.read_bytes()
 try:f.write_bytes(raw+b' ');fails(subject.assert_current);fails(lambda:make(root))
 finally:f.write_bytes(raw)
 subject.assert_current()
old=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+packet['before']['path']],cwd=root)
fails(lambda:make(root,read=lambda p:old if p==packet['before']['path'] else read(p)));subject.assert_current();print(json.dumps(dict(result='pass',paths=len(paths),cold_late_physical=len(paths),cold_late_callback=len(paths),old_roster_rejected=True,recovery=True,g11_claim='not-passed')))
