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

SHAS = ['72fb9d2d47d52a570a1d81c287244a52e53a5b93', '85a81a614992ec9a42f40d525cda8a265291fcbe', 'fccc2ef9bbe9875eaa6ca2cc137f78aa95ef4dd2', 'a3479f74eedcba962c642cb297f4d37028d8c023']
PREFIX = 'compatibility/rc/spec-cdk-async-source-'
REASONS = [
    "Decline this private CDK breakpoint-observer scheduling migration after individual review of all six hunks in the complete original. All 11 static case registrations and both hooks pair in full order; every complete callback changes but all projected predicate/nonboundary sequences retain identity. An exact after-only debounceTime=20 constant and native timer observations replace simulated ticks; both fake-media fixture classes remain raw-byte identical. This proves no observable emission/debounce/error/unsubscription equivalence. Public BreakpointObserver is actually consumed by legacy autocomplete,tooltip and snack-bar; Cyph uses these legacy controls. Preserve the owned integrations, historical M 2 HTML/CSS/SCSS and all tests, without a CDK fork, obsolete-surface dependency or narrower peer minimum. Actual layout/overlay/consumer/native/browser/supported-floor validation remains open.",
    "Decline this private CDK table scheduler migration after individual review of all 27 hunks in the complete original. All 80 static cases and four hooks retain identity/order;57 complete callbacks remain semantically identical and 23 change. One virtual-scroll error case switches a synchronous throw observer to awaited Promise rejection; the multiple-default-row case retains its synchronous matcher after a nested flush removal. Four exact before/after local helper bodies account for createVirtualScroll and triggerScroll gaining animation-frame/50 ms native waits and the former gaining a Promise-wrapped object result type. All 40 fixture classes and 40 template/style properties remain raw-byte identical. fakeAsync/flush are retained and the finite Core-testing import reordering preserves the four explicit retained bindings. These source facts prove no error timing, rendering, sticky/virtual geometry or lifetime equivalence. The owned legacy table directly extends public CdkTable and Cyph renders that legacy table; this is not absence or inheritance admission. Preserve existing strong table/data-source tests and Material 16 row/cell/classes/styles. No CDK/table fork, modern feature mirror or consumer CSS/SCSS/TS API edit is justified. Actual packed/table/scroll/error/mixed peer and floor gates remain pending.",
    "Decline this private CDK scrolling scheduler migration after individual review of all 38 hunks in all four complete files. Pair all 94 static registrations with one finite RTL literal-concatenation label mapping and 13 hooks;23 complete callbacks retain semantics and 71 change. Individually pin viewport throttle 1337 ms to 10 ms with a 20 ms native observation, the buffer error observer changing to async rejection with assignments moved outside it, and the cache-disposal 50-iteration loop losing its explicit nonthrow wrapper. Eight exact initialization/scroll helper bodies account for animation-frame and 16/50 ms native waits, two removed zone-helper animationFrameScheduler.flush calls and its entire removed RxJS import. All 13 fixture classes and 21 template/style properties remain raw-byte identical. Shared comparison strips only these exact private helper statements, leaving unrelated flush operations intact; no frame/throttle/scroll/geometry/disposal equivalence is proved. ScrollDispatcher and public overlay/scroll behavior remain reachable through tooltip/autocomplete/select/table. The add-on separately owns bounded historical viewport primitives used by eight bindings; this proof does not admit them as equivalent to current ViewportRuler. A synthetic no-global-window/null-defaultView edge reproduces in both the untouched Material 16 helper and the owned helper and is explicitly retained as an open actual-SSR validation item. Preserve all owned code, selectors, CSS/SCSS and tests; no CDK fork, public API mirror or required consumer edit. Actual scrolling/SSR/native/browser/peer-floor validation remains open.",
    "Decline this private CDK overlay scheduler migration after individual review of all 39 hunks in all five complete files. Account for 224 before/221 after static registrations:221 pair in exact retained order,207 complete callbacks retain semantics and 14 change, with 31 setup/cleanup hooks. Individually pin three deleted assertion-free fakeAsync timer-queue observations: clearing backdrop timeout on transition completion,on dispose after detach,and no pending timers on immediate disposal. Deletion is not evidence that public OverlayRef lifecycle behavior is absent or inherited correctly. All retained projected predicates/nonboundary operations remain equal and all ten fixture classes/seven template/style properties remain raw-byte identical. Enumerated native waits/stability prove no timer,positioning,focus,scroll-strategy or destruction equivalence. Public Overlay/FlexibleConnectedPositionStrategy are actually used by legacy controls which Cyph consumes. Preserve owned stronger lifecycle/focus/cleanup tests, actual public-peer obligations and Material 16 DOM/classes/CSS/SCSS; create no overlay/CDK fork and require no consumer TS/CSS/SCSS edit. Actual packed/native/browser/SSR/mixed peer and floor qualification remains required."
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

    report = json.loads((args.reports / ('ngx-cdk-async-source-' + short + '-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-cdk-async-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-cdk-async-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 99 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 406 and report['complete_original_hunks'] == 110
    assert controls['source_helper_sha256'] == ref('scripts/spec-cdk-async-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_cdk_async_source_probe.mjs')['sha256']
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
    assert head == {'main': '576da4f4f249be19383e1c443c8dbe6276d6b5a5',
                    '21': 'e9e5c63047ffce4f9964a2153eb14263241e604f'}[short]
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
                      'shared/js/cyph/components/search-bar/search-bar.component.html',
                      'shared/js/cyph/components/account-base-file-list/account-base-file-list.component.html',
                      'shared/js/cyph/components/account-notes/account-notes.component.html',
                      'shared/js/cyph/components/email-compose/email-compose.component.scss',
                      'shared/js/cyph/components/dialog-media/dialog-media.component.scss',
                      'shared/css/cyph.base.scss']
    module = (cyph / consumer_paths[0]).read_text()
    assert all(n in module for n in ['@angular/material/legacy-tooltip', '@angular/material/legacy-autocomplete'])
    assert '@angular/material/legacy-table' in (cyph / consumer_paths[1]).read_text()
    assert 'mat-autocomplete' in (cyph / consumer_paths[3]).read_text()
    assert 'mat-table' in (cyph / consumer_paths[4]).read_text()
    assert 'matTooltip' in (cyph / consumer_paths[5]).read_text()
    assert '.mat-select-panel' in (cyph / consumer_paths[6]).read_text()
    assert '.mat-dialog-content' in (cyph / consumer_paths[7]).read_text()
    assert '.mat-tooltip' in (cyph / consumer_paths[8]).read_text()
    bindings = ['projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
                'projects/ngx-material-legacy/legacy-table/table.ts',
                'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts',
                'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
                'projects/ngx-material-legacy/legacy-select/internal/select-base.ts']
    assert 'BreakpointObserver' in (root / bindings[0]).read_text()
    assert 'ScrollDispatcher' in (root / bindings[0]).read_text()
    assert 'extends CdkTable' in (root / bindings[1]).read_text()
    assert 'FlexibleConnectedPositionStrategy' in (root / bindings[3]).read_text()
    assert '_LegacyViewport as ViewportRuler' in (root / bindings[4]).read_text()
    edge = json.loads((root / (PREFIX + 'viewport-nonbrowser-observation.json')).read_text())
    assert edge['line'] == line
    assert edge['untouched_reference_and_owned_exhibit_same_synthetic_edge']
    assert not edge['actual_Angular_SSR_provider_or_floor_qualified']
    assert edge['rows'][1]['sha256'] == ref(bindings[2])['sha256']
    write(PREFIX + 'cyph-sanity.json', {
        'schema_version': 1, 'line': line, 'path': str(cyph), 'head': cyph_head,
        'clean': True, 'read_only': True,
        'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
        'owned_public_peer_binding_members': [ref(p) for p in bindings],
        'reachable_contracts': {
            'layout': 'Legacy autocomplete/tooltip/snack-bar consume public BreakpointObserver; Cyph uses these legacy controls.',
            'table': 'Owned legacy table extends public CdkTable; Cyph renders actual legacy table markup.',
            'scrolling': 'Tooltip consumes ScrollDispatcher; table/overlays/positioning remain peer integrations. Eight historical viewport bindings use the separately owned bounded helper.',
            'overlay': 'Actual public Overlay/FlexibleConnectedPositionStrategy routes in legacy controls remain reachable through Cyph.'},
        'known_inherited_synthetic_nonbrowser_edge': ref(PREFIX + 'viewport-nonbrowser-observation.json'),
        'conclusion': 'Retain Material16 structure/styles and owned lifecycle/error/timer tests. Source judgments do not admit actual public-peer behavior or resolve the recorded no-window SSR edge. No product or consumer edit.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-cdk-async-source-review.mjs',
             'tests/spec_cdk_async_source_probe.mjs', 'tests/test_spec_cdk_async_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins.json',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json', 'viewport-nonbrowser-probe.mjs', 'viewport-nonbrowser-observation.json']],
             'compatibility/rc/spec-navigation-async-source-checkpoint.json',
             'compatibility/rc/spec-navigation-async-source-replay-checkpoint.json',
             'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
             'projects/ngx-material-legacy/legacy-table/table.ts',
             'projects/ngx-material-legacy/legacy-core/internal/legacy-viewport.ts',
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
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-cdk-async-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'pairs', 'hooks', 'globals', 'classes', 'templates', 'geometry_helpers']}
        summary.update({'paired_cases': len(semantics['pairs']), 'hooks': len(semantics['hooks']),
                        'fixture_classes': len(semantics['classes']), 'template_style_properties': len(semantics['templates'])})
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated program; all ordered cases/hooks, finite boundary/await statements, four raw-pinned error/deadline/cache exceptions, one finite label mapping, three removed timer/disposal cases, twelve helper bodies, one added20ms constant, two exact removed scheduler flushes, one local Promise result wrapper andfinite retained import ordering, exact imports, complete globals/helpers/classes/templates. No runtime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-cdk-async-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 4, 'other_entries_exact': 1693,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
