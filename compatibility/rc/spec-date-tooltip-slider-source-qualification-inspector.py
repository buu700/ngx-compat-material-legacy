# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Record only three individually qualified source decisions; never runtime admission."""
import argparse
import copy
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

SHAS = ['0affe5aaa704fa0bf923b1be3266515e41d5e350',
        '39b0f5521960f93af96943968961f1ba3e241307',
        '5ad259a25e4b6d6346ee62954fe461f4500c9cee']
PREFIX = 'compatibility/rc/spec-date-tooltip-slider-source-'
REASONS = [
    'Decline this private datepicker scheduler migration after individual review of all135 hunks in three complete files. All195 cases and33 hooks pair in full file/suite/mode/occurrence and registration order;89 callback bodies retain complete semantics and106 change. Every timing/detection/wrapper/await boundary is explicitly recorded. Two focus cases remove the explicit pane-open truthiness assertion and move final matcher messages; the focus-inside and restored/disabled-restoration predicates remain. Native50ms opening/200ms closing observations do not prove the old simulated deadlines or focus lifecycle. The ALT+DOWN no-datepicker nonthrow observer differs only in its nested timing boundary after the finite projection. All37 fixture classes and36 template/style properties remain raw-byte identical. Preserve the owned historical M2 datepicker Sass and actual public-peer integration with legacy form/input controls. Cyph imports MatDatepickerModule and renders datepicker/toggle controls alongside retained legacy inputs. Absence of an owned datepicker TypeScript implementation is not an exclusion or inherited runtime pass. No component fork, API/HTML/selector/CSS/SCSS change or consumer edit is justified. Actual public-peer focus, dismissal, forms, mixed theme, packed/browser and minimum-floor gates remain required.',
    'Decline this private tooltip scheduler migration after individual review of all57 hunks in both complete files. All75 cases and8 hooks retain full identities/order;19 complete callbacks are unchanged and56 change. Six exact cases shorten configured delays, commonly1000ms to10ms and default1337/7331ms to10/20ms; these literal changes are individually pinned rather than erased as timing. Two same-name show/hide cases retain distinct suites. The closed-tooltip position nonthrow observer changes only its nested scheduler boundary; an inner position helper becomes async. Removed imports are enumerated exactly: the main file retains fakeAsync/flush/tick while SCROLL_THROTTLE_MS and waitForAsync are removed, and the zone file removes its three scheduling imports. All12 fixture classes and13 template/style properties remain raw-byte identical. Retain the owned legacy tooltip tests, including1000/1337/7331ms deadlines and the explicit LEGACY_SCROLL_THROTTLE_MS boundary. Cyph imports the legacy module, uses matTooltip position/disabled bindings and styles .mat-tooltip directly. Native waits/stability and equal remaining predicates prove no throttle, rendering, position, error or destruction equivalence. Preserve Material16 HTML/CSS/SCSS and the distinct legacy tokens. No product/consumer change or new TypeScript API is needed; actual packed/native/browser, public-peer and supported-floor observations remain pending.',
    'Decline this private modern slider/harness scheduler migration after individual review of all47 hunks in both complete files. All143 cases and26 hooks pair in full identity/order;69 callbacks retain complete semantics and74 change, while all143 projected predicate sequences and nonboundary operations remain equal. Exactly two fixture bindings move from hook-local const initialization into enclosing let fixture declarations; their initializer/provider operations remain exact. setValueByClick and slideToValue become async and add a zero-ms native wait after their final change dispatch. All six before/after geometry-helper identities are pinned; getCoordsForValue retains its complete raw body, while helper scheduling changes do not prove event/geometry equivalence. The main file retains waitForAsync and its22 hook calls. All25 fixture classes and49 template/style properties remain raw-byte identical. Commented-out page-layout tests remain comments and are not coverage. The add-on does own the historical single-value legacy slider; modern range/harness tests are not an absence-based exclusion and authorize no modern API mirror. Cyph imports legacy slider and uses ngModel,min,max,step,thumbLabel and displayWith markup. Preserve that structure and all owned slider tests/styles. No required consumer CSS/SCSS or TypeScript API change; actual pointer/keyboard/forms/event/geometry, packed/browser and peer-floor gates remain required.'
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

    report = json.loads((args.reports / ('ngx-date-tooltip-slider-source-' + short + '-20261016.json')).read_text())
    controls = json.loads((args.reports / ('ngx-date-tooltip-slider-controls-' + short + '-20261016.json')).read_text())
    log = (args.reports / ('ngx-date-tooltip-slider-python-' + short + '-20261016.log')).read_text()
    assert report['line'] == controls['line'] == line
    assert controls['controls'] == 70 and all(n['result'] == 'rejected' for n in controls['cases'])
    assert report['paired_cases'] == 413 and report['complete_original_hunks'] == 239
    assert controls['source_helper_sha256'] == ref('scripts/spec-date-tooltip-slider-source-review.mjs')['sha256']
    assert controls['producer_sha256'] == ref('tests/spec_date_tooltip_slider_source_probe.mjs')['sha256']
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
    assert len(others) == 1694 and len(prior['entries']) == 1697
    selected = [n for n in prior['entries'] if n['sha'] in SHAS]
    assert len(selected) == 3 and all(not n.get('source_conclusion_only') for n in selected)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
    assert head == {'main': 'f294c7091ad67d986d7b9fd102b65d4f8d3f28bc',
                    '21': '24bc0d8713052625b175c517c51c06606d2686d1'}[short]
    write(PREFIX + 'prior.json.gz', {
        'schema_version': 1, 'line': line, 'source_parent': head,
        'ledger_sha256': digest(prior_bytes), 'selected_entries': selected,
        'other1694_entries_canonical_sha256': digest(json.dumps(others, sort_keys=True, separators=(',', ':')).encode()),
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
                      'shared/js/cyph/components/calendar-invite/calendar-invite.component.html',
                      'shared/js/cyph/components/account-notes/account-notes.component.html',
                      'shared/js/cyph/components/account-register/account-register.component.html',
                      'shared/js/cyph/components/dynamic-form/dynamic-form.component.html',
                      'shared/css/cyph.base.scss']
    module = (cyph / consumer_paths[0]).read_text()
    assert all(n in module for n in ['@angular/material/datepicker', '@angular/material/legacy-slider', '@angular/material/legacy-tooltip'])
    assert '.mat-tooltip' in (cyph / consumer_paths[-1]).read_text()
    assert all(n in (cyph / consumer_paths[1]).read_text() for n in ['mat-datepicker-toggle', '<mat-datepicker'])
    assert all(n in (cyph / consumer_paths[3]).read_text() for n in ['<mat-slider', '[displayWith]', '[thumbLabel]'])
    assert all(n in (cyph / consumer_paths[4]).read_text() for n in ['<mat-slider', '[(ngModel)]', '[matTooltip]', '[step]'])
    write(PREFIX + 'cyph-sanity.json', {
        'schema_version': 1, 'line': line, 'path': str(cyph), 'head': cyph_head,
        'clean': True, 'read_only': True,
        'reviewed_members': [{'path': p, 'sha256': digest((cyph / p).read_bytes())} for p in consumer_paths],
        'reachable_contracts': {
            'datepicker': 'Public MatDatepickerModule and actual calendar invite datepicker/toggle/input integration.',
            'tooltip': 'Legacy module, position/disabled/message bindings and directly styled .mat-tooltip.',
            'slider': 'Owned legacy module, single-value ngModel/min/max/step/thumbLabel/displayWith markup.'},
        'conclusion': 'Retain Material16 HTML/CSS/SCSS and stronger existing tests. These private upstream source preferences require no product or consumer edit. Modern range/harness coverage does not exclude owned legacy slider or public datepicker integration.',
        'consumer_files_changed': False, 'required_consumer_CSS_SCSS_changes': 0,
        'consumer_build_or_browser_executed': False,
        'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'})
    paths = ['scripts/spec-date-tooltip-slider-source-review.mjs',
             'tests/spec_date_tooltip_slider_source_probe.mjs', 'tests/test_spec_date_tooltip_slider_source.py',
             PREFIX + 'qualification-inspector.py', 'scripts/spec-overlay-async-source-review.mjs',
             'scripts/authenticated-single-spec-review.mjs', 'scripts/acquire-upstream-spec-originals.py',
             'scripts/spec-stability-chip-repair.mjs',
             *[PREFIX + suffix for suffix in ['subjects.json.gz', 'acquisition.json.gz', 'observation-pins.json',
                                              'prior.json.gz', 'review.json.gz', 'controls.json', 'python.log.gz', 'cyph-sanity.json']],
             'compatibility/rc/spec-overlay-async-source-checkpoint.json',
             'compatibility/rc/spec-overlay-async-source-replay-checkpoint.json',
             'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts',
             'projects/ngx-material-legacy/legacy-slider/slider.spec.ts',
             'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
             'projects/ngx-material-legacy/legacy-slider/slider.ts',
             'projects/ngx-material-legacy/styles/datepicker/_datepicker-theme.scss']
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
        evidence = 'compatibility/f10/disposition-ledger/evidence/spec-date-tooltip-slider-' + sha + '.json'
        summary = {k: v for k, v in semantics.items() if k not in ['hunks', 'pairs', 'hooks', 'globals', 'classes', 'templates', 'geometry_helpers']}
        summary.update({'paired_cases': len(semantics['pairs']), 'hooks': len(semantics['hooks']),
                        'fixture_classes': len(semantics['classes']), 'template_style_properties': len(semantics['templates'])})
        write(evidence, {'schema_version': 1, 'line': line, 'sha': sha, 'subject': subject['subject'],
                         'status': 'reviewed', 'final_disposition': 'do-not-adopt', 'review_depth': 'individual-compatibility',
                         'source_conclusion_only': True, 'complete_changed_files': subject['complete_changed_files'],
                         'original_files': len(subject['members']), 'original_hunks': subject['original_hunks'],
                         'raw_commit_sha256': subject['raw_commit_sha256'], 'original_sources': ref(PREFIX + 'subjects.json.gz'),
                         'patch_file': PREFIX + sha + '.patch', 'diff_sha256': subject['diff_sha256'],
                         'hunk_reviews': [{**n, 'judgment': REASONS[i], 'review_basis': 'Complete authenticated program; all ordered cases/hooks, finite boundary/await statements, eight raw-pinned observer/deadline exceptions, two fixture promotions, exact imports, complete globals/helpers/classes/templates. No runtime equivalence.'} for n in semantics['hunks']],
                         'semantics': summary, 'whole_program_review': ref(PREFIX + 'review.json.gz'),
                         'decision': REASONS[i], 'prior_entry': copy.deepcopy(entry), 'prior_snapshot': ref(PREFIX + 'prior.json.gz'),
                         'individual_proof': proof, 'independent_source_evidence': refs,
                         'actual_upstream_test_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'})
        entry.update({'final_disposition': 'do-not-adopt', 'reason': REASONS[i],
                      'read_note_disposition': 'individual-source-judgment-only',
                      'files': [n['path'] for n in subject['members']], 'evidence_report': evidence,
                      'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'source_check': {'kind': 'individual-complete-original-date-tooltip-slider-fixture-source-review',
                                       'diff_sha256': subject['diff_sha256'], 'evidence_report_sha256': ref(evidence)['sha256']},
                      'individual_proof': proof, 'source_conclusion_only': True, 'g11_claim': 'not-passed'})
    assert [n for n in ledger['entries'] if n['sha'] not in SHAS] == others
    assert {k: v for k, v in prior.items() if k != 'entries'} == {k: v for k, v in ledger.items() if k != 'entries'}
    ledger_path.write_text(json.dumps(ledger, indent=2) + '\n')
    print(json.dumps({'line': line, 'qualified_source_decisions': 3, 'other_entries_exact': 1694,
                      'product_changes': 0, 'actual_native_artifact_or_floor_qualified': False, 'g11_claim': 'not-passed'}))


if __name__ == '__main__':
    main()
