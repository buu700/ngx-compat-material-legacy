# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently derive the one-entry/two-scalar and one-record proposals."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-table-local-compilation-admission-'
SHA = '3f35b12290ea4dbee4a9d82845c0964b2b4df50d'
KIND = 'individual-historical-table-local-compilation-source-review'
SCOPE = 'table_local_compilation_source_scope'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def entry_span(text, sha):
    found = []
    decoder = json.JSONDecoder()
    for match in re.finditer(r'^    \{', text, re.M):
        start = match.start() + 4
        try:
            row, end = decoder.raw_decode(text, start)
        except ValueError:
            continue
        if isinstance(row, dict) and row.get('sha') == sha:
            found.append((start, end, row))
    assert len(found) == 1
    return found[0]


def derive_table_local_compilation_successor(root=ROOT):
    packet = json.loads((root / (PREFIX + 'canonical-proposal.json')).read_bytes())
    before = gzip.decompress((root / (PREFIX + 'ledger-before.json.gz')).read_bytes())
    stored_after = gzip.decompress((root / (PREFIX + 'ledger-after.json.gz')).read_bytes())
    body_raw = (root / packet['review']['path']).read_bytes()
    body = json.loads(body_raw)
    handler = packet['handler']
    assert digest(body_raw) == packet['review']['sha256']
    assert digest((root / handler['path']).read_bytes()) == handler['sha256']
    assert digest(before) == '4fd46af746fb9e2b0a27b0cd4b1341ed3b06cda873a6432eb4e6e35dbeb56ad9'
    assert packet['before']['sha256'] == digest(before) and packet['before']['bytes'] == len(before)
    data = json.loads(before)
    assert len(data['entries']) == len({row['sha'] for row in data['entries']}) == 1697
    assert data['closed_dispositions'] == 425 and data['open_or_deferred'] == 1272
    text = before.decode()
    start, end, prior = entry_span(text, SHA)
    assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
    assert prior['files'] == body['frozen_seed_paths'] == ['src/material/table/row.ts', 'src/material/table/table.ts']
    assert body['sha'] == SHA and body['original_files'] == 2 and body['original_hunks'] == 7
    proof = {
        'proof_kind': KIND, 'diff_sha256': body['diff_sha256'],
        'review_depth': 'individual-compatibility', 'affected_branches': ['21.x'],
        'decision': body['decision'],
        SCOPE: {
            'sha': SHA, 'review': {'path': packet['review']['path'], 'sha256': digest(body_raw)},
            'source_qualification': copy.deepcopy(body['source_qualification']),
            'source_review': copy.deepcopy(body['source_review']),
            'source_inputs': copy.deepcopy(body['source_inputs']),
            'source_verifier': copy.deepcopy(body['source_verifier']),
            'compiler_receipts': copy.deepcopy(body['compiler_receipts']),
            'handler': copy.deepcopy(handler), 'complete_original_files': 2,
            'original_hunks': 7, 'actual_extracted_row_compiler_cells': 6,
            'generated_component_definitions_compared': 18,
            'original_failure_reproduced_at_minimum': False, 'source_scope_only': True,
            'actual_native_packed_browser_floor_or_full_audit_qualified': False,
        },
    }
    entry = {**prior, 'final_disposition': 'do-not-adopt', 'reason': body['decision'],
             'read_note_disposition': 'owned-retained', 'review_depth': 'individual-compatibility',
             'evidence_report': packet['review']['path'], 'individual_proof': proof}
    replacement = json.dumps(entry, indent=2).replace('\n', '\n    ')
    projected = text[:start] + replacement + text[end:]
    header_end = projected.index('"entries": [')
    header = projected[:header_end]
    for key, old, new in [('closed_dispositions', 425, 426), ('open_or_deferred', 1272, 1271)]:
        token = f'  "{key}": {old},'
        assert header.count(token) == 1
        header = header.replace(token, f'  "{key}": {new},')
    after = (header + projected[header_end:]).encode()
    assert after == stored_after
    assert packet['after']['sha256'] == digest(after) and packet['after']['bytes'] == len(after)
    actual = json.loads(after)
    assert [row for row in data['entries'] if row['sha'] != SHA] == [row for row in actual['entries'] if row['sha'] != SHA]
    assert [row for row in data['entries'] if row['final_disposition'] == 'security-review'] == [row for row in actual['entries'] if row['final_disposition'] == 'security-review']
    registry_before = gzip.decompress((root / (PREFIX + 'registry-before.mjs.gz')).read_bytes())
    registry_after = gzip.decompress((root / (PREFIX + 'registry-after.mjs.gz')).read_bytes())
    record = (f"  {{sha:'{SHA}',proof_kind:'{KIND}',\n"
              f"    scope_key:'{SCOPE}',module:'upstream-table-local-compilation-admission.cjs'}},\n").encode()
    assert registry_before.count(b'];\n') == 1
    assert registry_before.replace(b'];\n', record + b'];\n') == registry_after
    assert len(re.findall(rb"\{sha:'[0-9a-f]{40}'", registry_before)) == 68
    assert len(re.findall(rb"\{sha:'[0-9a-f]{40}'", registry_after)) == 69
    for raw, name in [(registry_before, 'registry_before'), (registry_after, 'registry_after')]:
        assert digest(raw) == packet[name]['sha256'] and len(raw) == packet[name]['bytes']
    return {'before': before, 'after': after, 'registry_before': registry_before,
            'registry_after': registry_after, 'entry': entry, 'unselected_entries_preserved': 1696}
