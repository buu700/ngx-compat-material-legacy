"""Exact tagged-CSS identities and live owned-control style probe admission."""
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import subprocess

@lru_cache(maxsize=1)
def owned_schema():
    script=Path(__file__).with_name('sass-owned-rendered.mjs')
    code="const m=await import(process.argv[1]);console.log(JSON.stringify(m.assessOwnedStyles({}, {}, {})));"
    result=subprocess.run(['node','--input-type=module','-e',code,script.as_uri()],capture_output=True,text=True,timeout=10)
    if result.returncode:raise ValueError('owned rendered source-policy schema unavailable')
    return {item['case_id']:item for item in json.loads(result.stdout).values()}

def owned_rendered_ok(root,active,body,invocation):
    try:
        schema=owned_schema()[body['case_id']]
        if any(body.get(k)!=v for k,v in dict(kind='assertion',result='pass',check_id='sass-seal',group='owned-rendered',run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,line=active.binding['source_line'],source_kind='packed',reference_kind='untouched-material-16.2.14-css',strict_templates=True,skip_lib_check=False,found=True,mutation_detected=True,selector=schema['selector'],context=schema['context']).items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        if len(library)!=1 or body['tarball_sha256']!=library[0]['sha256'] or not isinstance(body['browser'],str) or not body['browser']:return False
        peer={p['id']:p['version'] for p in active.manifest['oracles']['current_peer']}
        versions=body['versions']
        if versions['material']!=peer['@angular/material'] or versions['cdk']!=peer['@angular/cdk'] or versions['core']!=peer['@angular/core']:return False
        fixtures=['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested']
        if set(body['identities'])!=set(fixtures):return False
        for id in fixtures:
            identity=body['identities'][id]
            reference=(root/'reference/material-16.2.14/sass-css'/f'{id}.css').read_bytes()
            fixture=(root/'fixtures/sass'/f'{id}.scss').read_bytes()
            if identity['reference_sha256']!=hashlib.sha256(reference).hexdigest() or identity['fixture_sha256']!=hashlib.sha256(fixture).hexdigest() or not re.fullmatch(r'[0-9a-f]{64}',identity['candidate_sha256']):return False
        props=body['properties']
        if [p['property'] for p in props]!=[p['property'] for p in schema['properties']]:return False
        if any(not isinstance(p['reference'],str) or not p['reference'] or p['candidate']!=p['reference'] for p in props):return False
        mutation=body['mutation']
        if mutation['found'] is not True or any(not isinstance(mutation[k],str) or not mutation[k] for k in ('reference','observed')) or mutation['reference']==mutation['observed']:return False
        if body['case_id']=='owned-style/light/disabled-placeholder' and mutation['reference']!=props[0]['reference']:return False
        return True
    except (KeyError,ValueError,TypeError,OSError,subprocess.TimeoutExpired):return False
