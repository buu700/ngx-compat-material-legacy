# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact fourteen-entry canonical reconstruction; no Node patch helper."""
import copy
import hashlib
import json
import re
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PREFIX = 'compatibility/rc/21x-c04-remaining-unthemable-'
REVIEW = PREFIX + 'canonical-review.json'
REVIEW_HASH = 'd4efab772a0eb08822d798bec529b86013bd5a0d916f24d8ed3c3ff442d7fbdd'
PACKET = PREFIX + 'canonical-transition.json'
PACKET_HASH = '607c37b36c84f557c836cf83fb39e9e508f483ade1dff3d1d2b57c813dd7759c'
BEFORE = '2eadcd59193c5cde7a6dcb9f6c469adca84f46688162d1866ad579c58743bc13'
AFTER = 'cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1'
SHAS = ['dfba0edfbec52614e42e6fe0f9409a1fa0346669', '943b5dabf3fc14cf0dee80174a6891fef8a588c8', 'c77ffa0cc22b5e7ed08923d97bb049ce74d71888', '7cd71b69799fa0cf4825ac2515fc29d26e2ecd47', 'af1840209f81dcf8011e88b7d98101ff72f0ad1c', 'c6bc738cd1d7ca3c5d468f91252cfb8619a17b01', 'f823c2a52a4eed29d2a71c8d94790107231cc139', '59351724dfef12961e2fdbbe12bf141af065e3a8', 'bcbdf910b11c0d828faab2ff99d12f92970b636d', 'eed75ddfc794d36617008c7b3ebe4fcba4bef2ff', '52c85e55cd15d22abd02b4ff52b67c3752b2a27c', '9535454a9063f76aba3b21e69cda7337f829b224', '3430c4d7ef986476eb3b15751f822c5d4593f0d8', '556eeb19c8d53e8675df12670f5ccaa6148d2532']
PATCHES = ['8c69e619f62040da6fffa493b03e283a82307e495710e5f49ce2b21d82c9f7e1', '8cdf6fca17031bfa25f43d5e2418c975a96033819c7af2edb25ebba6a0913add', '29ba58a441aa76b3f87c6eb086bf321164f76bc79e4b85d14e196799fea34da1', '9db335d8097083e60e3b5f34bf6eb7b30df9e53d9b34f6def8de88d9d444c480', '8c9ee035aef7fe92050a6e7a5a433adadf0f702a508deb39d4f1451b43cac08e', '81fd0d1fda2fdb68bfe18bde84805a0e7a8e445b5b56461554af1e96eeaa9e1f', '94322c928c54560b17517a016218b8a9cb52a3eb1065862844aaa28a4a6d346f', 'a9d0106d7964d60d18afa8494012fdece5981220c0c8397acbb6e419caf3ea26', '2171bb25a5fb68438cd1d6ffc6f06ae6f30cf7e0ee3eb5769a65d382dafd885e', '1259f81664887e640db3beeca5e0d352c3bd3665d033d0968b3e4d5a7ba97fa1', 'f247022fb2d6cc6ab0551cb36d4203d3d8d2a10d581212b82178e7855ee6f6e3', '9fcc1fc65360bac2ffbd40e3b3c550eda1d374f8b8904e5a4f240a4a9211b829', '5e0d9c4db515cffead209938de1ee1557f8baa6c3108fc598516e7632845aa7c', '78725152dbaf6569ae83d2200974881dbb0a3d3f079e935553174ee7326563c0']
REGISTRY = 'scripts/upstream-source-contract-registry.mjs'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_remaining_unthemable_registry_successor(root=ROOT):
    from autocomplete_selection_source_refs import _git
    before = _git(root, '692c2e3200935e2ff23b201888903b02675e1571', REGISTRY)
    assert digest(before) == 'c1d47c7662500e98aa34b37e964227961796ff16f500289019b221b4edacc841'
    text = before.decode()
    assert text.count('];\n') == 1
    additions = ''.join("  {sha:'" + sha + "',proof_kind:'individual-historical-remaining-unthemable-source-review',\n"
                        "    scope_key:'remaining_unthemable_source_scope',module:'upstream-remaining-unthemable-admission.cjs'},\n" for sha in SHAS)
    after = text.replace('];\n', additions + '];\n').encode()
    assert digest(after) == '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8'
    from current_sass_canonical_test_scope import historical67_registry_bytes
    assert historical67_registry_bytes(root) == after
    return before, after


def derive_remaining_unthemable_successor(root=ROOT):
    from unthemable_ledger_patch import spans
    verify_remaining_unthemable_original_spans(root)
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    packet_raw = (root / PACKET).read_bytes()
    assert digest(packet_raw) == PACKET_HASH
    packet = json.loads(packet_raw)
    registry_before, registry_after = verify_remaining_unthemable_registry_successor(root)
    assert packet['registry_before'] == {'path': REGISTRY, 'sha256': digest(registry_before), 'bytes': len(registry_before)}
    assert packet['registry_after'] == {'path': REGISTRY, 'sha256': digest(registry_after), 'bytes': len(registry_after)}
    assert packet['source_parent'] == '692c2e3200935e2ff23b201888903b02675e1571'
    before = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['source_parent'] + ':' + LEDGER], cwd=root, env=env)
    assert digest(before) == BEFORE
    assert packet['before'] == {'path': LEDGER, 'sha256': BEFORE, 'bytes': len(before)}
    review_raw = (root / REVIEW).read_bytes()
    assert digest(review_raw) == REVIEW_HASH
    body = json.loads(review_raw)
    for row in body['reviews']:
        assert digest((root / row['patch_file']).read_bytes()) == row['diff_sha256']
    assert [row['sha'] for row in body['reviews']] == SHAS
    handler = next(ref for ref in packet['source_members'] if ref['path'] == 'scripts/upstream-remaining-unthemable-admission.cjs')
    from historical_contract_repair_source import qualify_tool_reference
    for ref in packet['source_members']:
        current_ref = qualify_tool_reference(ref, root)
        raw = (root / current_ref['path']).read_bytes()
        assert digest(raw) == current_ref['sha256'] and len(raw) == current_ref['bytes']
    expected = json.loads(before)
    assert len(expected['entries']) == len({row['sha'] for row in expected['entries']}) == 1697
    assert expected['closed_dispositions'] == 410 and expected['open_or_deferred'] == 1287
    text, _, ranges = spans(before)
    replacements = []
    for row, patch in zip(body['reviews'], PATCHES):
        i = next(i for i, entry in enumerate(expected['entries']) if entry['sha'] == row['sha'])
        prior = expected['entries'][i]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths'] and prior['affected_branches'] == ['21.x']
        proof = {'proof_kind': 'individual-historical-remaining-unthemable-source-review', 'diff_sha256': patch,
                 'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'], 'decision': row['decision'],
                 'remaining_unthemable_source_scope': {'sha': row['sha'], 'review': {'path': REVIEW, 'sha256': REVIEW_HASH},
                     'source_qualification': copy.deepcopy(body['source_qualification']),
                     'source_review': copy.deepcopy(body['source_review']), 'handler': copy.deepcopy(handler),
                     'bounded_sass_compiler_cases': 160, 'golden_or_finite_contract_changes': 0, 'full_sass_gate_executed': False,
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
    for key, old, new in [('closed_dispositions', 410, 424), ('open_or_deferred', 1287, 1273)]:
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
    assert preserved == 1683
    original_security = [entry for entry in json.loads(before)['entries'] if entry['final_disposition'] == 'security-review']
    assert len(original_security) == 1
    assert [entry for entry in expected['entries'] if entry['final_disposition'] == 'security-review'] == original_security
    assert expected['g11_claim'] == 'not-passed'
    return before, after


def verify_remaining_unthemable_successor(candidate, root=ROOT):
    before, after = derive_remaining_unthemable_successor(root)
    assert Path(candidate).read_bytes() == after, 'unqualified remaining token placement canonical successor'
    return {'before_sha256': digest(before), 'after_sha256': digest(after), 'individual_decisions': 14,
            'summary_scalar_tokens': 2, 'unselected_entry_bytes_preserved': 1683,
            'security_reviews_unchanged': 1, 'canonical_entries': 1697, 'actual_native_artifact_browser_floor_or_full_audit_qualified': False}


def verify_remaining_unthemable_original_spans(root=ROOT):
    """Replay every original full-file diff independently of the JS review tool."""
    import gzip
    raw = (root / (PREFIX + 'originals.json.gz')).read_bytes()
    assert digest(raw) == 'ba0baa59d421e92df04977bf49638812e03c27a68528ddf37b67c44be65c63e2'
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
    assert files == 38 and hunks == 54
    return {'files': files, 'hunks': hunks}
