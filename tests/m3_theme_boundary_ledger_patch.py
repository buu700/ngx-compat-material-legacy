# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently reconstruct five entries and retain all other original bytes."""
import copy
import hashlib
import json
from pathlib import Path
import re
from autocomplete_selection_source_refs import _git
from unthemable_ledger_patch import replace_entries, preserved, spans

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '6e54c9a1c3dad72f65b048f8f19cb7faa18729dc'
BEFORE = 'ad496e9e699918951057987997121de26e0e66a2c92940316658ae01a49df49a'
PREFIX = 'compatibility/rc/21x-c04-m3-theme-boundary-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '1471cf3de35c1bf86d13e993c9f55f0cef6849dab20ffdd7b4fcc62f74ec044a'
QUALIFICATION = PREFIX + 'source-qualification.json'
QUALIFICATION_HASH = '37d3b1eaa7a4468b48c90435e4d50b5d08053914ff3cb9f6ee2f57505c52ec17'
SHAS = ['3f544ef015fbb8c56e991d4e0a9a539d9e153577','027b171c91fc880aef3b3a66cb7c5d0f5c419501','305af4f0e0e0f68e929b6aeb328296ac42295c16','0df4d082e0aab1958fdbe5aa48fef0203079abc2','32981cc4500a8c0065574bfb1357d2d8a78494de']
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_boundary_successor(root=ROOT, expected_before=None):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None: assert expected_before == before
    raw = (root / REVIEW).read_bytes(); assert HASH(raw) == REVIEW_HASH
    assert HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    review = json.loads(raw); assert [row['sha'] for row in review['reviews']] == SHAS
    original = json.loads(before); assert len({row['sha'] for row in original['entries']}) == 1697
    assert (original['closed_dispositions'], original['open_or_deferred']) == (371, 1326)
    expected, replacements = copy.deepcopy(original), {}
    for row in review['reviews']:
        assert row['status'] == 'reviewed' and row['proposed_final_disposition'] == 'do-not-adopt'
        assert HASH(row['diff'].encode()) == row['diff_sha256']
        index = next(i for i, old in enumerate(original['entries']) if old['sha'] == row['sha'])
        prior = original['entries'][index]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths']
        entry = copy.deepcopy(prior)
        entry.update(final_disposition=row['proposed_final_disposition'], reason=row['decision'], review_depth='individual-compatibility',
            evidence_report=REVIEW, individual_proof=dict(proof_kind='individual-historical-m3-theme-boundary-source-review',
                diff_sha256=row['diff_sha256'], review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
                m3_theme_boundary_source_scope=dict(sha=row['sha'], review=dict(path=REVIEW, sha256=REVIEW_HASH),
                    qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH), source_scope_only=True,
                    actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
        replacements[row['sha']] = entry; expected['entries'][index] = entry
    after = replace_entries(before, replacements)
    text, start, _ = spans(after); header = text[:start]
    for key, old, new in [('closed_dispositions', 371, 376), ('open_or_deferred', 1326, 1321)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    after = (header + text[start:]).encode()
    expected['closed_dispositions'], expected['open_or_deferred'] = 376, 1321
    assert json.loads(after) == expected and preserved(before, after, set(SHAS)) == 1692
    assert expected['g11_claim'] == 'not-passed'
    assert sum(row['final_disposition'] == 'security-review' for row in expected['entries']) == 1
    return before, after


def verify_boundary_successor(root=ROOT, expected_before=None, candidate=None):
    from current_sass_canonical_test_scope import historical424_ledger_test_subject
    subject = historical424_ledger_test_subject(root) if candidate is None else None
    before, after = derive_boundary_successor(root=root, expected_before=expected_before)
    observed = Path(candidate).read_bytes() if candidate is not None else subject['comparison']
    remaining_unthemable_applied = False
    if HASH(observed) == 'cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1':
        from remaining_unthemable_canonical_ledger_patch import derive_remaining_unthemable_successor
        remaining_before, remaining_after = derive_remaining_unthemable_successor(root)
        assert observed == remaining_after
        observed, remaining_unthemable_applied = remaining_before, True
    core_tokenization_applied = False
    if HASH(observed) == '2eadcd59193c5cde7a6dcb9f6c469adca84f46688162d1866ad579c58743bc13':
        from core_tokenization_canonical_ledger_patch import derive_core_tokenization_successor
        core_before, core_after = derive_core_tokenization_successor(root)
        assert observed == core_after
        observed, core_tokenization_applied = core_before, True
    foundation_m3_theme_applied = False
    if HASH(observed) == 'd7d3eab23b0f89f6d366d8e6df1ee7ff659cb26c77edbb517e99b30f757302b0':
        from foundation_m3_theme_canonical_ledger_patch import derive_foundation_m3_theme_successor
        foundation_before, foundation_after = derive_foundation_m3_theme_successor(root)
        assert observed == foundation_after
        observed, foundation_m3_theme_applied = foundation_before, True
    control_m3_theme_applied = False
    if HASH(observed) == '5e4badf5f49969c776d83d6d04d658f8f2082150c29358f88d3f445b216c6a27':
        from control_m3_theme_canonical_ledger_patch import derive_control_m3_theme_successor
        control_before, control_after = derive_control_m3_theme_successor(root)
        assert observed == control_after
        observed, control_m3_theme_applied = control_before, True
    slider_m3_repairs_applied = False
    if HASH(observed) == '1fcc5dba5bb89f9dc9b811cbee7f7a55da2328ee7277a660a0d2a81342d58532':
        from slider_m3_repairs_canonical_ledger_patch import derive_slider_m3_repairs_successor
        slider_before, slider_after = derive_slider_m3_repairs_successor(root)
        assert observed == slider_after
        observed, slider_m3_repairs_applied = slider_before, True
    surface_m3_theme_applied = False
    if HASH(observed) == '3f229d913d93503ace3270b04d268ec8132e63cd97019a05a08c62ac4a0e67fa':
        from surface_m3_theme_canonical_ledger_patch import derive_surface_m3_theme_successor
        surface_before, surface_after = derive_surface_m3_theme_successor(root)
        assert observed == surface_after
        observed, surface_m3_theme_applied = surface_before, True
    button_token_repairs_applied = False
    if HASH(observed) == 'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111':
        from button_token_repairs_canonical_ledger_patch import derive_button_token_repairs_successor
        repair_before, repair_after = derive_button_token_repairs_successor(root)
        assert observed == repair_after
        observed, button_token_repairs_applied = repair_before, True
    button_tokenization_applied = False
    if HASH(observed) == '485ff845dec1d5e57e16a26cc064b4070ea3e5fe020e9858fab02120fadcb6f7':
        from button_tokenization_canonical_ledger_patch import derive_button_tokenization_successor
        button_before, button_after = derive_button_tokenization_successor(root)
        assert observed == button_after
        observed, button_tokenization_applied = button_before, True
    selector_density_applied = False
    if HASH(observed) == 'ce4735ac290b280cb23c5a96b9d5b7d057afd7540505bc73ca6c80eae21694a2':
        from selector_density_canonical_ledger_patch import derive_selector_density_successor
        selector_before, selector_after = derive_selector_density_successor(root)
        assert observed == selector_after
        observed, selector_density_applied = selector_before, True
    inspection_applied = False
    if HASH(observed) == '84ea529d6f2f72925507300e88f9f825d48ae83ea1733191136663d1c8034c17':
        from inspection_compatibility_canonical_ledger_patch import derive_inspection_successor
        inspection_before, inspection_after = derive_inspection_successor(root)
        assert observed == inspection_after
        observed, inspection_applied = inspection_before, True
    title_applied = theming_applied = False
    if HASH(observed) == '9810524e12e3096e7d971ea80a1424614dedecc4818f80c8e31adf86f2aeec37':
        from theming_inspection_canonical_ledger_patch import derive_theming_successor
        theming_before, theming_after = derive_theming_successor(root)
        assert observed == theming_after
        observed, theming_applied = theming_before, True
    if HASH(observed) == '80123c4e8c4f7f43330553ffca84e51fea98e70f545234cf5359c11128e548d7':
        from dialog_title_canonical_ledger_patch import derive_title_successor
        title_before, title_after = derive_title_successor(root)
        assert observed == title_after and title_before == after
        observed, title_applied = title_before, True
    assert observed == after
    if subject is not None:
        subject['assert_current']()
    return dict(line='21.x', exact_title_successor_verified=title_applied, exact_theming_successor_verified=theming_applied, exact_inspection_successor_verified=inspection_applied, exact_selector_density_successor_verified=selector_density_applied, exact_button_tokenization_successor_verified=button_tokenization_applied, exact_button_token_repairs_successor_verified=button_token_repairs_applied, exact_surface_m3_theme_successor_verified=surface_m3_theme_applied, exact_slider_m3_repairs_successor_verified=slider_m3_repairs_applied, exact_control_m3_theme_successor_verified=control_m3_theme_applied, exact_foundation_m3_theme_successor_verified=foundation_m3_theme_applied, exact_core_tokenization_successor_verified=core_tokenization_applied, exact_remaining_unthemable_successor_verified=remaining_unthemable_applied, individual_decisions=5, unselected_entry_bytes_preserved=1692,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        closed_dispositions=376, pending_dispositions=1321, pending_security_reviews=1,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed', g13_claim='not-passed')
