"""Synthetic core/CDK receipts for admission tests,never execution evidence."""
import copy
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def default_core_receipt(active,case,invocation):
    catalog=json.loads((ROOT/'fixtures/sass/default-core-cdk-contracts.json').read_bytes())
    f=json.loads((ROOT/'tests/sass_default_core_cdk_fixture.json').read_bytes())
    line=active.binding['source_line'];entry=catalog['cases'][case];m=copy.deepcopy(f['measurements'][case+'-'+line])
    m['sources']=copy.deepcopy(f['source_sets'][m.pop('source_set')])
    return dict(case_id=case,result='pass',kind='assertion',check_id='sass-seal',group='sass-api-and-values',exit_code=0,
        line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
        tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id']=='library'),
        oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=catalog['oracle_sha256'],
        expected_sha256=entry['original_sha256'],expected_bytes=entry['original_bytes'],actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'],
        comparison='historical-core-with-public-cdk-contributions',actual_measurement=m,
        current_infrastructure=dict(classification='conforming-current-infrastructure',contract='historical-core-with-public-cdk-contributions',peer=copy.deepcopy(f['peers'][line])))
