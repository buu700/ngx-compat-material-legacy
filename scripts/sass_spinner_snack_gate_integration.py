# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite current source/metadata composition after unchanged historical models."""
import hashlib
import json
from pathlib import Path
import re
import weakref
from sass_spinner_snack_bridge_admission import (SPINNER_SNACK_BRIDGE_CASES, SPINNER_SNACK_BRIDGE_CONTRACT)
from current_sass_spinner_snack_admission import (CurrentSpinnerSnackContract,
    current_spinner_snack_assertion_ok)
from sass_spinner_snack_aggregate_admission import (SPINNER_SNACK_AGGREGATE_CASES,
    insert_spinner_snack_into_aggregate_model)
from sass_ordinary_aggregate_admission import insert_ordinary_checkbox_button_into_aggregate_model
from current_sass_card_aggregate import insert_card_into_aggregate_model
from sass_default_aggregate_admission import (DEFAULT_AGGREGATE_CASES,
    DEFAULT_AGGREGATE_CONTRACT, default_aggregate_expected_css)
from sass_aggregate_color_theme_admission import aggregate_color_theme_expected_css
from sass_aggregate_typography_admission import aggregate_typography_expected_css
from sass_ripple_color_admission import RIPPLE_COLOR_BINDING_CASES, ripple_color_measurement_ok

ROOT=Path(__file__).resolve().parents[1]
SELF='scripts/sass_spinner_snack_gate_integration.py'
INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'
_IMAGE=(ROOT/SELF).read_bytes()
_RAW=(ROOT/INPUTS).read_bytes()
def _hash(raw):
    return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()
assert _hash(_RAW)=='fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'
_PACKET=json.loads(_RAW)
SPINNER_SNACK_GATE_CASES=tuple(SPINNER_SNACK_BRIDGE_CASES)+tuple(SPINNER_SNACK_AGGREGATE_CASES)
SPINNER_SNACK_DEFAULT_CASES=tuple(value for value in SPINNER_SNACK_BRIDGE_CASES if value.startswith('mixin-css/'))
_CONTEXTS=weakref.WeakKeyDictionary()
_ROOT_CONTEXTS={}
_DEPENDENCIES={
 'scripts/current_sass_spinner_snack_admission.py':'1af5a8902551ceddaf6d773d6b0abef10e2733ffa85ec5472bae0f6a9feb6c5b',
 'scripts/sass_spinner_snack_bridge_admission.py':'66a9ad634bede4e0eeef23ece0fe50d49d6fbf28d5bc619da0873d6ec8fae0f3',
 'scripts/sass_spinner_snack_aggregate_admission.py':'2d55dedfe1d1da672337389730e3c31882b8993e0fd40a375950b714a61b6cba',
 'scripts/current_sass_card_aggregate.py':'7088b5636766affcde42210908c9dec0902a91d80d253aebac4675f2e1150856',
 'scripts/sass_ordinary_aggregate_admission.py':'0f8451f8a6d398631a70edc810c2c19bd816bf43710eb0f1d83722a3e0f13447',
 'scripts/sass_ordinary_control_css.py':'fd6e306d13fc5a1abb054065ee0e7e9208b5fe49e89d586d6733eaba18afb559',
 'scripts/sass_default_aggregate_admission.py':'55c4e90b3d807fbd80e811f6832e65f31e1d7bad1c93544dfbd05fabc99a2cd9',
 'scripts/sass_aggregate_color_theme_admission.py':'6c3333c914e4b254a7829d13a47a17a4fa6b1950d2ed00adba5f7afe43cc73df',
 'scripts/sass_aggregate_typography_admission.py':'7444bd20c8dc5afd15630a9690ffd3dc6fa7c2ab2a32e0d446e1468e157bb67d',
 'scripts/sass_ripple_color_admission.py':'ebc51ebe80760eea25c0b5a8d1c9e93d3de88aaf5f5024d43dc29b8e9eaeb036',
}
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
    return read,assert_physical

def _tool(root,path,read):return read(path)

class SpinnerSnackGateContext:
    __slots__=('__weakref__',)
    def __init__(self,root=ROOT,*,read=None):
        root=Path(root).absolute()
        read,assert_physical=_physical_boundary(root,read)
        source=CurrentSpinnerSnackContract(root,read=read)
        line=source.line
        branch=_PACKET['branches'][line]
        oracle=json.loads((root/_PACKET['oracle']['path']).read_bytes())
        catalog=json.loads((root/_PACKET['catalog']['path']).read_bytes())
        provenance=json.loads((root/_PACKET['provenance']['path']).read_bytes())
        lock=json.loads((root/_PACKET['reference_lock']['path']).read_bytes())
        def assert_current():
            source.assert_current()
            assert _tool(root,SELF,read)==_IMAGE
            for path,sha in _DEPENDENCIES.items():assert _hash(_tool(root,path,read))==sha
            source.assert_current()
            assert_physical()
        sets=list(source.source_sets.values())
        assert len(sets)==1
        plans={r['case_id']:r for r in branch['cases']}
        for case in SPINNER_SNACK_AGGREGATE_CASES:
            default=case.startswith('mixin-css/')
            mixin=case[10:] if default else case.split('/')[1]
            probe={'call':'.sass-api-probe { @include m.'+mixin+'('+('' if mixin.endswith('typographies') else '$__theme')+'); }'} if default else next(p for p in catalog['cases'] if p['case_id']==case)
            plans[case]={**probe,'mixin':mixin,'program_sha256':_hash("@use '__entry__' as m;\n"+(oracle['standard_theme'] if default else catalog['setup'])+'\n'+probe['call']+'\n')}
        descriptor=source.descriptor
        _CONTEXTS[self]=dict(root=root,source=source,line=line,branch=branch,oracle=oracle,catalog=catalog,provenance=provenance,lock=lock,descriptor=_plain(descriptor),current_sources=_plain(sets[0]),plans=plans,assert_current=assert_current,assert_physical=assert_physical)
        assert_current()
        assert_physical()
    @property
    def line(self):return _CONTEXTS[self]['line']
    def assert_current(self):_CONTEXTS[self]['assert_current']()

def _context(root):
    root=Path(root).absolute()
    if root not in _ROOT_CONTEXTS:_ROOT_CONTEXTS[root]=SpinnerSnackGateContext(root)
    context=_ROOT_CONTEXTS[root]
    context.assert_current()
    return context
def spinner_snack_gate_descriptor(context):
    assert type(context) is SpinnerSnackGateContext and context in _CONTEXTS
    context.assert_current()
    descriptor=_plain(_CONTEXTS[context]['descriptor'])
    _CONTEXTS[context]['assert_physical']()
    return descriptor
def _current(s,case,m):
    return (case in s['plans'] and _measurement(m) and m.get('program_sha256')==s['plans'][case]['program_sha256']
      and ('line' not in m or m['line']==s['line']) and ('sass_version' not in m or m['sass_version']==s['branch']['compiler'])
      and _sources(m.get('sources')) and sorted(m['sources'],key=lambda r:(r['root'],r['path']))==s['current_sources'])
def _original(s,case,m):
    return (_measurement(m) and m.get('program_sha256')==s['plans'][case]['program_sha256'] and _sources(m.get('sources'))
      and all(r['root']==0 for r in m['sources']) and dict(root=0,**s['catalog']['original_entry_identity']) in m['sources'])
def _identity(s,case):
    default=case.startswith('mixin-css/')
    return dict(material_version='16.2.14',material_manifest_sha256=s['provenance']['isolated_environment']['material_manifest_sha256'],lock_sha256=_PACKET['reference_lock']['sha256'],material_integrity=s['lock']['packages']['node_modules/@angular/material']['integrity'],catalog=_PACKET['oracle' if default else 'catalog']['path'],catalog_sha256=_PACKET['oracle' if default else 'catalog']['sha256'],expected_source='untouched-installed-material16',candidate_source='packed-facade',sass_version=s['branch']['compiler'])
def _aggregate(s,body):
    case=body['case_id']
    if case not in SPINNER_SNACK_AGGREGATE_CASES:return False
    c=body['current_companion']
    if c['classification']!='conforming-current-companion' or c['peer']['line']!=s['line'] or 'current_infrastructure' in body or 'current_peer_alias' in body:return False
    default=case.startswith('mixin-css/')
    actual=body['actual_measurement'] if default else body['actual']
    if not _current(s,case,actual) or body['current_spinner_snack_bridge']!=s['descriptor']:return False
    if case in RIPPLE_COLOR_BINDING_CASES and not ripple_color_measurement_ok(case,actual,s['line']):return False
    if default:
        e=DEFAULT_AGGREGATE_CASES[case]
        if (body['comparison']!=DEFAULT_AGGREGATE_CONTRACT or c['contract']!=DEFAULT_AGGREGATE_CONTRACT
          or type(body['expected_bytes']) is not int or type(body['actual_bytes']) is not int
          or body['expected_sha256']!=e['original_sha256'] or body['expected_bytes']!=e['original_bytes']
          or body['actual_sha256']!=actual['css_sha256'] or body['actual_bytes']!=actual['css_bytes']
          or actual.get('line')!=s['line'] or actual.get('sass_version')!=s['branch']['compiler']):return False
        before=default_aggregate_expected_css(case,c['peer'],s['line'])
    else:
        probe=next(p for p in s['catalog']['cases'] if p['case_id']==case)
        if any(body.get(k)!=v for k,v in probe.items()) or body['comparison']!='current-companion-contract' or body['identity']!=_identity(s,case) or not _original(s,case,body['expected']):return False
        if case.find('all-component-typographies')>=0:
            if c['contract']!='historical-typography-aggregate-with-qualified-members':return False
            before=aggregate_typography_expected_css(body)
        else:
            if c['contract']!='historical-color-theme-aggregate-with-qualified-members':return False
            before=aggregate_color_theme_expected_css(body)
    if before is None:return False
    spinner_snack=insert_spinner_snack_into_aggregate_model(case_id=case,css=before)
    if spinner_snack is None:return False
    ordinary=insert_ordinary_checkbox_button_into_aggregate_model(case_id=case,css=spinner_snack)
    if ordinary is None:return False
    expected=insert_card_into_aggregate_model(case_id=case,css=ordinary)
    return expected is not None and actual['css']==expected

def spinner_snack_gate_assertion_ok(root,active,body,invocation,*,context=None):
    """Compose only inside the independently validated active packed gate envelope."""
    try:
        context=_context(root) if context is None else context
        assert type(context) is SpinnerSnackGateContext and context in _CONTEXTS
        s=_CONTEXTS[context]
        assert s['root']==Path(root).absolute()
        live=lambda:_plain(dict(body=body,active=dict(manifest=active.manifest,binding=active.binding),invocation=invocation))
        snapshot=live();b=snapshot['body'];a=snapshot['active'];case=b['case_id']
        assert case in SPINNER_SNACK_GATE_CASES
        s['assert_current']()
        if case in SPINNER_SNACK_BRIDGE_CASES:
            assert _current(s,case,b['actual'])
            if case in SPINNER_SNACK_DEFAULT_CASES:
                invocation_css=s['oracle']['members']['mixins'][case[10:]]['invocation']
                assert b['oracle']==_PACKET['oracle']['path'] and b['oracle_sha256']==_PACKET['oracle']['sha256']
                assert type(b['expected_bytes']) is int and b['expected_bytes']==invocation_css['css_bytes'] and b['expected_sha256']==invocation_css['css_sha256']
                assert type(b['actual_bytes']) is int and b['actual_bytes']==b['actual']['css_bytes'] and b['actual_sha256']==b['actual']['css_sha256'] and b['actual_measurement']==b['actual']
            else:
                probe=next(p for p in s['catalog']['cases'] if p['case_id']==case)
                assert all(b.get(k)==v for k,v in probe.items())
            ok=current_spinner_snack_assertion_ok(context=s['source'],body=b,active=a,invocation=snapshot['invocation'])
        else:
            fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=s['line'],run_id=a['manifest']['run_id'],invocation_id=snapshot['invocation'],binding=a['binding'],error=None)
            assert all(type(b.get(k)) is type(v) and b.get(k)==v for k,v in fields.items())
            assert a['binding']['source_line']==s['line'] and a['manifest']['source']['line']==s['line'] and a['binding']['run_id']==a['manifest']['run_id']
            assert type(a['manifest']['run_id']) is str and a['manifest']['run_id'] and type(snapshot['invocation']) is str and snapshot['invocation']
            for key,name in [('source_commit','commit'),('source_tree','git_tree_sha'),('source_content_sha256','content_sha256')]:
                assert a['binding'][key]==a['manifest']['source'][name] and re.fullmatch('[0-9a-f]{64}' if key=='source_content_sha256' else '[0-9a-f]{40}',a['binding'][key])
            assert a['binding']['artifacts_sha256']==_hash(json.dumps(a['manifest']['artifacts'],sort_keys=True,separators=(',',':'),allow_nan=False))
            libraries=[p for p in a['manifest']['artifacts'] if p['id']=='library']
            assert len(libraries)==1 and re.fullmatch('[0-9a-f]{64}',libraries[0]['sha256']) and b['tarball_sha256']==libraries[0]['sha256']
            default=case.startswith('mixin-css/')
            if default:
                assert b['oracle']==_PACKET['oracle']['path'] and b['oracle_sha256']==_PACKET['oracle']['sha256']
            else:
                assert b['mutation_rejected'] is True
                wrong=b['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n'
                assert b['mutation']==dict(css=wrong,css_sha256=_hash(wrong),css_bytes=len(wrong.encode()))
            ok=_aggregate(s,b)
        s['assert_current']()
        assert live()==snapshot,'live gate payload changed during source guards'
        s['assert_physical']()
        return ok
    except (AssertionError,KeyError,TypeError,ValueError,OSError,AttributeError,StopIteration):return False
