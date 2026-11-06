# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Private-card admission controls against a disposable source clone."""
import copy,json,sys
from pathlib import Path
from types import SimpleNamespace
mode,root=sys.argv[1],Path(sys.argv[2]);sys.path.insert(0,str(root/'scripts'))
if mode=='assertion':
    from sass_private_card_gate import private_card_assertion_ok
    p=json.load(sys.stdin);body=p['body'];active=SimpleNamespace(manifest=p['run'],binding=body['binding']);assert private_card_assertion_ok(str(root),active,body,'unit')
    for mutate in ('tarball','binding','source','original','css','descriptor','line','program','extra','duplicate'):
        b=copy.deepcopy(body)
        if mutate=='tarball':b['tarball_sha256']='0'*64
        if mutate=='binding':b['binding']['source_commit']='0'*40
        if mutate=='source':b['actual']['sources'][0]['sha256']='0'*64
        if mutate=='original':b['expected']['sources'][0]['sha256']='0'*64
        if mutate=='css':b['actual']['css']+='\n.unrelated {}'
        if mutate=='descriptor':b['current_private_card']['source']={}
        if mutate=='line':b['actual']['line']='main' if b['line']=='21.x' else '21.x'
        if mutate=='program':b['actual']['program_sha256']='0'*64
        if mutate=='extra':b['actual']['extra']=True
        if mutate=='duplicate':b['expected']['sources'].append(copy.deepcopy(b['expected']['sources'][0]))
        assert not private_card_assertion_ok(str(root),active,b,'unit'),mutate
    print(json.dumps(dict(ok=True,negatives=10,simulated_envelope=True)))
elif mode=='optimized':
    from sass_private_card_gate import PrivateCardGateContext
    try:PrivateCardGateContext(str(root))
    except RuntimeError:print(json.dumps(dict(ok=True)))
    else:raise RuntimeError('optimized mode accepted')
else:
    assert mode in ('baseline','pre','rehash','late');path=root/'fixtures/sass/private-card-peer.scss';pin_path=root/'fixtures/sass/private-card-peer-pins.json';before=path.read_bytes();pin_before=pin_path.read_bytes();rejected=False
    try:
        try:
            if mode=='pre':path.write_bytes(before+b'\n// tamper\n')
            if mode=='rehash':
                value=before+b'\n// tamper\n';pin=json.loads(pin_before);pin['program_sha256']=__import__('hashlib').sha256(value).hexdigest();path.write_bytes(value);pin_path.write_text(json.dumps(pin,indent=2)+'\n')
            from sass_private_card_gate import PrivateCardGateContext
            ctx=PrivateCardGateContext(str(root))
            if mode=='late':path.write_bytes(before+b'\n// tamper\n');ctx.assert_current()
        except Exception:
            if mode=='baseline':raise
            rejected=True
        assert rejected==(mode!='baseline');print(json.dumps(dict(ok=True,mode=mode)))
    finally:path.write_bytes(before);pin_path.write_bytes(pin_before)
