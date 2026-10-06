"""Synthetic style receipts for admission tests only."""
import copy
import hashlib
from owned_rendered_admission import owned_schema

def style_receipt(root,active,case,invocation):
    body=copy.deepcopy(owned_schema()[case])
    line=active.binding['source_line'];version='22.1.7' if line=='main' else '21.2.14'
    library=next(a for a in active.manifest['artifacts'] if a['id']=='library')
    body.update(result='pass',found=True,mutation_detected=True,mutation={'found':True,'reference':'rgba(0, 0, 0, 0.54)','observed':'rgb(1, 2, 3)'},check_id='sass-seal',run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,line=line,tarball_sha256=library['sha256'],source_kind='packed',reference_kind='untouched-material-16.2.14-css',strict_templates=True,skip_lib_check=False,browser='Synthetic Chromium',versions={'core':'22.1.7' if line=='main' else '21.2.23','cdk':version,'material':version})
    for prop in body['properties']:prop.update(reference='rgba(0, 0, 0, 0.54)',candidate='rgba(0, 0, 0, 0.54)')
    body['mutation']['property']='line-height' if any(p['property']=='line-height' for p in body['properties']) else body['properties'][0]['property']
    body['identities']={id:dict(reference_sha256=hashlib.sha256((root/'reference/material-16.2.14/sass-css'/f'{id}.css').read_bytes()).hexdigest(),candidate_sha256='e'*64,fixture_sha256=hashlib.sha256((root/'fixtures/sass'/f'{id}.scss').read_bytes()).hexdigest()) for id in ['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested']}
    return body
