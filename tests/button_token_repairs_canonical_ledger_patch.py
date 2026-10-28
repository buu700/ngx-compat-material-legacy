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
PREFIX = 'compatibility/rc/21x-c04-button-token-repairs-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '981a9a1cf22c7be0c35aa8fc6b4045ddbdca96e5dc60173074f6cfdf2f1050eb'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '34aa5b3bb4ada73ff77f58d3e692af1bfcd88bd92586de313867fcf7f243a201'
BEFORE = '485ff845dec1d5e57e16a26cc064b4070ea3e5fe020e9858fab02120fadcb6f7'
AFTER = 'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111'
SHAS = ['1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5', '702ccbe01446502f43e6e7cb365a587ee7558504']
PATCHES = ['3d64bbeb9cb7f65c9f8c7d8b3ee460795678a078ffcd07cbe06234d33b121415', '4874b274861e134e506402a41163219e02a3a673967479bc0655e4ec15d2df0b']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_button_token_repairs_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '2103cdde255ea68b82b51f94f42e6c9b95824ea0', REGISTRY)
    assert digest(before) == 'e2cd8a53b9c35020d1484ac553e7f69917658f55f5ade75dd0c6bf12f2e6634e'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-button-token-repairs-source-review',\n"
                        "    scope_key:'button_token_repairs_source_scope',module:'upstream-button-token-repairs-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == '5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af'
    current = (root / REGISTRY).read_bytes()
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
    assert current == after
    return before, after


def derive_button_token_repairs_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_button_token_repairs_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '2103cdde255ea68b82b51f94f42e6c9b95824ea0'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-button-token-repairs-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 390 and expected['open_or_deferred'] == 1307
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-button-token-repairs-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'button_token_repairs_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 14, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 390, 392), ('open_or_deferred', 1307, 1305)]:
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


def verify_button_token_repairs_successor(candidate, root=ROOT):
    before, after = derive_button_token_repairs_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified button token-repair canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 2,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1695,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}
