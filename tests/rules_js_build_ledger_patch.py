# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent six-edit reconstruction, without the production TypeScript parser."""
import gzip
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sha=lambda data:hashlib.sha256(data).hexdigest()
line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
pins={'main':'c9a98435c6c654996955d808a8ea2717f5f4d89f8eb360c0fd4df7854712b975','21.x':'c0e61d07aecb56a56c6c3b1d70d836c28edcfccbb36967f28460921037894191'}
raw=(ROOT/'compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz').read_bytes();assert sha(raw)==pins[line]
packet=json.loads(gzip.decompress(raw));assert packet['line']==line
parent={'main':'6484f6dcb499c5c62cdd94d98b28e355f1962485','21.x':'29911639fb9b7b49482ea6f99741d1a9f753722e'}[line]
path='compatibility/f10/disposition-ledger/ledger.json';assert packet['before']['path']==path and packet['before']['source_parent']==parent
env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
for k in ('GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'):env.pop(k,None)
before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=ROOT,env=env)
assert sha(before)==packet['before']['sha256'];text=before.decode();original=json.loads(text);decoder=json.JSONDecoder();spans={}
def parse(pos,path=()):
    while text[pos].isspace():pos+=1
    start=pos
    if text[pos] in '{[':
        obj=text[pos]=='{';end='}' if obj else ']';pos+=1;index=0
        while True:
            while text[pos].isspace():pos+=1
            if text[pos]==end:pos+=1;break
            if obj:
                key,pos=decoder.raw_decode(text,pos)
                while text[pos].isspace():pos+=1
                assert text[pos]==':';pos+=1
            else:key=index;index+=1
            pos=parse(pos,path+(key,))
            while text[pos].isspace():pos+=1
            if text[pos]==',':pos+=1
            else:assert text[pos]==end
    else:_,pos=decoder.raw_decode(text,pos)
    spans[path]=start,pos
    return pos
parse(0)
for ref in packet['code_subjects']+[packet['review']]:
    data=(ROOT/ref['path']).read_bytes();assert sha(data)==ref['sha256'] and len(data)==ref['bytes']
review=json.loads((ROOT/packet['review']['path']).read_bytes());assert review['line']==line and review['status']=='reviewed'
by_sha={r['sha']:i for i,r in enumerate(original['entries'])};assert len(by_sha)==1697
edits=[];changed=[]
for change in packet['entries']:
    i=by_sha[change['sha']];old=original['entries'][i];row=next(r for r in review['reviews'] if r['sha']==change['sha'])
    assert sha((json.dumps(old,indent=2,ensure_ascii=False)+'\n').encode())==row['prior_entry_sha256']==change['before_entry_sha256']
    expected=dict(old,final_disposition='not-applicable',reason=row['decision'],review_depth='individual-compatibility',affected_branches=[line],
        evidence_report=packet['review']['path'],diff_sha256=row['diff_sha256'],patch_sha256=row['diff_sha256'],
        batch_id='closeout-three-rules-js-build-individual-reviews',source_check=dict(evidence_report_sha256=packet['review']['sha256'],review_membership=row['sha']),
        individual_proof=dict(proof_kind='individual-complete-build-source-exclusion',review_depth='individual-compatibility',affected_branches=[line],decision=row['decision'],diff_sha256=row['diff_sha256'],
          rules_js_build_source_scope=dict(sha=row['sha'],review=packet['review']|{},source_scope_only=True,current_native_packed_or_floor_qualified=False)),
        prior_dispositions=[dict(source_parent=parent,source_entry_sha256=row['prior_entry_sha256'],source_line=line,final_disposition=old['final_disposition'])])
    expected['individual_proof']['rules_js_build_source_scope']['review'].pop('bytes')
    expected.pop('peer_floor',None)
    assert change['after_entry']==expected and expected['files']==row['frozen_seed_paths']
    a,b=spans[('entries',i)];edits.append((a,b,json.dumps(expected,indent=2,ensure_ascii=False).replace('\n','\n    ')));changed.append(change['sha'])
native={'8e1711216f7d07324e311e0f6ada3d2426c7891e','7c9c898faac8daac1bbb20a0807168a74360760d','20bf71c40f565c59101b63b5a878d2ddb7fe251d'}
assert {r['sha'] for r in packet['source_digest_updates']}==native
for update in packet['source_digest_updates']:
    i=by_sha[update['sha']];parts=tuple(update['path']);assert parts[:3]==('individual_proof','historical_behavior','source_members') and parts[-1]=='sha256' and len(parts)==5
    member=original['entries'][i]['individual_proof']['historical_behavior']['source_members'][parts[3]]
    assert member['path']=='scripts/check-upstream-audit-disposition.mjs' and member['sha256']==update['before']
    assert update['after']==sha((ROOT/member['path']).read_bytes())
    a,b=spans[('entries',i)+parts];assert json.loads(text[a:b])==update['before'];edits.append((a,b,json.dumps(update['after'])));changed.append(update['sha'])
assert len(edits)==len(set(changed))==6 and len(packet['entries'])==3
chunks=[];end=0
for a,b,value in sorted(edits):assert a>=end;chunks.extend((text[end:a],value));end=b
chunks.append(text[end:]);after=''.join(chunks).encode();assert sha(after)==packet['after_sha256']
current=(ROOT/path).read_bytes();applied=current==after;summary_updates=0
if current not in (before,after):
    summary_pins={'main':'8346997a4b0135fc858748ff2520230e3a537efe00ac04c3ef71646858996152','21.x':'2d4fc0ff09b993cca3d202d75844141574ddd55c9730ca84339744f3d9b2083c'}
    summary_raw=(ROOT/'compatibility/rc/upstream-ledger-summary-transition.json').read_bytes();assert sha(summary_raw)==summary_pins[line]
    summary=json.loads(summary_raw);assert summary['line']==line and summary['before']['sha256']==sha(after)
    assert summary['before']['source_parent']=={'main':'eb7309f5a9b0108aa22a7d9de2f28d4c502dbae8','21.x':'13a036b88364373898729bed5ccbeda98b2cb891'}[line]
    assert summary['entries_changed']==summary['new_SHA_decisions']==0 and summary['full_audit_or_gate_credit'] is False
    after_data=json.loads(after)
    closed={'irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present'}
    pending={'open','needs-individual-review','security-review'}
    assert all(r['final_disposition'] in closed|pending for r in after_data['entries'])
    values=dict(closed_dispositions=sum(r['final_disposition'] in closed for r in after_data['entries']),open_or_deferred=sum(r['final_disposition'] in pending for r in after_data['entries']))
    assert sum(values.values())==1697 and [r['field'] for r in summary['updates']]==list(values)
    normalized=after.decode()
    for update in summary['updates']:
        assert after_data[update['field']]==update['before'] and values[update['field']]==update['after']
        normalized,n=re.subn(r'(^  "'+update['field']+r'": )\d+(,?$)',lambda m:m[1]+str(update['after'])+m[2],normalized,flags=re.M);assert n==1
    normalized=normalized.encode();assert sha(normalized)==summary['after_sha256']
    assert json.loads(normalized)==dict(after_data,**values)
    if current!=normalized:
        from autocomplete_landscape_ledger_patch import verify_landscape_successor
        successor=verify_landscape_successor(expected_before=normalized,root=ROOT)
        assert successor['canonical_applied'] is True and successor['before_sha256']==sha(normalized)
    applied=True;summary_updates=2
assert {a['sha'] for a,b in zip(original['entries'],json.loads(after)['entries']) if a!=b}==set(changed)
report=dict(line=line,result='pass',independent_parser='Python JSON object/scalar spans; no TypeScript AST',canonical_entries=1697,
    individual_decisions_changed=3,checker_source_digests_changed=3,unrelated_entry_or_byte_changes=0,
    before_sha256=sha(before),after_sha256=sha(after),canonical_applied=applied,subsequent_summary_scalar_updates=summary_updates,current_native_packed_or_floor_or_G11_qualified=False)
if len(sys.argv)>1:
    with open(sys.argv[1],'x') as output:output.write(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
