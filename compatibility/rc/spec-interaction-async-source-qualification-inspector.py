# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record only four individually qualified source decisions; never runtime admission."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

SHAS = ['dba28ae0ac585cede26b3846e87c0e1169a4ce73', 'b04751caf2ec3f0b8f8d8ef17dd6e5a8c34adfd6', '5006b416b4f20e1138793b33aaedc879a4f4b931', '0411926e7d8ae06b32236ec1048a888cfad5abf2']
PREFIX = 'compatibility/rc/spec-interaction-async-source-'
REASONS = [
    "Decline this accessibility fixture scheduling migration after individual review of all 75 hunks in seven complete originals. All 210 static registrations and 42 hooks pair in exact identity/order; 115 complete callbacks remain semantically identical and 95 change. One focus-trap case changes the focused target from its explicit outside element to document.body while retaining the expected first-element predicate. The other complete nonboundary operations and predicates match after enumerated timing/wrapper changes. All 19 fixture classes and 14 template/style properties remain raw-byte identical; four exact native wait helpers are added and one now-empty testing import is removed. Public FocusMonitor/AriaDescriber/FocusKeyManager and related focus/announcement behavior remain relevant to owned legacy tooltip/chips/menu/input consumers used by Cyph. A private test preference proves no focus-origin, type-ahead, inert, announcement, listener or cleanup equivalence. Preserve existing stronger owned tests, distinct legacy contracts and Material 16 HTML/CSS/SCSS. No CDK fork, new component/API mirror or consumer edit. Actual native/browser/packed/public-peer and supported-floor checks remain required.",
    "Decline this modern chips/autocomplete fixture migration after individual review of all 94 hunks in eight complete originals. Pair all 408 static cases and 43 hooks; 341 complete callbacks retain semantics and 67 change. One chip-grid removal loop changes from synchronous forEach to awaited for-of over a newly isolated Array snapshot: exact initializer, two nonescaping array references, binder, action body and order are independently compared; no native focus/event/timing equivalence is claimed. One reactive-form selection fixture explicitly sets selectable=true. All 39 fixture classes and 39 template/style properties remain raw-byte identical; the existing autocomplete wait helper remains exact and one chip-grid wait helper is added. These are modern chip-grid/listbox/row/option/remove/set fixtures and cannot authorize mirroring those APIs or changing historical chip-list markup. Cyph actually imports legacy chips and uses mat-chip-list/matChipInputFor. Keep the owned chip-list/input behavior, all retained cases including the destroyed active-chip repair, and Material 16 structure/styles. No ordinary component fork or required consumer TS/CSS/SCSS change. Actual forms, selection, keyboard/focus, destruction, packed/native/browser and minimum-floor validation remain open.",
    "Decline this remaining CDK/ARIA fixture cleanup after individual review of all 24 hunks in six complete originals. All 150 static cases and 24 hooks pair; 138 complete callbacks retain semantics and 12 change. Three listbox type-ahead cases remove rest-argument/inner fakeAsync invocation machinery while their setup, actions and predicate expressions remain under explicit complete-source review. Other callback/global operations and predicates match after finite timing changes. All 38 fixture classes and 38 template/style properties remain raw-byte identical; three native wait helpers are added and the obsolete private-observable testing import disappears. The complete patch includes ARIA combobox, public directionality, private observable coercion, listbox, textarea autosize and tree; the research source does not authorize adding an ARIA peer or using APIs absent at the advertised minimum. Owned input exports public TextFieldModule, and existing public bidi/accessibility/table/overlay integrations remain relevant. Preserve owned removed helpers rather than importing current private symbols; infer no runtime exclusion or inherited pass from absent owned modern widgets. No new implementation, selectors, consumer CSS/SCSS or TS API change is required by these private tests. Actual public-peer/consumer/native/browser/SSR and floor checks remain required.",
    "Decline this remaining Material fixture cleanup after individual review of all 35 hunks in seven complete originals. Account for 316 before/314 after static cases: 314 pair in exact retained order, 292 complete callbacks retain semantics and 22 change. Individually pin two deleted tooltip show/hide-timeout destruction observers; both remain in the owned legacy suite. Two touch cases replace fakeAsync timing with explicit Jasmine clock install/tick/uninstall, retaining their visibility predicates; the one added cleanup hook is bound to its touch-suite scope, full raw body and registration ordinal 63. One context-menu setup adds a fixture-only MATERIAL_ANIMATIONS provider with animationsDisabled=true. Four data-source case differences and two exact global property/type names merely replace quoted prop keys with identifiers, retaining values, filters and warnings; they do not mutate consumer maps. All 61 fixture classes and 62 template/style properties remain raw-byte identical, and three existing wait-helper pairs remain exact. Source comparison proves no clock/provider/cleanup/error/render equivalence. Cyph uses legacy list/radio/paginator/table/tooltip/menu/autocomplete contracts; keep all stronger owned tests and Material 16 HTML/CSS/SCSS. No source port, modern mirror, animation-engine fork, new legacy token alias or required consumer edit. Actual packed/native/browser/mixed peer and supported-floor admission remains open."
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

    report = json.loads((args.reports / ('ngx-interaction-async-source-' + short + '-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-interaction-async-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-interaction-async-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 109 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 1082 and report['complete_original_hunks'] == 228
    assert controls['source_helper_sha256'] == ref('scripts/spec-interaction-async-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_interaction_async_source_probe.mjs')['sha256']
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
    assert len(others) == 1693 and len(prior['entries']) == 1697
    selected = [n for n in prior['entries'] if n['sha'] in SHAS]
    assert len(selected) == 4 and all(not n.get('source_conclusion_only') for n in selected)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
    assert head == {'main': '8a9d479496fa5b5d366c852008e8984ad116da84',
                    '21': '6f0eea37bfbe42c1d7e7b26b87fc83504699f776'}[short]
    write(PREFIX + 'prior.json.gz', {
        'schema_version': 1, 'line': line, 'source_parent': head,
        'ledger_sha256': digest(prior_bytes), 'selected_entries': selected,
        'other1693_entries_canonical_sha256': digest(json.dumps(others, sort_keys=True, separators=(',', ':')).encode()),
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
            'accessibility': 'Public FocusMonitor/FocusKeyManager remain used by owned legacy controls which Cyph imports.',
            'chips': 'Actual legacy chips module, chip-list and chip-input bindings; modern grid/listbox fixtures authorize no legacy template or API mirror.',
            'remaining_CDK_ARIA': 'Public text-field and bidi/accessibility/overlay/table integrations remain obligations. Research ARIA test paths authorize no new peer or minimum.',
            'remaining_Material': 'Actual list/radio/paginator/table/tooltip/menu/autocomplete consumer imports, markup and retained styles.'},
        'known_inherited_nonbrowser_edge_still_open': ref('compatibility/rc/spec-cdk-async-source-viewport-nonbrowser-observation.json'),
        'conclusion': 'Retain Material 16 structure/styles and all owned tests, including two tooltip destruction cases removed upstream. No consumer or product edit. Actual runtime/SSR/floor admission remains separate.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-interaction-async-source-review.mjs',
             'tests/spec_interaction_async_source_probe.mjs', 'tests/test_spec_interaction_async_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins.json',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']],
             'compatibility/rc/spec-cdk-async-source-checkpoint.json',
             'compatibility/rc/spec-cdk-async-source-replay-checkpoint.json',
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
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-interaction-async-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'pairs', 'hooks', 'globals', 'classes', 'templates', 'geometry_helpers']}
        summary.update({'paired_cases': len(semantics['pairs']), 'hooks': len(semantics['hooks']),
                        'fixture_classes': len(semantics['classes']), 'template_style_properties': len(semantics['templates'])})
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated program; all ordered cases/hooks, finite boundary/await statements, twelve individually reviewed focus/loop/setup/wrapper/key-spelling/clock case deltas, two removed destruction cases, one provider hook exception, one position-bound cleanup hook, one isolated Array loop action proof, exact import deltas and added/unchanged wait helpers, exact imports, complete globals/helpers/classes/templates. No runtime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-interaction-async-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 4, 'other_entries_exact': 1693,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
