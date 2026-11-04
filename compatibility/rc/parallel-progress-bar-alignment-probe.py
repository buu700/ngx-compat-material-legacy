#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Focused source identity and contract controls, never a layout/runtime test."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
MAIN = Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX = ROOT / 'compatibility/rc/parallel-progress-bar-alignment-'
SHA = '43dbbe2e5eec4fc4e76950a29edc3efd94027ff9'
CACHE = '/home/parallels/.cache/angular-components.git'

def sha256(raw):
    return hashlib.sha256(raw).hexdigest()

def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()

def git(root, *args, cache=False):
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    command = ['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
        '-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=']
    if cache:
        command.append('--git-dir=' + CACHE)
    return subprocess.run(command + list(args), capture_output=True, check=True,
        cwd=root, env=env, timeout=30).stdout

def tree_chain(rev, path):
    commit = git(ROOT, 'cat-file', 'commit', rev, cache=True)
    assert obj('commit', commit) == rev
    tree = commit.splitlines()[0].decode().split()[1]
    chain = []
    parts = path.split('/')
    for at, part in enumerate(parts):
        raw = git(ROOT, 'cat-file', 'tree', tree, cache=True)
        assert obj('tree', raw) == tree
        entries, cursor = {}, 0
        while cursor < len(raw):
            end = raw.index(b'\0', cursor)
            mode, name = raw[cursor:end].split(b' ', 1)
            oid = raw[end + 1:end + 21].hex()
            assert len(oid) == 40
            entries[name.decode()] = (mode.decode(), oid)
            cursor = end + 21
        mode, selected = entries[part]
        chain.append({'tree': tree, 'tree_sha256': sha256(raw), 'name': part,
            'mode': mode, 'selected_object': selected})
        if at + 1 < len(parts):
            assert mode == '40000'
            tree = selected
    assert mode == '100644'
    return selected, chain

def legacy_style_ok(style, tagged):
    expected = tagged.replace("@use '@angular/cdk';", "@use '../styles/core/style/component-high-contrast' as cdk;")
    expected = expected.replace("@use '../core/style/vendor-prefixes';", "@use '../styles/core/style/vendor-prefixes';")
    expected = expected.replace("@use '../core/style/private';", "@use '../styles/core/style/private';")
    expected = expected.replace('cdk.high-contrast(active, off)', 'cdk.high-contrast(active)')
    return style == expected

def legacy_class_ok(source, tagged):
    marker = 'export class MatLegacyProgressBar'
    return marker in source and source[source.index(marker):] == tagged[tagged.index(marker):]

def extract_json_string(source, field):
    expression = (r'\b' + field + r':\s*\[\s*' if field == 'styles' else r'\b' + field + r':\s*')
    matches = re.findall(expression + r'("(?:[^"\\]|\\.)*")', source)
    values = [json.loads(value) for value in matches]
    assert values and len(set(values)) == 1, (field, len(values))
    return values[0]

def peer_alignment_ok(css):
    host = re.search(r'(?m)^\.mat-mdc-progress-bar\s*\{([^{}]*)\}', css)
    return bool(host and re.search(r'\btext-align\s*:\s*start\s*;', host[1])
        and not re.search(r'\.mat-progress-bar(?![\w-])', css))

identities = json.loads(Path(str(PREFIX) + 'source-identities.json').read_text())
census_path = ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz'
census = json.loads(gzip.decompress(census_path.read_bytes()))
row = next(row for row in census['commits'] if row['sha'] == SHA)
assert len(census['commits']) == 1697
assert row['raw_commit'] == identities['commits'][SHA]['raw_commit']
assert obj('commit', row['raw_commit'].encode()) == SHA
assert row['complete_changed_file_count'] == 1
assert row['complete_changed_files'][0]['path'] == 'src/material/progress-bar/progress-bar.scss'
authenticated = []
for source in identities['sources']:
    raw = (ROOT / source['file']).read_bytes()
    blob, chain = tree_chain(source['upstream_revision'], source['upstream_path'])
    assert blob == source['git_blob'] == obj('blob', raw)
    assert sha256(raw) == source['sha256']
    authenticated.append({'file': source['file'], 'blob': blob, 'verified_tree_chain': chain})

before = Path(str(PREFIX) + 'upstream-before.scss').read_text()
after = Path(str(PREFIX) + 'upstream-after.scss').read_text()
addition = "\n  // Explicitly set a `text-align` so that the content isn't affected by the parent (see #27613).\n  text-align: left;\n\n  [dir='rtl'] & {\n    text-align: right;\n  }\n"
assert after == before.replace('  display: block;\n', '  display: block;\n' + addition, 1)
tagged = {suffix: Path(str(PREFIX) + 'tagged-legacy.' + suffix).read_text() for suffix in ['scss', 'html', 'ts']}
results, inputs, mutations = [], [], []
common_paths = [
    'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.scss',
    'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.html',
    'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts',
    'projects/ngx-material-legacy/legacy-progress-bar/progress-bar.spec.ts',
    'projects/ngx-material-legacy/legacy-progress-bar/progress-bar-module.ts',
    'projects/ngx-material-legacy/legacy-progress-bar/_progress-bar-theme.scss',
    'projects/ngx-material-legacy/styles/progress-bar/_progress-bar-theme.scss',
    'projects/ngx-material-legacy/styles/vendor/mdc/linear-progress/_linear-progress-theme.scss',
    'scripts/browser-surface-families.mjs', 'scripts/progress-csp-style-contract.mjs',
    'scripts/csp-ssr-run.mjs', 'scripts/progress-bar-zone-use-review.mjs',
    'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts',
    'projects/ngx-material-legacy/package.json',
]
for line, root, expected in [('21.x', ROOT, {'core': '21.2.23', 'cdk': '21.2.14', 'material': '21.2.14'}),
                             ('main', MAIN, {'core': '22.1.7', 'cdk': '22.1.7', 'material': '22.1.7'})]:
    source = {suffix: (root / ('projects/ngx-material-legacy/legacy-progress-bar/progress-bar.' + suffix)).read_text()
        for suffix in ['scss', 'html', 'ts']}
    assert legacy_style_ok(source['scss'], tagged['scss'])
    assert source['html'] == tagged['html']
    assert legacy_class_ok(source['ts'], tagged['ts'])
    assert 'mdc-linear-progress' not in source['html'] and 'mat-mdc-progress-bar' not in source['ts']
    versions = {}
    for name, version in expected.items():
        path = 'node_modules/@angular/' + name + '/package.json'
        raw = (root / path).read_bytes()
        versions[name] = json.loads(raw)['version']
        assert versions[name] == version
        inputs.append({'line': line, 'path': path, 'sha256': sha256(raw)})
    peer_path = 'node_modules/@angular/material/fesm2022/progress-bar.mjs'
    raw = (root / peer_path).read_bytes()
    fesm = raw.decode()
    css = extract_json_string(fesm, 'styles')
    template = extract_json_string(fesm, 'template')
    assert peer_alignment_ok(css)
    assert 'mdc-linear-progress__bar-inner' in template and 'mat-progress-bar-fill' not in template
    assert "@if (mode === 'buffer')" in template
    declarations_path = 'node_modules/@angular/material/types/progress-bar.d.ts'
    declarations = (root / declarations_path).read_text()
    assert "type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';" in declarations
    assert re.search(r'interface ProgressAnimationEnd\s*\{\s*value: number;\s*\}', declarations)
    label = '21' if line == '21.x' else 'main'
    Path(str(PREFIX) + 'peer-' + label + '.mjs.gz').write_bytes(gzip.compress(raw, mtime=0))
    Path(str(PREFIX) + 'peer-' + label + '.css').write_text(css)
    Path(str(PREFIX) + 'peer-' + label + '.html').write_text(template)
    for path in common_paths + [peer_path, declarations_path]:
        content = (root / path).read_bytes()
        inputs.append({'line': line, 'path': path, 'sha256': sha256(content), 'bytes': len(content)})
    checks = {
        'transplanted-alignment-rejected': not legacy_style_ok(source['scss'].replace('  display: block;', '  display: block;\n  text-align: left;', 1), tagged['scss']),
        'fill-anchor-removal-rejected': not legacy_style_ok(source['scss'].replace('    left: 0;\n', '', 1), tagged['scss']),
        'legacy-geometry-change-rejected': not legacy_style_ok(source['scss'].replace('width: calc(100% + 10px)', 'width: 100%'), tagged['scss']),
        'modern-template-substitution-rejected': template != tagged['html'],
        'buffer-scale-change-rejected': not legacy_class_ok(source['ts'].replace('this.bufferValue / 100', 'this.bufferValue / 200'), tagged['ts']),
        'motion-event-target-weakening-rejected': not legacy_class_ok(source['ts'].replace('e.target === element', 'true'), tagged['ts']),
        'peer-reset-removal-rejected': not peer_alignment_ok(css.replace('text-align: start;', 'text-align: inherit;')),
        'peer-legacy-selector-leak-rejected': not peer_alignment_ok(css + '\n.mat-progress-bar { text-align: start; }'),
    }
    assert all(checks.values()), checks
    mutations.extend({'line': line, 'control': key, 'rejected': value} for key, value in checks.items())
    results.append({'line': line, 'root': str(root),
        'head': git(root, 'rev-parse', 'HEAD').decode().strip(),
        'tree': git(root, 'rev-parse', 'HEAD^{tree}').decode().strip(),
        'scoped_dirty_state': git(root, 'status', '--porcelain=v1', '--untracked-files=no', '--', *common_paths).decode(),
        'actual_installed_minimum_versions': versions,
        'legacy_html_exact_tagged_reference': True, 'legacy_class_implementation_exact_tagged_reference': True,
        'legacy_whole_scss_exact_except_explicit_import_and_high_contrast_adapter_changes': True,
        'peer_host_text_align': 'start', 'peer_css_has_no_exact_legacy_host_selector': True,
        'peer_fesm_sha256': sha256(raw), 'peer_extracted_css_sha256': sha256(css.encode()),
        'peer_extracted_template_sha256': sha256(template.encode())})

report = {'schema_version': 1, 'kind': 'focused-source-identity-and-mutation-diagnostic',
    'upstream_sha': SHA, 'census_sha256': sha256(census_path.read_bytes()),
    'authenticated_sources': authenticated, 'branches': results, 'inputs': inputs,
    'negative_controls': mutations, 'negative_controls_rejected': len(mutations),
    'source_diagnostic_passed': True, 'actual_native_packed_or_floor_qualified': False,
    'g11_claim': 'not-passed', 'tests_not_executed': ['browser/layout', 'enabled/reduced/noop motion',
        'historical test runner', 'Sass/build', 'packed artifact', 'runtime/peer floor execution'],
    'limitation': 'Whole-source equality and targeted source mutation rejection only. No synthetic CSS positioning model or marker is asserted as browser alignment proof.'}
Path(str(PREFIX) + 'diagnostic.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'source_diagnostic_passed': True, 'authenticated_sources': len(authenticated),
    'branches': [row['line'] for row in results], 'negative_controls_rejected': len(mutations),
    'actual_native_packed_or_floor_qualified': False}, indent=2))
