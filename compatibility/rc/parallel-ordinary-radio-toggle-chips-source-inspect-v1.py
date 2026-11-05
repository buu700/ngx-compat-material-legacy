#!/usr/bin/env python3
"""Focused source reading/hash checks only: no Sass imports, compiler, or product execution."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'compatibility/rc/parallel-ordinary-radio-toggle-chips-source-'
WORKSHEETS = [PREFIX + 'worksheet-v1.json', PREFIX + 'worksheet-addendum-v1.json']
worksheets = [json.loads((ROOT / p).read_bytes()) for p in WORKSHEETS]
ROOTS = {line: Path(root) for line, root in worksheets[0]['roots'].items()}
FAMILIES = [('radio', 'radio'), ('slide-toggle', 'slide-toggle'), ('chips', 'chip')]


def ref(root, path):
    raw = (root / path).read_bytes()
    return dict(path=path, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))


def check_inputs():
    for worksheet in worksheets:
        for line, refs in worksheet['source_inputs'].items():
            for expected in refs:
                assert ref(ROOTS[line], expected['path']) == expected, expected['path']


def locate(root, path, needle):
    text = (root / path).read_text()
    at = text.index(needle)
    return dict(path=path, line=text.count('\n', 0, at) + 1, excerpt=needle)


def css_literals(text):
    values = []
    for match in re.finditer(r'styles:\s*\[\s*("(?:[^"\\]|\\.)*")', text):
        value = json.loads(match[1])
        if value not in values:
            values.append(value)
    assert values
    return '\n'.join(values)


def token_rule(css, token):
    at = css.index('var(' + token)
    return css[css.rfind('}', 0, at) + 1:css.index('}', at) + 1].strip()


def public_keys(text, namespace):
    text = re.sub(r'//[^\n]*', '', text)
    return sorted(set(re.findall(r'^\s*' + re.escape(namespace) + r'-([a-z0-9-]+):', text, re.M)))


RADIO_ICON = ['disabled-selected-icon-color', 'disabled-unselected-icon-color',
              'unselected-hover-icon-color', 'unselected-icon-color', 'unselected-pressed-icon-color',
              'selected-focus-icon-color', 'selected-hover-icon-color', 'selected-icon-color',
              'selected-pressed-icon-color']
LABEL_TYPE = ['label-text-' + field for field in ['font', 'line-height', 'size', 'tracking', 'weight']]
SWITCH_COLORS = ['disabled-selected-handle-color', 'disabled-selected-icon-color',
                 'disabled-selected-track-color', 'disabled-unselected-handle-color',
                 'disabled-unselected-icon-color', 'disabled-unselected-track-color',
                 'handle-surface-color', 'selected-icon-color', 'unselected-focus-handle-color',
                 'unselected-focus-state-layer-color', 'unselected-focus-track-color',
                 'unselected-handle-color', 'unselected-hover-handle-color',
                 'unselected-hover-state-layer-color', 'unselected-hover-track-color',
                 'unselected-icon-color', 'unselected-pressed-handle-color',
                 'unselected-pressed-state-layer-color', 'unselected-pressed-track-color',
                 'unselected-track-color', 'selected-focus-state-layer-color', 'selected-handle-color',
                 'selected-hover-state-layer-color', 'selected-pressed-state-layer-color',
                 'selected-focus-handle-color', 'selected-hover-handle-color',
                 'selected-pressed-handle-color', 'selected-focus-track-color',
                 'selected-hover-track-color', 'selected-pressed-track-color', 'selected-track-color']
CHIP_COLORS = ['disabled-label-text-color', 'elevated-container-color',
               'elevated-disabled-container-color', 'focus-state-layer-color', 'focus-state-layer-opacity',
               'label-text-color', 'with-icon-icon-color', 'with-icon-disabled-icon-color',
               'with-icon-selected-icon-color', 'with-trailing-icon-disabled-trailing-icon-color',
               'with-trailing-icon-trailing-icon-color']
DIRECT = {'radio': [(name, '--mdc-radio-' + name) for name in RADIO_ICON + ['state-layer-size']],
          'slide-toggle': [(name, '--mdc-switch-' + name) for name in SWITCH_COLORS + ['state-layer-size']],
          'chips': [(name, '--mdc-chip-' + name) for name in CHIP_COLORS + LABEL_TYPE + ['container-height']]}
RULES = {'radio': ['selected-icon-color', 'label-text-color', 'state-layer-size', 'touch-target-display'],
         'slide-toggle': ['selected-handle-color', 'label-text-color', 'disabled-label-text-color',
                          'handle-elevation-shadow', 'state-layer-size'],
         'chips': ['elevated-container-color', 'elevated-selected-container-color',
                   'selected-label-text-color', 'container-height']}
check_inputs()
branches = []
for line, root in ROOTS.items():
    census_path = 'compatibility/rc/parallel-ordinary-sass-bridge-census-' + ('21x' if line == '21.x' else 'main') + '-v1.json'
    census = json.loads((root / census_path).read_bytes())
    original = json.loads((root / 'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes())
    census_refs = {r['path']: r for r in census['bound_inputs']}
    selected = [e for e in census['entries'] if e['family'] in dict(FAMILIES)]
    assert len(selected) == 12
    assert {e['symbol'] for e in selected} == {f + '-' + d for f, _ in FAMILIES for d in ['theme', 'color', 'typography', 'density']}
    exports = []
    for e in selected:
        path = e['forward']['path']
        assert ref(root, path) == census_refs[path]
        assert e['forward']['directive'] in (root / 'projects/ngx-material-legacy/_index.scss').read_text()
        assert e['tagged_default_oracle'] == original['members']['mixins'][e['symbol']]
        assert not e['empty_source_body'] and not e['reachable_public_overrides']
        exports.append(dict(symbol=e['symbol'], module=ref(root, path), mixin=e['mixin'],
                            forward=e['forward'], no_current_public_override_in_frozen_graph=True,
                            empty_source_body=e['empty_source_body'], tagged_default_oracle=e['tagged_default_oracle']))
    families = []
    for family, namespace in FAMILIES:
        theme_path = f'node_modules/@angular/material/{family}/_{family}-theme.scss'
        model_path = f'node_modules/@angular/material/{family}/_m3-{namespace}.scss'
        runtime_path = f'node_modules/@angular/material/fesm2022/{family}.mjs'
        runtime = (root / runtime_path).read_text()
        css = css_literals(runtime)
        native = sorted(set(re.findall(r'var\((--[a-z0-9-]+)', css)))
        keys = public_keys((root / model_path).read_text(), namespace)
        assert f'{family}-overrides' in (root / 'node_modules/@angular/material/_index.scss').read_text()
        assert f'namespace: {namespace}' in (root / theme_path).read_text()
        direct = []
        for name, old in DIRECT[family]:
            current = '--mat-' + namespace + '-' + name
            assert name in keys and current in native
            assert old not in native
            direct.append(dict(owned_name=old, public_key=name, current_name=current,
                               old_name_consumed_in_selected_shipped_style_literals=False,
                               current_name_consumed=True))
        existing = {'radio': ['ripple-color', 'checked-ripple-color', 'disabled-label-color'],
                    'slide-toggle': LABEL_TYPE, 'chips': []}[family]
        for name in existing:
            assert '--mat-' + namespace + '-' + name in native
        old_vars = sorted(v for v in native if v.startswith('--mdc-' + ('switch' if family == 'slide-toggle' else namespace) + '-'))
        assert old_vars == []
        rules = {name: token_rule(css, '--mat-' + namespace + '-' + name) for name in RULES[family]}
        if family in ['radio', 'slide-toggle']:
            assert '.mat-internal-form-field' in css and '.mdc-form-field {' not in css
        if family == 'radio':
            assert '.mat-mdc-radio-touch-target' in css and '.mdc-radio' in css
        if family == 'chips':
            for name in ['class.mat-mdc-chip-selected', 'class.mat-mdc-chip-highlighted', 'class.mdc-evolution-chip--selected']:
                assert name in runtime
        families.append(dict(family=family, public_api=family + '-overrides', namespace=namespace,
                             public_api_declaration=locate(root, theme_path, '@mixin overrides($tokens: ())'),
                             public_key_count=len(keys), public_keys=keys, runtime=ref(root, runtime_path),
                             current_family_vars=[v for v in native if v.startswith('--mat-' + namespace + '-')],
                             direct_role_name_candidates=direct,
                             already_consumed_owned_mat_names=['--mat-' + namespace + '-' + name for name in existing],
                             historical_form_field_core_selector_in_current_css='.mdc-form-field {' in css,
                             historical_form_field_align_end_selector_in_current_css='.mdc-form-field--align-end' in css,
                             focused_current_consumer_rules=rules,
                             decoded_css_sha256=hashlib.sha256(css.encode()).hexdigest()))
    focused = [
        ('projects/ngx-material-legacy/styles/vendor/mdc/form-field/_form-field.scss',
         '.mdc-form-field {\n    @include typography.typography(body2, $query);'),
        ('projects/ngx-material-legacy/styles/core/mdc-helpers/_mdc-helpers.scss',
         "@if ($scale == 'minimum' or (meta.type-of($scale) == 'number' and $scale < -1))"),
        ('projects/ngx-material-legacy/styles/vendor/mdc/switch/_switch-theme.scss',
         '$_density-config: (\n  size: (\n    minimum: 28px,\n    default: 48px,\n    maximum: 48px,'),
        ('projects/ngx-material-legacy/styles/vendor/mdc/density/_density.scss',
         '$value: map.get($property-scale-map, default) + $density-scale * $interval;'),
        ('projects/ngx-material-legacy/styles/slide-toggle/_slide-toggle-theme.scss',
         '.mdc-switch--disabled + label {\n        color: theming.get-color-from-palette($foreground, disabled-text);'),
        ('projects/ngx-material-legacy/styles/core/tokens/m2/mat/_slide-toggle.scss',
         'label-text-size: typography-utils.font-size($config, body-2)'),
        ('projects/ngx-material-legacy/styles/chips/_chips-theme.scss',
         'color.mix($on-surface, $surface, 12%)'),
        ('projects/ngx-material-legacy/styles/chips/_chips-theme.scss',
         '&.mat-mdc-chip-selected,\n    &.mat-mdc-chip-highlighted'),
    ]
    branches.append(dict(line=line, minimum_material=json.loads((root / 'node_modules/@angular/material/package.json').read_bytes())['version'],
                         minimum_cdk=json.loads((root / 'node_modules/@angular/cdk/package.json').read_bytes())['version'],
                         selected_exports=exports, families=families,
                         focused_owned_source=[locate(root, *item) for item in focused]))
check_inputs()
assert [b['minimum_material'] for b in branches] == ['21.2.14', '22.1.7']
for index, (family, _) in enumerate(FAMILIES):
    assert branches[0]['families'][index]['public_keys'] == branches[1]['families'][index]['public_keys']
    assert branches[0]['families'][index]['current_family_vars'] == branches[1]['families'][index]['current_family_vars']
output = ROOT / (PREFIX + 'paired-evidence-v1.json')
assert not output.exists()
report = dict(schema_version=1, role='Finite paired SOURCE triage of12existingordinaryexports; not output admission',
              worksheets=[ref(ROOT, p) for p in WORKSHEETS], producer=ref(ROOT, PREFIX + 'inspect-v1.py'),
              branches=branches, method='Read/hash bound sources; decode shipped component style literals to locate consumers only. No Sass execution or CSS normalization.',
              source_assertions='All selected modules equal frozen154census bytes, forwards/signatures/original default oracle unchanged; exact public key and current consumer checks pass both lines.',
              limits=['No rendered/cascade failure or pass inferred from lexical references',
                      'No compiler, build, runtime, current floor, packed, native, owner or readiness qualification',
                      'Current M2 source inspected as development oracle only; no import/call-through',
                      'Legacy-owned CSS/DOM and original empty maps/dimensions remain unchanged',
                      'Paused reader closing review remains uncompleted and was not resumed'])
output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(ref(ROOT, str(output.relative_to(ROOT)))))
