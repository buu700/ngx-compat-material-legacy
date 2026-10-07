"""Synthetic admission envelopes around retained root core source measurements."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def ordered_core_receipt(active,case,invocation):
    c=json.loads((ROOT/'fixtures/sass/ordered-core-cdk-contracts.json').read_bytes());f=json.loads((ROOT/'tests/sass_ordered_core_fixture.json').read_bytes())
    source=json.loads((ROOT/'tests'/f['source_fixture']).read_bytes());line=active.binding['source_line'];entry=c['cases'][case]
    m=copy.deepcopy(f['measurements'][case+'-'+line]);m['sources']=copy.deepcopy(source['source_sets'][m.pop('source_set')])
    return dict(case_id=case,result='pass',kind='assertion',check_id='sass-seal',group='ordered-css-dom',exit_code=0,status='conforming-current-infrastructure',raw_status='blocked',
        line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id']=='library'),
        baseline_sha256=entry['reference_sha256'],candidate_sha256=m['css_sha256'],fixture=entry['fixture'],fixture_sha256=entry['fixture_sha256'],reference=entry['reference'],reference_sha256=entry['reference_sha256'],
        comparison='historical-ordered-core-with-public-cdk-contributions',actual_measurement=m,
        current_infrastructure=dict(classification='conforming-current-infrastructure',contract='historical-ordered-core-with-public-cdk-contributions',peer=copy.deepcopy(f['peers'][line])))
