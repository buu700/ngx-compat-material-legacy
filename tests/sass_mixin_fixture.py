"""Synthetic mixin receipts for validator tests, never Sass execution evidence."""
import copy
import hashlib
import json
from sass_function_fixture import function_receipt

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
    return body

def owned_aggregate_receipt(root,active,case,invocation):
    """Synthetic validator input, not an original or candidate Sass observation."""
    raw=(root/'fixtures/sass/owned-aggregate-contracts.json').read_bytes();catalog=json.loads(raw)
    probe=next(p for p in catalog['cases'] if p['case_id']==case)
    body=mixin_receipt(root,active,'mixin-argument/all-component-themes/custom-full-theme',invocation)
    for key in ('mixin','argument'):body.pop(key)
    body.update(probe)
    body['identity'].update(catalog='fixtures/sass/owned-aggregate-contracts.json',catalog_sha256=hashlib.sha256(raw).hexdigest())
    for role in ('expected','actual'):
        call=probe['reference_call'] if role=='expected' else probe['call']
        program="@use '__entry__' as m;\n"+catalog['setup']+'\n'+call+'\n'
        body[role]['program_sha256']=hashlib.sha256(program.encode()).hexdigest()
    return body
