# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Record individually read owned member differences; not a whole-SHA or native pass."""
from pathlib import Path
import hashlib
import json

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/21x-base-class-removal-source-'
bound = {}


def read(path, expected=None):
    raw = (ROOT / path).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if expected:
        assert digest == expected, path
    ref = {'path': path, 'sha256': digest, 'bytes': len(raw)}
    if path in bound:
        assert bound[path] == ref
    bound[path] = ref
    return raw


read(str(Path(__file__).resolve().relative_to(ROOT)))
initial = json.loads(read(PREFIX + 'owned-member-inventory.json',
    '08c49906e2aeccf6551686319194d856023f275fdabc654cfe0d970750cd1712'))
supplement = json.loads(read(PREFIX + 'owned-closure-supplement.json'))
for report in [initial, supplement]:
    for ref in report['source_bindings']:
        assert len(read(ref['path'], ref['sha256'])) == ref['bytes']

factory_note = ('The tagged AsyncFactoryFn<T> is exactly () => Promise<T>;this is its finite local '
    'type spelling,not a runtime factory or locator change. The referenced historical declaration '
    'and prior erased-type proof are retained;no new upstream compatibility alias is needed.')
id_note = ('Only the generated default identifier gains the owned legacy namespace suffix. '
    'Explicit consumer identifiers remain assignable and the historical selector/class and '
    'IDREF bindings are retained. Preserve the existing coexistence repair;this source review '
    'does not qualify native IDREF/focus or consumer style behavior.')
notes = {}


def note(owner, names, text):
    for name in names:
        key = (owner, name)
        assert key not in notes
        notes[key] = text


note('checkbox:_MatCheckboxBase', ['_transitionCheckState'],
    'Retains historical transition class selection and one-second cleanup;the owned lifetime '
    'repair tracks each timer/element/class,does not remove a class reused by a newer transition, '
    'and suppresses work after destruction. Keep this repair when retaining the historical base. '
    'The older whole timer report has a different base digest;it is context,not current runtime acceptance.')
note('checkbox:_MatCheckboxBase', ['_handleInputClick', '_onBlur'],
    'Owned guards suppress deferred indeterminate/touched/CDR effects after destruction,including '
    'reentrant destruction during touched notification. The exact current source is bound by the '
    'prior selected-method Promise-microtask diagnostic;its protocol/native limits remain unchanged.')
note('checkbox:_MatCheckboxBase', ['ariaExpanded', 'ariaControls', 'ariaOwns'],
    'Existing owned input declarations supply the native input ARIA bindings already present in '
    'checkbox.html;aria-expanded uses the public booleanAttribute transform. They are separate '
    'owned accessibility work,not consequences of folding the shared base into the modern checkbox. '
    'No structural selector or stylesheet change is proposed here.')
note('checkbox:_MatCheckboxBase', ['_checkboxDestroyed', '_animationCleanups', 'ngOnDestroy'],
    'State and timer ownership belong to the owned lifecycle repair. Destruction is idempotent, '
    'cancels pending timeouts,removes their recorded animation classes and clears the set. '
    'Keep these fields and cleanup;do not replace them with current MDC input animation behavior.')
note('checkbox:MatLegacyCheckbox', ['ngOnDestroy'],
    'The leaf explicitly invokes the owned base cleanup before stopping FocusMonitor. Removing '
    'super.ngOnDestroy would orphan the base lifetime repair. This changes neither legacy '
    'animation target nor focus-monitor origin handling.')
note('checkbox:MatLegacyCheckboxHarness', ['with'],
    'Only the outer return-expression parentheses and formatting differ. The label/name/checked/ '
    'disabled predicate chain,comparisons and legacy harness constructor remain the same.')
note('checkbox:_MatCheckboxHarnessBase', ['_input', '_label'], factory_note)
note('core:_MatOptgroupBase', ['_labelId'], id_note)
note('core:_MatOptionBase', ['id'], id_note)
note('form-field:_MatFormFieldHarnessBase', ['_prefixContainer', '_suffixContainer', '_label',
    '_hints', '_inputControl', '_selectControl', '_datepickerInputControl', '_dateRangeInputControl'], factory_note)
note('form-field:_MatFormFieldHarnessBase', ['getErrors'],
    'The return spelling uses the existing finite ErrorBase instance protocol (ComponentHarness '
    'plus getText). The locator still instantiates the configured legacy error harness. Current '
    'MatErrorHarness protected static machinery is not an instance operation;do not infer '
    'universal future subtype compatibility from this finite protocol.')
note('form-field:MatLegacyErrorHarness', ['with', 'getText'],
    'The direct legacy class inlines the tagged text predicate and inherits the same public CDK '
    'host operation,but loses the tagged protected static helper. The actual minimum compiler '
    'reproduction and exact historical helper restoration proposal already qualify this gap. '
    'Carry the unapplied proposal to the separate repair;do not accept the missing helper as harmless.')
note('paginator:_MatPaginatorHarnessBase', ['_nextButton', '_previousButton', '_firstPageButton',
    '_lastPageButton', '_select', '_pageSizeFallback', '_rangeLabel'], factory_note)
note('radio:_MatRadioGroupBase', ['_name'], id_note)
note('radio:_MatRadioGroupBase', ['_touch'],
    'The owned group marks for check after onTouched. Retain its OnPush/forms behavior rather than '
    'replacing the generic legacy group with current MatRadioGroup. Source context is not a '
    'new native forms/focus acceptance.')
note('radio:_MatRadioButtonBase', ['_uniqueId'], id_note)
note('radio:_MatRadioButtonBase', ['_onTouchTargetClick'],
    'Optional input access prevents a pre-view/destroyed input dereference;the disabled check and '
    'historical native-input focus target remain. No modern touch target or button markup is substituted.')
note('radio:_MatRadioButtonBase', ['_updateTabIndex'],
    'The existing owned focus-follow-selection microtask checks current group selection and '
    'whether the old native input still owns focus before focusing the selected radio or blurring. '
    'This post-tag behavior remains subject to its own individual upstream/native obligations; '
    'modern base consolidation neither introduces nor qualifies it.')
note('radio:_MatRadioButtonHarnessBase', ['_textLabel', '_clickLabel'], factory_note)
note('slide-toggle:_MatSlideToggleBase', ['ngAfterContentInit', 'ngOnDestroy', '_slideToggleDestroyed'],
    'The owned destruction flag prevents monitor callbacks and deferred touched/focus/CDR work '
    'after destruction,while stopMonitoring remains. The exact current source is in the prior '
    'selected-method Promise-microtask diagnostic;its fields/focus/CDR protocols and native limits remain.')
note('slide-toggle:_MatSlideToggleHarnessBase', ['_nativeElement'], factory_note)
note('table:_MatTableDataSource', ['sortingDataAccessor'],
    'The removed underscore numeric helper is owned as legacyIsNumberValue,exported by the local '
    'legacy-core entry point. Its parseFloat-and-Number conjunction retains historical handling '
    'of empty/whitespace/null/boolean/mixed suffix values;the MAX_SAFE_INTEGER branch and '
    'remaining accessor logic are unchanged. This does not add current MatPaginator coupling.')
for owner in ['MatLegacyCellHarness', 'MatLegacyHeaderCellHarness', 'MatLegacyFooterCellHarness']:
    note('table:' + owner, ['with'],
        'The finite historical cell predicate is called through the renamed locally owned base. '
        'Legacy host/column selectors and predicate behavior are retained;there is no current '
        'MDC cell harness inheritance.')
note('table:_MatCellHarnessBase', ['_getCellPredicate'],
    'The protected static helper constrains T to the local finite legacy cell base rather than '
    'the current concrete MatCellHarness. The text/columnName predicate body is unchanged and '
    'supports all three legacy cell subclasses;this is a conservative local type boundary.')
note('table:_MatRowHarnessBase', ['getCellTextByColumnName'],
    'Only the finite column-name index-interface spelling becomes MatLegacyRowHarnessColumnsText. '
    'The cell query,parallel text/name reads and output assignments remain unchanged.')

families = {'checkbox', 'core', 'form-field', 'paginator', 'radio', 'slide-toggle', 'table'}
reviews = []
seen = set()
for origin, pairs in [('initial', initial['pairs']), ('supplement', supplement['additional_pairs'])]:
    for pair in pairs:
        if pair['key'].split(':')[0] not in families:
            continue
        for difference in pair['differences']:
            name = difference['key'].split(':')[1]
            key = (pair['key'], name)
            assert key in notes, key
            seen.add(key)
            reviews.append({'owner': pair['key'], 'owned_owner': pair.get('owned_key', pair['key']),
                'member': difference['key'], 'inventory': origin,
                'tagged_path': pair['tagged_path'], 'owned_path': pair['owned_path'],
                'status': difference['status'],
                'tagged_token_sha256': difference['tagged']['token_sha256'] if difference['tagged'] else None,
                'owned_token_sha256': difference['owned']['token_sha256'] if difference['owned'] else None,
                'source_review': notes[key], 'whole_family_or_native_qualified': False})
assert seen == set(notes), sorted(set(notes) - seen)
assert len(reviews) == 50, len(reviews)

for path in ['reference/material-16.2.14/error-helper-sources/async-factory-type.d.ts',
    'reference/material-16.2.14/error-helper-sources/async-factory-provenance.json',
    'compatibility/rc/harness-erased-types-source-proof.json',
    'compatibility/rc/harness-erased-types-minimum-source-diagnostic.json',
    'compatibility/rc/deferred-control-lifetime-diagnostic.json',
    'compatibility/rc/checkbox-timer-runtime-diagnostic.json',
    'compatibility/rc/checkbox-timer-lifetime-source-proof.json',
    'compatibility/rc/radio-identity-source-proof.json',
    'compatibility/rc/option-identity-source-proof.json',
    'projects/ngx-material-legacy/legacy-core/internal/coercion/number-property.ts',
    'projects/ngx-material-legacy/legacy-core/public-api.ts',
    'projects/ngx-material-legacy/legacy-checkbox/checkbox.html',
    PREFIX + 'error-harness-assessment.json']:
    read(path)
assert read('reference/material-16.2.14/error-helper-sources/async-factory-type.d.ts').decode().strip() == \
    'export declare type AsyncFactoryFn<T> = () => Promise<T>;'

prior_links = []
targets = {review['owned_path'] for review in reviews}
for report_path in ['compatibility/rc/deferred-control-lifetime-diagnostic.json',
    'compatibility/rc/checkbox-timer-runtime-diagnostic.json',
    'compatibility/rc/radio-identity-source-proof.json', 'compatibility/rc/option-identity-source-proof.json']:
    matches = []

    def inspect(value):
        if isinstance(value, list):
            for item in value:
                inspect(item)
        elif isinstance(value, dict):
            path = value.get('path')
            digest = value.get('candidate_sha256', value.get('sha256'))
            if path in targets and isinstance(digest, str):
                matches.append({'path': path, 'recorded_sha256': digest,
                    'matches_current': hashlib.sha256(read(path)).hexdigest() == digest})
            for item in value.values():
                inspect(item)

    inspect(json.loads(read(report_path)))
    prior_links.append({'report': report_path, 'target_source_links': matches,
        'runtime_reexecuted': False, 'older_receipt_reattributed': False,
        'limit': 'A matching source hash preserves the original report scope only;it is not a fresh test pass. A mismatch is context only.'})

header_reviews = []
for pair in initial['pairs'] + supplement['additional_pairs']:
    if pair['key'].split(':')[0] in families and not pair['headers_token_identical']:
        header_reviews.append({'owner': pair['key'], 'owned_path': pair['owned_path'],
            'tagged_header_sha256': hashlib.sha256(pair['tagged_header'].encode()).hexdigest(),
            'owned_header_sha256': hashlib.sha256(pair['owned_header'].encode()).hexdigest(),
            'source_review': ('Retained historical selector/host/template/providers and generic legacy parent '
                'were read against the header diff. Component/directive standalone:false preserves NgModule '
                'ownership;css-to-scss changes the resource source extension. Table harness headers use their '
                'finite local base/index type names. Error harness direct inheritance is the separately '
                'qualified protected-helper repair obligation. These header observations do not qualify '
                'compiled style bytes,node DI,template/AOT or minimum consumer behavior.')})

for path, ref in list(bound.items()):
    raw = (ROOT / path).read_bytes()
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256'], path
report = {'schema_version': 1, 'line': '21.x', 'sha': initial['sha'],
    'role': '50 actual changed member source differences read and individually assessed across seven families;partial owned/minimum assessment,not whole-family or whole-SHA acceptance',
    'families': sorted(families), 'changed_member_reviews': reviews,
    'changed_members_read': len(reviews), 'changed_header_reviews': header_reviews,
    'prior_evidence_source_links': prior_links,
    'unmatched_declaration_review_complete': False,
    'imported_binding_and_minimum_contract_review_complete': False,
    'remaining_combined_member_differences': initial['member_differences'] + supplement['additional_member_differences'] - len(reviews),
    'original_files_read': 72, 'original_hunks_read': 329,
    'product_changes': 0, 'canonical_dispositions_changed': 0, 'exceptions_changed': 0,
    'whole_SHA_substantive_review_complete': False,
    'actual_native_packed_browser_floor_or_full_audit_qualified': False,
    'prior_tests_reexecuted': False, 'g11_claim': 'not-passed', 'source_bindings': list(bound.values())}
path = ROOT / (PREFIX + 'owned-control-member-review.json')
with path.open('x') as stream:
    stream.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': 'owned-control-member-source-reading-recorded',
    'changed_members_read': len(reviews), 'headers_read': len(header_reviews),
    'remaining_member_differences': report['remaining_combined_member_differences'],
    'whole_SHA_qualified': False, 'product_changes': 0}))
