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

SHAS = ['cb820b1d8a8d942965790b75b48c21e345c86219', '45582795cc29c3bcb1265b7f6c541b165be3ef9d', 'f35961a095dc2fbee6bfeb09878a82d391932cf7', '96503186a6316cf2811eaa885f64cb5ab1ffed6e']
PREFIX = 'compatibility/rc/spec-navigation-async-source-'
REASONS = [
    "Decline this private sidenav/drawer scheduler migration after reviewing all57 hunks in both complete files. Pair59 cases with four finite label mappings: two insert a missing space in modewhen and two replace literal concatenation.16 complete callbacks retain semantics and43 change. Account for both hooks,18 raw-identical fixture classes and18 template/style properties. The close case removes its open-container class assertion and relaxes three event-count checks from exactly1 to >=1; the quick two-way-binding test replaces nested1ms timers/ticks with two native1ms waits. Other complete nonboundary operations and predicates are equal after enumerated timing changes, without proving focus trapping, event counts, backdrop, DOM position or teardown equivalence. Preserve owned historical M2 sidenav Sass and public peer integration. Cyph imports and re-exports MatSidenavModule; a bounded shared-source search found no direct sidenav/drawer tag beyond that module reference, which is not absence-based runtime exclusion or inheritance proof. No owned component fork, required consumer HTML/CSS/SCSS edit or API change follows from these private fixture preferences. Actual packed/public-peer/mixed integration and both supported floors remain open.",
    "Decline this private list/selection-list scheduler migration after reviewing all40 hunks in both complete files. Pair all118 case identities in full order;93 complete callbacks retain semantics and25 change. All118 projected predicate sequences and other nonboundary operations remain equal, including list selection, keyboard/focus, forms and event observations. Review all12 setup/cleanup hooks and complete globals/helpers/providers/imports: only the actual removed bindings are erased, while the selection-list tick import remains. All34 fixture classes and33 template/style properties remain raw-byte identical. Native wait/stability versus simulated clocks does not prove event, focus, form propagation or lifetime equivalence. Cyph imports the owned legacy list module, renders mat-nav-list/mat-selection-list and directly styles .mat-list-item/.mat-list-item-content. Preserve the entire owned historical list suite and Material16 HTML/CSS/SCSS; no new TS API or consumer edit is justified. Actual packed/browser/forms/focus/event/minimum-floor checks remain required.",
    "Decline this private snack-bar scheduler migration after reviewing all43 hunks in both complete files. Pair55 cases with two finite literal-concatenation label rewrites that retain evaluated names and complete callbacks;18 callbacks retain semantics and37 change. All five setup/cleanup hooks,seven fixture classes andfive template/style properties are accounted for. In the maximum-timeout case, replace callThrough with a setTimeout spy returning0, capture originalSetTimeout and wait200ms through it; retain the Infinity duration and Math.pow(2,31)-1 cap predicate, while making no real timer/initialization equivalence claim. The before-only animationFrameDelay=16 constant is removed; announceDelay=150 and all other global/nonboundary operations remain equal under recorded boundaries. Retain the owned stronger legacy timeout test, dismissal/action/announcement/teardown observations and distinct legacy tokens. Cyph uses legacy MatSnackBar.open with duration, dismiss/dismissWithAction and onAction. Preserve Material16 rendered structure and CSS/SCSS without consumer edits. Actual timer cap/dismissal/announcement/packed/browser/floor qualification remains separate.",
    "Decline this private tabs scheduler migration after reviewing all58 hunks in allthree complete files. Account for141 before/138 after cases:138 pair in exact retained order,90 complete callbacks retain semantics and48 change. Individually pin three removed paginator-cleanup cases for click,touchend and reaching the start after60000ms. Allthree remain in the unchanged owned legacy tab-header suite; do not remove them or infer an absence of behavior from assertion-free fakeAsync timer-queue observations. Four synchronous nonthrow checks become awaited asynchronous not-toBeRejected observers, changing error timing/scope. Review23 hooks,25 raw-identical fixture classes and26 template/style properties plus complete imports/global/helper boundaries, including the changed repeated-paginator native timing; no clock/error/geometry/animation-lifecycle equivalence is proved. Cyph imports legacy tabs, renders tab groups and styles .mat-tab-label-content/.mat-tab-label-active and active tab bodies. Keep owned Material16 tab/header/label structure and tests, with no modern API mirror, animation-engine fork, consumer CSS/SCSS edit or TS API change. Actual pagination cleanup, focus/scroll/events/animation, packed/native/browser and peer-floor gates remain required."
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

    report = json.loads((args.reports / ('ngx-navigation-async-source-' + short + '-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-navigation-async-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-navigation-async-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 91 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 370 and report['complete_original_hunks'] == 198
    assert controls['source_helper_sha256'] == ref('scripts/spec-navigation-async-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_navigation_async_source_probe.mjs')['sha256']
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
    assert head == {'main': 'ccc533178a489bd3599f5f16ddc7926304bb270f',
                    '21': '2e9ffb393ea62284e5296e186f4147f312d813e0'}[short]
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
                      'shared/js/cyph/services/material-dialog.service.ts',
                      'shared/js/cyph/components/account-menu/account-menu.component.html',
                      'shared/js/cyph/components/account-menu/account-menu.component.scss',
                      'shared/js/cyph/components/account-messaging/account-messaging.component.html',
                      'shared/js/cyph/components/help/help.component.html',
                      'shared/css/mixins.scss',
                      'shared/js/cyph/components/account-register/account-register.component.scss']
    shared = (cyph / consumer_paths[0]).read_text()
    web = (cyph / consumer_paths[1]).read_text()
    assert '@angular/material/legacy-list' in shared
    assert all(n in web for n in ['@angular/material/sidenav', '@angular/material/legacy-snack-bar', '@angular/material/legacy-tabs'])
    service = (cyph / consumer_paths[2]).read_text()
    assert all(n in service for n in ['matSnackbar.open(', 'snackbar.dismissWithAction()', 'snackbar.dismiss()', 'snackbar.onAction()'])
    assert '<mat-nav-list' in (cyph / consumer_paths[3]).read_text()
    assert '.mat-list-item .mat-list-item-content' in (cyph / consumer_paths[4]).read_text()
    assert '<mat-selection-list' in (cyph / consumer_paths[5]).read_text()
    assert '<mat-tab-group' in (cyph / consumer_paths[6]).read_text()
    assert '.mat-tab-label-active' in (cyph / consumer_paths[7]).read_text()
    assert 'mat-tab-body.mat-tab-body-active' in (cyph / consumer_paths[8]).read_text()
    write(PREFIX + 'cyph-sanity.json', {
        'schema_version': 1, 'line': line, 'path': str(cyph), 'head': cyph_head,
        'clean': True, 'read_only': True,
        'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
        'reachable_contracts': {
            'sidenav': 'Public module imported/re-exported. A bounded shared-source search found only the module reference, not direct sidenav/drawer tags; this is not absence or runtime exclusion proof.',
            'list': 'Legacy list module, nav/selection list markup and direct item/content styles.',
            'snack-bar': 'Legacy module and service open/duration/dismissWithAction/dismiss/onAction use.',
            'tabs': 'Legacy tab module and actual tab groups, label and active-body styles.'},
        'conclusion': 'Preserve Material16 HTML/CSS/SCSS and all owned tests, including three timer-cleanup cases removed upstream. No product/consumer or TS API edit follows from private scheduler preferences.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-navigation-async-source-review.mjs',
             'tests/spec_navigation_async_source_probe.mjs', 'tests/test_spec_navigation_async_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins.json',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']],
             'compatibility/rc/spec-date-tooltip-slider-source-checkpoint.json',
             'compatibility/rc/spec-date-tooltip-slider-source-replay-checkpoint.json',
             'projects/ngx-material-legacy/legacy-list/selection-list.spec.ts',
             'projects/ngx-material-legacy/legacy-tabs/tab-header.spec.ts',
             'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts',
             'projects/ngx-material-legacy/legacy-tabs/tab-group.spec.ts',
             'projects/ngx-material-legacy/styles/sidenav/_sidenav-theme.scss']
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
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-navigation-async-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'pairs', 'hooks', 'globals', 'classes', 'templates', 'geometry_helpers']}
        summary.update({'paired_cases': len(semantics['pairs']), 'hooks': len(semantics['hooks']),
                        'fixture_classes': len(semantics['classes']), 'template_style_properties': len(semantics['templates'])})
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated program; all ordered cases/hooks, finite boundary/await statements, seven raw-pinned observer/spy/error exceptions, six finite label mappings, three removed cleanup cases, one removed frame-delay constant, exact imports, complete globals/helpers/classes/templates. No runtime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-navigation-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 4, 'other_entries_exact': 1693,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
