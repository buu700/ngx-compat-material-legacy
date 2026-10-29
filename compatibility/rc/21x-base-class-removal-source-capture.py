# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Authenticate complete originals; anonymous missing-blob reads, isolated objects."""
from pathlib import Path
import base64
import concurrent.futures
import gzip
import hashlib
import json
import mmap
import os
import re
import struct
import subprocess
import urllib.parse
import urllib.request
import zlib

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/21x-base-class-removal-source-'
MIRROR = Path('/home/parallels/.cache/angular-components.git')
SHA = '55f9618b687fc0da4743a3cf27e113ceb837e151'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
CENSUS = 'compatibility/rc/upstream-complete-patch-census.json.gz'
TASK = ROOT / '.cache/base-class-originals-55f9618b'
OBJECTS = TASK / 'objects'
OBJECTS.mkdir(parents=True, exist_ok=True)
H = lambda raw: hashlib.sha256(raw).hexdigest()
env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1',
       'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1'}
for name in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
             'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
    env.pop(name, None)
env['GIT_OBJECT_DIRECTORY'] = str(OBJECTS)
env['GIT_ALTERNATE_OBJECT_DIRECTORIES'] = str(MIRROR / 'objects')


def git(*args):
    return subprocess.check_output(['git', '--no-replace-objects', '--git-dir=' + str(MIRROR),
                                   '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env)


def oid(kind, raw):
    return hashlib.sha1((kind + ' ' + str(len(raw)) + '\0').encode() + raw).hexdigest()


indexes = []
assert not (MIRROR / 'objects/info/alternates').exists()
for path in (MIRROR / 'objects/pack').glob('*.idx'):
    fd = path.open('rb')
    data = mmap.mmap(fd.fileno(), 0, access=mmap.ACCESS_READ)
    v2 = data[:4] == b'\xfftOc'
    at = 8 if v2 else 0
    if v2:
        assert struct.unpack('>I', data[4:8])[0] == 2
    indexes.append((fd, data, v2, at, struct.unpack('>256I', data[at:at + 1024])))


def cached(sha):
    if (OBJECTS / sha[:2] / sha[2:]).is_file() or (MIRROR / 'objects' / sha[:2] / sha[2:]).is_file():
        return True
    key = bytes.fromhex(sha)
    for _, data, v2, at, fanout in indexes:
        lo = fanout[key[0] - 1] if key[0] else 0
        hi = fanout[key[0]]
        base, stride, offset = at + 1024, 20 if v2 else 24, 0 if v2 else 4
        while lo < hi:
            mid = (lo + hi) // 2
            value = data[base + mid * stride + offset:base + mid * stride + offset + 20]
            if value < key:
                lo = mid + 1
            else:
                hi = mid
        if lo < fanout[-1] and data[base + lo * stride + offset:base + lo * stride + offset + 20] == key:
            return True
    return False


objects = {}
network_receipts = []


def obj(kind, sha):
    if sha in objects.get(kind, {}):
        return objects[kind][sha]
    assert cached(sha), 'uncached non-blob object: ' + kind + ' ' + sha
    raw = git('cat-file', kind, sha)
    assert oid(kind, raw) == sha
    objects.setdefault(kind, {})[sha] = raw
    return raw


def commit(sha):
    raw = obj('commit', sha)
    head = raw.decode().split('\n\n', 1)[0].splitlines()
    return {'sha': sha, 'raw': raw.decode(), 'sha256': H(raw),
            'tree': next(line[5:] for line in head if line.startswith('tree ')),
            'parents': [line[7:] for line in head if line.startswith('parent ')]}


def tree(sha):
    raw = obj('tree', sha)
    at, entries = 0, {}
    while at < len(raw):
        space, end = raw.index(b' ', at), raw.index(b'\0', at)
        name = raw[space + 1:end].decode()
        assert name not in entries
        entries[name] = {'mode': raw[at:space].decode(), 'sha': raw[end + 1:end + 21].hex()}
        at = end + 21
    return entries


def lookup(c, path):
    parts, current = path.split('/'), c['tree']
    assert all(part and part not in ['.', '..'] for part in parts)
    for i, name in enumerate(parts):
        value = tree(current).get(name)
        if value is None:
            return None
        if i == len(parts) - 1:
            return value
        assert value['mode'] == '40000'
        current = value['sha']


def delta(a, b, prefix=''):
    if a == b:
        return []
    before, after, out = tree(a) if a else {}, tree(b) if b else {}, []
    for name in sorted(set(before) | set(after)):
        x, y = before.get(name), after.get(name)
        if x == y:
            continue
        path = prefix + name
        if (x and x['mode'] == '40000') or (y and y['mode'] == '40000'):
            assert not x or x['mode'] == '40000'
            assert not y or y['mode'] == '40000'
            out += delta(x['sha'] if x else None, y['sha'] if y else None, path + '/')
        else:
            out.append({'path': path, 'status': 'M' if x and y else 'A' if y else 'D',
                        'before_mode': x['mode'] if x else '000000', 'after_mode': y['mode'] if y else '000000',
                        'before_blob': x['sha'] if x else '0' * 40, 'after_blob': y['sha'] if y else '0' * 40})
    return out


census_raw = (ROOT / CENSUS).read_bytes()
assert H(census_raw) == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
census = json.loads(gzip.decompress(census_raw))
source = next(row for row in census['commits'] if row['sha'] == SHA)
target, tagged = commit(SHA), commit(TAG)
parent = commit(target['parents'][0])
assert target['raw'] == source['raw_commit'] and target['tree'] == source['tree']
changed = delta(parent['tree'], target['tree'])
assert changed == source['complete_changed_files'] and len(changed) == 72
assert all(row['status'] == 'M' for row in changed)
assert sum(row['path'].startswith('src/') for row in changed) == 47
assert sum(row['path'].startswith('tools/public_api_guard/') for row in changed) == 25

requests = {}


def plan(c, path):
    value = lookup(c, path)
    assert value and value['mode'] == '100644', path
    requests.setdefault(value['sha'], {'commit': c['sha'], 'path': path, 'blob': value['sha']})


for row in changed:
    plan(parent, row['path'])
    plan(target, row['path'])
tagged_paths = [row['path'] for row in changed]
absent_legacy = []
for row in changed:
    path = row['path']
    if path.startswith('src/material/'):
        parts = path.split('/')
        parts[2] = 'legacy-' + parts[2]
        legacy = '/'.join(parts)
    else:
        legacy = path.replace('tools/public_api_guard/material/', 'tools/public_api_guard/material/legacy-')
    if lookup(tagged, legacy):
        tagged_paths.append(legacy)
    else:
        absent_legacy.append(legacy)
tagged_paths = list(dict.fromkeys(tagged_paths))
for path in tagged_paths:
    plan(tagged, path)
missing = [request for sha, request in requests.items() if not cached(sha)]
print(json.dumps({'phase': 'authenticated-original-trees', 'changed_files': 72,
                  'tagged_members': len(tagged_paths), 'unique_blobs': len(requests),
                  'missing_blobs': len(missing), 'missing_legacy_counterparts': absent_legacy}), flush=True)


def fetch(request):
    path, sha = request['path'], request['blob']
    url = 'https://raw.githubusercontent.com/angular/components/' + request['commit'] + '/' + urllib.parse.quote(path, safe='/')
    req = urllib.request.Request(url, headers={'User-Agent': 'ngx-compat-original-source-audit', 'Accept': 'text/plain'})
    with urllib.request.urlopen(req, timeout=45) as response:
        assert urllib.parse.urlparse(response.geturl()).hostname == 'raw.githubusercontent.com'
        raw = response.read(4 * 1024 * 1024 + 1)
        assert len(raw) <= 4 * 1024 * 1024
        assert oid('blob', raw) == sha, path
    destination = OBJECTS / sha[:2] / sha[2:]
    destination.parent.mkdir(exist_ok=True)
    with destination.open('xb') as fd:
        fd.write(zlib.compress(b'blob ' + str(len(raw)).encode() + b'\0' + raw))
    return {'url': url, 'commit': request['commit'], 'path': path, 'blob': sha,
            'sha256': H(raw), 'bytes': len(raw), 'authenticated_Git_blob': True,
            'credentials_used': False}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(fetch, request) for request in missing]
    for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
        network_receipts.append(future.result())
        if i % 12 == 0 or i == len(missing):
            print(json.dumps({'phase': 'anonymous-verified-blob-retrieval', 'done': i, 'total': len(missing)}), flush=True)


def member(c, path):
    value = lookup(c, path)
    assert value and value['mode'] == '100644'
    raw = obj('blob', value['sha'])
    return {'path': path, 'blob': value['sha'], 'sha256': H(raw), 'bytes': len(raw), 'body': raw.decode()}


diff = git('diff', '--no-ext-diff', '--no-renames', '--binary', '--full-index', parent['sha'], SHA).decode()
parts = diff.split('diff --git ')[1:]
assert len(parts) == 72
sections = []
for row, part in zip(changed, parts):
    patch = 'diff --git ' + part
    assert patch.startswith('diff --git a/' + row['path'] + ' b/' + row['path'] + '\n')
    hunks = re.split(r'(?=^@@ )', patch, flags=re.M)[1:]
    sections.append({**row, 'before': member(parent, row['path']), 'after': member(target, row['path']),
                     'patch': patch, 'patch_sha256': H(patch.encode()),
                     'hunks': [{'index': i + 1, 'header': h.split('\n')[0], 'text': h, 'sha256': H(h.encode())} for i, h in enumerate(hunks)]})
reference = [member(tagged, path) for path in tagged_paths]
packet = {'schema_version': 1, 'line': '21.x', 'sha': SHA, 'original_commit': target,
          'parent_commit': parent, 'tagged_reference': {'tag': '16.2.14', 'commit': tagged, 'members': reference,
                                                      'absent_legacy_counterparts': absent_legacy},
          'complete_changed_files': changed, 'sections': sections, 'diff': diff, 'diff_sha256': H(diff.encode()),
          'original_files': len(sections), 'original_hunks': sum(len(row['hunks']) for row in sections),
          'tree_objects': [{'sha': sha, 'sha256': H(raw), 'raw_base64': base64.b64encode(raw).decode()} for sha, raw in objects['tree'].items()],
          'capture_policy': {'shared_cache_modified': False, 'lazy_fetch': False, 'Git_replace_objects': False,
                             'anonymous_raw_HTTPS_requests': len(network_receipts), 'credentials_used': False,
                             'isolated_object_storage': True, 'upstream_code_executed': False},
          'anonymous_blob_receipts': sorted(network_receipts, key=lambda row: row['blob']),
          'original_source_review_complete': False, 'canonical_decisions_changed': 0, 'product_changes': 0,
          'actual_native_packed_browser_floor_or_full_audit_qualified': False, 'g11_claim': 'not-passed'}
path = ROOT / (PREFIX + 'originals.json.gz')
with path.open('xb') as out:
    out.write(gzip.compress((json.dumps(packet, indent=2) + '\n').encode(), mtime=0))
print(json.dumps({'result': 'captured-not-substantively-reviewed', 'path': str(path.relative_to(ROOT)),
                  'sha256': H(path.read_bytes()), 'bytes': path.stat().st_size,
                  'original_files': 72, 'original_hunks': packet['original_hunks'],
                  'tagged_members': len(reference), 'anonymous_blob_reads': len(network_receipts),
                  'complete_patch_sha256': packet['diff_sha256']}), flush=True)
for fd, data, *_ in indexes:
    data.close()
    fd.close()
