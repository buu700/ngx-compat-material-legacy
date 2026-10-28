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
PREFIX = 'compatibility/rc/21x-c04-selector-density-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = 'ae07d2cf974c7b52b4644c868811fa47381ca76cc4d635d9eeafbf4d714375ae'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = 'e128bc43e5626db26727f35b0550374f5c1dccf21e2149d5232d4eabbabec997'
BEFORE = '84ea529d6f2f72925507300e88f9f825d48ae83ea1733191136663d1c8034c17'
AFTER = 'ce4735ac290b280cb23c5a96b9d5b7d057afd7540505bc73ca6c80eae21694a2'
SHAS = ['999029aa5a23e9577503775c1ea4513e5c3cb4f9', '4395cdf55a4b08d76aecd2e0378f3079289ce9c0']
PATCHES = ['249c9cc504ffdd33543602ea6736e3d064bb6bb7df3d994d4d41494455fadc5e', 'a46ce23442183185d6483e3747f9080c4d80b6251db87aa559126a8dbdd75c6b']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_selector_density_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, 'f5638de44628fa48df56644f5cccf53720fb8401', REGISTRY)
    assert digest(before) == 'c01bd5192355a497485fc9f85cdda04760af0ac0287a4f2d01b93df34ab83ffc'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-selector-density-source-review',\n"
                        "    scope_key:'selector_density_source_scope',module:'upstream-selector-density-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == 'c441c65203b4ee240f1c259bc7460a9eb51ef395f619fe3cc5234305120fff38'
    current = (root / REGISTRY).read_bytes()
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
    assert current == after
    return before, after


def derive_selector_density_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_selector_density_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == 'f5638de44628fa48df56644f5cccf53720fb8401'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-selector-density-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 383 and expected['open_or_deferred'] == 1314
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-selector-density-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'selector_density_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 20, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 383, 385), ('open_or_deferred', 1314, 1312)]:
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


def verify_selector_density_successor(candidate, root=ROOT):
    before, after = derive_selector_density_successor(root)
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
    assert observed == after, 'unqualified selector/density canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 2,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1695,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}
