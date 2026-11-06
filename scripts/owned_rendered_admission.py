"""Exact tagged-CSS identities and live owned-control style probe admission."""
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from sass_mixin_argument_admission import mixin_argument_measurements_ok

@lru_cache(maxsize=1)
def owned_schema():
    script=Path(__file__).with_name('owned-style-contract.mjs')
    code="const m=await import(process.argv[1]);console.log(JSON.stringify(m.assessOwnedStyles({}, {}, {})));"
    result=subprocess.run(['node','--input-type=module','-e',code,script.as_uri()],capture_output=True,text=True,timeout=10)
    if result.returncode:raise ValueError('owned rendered source-policy schema unavailable')
    return {item['case_id']:item for item in json.loads(result.stdout).values()}

def owned_rendered_ok(root,active,body,invocation):
    try:
        schema=owned_schema()[body['case_id']]
        reference_kind=schema['reference_kind']
        if any(body.get(k)!=v for k,v in dict(kind='assertion',result='pass',check_id='sass-seal',group='owned-rendered',run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,line=active.binding['source_line'],source_kind='packed',reference_kind=reference_kind,strict_templates=True,skip_lib_check=False,found=True,mutation_detected=True,selector=schema['selector'],context=schema['context']).items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        if len(library)!=1 or body['tarball_sha256']!=library[0]['sha256'] or not isinstance(body['browser'],str) or not body['browser']:return False
        peer={p['id']:p['version'] for p in active.manifest['oracles']['current_peer']}
        versions=body['versions']
        if versions['material']!=peer['@angular/material'] or versions['cdk']!=peer['@angular/cdk'] or versions['core']!=peer['@angular/core']:return False
        settled=body['settlement']
        if set(settled)!={'reference','candidate','negative'}:return False
        for frame in settled.values():
            if frame.get('fonts_status')!='loaded' or type(frame.get('active_animations')) is not int or frame['active_animations']!=0 or type(frame.get('stable_frames')) is not int or frame['stable_frames']!=2 or type(frame.get('observed_animations')) is not int or frame['observed_animations']<0:return False
        fixtures=['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested']
        if set(body['identities'])!=set(fixtures):return False
        for id in fixtures:
            identity=body['identities'][id]
            reference=(root/'reference/material-16.2.14/sass-css'/f'{id}.css').read_bytes()
            fixture=(root/'fixtures/sass'/f'{id}.scss').read_bytes()
            if identity['reference_sha256']!=hashlib.sha256(reference).hexdigest() or identity['fixture_sha256']!=hashlib.sha256(fixture).hexdigest() or not re.fullmatch(r'[0-9a-f]{64}',identity['candidate_sha256']):return False
        if schema['context']=='typography':
            theme=body['custom_typography_theme']
            if theme['case_id']!='mixin-argument/all-legacy-component-themes/custom-full-theme' or theme['line']!=active.binding['source_line'] or not mixin_argument_measurements_ok(root,theme):return False
        if schema['context'] in ('theme-light','theme-dark'):
            theme=body['custom_theme']
            variant='custom-full-theme' if schema['context']=='theme-light' else 'custom-dark-theme'
            if theme['case_id']!='mixin-argument/all-legacy-component-themes/'+variant or theme['line']!=active.binding['source_line'] or not mixin_argument_measurements_ok(root,theme):return False
            if any(not theme[role]['css'].strip() for role in ('expected','actual')):return False
            witness=body['customization_witness'];spec=schema['customization_witness']
            if set(witness)!=set(spec) or any(witness[k]!=spec[k] for k in ('baseline_case_id','themed_case_id','property')):return False
            for mode in ('reference','candidate'):
                values=witness[mode]
                if set(values)!={'baseline','themed'} or any(not isinstance(value,str) or not value for value in values.values()) or values['baseline']==values['themed']:return False
            if witness['reference']!=witness['candidate']:return False
            if body['case_id']==witness['themed_case_id']:
                prop=next(p for p in body['properties'] if p['property']==witness['property'])
                if any(prop[mode]!=witness[mode]['themed'] for mode in ('reference','candidate')):return False
            frames=body['theme_frames']
            if set(frames)!={'reference','candidate','negative'}:return False
            for mode,frame in frames.items():
                expected=dict(context=schema['context'],body_scope=True,nested_scope=False,overlay_in_body=True,overlay_outside_nested=True,mutation_present=mode=='negative',theme_stylesheet_sha256=theme['expected' if mode=='reference' else 'actual']['css_sha256'])
                if frame!=expected or any(type(frame[k]) is not bool for k in ('body_scope','nested_scope','overlay_in_body','overlay_outside_nested','mutation_present')):return False
        if '/snack-' in body['case_id']:
            life=body['lifecycle']
            if life!={'first_events':['action','dismissed:true'],'first_removed':True,'reopened':True,'second_events':['dismissed:false'],'second_removed':True,'negative_events':['dismissed:false'],'negative_removed':True}:return False
            if any(type(life[k]) is not bool for k in ('first_removed','reopened','second_removed','negative_removed')):return False
        props=body['properties']
        if [p['property'] for p in props]!=[p['property'] for p in schema['properties']]:return False
        if any(not isinstance(p['reference'],str) or not p['reference'] or p['candidate']!=p['reference'] for p in props):return False
        for prop in props:
            if prop['property']=='visibility' and prop['reference']!='visible':return False
            if prop['property'] in ('opacity','effective-opacity') and (not math.isfinite(float(prop['reference'])) or float(prop['reference'])<=0 or float(prop['reference'])>1):return False
            if prop['property']=='state-active' and prop['reference']!='true':return False
            if prop['property'].startswith('rect-') and (not math.isfinite(float(prop['reference'])) or float(prop['reference'])<=0):return False
        mutation=body['mutation']
        if mutation['found'] is not True or any(not isinstance(mutation[k],str) or not mutation[k] for k in ('reference','observed')) or mutation['reference']==mutation['observed']:return False
        mutation_property='line-height' if any(p['property']=='line-height' for p in props) else props[0]['property']
        if mutation.get('property')!=mutation_property or mutation['reference']!=next(p['reference'] for p in props if p['property']==mutation_property):return False
        return True
    except (KeyError,ValueError,TypeError,OSError,StopIteration,subprocess.TimeoutExpired):return False


def validate_owned_rendered_batch(root,payload):
    """Reuse this domain validator for the upstream checker; no execution credit."""
    from types import SimpleNamespace
    try:
        if not isinstance(payload,dict) or set(payload)!={'binding','manifest','invocation_id','cases'}:raise ValueError()
        binding=payload['binding'];manifest=payload['manifest'];invocation=payload['invocation_id'];cases=payload['cases']
        if not isinstance(binding,dict) or binding.get('source_line') not in ('main','21.x') or not isinstance(manifest,dict):raise ValueError()
        if not isinstance(invocation,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,191}',invocation):raise ValueError()
        if not isinstance(cases,list) or not 0<len(cases)<=len(owned_schema()):raise ValueError()
        ids=[body['case_id'] for body in cases]
        if len(set(ids))!=len(ids) or any(id not in owned_schema() for id in ids):raise ValueError()
        active=SimpleNamespace(binding=binding,manifest=manifest)
        results=[dict(case_id=body['case_id'],ok=owned_rendered_ok(root,active,body,invocation)) for body in cases]
        by_id={body['case_id']:body for body in cases}
        valid_ids={item['case_id'] for item in results if item['ok']}
        for body,result in zip(cases,results):
            if body.get('context') not in ('theme-light','theme-dark') or not result['ok']:continue
            witness=body['customization_witness']
            for role in ('baseline','themed'):
                peer=by_id.get(witness[role+'_case_id']) if witness[role+'_case_id'] in valid_ids else None
                prop=next((p for p in peer.get('properties',[]) if p.get('property')==witness['property']),None) if peer else None
                if prop is None or any(prop[mode]!=witness[mode][role] for mode in ('reference','candidate')):result['ok']=False
        return dict(schema_version=1,ok=all(row['ok'] for row in results),cases=results)
    except (KeyError,ValueError,TypeError,OSError,subprocess.TimeoutExpired):
        return dict(schema_version=1,ok=False,cases=[])


if __name__=='__main__':
    import sys
    if sys.argv[1:]!=['--validate-batch']:
        print('usage: owned_rendered_admission.py --validate-batch',file=sys.stderr)
        raise SystemExit(2)
    raw=sys.stdin.buffer.read(32*1024*1024+1)
    try:
        if len(raw)>32*1024*1024:raise ValueError()
        result=validate_owned_rendered_batch(Path(__file__).resolve().parents[1],json.loads(raw))
    except (ValueError,UnicodeError):
        result=dict(schema_version=1,ok=False,cases=[])
    print(json.dumps(result,separators=(',',':')))
    raise SystemExit(0 if result['ok'] else 1)
