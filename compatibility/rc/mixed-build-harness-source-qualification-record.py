# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record four individual build/harness/lint/bootstrap source decisions; preserve all runtime admission failures."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

PREFIX = 'compatibility/rc/mixed-build-harness-source-'
SHAS = ['f3602573ad8c79ccbcf76ac2355a9a95ab377566', '47b3be5f6fe9bc23e62b2036210ec31f79ab22d4',
        'f81b620f62179350d008b069d0d7228695a00ce0', '3da71ce7f921f16392bf454eddbd1c421bfbdd32']


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--short-line', choices=['main', '21'], required=True)
    args = parser.parse_args()
    root, short = args.root, args.short_line
    line = 'main' if short == 'main' else '21.x'

    def ref(path):
        return {'path': path, 'sha256': digest((root / path).read_bytes())}

    def write(path, data, compressed=False):
        raw = (json.dumps(data, indent=2) + '\n').encode()
        with (root / path).open('xb') as output:
            output.write(gzip.compress(raw, mtime=0) if compressed else raw)

    report = json.loads(Path('/tmp/ngx-build-harness-review-' + short + '-20261017.json').read_text())
    controls = json.loads(Path('/tmp/ngx-build-harness-controls-' + short + '-20261017.json').read_text())
    log = Path('/tmp/ngx-build-harness-python-' + short + '-20261017.log').read_text()
    assert report['line'] == controls['line'] == line
    assert controls['negative_controls'] == 313 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert controls['helper'] == ref('scripts/mixed-build-harness-source-review.mjs')
    assert controls['producer'] == ref('tests/mixed_build_harness_source_probe.mjs')
    assert 'Ran 1 test' in log and log.endswith('OK\n')
    assert (report['complete_original_files'], report['complete_original_hunks'], report['retained_source_case_identities']) == (110, 1118, 3016)
    assert not report['actual_original_tool_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified']
    pins = json.loads(gzip.decompress((root / (PREFIX + 'observation-pins.json.gz')).read_bytes()))
    originals = json.loads(gzip.decompress((root / (PREFIX + 'subjects.json.gz')).read_bytes()))
    assert [n['sha'] for n in pins['subjects']] == [n['sha'] for n in originals['subjects']] == SHAS
    ledger_path = root / 'compatibility/f10/disposition-ledger/ledger.json'
    raw = ledger_path.read_bytes()
    prior = json.loads(raw)
    ledger = copy.deepcopy(prior)
    others = [n for n in prior['entries'] if n['sha'] not in SHAS]
    selected = [n for n in prior['entries'] if n['sha'] in SHAS]
    assert len(others) == 1693 and len(selected) == 4
    assert all(not n.get('source_conclusion_only') for n in selected)
    write(PREFIX + 'prior.json.gz', {'schema_version': 1, 'line': line,
          'source_parent': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
          'ledger_sha256': digest(raw), 'selected_entries': selected,
          'other1693_entries_canonical_sha256': digest(json.dumps(others, sort_keys=True, separators=(',', ':')).encode()),
          'actual_native_or_floor_qualified': False}, True)
    write(PREFIX + 'review.json.gz', report, True)
    write(PREFIX + 'controls.json', controls)
    with (root / (PREFIX + 'python.log.gz')).open('xb') as output:
        output.write(gzip.compress(log.encode(), mtime=0))
    cyph = Path('/home/parallels/cyph')
    consumer_paths = ['shared/js/cyph/modules/cyph-shared.module.ts',
                      'shared/js/cyph/modules/cyph-web.module.ts', 'shared/css/mixins.scss',
                      'shared/js/cyph/components/search-bar/search-bar.component.html']
    assert 'BrowserAnimationsModule' in (cyph / consumer_paths[0]).read_text()
    assert "@angular/material/legacy-menu" in (cyph / consumer_paths[1]).read_text()
    assert '.mat-tab-label-content' in (cyph / consumer_paths[2]).read_text()
    assert '@angular/material/legacy-dialog' in (cyph / consumer_paths[0]).read_text()
    assert '@angular/material/legacy-chips' in (cyph / consumer_paths[0]).read_text()
    assert '@angular/material/legacy-snack-bar' in (cyph / consumer_paths[1]).read_text()
    assert '<mat-chip-list' in (cyph / consumer_paths[3]).read_text()
    assert '[formControl]' in (cyph / consumer_paths[3]).read_text()
    write(PREFIX + 'cyph-sanity.json', {'schema_version': 1, 'line': line, 'read_only': True,
          'path': str(cyph), 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cyph, text=True).strip(),
          'status_porcelain': subprocess.check_output(['git', 'status', '--porcelain'], cwd=cyph, text=True),
          'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
          'conclusion': 'Cyph retains legacy module recipes, mat-chip-list/formControl, BrowserAnimationsModule and direct legacy style selectors. These four upstream build/harness source decisions require no consumer HTML/CSS/SCSS, builder/configuration or TypeScript API changes. Keep independently owned public zoneful runner preparation, strict stability/error behavior, historical identities and finite module-source migration. Experimental zoneless/bootstrap/tooling changes are not adopted, and archived Yarn bundles carry no internal behavior or security clearance. Exact private tools and published consumer minima remain independent. No consumer build, browser, SSR, actual Angular fixture or advertised-floor pass is claimed.',
          'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
          'consumer_build_or_browser_executed': False, 'actual_native_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    refs = [ref(p) for p in ['scripts/mixed-build-harness-source-review.mjs', 'tests/mixed_build_harness_source_probe.mjs',
        'tests/test_mixed_build_harness_source.py', PREFIX + 'qualification-record.py',
        'scripts/spec-test-environment-source-review.mjs', 'scripts/spec-overlay-async-source-review.mjs',
        'scripts/mixed-zone-moves-source-review.mjs', 'scripts/mixed-compiler-build-source-review.mjs',
        'scripts/spec-stability-chip-repair.mjs', 'scripts/upstream-candidate-source-evidence.mjs',
        'scripts/historical-case-roster.mjs', 'scripts/acquire-mixed-build-harness-originals.py',
        *[PREFIX + n for n in ['authenticator.mjs', 'subjects.json.gz', 'acquisition.json.gz', 'authentication.json.gz', 'acquisition-controls.json', 'acquisition-controls.py', 'acquisition-inspector.mjs',
            'lifecycle-mode-control-results.json', 'lifecycle-mode-controls.mjs', 'acquisition-checkpoint.json', 'intake.json', 'observation-pins.json.gz', 'prior.json.gz',
            'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']]]]
    for index, subject in enumerate(originals['subjects']):
        pin, review = pins['subjects'][index], report['subjects'][index]
        entry = next(n for n in ledger['entries'] if n['sha'] == subject['sha'])
        reason = pin['review'] + ' Exact compiler/Node/RxJS/peer floors, consumer/SSR/browser gates, private command-source reconciliation and independent audit remain separate. No publication.'
        proof = {'proof_kind': 'individual-complete-build-harness-source-applicability',
                 'diff_sha256': subject['diff_sha256'], 'review_depth': 'individual-compatibility',
                 'affected_branches': [line], 'decision': reason, 'source_conclusion_only': True,
                 'source_evidence': refs, 'actual_upstream_test_Angular_native_packed_or_floor_qualified': False}
        evidence = 'compatibility/f10/disposition-ledger/evidence/mixed-build-harness-' + subject['sha'] + '.json'
        by_path = {n['path']: n['review'] for n in pin['per_file_reviews']}
        assert set(by_path) == {n['path'] for n in subject['members']}
        write(evidence, {'schema_version': 1, 'line': line, 'sha': subject['sha'], 'subject': subject['subject'],
              'status': 'reviewed', 'final_disposition': pin['disposition'], 'review_depth': 'individual-compatibility',
              'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
              'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
              'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
              'patch_file': PREFIX + subject['sha'] + '.original.patch', 'diff_sha256': subject['diff_sha256'],
              'hunk_reviews': [{**n, 'judgment': by_path[n['path']]} for n in review['hunks']],
              'per_file_reviews': pin['per_file_reviews'], 'whole_original_frames': ref(PREFIX + 'review.json.gz'),
              'source_semantics': {k: v for k, v in review.items() if k not in ['files', 'pairs', 'hunks', 'complete_source_projections']},
              'source_projection_summary': [{'path': n['path'], 'before_sha256': n['before']['projection_sha256'],
                  'after_sha256': n['after']['projection_sha256'], 'before_excluded': n['before']['excluded'],
                  'after_excluded': n['after']['excluded']} for n in review['complete_source_projections']],
              'decision': reason, 'owned_context': report['owned_context'],
              'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
              'individual_proof': proof, 'independent_source_evidence': refs,
              'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': pin['disposition'], 'reason': reason,
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-build-harness-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in ledger.items() if k != 'entries'} == {k: v for k, v in prior.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'individual_source_judgments': 4, 'other_entries_exact': 1693,
                      'actual_native_or_floor_qualified': False}))


if __name__ == '__main__':
    main()
