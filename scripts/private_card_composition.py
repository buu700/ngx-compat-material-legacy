# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite historical private-card composition; caller binds actual artifact."""
import hashlib
import json
from pathlib import Path
import subprocess
import weakref

_ROOT = Path(__file__).resolve().parents[1]
_PIN = '975904b6287c0be803cff023d58603fcc2a565be4515545718e60e604a6ea69c'
_JS = '063187919adc60972ad216c70e57f109184c6433b26318d03bcee022704f1698'
_RUNNER = '7f85cf94963c240325393367786faae1984a822000aa48935b77270c50b11bca'
_ORIGINAL = 'b4e40842f13244e578d93b26919c69f5668e24a0736a46742c1d79cc747fe9ca'
_OLD = ('--mdc-elevated-card-container-color','--mdc-elevated-card-container-elevation','--mdc-outlined-card-container-color','--mdc-outlined-card-container-elevation','--mdc-outlined-card-outline-color')
_NEW = ('--mat-card-elevated-container-color','--mat-card-elevated-container-elevation','--mat-card-outlined-container-color','--mat-card-outlined-container-elevation','--mat-card-outlined-outline-color')
_CONTEXTS = weakref.WeakKeyDictionary()
_SELF_IMAGE = Path(__file__).read_bytes()

def _hash(value):
    return hashlib.sha256(value.encode() if type(value) is str else value).hexdigest()

class _Context:
    pass

def _check(root, branch):
    assert Path(__file__).read_bytes()==_SELF_IMAGE
    raw_pins=(_ROOT/'fixtures/sass/private-card-peer-pins.json').read_bytes()
    assert _hash(raw_pins)==_PIN
    assert _hash((_ROOT/'fixtures/sass/private-card-peer.scss').read_bytes())==json.loads(raw_pins)['program_sha256']
    assert _hash((_ROOT/'scripts/private-card-composition.mjs').read_bytes())==_JS
    assert _hash((_ROOT/'scripts/private-card-peer-check.mjs').read_bytes())==_RUNNER
    for name in ('material', 'cdk'):
        base=(root/'node_modules/@angular'/name).resolve(strict=True)
        raw=(base/'package.json').read_bytes()
        assert _hash(raw)==branch['packages'][name]['sha256']
        assert json.loads(raw)['version']==branch['packages'][name]['version']
    card=(root/'node_modules/@angular/material').resolve(strict=True)/branch['card_component']['path']
    assert _hash(card.read_bytes())==branch['card_component']['sha256']
    sass=(root/'node_modules/sass').resolve(strict=True)
    for name,digest in branch['packages']['sass']['files'].items():
        assert _hash((sass/name).read_bytes())==digest
    for row in branch['sources']:
        base=(root/'node_modules/@angular'/row['package']).resolve(strict=True)
        source=(base/row['path']).resolve(strict=True)
        assert source.is_relative_to(base) and source!=base
        raw=source.read_bytes()
        assert len(raw)==row['bytes'] and _hash(raw)==row['sha256']

def create_private_card_context(root, line):
    if not __debug__:
        raise RuntimeError('private card proof requires Python assertions enabled')
    assert type(root) is str and line in ('21.x','main')
    pins=(_ROOT/'fixtures/sass/private-card-peer-pins.json').read_bytes()
    assert _hash(pins)==_PIN
    packet=json.loads(pins);branch=packet['branches']['21' if line=='21.x' else 'main']
    program=(_ROOT/'fixtures/sass/private-card-peer.scss').read_bytes()
    assert _hash(program)==packet['program_sha256']
    script=_ROOT/'scripts/private-card-composition.mjs'; runner=_ROOT/'scripts/private-card-peer-check.mjs'
    assert _hash(script.read_bytes())==_JS and _hash(runner.read_bytes())==_RUNNER
    root=Path(root).resolve(strict=True);_check(root,branch)
    runtime=subprocess.run(['node','--version'],capture_output=True,text=True,timeout=10)
    assert runtime.returncode==0 and runtime.stdout.strip()=='v24.21.0'
    result=subprocess.run(['node',str(runner),str(root),line],capture_output=True,text=True,timeout=90)
    assert result.returncode==0 and result.stdout=='private-card-peer-ok\n'
    _check(root,branch)
    context=_Context();_CONTEXTS[context]=(root,line,branch)
    return context

def _compose(branch, original):
    assert type(original) is str and len(original.encode())==989 and _hash(original)==_ORIGINAL
    blocks=original.split('\n\n');assert len(blocks)==2
    lines=blocks[0].split('\n');assert lines[0]=='.mat-mdc-card {' and lines[-1]=='}'
    values=[]
    for key in _OLD:
        prefix='  '+key+': ';matches=[line for line in lines if line.startswith(prefix) and line.endswith(';')]
        assert len(matches)==1;values.append(matches[0][len(prefix):-1])
    peer=branch['peer_css'].split('\n');assert len(peer)==7 and peer[0]=='.mat-mdc-card {' and peer[-1]=='}'
    for name,value,line in zip(_NEW,values,peer[1:-1]):assert line=='  '+name+': '+value+';'
    positions=[i for i,line in enumerate(lines) if line.startswith('  --mat-card-subtitle-text-color: ')]
    assert len(positions)==1;lines[positions[0]:positions[0]]=peer[1:-1];blocks[0]='\n'.join(lines)
    return '\n\n'.join(blocks)

def private_card_composition_matches(context, line, case_id, original_css, actual_css):
    try:
        if not __debug__ or type(context) is not _Context or context not in _CONTEXTS:return False
        root,context_line,branch=_CONTEXTS[context]
        if line!=context_line or case_id!='mixin-css/private-check-duplicate-theme-styles' or type(actual_css) is not str:return False
        _check(root,branch);expected=_compose(branch,original_css);_check(root,branch)
        return actual_css==expected
    except (AssertionError,KeyError,TypeError,ValueError,OSError):
        return False
