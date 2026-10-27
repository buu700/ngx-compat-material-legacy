# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Review three complete upstream build changes without executing upstream code.

This source-only proposal does not change or admit canonical ledger entries.
The compressed original subjects include a vendored executable as JSON data;
neither it nor any upstream build, patch, installer, or lifecycle script runs.
"""
import argparse
import ast
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SUBJECTS = 'compatibility/rc/upstream-rules-js-build-subjects.json.gz'
SUBJECTS_SHA256 = '2c1ce31d855f2f4fd24185ede57165b769431c0f86168a218cc17b1fcfd7a8b1'
SHAS = ('3b9854e97a6ff942241ef3b233939f7bd1cfd22d',
        '9ae960d9dabf045b1fe14a7afe0cc6ef6c6c1b7b',
        'fba42e30c3dfe3711b8d53dc7eeda1e28ad4e301')
PATCHES = ('6a1d80bf647f33ccf2ef23d27eafae7292b2311090bc46f8ae41fa0062b6134e',
           '7344a8009379c9fae17ace568f9c76ede69146c5ccc746851dbc73956fbf6359',
           '69053479a35c1daf93296a223d601434b84474041ca95dde0aa0ac5c01b909cf')
CONTEXT = ('package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
           'toolchain-lock.json', '.node-version', '.npm-version',
           'projects/ngx-material-legacy/package.json',
           'projects/ngx-material-legacy/ng-package.json',
           'projects/ngx-material-legacy/tsconfig.lib.json',
           'scripts/pack-library.mjs', 'scripts/npm-tooling-options.mjs',
           'chainman.toml', 'chainman.lock', 'justfile', '.github/workflows/ci.yml',
           '.bazelrc', 'BUILD.bazel', 'WORKSPACE')
ADDED_DIRECT_DEPS = {'magic-string': '0.30.17', 'rollup-plugin-dts': '6.2.1',
                     'rollup-plugin-sourcemaps2': '0.5.0'}


def digest(data):
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()


def git_id(kind, text):
    data = text.encode()
    return hashlib.sha1(f'{kind} {len(data)}\0'.encode() + data).hexdigest()


def delta(before, after, patch):
    """Apply every unified hunk in memory; no Git or patch program executes it."""
    old = (before or '').splitlines(keepends=True)
    lines = patch.splitlines(keepends=True)
    headers = [i for i, line in enumerate(lines) if line.startswith('@@ ')]
    output, cursor = [], 0
    for number, index in enumerate(headers):
        match = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@[^\n]*\n?', lines[index])
        assert match, 'invalid complete hunk header'
        start, count, new_start, new_count = (int(match[1]), int(match[2] or 1), int(match[3]), int(match[4] or 1))
        position = start - 1 if count else start
        assert cursor <= position <= len(old), 'hunk outside original file'
        output.extend(old[cursor:position])
        cursor = position
        assert len(output) == (new_start - 1 if new_count else new_start), 'new hunk position drift'
        stop = headers[number+1] if number+1 < len(headers) else len(lines)
        consumed = emitted = 0
        for i in range(index+1, stop):
            line = lines[i]
            if line.startswith('\\ No newline at end of file'):
                continue
            assert line[:1] in (' ', '-', '+'), 'unreviewed hunk record'
            value = line[1:]
            if i+1 < stop and lines[i+1].startswith('\\ No newline at end of file'):
                value = value.removesuffix('\n')
            if line[0] in (' ', '-'):
                assert cursor < len(old) and old[cursor] == value, 'original hunk bytes differ'
                cursor += 1
                consumed += 1
            if line[0] in (' ', '+'):
                output.append(value)
                emitted += 1
        assert (consumed, emitted) == (count, new_count), 'incomplete hunk counts'
    output.extend(old[cursor:])
    assert ''.join(output) == (after or ''), 'complete resulting file differs'
    return len(headers)


def analyze_originals(subjects):
    assert subjects['schema_version'] == 1
    assert subjects['upstream_programs_or_tools_executed'] is False
    assert [r['sha'] for r in subjects['reviews']] == list(SHAS)
    blobs = {b['git_blob']: b for b in subjects['blobs']}
    assert len(blobs) == len(subjects['blobs']) == 84
    for oid, blob in blobs.items():
        assert git_id('blob', blob['text']) == oid
        assert digest(blob['text']) == blob['sha256']
        assert len(blob['text'].encode()) == blob['bytes']
    used, parsed, results = set(), set(), []
    for number, review in enumerate(subjects['reviews']):
        assert git_id('commit', review['raw_commit']) == review['sha']
        assert digest(review['raw_commit']) == review['raw_commit_sha256']
        headers = review['raw_commit'].split('\n\n', 1)[0].splitlines()
        assert [h[7:] for h in headers if h.startswith('parent ')] == [review['parent']]
        assert [h[5:] for h in headers if h.startswith('tree ')] == [review['tree']]
        patch = review['patch']
        assert digest(patch) == review['patch_sha256'] == PATCHES[number]
        assert len(patch.encode()) == review['patch_bytes']
        chunks = re.split(r'^diff --git ', patch, flags=re.M)
        assert chunks[0] == '' and len(chunks) == 46
        members, total = [], 0
        assert len(review['members']) == 45
        paths = [m['path'] for m in review['members']]
        assert len(set(paths)) == 45 and paths == sorted(paths)
        for member, chunk in zip(review['members'], chunks[1:]):
            path = member['path']
            assert chunk.split('\n', 1)[0] == f'a/{path} b/{path}'
            sides = {}
            for side in ('before', 'after'):
                record = member[side]
                if record is None:
                    sides[side] = None
                    continue
                assert record['mode'] in ('100644', '100755')
                blob = blobs[record['git_blob']]
                assert {k: blob[k] for k in ('git_blob', 'bytes', 'sha256')} == {k: record[k] for k in ('git_blob', 'bytes', 'sha256')}
                used.add(record['git_blob'])
                sides[side] = blob['text']
                if path.endswith(('.bazel', '.bzl')) or path == 'WORKSPACE':
                    ast.parse(blob['text'], filename=path)
                    parsed.add(record['git_blob'])
            left = member['before']['git_blob'] if member['before'] else '0'*40
            right = member['after']['git_blob'] if member['after'] else '0'*40
            assert f'\nindex {left}..{right}' in chunk
            hunks = delta(sides['before'], sides['after'], chunk)
            total += hunks
            if path.startswith('tools/bazel/legacy-rnjs/'):
                role = 'complete legacy Bazel/Yarn workspace removal' if number != 1 else 'exact reversal restoring the legacy Bazel/Yarn workspace'
            elif path.endswith(('.bazel', '.bzl')) or path == 'WORKSPACE':
                role = 'upstream Bazel graph, packaging or toolchain configuration'
            elif path == 'package.json':
                old = json.loads(sides['before']); new = json.loads(sides['after'])
                first, second = (old, new) if number != 1 else (new, old)
                expected = json.loads(json.dumps(first))
                expected['devDependencies'].update(ADDED_DIRECT_DEPS)
                assert second == expected, 'unreviewed manifest change'
                role = 'three direct upstream packaging dependencies; exact reversal for the revert'
            elif path == 'pnpm-lock.yaml':
                role = 'upstream packaging dependency resolution data; exact bytes retained, not installed'
            else:
                assert path == '.bazelignore'
                role = 'legacy Bazel workspace node_modules ignore membership'
            members.append(dict(path=path, hunks=hunks, role=role, before=member['before'], after=member['after']))
        assert total == review['hunks'] == 65
        results.append(dict(sha=review['sha'], parent=review['parent'], tree=review['tree'],
                            patch_sha256=review['patch_sha256'], complete_paths=45,
                            complete_hunks=total, members=members))
    assert used == set(blobs), 'unreferenced or missing original blob'
    maps = [{m['path']: m for m in r['members']} for r in subjects['reviews']]
    assert maps[0].keys() == maps[1].keys() == maps[2].keys()
    assert all(a['before'] == maps[1][p]['after'] and a['after'] == maps[1][p]['before'] for p, a in maps[0].items())
    differing = [p for p, a in maps[0].items() if any(a[s] != maps[2][p][s] for s in ('before', 'after'))]
    assert differing == ['WORKSPACE', 'package.json', 'src/components-examples/BUILD.bazel']
    def text(number, path, side):
        return blobs[maps[number][path][side]['git_blob']]['text']
    assert text(2, 'WORKSPACE', 'before') == text(0, 'WORKSPACE', 'before')
    assert text(2, 'WORKSPACE', 'after') == text(0, 'WORKSPACE', 'after').replace(
        '005c80615934c891d729d5efc1ae661f9e3210c4', '0a54fca16350cab2b823908f1725aec175fcfeb2')
    for side in ('before', 'after'):
        assert text(2, 'package.json', side) == text(0, 'package.json', side).replace(
            '"version": "20.0.0-next.7"', '"version": "20.0.0-next.8"')
    assert text(2, 'src/components-examples/BUILD.bazel', 'before') == text(0, 'src/components-examples/BUILD.bazel', 'before')
    assert text(2, 'src/components-examples/BUILD.bazel', 'after') == text(0, 'src/components-examples/BUILD.bazel', 'after').replace(
        '    tags = ["docs-package"],', '    replace_prefixes = {\n        "docs-content/": "/",\n    },\n    tags = ["docs-package"],')
    return dict(reviews=results, unique_original_blobs=84,
                unique_Starlark_sources_parsed=len(parsed),
                original_file_occurrences=135, original_hunks=195,
                exact_inverse_file_pairs=45, reapplication_identical_file_pairs=42,
                reapplication_differing_paths=differing,
                upstream_programs_or_tools_executed=False)


def read_subjects(root):
    data = (root / SUBJECTS).read_bytes()
    assert digest(data) == SUBJECTS_SHA256, 'original subject archive changed'
    return json.loads(gzip.decompress(data))


def source_context(root):
    def git(*args):
        return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0',
            '-c', 'maintenance.auto=0', *args], cwd=root, check=True,
            env={**os.environ, 'GIT_NO_LAZY_FETCH': '1'}, capture_output=True).stdout.decode()
    def record(path):
        target = root / path
        assert target.is_file() and not target.is_symlink(), 'nonregular reviewed input'
        data = target.read_bytes()
        return dict(path=path, bytes=len(data), sha256=digest(data))
    product = json.loads((root / 'projects/ngx-material-legacy/package.json').read_text())
    pkg = json.loads((root / 'package.json').read_text())
    line = {'21': '21.x', '22': 'main'}[product['version'].split('.')[0]]
    assert pkg['scripts']['build:lib'] == 'node scripts/pack-library.mjs'
    assert not pkg.get('pnpm', {}).get('patchedDependencies')
    for section in ('dependencies', 'devDependencies', 'optionalDependencies'):
        assert not any(name in pkg.get(section, {}) for name in (*ADDED_DIRECT_DEPS, '@angular/bazel', '@bazel/rollup'))
    pack = (root / 'scripts/pack-library.mjs').read_text()
    assert len(re.findall(r"run\('pnpm',\s*\[\s*'exec',\s*'ng-packagr',\s*'-p',\s*project,\s*'-c',\s*tsconfig,?\s*\]\);", pack)) == 1
    assert 'bazel' not in pack and 'legacy-rnjs' not in pack
    paths = sorted(set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'projects/ngx-material-legacy').splitlines()))
    assert paths and not any(p.endswith(('.bazel', '.bzl')) or '/tools/bazel/' in p for p in paths)
    tracked = git('ls-files', '--cached', '--others', '--exclude-standard', '--',
                  'BUILD.bazel', 'WORKSPACE', '.bazelrc', 'tools/bazel').splitlines()
    # These three historical root files remain in the checkout. Their presence
    # is not evidence that this library uses the later upstream Bazel packer.
    assert tracked == ['.bazelrc', 'BUILD.bazel', 'WORKSPACE']
    assert re.search(r'^entryPoints = \[\]$', (root / 'BUILD.bazel').read_text(), re.M)
    for path in ('chainman.toml', 'chainman.lock', 'justfile', '.github/workflows/ci.yml'):
        assert not re.search(r'\bbazel\b|legacy-rnjs', (root / path).read_text(), re.I), 'new maintained Bazel entry point'
    return dict(line=line, package_version=product['version'], files=[record(p) for p in CONTEXT],
                tracked_product_paths_sha256=digest('\n'.join(paths)+'\n'),
                product_members=[record(p) for p in paths], product_member_count=len(paths),
                build_script=pkg['scripts']['build:lib'], ng_packagr=pkg['devDependencies']['ng-packagr'],
                direct_upstream_packaging_dependencies=[],
                retained_historical_root_Bazel_members=[record(p) for p in tracked],
                upstream_legacy_rnjs_members=[],
                installed_peer_manifests={name: record('node_modules/'+name+'/package.json') for name in ('@angular/cdk', '@angular/material')})


def review(root):
    analysis = analyze_originals(read_subjects(root))
    context = source_context(root)
    return dict(schema_version=1, line=context['line'],
                role='Three individually reviewed upstream rules_js packaging source exclusions; proposal only',
                subjects=dict(path=SUBJECTS, sha256=SUBJECTS_SHA256),
                inspector=dict(path='scripts/upstream_rules_js_build_scope.py',
                               sha256=digest((root / 'scripts/upstream_rules_js_build_scope.py').read_bytes())),
                analysis=analysis, candidate_context=context,
                individual_decisions=[dict(sha=sha, proposed_disposition='not-applicable',
                    reason=reason) for sha, reason in zip(SHAS, (
                    'The complete migration changes upstream Bazel repository names, package target dependencies, stamping, ng_package/ts_project macros, three packaging dependencies and the removed legacy-rnjs/Yarn workspace. The maintained add-on packs its own source with ng-packagr and imports none of that build graph. Retained historical root Bazel files are explicitly recorded; no installed-CDK runtime inheritance is claimed.',
                    'Every one of the 45 complete before/after file pairs exactly reverses the first migration. This restores the upstream Bazel/Yarn workspace and packaging graph, without introducing a changed legacy component source or a maintained add-on build input. The restored Yarn executable is authenticated inert data here, not executed or security-cleared.',
                    'The reapplication has 42 complete file pairs identical to the first migration. The three differences are the rules_angular repository pin, the already changed upstream root package version on both sides, and a docs-package replace_prefixes map. These belong to upstream packaging/docs; the maintained ng-packagr build does not consume them. No component HTML/CSS/SCSS or consumer TypeScript API change follows.'))],
                proposed_disposition='not-applicable', canonical_ledger_changes=0,
                canonical_admitted=False, current_runtime_or_packed_or_floor_qualified=False,
                upstream_vendor_security_clearance=False, g11_claim='not-passed')


def verify_review(root, body):
    return body == review(root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    tools = json.loads((root / 'toolchain-lock.json').read_text())
    assert subprocess.run(['node', '--version'], capture_output=True, text=True, check=True).stdout.strip() == 'v'+tools['repository']['node']
    body = review(root)
    with Path(args.out).open('x') as output:
        json.dump(body, output, indent=2)
        output.write('\n')
    print(json.dumps({k: body['analysis'][k] for k in ('original_file_occurrences', 'original_hunks', 'exact_inverse_file_pairs', 'reapplication_identical_file_pairs')} | dict(line=body['line'], canonical_ledger_changes=0)))


if __name__ == '__main__':
    main()
