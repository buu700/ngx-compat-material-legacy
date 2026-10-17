# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record four individual mixed-source judgments, retaining inherited execution failure."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

PREFIX = 'compatibility/rc/mixed-cdk-behavior-source-'
SHAS = ['d8a6c3edd8d406b3f1b1c26805612eac8856b745',
        '5233a43d871fc09b302937286ecafff54e28fe14',
        '4f3c931072f9361c24c105a3a7be181340d78819',
        '0612c6a8725d360100548d90c1e3f40d62aa67b6']


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

    report = json.loads(Path('/tmp/ngx-mixed-cdk-review-' + short + '-20261016.json').read_text())
    controls = json.loads(Path('/tmp/ngx-mixed-cdk-controls-' + short + '-20261016.json').read_text())
    python_log = Path('/tmp/ngx-mixed-cdk-python-' + short + '-20261016.log').read_text()
    assert report['line'] == controls['line'] == line
    assert controls['negative_controls'] == 64 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert controls['helper'] == ref('scripts/mixed-cdk-behavior-source-review.mjs')
    assert controls['producer'] == ref('tests/mixed_cdk_behavior_source_probe.mjs')
    assert 'Ran 1 test' in python_log and python_log.endswith('OK\n')
    assert report['complete_original_files'] == 11 and report['complete_original_hunks'] == 21
    assert not report['actual_Angular_native_artifact_browser_SSR_or_floor_qualified']
    context = json.loads((root / 'compatibility/rc/spec-stability-context-checkpoint.json').read_text())
    for member in context['output_metadata']:
        if member['path'] != 'compatibility/f10/disposition-ledger/ledger.json':
            assert ref(member['path']) == member
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
          'all_other_ledger_metadata_unchanged': True, 'actual_native_or_floor_qualified': False}, True)
    write(PREFIX + 'review.json.gz', report, True)
    write(PREFIX + 'controls.json', controls)
    (root / (PREFIX + 'python.log.gz')).write_bytes(gzip.compress(python_log.encode(), mtime=0))
    pins = json.loads(gzip.decompress((root / (PREFIX + 'observation-pins.json.gz')).read_bytes()))
    originals = json.loads(gzip.decompress((root / (PREFIX + 'subjects.json.gz')).read_bytes()))
    assert [n['sha'] for n in pins['subjects']] == [n['sha'] for n in originals['subjects']] == SHAS
    cyph = Path('/home/parallels/cyph')
    consumer_paths = ['shared/js/cyph/modules/cyph-shared.module.ts',
                      'shared/js/cyph/modules/cyph-web.module.ts',
                      'shared/js/cyph/components/search-bar/search-bar.component.html',
                      'shared/js/cyph/components/email-view/email-view.component.html', 'shared/css/mixins.scss']
    assert 'BrowserAnimationsModule' in (cyph / consumer_paths[0]).read_text()
    assert "@angular/material/legacy-select" in (cyph / consumer_paths[0]).read_text()
    assert "@angular/material/expansion" in (cyph / consumer_paths[1]).read_text()
    assert 'mat-chip-list' in (cyph / consumer_paths[2]).read_text()
    assert 'mat-expansion-panel' in (cyph / consumer_paths[3]).read_text()
    assert '.mat-tab-label-content' in (cyph / consumer_paths[4]).read_text()
    write(PREFIX + 'cyph-sanity.json', {'schema_version': 1, 'line': line, 'read_only': True,
          'path': str(cyph), 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cyph, text=True).strip(),
          'status_porcelain': subprocess.check_output(['git', 'status', '--porcelain'], cwd=cyph, text=True),
          'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
          'conclusion': 'Legacy controls, actual chip-list/select/tabs structure, direct selectors and BrowserAnimationsModule remain. Cyph public expansion is a peer rather than a legacy fork. No new dependency, consumer TS/API, HTML, CSS or SCSS edit is required by these four source decisions. Observer NgZone delivery and real content/renderer/lifetime/floor behavior remain execution obligations.',
          'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
          'consumer_build_or_browser_executed': False, 'actual_native_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    owned = json.loads((root / (PREFIX + 'intake.json')).read_text())['owned_observer_routes_read']
    for member in owned:
        assert ref(member['path']) == member
    source_paths = ['scripts/mixed-cdk-behavior-source-review.mjs', 'tests/mixed_cdk_behavior_source_probe.mjs',
                    'tests/test_mixed_cdk_behavior_source.py', PREFIX + 'qualification-inspector.py',
                    'scripts/spec-test-environment-source-review.mjs', 'scripts/spec-overlay-async-source-review.mjs',
                    'scripts/spec-stability-chip-repair.mjs', 'scripts/upstream-candidate-source-evidence.mjs',
                    'scripts/acquire-mixed-cdk-originals.py', PREFIX + 'authenticator.mjs',
                    'compatibility/rc/material-public-subjects.json',
                    *[PREFIX + n for n in ['subjects.json.gz', 'acquisition.json.gz', 'authentication.json.gz',
                                           'acquisition-checkpoint.json', 'published-peer-floors.json.gz',
                                           'observation-pins.json.gz', 'prior.json.gz', 'review.json.gz',
                                           'controls.json', 'python.log.gz', 'cyph-sanity.json']]]
    refs = [ref(p) for p in source_paths] + owned
    for index, subject in enumerate(originals['subjects']):
        pin, review = pins['subjects'][index], report['subjects'][index]
        entry = next(n for n in ledger['entries'] if n['sha'] == subject['sha'])
        reason = pin['review'] + ' Exact compiler/Node/RxJS/peer floors, consumer/SSR/browser gates and independent audit remain separate. No publication.'
        proof = {'proof_kind': 'individual-complete-mixed-cdk-source-applicability',
                 'diff_sha256': subject['diff_sha256'], 'review_depth': 'individual-compatibility',
                 'affected_branches': [line], 'decision': reason, 'source_conclusion_only': True,
                 'source_evidence': refs, 'actual_upstream_test_Angular_native_packed_or_floor_qualified': False}
        # Source evidence never manufactures the installed_member / executed-delegation fields.
        # The inherited observer therefore remains insufficient for G11 until genuine execution.
        if index == 0:
            proof['inherited_public_peer_runtime_delegation_required'] = True
            assert 'installed_member' not in proof and 'reachable_behavior' not in proof
        evidence = 'compatibility/f10/disposition-ledger/evidence/mixed-cdk-behavior-' + subject['sha'] + '.json'
        by_path = {n['path']: n['review'] for n in pin['per_file_reviews']}
        write(evidence, {'schema_version': 1, 'line': line, 'sha': subject['sha'], 'subject': subject['subject'],
              'status': 'reviewed', 'final_disposition': pin['disposition'], 'review_depth': 'individual-compatibility',
              'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
              'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
              'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
              'patch_file': PREFIX + subject['sha'] + '.original.patch', 'diff_sha256': subject['diff_sha256'],
              'hunk_reviews': [{**n, 'judgment': by_path[n['path']]} for n in review['hunks']],
              'per_file_reviews': pin['per_file_reviews'],
              'source_semantics': {k: v for k, v in review.items() if k not in ['specs', 'hunks', 'before', 'after', 'behavior', 'retained_cases', 'added_cases']},
              'whole_original_frames': ref(PREFIX + 'review.json.gz'), 'decision': reason,
              'current_minimum_source_comparisons': report['floor_reviews'],
              'owned_scope': report['owned_scope'], 'prior_entry': copy.deepcopy(entry),
              'prior_snapshot': ref(PREFIX + 'prior.json.gz'), 'individual_proof': proof,
              'independent_source_evidence': refs, 'inherited_observer_runtime_delegation_required': index == 0,
              'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': pin['disposition'], 'reason': reason,
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-mixed-cdk-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in ledger.items() if k != 'entries'} == {k: v for k, v in prior.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'individual_source_judgments': 4, 'other_entries_exact': 1693,
                      'observer_inherited_execution_still_required': True, 'actual_native_or_floor_qualified': False}))


if __name__ == '__main__':
    main()
