# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact five-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-button-tokenization-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = 'd0ee311891176b215a62b856ade76c77713a4bc9355ec32c0d2cf381af76c160'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '8f9a3016332c8448db94dfea173d023640db1984f7a499c49c0f6b79030c3853'
BEFORE = 'ce4735ac290b280cb23c5a96b9d5b7d057afd7540505bc73ca6c80eae21694a2'
AFTER = '485ff845dec1d5e57e16a26cc064b4070ea3e5fe020e9858fab02120fadcb6f7'
SHAS = ['48a988a448200c9ad4a0099e7879b9eff3da0a41', 'f2b4a04d5b6d91e2af81610fb5c95945759ad390', '823c40192915f805132272e15a27230b621c1b77', '5c822977dbe77b7db92233a877e26ae7c1bdeaad', '592307261faf09f9603310a9fb97d1d18bc40f6e']
PATCHES = ['fc902b3df4880b7ce3e889b964d3c03227e272649d07abb7495eed059848aabe', 'f740abe765835606847e8e9f32023790c1b28a8d356ef11b2699489af727a26a', 'fbb8ba4f94fe0101c7cdc80ce54b3beaf33fc34d73f9651076a87d6fdc7d9f99', '4c8c00cf669c5e9d0c80ef2108bda29b1b075f2ed31182ba0ac877eed35973d5', '6fd643b7b34c41a3181c7f1bdc12d9e85d4faf2de5f41cf8f70fae1afe801f9c']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_button_tokenization_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '878b00dacaca2a8417dd0aebefc8adce6a8a9277', REGISTRY)
    assert digest(before) == 'c441c65203b4ee240f1c259bc7460a9eb51ef395f619fe3cc5234305120fff38'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-button-tokenization-source-review',\n"
                        "    scope_key:'button_tokenization_source_scope',module:'upstream-button-tokenization-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == 'e2cd8a53b9c35020d1484ac553e7f69917658f55f5ade75dd0c6bf12f2e6634e'
    current = (root / REGISTRY).read_bytes()
    if digest(current) == '5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af':
        from button_token_repairs_canonical_ledger_patch import verify_button_token_repairs_registry_successor
        repair_before, repair_after = verify_button_token_repairs_registry_successor(root)
        assert current == repair_after
        current = repair_before
    assert current == after
    return before, after


def derive_button_tokenization_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_button_tokenization_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '878b00dacaca2a8417dd0aebefc8adce6a8a9277'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-button-tokenization-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 385 and expected['open_or_deferred'] == 1312
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-button-tokenization-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'button_tokenization_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
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
    for key, old, new in [('closed_dispositions', 385, 390), ('open_or_deferred', 1312, 1307)]:
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
    assert preserved == 1692
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_button_tokenization_successor(candidate, root=ROOT):
    before, after = derive_button_tokenization_successor(root)
    observed = Path(candidate).read_bytes()
    button_token_repairs_applied = False
    if digest(observed) == 'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111':
        from button_token_repairs_canonical_ledger_patch import derive_button_token_repairs_successor
        repair_before, repair_after = derive_button_token_repairs_successor(root)
        assert observed == repair_after
        observed, button_token_repairs_applied = repair_before, True
    assert observed == after, 'unqualified button tokenization canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 5,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1692,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}
