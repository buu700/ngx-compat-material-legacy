#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete original changed-file census; never a source or runtime admission."""
from __future__ import annotations

import argparse
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SEED = 'compatibility/f10/upstream-sha-risk-bootstrap.json'
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
JOIN = 'compatibility/f10/audit-join/join.json'
HEX = re.compile(r'[0-9a-f]{40}\Z')


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_object(kind: str, raw: bytes) -> str:
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def commit_objects(raw: bytes, expected: list[str]) -> dict[str, dict]:
    """Authenticate every complete cat-file response, including exact framing."""
    result, at = {}, 0
    for sha in expected:
        end = raw.find(b'\n', at)
        assert end >= at, 'truncated original commit header'
        header = raw[at:end].decode().split()
        assert len(header) == 3 and header[:2] == [sha, 'commit'], 'missing/foreign original commit'
        size = int(header[2])
        assert size > 0
        at = end + 1
        body = raw[at:at + size]
        assert len(body) == size and raw[at + size:at + size + 1] == b'\n', 'truncated original commit body'
        assert git_object('commit', body) == sha, 'original commit identity changed'
        text = body.decode('utf-8', errors='strict')
        metadata = text.split('\n\n', 1)[0].splitlines()
        trees = [line[5:] for line in metadata if line.startswith('tree ')]
        parents = [line[7:] for line in metadata if line.startswith('parent ')]
        assert len(trees) == 1 and HEX.fullmatch(trees[0])
        assert all(HEX.fullmatch(parent) for parent in parents)
        # The frozen population uses non-merge commits. Do not silently treat a
        # merge's default empty diff as its complete source impact.
        assert len(parents) <= 1, 'merge needs an explicit per-parent census'
        assert sha not in result, 'duplicate original SHA'
        result[sha] = {'sha': sha, 'tree': trees[0], 'parents': parents,
                       'raw_commit': text, 'raw_commit_sha256': sha256(body)}
        at += size + 1
    assert at == len(raw), 'unparsed original commit bytes'
    return result


def complete_changes(raw: bytes, expected: list[str]) -> dict[str, list[dict]]:
    """Read all NUL-delimited raw entries; a selected path list cannot substitute."""
    tokens = raw.split(b'\0')
    assert tokens[-1] == b'', 'truncated original change stream'
    tokens.pop()
    result, sha, at = {}, None, 0
    while at < len(tokens):
        token = tokens[at].decode('utf-8', errors='strict')
        if HEX.fullmatch(token):
            assert token in expected and token not in result, 'duplicate/foreign original change SHA'
            sha = token
            result[sha] = []
            at += 1
            continue
        assert sha and token.startswith(':'), 'unframed original change entry'
        fields = token[1:].split()
        assert len(fields) == 5 and fields[-1] in {'A', 'D', 'M', 'T'}, 'unsupported/incomplete original change entry'
        before_mode, after_mode, before_blob, after_blob, status = fields
        assert all(re.fullmatch(r'[0-7]{6}', mode) for mode in [before_mode, after_mode])
        assert HEX.fullmatch(before_blob) and HEX.fullmatch(after_blob)
        assert at + 1 < len(tokens), 'missing original changed path'
        path = tokens[at + 1].decode('utf-8', errors='strict')
        assert path and not path.startswith('/') and '\\' not in path
        assert all(part not in {'', '.', '..', '.git'} for part in path.split('/'))
        assert path not in {row['path'] for row in result[sha]}, 'duplicate original changed path'
        zero = '0' * 40
        assert (before_blob == zero) == (before_mode == '000000')
        assert (after_blob == zero) == (after_mode == '000000')
        assert (status == 'A') == (before_blob == zero)
        assert (status == 'D') == (after_blob == zero)
        result[sha].append({'path': path, 'status': status, 'before_mode': before_mode,
                            'after_mode': after_mode, 'before_blob': before_blob, 'after_blob': after_blob})
        at += 2
    assert set(result) == set(expected) and len(result) == len(expected), 'incomplete original SHA population'
    return result


def compare_paths(full: list[str], selected: list[str] | None) -> dict:
    assert len(set(full)) == len(full)
    selected = selected or []
    assert isinstance(selected, list) and all(isinstance(path, str) for path in selected)
    return {'listed_paths': selected, 'exact_complete_population': selected == full,
            'same_complete_set': len(selected) == len(set(selected)) and set(selected) == set(full),
            'omitted_original_paths': sorted(set(full) - set(selected)),
            'listed_nonliteral_or_nonoriginal_paths': sorted(set(selected) - set(full))}


def git(cache: Path, args: list[str], data: bytes | None = None) -> bytes:
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for name in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(name, None)
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                           '-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=',
                           '--git-dir=' + str(cache), *args], input=data, capture_output=True,
                          env=env, check=True, timeout=90).stdout


def census(root: Path, cache: Path) -> dict:
    paths = [SEED, LEDGER, 'projects/ngx-material-legacy/package.json']
    # The earlier mechanical join was produced on main only. Its absence on21
    # is an unavailable comparison, never an inherited branch-local review.
    if (root / JOIN).is_file():
        paths.append(JOIN)
    raw = {path: (root / path).read_bytes() for path in paths}
    data = {path: json.loads(value) for path, value in raw.items()}
    seed = data[SEED]['commits']
    expected = [row['sha'] for row in seed]
    assert len(expected) == len(set(expected)) == 1697 and all(HEX.fullmatch(sha) for sha in expected)
    revisions = ('\n'.join(expected) + '\n').encode()
    objects = commit_objects(git(cache, ['cat-file', '--batch'], revisions), expected)
    changes = complete_changes(git(cache, ['diff-tree', '--stdin', '-r', '--root', '--no-renames',
                                          '--raw', '--no-abbrev', '-z'], revisions), expected)
    ledger = {row['sha']: row for row in data[LEDGER]['entries']}
    joined = {row['sha']: row for row in data[JOIN]['rows']} if JOIN in data else None
    assert set(ledger) == set(expected) and len(ledger) == len(data[LEDGER]['entries'])
    if joined is not None:
        assert set(joined) == set(expected) and len(joined) == len(data[JOIN]['rows'])
    rows = []
    for original in seed:
        sha = original['sha']
        files = changes[sha]
        full = [row['path'] for row in files]
        rows.append({**objects[sha], 'seed_subject': original['subject'],
                     'seed_risk_bucket': original['risk_bucket'], 'seed_selected_path_count': original['path_count'],
                     'complete_changed_files': files, 'complete_changed_file_count': len(files),
                     'ledger_comparison': compare_paths(full, ledger[sha].get('files')),
                     'mechanical_join_comparison': compare_paths(full, [row['path'] for row in joined[sha]['files']]) if joined is not None else None,
                     'current_disposition': ledger[sha]['final_disposition'],
                     'current_evidence_report': ledger[sha].get('evidence_report'),
                     'reviewed_by_this_census': False})
    line = '21.x' if data['projects/ngx-material-legacy/package.json']['version'].startswith('21.') else 'main'
    counts = Counter(row['status'] for rows_for_commit in changes.values() for row in rows_for_commit)
    return {'schema_version': 1, 'line': line, 'kind': 'complete-original-change-inventory-only',
            'inputs': [{'path': path, 'sha256': sha256(value)} for path, value in raw.items()],
            'producer': {'path': 'scripts/upstream_complete_patch_census.py',
                         'sha256': sha256((root / 'scripts/upstream_complete_patch_census.py').read_bytes())},
            'source_acquisition': {'existing_upstream_cache_only': True, 'git_replacement_objects': False,
                                   'lazy_fetch': False, 'upstream_code_executed': False},
            'commits': rows, 'summary': {'expected': 1697, 'authenticated_original_commits': len(objects),
             'complete_original_change_populations': len(changes), 'changed_file_occurrences': sum(counts.values()),
             'changed_file_statuses': dict(counts),
             'ledger_lists_not_complete': sum(not row['ledger_comparison']['same_complete_set'] for row in rows),
             'mechanical_join_available': joined is not None,
             'mechanical_join_lists_not_complete': sum(not row['mechanical_join_comparison']['same_complete_set'] for row in rows) if joined is not None else None},
            'new_source_decisions_or_authored_use_closures': 0, 'actual_native_packed_or_floor_qualified': False,
            'g11_claim': 'not-passed', 'limitation': 'Complete changed-file census and raw commit identity only. '
             'Original hunks, before/after source context, ownership/reachability, peer floors and behavior require '
             'substantive review. No classifier or disposition is admitted from filenames or this inventory.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--upstream', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = census(args.root.resolve(), args.upstream.resolve())
    encoded = (json.dumps(result, indent=2) + '\n').encode()
    with args.out.open('xb') as output:
        output.write(gzip.compress(encoded, mtime=0))
    print(json.dumps({'line': result['line'], **result['summary'], 'new_source_decisions_or_authored_use_closures': 0,
                      'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}))
