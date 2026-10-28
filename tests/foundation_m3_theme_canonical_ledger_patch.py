# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact six-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import re
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-foundation-m3-theme-'
REVIEW = PREFIX + 'canonical-review.json'
REVIEW_HASH = '1681f605639e5de2240eb47684026fc24a25b46a433fb06ad4d6c19d70db9289'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '1c7120da9c25c71125b5e236e1f9451887b3440b7825991d5db275f243953c56'
BEFORE = '5e4badf5f49969c776d83d6d04d658f8f2082150c29358f88d3f445b216c6a27'
AFTER = 'd7d3eab23b0f89f6d366d8e6df1ee7ff659cb26c77edbb517e99b30f757302b0'
SHAS = ['76cda4202c3c10192f386b03b583774725fa0451', 'eca41177fc8b6c19a389c6911cac566460596f13', '7a7434a772320f17f082208297f7d19d470ceee3', 'd7b454315ac739eae0318f8de7dce99d6f7996fe', 'f67c8711883eec6ee7334aac45a40b3786dc6170', '4d50c38579f5a3a8d85b3f192ca6567bbcdcf8de']
PATCHES = ['45e80630237e5ba5de4455a5587a9f638fbd922868f31fc1977465fa6c66442e', '73087b6989ace1bbe8ef3636805774dd84064fe05b130de5e386cd090ba7b8c2', '10275e219e5a8c5dcb397f552578fc395fcdae6a500012cadb3cab16e7f58b3f', '54be7288d18391cee5e04ede5a80184610c33ead7260292fa9adc246e607b0ef', '4c14fc5e72bf33ef85f3b2d2e13df3f755c2e1121823ffa2d7e7ddaaefe241e7', '89d9d66d948a820488bcab8e1fcbf0e6e86ae8dc4bbe182cf6f3a10e902b2b48']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_foundation_m3_theme_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, 'e91b3ceaf147c882361930c67220014669dd77d3', REGISTRY)
    assert digest(before) == 'ae4d9e85741a782bdd2f9be8e7686bab3b3d4cb0e645224eab8207fb0e376340'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-foundation-m3-theme-source-review',\n"
                        "    scope_key:'foundation_m3_theme_source_scope',module:'upstream-foundation-m3-theme-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == '99236700a066edfa8ab5dd2fbc08c92de86334839bad161467e246e4a91a3895'
    assert (root / REGISTRY).read_bytes() == after
    return before, after


def derive_foundation_m3_theme_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    verify_foundation_original_spans(root)
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_foundation_m3_theme_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == 'e91b3ceaf147c882361930c67220014669dd77d3'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-foundation-m3-theme-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 401 and expected['open_or_deferred'] == 1296
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-foundation-m3-theme-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'foundation_m3_theme_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 136, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 401, 407), ('open_or_deferred', 1296, 1290)]:
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
    assert preserved == 1691
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_foundation_m3_theme_successor(candidate, root=ROOT):
    before, after = derive_foundation_m3_theme_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified control theme canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 6,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1691,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}


def verify_foundation_original_spans(root=ROOT):
    """Replay every original full-file diff independently of the JS review tool."""
    import gzip
    raw = (root / (PREFIX + 'originals.json.gz')).read_bytes()
    assert digest(raw) == 'c84ffcdb6e08510c38d20d05d8296ba822451f5a275673b878401344473a92c8'
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
                assert changed[side + '_mode'] == section[side + '_mode']
                if changed[side + '_mode'] == '000000':
                    assert changed[side + '_blob'] == m['blob'] == '0' * 40
                    assert m.get('absent') is True and blob == b''
                else:
                    assert changed[side + '_mode'] == '100644' and 'absent' not in m
                    assert hashlib.sha1(b'blob ' + str(len(blob)).encode() + b'\0' + blob).hexdigest() == changed[side + '_blob'] == m['blob']
            patch_lines = section['patch'].splitlines(keepends=True)
            if section['status'] == 'M':
                expected_header = [f'diff --git a/{path} b/{path}\n',
                    'index ' + changed['before_blob'] + '..' + changed['after_blob'] + ' 100644\n', f'--- a/{path}\n', f'+++ b/{path}\n']
            else:
                added = section['status'] == 'A'
                assert added or section['status'] == 'D'
                expected_header = [f'diff --git a/{path} b/{path}\n',
                    ('new file mode ' if added else 'deleted file mode ') + '100644\n',
                    'index ' + changed['before_blob'] + '..' + changed['after_blob'] + '\n',
                    '--- /dev/null\n' if added else f'--- a/{path}\n',
                    f'+++ b/{path}\n' if added else '+++ /dev/null\n']
            assert patch_lines[:len(expected_header)] == expected_header
            old = section['before']['body'].splitlines(keepends=True)
            out = []; cursor = 0; index = len(expected_header); local = 0
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
    assert files == 40 and hunks == 81
    return {'files': files, 'hunks': hunks}
