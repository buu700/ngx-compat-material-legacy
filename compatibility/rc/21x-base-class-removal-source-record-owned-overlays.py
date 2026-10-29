# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Record 202 individually read owned overlay/tab member differences; no native acceptance."""
from pathlib import Path
import hashlib
import json
import re

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
prior = json.loads(read(PREFIX + 'owned-control-member-review.json'))
for report in [initial, supplement, prior]:
    for ref in report['source_bindings']:
        assert len(read(ref['path'], ref['sha256'])) == ref['bytes']
assert prior['changed_members_read'] == 50
notes = {}


def note(owner, names, text):
    for name in names.split(','):
        key = (owner, name)
        assert key not in notes, key
        notes[key] = text


note('autocomplete:_MatAutocompleteTriggerBase', '_windowBlurHandler,_getOutsideClickStream,_hasFocus',
    'Focus tests use the owned shadow-piercing active-element helper. Outside-click routing uses '
    'the owned event-target helper and public form-field connected origin;tracked modal/custom '
    'origin and panel containment checks remain. Do not replace historical aria-owns or legacy '
    'origins with current MDC component internals.')
note('autocomplete:_MatAutocompleteTriggerBase', '<constructor>,_breakpointObserver,_handsetLandscapeSubscription',
    'BreakpointObserver comes from the caller-supplied public view injector,not ambient inject(). '
    'The subscription is owned by this trigger and canceled on destroy;this preserves the manual '
    'constructor route while supporting the separately reviewed handset-landscape viewport policy.')
note('autocomplete:_MatAutocompleteTriggerBase', 'ngAfterViewInit,ngOnDestroy,optionSelections,_initialized,_subscribeToClosingActions',
    'The owned initialization subject replaces a zone-stability-only wait and is completed on '
    'initialization/destruction. Closing work uses the owned settled-render helper,with viewport, '
    'landscape and closing subscriptions canceled at destruction. These source observations retain '
    'their prior lifecycle scope and do not qualify actual zoneless Angular node timing.')
note('autocomplete:_MatAutocompleteTriggerBase', 'openPanel,_handleFocus,_handleClick,_openPanelInternal,_attachOverlay,_captureValueOnAttach,_valueOnLastKeydown,_handleKeydown,_handleInput,_assignOptionValue,_getDisplayValue',
    'Owned open paths capture pre-input/pre-autoselection text at the actual attachment boundary; '
    'displayWith extraction and null/changed-option deselection are explicit. The retired later '
    '_captureValueOnAttach hook is replaced by that boundary capture. Landscape changes affect '
    'public position-strategy dimensions/margins,not legacy template/selectors. Retain these '
    'separately reviewed selection/landscape behaviors;current base folding is not their proof.')
note('autocomplete:_MatAutocompleteTriggerBase', 'closePanel',
    'Only the latest opening trigger clears the shared panel open flag;this trigger still clears '
    'its own attachment/autoselection state. This avoids an older trigger closing a newer owner.')
note('autocomplete:_MatAutocompleteBase', '_animationDone',
    'The local completion stream has a finite owned LegacyAutocompleteAnimationEvent contract '
    'rather than importing the obsolete animation engine event type. No claim of every engine '
    'metadata field or current modern component subtype is made.')
note('autocomplete:_MatAutocompleteBase', 'id',
    'The generated default ID gains the legacy coexistence suffix;explicit panel IDs and the '
    'historical selector/IDREF wiring remain. Native IDREF/consumer behavior is a separate gate.')
note('autocomplete:_MatAutocompleteBase', '_latestOpeningTrigger',
    'The panel retains only the latest owner identity;closePanel compares identity before clearing '
    'it. This field does not require current MatAutocompleteTrigger inheritance.')
note('menu:_MatMenuContentBase', '<constructor>,attach,detach,ngOnDestroy',
    'Obsolete ComponentFactoryResolver overloads/argument are removed for the current public '
    'DomPortalOutlet constructor. CDR is required and refreshed on attachment/detachment;destroy '
    'detaches before disposal. This conservative manual-constructor TypeScript change preserves '
    'the supplied template/view/injector/document route;old argument lists require migration.')
note('menu:_MatMenuTriggerBase', 'menu,ngOnDestroy,openMenu,_destroyMenu,_setIsMenuOpen,_pendingRemoval,_attachedMenu,_menuGeneration,_destroyed,_closedMenus,_detachMenu',
    'Owned panel-owner identity,generation checks and subscriptions separate logical close/focus '
    'from delayed physical removal. Reopen/owner transfer/reentrant observers cannot remove a '
    'newer menu;completed menus and destruction prevent reopen. Lazy views detach only for the '
    'actual owner. Public close/focus ordering and native painting remain separately tested gates.')
note('menu:_MatMenuTriggerBase', '<constructor>,_initMenu',
    'The historical shared public current item token is injected explicitly while the parameter '
    'and panel generics use the local retained legacy item contract. Parent menu assignment casts '
    'only the existing panel protocol;this does not restore modern item inheritance or elevation8.')
note('menu:_MatMenuTriggerBase', '_createOverlay,_keydownSubscription,_handleHover',
    'One public overlay keydown subscription exists only while open and forwards to the retained '
    'legacy handler. Hover opens without waiting for an older animation;owner/generation logic '
    'handles transfer. The owned menu template has no duplicate keydown handler. Event transport '
    'does not justify the missing handled-key stopPropagation;the separate proposal restores it.')
note('menu:_MatMenuBase', '_allItems,items,_updateDirectDescendants',
    'Queries use the public item provider token while their types and direct-parent filtering '
    'remain the local historical item/panel contract. Keep the approved owned-item implementation '
    'and its query token bridge rather than current concrete item inheritance.')
note('menu:_MatMenuBase', 'lazyContent',
    'The runtime query retains historical MAT_MENU_CONTENT. Existing any typing bridges the '
    'current nominal panel/content declaration;it is not proof of complete type equivalence. '
    'The actual legacy template portal implementation and constructor were read separately.')
note('menu:_MatMenuBase', 'panelId',
    'The generated panel ID is namespaced for coexistence;legacy classes,role and trigger IDREF '
    'bindings remain. Explicit current modern panel inheritance is not introduced.')
note('menu:_MatMenuBase', 'ngAfterContentInit,_focusCarryItem,focusFirstItem,_applyFirstItemFocus',
    'Focus carry handles removal of a focused item after the DOM has already blurred it. First '
    'item focus has a cancelable request and an already-stable-zone microtask fallback,retaining '
    'origin-aware key-manager focus and the all-disabled panel fallback. No native focus pass is inferred.')
note('menu:_MatMenuBase', '_handleKeydown',
    'The source difference removes the exact tagged stopPropagation call on handled branches. '
    'The owned template delegates once through the public dispatcher,whose inspected minimum '
    'implementation does not stop DOM propagation. Six focused scenarios qualify the separately '
    'recorded one-call restoration;do not accept this omission as harmless.')
note('menu:_MatMenuBase', '_animationDone,_isAnimating,ngOnDestroy,_startAnimation,_resetAnimation,_onAnimationDone,_onAnimationStart,_legacyAnimationsDisabled,_animationsEnabled,_exitFallbackTimeout,_completedAnimation,_motionSequence,_motionDestroyed,_onCssAnimationStart,_onCssAnimationDone,_clearExitFallback,_completeAnimation',
    'Owned CSS-motion state replaces engine callbacks with finite state events,expected-name/host '
    'filtering,sequence checks,one completion,exit fallback cleanup and destruction guards. '
    'Historical first-item scroll reset remains on enter. This base-removal source assessment '
    'does not qualify CSS durations,frames or every lifecycle race;retain explicit final motion gates.')
note('menu:MatLegacyMenuContent', '<constructor>',
    'The explicit leaf constructor forwards the supported six public template/view/injector/ '
    'document/CDR arguments to its owned base. This preserves caller ownership after removal '
    'of the obsolete component factory resolver argument;it creates no application or private peer.')
note('menu:MatLegacyMenuHarness', 'with',
    'The finite local LegacyMenuHarnessFilters retains BaseHarnessFilters plus historical '
    'triggerText:string|RegExp. Predicate and legacy harness constructor stay unchanged;do not '
    'import a modern harness filter extension as an expanded legacy API mirror.')
note('select:MatSelectChange', '<constructor>',
    'The shared event implementation references the local retained select base;the legacy leaf '
    'event keeps its legacy source declaration. No current MatSelect nominal parent is required.')
note('select:_MatSelectBase', '_uid,_valueId',
    'Generated control/value IDs gain a legacy suffix;custom IDs and historical DOM/IDREF wiring '
    'remain subject to final coexistence/accessibility gates.')
note('select:_MatSelectBase', '_overlayPanelClass,_disableOptionCentering,<constructor>',
    'Default-option reads move into the constructor after parameter-property assignment. The '
    'added injector is optional for historical manual construction and supports settled-render '
    'coordination;default centering and panel-class values are preserved.')
note('select:_MatSelectBase', 'optionSelectionChanges,ngAfterContentInit,_initialized',
    'The owned readiness subject permits an already-stable zone to start the option stream; '
    'options must exist and destruction cancels the initial wait. No zone-only wakeup is assumed.')
note('select:_MatSelectBase', 'ngOnDestroy,open,close,_onAttached,_canOpen,_overlayAttached,_panelExiting,_exitCleanup,_motionSequence,_motionDestroyed,_completedEnterAnimation,_exitAndDetach,_cancelExit,_completePanelExit,_completePanelEnter,_selectAnimationsEnabled,_onPanelAnimationEnd',
    'Logical open/close,physical attachment and native motion completion are separately owned. '
    'Sequence/destroy/reentrancy checks protect CDR/touched/position callbacks;exit listeners/ '
    'fallbacks are canceled and only the current phase completes. Host/name filters ignore '
    'unrelated animation events. Retain historical overlap/centering geometry;native motion/ '
    'style/frame equivalence is a separate required gate.')
note('select:_MatSelectBase', '_getTriggerAriaLabelledby,describedByIds',
    'The value ID is excluded from the accessible name under the separate labelledby change; '
    'empty labels remove the attribute. describedByIds reads the existing native attribute for '
    'the form-field bridge. This does not close the separate pending aria-autocomplete SHA.')
note('select:MatLegacySelect', 'open,_legacyAnimationsDisabled,_animationsEnabled,_selectAnimationsEnabled',
    'The leaf keeps historical pre-open geometry/font measurement and applies inherited font '
    'size after owned settled-render coordination only while open/alive. Its owned motion policy '
    'controls the base finite animation hooks;modern non-overlap width/position logic is not substituted.')
note('snack-bar:_MatSnackBarContainerBase', '_liveElementId',
    'The generated live region ID is namespaced for legacy coexistence;role/modal IDREF behavior '
    'remains separately reviewed and native accessibility is not inferred.')
note('snack-bar:_MatSnackBarContainerBase', 'attachDomPortal',
    'Generic public portal dispatch replaces the deprecated hook call. On failure,the owned '
    'adapter restores historical attachment/host flags and rethrows;post-attachment work only '
    'runs after success. Keep the earlier route-recovery ownership contract.')
note('snack-bar:_MatSnackBarContainerBase', 'onAnimationEnd,enter,exit,ngOnDestroy,_completeExit,_screenReaderAnnounce,_exitCompletionPending,_notifyEnter,_notifyExitComplete,_afterEnterMotionStarted,_afterExitMotionStarted',
    'Finite CSS-motion callbacks retain historical visible/hidden and announcement hooks. '
    'CDR marks refresh host classes,destruction cancels announcement work,and one exit completion '
    'uses the original unstable-zone wait or stable-zone microtask. Empty protected start hooks '
    'are extension slots with concrete legacy leaf implementations,not Sass compilation stubs. '
    'Native timing/portal/announcement behavior remains a final gate.')
note('snack-bar:_MatSnackBarBase', 'simpleSnackBarComponent,open,_attach,_animateSnackBar',
    'The service uses the owned legacy text-only protocol/config defaults and historical handset '
    'class. Duration subscribes before synchronous no-motion enter so it cannot miss afterOpened. '
    'The separately assessed local reference is retained;the qualified shared-token provider '
    'bridge remains unapplied. Modern container/ref nominal identity is not reintroduced.')
note('snack-bar:MatLegacySnackBarContainer', '_legacyAnimationsDisabled,_animationsEnabled,_enterFallback,_exitFallback,_afterEnterMotionStarted,_afterExitMotionStarted,onAnimationEnd,ngOnDestroy',
    'The concrete leaf implements the base start hooks with owned motion policy and cancelable '
    'enter/exit fallbacks. No-motion exit remains asynchronous;expected host animation completions '
    'cancel matching timers and destruction cancels both. Retain original container/portal markup; '
    'this source reading does not requalify actual native CSS or stream zone behavior.')
note('tabs:_MatTabBodyBase', '_translateTabComplete,animationDuration,<constructor>,ngOnInit,ngOnDestroy,_onTranslateTabStarted,_computePositionAnimationState,_fallbackTimer,_initialized,_destroyed,_pendingTransition,_deferredCentering,_originTransition,_ngZone,_changeDetectorRef,_previousPosition,_contentElement,_animationDurationInput,_legacyAnimationsDisabled,ngAfterViewInit,_contentIsVisible,_onContentTransitionStart,_onContentTransitionEnd,_startTransition,_finishTransition,_scheduleTransitionDone,_setActiveClass,_cssAnimationsDisabled',
    'The owned finite transition phase replaces engine start/done callbacks while preserving '
    'historical left/right/origin-center names,center/leaving outputs and active/animating selectors. '
    'Content is attached before measurement;initial origin layout temporarily writes/restores only '
    'its own unchanged style values. Phase identity/reentrancy/destroy checks protect output/ '
    'layout callbacks;duration plus delivery-margin fallback is canceled on completion/destruction. '
    'This is an existing motion adaptation,not a current base transplant or native/style acceptance.')
note('tabs:_MatTabGroupBase', '_allTabs,_tabs,ngAfterContentChecked,ngAfterContentInit,_subscribeToAllTabChanges,_handleClick',
    'Tab queries,locals and click arguments reference the local retained tab base rather than '
    'current MatTab. Position/origin/selection logic is otherwise retained;nearest-group filtering '
    'and the historical minimal header protocol remain the required ownership boundaries.')
note('tabs:_MatTabGroupBase', 'ariaLabel,ariaLabelledby,_animationsDisabled',
    'Existing accessibility inputs and finite zero-duration/no-motion detection support legacy '
    'headers. Do not infer complete current tab inputs or native M3 theming from these additions.')
note('tabs:MatTabChangeEvent', 'tab',
    'The event points to the retained local tab base;no current concrete MatTab subtype is claimed.')
note('tabs:_MatTabNavBase', 'updateActiveLink',
    'The owned method omits the exact tagged immediate ink-bar hide. Later content-check alignment '
    'does not preserve that synchronous side effect. Four focused scenarios and exact tagged '
    'method token identity qualify the separate one-call restoration proposal;it remains unapplied.')
note('tabs:_MatTabLinkBase', 'id,_handleKeydown',
    'Generated link IDs are namespaced. Space prevents page scrolling before forwarding a panel '
    'link click;Enter keeps navigation default behavior. Historical directive link/ripple structure '
    'and optional navigation-panel contract are retained.')
note('tabs:_MatTabBase', 'templateLabel',
    'Public accessors forward to the existing protected template-label setter and preserve the '
    'required nearest-tab parent context;the legacy leaf explicitly overrides the same accessors.')
note('tabs:MatLegacyTabBodyPortal', '<constructor>,_centeringSub,_leavingSub,_host,ngOnInit,ngOnDestroy',
    'The removed modern body portal parent is replaced by a genuine public CdkPortalOutlet '
    'constructor adapter. Explicit host fields and centering/leaving subscriptions preserve '
    'legacy attachment/preserveContent behavior and unsubscribe on destroy. Obsolete resolver '
    'constructor arguments are removed;this reading does not rerun the prior genuine-parent/ '
    'factory/node-context qualification or claim all public parent surfaces.')
note('tabs:MatLegacyTabBody', '_portalHost,<constructor>',
    'The view query targets the owned concrete portal;the explicit ElementRef spelling retains '
    'manual constructor forwarding to the owned base,including optional Directionality. No '
    'current modern tab body component or structure is introduced.')
note('tabs:MatLegacyTabNavPanel', 'id',
    'Only the generated default panel ID gains the coexistence suffix;the optional legacy '
    'navigation-panel role/control contract remains.')
note('tabs:MatLegacyTab', 'templateLabel',
    'The leaf marks its existing content-query accessor overrides explicitly,retaining the '
    'same local label token,protected setter and nearest legacy parent binding.')
note('tooltip:_MatTooltipHarnessBase', '_optionalPanel',
    'The finite ()=>Promise<TestElement|null> spelling matches the authenticated historical '
    'AsyncFactoryFn alias;the legacy tooltip panel locator is unchanged.')
note('tooltip:_MatTooltipBase', 'disabled,message,ngOnDestroy,_ariaDescriptionPending,_ariaDescriptionDestroyed,_syncAriaDescription',
    'One deferred description task observes the latest message/disabled state after bound '
    'aria-label updates. Prior description is removed before scheduling and destruction prevents '
    'late describe calls. No current tooltip DOM/classes or accessibility node behavior is inferred.')
note('tooltip:_MatTooltipBase', '_createOverlay,_updateTooltipMessage',
    'Clipping uses fresh pane/ancestor rectangles before consumer position classes can alter '
    'styles;public position-change/key event types replace inferred internals. Message reposition '
    'waits for owned settled-render coordination and cancels on destroy. Legacy offset/handset '
    'component hooks are retained;no modern margin8 or native geometry acceptance is implied.')
note('tooltip:_TooltipComponentBase', '<constructor>,_handleAnimationEnd,_toggleVisibility',
    'The owned disabled-motion policy combines with the historical optional no-op token. Expected '
    'host animation filtering excludes unrelated completion events;visibility changes mark the '
    'view while keeping legacy animation classes and manual constructor parameters.')

families = {'autocomplete', 'menu', 'select', 'snack-bar', 'tabs', 'tooltip'}
reviews = []
used = set()
for pair in initial['pairs']:
    if pair['key'].split(':')[0] not in families:
        continue
    for difference in pair['differences']:
        key = (pair['key'], difference['key'].split(':')[1])
        assert key in notes, key
        used.add(key)
        reviews.append({'owner': pair['key'], 'member': difference['key'],
            'tagged_path': pair['tagged_path'], 'owned_path': pair['owned_path'],
            'status': difference['status'],
            'tagged_token_sha256': difference['tagged']['token_sha256'] if difference['tagged'] else None,
            'owned_token_sha256': difference['owned']['token_sha256'] if difference['owned'] else None,
            'source_review': notes[key], 'whole_family_or_native_qualified': False})
assert used == set(notes), sorted(set(notes) - used)
assert len(reviews) == 202, len(reviews)
headers = [{'owner': p['key'], 'owned_path': p['owned_path'],
    'tagged_header_sha256': hashlib.sha256(p['tagged_header'].encode()).hexdigest(),
    'owned_header_sha256': hashlib.sha256(p['owned_header'].encode()).hexdigest(),
    'scope': 'Changed header read:NgModule ownership/resource source extensions,retained legacy tokens/queries,owned event transport/native motion,optional panel/genuine portal parent and minimum Eager enum. No compiled CSS/node-DI/native acceptance.'}
    for p in initial['pairs'] + supplement['additional_pairs']
    if p['key'].split(':')[0] in families and not p['headers_token_identical']]
assert len(headers) == 39
for path in ['nav-inkbar-proposal-qualified.json', 'menu-keyboard-proposal-qualified.json',
    'snack-reference-assessment.json', 'error-harness-assessment.json']:
    read(PREFIX + path)
for path in ['projects/ngx-material-legacy/legacy-menu/menu.html',
    'projects/ngx-material-legacy/legacy-menu/testing/menu-harness-filters.ts',
    'node_modules/@angular/core/types/core.d.ts',
    'node_modules/@angular/core/types/_discovery-chunk.d.ts',
    'node_modules/@angular/cdk/fesm2022/_overlay-module-chunk.mjs']:
    read(path)
core = read('node_modules/@angular/core/types/core.d.ts').decode()
token = core[core.rfind('/**', 0, core.index('declare const ANIMATION_MODULE_TYPE')):
    core.index('declare const ANIMATION_MODULE_TYPE')]
assert '@publicApi' in token and '@deprecated' not in token
enum = read('node_modules/@angular/core/types/_discovery-chunk.d.ts').decode()
enum = enum[enum.index('declare enum ChangeDetectionStrategy'):]
enum = enum[:enum.index('\n}')]
assert re.search(r'Eager\s*=\s*1', enum) and re.search(r'Default\s*=\s*1', enum)
assert '@deprecated Use `Eager` instead.' in enum
for path, ref in list(bound.items()):
    raw = (ROOT / path).read_bytes()
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256'], path
report = {'schema_version': 1, 'line': '21.x', 'sha': initial['sha'],
    'role': '202 actual changed overlay/tab member source differences read and assessed;partial complete-SHA owned/minimum assessment,not native/API admission',
    'families': sorted(families), 'changed_member_reviews': reviews, 'changed_members_read': len(reviews),
    'changed_header_reviews': headers, 'previous_changed_members_read': prior['changed_members_read'],
    'cumulative_changed_members_read': prior['changed_members_read'] + len(reviews),
    'remaining_combined_member_differences': initial['member_differences'] + supplement['additional_member_differences'] - prior['changed_members_read'] - len(reviews),
    'remaining_member_family': 'dialog', 'minimum_public_token_deprecation_checked': True,
    'minimum_Eager_Default_identity_checked': True,
    'new_reproduced_contract_gaps': ['immediate nav ink-bar hide', 'handled menu key propagation'],
    'new_unapplied_proposal_scenarios': {'nav-inkbar': 4, 'menu-keyboard': 6},
    'original_files_read': 72, 'original_hunks_read': 329,
    'unmatched_declaration_review_complete': False,
    'imported_binding_and_minimum_contract_review_complete': False,
    'product_changes': 0, 'canonical_dispositions_changed': 0, 'exceptions_changed': 0,
    'whole_SHA_substantive_review_complete': False,
    'actual_native_packed_browser_floor_or_full_audit_qualified': False,
    'prior_tests_reexecuted': False, 'g11_claim': 'not-passed', 'source_bindings': list(bound.values())}
assert report['remaining_combined_member_differences'] == 109
with (ROOT / (PREFIX + 'owned-overlay-member-review.json')).open('x') as stream:
    stream.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': 'owned-overlay-member-source-reading-recorded',
    'new_changed_members_read': len(reviews), 'new_headers_read': len(headers),
    'cumulative_member_differences_read': report['cumulative_changed_members_read'],
    'remaining_member_differences': report['remaining_combined_member_differences'],
    'whole_SHA_qualified': False, 'product_changes': 0}))
