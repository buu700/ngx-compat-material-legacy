# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite ordinary density composition; source and peer-bound, no envelope itself."""
import hashlib,json,re,weakref
from pathlib import Path
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from sass_ordinary_aggregate_composition import compose_ordinary_aggregate_density
from sass_ordinary_density_peer import ordinary_density_peer_matches
from sass_default_aggregate_admission import default_aggregate_expected_css,DEFAULT_AGGREGATE_CASES
from sass_aggregate_density_admission import aggregate_density_expected_css
_ROOT=Path(__file__).resolve().parents[1]
_IMAGE=Path(__file__).read_bytes()
_MANIFEST={'21.x':'ca614625716d81489fed77d39a0b37e896760db8351fcc91221c4b59488ce4ed','main':'df51e66bd03153ffc6e5eef3dacf989ba294bdd1060b040513e09ad5aec14756'}
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
        for r in rows:
            b=_read(root,r['path'])
            if _hash(b)!=r['sha256'] or len(b)!=r['bytes']:raise ValueError('dependency changed')
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
