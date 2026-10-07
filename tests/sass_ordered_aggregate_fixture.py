"""Synthetic admission receipts from retained whole source outputs,not qualification."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def ordered_aggregate_receipt(active,case,invocation):
    c=json.loads((ROOT/'fixtures/sass/ordered-aggregate-contracts.json').read_bytes());f=json.loads((ROOT/'tests/sass_ordered_aggregate_fixture.json').read_bytes());source=json.loads((ROOT/'tests'/f['source_fixture']).read_bytes())
    line=active.binding['source_line'];e=c['cases'][case];m=copy.deepcopy(f['measurements'][line]);m['sources']=copy.deepcopy(source['source_sets'][m.pop('source_set')]);peers={}
    for group in ['core','light','dark','panel']:
        p=copy.deepcopy(f['peers'][group+'-'+line])
        if group!='core':p['sources']=copy.deepcopy(c['peer_inputs'][p.pop('source_set')]['sources'])
        peers[group]=p
    return dict(case_id=case,result='pass',kind='assertion',check_id='sass-seal',group='ordered-css-dom',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
        tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id']=='library'),status='conforming-current-companion',raw_status='blocked',baseline_sha256=e['reference_sha256'],candidate_sha256=m['css_sha256'],
        fixture=e['fixture'],fixture_sha256=e['fixture_sha256'],reference=e['reference'],reference_sha256=e['reference_sha256'],comparison='historical-ordered-aggregate-with-qualified-public-members',actual_measurement=m,
        current_companion=dict(classification='conforming-current-companion',contract='historical-ordered-aggregate-with-qualified-public-members',peers=peers))
