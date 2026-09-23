#!/usr/bin/env python3
"""Check exact repository tools and optional publication/bootstrap evidence.

This is a local consistency guard, not a registry signature validator. It never
installs packages or publishes. Runtime checks only execute '<tool> --version'.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
from typing import Any

VERSION = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
ENGINES = {
    22: "^22.22.3 || ^24.15.0 || ^26.0.0",
    21: "^20.19.0 || ^22.12.0 || ^24.0.0",
}


def version_tuple(value: str) -> tuple[int, ...]:
    if not isinstance(value, str) or not VERSION.fullmatch(value):
        raise ValueError(f"Expected exact non-prerelease version, got {value!r}")
    return tuple(int(x) for x in value.split('.'))


def validate_lock(lock: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    try:
        node = version_tuple(lock['repository']['node'])
        pnpm = version_tuple(lock['repository']['pnpm'])
        npm = version_tuple(lock['release']['npm'])
        if node[0] != 24:
            errors.append('Primary repository Node must be the approved 24 LTS line.')
        if pnpm[0] != 12:
            errors.append('Repository pnpm must be the approved 12 line.')
        if npm < (11, 15, 0):
            errors.append('Release npm is below the staged-publishing minimum.')
        if lock.get('minimum_age_minutes') != 10080:
            errors.append('Normal release-age policy must be exactly seven days.')
    except (KeyError, TypeError, ValueError) as exc:
        errors.append(f'Invalid toolchain lock: {exc}')
    return errors


def inspect_configuration(root: Path, lock: dict[str, Any]) -> list[str]:
    errors = validate_lock(lock)
    if errors:
        return errors
    expected = lock['repository']
    try:
        manifest = json.loads((root / 'package.json').read_text())
        if manifest.get('private') is not True:
            errors.append('Workspace package.json must be private.')
        if manifest.get('packageManager') != f"pnpm@{expected['pnpm']}":
            errors.append('packageManager must exactly match the pnpm pin.')
        if manifest.get('engines', {}).get('node') != expected['node']:
            errors.append('Private workspace Node engine differs from its exact pin.')
        for filename, wanted in [('.node-version', expected['node']),
                                 ('.npm-version', lock['release']['npm'])]:
            if (root / filename).read_text().strip() != wanted:
                errors.append(f'{filename} differs from toolchain-lock.json.')
        # Deliberately narrow scalar checker: repository YAML still requires a real
        # pnpm install/schema validation. Reject duplicate/missing policy keys.
        yaml = (root / 'pnpm-workspace.yaml').read_text()
        for key, wanted in {
            'minimumReleaseAge': '10080',
            'minimumReleaseAgeStrict': 'true',
            'minimumReleaseAgeIgnoreMissingTime': 'false',
            'pmOnFail': 'error',
            'trustLockfile': 'false',
        }.items():
            matches = re.findall(rf'^{re.escape(key)}:\s*([^\n#]*)(?:#.*)?$', yaml, re.M)
            if len(matches) != 1 or matches[0].strip() != wanted:
                errors.append(f'Expected exactly one top-level {key}: {wanted}.')
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        errors.append(f'Configuration could not be checked: {exc}')
    return errors


def publication_checks(manifest: dict[str, Any], major: int,
                       repository: str = 'buu700/ngx-compat-material-legacy',
                       name: str = '@ngx-compat/material-legacy') -> list[str]:
    errors: list[str] = []
    if manifest.get('name') != name:
        errors.append('Published name does not match the authorized intended package.')
    if manifest.get('private') is True:
        errors.append('Published manifest is private; do not copy workspace metadata.')
    if manifest.get('publishConfig', {}).get('access') != 'public':
        errors.append('Scoped publication must specify public access.')
    if manifest.get('repository', {}).get('url') != f'git+https://github.com/{repository}.git':
        errors.append('repository.url does not match the canonical repository.')
    if manifest.get('license') != 'MIT':
        errors.append('Expected retained MIT package license metadata.')
    value = manifest.get('version', '')
    if not re.fullmatch(rf'{major}\.\d+\.\d+(?:-rc\.\d+)?', value):
        errors.append('Package version does not match its selected Angular-major line.')
    if major not in ENGINES or manifest.get('engines', {}).get('node') != ENGINES.get(major):
        errors.append('Published engines differ from the approved consumer line.')
    return errors


def validate_evidence(lock: dict[str, Any], evidence: dict[str, Any],
                      now: datetime | None = None) -> list[str]:
    """Check declared verified evidence/age; do not pretend to verify downloads."""
    errors = validate_lock(lock)
    if errors:
        return errors
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError('Evidence evaluation needs timezone-aware UTC time.')
    expected = {**lock['repository'], 'npm': lock['release']['npm']}
    for name, version in expected.items():
        row = evidence.get('tools', {}).get(name, {})
        if row.get('version') != version:
            errors.append(f'{name}: evidence does not match exact selected version.')
        if row.get('verified') is not True:
            errors.append(f'{name}: bootstrap verification is not completed.')
        if not re.match(r'^https://', str(row.get('source', ''))):
            errors.append(f'{name}: missing HTTPS evidence source.')
        integrity = row.get('artifact_integrity')
        if not isinstance(integrity, str) or not re.fullmatch(r'(?:sha256|sha512)-[A-Za-z0-9+/=]{32,}', integrity):
            errors.append(f'{name}: missing recorded SHA-256/SHA-512 artifact integrity.')
        try:
            published = datetime.fromisoformat(str(row['published_at']).replace('Z', '+00:00'))
            if published.tzinfo is None:
                raise ValueError('Timestamp has no timezone')
            age = (now - published).total_seconds() / 60
            if age < lock['minimum_age_minutes']:
                # Exemptions are exact, expiring, human-reviewed records. They do
                # not waive integrity, timestamp or actual verification evidence.
                covered = False
                for ex in lock.get('exceptions', []):
                    if ex.get('tool') != name or ex.get('version') != version:
                        continue
                    try:
                        expiry = datetime.fromisoformat(ex['expires_at'].replace('Z', '+00:00'))
                        covered = (age >= 0 and expiry.tzinfo is not None and expiry > now
                                   and bool(ex.get('reason')) and bool(ex.get('approved_by')))
                    except (KeyError, ValueError, TypeError):
                        covered = False
                    if covered:
                        break
                if not covered:
                    errors.append(f'{name}: publication age is less than seven days or in the future.')
        except (KeyError, ValueError, TypeError):
            errors.append(f'{name}: missing/invalid timezone-aware publication timestamp.')
    return errors


def runtime_checks(lock: dict[str, Any], release: bool = False) -> tuple[list[str], dict[str, str]]:
    errors: list[str] = []
    observed: dict[str, str] = {}
    expected = dict(lock['repository'])
    if release:
        expected['npm'] = lock['release']['npm']
    for command, wanted in expected.items():
        try:
            result = subprocess.run([command, '--version'], check=True, capture_output=True,
                                    text=True, timeout=30)
            actual = result.stdout.strip()
            if command == 'node' and actual.startswith('v'):
                actual = actual[1:]
            observed[command] = actual
            if actual != wanted:
                errors.append(f'{command}: running {actual!r}, expected {wanted!r}.')
        except (OSError, subprocess.SubprocessError) as exc:
            errors.append(f'{command}: unable to verify executable: {exc}')
    return errors, observed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--lock', type=Path)
    parser.add_argument('--runtime', action='store_true')
    parser.add_argument('--release', action='store_true', help='Also check release npm at runtime')
    parser.add_argument('--require-bootstrap-evidence', type=Path)
    parser.add_argument('--published-manifest', type=Path)
    parser.add_argument('--angular-major', type=int, choices=[21, 22], default=22)
    parser.add_argument('--repository', default='buu700/ngx-compat-material-legacy')
    parser.add_argument('--package-name', default='@ngx-compat/material-legacy')
    args = parser.parse_args()
    try:
        lock = json.loads((args.lock or args.root / 'toolchain-lock.json').read_text())
        errors = inspect_configuration(args.root, lock)
        observed: dict[str, str] = {}
        if args.require_bootstrap_evidence:
            errors += validate_evidence(lock, json.loads(args.require_bootstrap_evidence.read_text()))
        if args.published_manifest:
            errors += publication_checks(json.loads(args.published_manifest.read_text()),
                                         args.angular_major, args.repository, args.package_name)
        if args.runtime and not validate_lock(lock):
            additional, observed = runtime_checks(lock, args.release)
            errors += additional
        print(json.dumps({'ok': not errors, 'errors': errors, 'observed_runtime': observed,
                          'scope': 'local consistency/reported-evidence guard; not a build or cryptographic audit'}, indent=2))
        return 1 if errors else 0
    except (OSError, ValueError, TypeError) as exc:
        print(json.dumps({'ok': False, 'errors': [str(exc)]}, indent=2))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
