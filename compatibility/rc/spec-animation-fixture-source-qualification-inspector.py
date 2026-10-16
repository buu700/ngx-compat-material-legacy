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

SHAS = ['bc0c443e569975e4ddd16a2659104a0e790587e4', 'f60e17f3d176803a2d807f5a50b598809072eb12']
PREFIX = 'compatibility/rc/spec-animation-fixture-source-'
REASONS = [
    "Decline this BrowserAnimationsModule fixture cleanup after individual review of all 29 hunks in nine complete originals. Pair all 465 cases in exact identity/mode/order: 458 complete callbacks retain semantics; seven change only test import setup and preserve every direct/helper predicate. Pair all 53 hooks, with one explicitly reviewed RTL argument shift across the removed defaulted animation-module helper parameter. The two complete private chip/input helper bodies and all symbol-resolved callers are individually reviewed: the chip module parameter is never supplied with a nondefault module, and the input options caller never forwards animations. All 120 classes and 116 template/style properties remain byte-identical. Record ten removed import bindings and no additions or unresolved removed names; all changed references lie in individually reviewed source partitions. All other complete globals remain equal after exact original fixture metadata partitions. Owned historical input error rethrow, focus/directionality, sidenav/tabs lifecycle and animation-mode requirements remain; source comparison proves no compiler, module, initialization, error, timing or lifetime equivalence. Cyph actually imports/exports BrowserAnimationsModule alongside legacy controls and direct legacy style selectors. The owned motion resolver already reads the public MATERIAL_ANIMATIONS config, public ANIMATION_MODULE_TYPE and MediaMatcher without current private animation helpers. This private test preference calls for no product, consumer or TS API edit. Preserve Material 16 HTML/CSS/SCSS and all owned tests. Actual packed/native/browser/SSR/consumer and supported-floor checks remain open.",
    "Decline this NoopAnimationsModule fixture cleanup after individual review of all 149 hunks in 52 complete originals. Pair all 1918 cases in exact retained order, including one individually reviewed ripple label change; 1894 complete callbacks retain semantics and 24 change. Individually account for 15 chip setup relocations, one menu destruction/focus extra-import argument, the ripple extra-imports-to-providers change, a removed snackbar configuration-chain call and six metadata-only callback updates. All direct and assertion-helper predicates remain identical. Hooks decrease from 230 to 226: three chip setups move into named cases and one module-only dialog-opener fakeAsync hook disappears; all 226 retained hook bodies match after exact fixture-setup projection. Four removed enclosing chip variables and three full private helper changes are explicitly accounted for. Seven chip cases and one menu active-item destruction case still pass NoopAnimationsModule, with upstream failure comments; these are source facts, not reproduced owned-library defects or an engine-free guarantee. All 319 classes and 311 template/style properties remain byte-identical. Resolve 51 removed and 29 added binding identities/references, with no unresolved removed names; current fixture MATERIAL_ANIMATIONS providers are pinned exactly to animationsDisabled=true. The owned resolver already consumes that public config as well as ANIMATION_MODULE_TYPE and reduced motion, while preserving legacy lifecycle policy and distinct tokens. No current private helper, modern component/API mirror, animation-engine fork or required consumer edit is introduced. Cyph retains actual legacy chip-list/menu/dialog/select/tooltip and BrowserAnimationsModule integration. Preserve stronger owned focus/destruction tests and Material16 HTML/CSS/SCSS; no native initialization/error/timing/lifetime equivalence is claimed. Actual packed/native/browser/SSR/public-peer and supported-floor admission remains required."
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

    report = json.loads((args.reports / ('ngx-animation-fixture-source-' + short + '-verified-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-animation-fixture-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-animation-fixture-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 125 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 2383 and report['complete_original_hunks'] == 178
    assert controls['source_helper_sha256'] == ref('scripts/spec-animation-fixture-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_animation_fixture_source_probe.mjs')['sha256']
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
    assert head == {'main': 'afc92c2af5d0b3fcd125ec617f3c7ff67a2a2555',
                    '21': '3f05dbd537f8869cdb80ac009e7e0f82e32b6f6a'}[short]
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
    assert 'BrowserAnimationsModule' in shared
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
                'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts',
                'projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts']
    animation_source = (root / bindings[5]).read_text()
    assert all(n in animation_source for n in ['MATERIAL_ANIMATIONS', 'ANIMATION_MODULE_TYPE', 'MediaMatcher', "materialConfig?.animationsDisabled"])
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
            'animation_integration': 'Cyph imports/exports BrowserAnimationsModule with actual legacy controls. The owned motion resolver already reads public MATERIAL_ANIMATIONS, ANIMATION_MODULE_TYPE and reduced motion; fixture-module deletions prove no native lifecycle or provider equivalence.',
            'chips': 'Actual legacy chips module, chip-list and chip-input bindings; modern grid/listbox fixtures authorize no legacy template or API mirror.',
            'removed_imports_and_setup': 'Public text-field and bidi/accessibility/overlay/table integrations remain obligations. Research ARIA test paths authorize no new peer or minimum.',
            'remaining_Material': 'Actual list/radio/paginator/table/tooltip/menu/autocomplete consumer imports, markup and retained styles.'},
        'known_inherited_nonbrowser_edge_still_open': ref('compatibility/rc/spec-cdk-async-source-viewport-nonbrowser-observation.json'),
        'conclusion': 'Retain Material 16 structure/styles and all owned tests. Fixture-only animation-module/provider changes do not establish consumer module or public-peer lifecycle behavior equivalence. No consumer or product edit. Actual runtime/SSR/floor admission remains separate.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-animation-fixture-source-review.mjs',
             'tests/spec_animation_fixture_source_probe.mjs', 'tests/test_spec_animation_fixture_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins-v2.json.gz', 'pin-revision.json',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']],
             'compatibility/rc/spec-import-cleanup-source-checkpoint.json',
             'compatibility/rc/spec-import-cleanup-source-replay-checkpoint.json',
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
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-animation-fixture-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'files', 'changed_callback_reviews', 'removed_hook_reviews', 'private_helper_reviews', 'retained_hooks']}
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated originals; per-file raw/position/ancestry partitions; every import binding and reference; all2383 ordered case identities/modes with one reviewed ripple rename;2352 unchanged callbacks and31 individual named source judgments; complete direct/assertion-helper predicates;279 retained hooks with one RTL source exception and four exact hook removals; five fully reviewed private helper pairs/callers; four scope-bound removed chip variables;439 classes and427 raw template/style properties; all remaining non-scaffold globals equal. Eight explicit NoopAnimationsModule call exceptions remain. No compiler, initialization, error, native focus, timing or lifetime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-animation-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 2, 'other_entries_exact': 1695,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
