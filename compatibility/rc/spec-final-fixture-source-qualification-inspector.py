# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record four reviewed original-source decisions without runtime admission."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

PREFIX = 'compatibility/rc/spec-final-fixture-source-'
SHAS = ['2600e0d7970960f126acd57967815f88e5c2be81',
        '4e0ea8e7dc8033a30e84c64b42eda5899c7ddacf',
        '357cfd3b8d5fa9505215914b10de27c148f7a02d',
        '79c67d40f4fa4ca636be0157711bc33bca32fb81']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--short-line', required=True, choices=['main', '21'])
    args = parser.parse_args()
    root, short = args.root, args.short_line
    line = 'main' if short == 'main' else '21.x'

    def ref(path):
        return {'path': path, 'sha256': digest((root / path).read_bytes())}

    def write(path, data, compressed=False):
        raw = (json.dumps(data, indent=2) + '\n').encode()
        with (root / path).open('xb') as output:
            output.write(gzip.compress(raw, mtime=0) if compressed else raw)

    report = json.loads(Path('/tmp/ngx-final-fixture-review-' + short + '-20261016.json').read_text())
    controls = json.loads(Path('/tmp/ngx-final-fixture-controls-' + short + '-20261016.json').read_text())
    python_log = Path('/tmp/ngx-final-fixture-python-' + short + '-20261016.log').read_text()
    assert report['line'] == controls['line'] == line
    assert report['paired_cases'] == controls['paired_original_cases'] == 4001
    assert report['complete_original_files'] == 84 and report['complete_original_hunks'] == 536
    assert controls['negative_controls'] == 181 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert not report['actual_Angular_native_artifact_or_floor_qualified']
    assert 'Ran 1 test' in python_log and python_log.endswith('OK\n')
    context = json.loads((root / 'compatibility/rc/spec-stability-context-checkpoint.json').read_text())
    for member in context['output_metadata']:
        if member['path'] != 'compatibility/f10/disposition-ledger/ledger.json':
            assert ref(member['path']) == member
    pins = json.loads(gzip.decompress((root / (PREFIX + 'observation-pins.json.gz')).read_bytes()))
    originals = json.loads(gzip.decompress((root / (PREFIX + 'subjects.json.gz')).read_bytes()))
    assert [n['sha'] for n in report['subjects']] == [n['sha'] for n in pins['subjects']] == SHAS
    ledger_path = root / 'compatibility/f10/disposition-ledger/ledger.json'
    prior_raw = ledger_path.read_bytes()
    prior = json.loads(prior_raw)
    ledger = copy.deepcopy(prior)
    others = [n for n in prior['entries'] if n['sha'] not in SHAS]
    selected = [n for n in prior['entries'] if n['sha'] in SHAS]
    assert len(others) == 1693 and len(selected) == 4
    assert all(not n.get('source_conclusion_only') for n in selected)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    write(PREFIX + 'prior.json.gz', {'schema_version': 1, 'line': line, 'source_parent': head,
          'ledger_sha256': digest(prior_raw), 'selected_entries': selected,
          'other1693_entries_canonical_sha256': digest(json.dumps(others, sort_keys=True, separators=(',', ':')).encode()),
          'all_other_ledger_metadata_unchanged': True, 'actual_native_artifact_or_floor_qualified': False}, True)
    write(PREFIX + 'review.json.gz', report, True)
    write(PREFIX + 'controls.json', controls)
    (root / (PREFIX + 'python.log.gz')).write_bytes(gzip.compress(python_log.encode(), mtime=0))
    cyph = Path('/home/parallels/cyph')
    cyph_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cyph, text=True).strip()
    cyph_status = subprocess.check_output(['git', 'status', '--porcelain'], cwd=cyph, text=True)
    paths = ['shared/js/cyph/modules/cyph-shared.module.ts', 'shared/js/cyph/modules/cyph-web.module.ts',
             'shared/js/cyph/components/search-bar/search-bar.component.html',
             'shared/js/cyph/components/email-compose/email-compose.component.html',
             'shared/js/cyph/components/dynamic-form/dynamic-form.component.html', 'shared/css/mixins.scss']
    assert 'BrowserAnimationsModule' in (cyph / paths[0]).read_text()
    assert "@angular/material/legacy-select" in (cyph / paths[0]).read_text()
    assert "@angular/material/legacy-menu" in (cyph / paths[1]).read_text()
    assert 'mat-chip-list' in (cyph / paths[2]).read_text()
    assert '.mat-tab-label-content' in (cyph / paths[5]).read_text()
    bindings = ['testing/legacy-runner/adapt-spec.mjs', 'testing/legacy-runner/init-test-env.ts',
                'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts',
                'projects/ngx-material-legacy/legacy-menu/menu.spec.ts',
                'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
                'projects/ngx-material-legacy/legacy-table/table.spec.ts',
                'projects/ngx-material-legacy/legacy-tabs/tab-group.spec.ts',
                'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts']
    # Owned tests, public/manual construction, original modules and legacy DOM remain live inputs.
    assert 'should clear the show timeout on destroy' in (root / bindings[2]).read_text()
    assert 'should clear the hide timeout on destroy' in (root / bindings[2]).read_text()
    for path in bindings:
        assert (root / path).is_file(), path
    write(PREFIX + 'cyph-sanity.json', {'schema_version': 1, 'line': line, 'read_only': True,
          'path': str(cyph), 'head': cyph_head, 'status_porcelain': cyph_status,
          'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in paths],
          'owned_binding_members': [ref(p) for p in bindings],
          'conclusion': 'Cyph retains legacy module imports, actual chip-list/select/menu usage, BrowserAnimationsModule and direct legacy selectors. Upstream private fixture HTML/standalone/provider/timing changes impose no consumer edits. Preserve historical structure, styles, manual construction and temporal/lifetime/error tests.',
          'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
          'consumer_build_browser_or_supported_SSR_provider_executed': False,
          'known_inherited_nonbrowser_edge': ref('compatibility/rc/spec-cdk-async-source-viewport-nonbrowser-observation.json'),
          'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    source_paths = ['scripts/spec-final-fixture-source-review.mjs', 'tests/spec_final_fixture_source_probe.mjs',
                    'tests/test_spec_final_fixture_source.py', PREFIX + 'qualification-inspector.py',
                    'scripts/acquire-final-fixture-originals.py', 'scripts/authenticated-single-spec-review.mjs',
                    'scripts/spec-test-environment-source-review.mjs', 'scripts/spec-overlay-async-source-review.mjs',
                    'scripts/spec-stability-chip-repair.mjs', *bindings,
                    *[PREFIX + s for s in ['subjects.json.gz', 'acquisition.json.gz', 'authentication.json.gz',
                                           'acquisition-checkpoint.json', 'observation-pins.json.gz', 'prior.json.gz',
                                           'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']]]
    refs = [ref(p) for p in source_paths]
    for index, subject in enumerate(originals['subjects']):
        sha = subject['sha']
        entry = next(n for n in ledger['entries'] if n['sha'] == sha)
        review = report['subjects'][index]
        pin = pins['subjects'][index]
        assert review['decision'] == pin['decision']
        reason = review['decision'] + ' Read-only Cyph sanity confirms existing legacy module/markup/style bindings; no consumer edit. Actual packed/native/browser/SSR/compiler/Node/RxJS/exact-peer floors and independent audit remain required.'
        proof = {'proof_kind': 'individual-complete-spec-source-applicability', 'diff_sha256': subject['diff_sha256'],
                 'review_depth': 'individual-compatibility', 'affected_branches': [line], 'decision': reason,
                 'source_conclusion_only': True, 'source_evidence': refs,
                 'actual_upstream_test_Angular_native_packed_or_floor_qualified': False}
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-final-fixture-' + sha + '.json'
        by_path = {f['path']: f['review'] for f in pin['files']}
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
              'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
              'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
              'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
              'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
              'patch_file': PREFIX + sha + '.original.patch', 'diff_sha256': subject['diff_sha256'],
              'hunk_reviews': [{**n, 'judgment': by_path[n['path']]} for n in review['hunks']],
              'per_file_reviews': [{'path': f['path'], 'judgment': f['review']} for f in pin['files']],
              'semantics': {k: v for k, v in review.items() if k not in ['files', 'hunks']},
              'whole_original_frames': ref(PREFIX + 'review.json.gz'), 'decision': reason,
              'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
              'individual_proof': proof, 'independent_source_evidence': refs,
              'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': reason,
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [m['path'] for m in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-final-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'source_decisions': 4, 'other_entries_exact': 1693,
                      'source_conclusion_only': True, 'actual_native_artifact_or_floor_qualified': False}))


if __name__ == '__main__':
    main()
