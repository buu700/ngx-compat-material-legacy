#!/usr/bin/env python3
"""Create a diagnostic artifact with only the two reviewed Sass files overlaid."""
import argparse
import hashlib
import io
import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPLACEMENTS = {
    'package/styles/bridges/_form-field-state-overrides.scss': ROOT / 'projects/ngx-material-legacy/styles/bridges/_form-field-state-overrides.scss',
    'package/styles/form-field/_form-field-theme.scss': ROOT / 'projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss',
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def entries(path):
    with tarfile.open(path, 'r:gz') as tar:
        members = tar.getmembers()
        names = [m.name for m in members]
        if len(set(names)) != len(names) or any(n.startswith('/') or '..' in n.split('/') for n in names):
            raise ValueError('duplicate or unsafe archive member')
        if any(not m.isfile() for m in members):
            raise ValueError('unexpected non-file member')
        return [(m, tar.extractfile(m).read()) for m in members]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--manifest', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists() or args.manifest.exists():
        raise ValueError('output and manifest must not exist')
    baseline = entries(args.baseline)
    if not set(REPLACEMENTS).issubset({m.name for m, _ in baseline}):
        raise ValueError('baseline misses a replacement')
    replacements = {name: path.read_bytes() for name, path in REPLACEMENTS.items()}
    with args.output.open('xb') as file:
        with tarfile.open(fileobj=file, mode='w:gz', format=tarfile.PAX_FORMAT) as tar:
            for member, old in baseline:
                data = replacements.get(member.name, old)
                member.size = len(data)
                tar.addfile(member, io.BytesIO(data))
    derived = entries(args.output)
    if [m.name for m, _ in baseline] != [m.name for m, _ in derived]:
        raise ValueError('member order changed')
    for (old_member, old), (new_member, new) in zip(baseline, derived):
        expected = replacements.get(old_member.name, old)
        if new != expected:
            raise ValueError('unexpected derived content: ' + old_member.name)
    report = {
        'classification': 'diagnostic-only',
        'baseline_sha256': sha(args.baseline.read_bytes()),
        'derived_sha256': sha(args.output.read_bytes()),
        'member_count': len(baseline),
        'replacements': {name: {'baseline_sha256': sha(dict((m.name, data) for m, data in baseline)[name]),
                                'derived_sha256': sha(data)} for name, data in replacements.items()},
        'other_member_bytes_equal': True,
    }
    with args.manifest.open('x') as file:
        json.dump(report, file, indent=2)
        file.write('\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
