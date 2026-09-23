#!/usr/bin/env python3
"""Compare generated CSS without reordering or semantic normalization.

This is an exact-output gate, not a CSS parser, browser, or visual-equivalence proof.
"""
from __future__ import annotations
import argparse
import difflib
import hashlib
import json
from pathlib import Path
from typing import Any


def canonical(data: bytes) -> str:
    return data.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')


def sha(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def read_css(root: Path) -> dict[str, str]:
    if not root.is_dir():
        raise ValueError(f'CSS directory does not exist: {root}')
    result = {}
    for p in sorted(root.rglob('*.css')):
        if p.is_symlink():
            raise ValueError(f'Refusing CSS symlink: {p}')
        result[p.relative_to(root).as_posix()] = canonical(p.read_bytes())
    if not result:
        raise ValueError(f'No generated CSS found: {root}')
    return result


def approved(name: str, before: str, after: str, entries: list[dict[str, Any]]) -> dict[str, Any] | None:
    for item in entries:
        if item.get('file') != name or item.get('baseline_sha256') != sha(before) or item.get('candidate_sha256') != sha(after):
            continue
        if (isinstance(item.get('reason'), str) and item['reason'].strip()
                and isinstance(item.get('approved_by'), str) and item['approved_by'].strip()
                and isinstance(item.get('test_evidence'), list) and item['test_evidence']
                and all(isinstance(t, str) and t.strip() for t in item['test_evidence'])
                and item.get('category') in ('motion', 'security-accessibility', 'shared-infrastructure', 'ordinary-current')
                and isinstance(item.get('fixture_sha256'), str) and len(item['fixture_sha256']) == 64):
            return item
    return None


def compare(before: dict[str, str], after: dict[str, str], approvals: list[dict[str, Any]] | None = None,
            fixture_hashes: dict[str, str] | None = None) -> dict[str, Any]:
    rows = []
    for name in sorted(set(before) | set(after)):
        if name not in before or name not in after:
            rows.append({'file': name, 'status': 'blocked', 'reason': 'missing reference or candidate file'})
            continue
        left, right = before[name], after[name]
        row: dict[str, Any] = {'file': name, 'baseline_sha256': sha(left), 'candidate_sha256': sha(right)}
        if left == right:
            row['status'] = 'exact'
        else:
            match = approved(name, left, right, approvals or [])
            if match and (not fixture_hashes or fixture_hashes.get(name) != match['fixture_sha256']):
                match = None
            row.update(status='reviewed-difference' if match else 'blocked',
                       diff=''.join(difflib.unified_diff(left.splitlines(True), right.splitlines(True),
                                                        fromfile='reference/'+name, tofile='candidate/'+name)))
            if match:
                row['approval'] = match
        rows.append(row)
    return {'ok': bool(rows) and not any(r['status'] == 'blocked' for r in rows),
            'exact_count': sum(r['status'] == 'exact' for r in rows),
            'reviewed_difference_count': sum(r['status'] == 'reviewed-difference' for r in rows),
            'files': rows,
            'limits': 'Exact ordered CSS comparison only. Browser/DOM/component-style and current-bridge review are separate gates.'}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('reference', type=Path)
    ap.add_argument('candidate', type=Path)
    ap.add_argument('--approvals', type=Path)
    ap.add_argument('--fixture-hashes', type=Path, help='JSON mapping generated CSS filename to exact original fixture SHA256')
    ap.add_argument('--report', type=Path)
    args = ap.parse_args()
    try:
        entries = json.loads(args.approvals.read_text())['approved_differences'] if args.approvals else []
        hashes = json.loads(args.fixture_hashes.read_text()) if args.fixture_hashes else {}
        result = compare(read_css(args.reference), read_css(args.candidate), entries, hashes)
    except (ValueError, OSError, UnicodeError, KeyError) as exc:
        result = {'ok': False, 'errors': [str(exc)]}
    text = json.dumps(result, indent=2)+'\n'
    if args.report:
        if args.report.exists():
            ap.error('Refusing to overwrite an existing evidence report.')
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text)
    print(text, end='')
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
