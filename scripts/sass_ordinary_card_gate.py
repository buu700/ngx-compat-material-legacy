# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite card12 gate. Context privately owns authenticated source successors."""
import hashlib
import json
from pathlib import Path
import re
import weakref
from current_sass_source import CurrentSassSource
from sass_ordinary_card_css import ORDINARY_CARD_CASES, ordinary_card_expected_css, ordinary_card_results_match

ROOT=Path(__file__).resolve().parents[1]
SELF='scripts/sass_ordinary_card_gate.py'
INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'
_IMAGE=(ROOT/SELF).read_bytes()
def _hash(raw):return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()
_RAW=(ROOT/INPUTS).read_bytes()
assert _hash(_RAW)=='fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'
_PACKET=json.loads(_RAW)
_MODELS=[
 {'path':'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs','sha256':'0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83'},
 {'path':'compatibility/rc/ordinary-card-public-bridge-model-v2.mjs','sha256':'171a32edcc51d651173d52840da6a4cdcdf4bb4280b3e717ab96419714f013ad'},
 {'path':'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json','sha256':'59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf'},
]
_ORIGINAL_RAW=(ROOT/_MODELS[2]['path']).read_bytes()
assert _hash(_ORIGINAL_RAW)==_MODELS[2]['sha256']
_ORIGINALS=json.loads(_ORIGINAL_RAW)
_PY_MODEL='scripts/sass_ordinary_card_css.py'
_PY_MODEL_SHA='4715e34900f2302431cef0c55072be9f5bffce2b540591a316e4d71a0734fe1e'
ORDINARY_CARD_CONTRACT='historical-ordinary-card-with-positioned-public-tokens'
ORDINARY_CARD_GATE_CASES=ORDINARY_CARD_CASES
ORDINARY_CARD_DEFAULT_CASES=tuple(case for case in ORDINARY_CARD_CASES if case.startswith('mixin-css/'))
assert len(ORDINARY_CARD_GATE_CASES)==12 and len(ORDINARY_CARD_DEFAULT_CASES)==4
_CONTEXTS=weakref.WeakKeyDictionary()
_ROOT_CONTEXTS={}
def _plain(value):
    if value is None or type(value) in (str,bool,int):return value
    if type(value) is list:return [_plain(v) for v in value]
    assert type(value) is dict and all(type(k) is str for k in value)
    return {k:_plain(v) for k,v in value.items()}
def _measurement(value):
    return type(value) is dict and type(value.get('css')) is str and value.get('css_sha256')==_hash(value['css']) and type(value.get('css_bytes')) is int and value['css_bytes']==len(value['css'].encode())
def _sources(rows):
    if type(rows) is not list or not rows:return False
    try:
        for row in rows:
            assert type(row) is dict and type(row['root']) is int and row['root'] in (0,1,2)
            assert type(row['path']) is str and row['path'] and not row['path'].startswith('/') and '\\' not in row['path'] and '\0' not in row['path'] and all(p and p not in ('.','..') for p in row['path'].split('/'))
            assert type(row['sha256']) is str and re.fullmatch('[0-9a-f]{64}',row['sha256']) and type(row['bytes']) is int and row['bytes']>0
        return len({(r['root'],r['path']) for r in rows})==len(rows)
    except (AssertionError,KeyError,TypeError,ValueError):return False
def _physical(root,path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.','..') for part in path.split('/'))
    def regular(base,parts):
        cursor=base
        for part in parts:
            cursor=cursor/part
            assert not cursor.is_symlink()
        assert cursor.is_file()
        return cursor.read_bytes()
    peer=re.fullmatch(r'node_modules/(@angular/(?:core|material|cdk)|sass)/(.+)',path)
    if not peer:return regular(root,path.split('/'))
    container=root/'node_modules'
    assert not container.is_symlink() and container.is_dir()
    if peer[1].startswith('@angular/'):
        scope=container/'@angular'
        assert not scope.is_symlink() and scope.is_dir()
    base=(container/peer[1]).resolve(strict=True)
    assert base.is_dir()
    if peer[1]=='sass':assert peer[2] in ('package.json','sass.node.js','sass.dart.js')
    assert json.loads(regular(base,['package.json']))['name']==peer[1]
    return regular(base,peer[2].split('/'))

def _physical_boundary(root,provided_read):
    # Existing frozen guards authenticate retained first images against exact pins.
    # This closes supplied callbacks, not concurrent filesystem mutation.
    assert not root.is_symlink() and root.is_dir()
    retained={}
    def read(path):
        actual=_physical(root,path)
        if path in retained:assert actual==retained[path]
        else:retained[path]=actual
        if provided_read is not None:
            provided=provided_read(path)
            assert type(provided) is bytes and actual==provided
        assert _physical(root,path)==actual,'physical input changed during supplied read'
        return actual
    def assert_physical():
        for path,before in retained.items():assert _physical(root,path)==before,'changed final physical input'
    return read,assert_physical,lambda:[dict(path=p,sha256=_hash(b),bytes=len(b)) for p,b in retained.items()]

def _tool(root,path,read):return read(path)


def _plan(case,oracle,catalog):
    assert case in ORDINARY_CARD_GATE_CASES
    default=case.startswith('mixin-css/');mixin=case.split('/')[1]
    if default:
        required=[p for p in oracle['members']['mixins'][mixin]['params'] if p['default'] is None]
        assert all(p['name'] in ('theme','config','config-or-theme','theme-or-color-config') for p in required)
        row=dict(mixin=mixin,variant='default',call='.sass-api-probe { @include m.'+mixin+'('+', '.join('$__theme' for p in required)+'); }')
    else:row=dict(next(r for r in catalog['cases'] if r['case_id']==case))
    assert row['call']==next(r for r in _ORIGINALS['cases'] if r['case_id']==case)['call']
    return dict(row,program_sha256=_hash("@use '__entry__' as m;\n"+(oracle['standard_theme'] if default else catalog['setup'])+'\n'+row['call']+'\n'))

class OrdinaryCardGateContext:
    def __init__(self,root=ROOT,*,read=None):
        root=Path(root).absolute();read,assert_physical,bound=_physical_boundary(root,read)
        source=CurrentSassSource(root,read=read);line=source.line;branch=_PACKET['branches'][line]
        def member(ref):
            raw=read(ref['path']);assert _hash(raw)==ref['sha256']
            if 'bytes' in ref:assert len(raw)==ref['bytes']
            return raw
        assert read(SELF)==_IMAGE
        for ref in _MODELS:member(ref)
        member(dict(path=INPUTS,sha256=_hash(_RAW),bytes=len(_RAW)));member(dict(path=_PY_MODEL,sha256=_PY_MODEL_SHA))
        for key in ('oracle','catalog','provenance','reference_lock'):member(_PACKET[key])
        for ref in _PACKET['compiler_inputs']:member(ref)
        oracle=json.loads(read(_PACKET['oracle']['path']));catalog=json.loads(read(_PACKET['catalog']['path']));provenance=json.loads(read(_PACKET['provenance']['path']));lock=json.loads(read(_PACKET['reference_lock']['path']))
        assert branch['compiler']==provenance['sass_info']
        sd=_plain(source.descriptor)
        assert sd['source_subject']['path']=='scripts/current-sass-source.mjs' and sd['source_packet']['path']=='compatibility/rc/current-sass-source-inputs-v2.json'
        member(sd['source_subject']);member(sd['source_packet'])
        modules=sd['source_modules'];focus_path='projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss';assert len(modules)==len({r['path'] for r in modules})==(7 if line=='main' else 6)
        assert sorted(r['path'] for r in modules)==sorted([*('projects/ngx-material-legacy/styles/'+f+'/_'+f+'-theme.scss' for f in ('progress-spinner','snack-bar','checkbox','button','card')),'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss',*([focus_path] if line=='main' else [])])
        if line=='main':
            fp=json.loads(read('compatibility/rc/current-main-strong-focus-source-v1.json'));assert next(r for r in modules if r['path']==focus_path)==fp['after']
        assert next(r for r in modules if r['path'].endswith('/card/_card-theme.scss'))==dict(path='projects/ngx-material-legacy/styles/card/_card-theme.scss',sha256='dc5e055d95aabf5c8a8ae4ba70acee8a9a1315e6f46715e8846c932f79d51fbf',bytes=5349)
        current_by_path={r['path']:r for r in modules};sets=_plain(source.source_sets);successors=_plain(source.source_set_successors)
        assert len(sets)==len(successors)==1
        for historical_sha256,rows in branch['source_sets'].items():
            assert _hash(json.dumps(rows,separators=(',',':')))==historical_sha256
            expected=[]
            for row in rows:
                current=current_by_path.get('projects/ngx-material-legacy/'+row['path']) if row['root']==0 else None
                expected.append(dict(row,sha256=current['sha256'],bytes=current['bytes']) if current else dict(row))
            current_sha256=_hash(json.dumps(expected,separators=(',',':')))
            assert successors==[dict(historical_sha256=historical_sha256,current_sha256=current_sha256)] and sets[current_sha256]==expected
        current_sources=_plain(next(iter(sets.values())))
        assert _sources(current_sources) and len(current_sources)==(471 if line=='21.x' else 472)
        for ref in modules:member(ref)
        plans={case:_plan(case,oracle,catalog) for case in ORDINARY_CARD_GATE_CASES}
        descriptor=dict(contract=ORDINARY_CARD_CONTRACT,source=sd,case_ids=list(ORDINARY_CARD_GATE_CASES),models=_plain(_MODELS))
        def assert_current():
            source.assert_current();assert read(SELF)==_IMAGE
            for ref in _MODELS:member(ref)
            member(dict(path=_PY_MODEL,sha256=_PY_MODEL_SHA));source.assert_current();assert_physical()
        _CONTEXTS[self]=dict(root=root,line=line,source=source,branch=branch,oracle=oracle,catalog=catalog,provenance=provenance,lock=lock,plans=plans,descriptor=_plain(descriptor),current_sources=current_sources,assert_current=assert_current,assert_physical=assert_physical,bound=bound)
        assert_current();assert_physical()
    @property
    def line(self):return _CONTEXTS[self]['line']
    @property
    def bound(self):return _CONTEXTS[self]['bound']()
    def assert_current(self):_CONTEXTS[self]['assert_current']()

def _context(root):
    root=Path(root).absolute()
    if root not in _ROOT_CONTEXTS:_ROOT_CONTEXTS[root]=OrdinaryCardGateContext(root)
    context=_ROOT_CONTEXTS[root];context.assert_current();return context

def ordinary_card_gate_descriptor(context):
    assert type(context) is OrdinaryCardGateContext and context in _CONTEXTS
    s=_CONTEXTS[context];s['assert_current']();result=_plain(s['descriptor']);s['assert_physical']();return result

def _current(s,case,m):
    return (case in s['plans'] and _measurement(m) and m.get('program_sha256')==s['plans'][case]['program_sha256']
        and ('line' not in m or m['line']==s['line']) and ('sass_version' not in m or m['sass_version']==s['branch']['compiler'])
        and _sources(m.get('sources')) and sorted(m['sources'],key=lambda r:(r['root'],r['path']))==s['current_sources'])
def _original(s,case,m):
    return (case in s['plans'] and _measurement(m) and m.get('program_sha256')==s['plans'][case]['program_sha256'] and _sources(m.get('sources'))
        and sorted(m['sources'],key=lambda r:(r['root'],r['path']))==_ORIGINALS['all_original_loaded_sources'])
def _identity(s,case):
    default=case.startswith('mixin-css/')
    return dict(material_version='16.2.14',material_manifest_sha256=s['provenance']['isolated_environment']['material_manifest_sha256'],lock_sha256=_PACKET['reference_lock']['sha256'],material_integrity=s['lock']['packages']['node_modules/@angular/material']['integrity'],catalog=_PACKET['oracle' if default else 'catalog']['path'],catalog_sha256=_PACKET['oracle' if default else 'catalog']['sha256'],expected_source='untouched-installed-material16',candidate_source='packed-facade',sass_version=s['branch']['compiler'])
def _direct(s,case,original,actual,identity,descriptor):
    return (case in ORDINARY_CARD_GATE_CASES and _current(s,case,actual) and _original(s,case,original) and identity==_identity(s,case) and descriptor==s['descriptor']
        and ordinary_card_results_match(dict(caseId=case,original=original,actual=actual)))

def ordinary_card_gate_assertion_ok(root,active,body,invocation,*,context=None):
    """Validate a finite card CSS relationship inside the original packed envelope."""
    try:
        context=_context(root) if context is None else context
        assert type(context) is OrdinaryCardGateContext and context in _CONTEXTS
        s=_CONTEXTS[context];assert s['root']==Path(root).absolute()
        live=lambda:_plain(dict(body=body,active=dict(manifest=active.manifest,binding=active.binding),invocation=invocation))
        snapshot=live();b=snapshot['body'];a=snapshot['active'];case=b['case_id']
        assert case in ORDINARY_CARD_GATE_CASES
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=s['line'],run_id=a['manifest']['run_id'],invocation_id=snapshot['invocation'],binding=a['binding'],error=None,mutation_rejected=True,comparison=ORDINARY_CARD_CONTRACT)
        assert all(type(b.get(k)) is type(v) and b.get(k)==v for k,v in fields.items())
        assert not any(k in b for k in ('current_companion','current_spinner_snack_bridge','current_infrastructure','current_peer_alias','current_ordinary_controls'))
        assert a['binding']['source_line']==s['line'] and a['manifest']['source']['line']==s['line'] and a['binding']['run_id']==a['manifest']['run_id']
        assert type(a['manifest']['run_id']) is str and a['manifest']['run_id'] and type(snapshot['invocation']) is str and snapshot['invocation']
        for key,name in [('source_commit','commit'),('source_tree','git_tree_sha'),('source_content_sha256','content_sha256')]:
            assert a['binding'][key]==a['manifest']['source'][name] and re.fullmatch('[0-9a-f]{64}' if key=='source_content_sha256' else '[0-9a-f]{40}',a['binding'][key])
        assert a['binding']['artifacts_sha256']==_hash(json.dumps(a['manifest']['artifacts'],sort_keys=True,separators=(',',':'),allow_nan=False))
        libraries=[r for r in a['manifest']['artifacts'] if r['id']=='library']
        assert len(libraries)==1 and re.fullmatch('[0-9a-f]{64}',libraries[0]['sha256']) and b['tarball_sha256']==libraries[0]['sha256']
        assert _direct(s,case,b['expected'],b['actual'],b['identity'],b['current_ordinary_card'])
        probe=s['plans'][case];assert all(b.get(k)==probe[k] for k in ('mixin','variant','call'))
        if case in ORDINARY_CARD_DEFAULT_CASES:
            inv=s['oracle']['members']['mixins'][probe['mixin']]['invocation']
            assert b['oracle']==_PACKET['oracle']['path'] and b['oracle_sha256']==_PACKET['oracle']['sha256']
            assert b['expected_sha256']==b['expected']['css_sha256']==inv['css_sha256'] and type(b['expected_bytes']) is int and b['expected_bytes']==b['expected']['css_bytes']==inv['css_bytes']
            assert b['actual_sha256']==b['actual']['css_sha256'] and type(b['actual_bytes']) is int and b['actual_bytes']==b['actual']['css_bytes'] and b['actual_measurement']==b['actual']
        else:
            catalog_probe=next(r for r in s['catalog']['cases'] if r['case_id']==case)
            assert all(b.get(k)==v for k,v in catalog_probe.items())
        wrong=b['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n'
        assert b['mutation']==dict(css=wrong,css_sha256=_hash(wrong),css_bytes=len(wrong.encode()))
        s['assert_current']();assert live()==snapshot,'live card payload changed during source guards';s['assert_physical']();return True
    except (AssertionError,KeyError,TypeError,ValueError,OSError,AttributeError,StopIteration,RecursionError):return False
