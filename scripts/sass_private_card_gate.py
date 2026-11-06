# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One private-card CSS comparison with historical and current source binding."""
import hashlib,json,re,weakref
from pathlib import Path
from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from private_card_composition import create_private_card_context,private_card_composition_matches
_ROOT=Path(__file__).resolve().parents[1];_IMAGE=Path(__file__).read_bytes();_CONTEXTS=weakref.WeakKeyDictionary()
_CASE='mixin-css/private-check-duplicate-theme-styles';_CONTRACT='historical-private-card-with-public-peer-overrides';_PROGRAM='f74770ded45c82a9caa9ae8b630ffb39aafa7a6bd1b2050004ba5e46a4776c7d';_ORIGINAL='b4e40842f13244e578d93b26919c69f5668e24a0736a46742c1d79cc747fe9ca'
_PINS={'scripts/current_sass_spinner_snack_admission.py':'4802bf8827a5ec45569efd5b5d010ab934f72d63ff371fa097fd358892d99d85','scripts/current_sass_source.py':'2a8672f63c9639b6e600240db25a7148573f778caaae69a768fd27eb6b435ab3','scripts/sass-private-card-gate.mjs':'70147741275a79915ac2300954b8c4d183a325c988145153e8ef5c07de78e8da','scripts/private-card-composition.mjs':'063187919adc60972ad216c70e57f109184c6433b26318d03bcee022704f1698','scripts/private-card-peer-check.mjs':'7f85cf94963c240325393367786faae1984a822000aa48935b77270c50b11bca','scripts/private_card_composition.py':'7adf1a44d80a49b2a61d197fd449e0218db1c391d7f6d8c9f44ce8e34b6eb810','fixtures/sass/private-card-peer-pins.json':'975904b6287c0be803cff023d58603fcc2a565be4515545718e60e604a6ea69c','fixtures/sass/private-card-peer.scss':'28bcb7a6c8c582ad187d46f9705ba6898aede018555f6088df6481487fad7ca5','compatibility/rc/original16-sass-source-diagnostic-identity.json':'324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe','compatibility/rc/oracles/material-16.2.14-sass-api.json':'76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d','compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json':'8613cc1432b2ae351e655a59b3e39b2c48d80da12c875b5233f4fac2192d657a','reference/material-16.2.14/PROVENANCE.json':'d13d466669cbf96d386ceabfe3de0241b91bcbd3dce98ac70c31093609100f34','reference/material-16.2.14/environment-package-lock.json':'ad2f9d62bf04758f87650cae408f805e667236f992cd6d8e481c5577c939d130'}
_hash=lambda x:hashlib.sha256(x.encode() if type(x) is str else x).hexdigest()
def _plain(x):
    if x is None or type(x) in (str,bool):return x
    if type(x) is int and abs(x)<=9007199254740991:return x
    if type(x) is list:return [_plain(v) for v in x]
    if type(x) is dict and all(type(k) is str for k in x):return {k:_plain(v) for k,v in x.items()}
    raise ValueError('nonplain metadata')
def _read(root,path):
    if type(path) is not str or not path or path.startswith('/') or '\\' in path or any(x in ('','.','..') for x in path.split('/')):raise ValueError('path')
    p=root
    for bit in path.split('/'):
        p=p/bit
        if p.is_symlink():raise ValueError('linked input')
    if not p.is_file():raise ValueError('not file')
    return p.read_bytes()
class PrivateCardGateContext:
    __slots__=('__weakref__',)
    def __init__(self,root):
        if not __debug__:raise RuntimeError('optimized mode cannot authenticate source')
        root=Path(root).absolute();source=CurrentSpinnerSnackContract(root);line=source.line;sets=list(source.source_sets.values())
        if len(sets)!=1:raise ValueError('source closure')
        historical=json.loads(_read(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'));orig=list(historical['loaded_source_sets'].values())
        if len(orig)!=1 or len(orig[0])!=286:raise ValueError('original closure')
        oracle=json.loads(_read(root,'compatibility/rc/oracles/material-16.2.14-sass-api.json'));cases=json.loads(_read(root,'compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json'));call=cases['mixins']['private-check-duplicate-theme-styles']['call'];program="@use '__entry__' as m;\n"+oracle['standard_theme']+'\n'+call+'\n'
        if _hash(program)!=_PROGRAM or oracle['members']['mixins']['private-check-duplicate-theme-styles']['invocation']['css_sha256']!=_ORIGINAL:raise ValueError('plan')
        prov=json.loads(_read(root,'reference/material-16.2.14/PROVENANCE.json'))['isolated_environment'];lock=json.loads(_read(root,'reference/material-16.2.14/environment-package-lock.json'));pins=json.loads(_read(root,'fixtures/sass/private-card-peer-pins.json'));branch=pins['branches']['21' if line=='21.x' else 'main'];info=branch['sass_info'];identity=dict(material_version='16.2.14',material_manifest_sha256=prov['material_manifest_sha256'],lock_sha256=prov['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog='compatibility/rc/oracles/material-16.2.14-sass-api.json',catalog_sha256=_PINS['compatibility/rc/oracles/material-16.2.14-sass-api.json'],sass_version=info,expected_source='untouched-installed-material16',candidate_source='packed-facade')
        _CONTEXTS[self]=dict(root=root,source=source,line=line,sources=_plain(sets[0]),original_sources=_plain(orig[0]),descriptor=_plain(dict(contract=_CONTRACT,source=source.descriptor)),identity=identity,call=call,info=info,peer=None)
        self.assert_current();_CONTEXTS[self]['peer']=create_private_card_context(str(root),line);self.assert_current()
    def assert_current(self):
        if not __debug__:raise RuntimeError('optimized mode cannot authenticate source')
        s=_CONTEXTS[self];s['source'].assert_current()
        if Path(__file__).read_bytes()!=_IMAGE:raise ValueError('gate changed')
        for path,digest in _PINS.items():
            if _hash(_read(s['root'],path))!=digest:raise ValueError('proof input changed')
        s['source'].assert_current()
def private_card_gate_match(context,body):
    if not __debug__ or type(context) is not PrivateCardGateContext or context not in _CONTEXTS:return False
    try:
        s=_CONTEXTS[context];b=_plain(body);e=b['expected'];a=b['actual'];d=b['current_private_card']
        if (set(e)!={'css','css_bytes','css_sha256','program_sha256','sources'} or set(a)!={'css','css_bytes','css_sha256','line','program_sha256','sass_version','sources'} or b['case_id']!=_CASE or b['line']!=s['line'] or b['identity']!=s['identity'] or d!=s['descriptor'] or e['program_sha256']!=_PROGRAM or e['css_sha256']!=_ORIGINAL or _hash(e['css'])!=_ORIGINAL or e['css_bytes']!=989 or e['sources']!=s['original_sources'] or a['line']!=s['line'] or a['sass_version']!=s['info'] or a['program_sha256']!=_PROGRAM or a['css_sha256']!=_hash(a['css']) or type(a['css_bytes']) is not int or a['css_bytes']!=len(a['css'].encode()) or a['sources']!=s['sources']):return False
        if not private_card_composition_matches(s['peer'],s['line'],_CASE,e['css'],a['css']):return False
        context.assert_current();return _plain(body)==b
    except (KeyError,TypeError,ValueError,AttributeError,AssertionError,OSError,RecursionError):return False
def private_card_assertion_ok(root,active,body,invocation):
    if not __debug__:return False
    try:
        context=PrivateCardGateContext(root);s=_CONTEXTS[context];b=_plain(body);a=_plain(dict(manifest=active.manifest,binding=active.binding));line=s['line'];binding=a['binding'];manifest=a['manifest']
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=line,run_id=manifest['run_id'],invocation_id=invocation,binding=binding,error=None,mutation_rejected=True,comparison=_CONTRACT)
        if any(type(b.get(k)) is not type(v) or b.get(k)!=v for k,v in fields.items()):return False
        if any(k in b for k in ('current_companion','current_infrastructure','current_spinner_snack_bridge','current_ordinary_card','current_ordinary_controls','current_ordinary_density','current_peer_alias')):return False
        if binding['source_line']!=line or manifest['source']['line']!=line or binding['run_id']!=manifest['run_id'] or type(invocation) is not str or not invocation:return False
        for key,name in [('source_commit','commit'),('source_tree','git_tree_sha'),('source_content_sha256','content_sha256')]:
            if binding[key]!=manifest['source'][name] or not re.fullmatch('[0-9a-f]{64}' if key=='source_content_sha256' else '[0-9a-f]{40}',binding[key]):return False
        if binding['artifacts_sha256']!=_hash(json.dumps(manifest['artifacts'],sort_keys=True,separators=(',',':'),allow_nan=False)):return False
        libs=[x for x in manifest['artifacts'] if x['id']=='library']
        if len(libs)!=1 or not re.fullmatch('[0-9a-f]{64}',libs[0]['sha256']) or b['tarball_sha256']!=libs[0]['sha256']:return False
        if b['oracle']!='compatibility/rc/oracles/material-16.2.14-sass-api.json' or b['oracle_sha256']!=_PINS[b['oracle']] or b['mixin']!='private-check-duplicate-theme-styles' or b['variant']!='historical-duplicate-theme' or b['call']!=s['call']:return False
        if b['expected_sha256']!=b['expected']['css_sha256'] or b['expected_bytes']!=b['expected']['css_bytes'] or b['actual_sha256']!=b['actual']['css_sha256'] or b['actual_bytes']!=b['actual']['css_bytes'] or b['actual_measurement']!=b['actual']:return False
        wrong=b['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n'
        if b['mutation']!=dict(css=wrong,css_sha256=_hash(wrong),css_bytes=len(wrong.encode())):return False
        return private_card_gate_match(context,b) and _plain(body)==b
    except (KeyError,TypeError,ValueError,AttributeError,AssertionError,OSError,RecursionError):return False
