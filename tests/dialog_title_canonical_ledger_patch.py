# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent one-decision/fourteen-token reconstruction, with no candidate-derived expectations."""
import copy
import hashlib
import json
from pathlib import Path
import re
from autocomplete_selection_source_refs import _git
from unthemable_ledger_patch import replace_entries, spans

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '33e11b2965c9ff559865bc81298e6766653672be'
BEFORE = '22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779'
AFTER = '80123c4e8c4f7f43330553ffca84e51fea98e70f545234cf5359c11128e548d7'
SHA = '642d886ef117721a34c98055391c9055fde29607'
PREFIX = 'compatibility/rc/21x-c04-dialog-title-replacement-'
REVIEW = PREFIX + 'individual-review.json'
SOURCE = PREFIX + 'canonical-qualified-owner-source-measurement.json'
SOURCE_HASH = '5911c0c1d0b72c3990a1be798132f970f65bd37aa480da5b00ab93c804d47985'
PACKET = PREFIX + 'canonical-admitted-transition.json'
PACKET_HASH = '87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea'
NATIVE = 'scripts/upstream-historical-behavior-evidence.mjs'
NATIVE_BEFORE = '2e3d0d372775457655239efabd3769ca3b8bd1e0de42333bd48f9926bf1c3044'
NATIVE_AFTER = '8efdc7640a20c9c6b163c3e93b664d4b4384979fb0c23304b8d3f4fad02570c1'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_title_successor(root=ROOT):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    raw = (root / REVIEW).read_bytes()
    assert HASH(raw) == '794ffdc1bdfc7d2d234ee2ff46a591f74c471b38dee40343a551d9354f9cb4c3'
    body = json.loads(raw); row, = body['reviews']
    assert row['sha'] == SHA and row['status'] == 'reviewed'
    assert row['diff_sha256'] == '13c81abcdf9b4b4e80e864db636af1eeb31bb1ca44110d0358e43763e5bce2b6'
    assert HASH(row['diff'].encode()) == row['diff_sha256']
    assert HASH((root / SOURCE).read_bytes()) == SOURCE_HASH
    packet_raw = (root / PACKET).read_bytes(); assert HASH(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    data = json.loads(before); expected = copy.deepcopy(data)
    assert len(data['entries']) == len({entry['sha'] for entry in data['entries']}) == 1697
    text, _, ranges = spans(before)
    selected, edits = [], []
    for i, entry in enumerate(data['entries']):
        for j, member in enumerate(entry.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', [])):
            if member['path'] != NATIVE: continue
            assert member == dict(path=NATIVE, sha256=NATIVE_BEFORE)
            selected.append(dict(sha=entry['sha'], source_member_index=j))
            expected['entries'][i]['individual_proof']['historical_behavior']['source_members'][j]['sha256'] = NATIVE_AFTER
            start, end = ranges[i]
            matches = list(re.finditer(r'("path": "scripts/upstream-historical-behavior-evidence\.mjs",\n\s+"sha256": ")([0-9a-f]{64})(")', text[start:end]))
            assert len(matches) == 1 and matches[0][2] == NATIVE_BEFORE
            edits.append((start + matches[0].start(2), start + matches[0].end(2), NATIVE_AFTER))
    assert len(selected) == 14 and selected == packet['metadata_selection']
    chunks, cursor = [], 0
    for start, end, value in edits:
        assert start >= cursor
        chunks.extend((text[cursor:start], value)); cursor = end
    chunks.append(text[cursor:]); metadata = ''.join(chunks).encode()
    assert json.loads(metadata) == expected and HASH(metadata) == packet['metadata_ledger_sha256']
    index = next(i for i, entry in enumerate(data['entries']) if entry['sha'] == SHA)
    prior = expected['entries'][index]
    assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
    assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
    proof = dict(proof_kind='individual-owned-dialog-title-lifetime', diff_sha256=row['diff_sha256'],
        review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
        dialog_title_source_scope=dict(sha=SHA, review=dict(path=REVIEW, sha256=HASH(raw)),
            qualification=dict(path=SOURCE, sha256=SOURCE_HASH), source_scope_only=True,
            actual_native_artifact_browser_floor_or_full_audit_qualified=False),
        historical_behavior=dict(kind='owned-dialog-title-lifetime', required=True,
            case_ids=[f'release/21.x/{engine}/{runtime}/dialog/default' for runtime in ['zoneful','zoneless'] for engine in ['chromium','firefox','webkit']],
            observation_rows_per_case=42, source_contract=dict(path=SOURCE, sha256=SOURCE_HASH)))
    entry = copy.deepcopy(prior)
    entry.update(final_disposition='already-adapted', reason=row['decision'], review_depth='individual-compatibility', evidence_report=REVIEW, individual_proof=proof)
    after = replace_entries(metadata, {SHA: entry})
    text, start, _ = spans(after); header = text[:start]
    for key, old, new in [('closed_dispositions',376,377), ('open_or_deferred',1321,1320)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    after = (header + text[start:]).encode()
    expected['entries'][index] = entry
    expected['closed_dispositions'], expected['open_or_deferred'] = 377, 1320
    assert json.loads(after) == expected and HASH(after) == AFTER == packet['after']['sha256']
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == [entry for entry in data['entries'] if entry['final_disposition'] == 'security-review']
    assert sum(entry['final_disposition'] == 'security-review' for entry in expected['entries']) == 1
    assert expected['g11_claim'] == 'not-passed'
    before_text, _, before_ranges = spans(before); after_text, _, after_ranges = spans(after)
    selected_ids = {entry['sha'] for entry in selected} | {SHA}
    assert len(selected_ids) == 15
    for i, entry in enumerate(data['entries']):
        if entry['sha'] not in selected_ids:
            assert before_text[slice(*before_ranges[i])] == after_text[slice(*after_ranges[i])]
    from current_sass_canonical_test_scope import historical_title_source_test_subject
    source_subject = historical_title_source_test_subject(root)
    for member in packet['source_members'] + [packet['root_checker']]:
        value = source_subject['comparison_bytes'](member)
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8':
            from remaining_unthemable_canonical_ledger_patch import verify_remaining_unthemable_registry_successor
            remaining_before, remaining_after = verify_remaining_unthemable_registry_successor(root)
            assert value == remaining_after
            value = remaining_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == 'c1d47c7662500e98aa34b37e964227961796ff16f500289019b221b4edacc841':
            from core_tokenization_canonical_ledger_patch import verify_core_tokenization_registry_successor
            core_before, core_after = verify_core_tokenization_registry_successor(root)
            assert value == core_after
            value = core_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == '99236700a066edfa8ab5dd2fbc08c92de86334839bad161467e246e4a91a3895':
            from foundation_m3_theme_canonical_ledger_patch import verify_foundation_m3_theme_registry_successor
            foundation_before, foundation_after = verify_foundation_m3_theme_registry_successor(root)
            assert value == foundation_after
            value = foundation_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == 'ae4d9e85741a782bdd2f9be8e7686bab3b3d4cb0e645224eab8207fb0e376340':
            from control_m3_theme_canonical_ledger_patch import verify_control_m3_theme_registry_successor
            control_before, control_after = verify_control_m3_theme_registry_successor(root)
            assert value == control_after
            value = control_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == '4661b7a4ef78998ba1d9c8e5f199a544524a5873fa6ee4e6824f2e8faed46537':
            from slider_m3_repairs_canonical_ledger_patch import verify_slider_m3_repairs_registry_successor
            slider_before, slider_after = verify_slider_m3_repairs_registry_successor(root)
            assert value == slider_after
            value = slider_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == '856dffd6cd50d5ced52e9ea978761b18dbd13079cda15d01c25bbea6ad1764d8':
            from surface_m3_theme_canonical_ledger_patch import verify_surface_m3_theme_registry_successor
            surface_before, surface_after = verify_surface_m3_theme_registry_successor(root)
            assert value == surface_after
            value = surface_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == '5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af':
            from button_token_repairs_canonical_ledger_patch import verify_button_token_repairs_registry_successor
            repair_before, repair_after = verify_button_token_repairs_registry_successor(root)
            assert value == repair_after
            value = repair_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) == 'e2cd8a53b9c35020d1484ac553e7f69917658f55f5ade75dd0c6bf12f2e6634e':
            from button_tokenization_canonical_ledger_patch import verify_button_tokenization_registry_successor
            button_before, button_after = verify_button_tokenization_registry_successor(root)
            assert value == button_after
            value = button_before
        if member['path'] == 'scripts/upstream-source-contract-registry.mjs' and HASH(value) != member['sha256']:
            from theming_inspection_canonical_ledger_patch import verify_theming_registry_successor
            registry_before, registry_after = verify_theming_registry_successor(root)
            if value != registry_after:
                from inspection_compatibility_canonical_ledger_patch import verify_inspection_registry_successor
                inspection_before, inspection_after = verify_inspection_registry_successor(root)
                assert registry_after == inspection_before
                if value != inspection_after:
                    from selector_density_canonical_ledger_patch import verify_selector_density_registry_successor
                    selector_before, selector_after = verify_selector_density_registry_successor(root)
                    assert selector_before == inspection_after and value == selector_after
                else:
                    assert value == inspection_after
            else:
                assert value == registry_after
            value = registry_before  # Exact historical metadata after authenticating current bytes.
        assert HASH(value) == member['sha256']
        if 'bytes' in member: assert len(value) == member['bytes']
    base_ref, = [member for member in packet['source_members'] if member['path'] == 'scripts/packed-upstream-ledger-base.mjs']
    assert source_subject['comparison_bytes'](base_ref) == _git(root,PARENT,'scripts/packed-upstream-ledger-epoch.mjs')
    assert (root / 'scripts/check-upstream-audit-disposition.mjs').read_bytes() == _git(root,PARENT,'scripts/check-upstream-audit-disposition.mjs')
    source_subject['assert_current']()
    return before, after


def verify_title_successor(root=ROOT, candidate=None):
    from current_sass_canonical_test_scope import historical424_ledger_test_subject
    subject = historical424_ledger_test_subject(root) if candidate is None else None
    before, after = derive_title_successor(root)
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
    theming_applied = False
    if HASH(observed) == '9810524e12e3096e7d971ea80a1424614dedecc4818f80c8e31adf86f2aeec37':
        from theming_inspection_canonical_ledger_patch import derive_theming_successor
        theming_before, theming_after = derive_theming_successor(root)
        assert observed == theming_after and theming_before == after
        observed, theming_applied = theming_before, True
    assert observed == after
    if subject is not None:
        subject['assert_current']()
    return dict(individual_decisions=1, metadata_tokens=14, summary_scalar_tokens=2,
        unselected_entry_bytes_preserved=1682, population=1697, closed_dispositions=377,
        pending_dispositions=1320, pending_security_reviews=1, before_sha256=HASH(before),
        after_sha256=HASH(after), exact_theming_successor_verified=theming_applied, exact_inspection_successor_verified=inspection_applied, exact_selector_density_successor_verified=selector_density_applied, exact_button_tokenization_successor_verified=button_tokenization_applied, exact_button_token_repairs_successor_verified=button_token_repairs_applied, exact_surface_m3_theme_successor_verified=surface_m3_theme_applied, exact_slider_m3_repairs_successor_verified=slider_m3_repairs_applied, exact_control_m3_theme_successor_verified=control_m3_theme_applied, exact_foundation_m3_theme_successor_verified=foundation_m3_theme_applied, exact_core_tokenization_successor_verified=core_tokenization_applied, exact_remaining_unthemable_successor_verified=remaining_unthemable_applied,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed')
