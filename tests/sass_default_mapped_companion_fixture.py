"""Synthetic validator receipts around retained default source CSS;never qualification."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def default_mapped_companion_receipt(active,case,invocation):
    c=json.loads((ROOT/'fixtures/sass/default-mapped-companion-contracts.json').read_bytes());f=json.loads((ROOT/'tests/sass_default_mapped_companion_fixture.json').read_bytes());source=json.loads((ROOT/'tests'/f['source_fixture']).read_bytes())
    line=active.binding['source_line'];e=c['cases'][case];m=copy.deepcopy(f['measurements'][case+'-'+line]);m['sources']=copy.deepcopy(source['source_sets'][m.pop('source_set')])
    peer=copy.deepcopy(f['peers'][case+'-'+line]);peer['sources']=copy.deepcopy(c['peer_inputs'][peer.pop('source_set')]['sources'])
    return dict(case_id=case,result='pass',kind='assertion',check_id='sass-seal',group='sass-api-and-values',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
        tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id']=='library'),oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=c['oracle_sha256'],
        expected_sha256=e['original_sha256'],expected_bytes=e['original_bytes'],actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'],comparison='historical-default-css-with-public-companion-mapping',actual_measurement=m,
        current_companion=dict(classification='conforming-current-companion',contract='historical-default-css-with-public-companion-mapping',peer=peer))
