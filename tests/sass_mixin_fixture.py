"""Synthetic mixin receipts for validator tests, never Sass execution evidence."""
import copy
import hashlib
import json
import functools
import subprocess
from pathlib import Path
from sass_function_fixture import function_receipt

@functools.lru_cache(maxsize=None)
def _companion_programs(root):
    code="import {SORT_COMPANION_CASES,sortPeerProgram} from './scripts/sass-sort-companion-contract.mjs';import {TREE_COMPANION_CASES,treePeerProgram,treePeerExpectedCss} from './scripts/sass-tree-companion-contract.mjs';process.stdout.write(JSON.stringify({sort:Object.fromEntries(Object.keys(SORT_COMPANION_CASES).map(id=>[id,sortPeerProgram(id)])),tree:Object.fromEntries(Object.keys(TREE_COMPANION_CASES).map(id=>[id,{program:treePeerProgram(id),css:treePeerExpectedCss(id)}]))}));"
    return json.loads(subprocess.run(['node','--input-type=module','-e',code],cwd=root,check=True,capture_output=True,text=True).stdout)

def mixin_receipt(root,active,case,invocation):
    raw=(root/'fixtures/sass/mixin-argument-contracts.json').read_bytes();catalog=json.loads(raw)
    probe=next(p for p in catalog['cases'] if p['case_id']==case)
    body={**copy.deepcopy(function_receipt(root,active,'function-value/define-dark-theme/1',invocation)),**probe}
    body['identity'].update(catalog='fixtures/sass/mixin-argument-contracts.json',catalog_sha256=hashlib.sha256(raw).hexdigest())
    for key in ('function','expression'):body.pop(key)
    css='' if probe['variant']=='raw-density-config' else '.synthetic { color: red; }'
    program="@use '__entry__' as m;\n"+catalog['setup']+'\n'+probe['call']+'\n'
    for role in ('expected','actual'):
        sources=body[role]['sources'];body[role]=dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()),program_sha256=hashlib.sha256(program.encode()).hexdigest(),sources=sources)
    mutation=css+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=mutation,css_sha256=hashlib.sha256(mutation.encode()).hexdigest(),css_bytes=len(mutation.encode()))
    if probe['mixin'] in ('sort-color','sort-theme'):
        # Admission-shape fixture only. Real source/peer compilation is separate.
        dark=probe['variant']=='custom-dark-theme';line=body['line'];program=_companion_programs(root)['sort'][case]
        original='.sass-argument-probe .mat-sort-header-arrow {\n  color: '+('rgb(77.7647058824%, 77.7647058824%, 77.7647058824%)' if dark else 'rgb(46%, 46%, 46%)')+';\n}'
        token='white' if dark else 'rgba(0, 0, 0, 0.87)'
        peer_css='.sass-argument-probe {\n  --mat-sort-arrow-color: '+token+';\n}'
        actual=original.replace('color: ', 'color: var(--mat-sort-arrow-color, ').replace(';\n}', ');\n}')+'\n'+peer_css
        for role,value in [('expected',original),('actual',actual)]:
            body[role].update(css=value,css_sha256=hashlib.sha256(value.encode()).hexdigest(),css_bytes=len(value.encode()))
        version,manifest=('22.1.7','5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af') if line=='main' else ('21.2.14','26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355')
        body['current_companion']=dict(classification='conforming-current-companion',contract='current-sort-color-with-original-fallback',peer=dict(line=line,peer_version=version,peer_package_json_sha256=manifest,program=program,program_sha256=hashlib.sha256(program.encode()).hexdigest(),css=peer_css,css_sha256=hashlib.sha256(peer_css.encode()).hexdigest(),css_bytes=len(peer_css.encode()),sources=[
            dict(root=0,path='sort/_m2-sort.scss',sha256='06d77838a6fee948f3e101021da366bf95845a769916b354137103cf454f98d6',bytes=267),
            dict(root=0,path='sort/_sort-theme.scss',sha256='526fb2229a84a7449a9a4d57cd228089df1c403cdcebd0b84ebed54086636be0',bytes=1977)]))
        body['comparison']='current-companion-contract'
        wrong=actual+'\n.wrong-nonempty-mixin { color: red; }\n'
        body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))
    elif probe['mixin'] in ('tree-color','tree-density','tree-typography','tree-theme'):
        # Synthetic admission-shape fixture, never an execution or golden source.
        import re
        dims=probe['mixin'].split('-')[-1];dark=probe['variant']=='custom-dark-theme';line=body['line']
        color='.sass-argument-probe .mat-tree {\n  background: '+('#424242' if dark else 'white')+';\n}\n.sass-argument-probe .mat-tree-node,\n.sass-argument-probe .mat-nested-tree-node {\n  color: '+('white' if dark else 'rgba(0, 0, 0, 0.87)')+';\n}'
        density='.sass-argument-probe .mat-tree-node {\n  min-height: 40px;\n}'
        typography='.sass-argument-probe .mat-tree {\n  font-family: Custom Family;\n}\n.sass-argument-probe .mat-tree-node,\n.sass-argument-probe .mat-nested-tree-node {\n  font-weight: 400;\n  font-size: 14px;\n}'
        original='\n'.join([color,density,typography]) if dims=='theme' else {'color':color,'density':density,'typography':typography}[dims]
        program_and_css=_companion_programs(root)['tree'][case];program=program_and_css['program'];peer_css=program_and_css['css']
        tokens={'background':'container-background-color','color':'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'}
        actual=re.sub(r'^  (background|color|font-weight|font-size|min-height): ([^;\n{}]+);$',lambda m:'  '+m[1]+': var(--mat-tree-'+tokens[m[1]]+', '+m[2]+');',original,flags=re.M)+'\n'+peer_css
        for role,value in [('expected',original),('actual',actual)]:body[role].update(css=value,css_sha256=hashlib.sha256(value.encode()).hexdigest(),css_bytes=len(value.encode()))
        version,manifest=('22.1.7','5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af') if line=='main' else ('21.2.14','26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355')
        body['current_companion']=dict(classification='conforming-current-companion',contract='current-tree-dimensions-with-original-fallbacks',peer=dict(line=line,peer_version=version,peer_package_json_sha256=manifest,program=program,program_sha256=hashlib.sha256(program.encode()).hexdigest(),css=peer_css,css_sha256=hashlib.sha256(peer_css.encode()).hexdigest(),css_bytes=len(peer_css.encode()),sources=[
            dict(root=0,path='tree/_m2-tree.scss',sha256='efb7b17cb55631f6dc3318ed2dc04240055f92aa742b015d00c47864db2429b5',bytes=871),
            dict(root=0,path='tree/_tree-theme.scss',sha256='645c90053453a65e4519c2396a1710f881866a3a589a241108490d86577ec2a2',bytes=1977)]))
        body['comparison']='current-companion-contract'
        wrong=actual+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))
    else:
        from sass_companion_addition_admission import COMPANION_ADDITION_CASES, _CATALOG
        if case in COMPANION_ADDITION_CASES:
            entry=COMPANION_ADDITION_CASES[case];line=body['line'];floor=entry['peers'][line]
            fixture=json.loads((Path(__file__).parent/'sass_companion_addition_fixture.json').read_bytes())
            original=fixture['originals'][entry['original_sha256']]
            recorded=fixture['peers'][floor['program_sha256']+'-'+line]
            peer_css=recorded['css'];actual=(original+entry['separator'] if original else '')+peer_css
            for role,value in [('expected',original),('actual',actual)]:body[role].update(css=value,css_sha256=hashlib.sha256(value.encode()).hexdigest(),css_bytes=len(value.encode()))
            version,manifest=('22.1.7','5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af') if line=='main' else ('21.2.14','26af34e77987b55564689c8eb7b5352db661d6a737fdec2160417ae42114f355')
            body['current_companion']=dict(classification='conforming-current-companion',contract='original-css-with-current-companion-addition',peer=dict(line=line,peer_version=version,peer_package_json_sha256=manifest,program=recorded['program'],program_sha256=floor['program_sha256'],css=peer_css,css_sha256=floor['css_sha256'],css_bytes=len(peer_css.encode()),sources=[dict(root=0,path=p,sha256=digest,bytes=size) for p,(digest,size) in _CATALOG['sources'][line][entry['family']].items()]))
            body['comparison']='current-companion-contract'
            wrong=actual+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=wrong,css_sha256=hashlib.sha256(wrong.encode()).hexdigest(),css_bytes=len(wrong.encode()))
    return body
