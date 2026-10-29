# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent raw-token derivation;no Node proposal producer or canonical write."""
from pathlib import Path
import gzip,hashlib,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
PINS={'main': {'parent': '5fa99e8ab39275792114984e5cb4d6607d530b31', 'before': 'e8c57b7630bfec15b3730214c03c41cf37e6654ce236743dff3d644ff43e813e', 'after': '0f3ffb5a86e4838a3fd29d7e47e10a30bc7feb39f23d79dde9706473f6337443', 'oldChecker': 'db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377', 'checker': 'c47294c9947448ee832abfd98a44083ea0dcdae6ea9d20559c9282799c248488', 'count': 13, 'preserved': 7, 'packet': 'fe1a877f6d427b0eb598391ee11502b49c65d0242c55956f25bd5284314d71db', 'verifier': '17fcdad5994f720ccff749a379239d99787e035ae7f0295b064e279e1a2f24d6'}, '21.x': {'parent': '7bae903e9a1309c6e226909ed8ee1bae5ad4eccf', 'before': '558b6891e575422cdfcdaff2f59fa7611cf53246130da3afeec68571d1c77a1b', 'after': '8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17', 'oldChecker': 'db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377', 'checker': '4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106', 'count': 5, 'preserved': 14, 'packet': '58af70dec579e45bd47862065ec2bb8cfcfd7cbeb9081303930508f6d07c2d7f', 'verifier': '17fcdad5994f720ccff749a379239d99787e035ae7f0295b064e279e1a2f24d6'}}
LEDGER='compatibility/f10/disposition-ledger/ledger.json';CHECKER='scripts/check-upstream-audit-disposition.mjs'
hash_bytes=lambda raw:hashlib.sha256(raw).hexdigest()
line='21.x'if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.')else'main';pin=PINS[line]
env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
before=subprocess.check_output(['git','--no-replace-objects','show',pin['parent']+':'+LEDGER],cwd=ROOT,env=env);assert hash_bytes(before)==pin['before']
checker=(ROOT/CHECKER).read_bytes();assert hash_bytes(checker)==pin['checker'];live_before=(ROOT/LEDGER).read_bytes()
# This is the real owned source verifier,not a returned or cached success value.
source=json.loads(subprocess.check_output(['node','tests/checker_reference_source_probe.mjs','--metadata'],cwd=ROOT,env=env));assert source['result']=='pass'and source['current_checker_sha256']==pin['checker']
assert source['old_checker_executed']is False and source['actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified']is False
expected=json.loads(before);updates={};preserved=[]
for entry in expected['entries']:
 for kind in ['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior']:
  for index,ref in enumerate(entry.get('individual_proof',{}).get(kind,{}).get('source_members',[])):
   if ref.get('path')!=CHECKER:continue
   assert ref['sha256']in[pin['oldChecker'],pin['checker']]
   if ref['sha256']==pin['checker']:preserved.append((entry['sha'],kind,index));continue
   assert entry['sha']not in updates;updates[entry['sha']]=kind;ref['sha256']=pin['checker']
assert len(updates)==pin['count']and len(preserved)==pin['preserved'];assert list(updates)==[row['sha']for row in source['per_row_guard_exclusions']]
text=before.decode();markers=list(re.finditer(r'^    \{\n      "sha": "([0-9a-f]{40})",\n',text,re.M));assert len(markers)==1697;end_of_entries=text.index('\n  ],',markers[-1].end());pieces=[];last=0
for index,marker in enumerate(markers):
 end=markers[index+1].start()if index+1<len(markers)else end_of_entries
 if marker.group(1)in updates:
  entry=text[marker.start():end];needle='"sha256": "'+pin['oldChecker']+'"';assert entry.count(needle)==1
  pieces.extend([text[last:marker.start()],entry.replace(needle,'"sha256": "'+pin['checker']+'"')]);last=end
pieces.append(text[last:]);after=''.join(pieces).encode();assert json.loads(after)==expected and len(after)==len(before)
assert gzip.decompress((ROOT/'compatibility/rc/c04-checker-reference-proposal-after.json.gz').read_bytes())==after
packet=json.loads((ROOT/'compatibility/rc/c04-checker-reference-proposal.json').read_bytes());assert hash_bytes(after)==packet['after_ledger']['sha256']
stage_live=gzip.decompress((ROOT/'compatibility/rc/c04-checker-reference-proposal-after.json.gz').read_bytes())
assert stage_live in[before,after];assert source['current_ledger_sha256']==hash_bytes(live_before);assert(ROOT/LEDGER).read_bytes()==live_before
unchanged=sum(before[m.start():(markers[i+1].start()if i+1<len(markers)else end_of_entries)]==after[m.start():(markers[i+1].start()if i+1<len(markers)else end_of_entries)]for i,m in enumerate(markers));assert unchanged==1697-pin['count']
print(json.dumps({'schema_version':1,'line':line,'independent_after_sha256':hash_bytes(after),'independent_after_bytes':len(after),'hash_scalar_replacements':len(updates),'already_current_checker_references_preserved':len(preserved),'unselected_entry_bytes_preserved':unchanged,'canonical_ledger_unchanged':True,'canonical_owner_integration_complete':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}))
