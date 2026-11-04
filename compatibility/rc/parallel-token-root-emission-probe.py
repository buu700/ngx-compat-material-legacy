#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole-source preservation and actual minimum peer token-consumer census."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
MAIN = Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX = ROOT / 'compatibility/rc/parallel-token-root-emission-'
SHAS = {'spinner': 'f8252d816806b4fff18bb5f7d313a8edca774459', 'snack': '6c724c713fb0510b32ce302a51f1d9d15df4b668'}
KINDS = {'spinner': 'progress-spinner', 'snack': 'snack-bar'}
def digest(raw):
    return hashlib.sha256(raw).hexdigest()
def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()
def text(name):
    return Path(str(PREFIX) + name).read_text()
def git(root, *args):
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c',
        'maintenance.auto=0', *args], cwd=root, env=env, check=True, capture_output=True).stdout.decode().strip()
def historical_modern_source(kind):
    return text('tagged-' + kind + '.scss').replace("@use '@material/", "@use '../vendor/mdc/")
def exact_historical(kind, source):
    return source == historical_modern_source(kind)
assert sys.version_info[:3] == (3, 14, 7)
identities = json.loads(text('source-identities.json'))
for sha, commit in identities['commits'].items():
    assert obj('commit', commit['raw_commit'].encode()) == sha
for source in identities['sources']:
    raw = (ROOT / source['file']).read_bytes()
    assert obj('blob', raw) == source['git_blob'] and digest(raw) == source['sha256']
census_path = ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz'
census = json.loads(gzip.decompress(census_path.read_bytes()))
assert len(census['commits']) == 1697
for kind, sha in SHAS.items():
    row = next(row for row in census['commits'] if row['sha'] == sha)
    acquired = next(row for row in identities['reviews'] if row['sha'] == sha)
    assert row['raw_commit'] == identities['commits'][sha]['raw_commit']
    assert row['complete_changed_file_count'] == 1 and acquired['changed_paths'] == [row['complete_changed_files'][0]['path']]
    assert obj('blob', text(kind + '-before.scss').encode()) == row['complete_changed_files'][0]['before_blob']
    assert obj('blob', text(kind + '-after.scss').encode()) == row['complete_changed_files'][0]['after_blob']
before, after = text('spinner-before.scss'), text('spinner-after.scss')
expected = before.replace('  .mat-mdc-progress-spinner {\n', '')
expected = expected.replace('  $mdc-circular-progress-color-tokens: tokens-mdc-circular-progress.get-color-tokens($config);\n',
    '  $mdc-circular-progress-color-tokens: tokens-mdc-circular-progress.get-color-tokens($config);\n  @include sass-utils.current-selector-or-root() {\n')
expected = expected.replace('    &.mat-accent {', '    .mat-accent {').replace('    &.mat-warn {', '    .mat-warn {')
assert after == expected
assert text('snack-after.scss') == text('snack-before.scss').replace(
    '  .mat-mdc-snack-bar-container {', '  @include sass-utils.current-selector-or-root() {')
oracle_path = 'compatibility/rc/oracles/material-16.2.14-sass-api.json'
oracle = json.loads((ROOT / oracle_path).read_text())
oracle_names = ['progress-spinner-color', 'progress-spinner-theme', 'progress-spinner-typography', 'progress-spinner-density',
    'snack-bar-color', 'snack-bar-theme', 'snack-bar-typography', 'snack-bar-density']
oracle_subset = {name: oracle['members']['mixins'][name] for name in oracle_names}
inputs, branches, controls = [], [], []
common_paths = ['projects/ngx-material-legacy/_index.scss', 'projects/ngx-material-legacy/package.json',
    'projects/ngx-material-legacy/styles/core/style/_sass-utils.scss',
    'projects/ngx-material-legacy/styles/core/tokens/_token-utils.scss',
    'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_circular-progress.scss',
    'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_snack-bar.scss',
    'projects/ngx-material-legacy/styles/core/tokens/m2/mat/_snack-bar.scss',
    'projects/ngx-material-legacy/styles/vendor/mdc/circular-progress/_circular-progress-theme.scss',
    'projects/ngx-material-legacy/styles/vendor/mdc/snackbar/_snackbar-theme.scss',
    'projects/ngx-material-legacy/styles/vendor/mdc/theme/_keys.scss',
    'projects/ngx-material-legacy/styles/core/theming/_all-theme.scss',
    'projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss',
    'docs/03-sass-contract.md', oracle_path]
for line, root, versions in [('21.x', ROOT, {'core': '21.2.23', 'cdk': '21.2.14', 'material': '21.2.14'}),
    ('main', MAIN, {'core': '22.1.7', 'cdk': '22.1.7', 'material': '22.1.7'})]:
    observations, peer_sources = {}, []
    for package, version in versions.items():
        path = 'node_modules/@angular/' + package + '/package.json'
        raw = (root / path).read_bytes()
        assert json.loads(raw)['version'] == version
        inputs.append({'line': line, 'path': path, 'sha256': digest(raw)})
    for kind, family in KINDS.items():
        ordinary_path = f'projects/ngx-material-legacy/styles/{family}/_{family}-theme.scss'
        legacy_path = f'projects/ngx-material-legacy/styles/legacy-{family}/_{family}-theme.scss'
        ordinary = (root / ordinary_path).read_text()
        legacy = (root / legacy_path).read_text()
        assert exact_historical(kind, ordinary)
        assert legacy == text('tagged-legacy-' + kind + '.scss')
        facade = (root / common_paths[0]).read_text()
        assert f"@forward './styles/{family}/{family}-theme' as {family}-*" in facade
        assert f"@forward './styles/legacy-{family}/{family}-theme' as legacy-{family}-*" in facade
        peer_paths = [f'node_modules/@angular/material/{family}/_{family}-theme.scss',
            f'node_modules/@angular/material/{family}/_m2-{family}.scss',
            'node_modules/@angular/material/core/tokens/_token-utils.scss',
            'node_modules/@angular/material/core/style/_sass-utils.scss',
            f'node_modules/@angular/material/fesm2022/{family}.mjs', 'node_modules/@angular/material/_index.scss']
        peer = {path: (root / path).read_text() for path in peer_paths}
        compiled = peer[peer_paths[-2]]
        styles = list(dict.fromkeys(json.loads(value) for value in re.findall(r'\bstyles:\s*\[\s*("(?:[^"\\]|\\.)*")', compiled)))
        assert styles
        css = '\n'.join(styles)
        consumed = sorted(set(re.findall(r'var\((--[\w-]+)', css)))
        if kind == 'spinner':
            emitted = ['--mdc-circular-progress-active-indicator-color']
            required = ['--mat-progress-spinner-active-indicator-color']
            assert all(name not in consumed for name in emitted)
            assert '.mat-mdc-progress-spinner' in ordinary and '&.mat-accent' in ordinary and '&.mat-warn' in ordinary
            replacement = ordinary.replace('  .mat-mdc-progress-spinner {', '  @include sass-utils.current-selector-or-root() {')
        else:
            emitted = ['--mdc-snackbar-container-color', '--mdc-snackbar-supporting-text-color',
                '--mdc-snackbar-supporting-text-font', '--mdc-snackbar-supporting-text-size',
                '--mdc-snackbar-supporting-text-line-height', '--mdc-snackbar-supporting-text-weight',
                '--mat-snack-bar-button-color']
            required = ['--mat-snack-bar-container-color', '--mat-snack-bar-supporting-text-color',
                '--mat-snack-bar-supporting-text-font', '--mat-snack-bar-supporting-text-size',
                '--mat-snack-bar-supporting-text-line-height', '--mat-snack-bar-supporting-text-weight']
            assert all(name not in consumed for name in emitted if name.startswith('--mdc-'))
            assert '--mat-snack-bar-button-color' in consumed
            assert ordinary.count('  .mat-mdc-snack-bar-container {') == 2
            replacement = ordinary.replace('  .mat-mdc-snack-bar-container {', '  @include sass-utils.current-selector-or-root() {')
        assert all(name in consumed for name in required)
        assert f'{family}-overrides;' in peer[peer_paths[-1]]
        assert '@include token-utils.values(' in peer[peer_paths[0]]
        assert '@include sass-utils.current-selector-or-root()' in peer[peer_paths[2]]
        checks = {
            'token-root-relocation-rejected-by-authentic-historical-source': not exact_historical(kind, replacement),
            'token-value-change-rejected': not exact_historical(kind, ordinary.replace('$config-or-theme', '$different-config', 1)),
            'public-argument-default-change-rejected': not exact_historical(kind, ordinary.replace('@mixin color($config-or-theme)', '@mixin color($config-or-theme: ())')),
            'current-peer-callthrough-rejected': not exact_historical(kind, ordinary + '\n@include current.theme(());\n'),
        }
        assert all(checks.values())
        controls.extend({'line': line, 'sha': SHAS[kind], 'control': name, 'rejected': value} for name, value in checks.items())
        observations[kind] = {'sha': SHAS[kind], 'ordinary_theme_exact_tag_except_vendor_import': True,
            'legacy_theme_exact_tag': True, 'historical_public_arguments_preserved': True,
            'current_peer_token_emission_uses_current_selector_or_root': True,
            'historical_ordinary_emitted_token_names_source_derived': emitted,
            'actual_minimum_component_consumed_variables': consumed,
            'current_required_token_names_absent_from_ordinary_emission': required,
            'ordinary_facade_stable_public_override_call_present': False,
            'current_peer_namespace_gap_source_confirmed': True}
        for path, source in peer.items():
            raw = source.encode();peer_sources.append({'path': path, 'sha256': digest(raw), 'bytes': len(raw), 'source': source})
        peer_sources.append({'path': peer_paths[-2] + '#extracted-styles', 'source': css, 'consumed_variables': consumed})
        for path in [ordinary_path, legacy_path, *peer_paths]:
            raw = (root / path).read_bytes();inputs.append({'line': line, 'path': path, 'sha256': digest(raw), 'bytes': len(raw)})
    archive = Path(str(PREFIX) + 'peer-' + ('21' if line == '21.x' else 'main') + '.json.gz')
    archive.write_bytes(gzip.compress(json.dumps(peer_sources, indent=2).encode(), mtime=0))
    for path in common_paths:
        raw = (root / path).read_bytes();inputs.append({'line': line, 'path': path, 'sha256': digest(raw), 'bytes': len(raw)})
    assert (root / common_paths[2]).read_text() == text('tagged-sass-utils.scss')
    branches.append({'line': line, 'head': git(root, 'rev-parse', 'HEAD'), 'tree': git(root, 'rev-parse', 'HEAD^{tree}'),
        'versions': versions, 'subjects': observations, 'peer_archive': {'path': str(archive.relative_to(ROOT)), 'sha256': digest(archive.read_bytes())},
        'tagged_current_selector_or_root_default_preserved': 'html',
        'scoped_dirty_state': git(root, 'status', '--porcelain=v1', '--untracked-files=no', '--', *common_paths,
            'projects/ngx-material-legacy/styles/progress-spinner', 'projects/ngx-material-legacy/styles/snack-bar',
            'projects/ngx-material-legacy/styles/legacy-progress-spinner', 'projects/ngx-material-legacy/styles/legacy-snack-bar')})
report = {'schema_version': 1, 'kind': 'two-individual-token-root-source-diagnostic', 'python': sys.version,
    'census_sha256': digest(census_path.read_bytes()), 'branches': branches, 'inputs': inputs,
    'historical_oracle_entries': oracle_subset, 'source_negative_controls': controls,
    'source_negative_controls_rejected': len(controls), 'passed': True,
    'fresh_sass_or_build_execution': False, 'actual_native_packed_or_floor_qualified': False,
    'g11_claim': 'not-passed', 'limitation': 'Historical source equality, original patch identity and current peer token-consumer source analysis only; no compiled CSS equivalence, custom map, runtime cascade or overlay rendering qualification.'}
Path(str(PREFIX) + 'diagnostic.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'passed': True, 'individually_authenticated_shas': len(SHAS), 'branches': len(branches),
    'source_negative_controls_rejected': len(controls), 'current_ordinary_namespace_gaps': 4,
    'fresh_sass_or_build_execution': False}))
