# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite current source/metadata composition after unchanged historical models."""
import hashlib
import json
from pathlib import Path
import re
import weakref
from select_program_transition_source import select_program_transitions
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from sass_ordinary_control_css import (ORDINARY_CHECKBOX_BUTTON_CASES, LEGACY_DATEPICKER_BUTTON_CASES,
    ordinary_checkbox_button_expected_css, legacy_datepicker_button_expected_css)
from sass_default_aggregate_admission import (DEFAULT_AGGREGATE_CASES, DEFAULT_AGGREGATE_CONTRACT, default_aggregate_expected_css)
from sass_aggregate_color_theme_admission import aggregate_color_theme_expected_css
from sass_aggregate_typography_admission import aggregate_typography_expected_css
from sass_aggregate_density_admission import aggregate_density_expected_css
from sass_ripple_color_admission import RIPPLE_COLOR_BINDING_CASES, RIPPLE_COLOR_OWNED_CASES, RIPPLE_COLOR_CONTRACT, ripple_color_expected_css, ripple_color_measurement_ok

ROOT=Path(__file__).resolve().parents[1]
SELF='scripts/sass_ordinary_control_gate.py'
INPUTS='compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'
_IMAGE=(ROOT/SELF).read_bytes()
_RAW=(ROOT/INPUTS).read_bytes()
def _hash(raw):
    return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()
assert _hash(_RAW)=='fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'
_PACKET=json.loads(_RAW)
_OWNED_PATH='fixtures/sass/owned-aggregate-contracts.json'
_OWNED_RAW=(ROOT/_OWNED_PATH).read_bytes()
assert _hash(_OWNED_RAW)=='b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a'
_OWNED=json.loads(_OWNED_RAW)
assert len(_OWNED['cases'])==20
ORDINARY_CONTROL_CONTRACT='historical-ordinary-controls-with-positioned-public-tokens'
ORDINARY_CONTROL_GATE_CASES=tuple(ORDINARY_CHECKBOX_BUTTON_CASES)+tuple(LEGACY_DATEPICKER_BUTTON_CASES)
ORDINARY_CONTROL_DEFAULT_CASES=tuple(case for case in ORDINARY_CONTROL_GATE_CASES if case.startswith('mixin-css/'))
assert len(ORDINARY_CONTROL_GATE_CASES)==65 and len(ORDINARY_CONTROL_DEFAULT_CASES)==15
_CONTEXTS=weakref.WeakKeyDictionary()
_ROOT_CONTEXTS={}
_DEPENDENCIES={
 'reference/material-16.2.14/owned-aggregate-membership.scss':'bcc15a0593fe733501d6d1c002dc706c79fe1ba66d7d26dd072d69681ebfe63f',
 'fixtures/sass/owned-aggregate-contracts.json':'b83f5ee9e898004e2fce2ae49719dbed923dd2b5eabf06f3f463a8ad33f24c7a',
 'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs':'f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0',
 'compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs':'2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692',
 'compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json':'8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d',
 'compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json':'3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43',
 'scripts/current_sass_spinner_snack_admission.py':'1af5a8902551ceddaf6d773d6b0abef10e2733ffa85ec5472bae0f6a9feb6c5b',
 'scripts/sass_ordinary_control_css.py':'fd6e306d13fc5a1abb054065ee0e7e9208b5fe49e89d586d6733eaba18afb559',
 'scripts/sass_default_aggregate_admission.py':'55c4e90b3d807fbd80e811f6832e65f31e1d7bad1c93544dfbd05fabc99a2cd9',
 'scripts/sass_aggregate_color_theme_admission.py':'6c3333c914e4b254a7829d13a47a17a4fa6b1950d2ed00adba5f7afe43cc73df',
 'scripts/sass_aggregate_typography_admission.py':'7444bd20c8dc5afd15630a9690ffd3dc6fa7c2ab2a32e0d446e1468e157bb67d',
 'scripts/sass_aggregate_density_admission.py':'ae7d5fdc19ee9bdfbb1ddeb0d3acbfbae31a2cf61e8108bb172232498d5c1562',
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

def _plan(case,oracle,catalog):
    assert case in ORDINARY_CONTROL_GATE_CASES
    if case.startswith('owned-aggregate/'):
        row=next(p for p in _OWNED['cases'] if p['case_id']==case)
        return dict(row,program_sha256=_hash("@use '__entry__' as m;\n"+_OWNED['setup']+'\n'+row['call']+'\n'),reference_program_sha256=_hash("@use '__entry__' as m;\n"+_OWNED['setup']+'\n'+row['reference_call']+'\n'))
    default=case.startswith('mixin-css/');mixin=case.split('/')[1]
    if default:
        required=[p for p in oracle['members']['mixins'][mixin]['params'] if p['default'] is None]
        assert all(p['name'] in ('theme','config','config-or-theme','theme-or-color-config') for p in required)
        row=dict(mixin=mixin,variant='default',call='.sass-api-probe { @include m.'+mixin+'('+', '.join('$__theme' for p in required)+'); }')
    else:row=next(p for p in catalog['cases'] if p['case_id']==case)
    return dict(row,program_sha256=_hash("@use '__entry__' as m;\n"+(oracle['standard_theme'] if default else catalog['setup'])+'\n'+row['call']+'\n'))

class OrdinaryControlGateContext:
    __slots__=('__weakref__',)
    def __init__(self,root=ROOT,*,read=None):
        root=Path(root).absolute()
        read,assert_physical=_physical_boundary(root,read)
        source=CurrentSpinnerSnackContract(root,read=read)
        line=source.line
        if line=='main':assert _hash(read('scripts/select_program_transition_source.py'))=='a34b878e5ba2f15e5da293c7db48d019032b47192a82147648d0b1f5fc52ea59'
        successor,successor_current=select_program_transitions(root,line,read)
        branch=_PACKET['branches'][line]
        oracle=json.loads((root/_PACKET['oracle']['path']).read_bytes())
        catalog=json.loads((root/_PACKET['catalog']['path']).read_bytes())
        provenance=json.loads((root/_PACKET['provenance']['path']).read_bytes())
        lock=json.loads((root/_PACKET['reference_lock']['path']).read_bytes())
        def assert_current():
            source.assert_current()
            successor_current()
            assert _tool(root,SELF,read)==_IMAGE
            for path,sha in _DEPENDENCIES.items():assert _hash(_tool(root,path,read))==successor.get(path,sha)
            source.assert_current()
            assert_physical()
        sets=list(source.source_sets.values())
        assert len(sets)==1
        plans={case:_plan(case,oracle,catalog) for case in ORDINARY_CONTROL_GATE_CASES}
        descriptor=dict(contract=ORDINARY_CONTROL_CONTRACT,source=source.descriptor,case_ids=list(ORDINARY_CONTROL_GATE_CASES),models=[{'path': 'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs', 'sha256': 'f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0'}, {'path': 'compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs', 'sha256': '2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692'}, {'path': 'compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json', 'sha256': '8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d'}, {'path': 'compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json', 'sha256': '3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43'}])
        _CONTEXTS[self]=dict(root=root,source=source,line=line,branch=branch,oracle=oracle,catalog=catalog,provenance=provenance,lock=lock,descriptor=_plain(descriptor),current_sources=_plain(sets[0]),plans=plans,assert_current=assert_current,assert_physical=assert_physical)
        assert_current()
        assert_physical()
    @property
    def line(self):return _CONTEXTS[self]['line']
    def assert_current(self):_CONTEXTS[self]['assert_current']()

def _context(root):
    root=Path(root).absolute()
    if root not in _ROOT_CONTEXTS:_ROOT_CONTEXTS[root]=OrdinaryControlGateContext(root)
    context=_ROOT_CONTEXTS[root]
    context.assert_current()
    return context
def ordinary_control_gate_descriptor(context):
    assert type(context) is OrdinaryControlGateContext and context in _CONTEXTS
    context.assert_current()
    descriptor=_plain(_CONTEXTS[context]['descriptor'])
    _CONTEXTS[context]['assert_physical']()
    return descriptor
def _current(s,case,m):
    return (case in s['plans'] and _measurement(m) and m.get('program_sha256')==s['plans'][case]['program_sha256']
      and ('line' not in m or m['line']==s['line']) and ('sass_version' not in m or m['sass_version']==s['branch']['compiler'])
      and _sources(m.get('sources')) and sorted(m['sources'],key=lambda r:(r['root'],r['path']))==s['current_sources'])
def _original(s,case,m):
    return (_measurement(m) and m.get('program_sha256')==s['plans'][case].get('reference_program_sha256',s['plans'][case]['program_sha256']) and _sources(m.get('sources'))
      and all(r['root']==0 for r in m['sources']) and dict(root=0,**s['catalog']['original_entry_identity']) in m['sources'])
def _identity(s,case):
    default=case.startswith('mixin-css/')
    return dict(material_version='16.2.14',material_manifest_sha256=s['provenance']['isolated_environment']['material_manifest_sha256'],lock_sha256=_PACKET['reference_lock']['sha256'],material_integrity=s['lock']['packages']['node_modules/@angular/material']['integrity'],catalog=_OWNED_PATH if case.startswith('owned-aggregate/') else _PACKET['oracle' if default else 'catalog']['path'],catalog_sha256=_hash(_OWNED_RAW) if case.startswith('owned-aggregate/') else _PACKET['oracle' if default else 'catalog']['sha256'],expected_source='untouched-installed-material16',candidate_source='packed-facade',sass_version=s['branch']['compiler'])
def _prior(s,b):
    case=b['case_id'];c=b.get('current_companion');before=b['expected']['css']
    if case.startswith('owned-aggregate/'):
        if case in RIPPLE_COLOR_OWNED_CASES:
            if not c or c['classification']!='conforming-current-companion' or c['contract']!=RIPPLE_COLOR_CONTRACT or c['peer']['line']!=s['line'] or not ripple_color_measurement_ok(case,b['actual'],s['line']):return None
            before=ripple_color_expected_css(case,b['expected'],c['peer'])
        elif c is not None:return None
        return None if before is None else legacy_datepicker_button_expected_css(dict(caseId=case,originalCss=before))
    if case in ORDINARY_CHECKBOX_BUTTON_CASES:
        if c is not None:return None
        return ordinary_checkbox_button_expected_css(dict(caseId=case,originalCss=before))
    if '/all-legacy-component-' in case or '/private-all-legacy-component-' in case:
        if not c or c['classification']!='conforming-current-companion':return None
        if case.startswith('mixin-css/'):
            if c['contract']!=DEFAULT_AGGREGATE_CONTRACT or c['peer']['line']!=s['line'] or b['actual'].get('line')!=s['line'] or b['actual'].get('sass_version')!=s['branch']['compiler']:return None
            before=default_aggregate_expected_css(case,c['peer'],s['line'])
        elif 'typographies' in case:
            if c['contract']!='historical-typography-aggregate-with-qualified-members' or c['peer']['line']!=s['line']:return None
            before=aggregate_typography_expected_css(dict(b,comparison='current-companion-contract'))
        elif 'densities' in case:
            if c['contract']!='historical-density-aggregate-with-qualified-tail':return None
            before=aggregate_density_expected_css(dict(b,comparison='current-companion-contract'))
        else:
            if c['contract']!='historical-color-theme-aggregate-with-qualified-members' or c['peer']['line']!=s['line']:return None
            before=aggregate_color_theme_expected_css(dict(b,comparison='current-companion-contract'))
        actual=b['actual']
        if case in RIPPLE_COLOR_BINDING_CASES and not ripple_color_measurement_ok(case,actual,s['line']):return None
        if case=='mixin-css/private-all-legacy-component-densities':
            e=DEFAULT_AGGREGATE_CASES[case]
            if not any(r['root']==0 and r['path']==e['source_path'] for r in actual['sources']):return None
    elif c is not None:return None
    if '/private-all-legacy-component-densities/' in case or case=='mixin-css/private-all-legacy-component-densities':return before
    return None if before is None else legacy_datepicker_button_expected_css(dict(caseId=case,originalCss=before))

def ordinary_control_gate_assertion_ok(root,active,body,invocation,*,context=None):
    """Finite current CSS inside an independently validated active packed envelope."""
    try:
        context=_context(root) if context is None else context
        assert type(context) is OrdinaryControlGateContext and context in _CONTEXTS
        s=_CONTEXTS[context];assert s['root']==Path(root).absolute()
        live=lambda:_plain(dict(body=body,active=dict(manifest=active.manifest,binding=active.binding),invocation=invocation))
        snapshot=live();b=snapshot['body'];a=snapshot['active'];case=b['case_id']
        assert case in ORDINARY_CONTROL_GATE_CASES
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=s['line'],run_id=a['manifest']['run_id'],invocation_id=snapshot['invocation'],binding=a['binding'],error=None,mutation_rejected=True,comparison=ORDINARY_CONTROL_CONTRACT)
        assert all(type(b.get(k)) is type(v) and b.get(k)==v for k,v in fields.items())
        assert not any(k in b for k in ('current_spinner_snack_bridge','current_infrastructure','current_peer_alias'))
        assert a['binding']['source_line']==s['line'] and a['manifest']['source']['line']==s['line'] and a['binding']['run_id']==a['manifest']['run_id']
        assert type(a['manifest']['run_id']) is str and a['manifest']['run_id'] and type(snapshot['invocation']) is str and snapshot['invocation']
        for key,name in [('source_commit','commit'),('source_tree','git_tree_sha'),('source_content_sha256','content_sha256')]:
            assert a['binding'][key]==a['manifest']['source'][name] and re.fullmatch('[0-9a-f]{64}' if key=='source_content_sha256' else '[0-9a-f]{40}',a['binding'][key])
        assert a['binding']['artifacts_sha256']==_hash(json.dumps(a['manifest']['artifacts'],sort_keys=True,separators=(',',':'),allow_nan=False))
        libraries=[p for p in a['manifest']['artifacts'] if p['id']=='library']
        assert len(libraries)==1 and re.fullmatch('[0-9a-f]{64}',libraries[0]['sha256']) and b['tarball_sha256']==libraries[0]['sha256']
        assert _current(s,case,b['actual']) and _original(s,case,b['expected']) and b['identity']==_identity(s,case) and b['current_ordinary_controls']==s['descriptor']
        probe=s['plans'][case]
        assert all(b.get(k)==probe[k] for k in (('dimension','variant','arguments','reference_call','call') if case.startswith('owned-aggregate/') else ('mixin','variant','call')))
        if case in ORDINARY_CONTROL_DEFAULT_CASES:
            inv=s['oracle']['members']['mixins'][probe['mixin']]['invocation']
            assert b['oracle']==_PACKET['oracle']['path'] and b['oracle_sha256']==_PACKET['oracle']['sha256']
            assert b['expected_sha256']==b['expected']['css_sha256']==inv['css_sha256'] and type(b['expected_bytes']) is int and b['expected_bytes']==b['expected']['css_bytes']==inv['css_bytes']
            assert b['actual_sha256']==b['actual']['css_sha256'] and type(b['actual_bytes']) is int and b['actual_bytes']==b['actual']['css_bytes'] and b['actual_measurement']==b['actual']
        else:
            catalog_probe=next(p for p in (_OWNED['cases'] if case.startswith('owned-aggregate/') else s['catalog']['cases']) if p['case_id']==case)
            assert all(b.get(k)==v for k,v in catalog_probe.items())
        wrong=b['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n'
        assert b['mutation']==dict(css=wrong,css_sha256=_hash(wrong),css_bytes=len(wrong.encode()))
        expected=_prior(s,b);ok=expected is not None and b['actual']['css']==expected
        if not ok:return False
        s['assert_current']()
        assert live()==snapshot,'live ordinary payload changed during source guards'
        s['assert_physical']()
        return ok
    except (AssertionError,KeyError,TypeError,ValueError,OSError,AttributeError,StopIteration,RecursionError):return False
