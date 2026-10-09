"""Finite historical ripple CSS and actual public override evidence;no candidate stripping."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_raw=(ROOT/'fixtures/sass/ripple-color-contracts.json').read_bytes()
_sha=lambda value:hashlib.sha256(value.encode() if isinstance(value,str) else value).hexdigest()
if _sha(_raw)!='8a925af4d5bb8c44be9fc16e60f0fa9c05db9f3dec8a614e093814852b8b0cab':raise ValueError('finite ripple color catalog changed')
_CATALOG=json.loads(_raw)
_NAMES=['ripple-color','ripple-theme','core-color','core-theme','legacy-core-color','legacy-core-theme','all-component-colors','all-component-themes','all-legacy-component-colors','all-legacy-component-themes']
_ARGS=json.loads((ROOT/'fixtures/sass/mixin-argument-contracts.json').read_bytes())
_OWNED=json.loads((ROOT/'fixtures/sass/owned-aggregate-contracts.json').read_bytes())
_IDS=[*['mixin-css/'+n for n in _NAMES],*[p['case_id'] for p in _ARGS['cases'] if p['mixin'] in _NAMES],*[p['case_id'] for p in _OWNED['cases'] if p['dimension'] in ('themes','colors')],'06-aggregate-and-companions','08-core-theme']
_CONTROLS=['mixin-css/legacy-core-color','mixin-argument/legacy-core-color/custom-full-theme','mixin-argument/legacy-core-color/raw-color-config']
if _CATALOG['schema_version']!=1 or len(_IDS)!=42 or set(_CATALOG['cases'])!=set(_IDS) or any(_sha((ROOT/i['path']).read_bytes())!=i['sha256'] for i in _CATALOG['inputs']):raise ValueError('ripple immutable recipe or exact roster changed')
RIPPLE_COLOR_CONTRACT='historical-ripple-colors-with-owned-public-binding'
RIPPLE_COLOR_CONTROL_CASES={i:_CATALOG['cases'][i] for i in _CONTROLS}
RIPPLE_COLOR_BINDING_CASES={i:_CATALOG['cases'][i] for i in _IDS if i not in _CONTROLS}
RIPPLE_COLOR_DEFAULT_CASES={i:e for i,e in RIPPLE_COLOR_BINDING_CASES.items() if e['kind']=='default' and not e['name'].startswith('all-')}
RIPPLE_COLOR_ARGUMENT_CASES={i:e for i,e in RIPPLE_COLOR_BINDING_CASES.items() if e['kind']=='argument' and not e['name'].startswith('all-')}
RIPPLE_COLOR_OWNED_CASES={i:e for i,e in RIPPLE_COLOR_BINDING_CASES.items() if e['kind']=='owned'}
RIPPLE_COLOR_ORDERED_CASES={'08-core-theme':RIPPLE_COLOR_BINDING_CASES['08-core-theme']}
_OWNED_PATHS=['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss']
_OWNED_SOURCES=[]
for path in _OWNED_PATHS:
    b=(ROOT/'projects/ngx-material-legacy'/path).read_bytes();_OWNED_SOURCES.append(dict(root=0,path=path,sha256=_sha(b),bytes=len(b)))

def _peer_members(case,peer,aggregate=False):
    try:
        e=RIPPLE_COLOR_BINDING_CASES[case];floor=e['peers'][peer['line']];sources=_CATALOG['peer_source_sets'][floor['source_set']]
        if aggregate:
            paths=['_index.scss','core/ripple/_ripple-theme.scss','core/ripple/_m3-ripple.scss','core/tokens/_token-utils.scss']
            required={p:(next(s for s in sources if s['root']==0 and s['path']==p)['sha256'],next(s for s in sources if s['root']==0 and s['path']==p)['bytes']) for p in paths}
            if not peer_measurement_ok(peer,peer['line'],peer['program_sha256'],required):return None
        elif (not peer_measurement_ok(peer,peer['line'],_sha(e['peer_program']),{}) or peer['program']!=e['peer_program'] or any(peer[k]!=floor[k] for k in ('css','css_sha256','css_bytes')) or len(peer['sources'])!=len(sources) or any(s not in peer['sources'] for s in sources)):
            return None
        return floor['member_css']
    except (KeyError,TypeError,ValueError,StopIteration):return None

def insert_ripple_color_in_expected_model(case,css,peer,*,aggregate=False):
    try:
        e=RIPPLE_COLOR_BINDING_CASES[case];members=_peer_members(case,peer,aggregate)
        if members is None or not isinstance(css,str) or len(members)!=len(e['slots']):return None
        counts={s['anchor']:sum(v['anchor']==s['anchor'] for v in e['slots']) for s in e['slots']}
        if any(css.count(anchor)!=count for anchor,count in counts.items()):return None
        cursor=0;result=''
        for slot in e['slots']:
            at=css.find(slot['anchor'],cursor)
            if at<cursor:return None
            end=at+len(slot['anchor']);addition=slot['separator']+members[slot['index']]
            if css[end:].startswith(addition):return None
            result+=css[cursor:end]+addition+slot['after_separator'];cursor=end
        return result+css[cursor:]
    except (KeyError,TypeError,ValueError):return None

def ripple_color_original_ok(case,original):
    try:
        e=RIPPLE_COLOR_BINDING_CASES[case];sources=_CATALOG['original_source_sets'][e['original']['source_set']]
        return all(original[k]==e['original'][k] for k in ('css','css_sha256','css_bytes','program_sha256')) and len(original['sources'])==len(sources) and all(s in original['sources'] for s in sources)
    except (KeyError,TypeError,ValueError):return False

def ripple_color_expected_css(case,original,peer):
    return insert_ripple_color_in_expected_model(case,original['css'],peer) if ripple_color_original_ok(case,original) else None

def ripple_color_results_match(case,original,actual,peer):
    try:
        expected=ripple_color_expected_css(case,original,peer)
        return expected is not None and actual['css']==expected and actual['css_sha256']==_sha(expected) and type(actual['css_bytes']) is int and actual['css_bytes']==len(expected.encode())
    except (KeyError,TypeError,ValueError):return False

def ripple_color_measurement_ok(case,m,line):
    try:
        e=RIPPLE_COLOR_BINDING_CASES[case]
        if line not in e['peers'] or m['line']!=line or m['program_sha256']!=e['program_sha256'] or not isinstance(m['css'],str) or m['css_sha256']!=_sha(m['css']) or type(m['css_bytes']) is not int or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t'):return False
        ss=m['sources']
        if not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path'] or '..' in s['path'].split('/') or not re.fullmatch('[a-f0-9]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss) or len({(s['root'],s['path']) for s in ss})!=len(ss):return False
        return all(s in ss for s in _OWNED_SOURCES)
    except (KeyError,TypeError,ValueError,AttributeError):return False

for case,e in _CATALOG['cases'].items():
    if _sha(e['program'])!=e['program_sha256'] or _sha(e['original']['css'])!=e['original']['css_sha256'] or len(e['original']['css'].encode())!=e['original']['css_bytes'] or e['original']['source_set'] not in _CATALOG['original_source_sets']:raise ValueError('ripple original identity changed')
    if case in _CONTROLS:
        if e['slots'] or e['name']!='legacy-core-color':raise ValueError('non-ripple control broadened')
        continue
    if not 1<=len(e['slots'])<=2:raise ValueError('ripple occurrence count changed')
    for index,s in enumerate(e['slots']):
        anchor=('' if s['scope']=='html' else s['scope']+' ')+'.mat-ripple-element {\n  background-color: '+s['token']+';'+('\n  opacity: '+s['opacity']+';' if s['opacity'] else '')+'\n}'
        if (s['index']!=index or s['anchor']!=anchor or e['original']['css'][s['original_offset']:s['original_offset']+len(anchor)]!=anchor or s['after_separator']!=('\n' if s['scope']!='html' and s['original_offset']+len(anchor)<len(e['original']['css']) else '')):raise ValueError('ripple occurrence boundary changed')
    marker=lambda i,p:f'/*!__ripple_color_{i}_{p}__*/'
    program="@use '@angular/material' as peer;\n"+'\n'.join(marker(s['index'],'begin')+'\n'+s['scope']+' { @include peer.ripple-overrides((color: '+s['token']+')); }\n'+marker(s['index'],'end') for s in e['slots'])+'\n'
    if program!=e['peer_program'] or set(e['peers'])!={'main','21.x'}:raise ValueError('ripple public recipe changed')
    for line,p in e['peers'].items():
        ss=_CATALOG['peer_source_sets'][p['source_set']]
        if not peer_measurement_ok(dict(p,sources=ss),line,_sha(program),{}) or p['member_css']!=[s['scope']+' {\n  --mat-ripple-color: '+s['token']+';\n}' for s in e['slots']]:raise ValueError('public ripple override evidence changed')
