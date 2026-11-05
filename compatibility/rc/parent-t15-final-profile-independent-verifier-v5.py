#!/usr/bin/env python3
"""Independent read-only verification of final paired V3 profile, Git transforms and anchors."""
import hashlib,json,pathlib,re,subprocess
ROOTS={'21.x':pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy'),'main':pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
PROFILE='compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'; PROFILE_SHA='b263cc37bebdf21c6b3e73364b21e50e6a639f7f5fc2126885098a9c7f04ceb1'; PROFILE_SIZE=315976
V1={'path':'compatibility/rc/current-sass-tool-reference-inputs-v1.json','sha256':'ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f','bytes':478008}
V2={'path':'compatibility/rc/current-sass-tool-reference-inputs-v2.json','sha256':'d25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770','bytes':625566}
BUILDER='compatibility/rc/parent-base-class-tool-successor-builder-v1.py'; JS='scripts/current-sass-tool-references.mjs'; PY='scripts/current_sass_tool_references.py'
CJS='scripts/upstream-base-class-removal-admission.cjs'; OLD_CJS={'path':CJS,'sha256':'013cbe4ae44ebebcf8331d2aedca972f15c824dd4e61bc795f0efa188d35b69a','bytes':14322}
V6='compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json'; V6_ID={'path':V6,'sha256':'720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881','bytes':3578}
OWNER='compatibility/rc/parent-base-admission-current-source-successor-v1.json'; OWNER_ID={'path':OWNER,'sha256':'f9fc32edb6e1ede3cf647eba6da1901d31a4df6d687dc9aa41139f3ebcfd090e','bytes':20020}
COUNTS={'21.x':(52,82),'main':(19,29)}
def ident(raw):return {'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
def check(raw,ref,where):
 actual=ident(raw);expected={k:ref[k] for k in ('sha256','bytes')}
 if actual!=expected:raise AssertionError(f'{where}: expected={expected} actual={actual}')
 return actual
def read(root,path):return (root/path).read_bytes()
def git(root,commit,path):
 return subprocess.run(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',f'{commit}:{path}'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
def blob_sha(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def apply_byte_edits(raw,edits,where):
 # Profile offsets count UTF-8 bytes, matching the factories' Buffer/byte slices.
 buf=raw
 for e in sorted(enumerate(edits),key=lambda x:(x[1]['offset'],x[0]),reverse=True):
  edit=e[1]; start=edit['offset']; before=edit['before'].encode('utf-8'); after=edit['after'].encode('utf-8')
  if buf[start:start+len(before)]!=before:raise AssertionError(f'{where}: byte-offset before mismatch at {start}')
  buf=buf[:start]+after+buf[start+len(before):]
 return buf

def ref_in_factory(text,ref):return ref['path'] in text and ref['sha256'] in text and str(ref['bytes']) in text
def verify(branch,root):
 p_raw=read(root,PROFILE);check(p_raw,{'sha256':PROFILE_SHA,'bytes':PROFILE_SIZE},branch+' profile');p=json.loads(p_raw)
 assert p['schema_version']==3 and p['role']=='finite-current-sass-tool-reference-successor'
 assert p['previous_epoch']==V2
 br=p['branches'][branch];assert (len(br['updates']),len(br['additional_inputs']))==COUNTS[branch]
 report={'root':str(root),'profile':ident(p_raw),'source_parent':br['source_parent'],'updates_expected':len(br['updates']),'support_expected':len(br['additional_inputs']),'updates_git_before_verified':0,'updates_recipe_rebuilt':0,'updates_recipe_mismatch':0,'recipe_mismatches':[],'updates_physical_after_verified':0,'support_physical_verified':0,'mismatches':[]}
 physical_after={}
 for u in br['updates']:
  path=u['path'];before=git(root,br['source_parent'],path);check(before,u['before'],branch+' Git source parent '+path)
  report['updates_git_before_verified']+=1
  if 'git_blob' in u['before'] and blob_sha(before)!=u['before']['git_blob']:raise AssertionError(branch+' git blob id '+path)
  rebuilt=apply_byte_edits(before,u.get('edits',[]),branch+':'+path); rebuilt_actual=ident(rebuilt); rebuilt_expected={k:u['after'][k] for k in ('sha256','bytes')}
  if rebuilt_actual!=rebuilt_expected:
   report['updates_recipe_mismatch']+=1; report['recipe_mismatches'].append({'path':path,'expected_after':rebuilt_expected,'reconstructed':rebuilt_actual,'edit_count':len(u.get('edits',[]))})
  else: report['updates_recipe_rebuilt']+=1
  current=read(root,path);check(current,u['after'],branch+' physical after '+path);report['updates_physical_after_verified']+=1
  physical_after[path]=u['after']
 for s in br['additional_inputs']:
  current=read(root,s['path']);check(current,s,branch+' physical support '+s['path']);report['support_physical_verified']+=1
 # Match exact immutable V1/V2 physical bytes and parent-image bytes.
 for old in [V1,V2]:
  raw=read(root,old['path']);check(raw,old,branch+' immutable '+old['path'])
 v2_at_parent=git(root,br['source_parent'],V2['path']);check(v2_at_parent,V2,branch+' V2 at source parent')
 # Paired current factories and builder are physical support/data; their pins bind this exact profile and old epochs.
 js=read(root,JS);py=read(root,PY);builder=read(root,BUILDER);jst=js.decode();pyt=py.decode();bt=builder.decode()
 if jst.count(PROFILE_SHA)<1 or pyt.count(PROFILE_SHA)<1:raise AssertionError(branch+' current factory profile pin')
 if V1['sha256'] not in jst or V1['sha256'] not in pyt or V2['sha256'] not in jst or V2['sha256'] not in pyt:raise AssertionError(branch+' factory V1/V2 pin')
 if V1['path'] not in jst or V1['path'] not in pyt or V2['path'] not in jst or V2['path'] not in pyt:raise AssertionError(branch+' factory V1/V2 path pin')
 if br['source_parent'] not in jst or br['source_parent'] not in pyt or br['source_parent'] not in bt:raise AssertionError(branch+' source parent not present in factory/builder')
 if V1['sha256'] not in bt or V2['sha256'] not in bt or PROFILE not in bt:raise AssertionError(branch+' builder old epoch/output literals')
 report['factory_builder']={'js':ident(js),'python':ident(py),'builder':ident(builder),'js_profile_pin':PROFILE_SHA,'python_profile_pin':PROFILE_SHA,'v1_v2_pins_match':True,'branch_checkpoint_matches_source_parent':True,'builder_output_path':PROFILE}
 # The builder is in the profile support set and its constants pin the same two immutable epochs.
 if not any(s['path']==BUILDER and s['sha256']==ident(builder)['sha256'] and s['bytes']==ident(builder)['bytes'] for s in br['additional_inputs']):raise AssertionError(branch+' builder not enrolled as exact support')
 # The v6 proposal authenticates the immutable CJS predecessor; current CJS is validated by update.after above.
 if branch=='21.x':
  cjsrow=next(u for u in br['updates'] if u['path']==CJS)
  assert cjsrow['before']==OLD_CJS
  v6raw=read(root,V6);check(v6raw,V6_ID,'21.x immutable V6 proposal');v6=json.loads(v6raw)
  assert v6['handler']==OLD_CJS
  ownerraw=read(root,OWNER);check(ownerraw,OWNER_ID,'21.x new acyclic owner packet');owner=json.loads(ownerraw)
  assert owner['role']=='base-class-admission-current-source-successor' and owner['line']=='21.x' and owner['source_parent']==br['source_parent']
  assert owner['historical_proposal']==V6_ID
  # Its four exact producer transitions are reconstructed and bound to current after/support bytes.
  if len(owner['code_transitions'])!=4 or len(owner['loaded_source_references'])!=4:raise AssertionError('21.x owner packet producer cardinality')
  packet_transition_paths=[]
  for tr in owner['code_transitions']:
   path=tr['path'];packet_transition_paths.append(path)
   original=git(root,br['source_parent'],path);check(original,tr['before'],'21.x owner packet Git predecessor '+path)
   if tr['before'].get('git_blob') and blob_sha(original)!=tr['before']['git_blob']:raise AssertionError('21.x owner packet git blob '+path)
   patched=apply_byte_edits(original,tr['edits'],'21.x owner transition '+path);check(patched,tr['after'],'21.x owner transition rebuild '+path)
   target=physical_after.get(path)
   if target is None:
    support=next(s for s in br['additional_inputs'] if s['path']==path)
    target=support
   if target['sha256']!=tr['after']['sha256'] or target['bytes']!=tr['after']['bytes']:raise AssertionError('21.x owner transition does not match profile after/support '+path)
  for ref in owner['loaded_source_references']:
   path=ref['path'];target=physical_after.get(path)
   if target is None:target=next(s for s in br['additional_inputs'] if s['path']==path)
   if {k:target[k] for k in ('sha256','bytes')}!={k:ref[k] for k in ('sha256','bytes')}:raise AssertionError('21.x loaded identity not bound to physical profile image '+path)
  cjs_actual=read(root,CJS);cjs_text=cjs_actual.decode('utf-8')
  for f in owner['loaded_producer_function_sha256']:
   if f['sha256'] not in cjs_text:raise AssertionError('producer function digest absent from CJS transition '+f['name'])
  report['owner_packet']={'identity':ident(ownerraw),'proposal_handler_equals_cjs_before':True,'transitions':len(owner['code_transitions']),'transition_paths':packet_transition_paths,'loaded_refs':len(owner['loaded_source_references']),'all_loaded_refs_match_physical_images':True,'producer_function_hashes_recorded':len(owner['loaded_producer_function_sha256'])}
  report['cjs_anchor']={'path':CJS,'before':OLD_CJS,'after':cjsrow['after'],'v6_proposal':ident(v6raw)}
 # Historical repair source is the one extra main as well as 21 update; metadata producer transition is line-21 only.
 hist=next(u for u in br['updates'] if u['path']=='scripts/historical-contract-repair-source.mjs')
 report['historical_repair_transition']={'before':hist['before'],'after':hist['after'],'edit_count':len(hist['edits'])}
 return report

roots={};errors=[]
for branch,root in ROOTS.items():
 try:roots[branch]=verify(branch,root)
 except Exception as exc:errors.append({'branch':branch,'error':str(exc)})
paired={}
for rel in [PROFILE,JS,PY,BUILDER,V1['path'],V2['path']]:
 a=ident(read(ROOTS['21.x'],rel));b=ident(read(ROOTS['main'],rel));paired[rel]={'same':a==b,'21.x':a,'main':b}
report={'schema':'parent-t15-final-profile-independent-verification-v1','status':'read-only paired profile, Git DATA before/after, support and factory verification; recipe reconstruction mismatches recorded individually','expected_profile':{'path':PROFILE,'sha256':PROFILE_SHA,'bytes':PROFILE_SIZE},'expected_counts':{k:{'updates':v[0],'support':v[1]} for k,v in COUNTS.items()},'roots':roots,'paired_files':paired,'errors':errors,'limitations':['No tests, builder, factory, product, historical program, or owner program was executed. The builder source was hash-checked and its branch/output/predecessor literals were inspected; updates were independently rebuilt from Git parent DATA.','No maintained file was written. All report/script output is in /tmp.','This validates profile provenance and pins only; it is not full-owner, product, audit-ledger, packed-artifact, release, or G11 qualification.']}
out=pathlib.Path('/tmp/parent-t15-final-profile-independent-verification-v1.json');out.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(out)
print(json.dumps({'roots':{k:{'updates':v['updates_physical_after_verified'],'support':v['support_physical_verified'],'git_before':v['updates_git_before_verified'],'rebuilt':v['updates_recipe_rebuilt']} for k,v in roots.items()},'errors':errors,'paired_mismatches':[k for k,v in paired.items() if not v['same']]},indent=2))
