# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
import json,sys,shutil,subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from current_sass_tool_references import CurrentSassToolReferences as Make
group=next((arg[8:] for arg in sys.argv[1:] if arg.startswith('--group=')),'all')
assert group in ('all','cold','reentry','last','metadata')
initial=Make(ROOT)
with TemporaryDirectory(prefix='tool-constructor-control-py-') as temporary:
 root=Path(temporary)
 for ref in initial.bound:
  dest=root/ref['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/ref['path'],dest)
 gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=ROOT,text=True).strip();(root/'.git').write_text('gitdir: '+gitdir+'\n')
 target=root/'tests/test_retained_landscape_tool_replay.py'
 original=target.read_bytes();changed=original+b' ';checks=[]
 calls=0
 def restored(p):
  global calls
  calls+=1;target.write_bytes(original);return (root/p).read_bytes()
 if group in ('all','cold'):
  try:
   target.write_bytes(changed)
   try:Make(root,read=restored)
   except AssertionError:pass
   else:raise AssertionError('cold drift accepted')
  finally:target.write_bytes(original)
  assert calls==0;checks.append('cold drift cannot be restored by first callback')
  try:Make(root,read=lambda p:changed if p==str(target.relative_to(root)) else (root/p).read_bytes())
  except AssertionError:pass
  else:raise AssertionError('nonphysical supplied member accepted')
  checks.append('nonphysical supplied member rejects')
 state=dict(armed=False,kind=None,count=0,last=0,ref=None,scope=None)
 def read(p):
  state['count']+=1
  if state['armed'] and state['kind']=='restore':state['armed']=False;target.write_bytes(original)
  if state['armed'] and state['kind']=='reentry':
   state['armed']=False
   try:state['scope'].assert_current()
   except (AssertionError,RuntimeError):pass
  if state['armed'] and state['kind']=='last' and state['count']==state['last']:state['armed']=False;target.write_bytes(changed)
  if state['armed'] and state['kind']=='metadata':state['armed']=False;state['ref']['sha256']='0'*64
  return (root/p).read_bytes()
 s=Make(root,read=read);state['scope']=s
 if group in ('all','cold'):
  try:
   target.write_bytes(changed);state.update(armed=True,kind='restore',count=0)
   try:s.assert_current()
   except AssertionError:pass
   else:raise AssertionError('warm drift accepted')
   assert state['count']==0
  finally:state['armed']=False;target.write_bytes(original)
  s.assert_current();checks.append('warm cold drift rejects before callback')
 if group in ('all','reentry'):
  state.update(armed=True,kind='reentry')
  try:s.assert_current()
  except (AssertionError,RuntimeError):pass
  else:raise AssertionError('caught reentry accepted')
  s.assert_current();checks.append('caught root reentry rejects and recovers')
 if group in ('all','last'):
  state['count']=0;s.assert_current();state['last']=state['count']
  try:
   state.update(armed=True,kind='last',count=0)
   try:s.assert_current()
   except AssertionError:pass
   else:raise AssertionError('last callback mutation accepted')
  finally:state['armed']=False;target.write_bytes(original)
  s.assert_current();checks.append('last callback mutation rejects and recovers')
 if group in ('all','metadata'):
  row=s.transitions[0];state.update(armed=True,kind='metadata',ref=dict(path=row['path'],**row['before']))
  try:s.qualify(state['ref'])
  except AssertionError:pass
  else:raise AssertionError('changed reference metadata accepted')
  s.assert_current();checks.append('changed reference metadata rejects and recovers')
 result=dict(result='pass',checks=checks,scope='Current constructor controls on an isolated real-source fixture; no root deadline qualification.')
 report_path=next((arg for arg in sys.argv[1:] if not arg.startswith('--group=')),None)
 if report_path:
  with Path(report_path).open('x') as out:json.dump(result,out,indent=2)
 print(json.dumps(result))
