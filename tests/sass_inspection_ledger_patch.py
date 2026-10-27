# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Independent reconstruction of six decisions and three exact checker digests."""
from pathlib import Path
import gzip
import hashlib
import json
import os
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
line = '21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
pins = {'main':'922c6f5ef0f7635db93e694931a9aa7e54762479418ed5b1330b27adf12cebc4', '21.x':'98d02b52e86689e4e05f4a750f044ee5c8a22f812ddb92dc9214d5156d298803'}
raw = (ROOT/'compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz').read_bytes()
assert SHA(raw) == pins[line]
packet = json.loads(gzip.decompress(raw)); assert packet['line'] == line
path = 'compatibility/f10/disposition-ledger/ledger.json'; assert packet['before']['path'] == path
parent = packet['before']['source_parent']
assert parent == ('ee7caea06eeb94b255c959f8266b8d05e4952134' if line == 'main' else 'c360c994c814b10ad2432852a0c8a1fa0deeedbb')
env = {**os.environ, 'GIT_NO_LAZY_FETCH':'1', 'GIT_NO_REPLACE_OBJECTS':'1'}
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']: env.pop(key,None)
before = subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=ROOT,env=env)
assert SHA(before) == packet['before']['sha256']
text = before.decode(); original = json.loads(text); decoder = json.JSONDecoder(); spans = {}
def parse(pos,path=()):
    while text[pos].isspace(): pos += 1
    start = pos
    if text[pos] == '{':
        pos += 1
        while True:
            while text[pos].isspace(): pos += 1
            if text[pos] == '}': pos += 1; break
            key,pos = decoder.raw_decode(text,pos)
            while text[pos].isspace(): pos += 1
            assert text[pos] == ':'; pos = parse(pos+1,path+(key,))
            while text[pos].isspace(): pos += 1
            if text[pos] == ',': pos += 1
            else: assert text[pos] == '}'
    elif text[pos] == '[':
        pos += 1; i = 0
        while True:
            while text[pos].isspace(): pos += 1
            if text[pos] == ']': pos += 1; break
            pos = parse(pos,path+(i,)); i += 1
            while text[pos].isspace(): pos += 1
            if text[pos] == ',': pos += 1
            else: assert text[pos] == ']'
    else: _,pos = decoder.raw_decode(text,pos)
    spans[path] = start,pos
    return pos
parse(0)
review_bytes = (ROOT/packet['review']['path']).read_bytes(); assert SHA(review_bytes) == packet['review']['sha256']
review = json.loads(review_bytes); assert review['line'] == line
by_sha = {row['sha']:i for i,row in enumerate(original['entries'])}; assert len(by_sha) == 1697
edits = []; changed = []
allowed = {'final_disposition','reason','review_depth','affected_branches','evidence_report','individual_proof','patch_sha256'}
for change in packet['entries']:
    i = by_sha[change['sha']]; old = original['entries'][i]; new = change['after_entry']
    row = next(item for item in review['reviews'] if item['sha'] == change['sha'])
    assert SHA((json.dumps(old,indent=2,ensure_ascii=False)+'\n').encode()) == row['prior_entry_sha256'] == change['before_entry_sha256']
    assert {k:v for k,v in old.items() if k not in allowed} == {k:v for k,v in new.items() if k not in allowed}
    assert new['final_disposition'] == 'do-not-adopt' and new['reason'] == row['decision']
    assert new['affected_branches'] == [line] and new['files'] == row['frozen_seed_paths']
    assert new['individual_proof'] == {'proof_kind':'individual-historical-sass-api-exclusion','diff_sha256':row['diff_sha256'],
        'review_depth':'individual-compatibility','affected_branches':[line],'decision':row['decision'],
        'sass_inspection':{'sha':row['sha'],'review':packet['review'],'source_scope_only':True,'actual_native_packed_or_floor_qualified':False}}
    if 'patch_sha256' in old: assert new['patch_sha256'] == row['diff_sha256']
    s,e = spans[('entries',i)]; edits.append((s,e,json.dumps(new,indent=2,ensure_ascii=False).replace('\n','\n    '))); changed.append(change['sha'])
for change in packet['source_digest_updates']:
    i = by_sha[change['sha']]; parts = tuple(change['path']); node = original['entries'][i]
    for key in parts: node = node[key]
    assert node == change['before']
    checker_parent = {'main':'6484f6dcb499c5c62cdd94d98b28e355f1962485','21.x':'29911639fb9b7b49482ea6f99741d1a9f753722e'}[line]
    original_checker = subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','show',checker_parent+':scripts/check-upstream-audit-disposition.mjs'],cwd=ROOT,env=env)
    assert change['after'] == SHA(original_checker)
    s,e = spans[('entries',i)+parts]; assert json.loads(text[s:e]) == change['before']
    edits.append((s,e,json.dumps(change['after']))); changed.append(change['sha'])
assert len(edits) == len(changed) == len(set(changed)) == 9
chunks = []; end = 0
for start,finish,value in sorted(edits):
    assert start >= end; chunks.extend([text[end:start],value]); end = finish
chunks.append(text[end:]); after = ''.join(chunks).encode(); assert SHA(after) == packet['after_sha256']
after_rows = json.loads(after)['entries']; assert len(after_rows) == 1697
assert [r['sha'] for r in after_rows] == [r['sha'] for r in original['entries']]
assert {old['sha'] for old,new in zip(original['entries'],after_rows) if old != new} == set(changed)
current = (ROOT/path).read_bytes(); applied = current == after
if current not in (before,after):
    build_pins = {'main':'c9a98435c6c654996955d808a8ea2717f5f4d89f8eb360c0fd4df7854712b975','21.x':'c0e61d07aecb56a56c6c3b1d70d836c28edcfccbb36967f28460921037894191'}
    build_raw = (ROOT/'compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz').read_bytes()
    assert SHA(build_raw) == build_pins[line]
    build_packet = json.loads(gzip.decompress(build_raw)); assert build_packet['before']['sha256'] == SHA(after)
    child = subprocess.run([sys.executable,str(ROOT/'tests/rules_js_build_ledger_patch.py')],cwd=ROOT,env=env,capture_output=True,text=True,check=True)
    assert json.loads(child.stdout)['canonical_applied'] is True
    applied = True
report = {'line':line,'result':'pass','independent_parser':'Python JSON object/scalar spans; no TypeScript AST',
          'canonical_entries':1697,'individual_decisions_changed':6,'checker_source_digests_changed':3,'unrelated_entry_or_byte_changes':0,
          'before_sha256':SHA(before),'after_sha256':SHA(after),'canonical_applied':applied,'changed_sha_ids':changed,
          'full_Sass_native_floor_or_G11_qualified':False,'producer_sha256':SHA(Path(__file__).read_bytes())}
if len(sys.argv)>1:
    with open(sys.argv[1],'x') as output: output.write(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k != 'changed_sha_ids'}))
