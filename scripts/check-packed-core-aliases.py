#!/usr/bin/env python3
"""Small export-name probe, not a TypeScript declaration/API correctness checker."""
import argparse, csv, hashlib, json, re, tarfile
from pathlib import Path, PurePosixPath

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('tarball', type=Path)
    ap.add_argument('--aliases', type=Path, default=Path(__file__).resolve().parents[1]/'research/core-alias-recovery.csv')
    args = ap.parse_args()
    with tarfile.open(args.tarball, 'r:*') as archive:
        members = {}
        for m in archive:
            p = PurePosixPath(m.name)
            if p.is_absolute() or '..' in p.parts or m.issym() or m.islnk(): raise ValueError('Unsafe tar member')
            if m.isfile():
                if m.name in members: raise ValueError('Duplicate tar member')
                members[m.name] = m
        def read(name):
            m = members[name]
            if m.size > 8*1024*1024: raise ValueError('Excessive inspected member size')
            return archive.extractfile(m).read().decode('utf8')
        package = json.loads(read('package/package.json'))
        exported = package['exports']['./legacy-core']
        target = exported.get('types')
        if not isinstance(target, str): raise ValueError('Expected direct types export; extend resolver explicitly if APF format changes')
        source = read('package/'+target.removeprefix('./'))
    # Conservative named export probe. F02 still requires full TypeScript symbol resolution.
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
    names = set()
    for block in re.findall(r'\bexport\s+(?:type\s+)?\{([^}]+)\}', source, flags=re.S):
        for token in block.split(','):
            token = re.sub(r'^\s*type\s+', '', token).strip()
            if token: names.add(token.split(' as ')[-1].strip())
    names.update(re.findall(r'\bexport\s+(?:declare\s+)?(?:class|interface|type|const|function|enum)\s+(\w+)', source))
    with args.aliases.open(newline='') as f: expected = [r['historical_export'] for r in csv.DictReader(f)]
    missing = sorted(set(expected)-names)
    result = {'probe':'named-core-exports-only','tarball_sha256':hashlib.sha256(args.tarball.read_bytes()).hexdigest(),
              'required_aliases':len(expected),'missing_count':len(missing),'missing':missing,
              'ok':not missing,'limit':'Not a full API/type/DI audit; perform F02 compiler and identity tests.'}
    print(json.dumps(result,indent=2));return int(bool(missing))
if __name__ == '__main__':
    try: raise SystemExit(main())
    except (ValueError,KeyError,OSError,tarfile.TarError) as e: raise SystemExit(str(e))
