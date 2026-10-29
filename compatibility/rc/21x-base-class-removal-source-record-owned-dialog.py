# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Record all remaining dialog member-difference entries without claiming product admission."""
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
prior = json.loads(read(PREFIX + 'owned-overlay-member-review.json'))
for report in [initial, supplement, prior]:
    for ref in report['source_bindings']:
        assert len(read(ref['path'], ref['sha256'])) == ref['bytes']
assert prior['cumulative_changed_members_read'] == 252
notes = {}


def note(owner, names, text):
    for name in names.split(','):
        key = (owner, name)
        assert key not in notes
        notes[key] = text


note('dialog:_MatDialogContainerBase', '<constructor>,_portalOutlet,_closeInteractionType,_ariaLabelledByQueue,_document',
    'The historical eight supplied services/configuration slots remain on the owned abstract '
    'container. It composes public BasePortalOutlet and CdkPortalOutlet instead of inheriting '
    'current CdkDialogContainer constructor/private state. Local labelled-by queue and interaction '
    'state preserve historical bindings. The optional public CDK DialogContainer hooks are '
    'separately bridged without adding current private fields to the frozen legacy API.')
note('dialog:_MatDialogContainerBase', '_legacyFocusNotifications,_legacyFocusStableSubscriptions,_legacyChangeDetector,_legacyDialogRef,_legacyFocusPlatform,_legacyFocusRenderer,_legacyFocusTrap,_legacyPreviousFocus,_legacyBackdropSubscription,_legacyFocusDestroyed,_legacyFocusCleanup,_isBrowser',
    'Owned focus state and subscriptions use public focus/zone/platform/renderer/CDR primitives. '
    'Ambient services are optional behind an injection-context check,so the original manual '
    'constructor does not require an application. Explicit supplied services still own the '
    'manual route;browser fallback tests primitive capabilities rather than current private symbols.')
note('dialog:_MatDialogContainerBase', 'attachComponentPortal,attachTemplatePortal,attachDomPortal,hasAttached,detach,dispose,_assertContentAvailable',
    'Portal operations delegate to the real child outlet. Component/template attachment invokes '
    'post-attachment work only after success. DOM dispatch uses public attach and restores '
    'historical portal-host/attachment flags on failure before rethrowing. Availability rejects '
    'destroyed/occupied containers. Explicit detach/dispose forward to the child and public parent; '
    'the reading does not infer native view destruction or Angular node behavior.')
note('dialog:_MatDialogContainerBase', '_contentAttached,_recaptureFocus',
    'Focus trap creation and previous-focus capture precede initial capture. An exactly matching '
    'public CDK ref/container/overlay owns normal backdrop recapture;the manual route subscribes '
    'to the supplied overlay. Enabled legacy backdrops avoid duplicate recapture caused by the '
    'peer ref being disabled solely for deferred close coordination.')
note('dialog:_MatDialogContainerBase', '_captureInitialFocus,_trapFocus,_restoreLegacyFocus,ngOnDestroy',
    'Historical delayFocusTrap/autofocus/restoreFocus and interaction-origin behavior are owned '
    'over public focus services. Unstable first-tabbable focus retains a one-shot stability wait; '
    'late callbacks check destruction and preserve cleanup ownership. Destruction marks weak-map '
    'state dead before callbacks and nested finally blocks release subscriptions,trap and listener '
    'cleanup even if restoration throws. Native focus/shadow/zone behavior remains a separate gate.')
note('dialog:_MatDialogBase', '_openDialogsAtThisLevel,_afterOpenedAtThisLevel,openDialogs,afterOpened,<constructor>,getDialogById,_closeDialogs',
    'Registry,streams,parent delegation and constructor slots retain the historical service '
    'design but reference the owned legacy ref. This avoids current concrete ref/container '
    'coupling;it does not restore a current MatDialogRef subtype or modern service fork.')
note('dialog:_MatDialogBase', 'open',
    'All overloads return the owned legacy ref. The implementation preserves historical config '
    'defaults (ariaModal=true,maxWidth=80vw),ID prefix,global positioning and supplied scroll '
    'strategy. Public CDK automatic closing/predicate behavior is disabled for owned motion '
    'coordination. Explicit config/data/container/ref providers and template context remain; '
    'content CDK DialogRef is deliberately hidden. Template component refs allow undefined, '
    'matching historical runtime. Do not transplant the modern service hardcoded tokens/prefix.')
note('dialog:_MatDialogHarnessBase', 'getText,getTitleText,getContentText,getActionsText',
    'Only explicit Promise<string> return annotations differ;the host/optional section text '
    'operations and empty-string fallback are unchanged. Legacy locators remain in the leaf.')
note('dialog:_MatTestDialogOpenerBase', 'config,dialogRef,<constructor>',
    'Testing fixture config/ref/service use owned legacy types and explicit generic result '
    'casts. The same static selected component/config,open call,afterClosed subscription and '
    'closedResult assignment remain. No current modern dialog component is used as the fixture.')
note('dialog:MatTestLegacyDialogOpener', 'withComponent',
    'The static factory explicitly returns its actual generic legacy constructor type rather '
    'than a narrower ComponentType cast. Static component/config assignments and returned '
    'constructor value are unchanged;this is a finite conservative testing API adjustment.')
note('dialog:MatLegacyDialogContainer', '<constructor>',
    'Constructor argument order,optional document/direction-independent services and forwarding '
    'to the owned base are unchanged;only formatting differs. Manual construction retains the '
    'existing supplied focus/zone/overlay/CDR route.')
note('dialog:MatLegacyDialogContainer', '_onAnimationDone,_onAnimationStart,_getAnimationState,_legacyAnimationsDisabled,_animationsEnabled,_enterAnimationDuration,_exitAnimationDuration,_animationTimer,_animationFrame,_animationRevision,_animationDestroyed,_animationCompleted,_hostElement,_contentAttached,_startOpenAnimation,_startExitAnimation,_finishDialogOpen,_finishDialogClose,_clearAnimationClasses,_waitForAnimationToComplete,_requestAnimationFrame,_cancelAnimationWork,ngOnDestroy',
    'The owned CSS/timer implementation replaces engine recipes/callbacks with finite opening/ '
    'opened/closing/closed notifications. It retains historical defaults/config durations,host '
    'and accessibility bindings;owned helper classes/variables govern motion only. Revision, '
    'phase,destroy and one-completion guards protect synchronous observers,timers and frames. '
    'No-op completion is asynchronous;destruction cancels work before potentially throwing focus '
    'restoration. Preserve these earlier repairs;this source review is not a fresh native '
    'geometry/frame/focus or engine-free consumer pass.')
note('dialog:MatLegacyDialogRef', 'componentInstance,componentRef,disableClose,id,_afterOpened,_beforeClosed,_result,_closeFallbackTimeout,_subscriptions,_beforeClosedEmitted,_state,_closeInteractionType,<constructor>,close,afterOpened,afterClosed,beforeClosed,backdropClick,keydownEvents,updatePosition,updateSize,addPanelClass,removePanelClass,getState,_notifyBeforeClosed,_scheduleCloseFallback,_finishDialogClose',
    'The legacy reference now owns the historical reference object instead of inheriting the '
    'current concrete Material ref. Public operations forward to public CDK ref/overlay/position '
    'APIs. Opening/closing/detachment subscriptions are owned,close is idempotent,notifications '
    'are one-shot,reentrant state changes are checked and missing/throwing motion still gets '
    'the historical cleanup margin. CLOSED state/subscription cleanup precede peer close;the '
    'component remains available through synchronous afterClosed then clears in finally. '
    'componentRef explicitly allows historical template undefined. Current nominal/subtype '
    'identity is deliberately not retained;using legacy reference types is the conservative '
    'consumer boundary,with no required DOM/CSS/SCSS migration. Native/API gates remain open.')
note('dialog:MatDialogRef', 'componentRef,_closeFallbackTimeout,<constructor>,close,_finishDialogClose,_subscriptions,_beforeClosedEmitted,_notifyBeforeClosed,_scheduleCloseFallback',
    'This explicit shared-tag-ref to owned-legacy-ref comparison covers the same current '
    'reference body also seen through the legacy leaf after inheritance removal. Nullable '
    'template component refs,owned subscriptions,one-shot beforeClosed,guarded fallback and '
    'finally cleanup are the existing local lifecycle adaptation. Do not count it as a new '
    'current Material subtype or infer a fresh native close/focus qualification.')

reviews = []
used = set()
headers = []
for origin, pairs in [('initial', initial['pairs']), ('supplement', supplement['additional_pairs'])]:
    for pair in pairs:
        if pair['key'].split(':')[0] != 'dialog':
            continue
        if not pair['headers_token_identical']:
            headers.append({'owner': pair['key'], 'owned_path': pair['owned_path'],
                'tagged_header_sha256': hashlib.sha256(pair['tagged_header'].encode()).hexdigest(),
                'owned_header_sha256': hashlib.sha256(pair['owned_header'].encode()).hexdigest(),
                'review': 'Read exported finite event,public BasePortalOutlet composition,owned reference boundary,testing generic defaults,NgModule ownership,Eager=Default enum identity and owned no-op policy provider;legacy selectors/template/ARIA bindings remain. CSS/native/DI admission is separate.'})
        for difference in pair['differences']:
            key = (pair['key'], difference['key'].split(':')[1])
            assert key in notes, key
            used.add(key)
            reviews.append({'owner': pair['key'], 'owned_owner': pair.get('owned_key', pair['key']),
                'member': difference['key'], 'inventory': origin,
                'tagged_path': pair['tagged_path'], 'owned_path': pair['owned_path'],
                'status': difference['status'],
                'tagged_token_sha256': difference['tagged']['token_sha256'] if difference['tagged'] else None,
                'owned_token_sha256': difference['owned']['token_sha256'] if difference['owned'] else None,
                'source_review': notes[key], 'whole_family_or_native_qualified': False})
assert used == set(notes), sorted(set(notes) - used)
assert len(reviews) == 109 and len(headers) == 8
for path in ['projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts',
    'projects/ngx-material-legacy/legacy-dialog/internal/dialog-initial-focus.ts',
    'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts',
    'projects/ngx-material-legacy/legacy-dialog/dialog-animation-params.ts',
    PREFIX + 'public-binding-qualified.json', PREFIX + 'rx-signature-qualified.json']:
    read(path)
for path, ref in list(bound.items()):
    raw = (ROOT / path).read_bytes()
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256'], path
report = {'schema_version': 1, 'line': '21.x', 'sha': initial['sha'],
    'role': '109remaining dialog member-difference inventory entries and8headers read;all361member differences and71headers now have scoped source judgments,not whole-product qualification',
    'changed_member_reviews': reviews, 'changed_members_read': 109, 'changed_header_reviews': headers,
    'cumulative_changed_member_entries_read': 361, 'cumulative_changed_headers_read': 71,
    'remaining_member_differences': 0, 'remaining_header_differences': 0,
    'count_limit': 'Some reference entries compare shared and legacy leaf declarations to the same current owned class;these are declaration-contract review obligations,not361distinct implementation changes.',
    'original_files_read': 72, 'original_hunks_read': 329,
    'unmatched_declaration_review_complete': False,
    'imported_binding_and_minimum_contract_review_complete': False,
    'product_changes': 0, 'canonical_dispositions_changed': 0, 'exceptions_changed': 0,
    'whole_SHA_substantive_review_complete': False,
    'actual_native_packed_browser_floor_or_full_audit_qualified': False,
    'prior_tests_reexecuted': False, 'g11_claim': 'not-passed', 'source_bindings': list(bound.values())}
with (ROOT / (PREFIX + 'owned-dialog-member-review.json')).open('x') as stream:
    stream.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': 'owned-dialog-member-source-reading-recorded', 'changed_members_read':109,
    'headers_read':8, 'cumulative_member_entries':361, 'remaining_member_differences':0,
    'whole_SHA_qualified':False, 'product_changes':0}))
