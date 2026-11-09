# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact main-line source continuation; no CSS or artifact admission."""
import hashlib,json
_hash=lambda b:hashlib.sha256(b.encode() if type(b) is str else b).hexdigest()
def _read(root,path):
    if type(path) is not str or not path or path.startswith('/') or '\\' in path or any(x in ('','.','..') for x in path.split('/')):raise ValueError('path')
    cur=root
    for part in path.split('/'):
        cur=cur/part
        if cur.is_symlink():raise ValueError('linked input')
    if not cur.is_file():raise ValueError('not file')
    return cur.read_bytes()
_V3={'path': 'compatibility/rc/current-main-density-input-successor-v3.json', 'sha256': 'b0feea9a089fea3c671927c548f3c4d6b07923ee9f7574d17d0630fbc6444ffc', 'bytes': 1667}
_CONTINUATIONS=[{'path': 'compatibility/rc/main-tooltip-resource-source-programs-v1.json', 'sha256': 'b7c7ef0e2a3a7b0f8d471983751e87155b7880b61a097c5f9254cf17fa0ec211', 'bytes': 15324, 'role': 'main-tooltip-resource-source-program-continuation', 'base_head': '8fe95564c981a9dd73605d27beaa0496824e8444'}, {'path': 'compatibility/rc/main-sass-graph-resource-source-programs-v2.json', 'sha256': 'e5a02ae6f0f4532dbc550e9e8e436fce69b9592dd81eb06a28ed1e8a689f1a98', 'bytes': 6928, 'role': 'main-sass-graph-resource-source-program-continuation', 'base_head': 'ecc1051cfb829f0b67ba9cb50e4b733d6684ebff'}, {'path': 'compatibility/rc/main-sass-resource-contract-programs-v1.json', 'sha256': 'e8db18d114f9a32c946caaf72b0f3ea1ed8377c3bba6b518f5162ab947673d2a', 'bytes': 14946, 'role': 'main-sass-resource-contract-program-continuation', 'base_head': 'ecc1051cfb829f0b67ba9cb50e4b733d6684ebff'}]
_DENSITY_PATHS=['scripts/current-sass-source.mjs', 'scripts/current-sass-spinner-snack-contract.mjs', 'scripts/current_sass_source.py', 'scripts/current_sass_spinner_snack_admission.py']
def _checked_density_continuations(root):
    raw=_read(root,_V3['path']);assert (_hash(raw),len(raw))==(_V3['sha256'],_V3['bytes']);v=json.loads(raw)
    assert v['schema_version']==1 and v['role']=='main-ordinary-density-resource-continuation' and v['line']=='main' and v['source_scope_only'] is True and v['artifact_or_audit_admission_granted'] is False and v['source_end_commit']=='b94f169d4fe57d571e6a7c3f911a9395f6a60c4d' and v['previous_packet']=={'path': 'compatibility/rc/current-main-density-input-successor-v2.json', 'sha256': 'e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f', 'bytes': 92667} and v['continuations']==_CONTINUATIONS and v['paths']==_DENSITY_PATHS
    out=[]
    for ref in _CONTINUATIONS:
        b=_read(root,ref['path']);assert (_hash(b),len(b))==(ref['sha256'],ref['bytes']);p=json.loads(b)
        assert p['schema_version']==1 and p['role']==ref['role'] and p['base_head']==ref['base_head'] and p['source_scope_only'] is True and p['historical_programs_executed'] is False and p['historical_packets_rewritten'] is False and p['theme_module_contract_changed'] is False and p['css_or_artifact_admission_granted'] is False and p['g11_claim']=='not-passed';out.append(p)
    return out
def _continue_density_input(path,initial,initial_ref,packets,git):
    current=initial;expected=initial_ref
    for packet in packets:
        rows=[r for r in packet['updates'] if r['path']==path];assert len(rows)<=1
        if not rows:continue
        row=rows[0];assert row['before']==expected and git(packet['base_head'],path)==current;cursor=0;parts=[]
        for e in row['edits']:
            assert set(e)=={'offset','before','after'} and type(e['offset']) is int and cursor<=e['offset']<=len(current);before=e['before'].encode();assert current[e['offset']:e['offset']+len(before)]==before;parts.extend((current[cursor:e['offset']],e['after'].encode()));cursor=e['offset']+len(before)
        current=b''.join([*parts,current[cursor:]]);expected=row['after'];assert expected['path']==path and (_hash(current),len(current))==(expected['sha256'],expected['bytes'])
    assert git('b94f169d4fe57d571e6a7c3f911a9395f6a60c4d',path)==current
    return current,expected
def continue_select_density_input(root,path,initial,initial_ref,read,git):
    raw=read('compatibility/rc/current-main-density-input-successor-v2.json');assert (_hash(raw),len(raw))==('e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f',92667);v=json.loads(raw)
    assert v['schema_version']==1 and v['role']=='main-ordinary-density-current-source-successor' and v['line']=='main' and v['source_scope_only'] is True and v['artifact_or_audit_admission_granted'] is False and v['previous_packet']==dict(path='compatibility/rc/current-main-density-input-successor-v1.json',sha256='d85c0dca28dbc166e3566eb3b173917c1524c68f5116a490826748ce4876ab2a',bytes=34446) and [r['path'] for r in v['updates']]==_DENSITY_PATHS
    rows=[r for r in v['updates'] if r['path']==path];assert len(rows)==1 and rows[0]['before']==initial_ref;at=0;parts=[]
    for e in rows[0]['edits']:
        assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(initial);old=e['before'].encode();assert initial[e['offset']:e['offset']+len(old)]==old;parts.extend((initial[at:e['offset']],e['after'].encode()));at=e['offset']+len(old)
    nxt=b''.join([*parts,initial[at:]]);r=rows[0]['after'];assert r['path']==path and (_hash(nxt),len(nxt))==(r['sha256'],r['bytes']) and git('19ee6343365c391deb97362caec413b113665e1b',path)==nxt
    # Read through caller's physical/bound reader for late mutation detection.
    _checked_density_continuations_via_read(read)
    return _continue_density_input(path,nxt,r,_checked_density_continuations(root),git)
def _checked_density_continuations_via_read(read):
    for ref in [_V3,*_CONTINUATIONS]:
        b=read(ref['path']);assert (_hash(b),len(b))==(ref['sha256'],ref['bytes'])
