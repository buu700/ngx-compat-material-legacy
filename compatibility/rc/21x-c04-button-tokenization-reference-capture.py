# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Capture only locked original16 Sass data; no installation or package execution."""
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path
import posixpath
import re
import tarfile
import urllib.request

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/21x-c04-button-tokenization-'
IDENTITY = 'compatibility/rc/original16-sass-source-diagnostic-identity.json'
IDENTITY_HASH = '324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()
identity_raw = (ROOT / IDENTITY).read_bytes()
assert HASH(identity_raw) == IDENTITY_HASH
identity = json.loads(identity_raw)
packages = {row['package']: row for row in identity['packages']}
known = {row['path']: row for rows in identity['loaded_source_sets'].values() for row in rows}
cache = Path('/home/parallels/.cache/ngx-compat-material-legacy-closeout')
archive_cache = Path('/tmp/ngx-button-original-sass-archives-20261028')
archive_cache.mkdir(exist_ok=True)
archives, package_sources, members = {}, {}, {}


def package_files(package):
    if package in package_sources:
        return package_sources[package]
    item = packages[package]
    assert item['resolved'].startswith('https://registry.npmjs.org/')
    scratch_archive = archive_cache / (package.replace('/', '+') + '-' + item['version'] + '.tgz')
    candidates = [scratch_archive, cache / 'reference-archives' / (package.split('/')[-1] + '-' + item['version'] + '.tgz')]
    if package == '@angular/cdk':
        candidates.insert(0, cache / 'keycode-subjects/cdk-16.2.14.tgz')
    archive = next((path.read_bytes() for path in candidates if path.is_file()), None)
    acquired = archive is None
    if acquired:
        request = urllib.request.Request(item['resolved'], headers={'User-Agent': 'ngx-legacy-locked-sass-data'})
        with urllib.request.urlopen(request, timeout=25) as response:
            archive = response.read(16 * 1024 * 1024 + 1)
    assert len(archive) == item['archive_bytes'] and HASH(archive) == item['archive_sha256'], package
    assert item['integrity'] == 'sha512-' + base64.b64encode(hashlib.sha512(archive).digest()).decode(), package
    if acquired:
        with scratch_archive.open('xb') as stream:
            stream.write(archive)
    files = {}
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        for entry in tar.getmembers():
            if not entry.name.startswith('package/') or not entry.name.endswith('.scss'):
                continue
            part = entry.name[len('package/'):]
            assert entry.isfile() and not entry.issym() and not entry.islnk()
            assert all(piece not in ('', '.', '..') for piece in part.split('/')) and entry.size <= 2 * 1024 * 1024
            body = tar.extractfile(entry).read()
            assert len(body) == entry.size and b'\0' not in body
            files[package + '/' + part] = body.decode()
    package_sources[package] = files
    archives[package] = {**item, 'acquisition': 'pinned-public-archive-data' if acquired else 'existing-archive-data'}
    print(json.dumps({'package': package, 'sass_files': len(files), 'downloaded': acquired}), flush=True)
    return files


def canonical(module, containing=None):
    assert '\\' not in module and not module.startswith('/')
    path = posixpath.normpath(module if module.startswith('@') else posixpath.join(posixpath.dirname(containing), module))
    package = '/'.join(path.split('/')[:2])
    assert package in packages, ('unlocked original Sass dependency', module, containing)
    base = path[len(package):].lstrip('/')
    if not base:
        choices = [package + '/_index.scss', package + '/index.scss']
    else:
        parent, name = posixpath.split(path)
        choices = [path if path.endswith('.scss') else path + '.scss',
                   parent + '/_' + name + ('' if name.endswith('.scss') else '.scss'),
                   path + '/_index.scss', path + '/index.scss']
    files = package_files(package)
    found = [name for name in choices if name in files]
    assert found, ('missing locked original Sass module', module, containing)
    assert len(set(found)) == 1, ('ambiguous original Sass resolution', module)
    return found[0]


original_raw = (ROOT / (PREFIX + 'originals.json.gz')).read_bytes()
assert HASH(original_raw) == '0c63465fed015d93af03cded959e871d448a0c555a6be19b5d88ff1ef8c1ba39'
original = json.loads(gzip.decompress(original_raw))
seeds = ['@angular/material/button/button-theme', '@angular/material/legacy-button/button-theme',
         '@angular/material/core/theming/theming', '@angular/material/core/theming/palette',
         '@angular/material/core/typography/typography']
queue = [canonical(module) for module in seeds]
while queue:
    path = queue.pop()
    if path in members:
        continue
    package = '/'.join(path.split('/')[:2])
    body = package_files(package)[path]
    raw = body.encode()
    expected = known[path]
    assert HASH(raw) == expected['sha256'] and len(raw) == expected['bytes'], path
    members[path] = {'path': path, 'sha256': HASH(raw), 'bytes': len(raw), 'body': body}
    text = re.sub(r'/\*[\s\S]*?\*/', '', body)
    text = re.sub(r'^\s*//.*$', '', text, flags=re.M)
    for module in re.findall(r'@(?:use|forward)\s+[\'"]([^\'"]+)[\'"]', text):
        if not module.startswith('sass:'):
            queue.append(canonical(module, path))
# Entry source is provenance for the finite public forwards; it is not compiled as a full facade.
for path in ['@angular/material/_index.scss']:
    raw = package_files('@angular/material')[path].encode()
    assert HASH(raw) == known[path]['sha256'] and len(raw) == known[path]['bytes']
    members[path] = {'path': path, 'sha256': HASH(raw), 'bytes': len(raw), 'body': raw.decode()}
for tagged in original['tagged_reference']['members']:
    path = tagged['path'].replace('src/material/', '@angular/material/')
    files = package_files('@angular/material')
    if path not in files:
        assert path in ['@angular/material/button/button.scss', '@angular/material/legacy-button/button.scss']
        continue  # Component SCSS is authenticated in the Git-tag capsule, not the npm Sass graph.
    raw = files[path].encode()
    assert raw.decode() == tagged['body'] and HASH(raw) == tagged['sha256']
    members[path] = {'path': path, 'sha256': HASH(raw), 'bytes': len(raw), 'body': raw.decode()}
producer_path = PREFIX + 'reference-capture.py'
producer_raw = (ROOT / producer_path).read_bytes()
report = {'schema_version': 1, 'line': '21.x', 'role': 'SRI-authenticated untouched original16 Sass data for bounded button contracts; not an install or qualification',
          'producer': {'path': producer_path, 'sha256': HASH(producer_raw), 'bytes': len(producer_raw)},
          'identity': {'path': IDENTITY, 'sha256': IDENTITY_HASH, 'bytes': len(identity_raw)},
          'originals': {'path': PREFIX + 'originals.json.gz', 'sha256': HASH(original_raw), 'bytes': len(original_raw)},
          'archives': sorted(archives.values(), key=lambda row: row['package']),
          'members': sorted(members.values(), key=lambda row: row['path']),
          'all_dependency_graph_members_match_prior_original_source_identity': True,
          'component_structural_sources_from_git_capsule_only': ['src/material/button/button.scss', 'src/material/legacy-button/button.scss'],
          'full_facade_dependency_graph_captured': False, 'package_install_or_runtime_execution': False,
          'sass_compilation_executed_during_capture': False, 'product_changes': 0,
          'canonical_decisions_changed': 0, 'g11_claim': 'not-passed'}
payload = gzip.compress((json.dumps(report, indent=2) + '\n').encode(), mtime=0)
out = ROOT / (PREFIX + 'tagged-sass-inputs.json.gz')
with out.open('xb') as stream:
    stream.write(payload)
print(json.dumps({'path': str(out.relative_to(ROOT)), 'sha256': HASH(payload), 'bytes': len(payload), 'members': len(members), 'packages': len(archives), 'downloads': sum(row['acquisition'] == 'pinned-public-archive-data' for row in archives.values())}))
