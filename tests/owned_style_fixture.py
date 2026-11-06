"""Synthetic style receipts for admission tests only."""
import copy
import hashlib
from owned_rendered_admission import owned_schema

def _style_value(case,property):
    if property.startswith('rect-'):return '40'
    if property=='visibility':return 'visible'
    if property in ('opacity','effective-opacity'):return '1'
    if property=='state-active':return 'true'
    context=case.split('/')[1]
    if context in ('theme-light','theme-dark') and property in ('color','background-color'):
        return 'rgb(11, 22, 33)' if context=='theme-light' else 'rgb(44, 55, 66)'
    return 'rgba(0, 0, 0, 0.54)'

def style_receipt(root,active,case,invocation):
    body=copy.deepcopy(owned_schema()[case])
    line=active.binding['source_line'];version='22.1.7' if line=='main' else '21.2.14'
    library=next(a for a in active.manifest['artifacts'] if a['id']=='library')
    body.update(result='pass',found=True,mutation_detected=True,mutation={'found':True,'reference':'rgba(0, 0, 0, 0.54)','observed':'rgb(1, 2, 3)'},check_id='sass-seal',run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,line=line,tarball_sha256=library['sha256'],source_kind='packed',reference_kind='untouched-material-16.2.14-css',strict_templates=True,skip_lib_check=False,browser='Synthetic Chromium',versions={'core':'22.1.7' if line=='main' else '21.2.23','cdk':version,'material':version})
    for prop in body['properties']:
        value=_style_value(case,prop['property'])
        prop.update(reference=value,candidate=value)
    body['mutation']['property']='line-height' if any(p['property']=='line-height' for p in body['properties']) else body['properties'][0]['property']
    body['mutation']['reference']=next(p['reference'] for p in body['properties'] if p['property']==body['mutation']['property'])
    if '/snack-' in case:body['lifecycle']={'first_events':['action','dismissed:true'],'first_removed':True,'reopened':True,'second_events':['dismissed:false'],'second_removed':True,'negative_events':['dismissed:false'],'negative_removed':True}
    if body['context']=='typography':
        from sass_mixin_fixture import mixin_receipt
        body['reference_kind']='untouched-material-16.2.14-compiled-css'
        body['custom_typography_theme']=mixin_receipt(root,active,'mixin-argument/all-legacy-component-themes/custom-full-theme',invocation)
    if body['context'] in ('theme-light','theme-dark'):
        from sass_mixin_fixture import mixin_receipt
        variant='custom-full-theme' if body['context']=='theme-light' else 'custom-dark-theme'
        body['reference_kind']='untouched-material-16.2.14-compiled-css'
        body['custom_theme']=theme=mixin_receipt(root,active,'mixin-argument/all-legacy-component-themes/'+variant,invocation)
        body['theme_frames']={mode:dict(context=body['context'],body_scope=True,nested_scope=False,overlay_in_body=True,overlay_outside_nested=True,mutation_present=mode=='negative',theme_stylesheet_sha256=theme['expected' if mode=='reference' else 'actual']['css_sha256']) for mode in ('reference','candidate','negative')}
        witness=body['customization_witness']
        for mode in ('reference','candidate'):
            witness[mode]={role:_style_value(witness[role+'_case_id'],witness['property']) for role in ('baseline','themed')}
    body['settlement']={mode:dict(fonts_status='loaded',active_animations=0,stable_frames=2,observed_animations=1) for mode in ('reference','candidate','negative')}
    body['identities']={id:dict(reference_sha256=hashlib.sha256((root/'reference/material-16.2.14/sass-css'/f'{id}.css').read_bytes()).hexdigest(),candidate_sha256='e'*64,fixture_sha256=hashlib.sha256((root/'fixtures/sass'/f'{id}.scss').read_bytes()).hexdigest()) for id in ['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested']}
    return body
