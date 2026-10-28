# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact three-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import re
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-surface-m3-theme-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '8f0d2f6ea801a2e40ef044349d7f17fb5908eddf2137e9990a87d4058ab6d84b'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = 'c4fc827f5fcd6f5494ce34090a8b6d51b34d451ca82bd9db1d2abec3e1c8a6b1'
BEFORE = 'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111'
AFTER = '3f229d913d93503ace3270b04d268ec8132e63cd97019a05a08c62ac4a0e67fa'
SHAS = ['545db61b41957df26c5e3c95a2959ca6c83a9190', '1930b1dacf07826750ffc72dbce551fe6653fd4f', 'fbc7bdda93b7c261705da81cec6720bbf607c5ce']
PATCHES = ['815a3a7aebd89e4c3ba55e153e40759b689ee59871607a292e8d8db21f058164', 'be178948b967b494542ddfc8734668f8c697261183d00ac40af03a6b9af00fe7', 'c9ba2a5966107238abbd3891c37828ff19853eeb8c6b9cb4f549e355b30d3f93']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_surface_m3_theme_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '368363eaf44760e4aea73c5a0811c739777582e3', REGISTRY)
    assert digest(before) == '5fc40f097b86949ce52285987d0fbbcc32841007f5f879dca066cb43ecb675af'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-surface-m3-theme-source-review',\n"
                        "    scope_key:'surface_m3_theme_source_scope',module:'upstream-surface-m3-theme-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == '856dffd6cd50d5ced52e9ea978761b18dbd13079cda15d01c25bbea6ad1764d8'
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
    assert current == after
    return before, after


def derive_surface_m3_theme_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    verify_surface_original_spans(root)
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_surface_m3_theme_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '368363eaf44760e4aea73c5a0811c739777582e3'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-surface-m3-theme-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 392 and expected['open_or_deferred'] == 1305
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-surface-m3-theme-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'surface_m3_theme_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 36, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 392, 395), ('open_or_deferred', 1305, 1302)]:
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
    assert preserved == 1694
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_surface_m3_theme_successor(candidate, root=ROOT):
    before, after = derive_surface_m3_theme_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified button token-repair canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 3,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1694,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}


def verify_surface_original_spans(root=ROOT):
    """Replay every original full-file diff independently of the JS review tool."""
    import gzip
    raw = (root / (PREFIX + 'originals.json.gz')).read_bytes()
    assert digest(raw) == '4419fdf147812c104f4de8dff4264a378d8d43cca197386ed75c9a4d6b56ca2b'
    original = json.loads(gzip.decompress(raw))
    census = json.loads(gzip.decompress((root / 'compatibility/rc/upstream-complete-patch-census.json.gz').read_bytes()))
    source = json.loads((root / REVIEW).read_bytes())
    files = hunks = 0
    for patch, sha, expected_hash, review in zip(original['reviews'], SHAS, PATCHES, source['reviews']):
        assert patch['sha'] == sha and digest(patch['diff'].encode()) == expected_hash
        assert (root / review['patch_file']).read_bytes() == patch['diff'].encode()
        commit = patch['raw_commit'].encode()
        assert hashlib.sha1(b'commit ' + str(len(commit)).encode() + b'\0' + commit).hexdigest() == sha
        entry = next(row for row in census['commits'] if row['sha'] == sha)
        assert entry['raw_commit'] == patch['raw_commit']
        assert [s['path'] for s in patch['sections']] == [f['path'] for f in entry['complete_changed_files']]
        assert ''.join(s['patch'] for s in patch['sections']) == patch['diff']
        actual_hunks = []
        for section, changed in zip(patch['sections'], entry['complete_changed_files']):
            path = section['path']
            for side in ['before', 'after']:
                m = section[side]; blob = m['body'].encode()
                assert digest(blob) == m['sha256'] and len(blob) == m['bytes']
                assert hashlib.sha1(b'blob ' + str(len(blob)).encode() + b'\0' + blob).hexdigest() == changed[side + '_blob'] == m['blob']
                assert changed[side + '_mode'] == section[side + '_mode'] == '100644'
            patch_lines = section['patch'].splitlines(keepends=True)
            expected_header = [f'diff --git a/{path} b/{path}\n',
                'index ' + changed['before_blob'] + '..' + changed['after_blob'] + ' 100644\n', f'--- a/{path}\n', f'+++ b/{path}\n']
            assert patch_lines[:4] == expected_header
            old = section['before']['body'].splitlines(keepends=True)
            out = []; cursor = 0; index = 4; local = 0
            while index < len(patch_lines):
                start = index; header = patch_lines[index].rstrip('\n')
                match = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*', header)
                assert match, header
                old_start, old_count, new_start, new_count = [int(x) if x is not None else 1 for x in match.groups()]
                at = old_start - 1 if old_count else old_start
                assert at >= cursor
                out.extend(old[cursor:at]); cursor = at
                assert len(out) == (new_start - 1 if new_count else new_start)
                consumed = emitted = 0; index += 1
                while index < len(patch_lines) and not patch_lines[index].startswith('@@ '):
                    line = patch_lines[index]; mark, value = line[0], line[1:]
                    assert mark in ' +-'
                    if mark in ' -': assert old[cursor] == value; cursor += 1; consumed += 1
                    if mark in ' +': out.append(value); emitted += 1
                    index += 1
                assert consumed == old_count and emitted == new_count
                text = ''.join(patch_lines[start:index]); bound = section['hunks'][local]
                assert bound == {'index': local, 'header': header, 'text': text, 'sha256': digest(text.encode())}
                actual_hunks.append((path, local, header, digest(text.encode())))
                local += 1; hunks += 1
            out.extend(old[cursor:]); assert ''.join(out) == section['after']['body']
            assert local == len(section['hunks']); files += 1
        assert actual_hunks == [(h['path'], h['index'], h['header'], h['sha256']) for h in review['whole_original_hunk_reviews']]
    assert files == 17 and hunks == 32
    return {'files': files, 'hunks': hunks}
