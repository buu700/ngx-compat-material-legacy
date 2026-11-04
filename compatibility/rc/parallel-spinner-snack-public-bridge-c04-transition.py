# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Finite reviewed C04 tool transitions from immutable branch boundary commits."""
import difflib, hashlib, json, os, subprocess
from pathlib import Path
ROOTS={'21.x':Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy'),'main':Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
BASES={'21.x':'26ff853a1f','main':'ece6c8d315'}
MF='compatibility/rc/historical-contract-repair-reader-inputs.json'
SHA=lambda b:hashlib.sha256(b).hexdigest()
def original(root,commit,path):
 env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
 for k in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(k,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],cwd=root,env=env)
def ref(path,b):return {'path':path,'sha256':SHA(b),'bytes':len(b)}
results={}
for line,root in ROOTS.items():
 commit=subprocess.check_output(['git','rev-parse',BASES[line]],cwd=root,text=True).strip()
 oldraw=original(root,commit,MF);old=json.loads(oldraw);data=json.loads(oldraw)
 worksheet=json.loads((root/'compatibility/rc/parallel-spinner-snack-public-bridge-c04-worksheet-v1.json').read_bytes())
 paths=worksheet['branches'][line]['existing_verifiers']+worksheet['branches'][line]['existing_tests']
 if line=='21.x':paths+=['tests/test_historical_contract_repair_source.py']
 if line=='21.x':paths+=json.loads((root/'compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v1.json').read_bytes())['paths'] and [r['path'] for r in json.loads((root/'compatibility/rc/parent-spinner-snack-c04-admission-source-edits-v1.json').read_bytes())['paths']]
 added=[]
 for path in paths:
  before=original(root,commit,path);after=(root/path).read_bytes()
  if before==after:continue
  a,b=before.decode(),after.decode();edits=[]
  aa,bb=a.splitlines(keepends=True),b.splitlines(keepends=True)
  for group in reversed(list(difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(3))):
   left=''.join(aa[group[0][1]:group[-1][2]]);right=''.join(bb[group[0][3]:group[-1][4]])
   assert left and a.count(left)==1,path
   edits.append({'before':left,'after':right});a=a.replace(left,right)
  assert a==b,path
  row={'path':path,'source_parent':commit,'before':{'sha256':SHA(before),'bytes':len(before)},'after':{'sha256':SHA(after),'bytes':len(after)},'literal_edits':edits}
  assert path not in [r['path'] for r in old['tool_transitions']]
  data['tool_transitions'].append(row);added.append(path)
 data['extension_kind']='spinner-snack-c04-source'
 data['prior_reader_registry']={**ref(MF,oldraw),'source_parent':commit}
 data['support_inputs']=[ref(path,(root/path).read_bytes()) for path in ['scripts/sass-spinner-snack-c04-source.mjs','scripts/sass-spinner-snack-bridge-contract.mjs']]
 data['c04_source_successor']={'historical_owned_scss_rows':409,'physical_product_paths':['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss','projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss'],'old_product_read_callback':False,'historical_report_rewrites':0,'added_tool_paths':added,'historical_boundaries':4,'current_boundaries':6,'ordinary_all_legacy_companions':13}
 assert data['tool_transitions'][:len(old['tool_transitions'])]==old['tool_transitions']
 raw=(json.dumps(data,indent=2)+'\n').encode();(root/MF).write_bytes(raw)
 results[line]={'prior':data['prior_reader_registry'],'current':ref(MF,raw),'added_paths':added,'prior_rows':len(old['tool_transitions']),'current_rows':len(data['tool_transitions']),'support_inputs':data['support_inputs']}
# Pin manifests; reader and Python mirror are not members of their own transition table.
for root in ROOTS.values():
 for path in ['scripts/historical-contract-repair-readers.mjs','tests/historical_contract_repair_source.py']:
  p=root/path;s=p.read_text()
  for line,r in results.items():
   oldpin={'21.x':'577d690ecdad79da270dda15a73649c519e5f9444f9e0a0739d94aecefa45a90','main':'702d6f65109297515ee1fc57810eaf8fe0a9f7148742ff8572d90824d57b2944'}[line]
   # Reruns replace only the current literal assignment, not immutable prior references.
   import re
   if path.endswith('.mjs'):
    s=re.sub(r"('"+re.escape(line)+r"'|"+re.escape(line)+r"):('[0-9a-f]{64}')",lambda m:m[1]+":'"+r['current']['sha256']+"'",s,count=1)
   else:
    anchor=s.index('READER_PINS =');head,tail=s[:anchor],s[anchor:]
    tail=re.sub(r"'"+re.escape(line)+r"': '[0-9a-f]{64}'","'"+line+"': '"+r['current']['sha256']+"'",tail,count=1);s=head+tail
  p.write_text(s)
 out=root/'compatibility/rc/parallel-spinner-snack-public-bridge-c04-tool-transition-v1.json';out.write_text(json.dumps({'schema_version':1,'branches':results,'prior_rows_unchanged':True,'archived_reports_changed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'},indent=2)+'\n')
print(json.dumps(results,indent=2))
