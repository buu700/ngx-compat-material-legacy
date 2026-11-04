# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Record bounded source evidence; does not compile or execute Angular code."""
from pathlib import Path
import gzip, hashlib, json, re
ROOT = Path.cwd()
MAIN = Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX = 'compatibility/rc/parallel-overlay-dispose-navigation-'
H = lambda raw: hashlib.sha256(raw).hexdigest()
originals = json.loads(gzip.decompress((ROOT / (PREFIX + 'originals.json.gz')).read_bytes()))
refs = []
def read(root, path, role):
    raw = (root / path).read_bytes()
    refs.append({'root': str(root), 'path': path, 'sha256': H(raw), 'bytes': len(raw), 'role': role})
    return raw.decode()

peer = []
for root, version in [(ROOT, '21.2.14'), (MAIN, '22.1.7')]:
    manifest = json.loads(read(root, 'node_modules/@angular/cdk/package.json', 'installed public CDK identity'))
    assert manifest['name'] == '@angular/cdk' and manifest['version'] == version
    typings = read(root, 'node_modules/@angular/cdk/types/overlay.d.ts', 'public overlay exports')
    declarations = read(root, 'node_modules/@angular/cdk/types/_overlay-module-chunk.d.ts', 'actual public declaration source')
    source = read(root, 'node_modules/@angular/cdk/fesm2022/_overlay-module-chunk.mjs', 'actual installed CDK implementation')
    dialog = read(root, 'node_modules/@angular/cdk/fesm2022/dialog.mjs', 'actual installed CDK Dialog navigation mapping')
    read(root, 'node_modules/@angular/cdk/types/dialog.d.ts', 'public CDK Dialog config')
    read(root, 'node_modules/@angular/material/package.json', 'installed Material identity')
    read(root, 'node_modules/@angular/material/types/_dialog-chunk.d.ts', 'public Material Dialog config')
    assert 'CdkConnectedOverlay' in typings and 'OverlayModule' in typings
    connected = source[source.index('class CdkConnectedOverlay {'):]
    assert 'disposeOnNavigation = false;' in connected
    assert 'disposeOnNavigation: this.disposeOnNavigation' in connected
    assert 'disposeOnNavigation: ["cdkConnectedOverlayDisposeOnNavigation", "disposeOnNavigation", booleanAttribute]' in connected
    assert 'disposeOnNavigation: boolean;' in declarations
    assert '"disposeOnNavigation": { "alias": "cdkConnectedOverlayDisposeOnNavigation";' in declarations
    assert 'this._location.subscribe(() => this.dispose())' in source
    assert 'disposeOnNavigation = false;' in source[source.index('class OverlayConfig {'):source.index('class ConnectionPositionPair {')]
    assert 'disposeOnNavigation: config.closeOnNavigation' in dialog and 'closeOnNavigation = true;' in dialog
    assert 'this.disposeOnNavigation = config.disposeOnNavigation ?? this.disposeOnNavigation;' in connected
    peer.append({'version': version, 'public_peer_feature_present': True, 'default': False,
        'input_alias': 'cdkConnectedOverlayDisposeOnNavigation', 'property': 'disposeOnNavigation',
        'attribute_transform': 'booleanAttribute', 'creation_config_mapping': True,
        'later_shorthand_config_supported': True, 'location_subscription': 'Location.subscribe, not Router.events',
        'dialog_config_field_is_distinct': 'closeOnNavigation -> OverlayConfig.disposeOnNavigation',
        'source_only': True, 'runtime_executed': False})

owned_paths = [
 'projects/ngx-material-legacy/legacy-select/select.html',
 'projects/ngx-material-legacy/legacy-select/select-module.ts',
 'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
 'projects/ngx-material-legacy/legacy-dialog/dialog-config.ts',
 'projects/ngx-material-legacy/legacy-dialog/dialog.ts',
 'projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts',
 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',
 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts',
 'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts',
 'projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',
 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
 'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-ref.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts',
 'tests/dialog_caller_owned_contract_subject.mjs',
 'tests/dialog_caller_owned_service_subject.mjs']
owned = {path: read(ROOT, path, 'owned caller/config/lifetime or existing source test') for path in owned_paths}
select = owned[owned_paths[0]]
assert 'cdk-connected-overlay' in select and 'cdkConnectedOverlayDisposeOnNavigation' not in select
assert 'OverlayModule' in owned[owned_paths[1]]
assert 'CdkConnectedOverlay' in owned[owned_paths[2]]
for path in [owned_paths[9], owned_paths[10], owned_paths[11], owned_paths[12]]:
    assert 'disposeOnNavigation' not in owned[path]
assert 'extends DialogConfigBase' in owned[owned_paths[3]]
assert 'closeOnOverlayDetachments: false' in owned[owned_paths[6]]
assert '_ref.overlayRef.detachments().subscribe' in owned[owned_paths[5]]
assert "{closeOnNavigation: false}" in owned[owned_paths[8]]
assert 'mockLocation.simulateUrlPop' in owned[owned_paths[8]]
assert 'new MatLegacyDialogContainer' in owned[owned_paths[8]]

cyph_root = Path('/home/parallels/cyph')
cyph_paths = ['shared/js/cyph/services/material-dialog.service.ts', 'shared/js/cyph/modules/cyph-web.module.ts']
cyph_text = [read(cyph_root, path, 'readonly Cyph integration sanity') for path in cyph_paths]
assert 'MatLegacyDialog as MatDialog' in cyph_text[0]
assert all('disposeOnNavigation' not in text and 'closeOnNavigation' not in text for text in cyph_text)

hunk_decisions = []
descriptions = [
 'Angular booleanAttribute import exists only to transform the new CDK input. The owned package does not own or fork the CDK directive; both installed peers already supply it.',
 'New directive backing state defaults false. Preserve the same default for owned select and all manual overlay constructors.',
 'New CDK input alias and public boolean property are already public on both supported peer versions. Do not mirror this as a new MatLegacySelect or other owned input.',
 'The new property is copied into OverlayConfig when the peer directive first creates its overlay. Existing manual OverlayConfig callers already use the public overlay contract and are not changed by this hunk.',
 'Public API getter/setter golden documents the peer directive addition; the owned package must not copy current CDK declarations into its own API.',
 'The accepted input type declaration records Angular input transformation. It is not proof that assigning an arbitrary string directly to a boolean TypeScript property is equivalent to template input coercion.',
 'The directive input alias metadata is part of the real CDK surface. The alias applies to CdkConnectedOverlay, not the legacy select component selector.'
]
assert len(originals['hunks']) == len(descriptions) == 7
for hunk, judgment in zip(originals['hunks'], descriptions):
    hunk_decisions.append({k: hunk[k] for k in ['path', 'index', 'header', 'sha256']} | {
        'source_judgment': judgment, 'proposed_source_disposition': 'already-adapted',
        'owned_product_change_required': False, 'runtime_native_or_floor_qualified': False})

def file_ref(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'sha256': H(raw), 'bytes': len(raw)}
ledger_raw = (ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_bytes()
ledger = json.loads(ledger_raw)
assert len(ledger['entries']) == len({row['sha'] for row in ledger['entries']}) == 1697
assert sum(row['final_disposition'] == 'security-review' for row in ledger['entries']) == 1

result = {'schema_version': 1, 'line': '21.x', 'sha': originals['sha'],
 'status': 'source-review-complete-no-owned-product-defect-proved',
 'proposed_final_disposition': 'already-adapted',
 'decision': 'The complete two-file/seven-hunk change adds a public CDK connected-overlay opt-in. Both installed public peers already own this feature. Preserve tagged legacy defaults and existing public peer delegation; add no owned CDK/directive mirror, no new legacy component input, and no navigation policy change.',
 'original_authentication': {'files': 2, 'hunks': 7, 'trees': len(originals['tree_objects']),
    'patch_sha256': originals['patch_sha256'], 'tag': '16.2.14', 'tagged_members': len(originals['tagged_members']),
    'anonymous_missing_blob_reads': len(originals['anonymous_blob_receipts']), 'anonymous_patch_reads': 1,
    'shared_cache_modified': False, 'all_hunks_exactly_replayed': True,
    'census_omitted_from_seed': ['tools/public_api_guard/cdk/overlay.md']},
 'hunk_decisions': hunk_decisions, 'installed_peer_review': peer,
 'caller_review': [
    {'family': 'select', 'route': 'MatLegacySelect template -> imported public OverlayModule -> CdkConnectedOverlay; ViewChild has actual CdkConnectedOverlay identity',
     'default': 'No disposeOnNavigation input is bound, so peer default false remains unless a consumer supplies public CDK default configuration.',
     'lifetime': 'Peer directive disposes on destruction; owned select clears motion state, streams and key manager on destruction. Internal attach/detach callbacks remain wired to owned close state.'},
    {'family': 'dialog', 'route': 'MatLegacyDialogConfig extends the current public MatDialogConfig; owned base spreads defaults/config into public CDK Dialog.open; peer maps closeOnNavigation to OverlayConfig.disposeOnNavigation',
     'default': 'closeOnNavigation inherits public true; consumer false remains distinct from disableClose and from overlay-level input alias.',
     'lifetime': 'Owned DialogRef handles actual peer-overlay detachments and completes legacy close state. CDK closeOnOverlayDetachments is disabled so that owned lifetime handling remains authoritative.'},
    {'family': 'manual dialog construction', 'route': 'Existing tests construct a legacy container around an explicitly supplied public OverlayRef',
     'lifetime': 'A container is not a Dialog.open service call. The caller-supplied OverlayConfig controls navigation disposal; do not add a container Location subscription or infer that a dialog config mutates a separately created OverlayRef.'},
    {'family': 'autocomplete', 'route': 'Owned trigger -> public Overlay.create(new OverlayConfig(...))',
     'default': 'No navigation opt-in, same as tagged16. Trigger destroy disposes/nulls the retained OverlayRef; detachments participate in panel closing.'},
    {'family': 'menu', 'route': 'Owned trigger -> public OverlayConfig / Overlay.create',
     'default': 'No navigation opt-in, same as tagged16. Menu closes through backdrop/parent/hover/detachments; destroy detaches/disposes the owned retained reference and unsubscribes close/keyboard work.'},
    {'family': 'tooltip', 'route': 'Owned tooltip -> public Overlay.create(config object)',
     'default': 'No navigation opt-in, same as tagged16. Detachments hide/detach the tooltip; directive destroy disposes its overlay and owned subscriptions.'},
    {'family': 'snack bar', 'route': 'Owned service -> new public OverlayConfig -> Overlay.create',
     'default': 'No navigation opt-in, same as tagged16. Owned dismiss/exit timing reaches _finishDismiss and disposes its overlay; do not silently make navigation an early-dismiss trigger.'}
 ],
 'identity_and_timing_limits': [
    'The input alias cdkConnectedOverlayDisposeOnNavigation, directive boolean property disposeOnNavigation, OverlayConfig.disposeOnNavigation and DialogConfig.closeOnNavigation are distinct surfaces. Their mapping is proved only at the inspected public peer implementation boundaries.',
    'Template booleanAttribute coercion is not the same as arbitrary direct property assignment or later shorthand config assignment.',
    'Both current directives copy disposeOnNavigation during overlay creation; ngOnChanges only updates position/size/open here. Do not assume changing the property after creation updates an existing OverlayRef config.',
    'Both peers also offer CDK_CONNECTED_OVERLAY_DEFAULT_CONFIG and later shorthand config. No such override was found in owned or readonly Cyph production sources; preserve consumer opt-in capability instead of hard-coding a new legacy policy.',
    'Disposal subscribes to Angular Location, covering browser history and location strategy behavior. It is not a blanket Router NavigationStart listener and does not promise closing on every programmatic route transition.'
 ],
 'cyph_sanity': {'readonly': True, 'legacy_dialog_alias_import': True, 'legacy_dialog_service_calls_present': True,
    'explicit_navigation_flag_or_connected_overlay_binding_found': False,
    'no_consumer_HTML_CSS_or_SCSS_change_required_by_recommendation': True,
    'scope': 'Read the actual material dialog service and module; searched TypeScript/HTML under shared/js/cyph for navigation flags and connected-overlay configuration. This is not a Cyph build or behavioral qualification.'},
 'concrete_owned_bug': None,
 'evidence': [file_ref(PREFIX + suffix) for suffix in ['originals.json.gz', 'whole-original.patch', 'capture.py', 'record-review.py']],
 'read_only_canonical_context': {'reference': file_ref('compatibility/f10/disposition-ledger/ledger.json'),
    'entries': 1697, 'security_review_entries': 1, 'closed_dispositions': ledger['closed_dispositions'],
    'open_or_deferred': ledger['open_or_deferred'], 'current_selected_disposition': next(row['final_disposition'] for row in ledger['entries'] if row['sha'] == originals['sha']),
    'role': 'Acquisition-time status only; this review changes no canonical metadata and grants no live owner acceptance.'},
 'runtime_lifecycle_tests_required_before_behavior_or_floor_claim': [
    'On each installed minimum peer, exercise the real public CDK directive default false and true/false input transformation before first creation. Verify actual OverlayRef config and exact detach/dispose counts.',
    'With a real Angular Location/MockLocation, exercise back/forward pop events and hash strategy separately from Router programmatic navigation. True disposes once, false preserves attachment, and explicit detach/destroy releases subscriptions.',
    'Preserve legacy dialog default navigation close and closeOnNavigation:false opt-out independently of disableClose. Verify beforeClosed/afterClosed, openDialogs/afterAllClosed cleanup, focus restoration and exactly-once events when navigation overlaps enter/exit and reentrant close.',
    'Test public CDK default-config opt-in only on real connected overlays, including the legacy select internal directive; verify closing state, destruction, navigation while exiting and attempted reopen after disposal. Do not assume a stale disposed overlay can be reused.',
    'Keep menu/autocomplete/tooltip/snack-bar no-opt-in navigation behavior and route destruction cleanup. For any future opt-in change, explicitly prove lifetime/animation/cleanup ordering and review targeted styles.',
    'For manually constructed containers/refs, distinguish a caller-created OverlayConfig false/true from a separate MatLegacyDialogConfig. Verify only the supplied overlay determines navigation disposal and no duplicate location listener or close notification is introduced.'
 ],
 'verification': {'whole_original_authentication_and_patch_replay_executed': True,
    'current_public_peer_and_owned_source_assertions_executed': True,
    'Angular_or_upstream_program_executed': False, 'runtime_lifecycle_tests_executed': False,
    'compiler_build_browser_install_full_owner_Actions_or_matrix_executed': False},
 'source_bindings': refs,
 'canonical_decisions_or_registry_or_roster_changes': 0, 'product_changes': 0,
 'all_1697_entries_and_one_security_review_entry_preserved': True,
 'canonical_admission_granted': False, 'actual_native_packed_browser_floor_or_full_audit_qualified': False,
 'g11_claim': 'not-passed', 'full_audit_plan_closed': False}
(ROOT / (PREFIX + 'source-review-v1.json')).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'hunks_reviewed': len(hunk_decisions), 'current_source_refs': len(refs),
    'proposed_disposition': result['proposed_final_disposition'], 'product_changes': 0, 'runtime_qualified': False}))
