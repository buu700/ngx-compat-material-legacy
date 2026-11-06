"""Test-only post-repair Stepper CSS, anchored to untouched Material 16 evidence.

The committed pre-repair measurement fixtures remain immutable negative samples.
This helper changes only the four declarations that differ in the repaired
bridge; it does not call the production expected model.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORACLE = ROOT / 'fixtures/sass/stepper-historical-bridge-oracle.json'
SHAPE = ROOT / 'tests/fixtures/stepper-material-16/shape-observation.json'
MANIFEST = ROOT / 'tests/fixtures/stepper-material-16/source-manifest.json'
assert hashlib.sha256(ORACLE.read_bytes()).hexdigest() == 'a952c70fbb725c5ec0bd78d8b6bb7b54ac506c5dcf0600616c29e328f8bf67d9'
assert hashlib.sha256(SHAPE.read_bytes()).hexdigest() == '9834806bacc495276bfeae3c36c6e583daff0ee35919b3f373ccd31c404ca805'
assert hashlib.sha256(MANIFEST.read_bytes()).hexdigest() == 'ed9b9c8e69c63bb134b71a25ded9d68d21f1d120cdd513ba423126864986fe74'
_oracle = json.loads(ORACLE.read_bytes())
_shape = json.loads(SHAPE.read_bytes())
_manifest = json.loads(MANIFEST.read_bytes())
assert _oracle['archive_sha256'] == _manifest['archive_sha256'] == 'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b'
assert _oracle['source_manifest_sha256'] == hashlib.sha256(MANIFEST.read_bytes()).hexdigest()
assert len(_oracle['sources']) == len(_manifest['source_files']) == 163
assert all(v == '0px' for case in _shape['cases'].values() for v in case.values())


def _tagged_color(scenario, name):
    entry = _oracle['scenarios'][scenario]
    assert hashlib.sha256(entry['source'].encode()).hexdigest() == entry['source_sha256']
    assert hashlib.sha256(entry['css'].encode()).hexdigest() == entry['css_sha256']
    css = entry['css']
    found = re.findall(r'--mat-stepper-' + re.escape(name) + r': ([^;\n]+);', css)
    assert len(found) == 1, (scenario, name)
    return found[0]


_LIGHT = {name: _tagged_color('contract', name) for name in ('header-hover-state-layer-color', 'header-focus-state-layer-color')}
_DARK = {name: _tagged_color('alternate', name) for name in _LIGHT}
assert _LIGHT == dict.fromkeys(_LIGHT, 'rgba(0, 0, 0, 0.04)')
assert _DARK == dict.fromkeys(_DARK, 'rgba(255, 255, 255, 0.04)')


def repaired_stepper_css(css, line):
    """Project a frozen CSS sample through the four observed bridge edits."""
    assert line in ('main', '21.x') and isinstance(css, str)
    substitutions = []
    for name in ('header-focus-state-layer-shape', 'header-hover-state-layer-shape'):
        pattern = r'(?m)^  --mat-stepper-' + name + r': ([^;\n]+);$'
        for match in re.finditer(pattern, css):
            assert match.group(1) in ('4px', '0'), (name, match.group(1))
            if line == 'main' and match.group(1) == '4px':
                substitutions.append((match.start(1), match.end(1), '0'))
    for name, percent in (('header-hover-state-layer-color', '4'), ('header-focus-state-layer-color', '12')):
        pattern = r'(?m)^  --mat-stepper-' + name + r': ([^;\n]+);$'
        for match in re.finditer(pattern, css):
            value = match.group(1)
            before_light = f'color-mix(in srgb, rgba(0, 0, 0, 0.87) {percent}%, transparent)'
            before_dark = f'color-mix(in srgb, white {percent}%, transparent)'
            if value == before_light:
                substitutions.append((match.start(1), match.end(1), _LIGHT[name]))
            elif value == before_dark:
                substitutions.append((match.start(1), match.end(1), _DARK[name]))
            else:
                assert value in (_LIGHT[name], _DARK[name]), (name, value)
    for start, end, value in sorted(substitutions, reverse=True):
        css = css[:start] + value + css[end:]
    return css


def remeasure(measurement, css):
    measurement['css'] = css
    measurement['css_sha256'] = hashlib.sha256(css.encode()).hexdigest()
    measurement['css_bytes'] = len(css.encode())


def repaired_mixin_receipt(root, active, case, invocation):
    from sass_mixin_fixture import mixin_receipt
    body = mixin_receipt(root, active, case, invocation)
    old = body['actual']['css']
    new = repaired_stepper_css(old, body['line'])
    if new != old:
        remeasure(body['actual'], new)
        remeasure(body['mutation'], new + '\n.wrong-nonempty-mixin { color: red; }\n')
    return body


def repaired_default_companion_receipt(active, case, invocation):
    from sass_default_companion_fixture import default_companion_receipt
    body = default_companion_receipt(active, case, invocation)
    old = body['actual_measurement']['css']
    new = repaired_stepper_css(old, body['line'])
    if new != old:
        remeasure(body['actual_measurement'], new)
        body['actual_sha256'] = body['actual_measurement']['css_sha256']
        body['actual_bytes'] = body['actual_measurement']['css_bytes']
    return body


def repaired_default_aggregate_receipt(active, case, invocation):
    from sass_default_aggregate_fixture import default_aggregate_receipt
    body = default_aggregate_receipt(active, case, invocation)
    old = body['actual_measurement']['css']
    new = repaired_stepper_css(old, body['line'])
    if new != old:
        remeasure(body['actual_measurement'], new)
        body['actual_sha256'] = body['actual_measurement']['css_sha256']
        body['actual_bytes'] = body['actual_measurement']['css_bytes']
    return body


def repaired_ordered_aggregate_receipt(active, case, invocation):
    from sass_ordered_aggregate_fixture import ordered_aggregate_receipt
    body = ordered_aggregate_receipt(active, case, invocation)
    old = body['actual_measurement']['css']
    new = repaired_stepper_css(old, body['line'])
    if new != old:
        remeasure(body['actual_measurement'], new)
        body['candidate_sha256'] = body['actual_measurement']['css_sha256']
    return body


def frozen_sources_stale(root, sources):
    """Whether a retained measurement's owned source bytes predate this checkout."""
    owned = root / 'projects/ngx-material-legacy'
    return any(
        source['root'] == 0 and (
            not (owned / source['path']).is_file()
            or hashlib.sha256((owned / source['path']).read_bytes()).hexdigest() != source['sha256']
            or (owned / source['path']).stat().st_size != source['bytes']
        )
        for source in sources
    )
