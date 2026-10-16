# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record only two individually qualified source decisions; never runtime admission."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

SHAS = ['fa0f514fce6a166cf38eb4c31e90959c932f97b6', '409948f39781c74dc2f69c1501180a17b10492a2']
PREFIX = 'compatibility/rc/spec-import-cleanup-source-'
REASONS = [
    "Decline this CommonModule fixture migration after individual review of all 96 hunks in 16 complete originals. All 595 case identities, modes and order remain; 593 complete callbacks retain semantics and two remove a CommonModule helper argument or test-module import. All 67 hooks remain. Enumerate every exact original imports/decorator/setup/wrapper projection with full raw source, positions and ancestry; the remaining complete programs and interleaved registrations match. Retain all 125 template/style properties byte-for-byte. Resolve every import binding and reference locally: 16 CommonModule bindings disappear and one explicit AsyncPipe binding is added only in fixture metadata. No changed binding escapes enumerated scaffolding and no removed name remains unresolved. The original tagged legacy tests and consumer module setup have their own requirements; deleting CommonModule from modern standalone fixtures authorizes no deletion from legacy NgModule setup, compiler guarantee, component fork or public-peer API change. Cyph imports and renders legacy controls with Material 16 markup and direct legacy selectors. Keep existing product, tests, distinct tokens, HTML/CSS/SCSS and no required consumer CSS/SCSS changes. Actual compiler, packed/native/browser/SSR, integration and supported-floor checks remain open.",
    "Decline this unused-import/setup fixture cleanup after individual review of all 92 hunks in 46 complete originals. All 1054 case identities, modes and order remain; 1053 complete callbacks retain semantics and one drops only the LiveAnnouncer test-module import. Hooks decrease from 189 to 163 through exactly inventoried setup-only elisions and wrapper changes; all other complete-program operations and retained registration interleaving match. Retain 101 template/style properties byte-for-byte. The one deleted ConnectedOverlayPropertyInitOrder class has exactly one reference, in the removed setup import list, and no test-instance reference; its deleted template is explicitly accounted for. Resolve 17 removed import identities and references, with no additions or unresolved removed names. Two local table-scroll helper parameters have exact empty-array defaults, each one forwarding/setup use, and only default-argument call sites; helper escape or an extra use is rejected. Account for the exact providers shorthand change. This complete source proof establishes no compiler, initialization, scheduling, error, render or destruction equivalence. Public CDK accessibility, overlay, scrolling, directionality and table integrations used by owned legacy controls remain obligations, including the known inherited nonbrowser synthetic edge awaiting actual supported SSR-provider assessment. Preserve owned stronger tests, public-peer bindings, distinct legacy contracts and Material 16 structure/styles. No source port, new peer/API mirror or consumer edit is needed from this private fixture preference. Actual packed/native/browser/SSR and supported-floor admission remains open."
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--reports', required=True, type=Path)
    parser.add_argument('--short-line', required=True, choices=['main', '21'])
    args = parser.parse_args()
    root, short = args.root, args.short_line
    line = 'main' if short == 'main' else '21.x'

    def ref(path):
        return {'path': path, 'sha256': digest((root / path).read_bytes())}

    def write(path, data, compressed=False):
        target = root / path
        raw = (json.dumps(data, indent=2) + '\n').encode()
        with target.open('xb') as output:
            output.write(gzip.compress(raw, mtime=0) if compressed else raw)

    report = json.loads((args.reports / ('ngx-import-cleanup-source-' + short + '-verified-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-import-cleanup-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-import-cleanup-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 97 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 1649 and report['complete_original_hunks'] == 188
    assert controls['source_helper_sha256'] == ref('scripts/spec-import-cleanup-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_import_cleanup_source_probe.mjs')['sha256']
    assert not report['actual_Angular_native_artifact_or_floor_qualified']
    assert 'Ran 1 test' in log and log.endswith('OK\n')
    context = json.loads((root / 'compatibility/rc/spec-stability-context-checkpoint.json').read_text())
    for member in context['output_metadata']:
        if member['path'] != 'compatibility/f10/disposition-ledger/ledger.json':
            assert ref(member['path']) == member
    ledger_path = root / 'compatibility/f10/disposition-ledger/ledger.json'
    prior_bytes = ledger_path.read_bytes()
    prior = json.loads(prior_bytes)
    ledger = copy.deepcopy(prior)
    others = [n for n in prior['entries'] if n['sha'] not in SHAS]
    assert len(others) == 1695 and len(prior['entries']) == 1697
    selected = [n for n in prior['entries'] if n['sha'] in SHAS]
    assert len(selected) == 2 and all(not n.get('source_conclusion_only') for n in selected)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
    assert head == {'main': '622c4f2392959b2c79a343e32d6d6f0e6aba9ed4',
                    '21': '2177a7de303598a45ee8e458573e1a756b8eea96'}[short]
    write(PREFIX + 'prior.json.gz', {
        'schema_version': 1, 'line': line, 'source_parent': head,
        'ledger_sha256': digest(prior_bytes), 'selected_entries': selected,
        'other1695_entries_canonical_sha256': digest(json.dumps(others, sort_keys=True, separators=(',', ':')).encode()),
        'all_other_ledger_metadata_unchanged': True, 'product_changes': 0,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}, True)
    write(PREFIX + 'review.json.gz', report, True)
    write(PREFIX + 'controls.json', controls)
    with (root / (PREFIX + 'python.log.gz')).open('xb') as output:
        output.write(gzip.compress(log.encode(), mtime=0))
    cyph = Path('/home/parallels/cyph')
    cyph_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=cyph).decode().strip()
    assert cyph_head == 'a56a0603636cac5aaabe8fe408f7429b4224f011'
    assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=cyph).strip()
    consumer_paths = ['shared/js/cyph/modules/cyph-shared.module.ts',
                      'shared/js/cyph/modules/cyph-web.module.ts',
                      'shared/js/cyph/components/search-bar/search-bar.component.html',
                      'shared/js/cyph/components/email-compose/email-compose.component.html',
                      'shared/js/cyph/components/dynamic-form/dynamic-form.component.html',
                      'shared/js/cyph/components/account-base-file-list/account-base-file-list.component.html',
                      'shared/js/cyph/components/account-notes/account-notes.component.html',
                      'shared/js/cyph/components/email-compose/email-compose.component.scss',
                      'shared/css/cyph.base.scss']
    shared = (cyph / consumer_paths[0]).read_text()
    web = (cyph / consumer_paths[1]).read_text()
    assert all(n in shared for n in ['@angular/material/legacy-chips', '@angular/material/legacy-radio', '@angular/material/legacy-tooltip', '@angular/material/legacy-list', '@angular/material/legacy-autocomplete'])
    assert all(n in web for n in ['@angular/material/legacy-paginator', '@angular/material/legacy-menu', '@angular/material/legacy-table'])
    assert all(n in (cyph / consumer_paths[2]).read_text() for n in ['<mat-chip-list', '[matChipInputFor]', 'mat-autocomplete'])
    assert all(n in (cyph / consumer_paths[3]).read_text() for n in ['<mat-chip-list', '[matChipInputFor]'])
    assert '<mat-radio-group' in (cyph / consumer_paths[4]).read_text()
    assert all(n in (cyph / consumer_paths[5]).read_text() for n in ['<mat-table', '<mat-paginator'])
    assert 'matTooltip' in (cyph / consumer_paths[6]).read_text()
    assert '.mat-select-panel' in (cyph / consumer_paths[7]).read_text()
    assert '.mat-tooltip' in (cyph / consumer_paths[8]).read_text()
    bindings = ['projects/ngx-material-legacy/legacy-chips/chip-list.ts',
                'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
                'projects/ngx-material-legacy/legacy-input/input-module.ts',
                'projects/ngx-material-legacy/legacy-table/internal/table-data-source-base.ts',
                'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts']
    assert 'FocusKeyManager' in (root / bindings[0]).read_text()
    assert 'FocusMonitor' in (root / bindings[1]).read_text()
    assert 'TextFieldModule' in (root / bindings[2]).read_text()
    tooltip_tests = (root / bindings[4]).read_text()
    assert all(n in tooltip_tests for n in ['should clear the show timeout on destroy', 'should clear the hide timeout on destroy'])
    write(PREFIX + 'cyph-sanity.json', {
        'schema_version': 1, 'line': line, 'path': str(cyph), 'head': cyph_head,
        'clean': True, 'read_only': True,
        'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
        'owned_public_peer_binding_members': [ref(p) for p in bindings],
        'reachable_contracts': {
            'CommonModule': 'Cyph uses historical legacy controls and public modules; modern standalone fixture setup does not replace consumer or owned NgModule requirements.',
            'chips': 'Actual legacy chips module, chip-list and chip-input bindings; modern grid/listbox fixtures authorize no legacy template or API mirror.',
            'removed_imports_and_setup': 'Public text-field and bidi/accessibility/overlay/table integrations remain obligations. Research ARIA test paths authorize no new peer or minimum.',
            'remaining_Material': 'Actual list/radio/paginator/table/tooltip/menu/autocomplete consumer imports, markup and retained styles.'},
        'known_inherited_nonbrowser_edge_still_open': ref('compatibility/rc/spec-cdk-async-source-viewport-nonbrowser-observation.json'),
        'conclusion': 'Retain Material 16 structure/styles and all owned tests. Fixture-only CommonModule/import removals do not establish consumer module or public-peer behavior equivalence. No consumer or product edit. Actual runtime/SSR/floor admission remains separate.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-import-cleanup-source-review.mjs',
             'tests/spec_import_cleanup_source_probe.mjs', 'tests/test_spec_import_cleanup_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins.json.gz',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']],
             'compatibility/rc/spec-interaction-async-source-checkpoint.json',
             'compatibility/rc/spec-interaction-async-source-replay-checkpoint.json',
             'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
             'projects/ngx-material-legacy/legacy-table/table.ts',
             'projects/ngx-material-legacy/legacy-chips/chip-list.ts',
             'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
             'projects/ngx-material-legacy/legacy-select/internal/select-base.ts']
    refs = [ref(p) for p in paths]
    originals = json.loads(gzip.decompress((root / (PREFIX + 'subjects.json.gz')).read_bytes()))
    assert [n['sha'] for n in originals['subjects']] == SHAS
    for i, subject in enumerate(originals['subjects']):
        sha = subject['sha']
        entry = next(n for n in ledger['entries'] if n['sha'] == sha)
        semantics = report['subjects'][i]
        proof = {'proof_kind': 'individual-complete-spec-source-applicability',
                 'diff_sha256': subject['diff_sha256'], 'review_depth': 'individual-compatibility',
                 'affected_branches': [line], 'decision': REASONS[i], 'source_conclusion_only': True,
                 'source_evidence': refs, 'actual_upstream_test_Angular_native_packed_or_floor_qualified': False}
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-import-cleanup-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'files', 'cases']}
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated program; exact per-file ordered normalization records with raw source, positions and ancestry; binding identities/references; all 1649 case identities/modes/order; three exact callback import-setup changes; finite hook elisions and preserved non-scaffold registration interleaving; retained templates/styles; sole removed private class reference in removed metadata; two default-only local helper signatures and single uses; full remaining program equality. No compiler, initialization, timing, error, render or lifetime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-import-cleanup-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 2, 'other_entries_exact': 1695,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
