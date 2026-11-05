# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Apply only exact frozen gate-tool successors, never old programs or product data."""
from pathlib import Path
import copy,difflib,hashlib,json,os,subprocess,sys
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';MF='compatibility/rc/historical-contract-repair-reader-inputs.json';TEST='tests/test_historical_contract_repair_source.py'
SHA=lambda b:hashlib.sha256(b).hexdigest()
assert sys.argv[1:] in [[],['--record-current']]
record_only=bool(sys.argv[1:])
def ref(root,path):
 raw=(root/path).read_bytes();return {'path':path,'sha256':SHA(raw),'bytes':len(raw)}
def original(root,parent,path):
 env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
 for name in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(name,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
def edits(before,after):
 aa=before.decode().splitlines(keepends=True);bb=after.decode().splitlines(keepends=True)
 for context in [3,6,12,len(aa)+1]:
  groups=list(difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(context));pairs=[];text=before.decode()
  for group in reversed(groups):
   left=''.join(aa[group[0][1]:group[-1][2]]);right=''.join(bb[group[0][3]:group[-1][4]])
   if not left or text.count(left)!=1:break
   text=text.replace(left,right);pairs.append({'before':left,'after':right})
  else:
   assert text.encode()==after;assert pairs;return pairs
 raise AssertionError('no finite unambiguous literal patch')
packet_path='compatibility/rc/parallel-spinner-snack-gate-integration-source-successors-v1-final.json';packet_raw=(ROOT/packet_path).read_bytes();assert SHA(packet_raw)=='267607b9cbbd01dcf9b247e5c0f995869e904bff497d98a7d7fc16453dbb63b1';packet=json.loads(packet_raw)
assert ref(ROOT,packet['helper_cut']['path'])==packet['helper_cut']
prepared=json.loads((ROOT/(P+'prepared-source-v2.json')).read_bytes())
for r in prepared['proposed_sources']:assert ref(ROOT,r['path'])==r
paths=['scripts/sass-seal.mjs','scripts/sass-api-inventory.mjs','scripts/sass-mixin-arguments.mjs','scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py','scripts/sass-api-regressions.mjs']
new={};manifests={};branches={}
for line,root in [('21.x',ROOT),('main',MAIN)]:
 prior_ref={'path':MF,**prepared['prior_registry_pins'][line]};parent=prior_ref['source_parent'];prior_raw=original(root,parent,MF);assert SHA(prior_raw)==prior_ref['sha256']and len(prior_raw)==prior_ref['bytes'];assert record_only or (root/MF).read_bytes()==prior_raw
 prior=json.loads(prior_raw);assert (json.dumps(prior,indent=2)+'\n').encode()==prior_raw;data=copy.deepcopy(prior);count=39 if line=='21.x'else 11;assert len(data['tool_transitions'])==count;assert len(data['support_inputs'])==2
 cut=next(d for d in packet['lines']if d['line']==line);assert [r['path']for r in cut['tool_transitions']]==paths
 for r in [*cut['focused_tests'],*packet['helpers'],cut['default_aggregate_python_unchanged']]:assert ref(root,r['path'])==r
 proof=None
 if line=='21.x':
  row=next(r for r in data['tool_transitions']if r['path']==TEST);before=original(root,parent,TEST);assert SHA(before)==row['after']['sha256']and len(before)==row['after']['bytes'];assert record_only or (root/TEST).read_bytes()==before
  after=(ROOT/(P+'proposed-test-v2.py')).read_bytes();text=before.decode()
  for e in prepared['rolled_forward_test_edits']:assert text.count(e['before'])==1;text=text.replace(e['before'],e['after'])
  assert text.encode()==after;proof={'path':TEST,'source_parent':parent,'before':copy.deepcopy(row['after']),'after':{'sha256':SHA(after),'bytes':len(after)},'literal_edits':prepared['rolled_forward_test_edits']};row['literal_edits'].extend(copy.deepcopy(proof['literal_edits']));row['after']=copy.deepcopy(proof['after']);new[(line,TEST)]=after
 for item in cut['tool_transitions']:
  before=original(root,parent,item['path']);assert {'path':item['path'],'sha256':SHA(before),'bytes':len(before)}==item['before'];assert ref(root,item['path'])==item['after'];after=(root/item['path']).read_bytes()
  data['tool_transitions'].append({'path':item['path'],'before':{'sha256':SHA(before),'bytes':len(before)},'after':{'sha256':SHA(after),'bytes':len(after)},'literal_edits':edits(before,after),'source_parent':parent})
 data['support_inputs'].extend(copy.deepcopy(packet['helpers']));data['gate_tool_successor']={'prior_reader_registry':prior_ref,'added_tool_paths':paths,'rolled_forward_test':proof,'old_reports_rewritten':0,'old_product_reader':False,'canonical_dispositions_changed':0,'current_artifact_or_rendering_qualified':False}
 assert len(data['tool_transitions'])==count+6 and len(data['support_inputs'])==4
 for i,old in enumerate(prior['tool_transitions']):
  current=data['tool_transitions'][i]
  if proof and old['path']==TEST:
   assert current['before']==old['before'];assert current['literal_edits'][:len(old['literal_edits'])]==old['literal_edits'];assert {**current,'after':old['after'],'literal_edits':old['literal_edits']}==old
  else:assert current==old
 raw=(json.dumps(data,indent=2)+'\n').encode();new[(line,MF)]=raw;manifests[line]={'sha256':SHA(raw),'bytes':len(raw)}
 branches[line]={'prior':prior_ref,'current':{'path':MF,**manifests[line]},'tool_rows':len(data['tool_transitions']),'support_rows':4,'preserved_full_prior_rows':count-(1 if proof else 0),'preserved_all_prior_before_and_literal_prefixes':True,'rolled_forward_test':proof,'added_tool_paths':paths}
reader=(ROOT/(P+'proposed-reader-v2.mjs')).read_text();python=(ROOT/(P+'proposed-python-v2.py')).read_text()
for line in ['21.x','main']:
 before=prepared['prior_registry_pins'][line]['sha256'];after=manifests[line]['sha256'];assert reader.count(before)==2 and python.count(before)==2
 # One fixed C04 predecessor pin remains immutable. Only active PINS changes.
 reader=reader.replace("'"+before+"'","'"+after+"'",1)
 python=python.replace("'"+before+"'","'"+after+"'",1)
old_js="assert.ok(/^(?:scripts\\/[^/]+\\.(?:mjs|cjs)|tests\\/[^/]+\\.(?:py|mjs))$/.test(row.path),'non-tool reader transition');"
new_js="assert.ok(/^(?:scripts\\/[^/]+\\.(?:mjs|cjs)|tests\\/[^/]+\\.(?:py|mjs))$/.test(row.path)||(gate&&['scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py'].includes(row.path)),'non-tool reader transition');"
assert reader.count(old_js)==1;reader=reader.replace(old_js,new_js)
old_py="    assert re.fullmatch(r'(?:scripts/[^/]+\\.(?:mjs|cjs)|tests/[^/]+\\.(?:py|mjs))', row['path'])"
assert python.count(old_py)==1;python=python.replace(old_py,old_py+" or (data.get('gate_tool_successor') and row['path'] in ['scripts/sass_mixin_argument_admission.py', 'scripts/rc-verify.py'])")
for line in ['21.x','main']:
 new[(line,'scripts/historical-contract-repair-readers.mjs')]=reader.encode();new[(line,'tests/historical_contract_repair_source.py')]=python.encode()
# Everything is authenticated before any mutation; title cut remains disjoint.
for (line,path),raw in new.items():
 root=ROOT if line=='21.x'else MAIN
 if record_only:assert (root/path).read_bytes()==raw
 else:(root/path).write_bytes(raw)
out={'schema_version':1,'role':'Finite physical shared successor from immutable title cut; current exact image verified, no product or archived report changes','title_cut':{'path':packet_path,'sha256':SHA(packet_raw),'bytes':len(packet_raw)},'C04_before_archive':ref(ROOT,P+'C04-before.json.gz'),'branches':branches,'new_shared_source_refs':{line:[ref(root,p)for p in ['scripts/historical-contract-repair-readers.mjs','tests/historical_contract_repair_source.py']+([TEST]if line=='21.x'else[])]for line,root in [('21.x',ROOT),('main',MAIN)]},'exact_new_Python_gate_paths':['scripts/sass_mixin_argument_admission.py','scripts/rc-verify.py'],'old_program_or_compiler_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
raw=(json.dumps(out,indent=2)+'\n').encode()
for root in [ROOT,MAIN]:(root/(P+'transition-v2-final.json')).write_bytes(raw)
print(json.dumps({'branches':branches,'shared_sources':out['new_shared_source_refs']},indent=2))
