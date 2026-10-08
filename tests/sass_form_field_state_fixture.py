"""Synthetic envelopes around captured source measurements; never artifact qualification."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def form_field_state_receipt(active, case, invocation):
    c = json.loads((ROOT / 'fixtures/sass/form-field-state-contracts.json').read_bytes())
    f = json.loads((ROOT / 'tests/form_field_state_contract_fixture.json').read_bytes())
    line = active.binding['source_line']
    e = c['cases'][case]
    m = copy.deepcopy(f['measurements'][line][case])
    m['sources'] = copy.deepcopy(f['source_sets'][line])
    peer = copy.deepcopy(f['peers'][line][case])
    peer['sources'] = copy.deepcopy(c['peer_inputs'][line])
    body = dict(case_id=case, result='pass', kind='assertion', check_id='sass-seal', group='sass-api-and-values',
                exit_code=0, line=line, run_id=active.manifest['run_id'], invocation_id=invocation, binding=active.binding,
                tarball_sha256=next(a['sha256'] for a in active.manifest['artifacts'] if a['id'] == 'library'),
                current_companion=dict(classification='conforming-current-companion',
                                       contract='historical-form-field-css-with-public-state-tokens', peer=peer))
    if e['kind'] == 'default':
        body.update(oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json', oracle_sha256=c['oracle_sha256'],
                    expected_sha256=e['original']['css_sha256'], expected_bytes=e['original']['css_bytes'],
                    actual_sha256=m['css_sha256'], actual_bytes=m['css_bytes'], actual_measurement=m,
                    comparison='historical-form-field-css-with-public-state-tokens')
    else:
        catalog_raw = (ROOT / 'fixtures/sass/mixin-argument-contracts.json').read_bytes()
        probe = next(p for p in json.loads(catalog_raw)['cases'] if p['case_id'] == case)
        provenance = json.loads((ROOT / 'reference/material-16.2.14/PROVENANCE.json').read_bytes())['isolated_environment']
        lock = json.loads((ROOT / 'reference/material-16.2.14/environment-package-lock.json').read_bytes())
        original = copy.deepcopy(e['original'])
        original['sources'] = copy.deepcopy(c['original_sources'])
        wrong = m['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'
        body.update(probe, expected=original, actual=m, error=None, mutation_rejected=True,
                    mutation=dict(css=wrong, css_sha256=hashlib.sha256(wrong.encode()).hexdigest(), css_bytes=len(wrong.encode())),
                    comparison='current-companion-contract',
                    identity=dict(material_version='16.2.14', material_manifest_sha256=provenance['material_manifest_sha256'],
                                  lock_sha256=provenance['package_lock_sha256'], material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],
                                  catalog='fixtures/sass/mixin-argument-contracts.json', catalog_sha256=hashlib.sha256(catalog_raw).hexdigest(),
                                  expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=m['sass_version']))
    return body
