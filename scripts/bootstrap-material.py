#!/usr/bin/env python3
"""Create a local, full-history Material legacy checkout. Never installs or pushes."""
from __future__ import annotations
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Sequence


def git(args: Sequence[str], *, cwd: Path | None = None, timeout: int = 180) -> str:
    result = subprocess.run(
        ['git', *args], cwd=cwd, text=True, capture_output=True,
        check=True, timeout=timeout,
    )
    return result.stdout.strip()


def bootstrap(destination: Path, upstream_url: str, origin_url: str,
              expected_commit: str | None = None) -> dict[str, object]:
    destination = destination.expanduser().absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError(f'Refusing to overwrite existing destination: {destination}')
    if expected_commit and not re.fullmatch(r'(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})', expected_commit):
        raise ValueError('--expected-commit must be a full Git object ID, not a prefix.')
    # The only local fixture override accepted is an existing absolute path.
    if not upstream_url.startswith('https://'):
        source = Path(upstream_url)
        if not source.is_absolute() or not source.is_dir():
            raise ValueError('Upstream must be an HTTPS URL or an existing absolute local repository path.')
    if not origin_url.startswith(('https://', 'git@github.com:')):
        raise ValueError('Origin must be HTTPS or a GitHub SSH URL.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    git(['clone', '--no-checkout', '--no-hardlinks', '--origin', 'upstream',
         '--', upstream_url, str(destination)], timeout=900)
    git(['fetch', 'upstream', '--tags'], cwd=destination, timeout=900)
    if git(['rev-parse', '--is-shallow-repository'], cwd=destination) != 'false':
        raise RuntimeError('Full history is required; the clone is shallow.')
    baseline = git(['rev-parse', '--verify', 'refs/tags/16.2.14^{commit}'], cwd=destination)
    if expected_commit and baseline.lower() != expected_commit.lower():
        raise ValueError(f'Baseline commit mismatch: expected {expected_commit}, received {baseline}.')
    git(['show-ref', '--verify', 'refs/remotes/upstream/16.2.x'], cwd=destination)
    git(['merge-base', '--is-ancestor', baseline, 'refs/remotes/upstream/16.2.x'], cwd=destination)
    git(['switch', '-c', 'compat-main', baseline], cwd=destination)
    git(['remote', 'add', 'origin', origin_url], cwd=destination)
    # An accidental push to upstream should fail rather than target angular/components.
    git(['remote', 'set-url', '--push', 'upstream', 'DISABLED'], cwd=destination)
    git(['merge-base', '--is-ancestor', baseline, 'HEAD'], cwd=destination)
    evidence: dict[str, object] = {
        'upstream_repository': upstream_url,
        'baseline_branch': '16.2.x', 'baseline_tag': '16.2.14',
        'baseline_full_commit': baseline, 'project_branch': 'compat-main',
        'origin': origin_url, 'history_preserved': True,
        'remote_repository_created': False, 'pushed': False, 'dependencies_installed': False,
    }
    evidence_path = destination / '.git' / 'ngx-material-legacy-bootstrap.json'
    evidence_path.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
    return evidence


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, default=Path.home() / 'ngx-compat' / 'material')
    parser.add_argument('--upstream-url', default='https://github.com/angular/components.git')
    parser.add_argument('--origin-url', default='https://github.com/buu700/ngx-compat-material-legacy.git')
    parser.add_argument('--expected-commit')
    parser.add_argument('--apply', action='store_true', help='Perform the local clone; default is a no-write plan.')
    args = parser.parse_args()
    if not args.apply:
        print(json.dumps({'mode': 'dry-run', 'destination': str(args.destination.expanduser()), 'upstream': args.upstream_url, 'origin': args.origin_url, 'baseline': '16.2.14', 'branch': 'compat-main', 'writes_performed': False, 'next_action': 'Review the plan; add --apply to clone locally. No push or install is performed.'}, indent=2))
        return 0
    try:
        evidence = bootstrap(args.destination, args.upstream_url, args.origin_url, args.expected_commit)
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError) as exc:
        print(f'Bootstrap failed: {exc}', file=sys.stderr)
        if isinstance(exc, subprocess.CalledProcessError) and exc.stderr:
            print(exc.stderr, file=sys.stderr)
        print('Any partial checkout is left untouched for inspection. No install or push was attempted.', file=sys.stderr)
        return 1
    print(json.dumps(evidence, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
