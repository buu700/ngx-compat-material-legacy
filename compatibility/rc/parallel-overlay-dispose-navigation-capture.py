# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read-only cache access; anonymous missing raw blobs; finite original replay."""
from pathlib import Path
import base64, gzip, hashlib, json, os, re, subprocess, urllib.request

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/parallel-overlay-dispose-navigation-'
MIRROR = Path('/home/parallels/.cache/angular-components.git')
RAW_CACHE = Path('/home/parallels/.cache/ngx-material-legacy-upstream-blobs')
SHA = 'b3e4d576b9f0060bb1110766d74c982e4620b2a6'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1',
       'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_NOSYSTEM': '1'}
for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
            'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
    env.pop(key, None)
H = lambda raw: hashlib.sha256(raw).hexdigest()
OID = lambda kind, raw: hashlib.sha1((kind + ' ' + str(len(raw)) + '\0').encode() + raw).hexdigest()
objects, receipts, blobs = {}, [], {}
prior_capture = ROOT / (PREFIX + 'originals.json.gz')
if prior_capture.exists():
    prior = json.loads(gzip.decompress(prior_capture.read_bytes()))
    assert prior['sha'] == SHA
    for member in prior['tagged_members'] + [member for section in prior['sections'] for member in [section['before'], section['after']]]:
        raw = member['body'].encode()
        assert OID('blob', raw) == member['blob'] and H(raw) == member['sha256']
        blobs[member['blob']] = raw
    receipts.extend(prior['anonymous_blob_receipts'])

def git(*args):
    return subprocess.check_output(['git', '--no-replace-objects', '--git-dir=' + str(MIRROR),
        '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env, stderr=subprocess.DEVNULL)

def obj(kind, sha):
    key = (kind, sha)
    if key not in objects:
        raw = git('cat-file', kind, sha)
        assert OID(kind, raw) == sha
        objects[key] = raw
    return objects[key]

def commit(sha):
    raw = obj('commit', sha)
    head = raw.decode().split('\n\n', 1)[0].splitlines()
    return {'sha': sha, 'sha256': H(raw), 'raw': raw.decode(),
            'tree': next(line[5:] for line in head if line.startswith('tree ')),
            'parents': [line[7:] for line in head if line.startswith('parent ')]}

def tree(sha):
    raw = obj('tree', sha)
    at, result = 0, {}
    while at < len(raw):
        space, end = raw.index(b' ', at), raw.index(b'\0', at)
        name = raw[space + 1:end].decode()
        assert name and '/' not in name and name not in result
        result[name] = {'mode': raw[at:space].decode(), 'sha': raw[end + 1:end + 21].hex()}
        at = end + 21
    assert at == len(raw)
    return result

def lookup(commit, path):
    sha = commit['tree']
    parts = path.split('/')
    for index, part in enumerate(parts):
        row = tree(sha).get(part)
        if row is None: return None
        if index < len(parts) - 1:
            assert row['mode'] == '40000'
            sha = row['sha']
    return row

def delta(a, b, prefix=''):
    if a == b: return []
    before, after, rows = tree(a), tree(b), []
    for name in sorted(set(before) | set(after)):
        x, y = before.get(name), after.get(name)
        if x == y: continue
        if x and y and x['mode'] == y['mode'] == '40000':
            rows.extend(delta(x['sha'], y['sha'], prefix + name + '/'))
        else:
            rows.append({'path': prefix + name, 'status': 'M' if x and y else 'A' if y else 'D',
                'before_mode': x['mode'] if x else '000000', 'after_mode': y['mode'] if y else '000000',
                'before_blob': x['sha'] if x else '0' * 40, 'after_blob': y['sha'] if y else '0' * 40})
    return rows

def public(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'source-review/1'}), timeout=30) as response:
        assert response.status == 200
        return response.read()

def blob(commit, path):
    row = lookup(commit, path)
    assert row and row['mode'] == '100644'
    sha = row['sha']
    if sha not in blobs:
        source = 'shared-raw-blob-cache'
        if (RAW_CACHE / sha).exists(): raw = (RAW_CACHE / sha).read_bytes()
        else:
            try: raw = obj('blob', sha); source = 'shared-git-object-cache'
            except subprocess.CalledProcessError:
                url = 'https://raw.githubusercontent.com/angular/components/' + commit['sha'] + '/' + path
                raw = public(url); source = 'anonymous-raw-HTTPS'
                receipts.append({'url': url, 'blob': sha, 'sha256': H(raw), 'bytes': len(raw), 'credentials_used': False})
        assert OID('blob', raw) == sha
        blobs[sha] = raw
    return {'commit': commit['sha'], 'path': path, 'blob': sha, 'sha256': H(blobs[sha]),
            'bytes': len(blobs[sha]), 'body': blobs[sha].decode()}

census_raw = (ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz').read_bytes()
assert H(census_raw) == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
census = json.loads(gzip.decompress(census_raw))
assert len(census['commits']) == len({row['sha'] for row in census['commits']}) == 1697
selected = next(row for row in census['commits'] if row['sha'] == SHA)
target = commit(SHA)
assert target['raw'] == selected['raw_commit'] and target['tree'] == selected['tree'] and target['parents'] == selected['parents']
parent, tagged = commit(target['parents'][0]), commit(TAG)
changed = delta(parent['tree'], target['tree'])
assert changed == selected['complete_changed_files'] and len(changed) == 2
sections = [{**row, 'before': blob(parent, row['path']), 'after': blob(target, row['path'])} for row in changed]
patch_url = 'https://github.com/angular/components/commit/' + SHA + '.patch'
if prior_capture.exists():
    patch = (ROOT / (PREFIX + 'whole-original.patch')).read_bytes()
    assert H(patch) == prior['patch_sha256']
    email_patch_hash = prior['email_patch_sha256']
else:
    email_patch = public(patch_url)
    email_patch_hash = H(email_patch)
    at = email_patch.index(b'diff --git ')
    patch = email_patch[at:]
    if patch.endswith(b'\n-- \n'): patch = patch[:-5]
diffs = re.split(r'(?=^diff --git )', patch.decode(), flags=re.M)
diffs = [part for part in diffs if part]
assert len(diffs) == len(sections)
all_hunks = []
for section, diff in zip(sections, diffs):
    path = section['path']
    assert diff.startswith('diff --git a/' + path + ' b/' + path + '\n')
    index = re.search(r'^index ([0-9a-f]+)\.\.([0-9a-f]+) 100644$', diff, re.M)
    assert section['before_blob'].startswith(index[1]) and section['after_blob'].startswith(index[2])
    assert '--- a/' + path + '\n+++ b/' + path + '\n' in diff
    starts = list(re.finditer(r'^@@ .*$', diff, re.M))
    before, output, cursor, hunks = section['before']['body'].splitlines(), [], 0, []
    for i, start in enumerate(starts):
        text = diff[start.start():starts[i + 1].start() if i + 1 < len(starts) else len(diff)]
        lines = text.splitlines()
        header = lines.pop(0)
        m = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?', header)
        assert m
        old_count, new_count = int(m[2] or 1), int(m[4] or 1)
        old_start, new_start = int(m[1]) - bool(old_count), int(m[3]) - bool(new_count)
        assert old_start >= cursor
        output.extend(before[cursor:old_start]); cursor = old_start
        assert len(output) == new_start
        old = new = 0
        for line in lines:
            assert line and line[0] in ' +-'
            if line[0] != '+': assert before[cursor] == line[1:]; cursor += 1; old += 1
            if line[0] != '-': output.append(line[1:]); new += 1
        assert (old, new) == (old_count, new_count)
        record = {'path': path, 'index': i + 1, 'header': header, 'text': text, 'sha256': H(text.encode())}
        hunks.append(record); all_hunks.append(record)
    output.extend(before[cursor:])
    assert '\n'.join(output) + '\n' == section['after']['body']
    section['hunks'], section['patch'], section['patch_sha256'] = hunks, diff, H(diff.encode())

tag_paths = ['src/cdk/overlay/overlay-directives.ts', 'src/cdk/overlay/overlay-config.ts', 'src/cdk/overlay/overlay-ref.ts',
    'src/material/legacy-select/select.html', 'src/material/legacy-select/select.ts',
    'src/material/legacy-dialog/dialog-config.ts', 'src/material/dialog/dialog.ts', 'src/material/dialog/dialog-ref.ts',
    'src/material/dialog/dialog-config.ts', 'src/cdk/dialog/dialog-config.ts', 'src/cdk/dialog/dialog.ts', 'src/cdk/dialog/dialog-ref.ts',
    'src/material/legacy-autocomplete/autocomplete-trigger.ts', 'src/material/menu/menu-trigger.ts',
    'src/material/tooltip/tooltip.ts', 'src/material/snack-bar/snack-bar.ts']
tag_members = [blob(tagged, path) for path in tag_paths]
result = {'schema_version': 1, 'line': '21.x', 'sha': SHA, 'census': {'path': 'compatibility/rc/upstream-complete-patch-census.json.gz', 'sha256': H(census_raw)},
    'selected_census_entry': selected, 'target': target, 'parent': parent, 'tagged_reference': tagged,
    'complete_changed_files': changed, 'sections': sections, 'hunks': all_hunks,
    'patch_sha256': H(patch), 'email_patch_sha256': email_patch_hash, 'patch_url': patch_url,
    'tagged_members': tag_members,
    'tree_objects': [{'sha': sha, 'raw_base64': base64.b64encode(raw).decode(), 'sha256': H(raw)} for (kind, sha), raw in objects.items() if kind == 'tree'],
    'anonymous_blob_receipts': receipts, 'shared_cache_modified': False, 'credentials_used': False,
    'upstream_code_executed': False, 'actual_runtime_native_packed_floor_or_canonical_qualified': False, 'g11_claim': 'not-passed'}
(ROOT / (PREFIX + 'whole-original.patch')).write_bytes(patch)
(ROOT / (PREFIX + 'originals.json.gz')).write_bytes(gzip.compress((json.dumps(result, indent=2) + '\n').encode(), mtime=0))
print(json.dumps({'result': 'complete-original-authenticated', 'files': len(changed), 'hunks': len(all_hunks),
    'tagged_members': len(tag_members), 'trees': sum(kind == 'tree' for kind, _ in objects), 'anonymous_missing_blob_reads': len(receipts),
    'patch_sha256': H(patch), 'shared_cache_modified': False}))
