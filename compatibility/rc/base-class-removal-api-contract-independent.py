# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent historical prototype and exact waiver-image checks; no Node marker trust."""
from pathlib import Path
import json,gzip,re,hashlib,subprocess,sys,time
roots={'21.x':Path(sys.argv[1]),'main':Path(sys.argv[2])};prefix='compatibility/rc/base-class-removal-api-contract-';results={};started=time.monotonic()
def digest(b):return hashlib.sha256(b).hexdigest()
def normalize(s):return re.sub(r'\s+','',re.sub(r',\s*\)',')',s))
for line,r in roots.items():
 name='21x'if line=='21.x'else'main';d=json.loads((r/(prefix+name+'-qualified.json')).read_bytes());assert d['project_sources_emitted']==1 and not d['full449symbol_program_executed'];assert d['options']['strict']and d['options']['skipLibCheck']is False
 for ref in d['source_bindings']:
  b=(r/ref['path']).read_bytes();assert digest(b)==ref['sha256'];assert len(b)==ref['bytes']
 capsule_raw=(r/(prefix+'originals.json.gz')).read_bytes();assert digest(capsule_raw)=='3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a';cap=json.loads(gzip.decompress(capsule_raw));original=next(m for m in cap['tagged_reference']['members']if m['path']=='src/material/form-field/testing/error-harness.ts');body=original['body'];assert digest(body.encode())=='532622980f23259e6647f560bb1421938c222942274af95fda010bcad5dcc65c'
 header=re.search(r'protected\s+static\s+_getErrorPredicate[\s\S]+?\):\s*HarnessPredicate<T>',body).group(0);emitted=d['emission']['text'];actual=re.search(r'protected\s+static\s+_getErrorPredicate[\s\S]+?\):\s*HarnessPredicate<T>',emitted).group(0);assert normalize(actual)==normalize(header)
 assert digest(emitted.encode())==d['emission']['sha256'];assert 'type MatErrorHarness' in emitted;assert d['comparison']['blocking']==[];assert len(d['comparison']['required_protected'])==1
 before=json.loads(subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',d['waiver_transition']['baseline_commit']+':compatibility/rc/api/signature-differences.json'],cwd=r));after=json.loads((r/'compatibility/rc/api/signature-differences.json').read_bytes());assert len(before['differences'])==114 and len(after['differences'])==113;row=d['waiver_transition']['removed_record'];assert before['differences'].count(row)==1;before['differences'].remove(row);assert before==after
 ids={c['id']for c in d['controls']};assert len(ids)==11;assert {'missing-helper','private-helper','public-helper','nonstatic-helper','narrowed-generic-domain','unconstrained-generic','wrong-options-type','optional-options','wrong-return-type','renamed-helper','obsolete114-record-image-cannot-be-current'}==ids
 results[line]={'historical_protected_prototype_exact':True,'old114_minus_exactly_one_is_current113':True,'project_sources_emitted':1,'guard_cases':11}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-started,'lines':results,'full449symbol_packed_Angular_native_or_floor_qualified':False,'g11_claim':'not-passed'};Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'pass','lines':results}))
