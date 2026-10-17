# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Correct one source-note route while preserving the original qualification and all runtime failures."""
import copy
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
prefix = 'compatibility/rc/mixed-fixture-build-source-'
subject = 'a0eb8b06917b6fc83e13578a8a7358e008844c6f'


def ref(path):
    return {'path': path, 'sha256': hashlib.sha256((root / path).read_bytes()).hexdigest()}


def write(path, data):
    with (root / path).open('x') as output:
        output.write(json.dumps(data, indent=2) + '\n')


manifest = json.loads((root / 'projects/ngx-material-legacy/package.json').read_text())
line = '21.x' if manifest['version'].startswith('21.') else 'main'
pins = json.loads(gzip.decompress((root / (prefix + 'observation-pins.json.gz')).read_bytes()))
paths = ['projects/ngx-material-legacy/internal/public-constructor-context.ts',
         'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts',
         'projects/ngx-material-legacy/legacy-tabs/internal/public-constructor-context.ts',
         'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts']
routes = []
for index, path in enumerate(paths):
    assert ref(path) in pins['owned_context'][line]['owned_context']
    text = (root / path).read_text()
    operation = ('return Injector.NULL.get(token, notFoundValue);' if index < 3 else
                 'return token === CDK_VIRTUAL_SCROLL_VIEWPORT ? null : this.parent.get(token, notFoundValue, options);')
    assert text.count(operation) == 1
    assert 'notFoundValue?: any' in text
    if index == 3:
        assert 'options?: InjectOptions' in text
    routes.append({**ref(path), 'exact_operation': operation,
                   'fallback_route': 'Injector.NULL' if index < 3 else 'parent injector with InjectOptions',
                   'viewport_token_intentionally_hidden': index == 3})
correction_path = prefix + 'injector-correction.json'
corrected = ('Four owned injector contexts accept and forward notFoundValue: three bounded borrowed-dependency '
             'contexts use public Injector.NULL; the table viewport context forwards to its parent with InjectOptions '
             'while intentionally hiding CDK_VIRTUAL_SCROLL_VIEWPORT during construction. These are distinct routes. '
             'This corrects the overbroad earlier statement that all four forward through Injector.NULL. '
             'The complete original source observations, applicability decision and runtime/floor obligations are unchanged.')
write(correction_path, {'schema_version': 1, 'line': line, 'sha': subject, 'correction': corrected, 'routes': routes,
      'producer': ref(prefix + 'injector-correction.py'), 'original_source_observations_changed': False,
      'product_changed': False, 'actual_native_or_floor_qualified': False, 'g11_claim': 'not-passed'})
ledger_path = root / 'compatibility/f10/disposition-ledger/ledger.json'
prior = json.loads(ledger_path.read_text())
ledger = copy.deepcopy(prior)
entry = next(n for n in ledger['entries'] if n['sha'] == subject)
old_evidence = ref(entry['evidence_report'])
evidence = json.loads((root / entry['evidence_report']).read_text())
wrong = 'Four owned public-constructor contexts already accept and forward notFoundValue through public Injector.NULL, without copying this test injector.'
assert wrong in entry['reason'] and wrong in evidence['decision']
replacement = ('Three owned borrowed-dependency constructor contexts forward notFoundValue through public Injector.NULL; '
               'the distinct table viewport wrapper forwards it to its parent together with InjectOptions, except for '
               'the intentionally hidden viewport token. No upstream test injector is copied.')
for item in [entry, evidence]:
    key = 'reason' if item is entry else 'decision'
    item[key] = item[key].replace(wrong, replacement)
proof = copy.deepcopy(entry['individual_proof'])
proof['decision'] = entry['reason']
proof['source_evidence'] += [ref(correction_path), ref(prefix + 'injector-correction.py')]
evidence['individual_proof'] = proof
evidence['independent_source_evidence'] = proof['source_evidence']
evidence['source_note_correction'] = {**ref(correction_path), 'supersedes_narrative': old_evidence,
    'historical_observation_pins_and_source_report_remain_unchanged': True}
for note in evidence['per_file_reviews']:
    if note['path'] == 'src/cdk/portal/portal.spec.ts':
        note['review'] = note['review'].replace(
            'Four owned public-constructor contexts already forward optional fallback to public Injector.NULL;',
            'Three borrowed-dependency contexts use public Injector.NULL; the distinct viewport wrapper uses its parent and InjectOptions;')
for hunk in evidence['hunk_reviews']:
    if hunk['path'] == 'src/cdk/portal/portal.spec.ts':
        hunk['judgment'] = next(n['review'] for n in evidence['per_file_reviews'] if n['path'] == hunk['path'])
new_path = 'compatibility/f10/disposition-ledger/evidence/mixed-fixture-build-injector-corrected-' + subject + '.json'
write(new_path, evidence)
entry['evidence_report'] = new_path
entry['individual_proof'] = proof
entry['source_check']['evidence_report_sha256'] = ref(new_path)['sha256']
entry['source_note_correction'] = ref(correction_path)
assert [n for n in ledger['entries'] if n['sha'] != subject] == [n for n in prior['entries'] if n['sha'] != subject]
assert {k: v for k, v in ledger.items() if k != 'entries'} == {k: v for k, v in prior.items() if k != 'entries'}
ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
print(json.dumps({'line': line, 'corrected_source_notes': 1, 'other1696_entries_exact': True,
                  'null_routes': 3, 'parent_and_options_routes': 1, 'actual_native_or_floor_qualified': False}))
