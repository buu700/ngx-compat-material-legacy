"""Narrow actual helper closure replay on copied current files; no compiler."""
import copy,hashlib,json,shutil,sys,tempfile
from pathlib import Path
from types import SimpleNamespace
sys.dont_write_bytecode=True
ROOT=Path.cwd()
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'tests')]
from sass_spinner_snack_gate_integration import SpinnerSnackGateContext,spinner_snack_gate_descriptor,spinner_snack_gate_assertion_ok
from test_sass_spinner_snack_bridge_admission import SpinnerSnackBridgeAdmissionTests
packet=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
branch=packet['branches'][line]
cut=json.loads((ROOT/'compatibility/rc/parallel-spinner-snack-gate-integration-helper-cut-v2.json').read_bytes())
paths=next(r for r in cut['lines'] if r['line']==line)['python_guarded_paths']
owner=SpinnerSnackBridgeAdmissionTests()
owner.packet=packet;owner.line=line;owner.branch=branch
for name in ['catalog','provenance']:
 setattr(owner,name,json.loads((ROOT/packet[name]['path']).read_bytes()))
owner.lock=json.loads((ROOT/packet['reference_lock']['path']).read_bytes())
row=next(r for r in json.loads((ROOT/branch['observation']['path']).read_bytes())['rows'] if r['case_id'].startswith('mixin-argument/'))
model=owner.model(row)
model['body'].update(next(p for p in owner.catalog['cases'] if p['case_id']==row['case_id']))
active=SimpleNamespace(**model['active'])
results=[]
with tempfile.TemporaryDirectory(prefix='parallel-spinner-snack-gate-integration-physical-fixture-',dir=ROOT/'compatibility/rc') as directory:
 fixture=Path(directory)
 for p in paths:
  out=fixture/p;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/p,out)
 trace=[];control=dict(action=None,index=-1)
 def read(path):
  raw=(fixture/path).read_bytes();trace.append(path)
  if control['action'] is not None and len(trace)-1==control['index']:control['action'](path,raw)
  return raw
 context=SpinnerSnackGateContext(fixture,read=read)
 results.append(dict(name='actual copied physical constructor',pass_=True))
 for route in ['assert_current','descriptor','assertion']:
  def invoke():
   if route=='assert_current':return context.assert_current()
   if route=='descriptor':return spinner_snack_gate_descriptor(context)
   return spinner_snack_gate_assertion_ok(fixture,active,model['body'],model['invocation'],context=context)
  trace.clear();baseline=invoke();assert baseline is not False;ordered=trace.copy()
  for mutation in ['same-final','earlier-member']:
   trigger=ordered[-1];victim=trigger if mutation=='same-final' else 'projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss'
   before=(fixture/victim).read_bytes();control['index']=len(ordered)-1;changed=[False]
   def action(path,raw):
    assert path==trigger
    control['action']=None;changed[0]=True;(fixture/victim).write_bytes(before+b'\n/* owned copied-only callback test */\n')
   control['action']=action;trace.clear();rejected=False
   try:rejected=invoke() is False
   except AssertionError:rejected=True
   assert changed[0] and rejected
   (fixture/victim).write_bytes(before);control['action']=None;assert invoke() is not False
   results.append(dict(name=route+'/'+mutation,rejected=rejected,trigger=trigger,victim=victim))
 # The active properties are read again at the final live() check. A callback
 # there must not get a free physical-mutation window after source guards.
 victim='projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss'
 before=(fixture/victim).read_bytes()
 class Active:
  def __init__(self):self.count=0
  @property
  def manifest(self):
   self.count+=1
   if self.count==2:(fixture/victim).write_bytes(before+b'\n/* final metadata callback */\n')
   return active.manifest
  @property
  def binding(self):return active.binding
 late=Active()
 assert not spinner_snack_gate_assertion_ok(fixture,late,model['body'],model['invocation'],context=context)
 assert late.count==2 and (fixture/victim).read_bytes()!=before
 (fixture/victim).write_bytes(before)
 results.append(dict(name='final live metadata property callback cross-member mutation',rejected=True))
 # Frozen expected-image checks still reject mutation before first helper read.
 target='scripts/sass_spinner_snack_gate_integration.py';before=(fixture/target).read_bytes();first=[True]
 def pollution(path):
  raw=(fixture/path).read_bytes()
  if first[0]:first[0]=False;(fixture/target).write_bytes(before+b'\n# polluted before first helper binding\n')
  return raw
 rejected=False
 try:SpinnerSnackGateContext(fixture,read=pollution)
 except AssertionError:rejected=True
 assert rejected;(fixture/target).write_bytes(before)
 results.append(dict(name='first retained physical bytes require frozen expected pin',rejected=True))
 actual=SpinnerSnackGateContext(ROOT,read=lambda p:(ROOT/p).read_bytes());actual.assert_current()
 results.append(dict(name='actual peer alias policy retained on real root',pass_=True))
def ref(path):
 raw=(ROOT/path).read_bytes();return dict(path=path,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
output=Path(sys.argv[1]);assert not output.exists()
output.write_text(json.dumps(dict(schema_version=1,role='Narrow actual NEW Python helper callback closure replay',line=line,results=results,copied_paths=len(paths),sources=[ref('scripts/sass_spinner_snack_gate_integration.py'),ref('scripts/sass_spinner_snack_bridge_admission.py')],real_inputs_mutated=False,new_compiles=0,actual_packed_or_full_gate=False),indent=2)+'\n')
print(json.dumps(dict(line=line,checks=len(results))))
