#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source selector reachability controls; does not evaluate browser cursor/layout."""
import gzip
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
MAIN = Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX = ROOT / 'compatibility/rc/parallel-select-pointer-cursor-'
SHA = '373a0cbf9531ea9ae0c9eb0e9cbf70f049f863b7'

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()

def git(root, *args):
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c',
        'maintenance.auto=0', *args], cwd=root, env=env, capture_output=True,
        check=True, timeout=30).stdout.decode().strip()

def block(text, marker):
    start = text.index(marker)
    opening = text.index('{', start)
    depth = 1
    end = opening + 1
    while depth:
        if text[end] == '{':
            depth += 1
        elif text[end] == '}':
            depth -= 1
        end += 1
    return text[start:end]

def json_strings(source, field):
    prefix = r'\b' + field + (r':\s*\[\s*' if field == 'styles' else r':\s*')
    return list(dict.fromkeys(json.loads(value) for value in re.findall(prefix + r'("(?:[^"\\]|\\.)*")', source)))

class Template(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.nodes = []
        self.stack = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        node = {'tag': tag, 'classes': set((attrs.get('class') or '').split()),
            'attrs': attrs, 'parents': list(self.stack)}
        self.nodes.append(node)
        self.stack.append(node)
    def handle_endtag(self, tag):
        while self.stack:
            if self.stack.pop()['tag'] == tag:
                break
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)
    def one(self, class_name):
        matches = [node for node in self.nodes if class_name in node['classes']]
        assert len(matches) == 1, (class_name, len(matches))
        return matches[0]

def pointer_rule(source, legacy=False):
    if legacy:
        outer = block(source, '.mat-form-field-type-mat-select {')
        inner = block(outer, '&:not(.mat-form-field-disabled) .mat-form-field-flex {')
        assert re.search(r'\bcursor:\s*pointer;', inner)
        return '.mat-form-field-type-mat-select:not(.mat-form-field-disabled) .mat-form-field-flex'
    found = re.findall(r'([^{}]+)\{\s*cursor:\s*pointer;\s*\}', source)
    matches = [selector.strip() for selector in found if 'mat-mdc-form-field-type-' in selector]
    assert len(matches) == 1
    return matches[0]

def selector_matches(selector, host_classes, node):
    # The actual hunk grammar plus guard omission, so its negative control
    # observes the unwanted disabled match rather than merely a parse failure.
    match = re.fullmatch(r'\.([\w-]+)(?::not\(\.([\w-]+)\))? \.([\w-]+)', selector)
    if not match:
        return False
    host, disabled, child = match.groups()
    return host in host_classes and (disabled is None or disabled not in host_classes) and child in node['classes']

def guarded_region_ok(selector, host_classes, node):
    return selector_matches(selector, host_classes, node) and not selector_matches(
        selector, host_classes | {'mat-form-field-disabled'}, node)

def legacy_protocol_ok(select, base, field, public_api, template):
    return all([
        "controlType = 'mat-select';" in base,
        "const classPrefix = 'mat-form-field-type-';" in field,
        'classList.add(classPrefix + control.controlType)' in field,
        "'[class.mat-form-field-disabled]': '_control.disabled'" in field,
        'MatFormFieldControl as MatLegacyFormFieldControl' in public_api,
        "from '@angular/material/form-field'" in public_api,
        '{provide: MatLegacyFormFieldControl, useExisting: MatLegacySelect}' in select,
        '(click)="_control.onContainerClick($event)"' in template,
    ])

assert sys.version_info[:3] == (3, 14, 7), sys.version
identities = json.loads(Path(str(PREFIX) + 'source-identities.json').read_text())
census_path = ROOT / 'compatibility/rc/upstream-complete-patch-census.json.gz'
census = json.loads(gzip.decompress(census_path.read_bytes()))
original = next(row for row in census['commits'] if row['sha'] == SHA)
assert len(census['commits']) == 1697 and original['complete_changed_file_count'] == 1
assert original['complete_changed_files'][0]['path'] == 'src/material/select/select.scss'
assert original['raw_commit'] == identities['commits'][SHA]['raw_commit']
for revision, commit in identities['commits'].items():
    assert obj('commit', commit['raw_commit'].encode()) == revision
for source in identities['sources']:
    raw = (ROOT / source['file']).read_bytes()
    assert digest(raw) == source['sha256'] and obj('blob', raw) == source['git_blob']
before = Path(str(PREFIX) + 'upstream-before.scss').read_text()
after = Path(str(PREFIX) + 'upstream-after.scss').read_text()
addition = '  &:not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper {\n    cursor: pointer;\n  }\n\n'
assert after == before.replace('.mat-mdc-form-field-type-mat-select {\n', '.mat-mdc-form-field-type-mat-select {\n' + addition, 1)
tagged_select = Path(str(PREFIX) + 'tagged-select.scss').read_text()
tagged_rule = block(tagged_select, '.mat-form-field-type-mat-select {')
tagged_field_style = Path(str(PREFIX) + 'tagged-form-field.scss').read_text()
tagged_base = Path(str(PREFIX) + 'tagged-select-base.ts').read_text()
tagged_field_template = Template(Path(str(PREFIX) + 'tagged-form-field.html').read_text())
tagged_flex = tagged_field_template.one('mat-form-field-flex')
assert tagged_flex['attrs']['(click)'] == '_control.onContainerClick($event)'
paths = [
    'projects/ngx-material-legacy/legacy-select/select.scss',
    'projects/ngx-material-legacy/legacy-select/select.html',
    'projects/ngx-material-legacy/legacy-select/select.ts',
    'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
    'projects/ngx-material-legacy/legacy-select/select.spec.ts',
    'projects/ngx-material-legacy/legacy-select/select-module.ts',
    'projects/ngx-material-legacy/legacy-form-field/form-field.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field-fill.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field-input.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field-legacy.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field-outline.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field-standard.scss',
    'projects/ngx-material-legacy/legacy-form-field/form-field.html',
    'projects/ngx-material-legacy/legacy-form-field/form-field.ts',
    'projects/ngx-material-legacy/legacy-form-field/public-api.ts',
    'projects/ngx-material-legacy/legacy-form-field/owned-tokens.ts',
    'projects/ngx-material-legacy/legacy-form-field/form-field-module.ts',
    'projects/ngx-material-legacy/package.json',
    'docs/01-contract.md', 'docs/04-motion-and-interop.md', 'research/interop-matrix.json',
]
branches, inputs, controls = [], [], []
for line, root, versions in [('21.x', ROOT, {'core': '21.2.23', 'cdk': '21.2.14', 'material': '21.2.14'}),
    ('main', MAIN, {'core': '22.1.7', 'cdk': '22.1.7', 'material': '22.1.7'})]:
    files = {path: (root / path).read_text() for path in paths}
    select = files['projects/ngx-material-legacy/legacy-select/select.ts']
    style = files['projects/ngx-material-legacy/legacy-select/select.scss']
    base = files['projects/ngx-material-legacy/legacy-select/internal/select-base.ts']
    field = files['projects/ngx-material-legacy/legacy-form-field/form-field.ts']
    html = files['projects/ngx-material-legacy/legacy-form-field/form-field.html']
    api = files['projects/ngx-material-legacy/legacy-form-field/public-api.ts']
    assert block(style, '.mat-form-field-type-mat-select {') == tagged_rule
    assert block(style, '.mat-select-trigger {') == block(tagged_select, '.mat-select-trigger {')
    field_style = files['projects/ngx-material-legacy/legacy-form-field/form-field.scss']
    for marker in ['.mat-form-field-flex {', '.mat-form-field-label-wrapper {']:
        assert block(field_style, marker) == block(tagged_field_style, marker)
    assert block(base, 'onContainerClick()') == block(tagged_base, 'onContainerClick()')
    assert legacy_protocol_ok(select, base, field, api, html)
    legacy_selector = pointer_rule(style, legacy=True)
    legacy_template = Template(html)
    legacy_node = legacy_template.one('mat-form-field-flex')
    assert legacy_node['attrs']['(click)'] == '_control.onContainerClick($event)'
    assert [(parent['tag'], sorted(parent['classes'])) for parent in legacy_node['parents']] == [
        (parent['tag'], sorted(parent['classes'])) for parent in tagged_flex['parents']]
    for child in ['mat-form-field-prefix', 'mat-form-field-infix', 'mat-form-field-suffix']:
        assert legacy_node in legacy_template.one(child)['parents']
    legacy_host = {'mat-form-field', 'mat-form-field-type-mat-select'}
    assert selector_matches(legacy_selector, legacy_host, legacy_node)
    assert not selector_matches(legacy_selector, legacy_host | {'mat-form-field-disabled'}, legacy_node)
    peers = {}
    peer_files = {'select': 'node_modules/@angular/material/fesm2022/select.mjs',
        'form-field': 'node_modules/@angular/material/fesm2022/_form-field-chunk.mjs'}
    for name, path in peer_files.items():
        raw = (root / path).read_bytes()
        source = raw.decode()
        css_values = json_strings(source, 'styles')
        assert len(css_values) == 1
        templates = json_strings(source, 'template')
        template = next(value for value in templates if ('mat-mdc-text-field-wrapper' if name == 'form-field' else 'mat-mdc-select-trigger') in value)
        peers[name] = {'source': source, 'css': css_values[0], 'template': template}
        inputs.append({'line': line, 'path': path, 'sha256': digest(raw), 'bytes': len(raw)})
    peer_select, peer_field = peers['select'], peers['form-field']
    peer_rule = pointer_rule(peer_select['css'])
    assert peer_rule == '.mat-mdc-form-field-type-mat-select:not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper'
    assert "controlType = 'mat-select';" in peer_select['source']
    assert "const classPrefix = 'mat-mdc-form-field-type-';" in peer_field['source']
    assert 'classList.add(classPrefix + control.controlType)' in peer_field['source']
    assert '"class.mat-form-field-disabled": "_control.disabled"' in peer_field['source']
    assert 'predicate: MatFormFieldControl' in peer_field['source']
    peer_node = Template(peer_field['template']).one('mat-mdc-text-field-wrapper')
    assert peer_node['attrs']['(click)'] == '_control.onContainerClick($event)'
    modern_host = {'mat-mdc-form-field', 'mat-mdc-form-field-type-mat-select'}
    assert selector_matches(peer_rule, modern_host, peer_node)
    assert not selector_matches(peer_rule, modern_host | {'mat-form-field-disabled'}, peer_node)
    assert not selector_matches(peer_rule, legacy_host, legacy_node)
    assert not selector_matches(legacy_selector, modern_host, peer_node)
    # With the genuine shared control token, a legacy select's controlType yields the
    # same modern host class. This establishes conditional CSS selector reachability.
    assert selector_matches(peer_rule, {'mat-mdc-form-field', 'mat-mdc-form-field-type-' + 'mat-select'}, peer_node)
    checks = {
        'legacy-disabled-guard-removal-rejected': not guarded_region_ok(legacy_selector.replace(':not(.mat-form-field-disabled)', ''), legacy_host, legacy_node),
        'legacy-wrong-control-type-rejected': not selector_matches(legacy_selector, {'mat-form-field', 'mat-form-field-type-mat-input'}, legacy_node),
        'legacy-wrong-region-rejected': not selector_matches(legacy_selector.replace(' .mat-form-field-flex', ' .mat-form-field-wrapper'), legacy_host, legacy_node),
        'legacy-whole-field-pointer-removal-rejected': block(style.replace('    cursor: pointer;', '    cursor: default;', 1), '.mat-form-field-type-mat-select {') != tagged_rule,
        'legacy-token-alias-removal-rejected': not legacy_protocol_ok(select, base, field, api.replace('MatFormFieldControl as MatLegacyFormFieldControl', 'OtherControl as MatLegacyFormFieldControl'), html),
        'legacy-control-type-emission-removal-rejected': not legacy_protocol_ok(select, base, field.replace('classList.add(classPrefix + control.controlType)', 'classList.add(classPrefix)'), api, html),
        'legacy-disabled-binding-weakening-rejected': not legacy_protocol_ok(select, base, field.replace("'[class.mat-form-field-disabled]': '_control.disabled'", "'[class.mat-form-field-disabled]': 'false'"), api, html),
        'legacy-click-delegation-removal-rejected': not legacy_protocol_ok(select, base, field, api, html.replace('(click)="_control.onContainerClick($event)"', '')),
        'peer-disabled-guard-removal-rejected': not guarded_region_ok(peer_rule.replace(':not(.mat-form-field-disabled)', ''), modern_host, peer_node),
        'peer-wrong-control-type-rejected': not selector_matches(peer_rule, {'mat-mdc-form-field', 'mat-mdc-form-field-type-mat-input'}, peer_node),
        'peer-wrong-wrapper-rejected': not selector_matches(peer_rule.replace(' .mat-mdc-text-field-wrapper', ' .mat-mdc-form-field-flex'), modern_host, peer_node),
        'peer-rule-cannot-substitute-legacy-region': not selector_matches(peer_rule, legacy_host, legacy_node),
    }
    assert all(checks.values()), checks
    controls.extend({'line': line, 'control': key, 'rejected': value} for key, value in checks.items())
    for package, expected in versions.items():
        path = 'node_modules/@angular/' + package + '/package.json'
        raw = (root / path).read_bytes()
        assert json.loads(raw)['version'] == expected
        inputs.append({'line': line, 'path': path, 'sha256': digest(raw)})
    for path in paths:
        raw = (root / path).read_bytes()
        inputs.append({'line': line, 'path': path, 'sha256': digest(raw), 'bytes': len(raw)})
    branches.append({'line': line, 'head': git(root, 'rev-parse', 'HEAD'),
        'tree': git(root, 'rev-parse', 'HEAD^{tree}'), 'root': str(root),
        'scoped_dirty_state': git(root, 'status', '--porcelain=v1', '--untracked-files=no', '--', *paths),
        'actual_minimum_versions': versions, 'legacy_rule_exact_tagged': True,
        'legacy_trigger_and_flex_label_wrapper_blocks_exact_tagged': True,
        'legacy_select_container_click_exact_tagged': True,
        'legacy_selector': legacy_selector, 'peer_selector': peer_rule,
        'legacy_enabled_region_matches': True, 'legacy_disabled_region_excluded': True,
        'peer_enabled_region_matches': True, 'peer_disabled_region_excluded': True,
        'peer_rule_matches_current_form_field_with_legacy_control_type_if_loaded': True,
        'native_style_loading_cursor_or_interop_executed': False})
report = {'schema_version': 1, 'kind': 'focused-source-selector-reachability-diagnostic',
    'upstream_sha': SHA, 'python': sys.version, 'census_sha256': digest(census_path.read_bytes()),
    'branches': branches, 'inputs': inputs, 'negative_controls': controls,
    'negative_controls_rejected': len(controls), 'source_diagnostic_passed': True,
    'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed',
    'limitation': 'Selector protocol and template-source reachability only. No CSS cascade, Angular projection/query/DI, runtime style installation, event dispatch or actual mouse cursor hit testing is executed. Importing a component file is not claimed to install its styles.'}
Path(str(PREFIX) + 'diagnostic.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'source_diagnostic_passed': True, 'authenticated_blob_records': len(identities['sources']),
    'negative_controls_rejected': len(controls), 'branches': [row['line'] for row in branches],
    'actual_native_packed_or_floor_qualified': False}, indent=2))
