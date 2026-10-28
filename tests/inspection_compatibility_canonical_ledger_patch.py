# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact four-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-inspection-compatibility-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '0a1fcebcd0cd1c30881c072a57b044eb32f9820b5dd24271a81ea0c2f977ca3a'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '6194ddd826ea4469d49aa96d58db67ad4576bb74a31f9ccbe4ceae9c9334db9f'
BEFORE = '9810524e12e3096e7d971ea80a1424614dedecc4818f80c8e31adf86f2aeec37'
AFTER = '84ea529d6f2f72925507300e88f9f825d48ae83ea1733191136663d1c8034c17'
SHAS = ['eeb0cf2666a2346ee99bb023c833da7255720654', '5d65f1dc4a719fd673b4d77f2f5bdba61d7ac523', 'f6949e3e57fe25406968eeaea90ba662343c3e79', '456741a61a8e85e597e82503941ccab97777bc97']
PATCHES = ['e576846f91a8e961418aa17089ac1f82e3c8d956fadde7bf71d883cc33ee4208', '7425e82ef12006a04904dbbfa8a36d793d4e3b89980c89ab19818c400a1a4374', 'd791af4c9299cba50bd3c02eab558a4372f358ab6c883fc019a0d829f42c079e', '93fbaf24ad1a15053e4e168bcef18c0071c709e6482699d468d3fcc9db0944d8']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_inspection_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '83e48681774603aef0eb23fb0ef4cb40b3dca6ec', REGISTRY)
    assert digest(before) == 'bdb3e27464f61f790f1428dca1e1bd3476acdda6c24bf0301929b059686084be'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-inspection-compatibility-source-review',\n"
                        "    scope_key:'inspection_compatibility_source_scope',module:'upstream-inspection-compatibility-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == 'c01bd5192355a497485fc9f85cdda04760af0ac0287a4f2d01b93df34ab83ffc'
    assert (root / REGISTRY).read_bytes() == after
    return before, after


def derive_inspection_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_inspection_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '83e48681774603aef0eb23fb0ef4cb40b3dca6ec'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-inspection-compatibility-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 379 and expected['open_or_deferred'] == 1318
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-inspection-compatibility-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'inspection_compatibility_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'source_scope_only': True, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}}
        entry = {**prior, 'final_disposition': row['proposed_final_disposition'], 'reason': row['decision'],
                 'review_depth': 'individual-compatibility', 'evidence_report': REVIEW, 'individual_proof': proof}
        expected['entries'][i] = entry
        start, end = ranges[i]
        replacements.append((start, end, json.dumps(entry, indent=2).replace('\n', '\n    ')))
    after_text = text
    for start, end, value in sorted(replacements, reverse=True):
        after_text = after_text[:start] + value + after_text[end:]
    split = after_text.index('"entries": [')
    header = after_text[:split]
    for key, old, new in [('closed_dispositions', 379, 383), ('open_or_deferred', 1318, 1314)]:
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
    assert preserved == 1693
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_inspection_successor(candidate, root=ROOT):
    before, after = derive_inspection_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified inspection canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 4,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1693,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}
