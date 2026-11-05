# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact two-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-theming-inspection-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '6511bbe44548be85398ffb0e2f86885a79fc714d17ad3aeb2cdb605963410bd4'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '3f93068912fbfbdc305366cc553d9981c787868d19792359f7cb0b303bc8370d'
BEFORE = '80123c4e8c4f7f43330553ffca84e51fea98e70f545234cf5359c11128e548d7'
AFTER = '9810524e12e3096e7d971ea80a1424614dedecc4818f80c8e31adf86f2aeec37'
SHAS = ['a7dbf08148467ce7b2f132eba32f9517e39e336f', 'b6e50c631b8f8131f494d57b0b806777da8d4efd']
PATCHES = ['9ec928921c615a0e24cba91977d1c9107f28f43a55d6cde7624e2da4d2437f93', '826acc540b82cce67fe5e5d6a76865198997e512a354535ffb2fbe2f78a80667']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_theming_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '1fcb9a09a4d989a58f403db8237a281cab6cfa0d', REGISTRY)
    assert digest(before) == 'd63a79ffe4aa63a6fb839e5f08abf1c6311832e2e73d73cbdfd55d6722098493'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-theming-inspection-source-exclusion',\n"
                        "    scope_key:'theming_inspection_source_scope',module:'upstream-theming-inspection-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == 'bdb3e27464f61f790f1428dca1e1bd3476acdda6c24bf0301929b059686084be'
    from current_sass_canonical_test_scope import historical67_registry_bytes
    current = historical67_registry_bytes(root)
    if digest(current) == '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8':
        from remaining_unthemable_canonical_ledger_patch import verify_remaining_unthemable_registry_successor
        remaining_before, remaining_after = verify_remaining_unthemable_registry_successor(root)
        assert current == remaining_after
        current = remaining_before
    if digest(current) == 'c1d47c7662500e98aa34b37e964227961796ff16f500289019b221b4edacc841':
        from core_tokenization_canonical_ledger_patch import verify_core_tokenization_registry_successor
        core_before, core_after = verify_core_tokenization_registry_successor(root)
        assert current == core_after
        current = core_before
    if digest(current) == '99236700a066edfa8ab5dd2fbc08c92de86334839bad161467e246e4a91a3895':
        from foundation_m3_theme_canonical_ledger_patch import verify_foundation_m3_theme_registry_successor
        foundation_before, foundation_after = verify_foundation_m3_theme_registry_successor(root)
        assert current == foundation_after
        current = foundation_before
    if digest(current) == 'ae4d9e85741a782bdd2f9be8e7686bab3b3d4cb0e645224eab8207fb0e376340':
        from control_m3_theme_canonical_ledger_patch import verify_control_m3_theme_registry_successor
        control_before, control_after = verify_control_m3_theme_registry_successor(root)
        assert current == control_after
        current = control_before
    if digest(current) == '4661b7a4ef78998ba1d9c8e5f199a544524a5873fa6ee4e6824f2e8faed46537':
        from slider_m3_repairs_canonical_ledger_patch import verify_slider_m3_repairs_registry_successor
        slider_before, slider_after = verify_slider_m3_repairs_registry_successor(root)
        assert current == slider_after
        current = slider_before
    if digest(current) == '856dffd6cd50d5ced52e9ea978761b18dbd13079cda15d01c25bbea6ad1764d8':
        from surface_m3_theme_canonical_ledger_patch import verify_surface_m3_theme_registry_successor
        surface_before, surface_after = verify_surface_m3_theme_registry_successor(root)
        assert current == surface_after
        current = surface_before
    if digest(current) == '5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af':
        from button_token_repairs_canonical_ledger_patch import verify_button_token_repairs_registry_successor
        repair_before, repair_after = verify_button_token_repairs_registry_successor(root)
        assert current == repair_after
        current = repair_before
    if digest(current) == 'e2cd8a53b9c35020d1484ac553e7f69917658f55f5ade75dd0c6bf12f2e6634e':
        from button_tokenization_canonical_ledger_patch import verify_button_tokenization_registry_successor
        button_before, button_after = verify_button_tokenization_registry_successor(root)
        assert current == button_after
        current = button_before
    if current != after:
        from inspection_compatibility_canonical_ledger_patch import verify_inspection_registry_successor
        successor_before, successor_after = verify_inspection_registry_successor(root)
        assert successor_before == after
        if current != successor_after:
            from selector_density_canonical_ledger_patch import verify_selector_density_registry_successor
            selector_before, selector_after = verify_selector_density_registry_successor(root)
            assert selector_before == successor_after and current == selector_after
        else:
            assert current == successor_after
    else:
        assert current == after
    return before, after


def derive_theming_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_theming_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '1fcb9a09a4d989a58f403db8237a281cab6cfa0d'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-theming-inspection-admission.cjs')
    from historical_contract_repair_source import qualify_tool_reference
    for ref in packet['source_members']:
        current_ref = qualify_tool_reference(ref, root)
        raw = (root / current_ref['path']).read_bytes()
        assert digest(raw) == current_ref['sha256'] and len(raw) == current_ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 377 and expected['open_or_deferred'] == 1320
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-theming-inspection-source-exclusion', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'theming_inspection_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'source_scope_only': True, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}}
        entry = {**prior, 'final_disposition': 'do-not-adopt', 'reason': row['decision'],
                 'review_depth': 'individual-compatibility', 'evidence_report': REVIEW, 'individual_proof': proof}
        expected['entries'][i] = entry
        start, end = ranges[i]
        replacements.append((start, end, json.dumps(entry, indent=2).replace('\n', '\n    ')))
    after_text = text
    for start, end, value in sorted(replacements, reverse=True):
        after_text = after_text[:start] + value + after_text[end:]
    split = after_text.index('"entries": [')
    header = after_text[:split]
    for key, old, new in [('closed_dispositions', 377, 379), ('open_or_deferred', 1320, 1318)]:
        old_token, new_token = f'  "{key}": {old},', f'  "{key}": {new},'
        assert header.count(old_token) == 1
        header = header.replace(old_token, new_token)
        expected[key] = new
    after = (header + after_text[split:]).encode()
    assert digest(after) == AFTER and json.loads(after) == expected
    assert packet['after'] == {'path': LEDGER, 'sha256': AFTER, 'bytes': len(after)}
    after_text, _, after_ranges = spans(after)
    preserved = 0
    for old, new, entry in zip(ranges, after_ranges, expected['entries']):
        if entry['sha'] not in SHAS:
            assert text[old[0]:old[1]] == after_text[new[0]:new[1]]
            preserved += 1
    assert preserved == 1695
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_theming_successor(candidate, root=ROOT):
    before, after = derive_theming_successor(root)
    observed = Path(candidate).read_bytes()
    button_token_repairs_applied = False
    if digest(observed) == 'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111':
        from button_token_repairs_canonical_ledger_patch import derive_button_token_repairs_successor
        repair_before, repair_after = derive_button_token_repairs_successor(root)
        assert observed == repair_after
        observed, button_token_repairs_applied = repair_before, True
    button_tokenization_applied = False
    if digest(observed) == '485ff845dec1d5e57e16a26cc064b4070ea3e5fe020e9858fab02120fadcb6f7':
        from button_tokenization_canonical_ledger_patch import derive_button_tokenization_successor
        button_before, button_after = derive_button_tokenization_successor(root)
        assert observed == button_after
        observed, button_tokenization_applied = button_before, True
    selector_density_applied = False
    if digest(observed) == 'ce4735ac290b280cb23c5a96b9d5b7d057afd7540505bc73ca6c80eae21694a2':
        from selector_density_canonical_ledger_patch import derive_selector_density_successor
        selector_before, selector_after = derive_selector_density_successor(root)
        assert observed == selector_after
        observed, selector_density_applied = selector_before, True
    if digest(observed) == '84ea529d6f2f72925507300e88f9f825d48ae83ea1733191136663d1c8034c17':
        from inspection_compatibility_canonical_ledger_patch import derive_inspection_successor
        inspection_before, inspection_after = derive_inspection_successor(root)
        assert observed == inspection_after and inspection_before == after
        observed = inspection_before
    assert observed == after, 'unqualified theming canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 2,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1695,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}
