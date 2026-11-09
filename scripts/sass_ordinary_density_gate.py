# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite ordinary density composition; source and peer-bound, no envelope itself."""
import hashlib,json,os,re,subprocess,weakref
from pathlib import Path
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from sass_ordinary_aggregate_composition import compose_ordinary_aggregate_density
from sass_ordinary_density_peer import ordinary_density_peer_matches
from sass_default_aggregate_admission import default_aggregate_expected_css,DEFAULT_AGGREGATE_CASES
from sass_aggregate_density_admission import aggregate_density_expected_css
_ROOT=Path(__file__).resolve().parents[1]
_IMAGE=Path(__file__).read_bytes()
_MANIFEST={'21.x':'8ea082998e3fb6b409ab145f50924cf859213f0d5d7544fecff63ab6f10ac321','main':'5b68ae2e2fc034535ff4a9a5c975ba47c197f81e3b7788036d85a36b0ff63ffc'}
_CASES=('mixin-css/all-component-densities','mixin-argument/all-component-densities/custom-full-theme','mixin-argument/all-component-densities/raw-density-config')
_CONTEXTS=weakref.WeakKeyDictionary()
_hash=lambda b:hashlib.sha256(b.encode() if type(b) is str else b).hexdigest()
def _plain(v):
    if v is None or type(v) in (str,bool):return v
    if type(v) is int:
        if abs(v)>9007199254740991:raise ValueError('integer')
        return v
    if type(v) is list:return [_plain(x) for x in v]
    if type(v) is dict and all(type(k) is str for k in v):return {k:_plain(x) for k,x in v.items()}
    raise ValueError('nonplain metadata')
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
def _density_successors(root,line,files):
    if line!='main':return {}
    path='compatibility/rc/current-main-density-input-successor-v1.json';raw=_read(root,path)
    assert _hash(raw)=='d85c0dca28dbc166e3566eb3b173917c1524c68f5116a490826748ce4876ab2a' and len(raw)==34446;p=json.loads(raw)
    names=['scripts/companion-bridge-peer-oracle.mjs','scripts/current-sass-source.mjs','scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_source.py','scripts/current_sass_spinner_snack_admission.py']
    assert p['schema_version']==1 and p['role']=='main-ordinary-density-exact-source-successor' and p['source_parent']=='42d02491648097656ccb3c590dbaaea066c3e603' and p['oracle_commit']=='33d7d9e31fd96cbfa6c4e1f592c0bade985c0878' and p['source_scope_only'] is True and [r['path'] for r in p['updates']]==names
    vraw=_read(root,'compatibility/rc/current-main-density-input-successor-v2.json');assert (_hash(vraw),len(vraw))==('e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f',92667);v2=json.loads(vraw)
    assert v2['schema_version']==1 and v2['role']=='main-ordinary-density-current-source-successor' and v2['line']=='main' and v2['source_scope_only'] is True and v2['artifact_or_audit_admission_granted'] is False and v2['previous_packet']==dict(path=path,sha256=_hash(raw),bytes=len(raw)) and [r['path'] for r in v2['updates']]==names[1:]
    env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
    def git(commit,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],cwd=root,env=env)
    refs={};continuations=_checked_density_continuations(root)
    for commit in ['19ee6343365c391deb97362caec413b113665e1b','b94f169d4fe57d571e6a7c3f911a9395f6a60c4d',*[x['base_head'] for x in continuations]]:subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],cwd=root,env=env)
    for row in p['updates']:
        old=git(p['source_parent'],row['path']);manifest=next(r for r in files if r['path']==row['path']);assert manifest==row['before'] and _hash(old)==row['before']['sha256'] and len(old)==row['before']['bytes'];cursor=0;parts=[]
        for edit in row['edits']:
            assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=cursor;before=edit['before'].encode();after=edit['after'].encode();assert old[edit['offset']:edit['offset']+len(before)]==before;parts.extend((old[cursor:edit['offset']],after));cursor=edit['offset']+len(before)
        after=b''.join([*parts,old[cursor:]]);assert row['after']['path']==row['path'] and _hash(after)==row['after']['sha256'] and len(after)==row['after']['bytes']
        if row['path']==names[0]:assert git(p['oracle_commit'],row['path'])==after
        update=next((x for x in v2['updates'] if x['path']==row['path']),None);final=after;final_ref=row['after']
        if update:
            assert update['before']==row['after'];at=0;parts=[]
            for edit in update['edits']:
                assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=at;old=edit['before'].encode();assert after[edit['offset']:edit['offset']+len(old)]==old;parts.extend((after[at:edit['offset']],edit['after'].encode()));at=edit['offset']+len(old)
            final=b''.join([*parts,after[at:]]);final_ref=update['after'];assert _hash(final)==final_ref['sha256'] and len(final)==final_ref['bytes']
        if row['path'] in _DENSITY_PATHS:final,final_ref=_continue_density_input(row['path'],final,final_ref,continuations,git)
        assert _read(root,row['path'])==final;refs[row['path']]=final_ref
    return refs

class OrdinaryDensityGateContext:
    __slots__=('__weakref__',)
    def __init__(self,root=_ROOT):
        if not __debug__:raise RuntimeError('optimized Python cannot authenticate source')
        root=Path(root).absolute();source=CurrentSpinnerSnackContract(root);line=source.line
        sets=list(source.source_sets.values())
        if len(sets)!=1:raise ValueError('source set')
        sources=_plain(sets[0]);descriptor=_plain(source.descriptor)
        historical=json.loads(_read(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'));historical_sets=list(historical['loaded_source_sets'].values())
        if len(historical_sets)!=1 or len(historical_sets[0])!=286:raise ValueError('historical source set')
        original_sources=_plain(historical_sets[0])
        catalog=json.loads(_read(root,'fixtures/sass/mixin-argument-contracts.json'))
        plans={_CASES[0]:DEFAULT_AGGREGATE_CASES[_CASES[0]]['program_sha256']}
        for case in _CASES[1:]:
            rows=[r for r in catalog['cases'] if r['case_id']==case]
            if len(rows)!=1:raise ValueError('case')
            plans[case]=_hash("@use '__entry__' as m;\n"+catalog['setup']+'\n'+rows[0]['call']+'\n')
        _CONTEXTS[self]=dict(root=root,source=source,line=line,sources=sources,descriptor=descriptor,plans=plans,original_sources=original_sources)
        self.assert_current()
    def assert_current(self):
        if not __debug__:raise RuntimeError('optimized Python cannot authenticate source')
        state=_CONTEXTS[self];root=state['root'];line=state['line'];source=state['source'];source.assert_current()
        if Path(__file__).read_bytes()!=_IMAGE:raise ValueError('gate changed')
        raw=_read(root,'fixtures/sass/ordinary-density-proof-inputs.json')
        if _hash(raw)!=_MANIFEST[line]:raise ValueError('proof manifest changed')
        m=json.loads(raw);rows=m['files']
        if m['schema_version']!=1 or type(rows) is not list or not rows or len({r['path'] for r in rows})!=len(rows):raise ValueError('proof manifest')
        if 'successors' not in state:state['successors']=_density_successors(root,line,rows)
        elif line=='main':
            packet=_read(root,'compatibility/rc/current-main-density-input-successor-v1.json');assert _hash(packet)=='d85c0dca28dbc166e3566eb3b173917c1524c68f5116a490826748ce4876ab2a' and len(packet)==34446;v=_read(root,'compatibility/rc/current-main-density-input-successor-v2.json');assert (_hash(v),len(v))==('e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f',92667)
        successors=state['successors']
        for _ in range(2):
            if line=='main':_checked_density_continuations(root)
            for r in rows:
                expected=successors.get(r['path'],r);b=_read(root,r['path'])
                if _hash(b)!=expected['sha256'] or len(b)!=expected['bytes']:raise ValueError('dependency changed')
            if line=='main':
                packet=_read(root,'compatibility/rc/current-main-density-input-successor-v1.json');assert _hash(packet)=='d85c0dca28dbc166e3566eb3b173917c1524c68f5116a490826748ce4876ab2a' and len(packet)==34446;v=_read(root,'compatibility/rc/current-main-density-input-successor-v2.json');assert (_hash(v),len(v))==('e6e385dde92ed1cdcc65998bdb6c9433458ed275572e528973e67a195b8c545f',92667)
        source.assert_current()
def ordinary_density_gate_descriptor(context,peer):
    if not __debug__ or type(context) is not OrdinaryDensityGateContext or context not in _CONTEXTS:raise ValueError('unknown context')
    context.assert_current();result=dict(contract='historical-aggregate-with-ordinary-density-peer',source=_plain(_CONTEXTS[context]['descriptor']),peer=_plain(peer));context.assert_current();return result
def ordinary_density_gate_match(context,body):
    if not __debug__ or type(context) is not OrdinaryDensityGateContext or context not in _CONTEXTS:return False
    try:
        state=_CONTEXTS[context];b=_plain(body);case=b['case_id'];line=b['line'];d=b['current_ordinary_density'];actual=b['actual_measurement'] if case.startswith('mixin-css/') else b['actual'];comp=b['current_companion']
        if (case not in _CASES or line!=state['line'] or set(d)!={'contract','peer','source'} or comp['classification']!='conforming-current-companion' or comp['contract']!=('historical-default-aggregate-with-qualified-public-members' if case.startswith('mixin-css/') else 'historical-density-aggregate-with-qualified-tail') or d['contract']!='historical-aggregate-with-ordinary-density-peer' or d['source']!=state['descriptor'] or actual['line']!=line or actual['program_sha256']!=state['plans'][case] or actual['sass_version']!=d['peer']['sass_version'] or actual['css_sha256']!=_hash(actual['css']) or type(actual['css_bytes']) is not int or actual['css_bytes']!=len(actual['css'].encode()) or actual['sources']!=state['sources']):return False
        if not case.startswith('mixin-css/') and b['expected']['sources']!=state['original_sources']:return False
        if case.startswith('mixin-css/'):
            entry=DEFAULT_AGGREGATE_CASES[case]
            if b['expected_sha256']!=entry['original_sha256'] or b['expected_bytes']!=entry['original_bytes']:return False
            base=default_aggregate_expected_css(case,comp['peer'],line)
        else:base=aggregate_density_expected_css(b)
        if type(base) is not str:return False
        expected=compose_ordinary_aggregate_density(dict(caseId=case,css=base))
        if type(expected) is not str or not ordinary_density_peer_matches(case,d['peer'],line,expected) or actual['css']!=expected:return False
        context.assert_current()
        return _plain(body)==b
    except (KeyError,TypeError,ValueError,AttributeError,AssertionError,IndexError,OSError):return False
