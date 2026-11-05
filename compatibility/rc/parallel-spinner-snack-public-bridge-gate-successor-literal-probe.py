# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Raw historical-row preservation and literal shared-source proof; no old execution."""
from pathlib import Path
import difflib,gzip,hashlib,json,sys
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';MF='compatibility/rc/historical-contract-repair-reader-inputs.json';sha=lambda b:hashlib.sha256(b).hexdigest();decoder=json.JSONDecoder()
before=json.loads(gzip.decompress((ROOT/(P+'C04-before.json.gz')).read_bytes()))
def array_rows(text,key):
 token=json.dumps(key)+':';start=text.index(token)+len(token)
 while text[start].isspace():start+=1
 assert text[start]=='[';start+=1;out=[]
 while True:
  while text[start].isspace():start+=1
  if text[start]==']':return out
  assert text[start]=='{';_,end=decoder.raw_decode(text,start);out.append(text[start:end]);start=end
  while text[start].isspace():start+=1
  if text[start]==',':start+=1
  else:assert text[start]==']'
def object_value(text,key):
 token=json.dumps(key)+':';start=text.index(token)+len(token)
 while text[start].isspace():start+=1
 _,end=decoder.raw_decode(text,start);return text[start:end]
def edits(left,right):
 aa=left.splitlines(keepends=True);bb=right.splitlines(keepends=True);text=left;out=[]
 for g in reversed(list(difflib.SequenceMatcher(None,aa,bb,autojunk=False).get_grouped_opcodes(6))):
  a=''.join(aa[g[0][1]:g[-1][2]]);b=''.join(bb[g[0][3]:g[-1][4]]);assert text.count(a)==1;text=text.replace(a,b);out.append({'before':a,'after':b})
 assert text==right;return out
branches={};images=[]
for line,root in [('21.x',ROOT),('main',MAIN)]:
 old=next(r['body']for r in before['branches'][line]['images']if r['path']==MF);current=(root/MF).read_text();old_rows=array_rows(old,'tool_transitions');now_rows=array_rows(current,'tool_transitions');unchanged=0
 assert len(old_rows)==(39 if line=='21.x'else 11);assert len(now_rows)==len(old_rows)+6
 for old_row,current_row in zip(old_rows,now_rows):
  assert object_value(old_row,'before')==object_value(current_row,'before')
  old_literals=array_rows(old_row,'literal_edits');current_literals=array_rows(current_row,'literal_edits');assert current_literals[:len(old_literals)]==old_literals
  if json.loads(old_row)['path']=='tests/test_historical_contract_repair_source.py'and line=='21.x':assert len(current_literals)==len(old_literals)+2
  else:assert old_row==current_row;unchanged+=1
 assert array_rows(old,'support_inputs')==array_rows(current,'support_inputs')[:2]
 for key in ['c04_source_successor','prior_reader_registry']:assert object_value(old,key)==object_value(current,key)
 branches[line]={'preserved_full_raw_rows':unchanged,'preserved_all_raw_BEFORE_objects':len(old_rows),'preserved_all_original_raw_literal_objects':True,'existing2raw_support_objects_unchanged':True,'C04_successor_and_prior17or7_metadata_raw_unchanged':True,'current_rows':len(now_rows)}
 for path in ['scripts/historical-contract-repair-readers.mjs','tests/historical_contract_repair_source.py']:
  old=next(r['body']for r in before['branches'][line]['images']if r['path']==path);now=(root/path).read_text();images.append({'line':line,'path':path,'C04_before_sha256':sha(old.encode()),'current_sha256':sha(now.encode()),'literal_edits':edits(old,now)})
out={'schema_version':1,'result':'pass','branches':branches,'shared_images':images,'old_programs_or_compilers_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'};p=Path(sys.argv[1]);assert not p.exists();p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(branches))
