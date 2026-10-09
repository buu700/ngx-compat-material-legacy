"""Real source CSS in synthetic validator envelopes;never packed qualification."""
import copy,json,hashlib
from pathlib import Path
from sass_function_fixture import function_receipt
ROOT=Path(__file__).resolve().parents[1]
CATALOG=json.loads((ROOT/'fixtures/sass/ripple-color-contracts.json').read_bytes())
FIXTURE=json.loads((ROOT/'tests/ripple_color_contract_fixture.json').read_bytes())

def ripple_color_receipt(active,case,invocation):
    e=CATALOG['cases'][case];line=active.binding['source_line'];stored=FIXTURE['rows'][case+'|'+line]
    m=copy.deepcopy(stored['actual']);m['sources']=copy.deepcopy(FIXTURE['source_sets'][m.pop('source_set')])
    peer=copy.deepcopy(stored['peer']);peer['sources']=copy.deepcopy(FIXTURE['peer_source_sets'][peer.pop('source_set')])
    contract=dict(classification='conforming-current-companion',contract='historical-ripple-colors-with-owned-public-binding',peer=peer)
    common=dict(case_id=case,result='pass',kind='assertion',check_id='sass-seal',group='sass-api-and-values',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=copy.deepcopy(active.binding),tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id']=='library'))
    if e['kind']=='default':
        path='compatibility/rc/oracles/material-16.2.14-sass-api.json'
        return dict(common,oracle=path,oracle_sha256=hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),expected_sha256=e['original']['css_sha256'],expected_bytes=e['original']['css_bytes'],actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'],comparison=contract['contract'],actual_measurement=m,current_companion=contract)
    if e['kind']=='ordered':
        return dict(common,group='ordered-css-dom',status='conforming-current-companion',raw_status='blocked',fixture=e['fixture'],fixture_sha256=hashlib.sha256((ROOT/e['fixture']).read_bytes()).hexdigest(),reference=e['reference'],reference_sha256=e['original']['css_sha256'],baseline_sha256=e['original']['css_sha256'],candidate_sha256=m['css_sha256'],comparison=contract['contract'],actual_measurement=m,current_companion=contract)
    path='fixtures/sass/owned-aggregate-contracts.json' if e['kind']=='owned' else 'fixtures/sass/mixin-argument-contracts.json'
    raw=(ROOT/path).read_bytes();catalog=json.loads(raw);probe=next(p for p in catalog['cases'] if p['case_id']==case)
    body=function_receipt(ROOT,active,'function-value/define-dark-theme/1',invocation)
    for key in ('function','expression'):body.pop(key)
    body.update(common);body.update(copy.deepcopy(probe));body['identity'].update(catalog=path,catalog_sha256=hashlib.sha256(raw).hexdigest())
    original=copy.deepcopy(e['original']);original['sources']=copy.deepcopy(CATALOG['original_source_sets'][original.pop('source_set')])
    body.update(expected=original,actual=m,current_companion=contract,comparison='current-companion-contract',error=None,mutation_rejected=True)
    css=m['css']+'\n.wrong-nonempty-mixin { color: red; }\n';body['mutation']=dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
    return body
