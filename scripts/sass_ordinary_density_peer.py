# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Fixed peer-only proof for the three ordinary aggregate density cases."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
_ROOT=Path(__file__).resolve().parents[1]
_INPUTS=json.loads((_ROOT/'fixtures/sass/default-aggregate-contracts.json').read_bytes())['peer_inputs']
_PROFILES={'default':('e64c306af8ada1587482de320d6ebab1c61bb5fe1e7e0ec538e5c4577f41f8b4','6ebd93bd01d7014112896ab45de29a19ef5236d85fad99a11e41657160eeb450',3162),'argument':('b0dc83dd9f5572a3d0d64a1ed628783ca6722697eb28457b40a12178013184ae','2aea7214055a951a6aee02768eaee1dd45620b16d503e1590d42bfa985cbbf80',3156)}
_CASES={'mixin-css/all-component-densities':'default','mixin-argument/all-component-densities/custom-full-theme':'argument','mixin-argument/all-component-densities/raw-density-config':'argument'}
_KEYS=['--mat-checkbox-state-layer-size','--mat-checkbox-touch-target-size','--mat-checkbox-touch-target-display']+[f'--mat-button-{k}-{v}' for k in ('text','filled','protected','outlined') for v in ('container-height','touch-target-size','touch-target-display')]
_SASS='dart-sass\t1.104.1\t(Sass Compiler)\t[Dart]\ndart2js\t3.13.3\t(Dart Compiler)\t[Dart]'
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
def ordinary_density_peer_ok(case,peer,line):
    try:
        if type(peer) is not dict or set(peer)!={'cdk_package_json_sha256','cdk_version','css','css_bytes','css_sha256','line','peer_package_json_sha256','peer_version','program','program_sha256','sass_version','sources'} or type(peer['sources']) is not list or any(type(s) is not dict or set(s)!={'bytes','path','root','sha256'} for s in peer['sources']) or line not in _INPUTS or case not in _CASES:return False
        profile=_CASES[case];program_hash,css_hash,css_bytes=_PROFILES[profile];source=_INPUTS[line];program=(_ROOT/'fixtures/sass/peer-programs'/('ordinary-density-'+profile+'.scss')).read_text()
        if (_sha(program)!=program_hash or peer.get('program')!=program or not peer_measurement_ok(peer,line,program_hash,{}) or peer.get('css_sha256')!=css_hash or peer.get('css_bytes')!=css_bytes or peer.get('sass_version')!=_SASS or peer.get('cdk_version')!=source['cdk_version'] or peer.get('cdk_version')!=peer.get('peer_version') or peer.get('cdk_package_json_sha256')!=source['cdk_package_json_sha256']):return False
        tup=lambda s:(s['root'],s['path'],s['sha256'],s['bytes']);wanted={tup(s) for s in source['sources']};actual={tup(s) for s in peer['sources']}
        return len(actual)==len(peer['sources'])==len(wanted) and actual==wanted
    except (KeyError,TypeError,ValueError,OSError,AttributeError):return False
def ordinary_density_peer_matches(case,peer,line,css):
    try:
        if not ordinary_density_peer_ok(case,peer,line) or type(css) is not str:return False
        scope='.sass-api-probe' if case.startswith('mixin-css/') else '.sass-argument-probe';button=',\n'.join(scope+' .'+x+'.mat-mdc-button-base' for x in ('mat-mdc-button','mat-mdc-raised-button','mat-mdc-unelevated-button','mat-mdc-outlined-button'));seen={}
        for block in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
            sel=block[1].strip()
            for m in re.finditer(r'(--mat-(?:checkbox|button-(?:text|filled|protected|outlined))-[a-z0-9-]+): ([^;\n]+);',block[2]):
                key,value=m.groups()
                if key not in _KEYS or sel!=(scope if key.startswith('--mat-checkbox-') else button):return False
                seen.setdefault(key,[]).append(value)
        values={m[1]:m[2] for m in re.finditer(r'(--mat-[a-z0-9-]+): ([^;\n]+);',peer['css'])}
        return all(k in seen and k in values and seen[k][-1]==values[k] for k in _KEYS)
    except (KeyError,TypeError,ValueError,AttributeError):return False
