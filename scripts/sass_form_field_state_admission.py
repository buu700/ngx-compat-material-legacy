"""Six finite original form-field cases and one exact public state-token insertion."""
import hashlib
import json
import re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok

ROOT = Path(__file__).resolve().parents[1]
_CATALOG = json.loads((ROOT / 'fixtures/sass/form-field-state-contracts.json').read_bytes())
_ORACLE_RAW = (ROOT / 'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes()
_ARGUMENT_RAW = (ROOT / 'fixtures/sass/mixin-argument-contracts.json').read_bytes()
_ORACLE = json.loads(_ORACLE_RAW)
_ARGUMENTS = json.loads(_ARGUMENT_RAW)
_DEFAULT_IDS = ['mixin-css/form-field-color', 'mixin-css/form-field-theme']
_PROBES = [p for p in _ARGUMENTS['cases'] if p['mixin'] in ('form-field-color', 'form-field-theme')]
_sha = lambda value: hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()
FORM_FIELD_STATE_CONTRACT = 'historical-form-field-css-with-public-state-tokens'
FORM_FIELD_STATE_DEFAULT_CASES = {case: _CATALOG['cases'][case] for case in _DEFAULT_IDS}
FORM_FIELD_STATE_ARGUMENT_CASES = {p['case_id']: _CATALOG['cases'][p['case_id']] for p in _PROBES}
if (_CATALOG['schema_version'] != 1 or _CATALOG['oracle_sha256'] != _sha(_ORACLE_RAW)
        or _CATALOG['argument_catalog_sha256'] != _sha(_ARGUMENT_RAW) or len(_PROBES) != 4
        or set(_CATALOG['cases']) != set(_DEFAULT_IDS) | set(FORM_FIELD_STATE_ARGUMENT_CASES)):
    raise ValueError('finite form-field state roster or immutable inputs changed')


def peer_program(entry):
    values = entry['values']
    return ("@use '@angular/material' as peer;\n" + entry['scope']
            + ' {\n@include peer.form-field-overrides((state-layer-color: ' + values['ink']
            + ', hover-state-layer-opacity: ' + values['hover'] + ', focus-state-layer-opacity: ' + values['focus'] + '));\n}\n')


for case, e in _CATALOG['cases'].items():
    is_default = case in _DEFAULT_IDS
    probe = next((p for p in _PROBES if p['case_id'] == case), None)
    name = case[10:] if is_default else probe['mixin']
    argument = '$__theme' if is_default else probe['argument']
    scope = '.sass-api-probe' if is_default else '.sass-argument-probe'
    call = f'{scope} {{ @include m.{name}({argument}); }}' if is_default else probe['call']
    setup = _ORACLE['standard_theme'] if is_default else _ARGUMENTS['setup']
    program = "@use '__entry__' as m;\n" + setup + '\n' + call + '\n'
    color_program = "@use '__entry__' as m;\n" + setup + '\n' + scope + ' { @include m.form-field-color(' + argument + '); }\n'
    dark = case.endswith('/custom-dark-theme')
    values = dict(ink='rgba(255, 255, 255, 0.87)' if dark else 'rgba(0, 0, 0, 0.87)',
                  hover='0.08' if dark else '0.04', focus='0.24' if dark else '0.12')
    if (e['kind'] != ('default' if is_default else 'argument') or e['name'] != name or e['dimension'] != name[11:]
            or e['scope'] != scope or e['argument'] != argument or e['call'] != call or e['values'] != values
            or e['original']['program_sha256'] != _sha(program) or e['color']['program_sha256'] != _sha(color_program)
            or any(_sha(m['css']) != m['css_sha256'] or type(m['css_bytes']) is not int
                   or len(m['css'].encode()) != m['css_bytes'] for m in [e['original'], e['color']])
            or not e['original']['css'].startswith(e['color']['css']) or e['separator'] != '\n'
            or e['after_separator'] != ('\n' if e['dimension'] == 'theme' else '')
            or e['peer_program'] != peer_program(e) or set(e['peers']) != {'main', '21.x'}
            or any(p['program_sha256'] != _sha(e['peer_program']) or _sha(p['css']) != p['css_sha256']
                   or type(p['css_bytes']) is not int or len(p['css'].encode()) != p['css_bytes'] for p in e['peers'].values())):
        raise ValueError('finite form-field original, insertion or peer recipe changed')
    if is_default:
        inv = _ORACLE['members']['mixins'][name]['invocation']
        if e['original']['css_sha256'] != inv['css_sha256'] or e['original']['css_bytes'] != inv['css_bytes']:
            raise ValueError('original default form-field golden changed')
    elif any(e[k] != probe[k] for k in ('case_id', 'mixin', 'variant', 'argument', 'call')):
        raise ValueError('original form-field argument probe changed')
_SOURCESETS = {line: {(s['root'], s['path'], s['sha256'], s['bytes']) for s in sources}
               for line, sources in _CATALOG['peer_inputs'].items()}


def form_field_state_expected_css(case, original, peer, line):
    try:
        e = _CATALOG['cases'][case]
        floor = e['peers'][line]
        if (any(original[k] != e['original'][k] for k in ('css', 'css_sha256', 'css_bytes'))
                or not peer_measurement_ok(peer, line, floor['program_sha256'], {})
                or peer['program'] != peer_program(e) or any(peer[k] != floor[k] for k in ('css', 'css_sha256', 'css_bytes'))
                or len(peer['sources']) != len(_SOURCESETS[line])
                or {(s['root'], s['path'], s['sha256'], s['bytes']) for s in peer['sources']} != _SOURCESETS[line]):
            return None
        return e['color']['css'] + e['separator'] + peer['css'] + e['after_separator'] + original['css'][len(e['color']['css']):]
    except (KeyError, TypeError, ValueError, AttributeError):
        return None


def form_field_state_argument_results_match(body):
    try:
        if body['case_id'] not in FORM_FIELD_STATE_ARGUMENT_CASES or body['comparison'] != 'current-companion-contract':
            return False
        contract = body['current_companion']
        if contract['classification'] != 'conforming-current-companion' or contract['contract'] != FORM_FIELD_STATE_CONTRACT:
            return False
        expected = form_field_state_expected_css(body['case_id'], body['expected'], contract['peer'], body['line'])
        actual = body['actual']
        return (expected is not None and actual['css'] == expected and actual['css_sha256'] == _sha(expected)
                and type(actual['css_bytes']) is int and actual['css_bytes'] == len(expected.encode()))
    except (KeyError, TypeError, ValueError, AttributeError):
        return False


def form_field_state_default_assertion_ok(body):
    try:
        e = FORM_FIELD_STATE_DEFAULT_CASES[body['case_id']]
        m = body['actual_measurement']
        c = body['current_companion']
        if ('current_infrastructure' in body or body['comparison'] != FORM_FIELD_STATE_CONTRACT
                or c['classification'] != 'conforming-current-companion' or c['contract'] != FORM_FIELD_STATE_CONTRACT
                or type(body['expected_bytes']) is not int or body['expected_bytes'] != e['original']['css_bytes']
                or body['expected_sha256'] != e['original']['css_sha256'] or m['line'] != body['line']
                or m['program_sha256'] != e['original']['program_sha256'] or _sha(m['css']) != m['css_sha256']
                or type(m['css_bytes']) is not int or len(m['css'].encode()) != m['css_bytes']
                or not m['sass_version'].startswith('dart-sass\t1.104.1\t')
                or body['actual_sha256'] != m['css_sha256'] or type(body['actual_bytes']) is not int or body['actual_bytes'] != m['css_bytes']):
            return False
        ss = m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0, 1, 2) or not s['path'] or s['path'].startswith('/')
                          or '\\' in s['path'] or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}', s['sha256'])
                          or type(s['bytes']) is not int or s['bytes'] < 1 for s in ss)
                or len({(s['root'], s['path']) for s in ss}) != len(ss)):
            return False
        required = ['_index.scss', 'styles/bridges/_form-field-state-overrides.scss', 'styles/form-field/_form-field-theme.scss',
                    'styles/form-field/_form-field-focus-overlay.scss', 'styles/core/theming/_theming.scss']
        if not all(any(s['root'] == 0 and s['path'] == path for s in ss) for path in required):
            return False
        expected = form_field_state_expected_css(body['case_id'], e['original'], c['peer'], body['line'])
        return expected is not None and m['css'] == expected
    except (KeyError, TypeError, ValueError, AttributeError):
        return False


def form_field_state_default_envelope_ok(active, body, invocation):
    try:
        fields = dict(kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0,
                      line=active.binding['source_line'], run_id=active.manifest['run_id'], invocation_id=invocation,
                      binding=active.binding, oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json', oracle_sha256=_CATALOG['oracle_sha256'])
        if any(body.get(k) != v or type(body.get(k)) != type(v) for k, v in fields.items()):
            return False
        library = [a for a in active.manifest['artifacts'] if a['id'] == 'library']
        return len(library) == 1 and body['tarball_sha256'] == library[0]['sha256'] and form_field_state_default_assertion_ok(body)
    except (KeyError, TypeError, ValueError, AttributeError):
        return False


FORM_FIELD_STATE_AGGREGATE_CASES = {
    'mixin-css/all-component-colors': 'mixin-css/form-field-color',
    'mixin-css/all-component-themes': 'mixin-css/form-field-theme',
    'mixin-argument/all-component-colors/custom-full-theme': 'mixin-argument/form-field-color/custom-full-theme',
    'mixin-argument/all-component-colors/raw-color-config': 'mixin-argument/form-field-color/raw-color-config',
    'mixin-argument/all-component-themes/custom-full-theme': 'mixin-argument/form-field-theme/custom-full-theme',
    'mixin-argument/all-component-themes/custom-dark-theme': 'mixin-argument/form-field-theme/custom-dark-theme',
}


def insert_form_field_state_in_aggregate(case, css, peer):
    """Change only one whole original color prefix in an authenticated aggregate model."""
    try:
        e = _CATALOG['cases'][FORM_FIELD_STATE_AGGREGATE_CASES[case]]
        floor = e['peers'][peer['line']]
        paths = ['_index.scss', 'form-field/_form-field-theme.scss', 'form-field/_m3-form-field.scss', 'core/tokens/_token-utils.scss']
        required = {s['path']: (s['sha256'], s['bytes']) for s in _CATALOG['peer_inputs'][peer['line']] if s['root'] == 0 and s['path'] in paths}
        if (len(required) != len(paths) or not isinstance(css, str) or css.count(e['color']['css']) != 1
                or not peer_measurement_ok(peer, peer['line'], _sha(peer['program']), required)):
            return None
        at = css.index(e['color']['css']) + len(e['color']['css'])
        suffix = css[at:]
        return css[:at] + e['separator'] + floor['css'] + ('\n' if suffix else '') + suffix
    except (KeyError, TypeError, ValueError, AttributeError):
        return None
