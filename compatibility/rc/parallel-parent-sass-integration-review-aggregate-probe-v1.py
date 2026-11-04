"""Independent raw-byte aggregate review; no Sass compilation or gate execution."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
assert str(output).startswith(str(root / 'compatibility/rc/parallel-parent-sass-integration-review-'))
sys.path.insert(0, str(root / 'scripts'))
from sass_spinner_snack_aggregate_admission import insert_spinner_snack_into_aggregate_model as candidate

roots = {'21.x': root, 'main': Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
cases = ['mixin-css/all-component-colors', 'mixin-css/all-component-themes', 'mixin-css/all-component-typographies',
         *['mixin-argument/' + p for p in ['all-component-colors/custom-full-theme', 'all-component-colors/raw-color-config',
         'all-component-themes/custom-full-theme', 'all-component-themes/custom-dark-theme',
         'all-component-typographies/custom-full-theme', 'all-component-typographies/raw-typography-config']]]
sha = lambda b: hashlib.sha256(b.encode() if isinstance(b, str) else b).hexdigest()
def ref(path):
    b = (root / path).read_bytes()
    return dict(path=path, sha256=sha(b), bytes=len(b))
def git(r, spec):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', spec], cwd=r, env=env)

def reconstruct(css, case):
    """Different algorithm: walk declarations, insert literal aliases after exact old slots."""
    scope = '.sass-api-probe' if case.startswith('mixin-css/') else '.sass-argument-probe'
    dimension = 'typography' if 'typographies' in case else 'color' if 'colors' in case else 'theme'
    selector = None
    old_values = {}
    additions = []
    result = []
    spinner_rules = snack_rules = 0
    for line in css.splitlines(keepends=True):
        result.append(line)
        if line.endswith(' {\n'):
            value = line[:-3]
            if value in [scope + ' .mat-mdc-progress-spinner' + variant for variant in ['', '.mat-accent', '.mat-warn']]:
                assert dimension != 'typography'
                selector = 'spinner'
                spinner_rules += 1
            elif value == scope + ' .mat-mdc-snack-bar-container':
                selector = 'snack'
                snack_rules += 1
            else:
                selector = None
            old_values = {}
        elif line == '}\n' or line == '}':
            selector = None
        elif selector:
            match = re.fullmatch(r'  (--[\w-]+): ([^;\r\n{}]+);\n', line)
            assert match, ('unexpected selected declaration', line)
            name, value = match.groups()
            old_values[name] = value
            inserted = []
            if selector == 'spinner':
                assert name == '--mdc-circular-progress-active-indicator-color'
                inserted = [('--mat-progress-spinner-active-indicator-color', value)]
            elif name == '--mdc-snackbar-supporting-text-color':
                assert dimension != 'typography'
                inserted = [('--mat-snack-bar-container-color', old_values['--mdc-snackbar-container-color']), ('--mat-snack-bar-supporting-text-color', value)]
            elif name == '--mdc-snackbar-supporting-text-weight':
                assert dimension != 'color'
                inserted = [('--mat-snack-bar-supporting-text-' + key, old_values['--mdc-snackbar-supporting-text-' + key]) for key in ['font', 'line-height', 'size', 'weight']]
            for name, value in inserted:
                result.append('  ' + name + ': ' + value + ';\n')
                additions.append((name, value))
    assert spinner_rules == (0 if dimension == 'typography' else 3)
    assert snack_rules == (2 if dimension == 'theme' else 1)
    assert len(additions) == {'color': 5, 'theme': 9, 'typography': 4}[dimension]
    return ''.join(result), additions

source_packet = json.loads((root / 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json').read_bytes())
before_state = json.loads((root / 'compatibility/rc/parallel-spinner-snack-public-bridge-before-state.json').read_bytes())
results = []
negatives = 0
input_refs = []
for line, r in roots.items():
    suffix = '21' if line == '21.x' else 'main'
    report_path = f'compatibility/rc/parent-spinner-snack-aggregate-integration-{suffix}-v1.json'
    report = json.loads((root / report_path).read_bytes())
    input_refs.append(ref(report_path))
    assert report['line'] == line and report['case_count'] == 9 and report['compile_calls'] == 18
    assert [row['case_id'] for row in report['rows']] == cases
    source_refs = {row['path']: row for row in report['source_inputs']}
    assert len(source_refs) == len(report['source_inputs'])
    for p, bound in source_refs.items():
        raw = (r / p).read_bytes()
        assert sha(raw) == bound['sha256'] and len(raw) == bound['bytes'], (line, p)
    actual_scss = sorted(str(p.relative_to(r)) for p in (r / 'projects/ngx-material-legacy').rglob('*.scss') if 'node_modules' not in p.relative_to(r).parts)
    copied = report['copied_scss_population']
    assert len(copied) == 409 and sorted(p['path'] for p in copied) == actual_scss
    for copied_ref in copied:
        assert sha((r / copied_ref['path']).read_bytes()) == copied_ref['sha256']
    branch = source_packet['branches'][line]
    historical_modules = before_state['branches'][line]['before_modules']
    assert len(historical_modules) == 2
    module_map = {m['path']: m for m in branch['modules']}
    for old in historical_modules:
        assert sha(old['source']) == old['sha256'] and len(old['source'].encode()) == old['bytes']
        assert git(r, branch['before_commit'] + ':' + old['path']) == old['source'].encode()
        assert {k: old[k] for k in ['sha256', 'bytes']} == {k: module_map[old['path']]['before'][k] for k in ['sha256', 'bytes']}
    default_catalog = json.loads((r / 'fixtures/sass/default-aggregate-contracts.json').read_bytes())
    catalog = json.loads((r / 'fixtures/sass/mixin-argument-contracts.json').read_bytes())
    oracle = json.loads((r / 'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes())
    additions_per_line = 0
    for row in report['rows']:
        case = row['case_id']
        probe = default_catalog['cases'][case] if case.startswith('mixin-css/') else next(p for p in catalog['cases'] if p['case_id'] == case)
        setup = oracle['standard_theme'] if case.startswith('mixin-css/') else catalog['setup']
        program = "@use '__entry__' as m;\n" + setup + '\n' + probe['call'] + '\n'
        assert row['call'] == probe['call'] and row['setup_sha256'] == sha(setup)
        for role in ['historical', 'current']:
            observation = row[role]
            assert sha(observation['css']) == observation['css_sha256'] and len(observation['css'].encode()) == observation['css_bytes']
            assert observation['logical_program_sha256'] == sha(program)
            urls = [unquote(urlparse(url).path) for url in observation['loaded_urls']]
            assert all(urlparse(url).scheme == 'file' for url in observation['loaded_urls'])
            assert len(urls) == len(set(urls))
            owned = [p for p in urls if '/projects/ngx-material-legacy/' in p]
            prefixes = {p.split('/projects/ngx-material-legacy/')[0] for p in owned}
            assert len(prefixes) == 1
            prefix = next(iter(prefixes))
            if role == 'historical':
                assert prefix.startswith('/tmp/spinner-snack-aggregate-before-') and not Path(prefix).exists()
            else:
                assert prefix == str(r)
            physical = program.replace("'__entry__'", json.dumps(prefix + '/projects/ngx-material-legacy'))
            assert sha(physical) == observation['physical_program_sha256']
            for p in urls:
                if p.endswith('/compatibility/rc/parent-spinner-snack-aggregate-integration-virtual.scss'):
                    assert p.startswith(str(r) + '/')
                    continue
                if p.startswith(prefix + '/projects/ngx-material-legacy/'):
                    member = p[len(prefix) + 1:]
                else:
                    assert p.startswith(str(r) + '/node_modules/@angular/')
                    member = p[len(str(r)) + 1:]
                assert member in source_refs, (line, role, member)
        old, current = row['historical']['css'], row['current']['css']
        expected, additions = reconstruct(old, case)
        assert current == expected == candidate(case_id=case, css=old)
        assert sha(expected) == row['modeled_sha256']
        # Inverse exact lines is an independent whole-CSS preservation check.
        seven = r'  --mat-(?:progress-spinner-active-indicator-color|snack-bar-(?:container-color|supporting-text-(?:color|font|line-height|size|weight))): [^;\r\n{}]+;\n'
        assert re.sub(seven, '', current) == old
        scope = '.sass-api-probe' if case.startswith('mixin-css/') else '.sass-argument-probe'
        blocks = re.findall(re.escape(scope + ' .mat-mdc-snack-bar-container') + r' \{\n[^{}]*\n\}', old)
        assert blocks
        invalid = [current, old + '\n' + blocks[0], old.replace(blocks[0], '', 1), old.replace('.mat-mdc-snack-bar-container', '.mat-mdc-unknown-container'), old.replace(blocks[0], blocks[0].replace(' {\n', ' {\n  unexpected: true;\n'), 1)]
        for malformed in invalid:
            assert candidate(case_id=case, css=malformed) is None
            negatives += 1
        for unknown in ['mixin-css/all-component-densities', 'mixin-css/all-legacy-component-themes', 'mixin-css/not-an-aggregate', case + '/unknown']:
            assert candidate(case_id=unknown, css=old) is None
            negatives += 1
        additions_per_line += len(additions)
        results.append(dict(line=line, case_id=case, current_sha256=sha(current), bytes=len(current.encode()), independent_literal_insertions=len(additions), whole_css_inverse_exact=True, current_loaded_members_physically_bound=True, historical_owned_route_separate=True))
    assert additions_per_line == 54
    # Cross-line code identity includes the Python module imported above.
    for p in ['scripts/sass-spinner-snack-aggregate-contract.mjs', 'scripts/sass_spinner_snack_aggregate_admission.py']:
        assert (r / p).read_bytes() == (root / p).read_bytes()

body = dict(schema_version=1, status='independent-literal-css-and-physical-baseline-provenance-review-pass',
            input_refs=input_refs, cases=18, fresh_compiles_executed=0, existing_serial_compile_observations_reviewed=36,
            source_bindings_physically_rehashed=True, copied_scss_per_line=409, old_modules_authenticated_via_git_per_line=2,
            rejected_unknown_or_malformed_inputs=negatives, whole_css_retention_and_positioned_tokens=results,
            original_material16_compilation_or_old_expected_model_authentication_executed=False,
            existing_gate_or_artifact_integration_qualified=False, canonical_changes_applied=False, g11_claim='not-passed')
output.write_text(json.dumps(body, indent=2) + '\n')
print(json.dumps(dict(status=body['status'], cases=len(results), negative_controls=negatives)))
