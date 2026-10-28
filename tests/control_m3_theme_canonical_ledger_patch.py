# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact four-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import re
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-control-m3-theme-'
REVIEW = PREFIX + 'canonical-review.json'
REVIEW_HASH = '380a2bc69f906d0a060d0c4391a9a9ae32322f6ef390b53781d8cc9b04159e98'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '416ab63c24277f15a91e5885cab327b68e35070efe0623975b62880123e4904f'
BEFORE = '1fcc5dba5bb89f9dc9b811cbee7f7a55da2328ee7277a660a0d2a81342d58532'
AFTER = '5e4badf5f49969c776d83d6d04d658f8f2082150c29358f88d3f445b216c6a27'
SHAS = ['6b57edb1b164909f8aa1eddac87a915c037e6905', '75029c273a4aad3ad4481d8c045c9a73ccceb34e', '2f958aced5757915f75e4036229d5df63f6ff414', '289ddd348395f0299a6c7cba2cde8662842df06d']
PATCHES = ['d5201f108ff5a5d5f38c6d13437c5768ac805c62ba673bba628c3b4ea867e3bd', '878ba9207bc62a4440b2493dc75f1282cefaa83f7d45513e16dadecf3aeadafe', '17f369ca7d3554694b90cfaedc86f20b09cd6a3b3cb05d28021b138ad93a4e63', '41c76fdf701d135c1709683cc34cd658d367331ea10c108a0e3a3682899aa7b4']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_control_m3_theme_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '7131016f8bc8011c3ac27e799d0200a6a708f977', REGISTRY)
    assert digest(before) == '4661b7a4ef78998ba1d9c8e5f199a544524a5873fa6ee4e6824f2e8faed46537'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-control-m3-theme-source-review',\n"
                        "    scope_key:'control_m3_theme_source_scope',module:'upstream-control-m3-theme-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == 'ae4d9e85741a782bdd2f9be8e7686bab3b3d4cb0e645224eab8207fb0e376340'
    current = (root / REGISTRY).read_bytes()
    if digest(current) == '99236700a066edfa8ab5dd2fbc08c92de86334839bad161467e246e4a91a3895':
        from foundation_m3_theme_canonical_ledger_patch import verify_foundation_m3_theme_registry_successor
        foundation_before, foundation_after = verify_foundation_m3_theme_registry_successor(root)
        assert current == foundation_after and foundation_before == after
        current = foundation_before
    assert current == after
    return before, after


def derive_control_m3_theme_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    verify_control_original_spans(root)
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_control_m3_theme_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '7131016f8bc8011c3ac27e799d0200a6a708f977'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-control-m3-theme-admission.cjs')
    for ref in packet['source_members']:
        raw = (root / ref['path']).read_bytes()
        assert digest(raw) == ref['sha256'] and len(raw) == ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 397 and expected['open_or_deferred'] == 1300
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-control-m3-theme-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'control_m3_theme_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 56, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 397, 401), ('open_or_deferred', 1300, 1296)]:
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


def verify_control_m3_theme_successor(candidate, root=ROOT):
    before, after = derive_control_m3_theme_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified control theme canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 4,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1693,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}


def verify_control_original_spans(root=ROOT):
    """Replay every original full-file diff independently of the JS review tool."""
    import gzip
    raw = (root / (PREFIX + 'originals.json.gz')).read_bytes()
    assert digest(raw) == 'b8522419b86b1f3f6940433be3508916f4867527622f26fbf7e56e9510a2bcb6'
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
    assert files == 24 and hunks == 43
    return {'files': files, 'hunks': hunks}
