"""Independent literal CSS reconstruction and legacy/core observation comparison."""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import re
import sys
root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
assert str(output).startswith(str(root / 'compatibility/rc/parallel-spinner-snack-c04-independent-'))
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
read = lambda p: json.loads((root / p).read_bytes())
spec = importlib.util.spec_from_file_location('visibility', root / 'tests/historical_contract_repair_source.py')
mirror = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mirror)
prefix = 'compatibility/rc/parallel-spinner-snack-public-bridge-c04-'
old = read('compatibility/rc/21x-c04-control-m3-theme-source-review.json')['control_measurement']
actual = read(prefix + 'control-source-21-v2.json')['control_measurement']
selected = ['mixin-argument/' + p for p in ['progress-spinner-color/custom-full-theme', 'progress-spinner-color/raw-color-config', 'progress-spinner-theme/custom-full-theme', 'progress-spinner-theme/custom-dark-theme', 'snack-bar-color/custom-full-theme', 'snack-bar-color/raw-color-config', 'snack-bar-theme/custom-full-theme', 'snack-bar-theme/custom-dark-theme', 'snack-bar-typography/custom-full-theme', 'snack-bar-typography/raw-typography-config']]
def insert(css, mixin):
    result = []
    values = {}
    added = 0
    for line in css.splitlines(keepends=True):
        result.append(line)
        match = re.fullmatch(r'  (--[\w-]+): ([^;\r\n{}]+);\n', line)
        if not match:
            continue
        name, value = match.groups()
        values[name] = value
        aliases = []
        if name == '--mdc-circular-progress-active-indicator-color':
            aliases = [('--mat-progress-spinner-active-indicator-color', value)]
        elif name == '--mdc-snackbar-supporting-text-color':
            aliases = [('--mat-snack-bar-container-color', values['--mdc-snackbar-container-color']), ('--mat-snack-bar-supporting-text-color', value)]
        elif name == '--mdc-snackbar-supporting-text-weight':
            aliases = [('--mat-snack-bar-supporting-text-' + key, values['--mdc-snackbar-supporting-text-' + key]) for key in ['font', 'line-height', 'size', 'weight']]
        for key, value in aliases:
            result.append('  ' + key + ': ' + value + ';\n')
            added += 1
    expected_count = 3 if mixin.startswith('progress-spinner') else 2 if mixin.endswith('color') else 4 if mixin.endswith('typography') else 6
    assert added == expected_count
    return ''.join(result)
rows = []
assert [r['case_id'] for r in actual['cases']] == [r['case_id'] for r in old['cases']]
for before, after in zip(old['cases'], actual['cases']):
    if before['case_id'] in selected:
        assert before['comparison'] == 'exact-untouched16' and before['peer'] is None
        assert before['actual']['css'] == before['expected']['css']
        expected = insert(before['expected']['css'], before['mixin'])
        assert after['actual']['css'] == expected
        assert after['actual']['css_sha256'] == sha(expected) and after['actual']['css_bytes'] == len(expected.encode())
        assert after['expected'] == before['expected']
        rows.append(dict(case_id=before['case_id'], css_sha256=sha(expected), whole_css_literal_insertion_exact=True, untouched_original_expected_preserved=True))
    else:
        assert before['actual']['css'] == after['actual']['css']
        assert before['actual']['css_sha256'] == after['actual']['css_sha256']
assert [r['case_id'] for r in rows] == [r['case_id'] for r in actual['cases'] if r['case_id'] in selected]
assert len(rows) == 10
import gzip
remaining_old = json.loads(gzip.decompress((root / 'compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz').read_bytes()))['argument_measurement']
remaining_actual = read(prefix + 'remaining-source-21-v1.json')['argument_measurement']
assert remaining_actual == remaining_old and remaining_actual['case_count'] == 160
legacy = []
for kind, old_path, name in [('retention', 'compatibility/rc/21x-c04-modern-control-base-measurement-21x.json', 'modern-control-base-21-v1.json'), ('token-placement', 'compatibility/rc/21x-c04-unthemable-token-placement-21-scope.json', 'token-placement-21-v1.json')]:
    prior = read(old_path)
    actual = read(prefix + name)['current']
    expected = copy.deepcopy(prior)
    expected['loaded_sources'] = [mirror.qualify_spinner_snack_source_reference(r, root) for r in prior['loaded_sources']]
    expected['producer'] = mirror.qualify_tool_reference(prior['producer'], root)
    if kind == 'retention':
        snack = next(r for r in expected['subjects'] if r['family'] == 'snack-bar')
        snack.update(modern_theme_exact_after_MDC_relocation=False, historical_modern_source_exact_after_MDC_relocation=True, separate_current_public_bridge=True)
    else:
        for row in expected['families']:
            spinner = row['family'] == 'progress-spinner'
            if spinner:
                row['modern_theme_exact_tagged_bytes_after_MDC_import_relocation'] = False
            row['historical_modern_source_exact_after_MDC_relocation'] = spinner
            row['separate_current_public_bridge'] = spinner
    stale = []
    for ref in actual['input_members']:
        raw = (root / ref['path']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != ref['sha256']:
            stale.append(ref)
    assert len(stale) == 14
    for key in ['input_members', 'current_public_bridge']:
        expected.pop(key, None)
    compared = {key: value for key, value in actual.items() if key not in ['input_members', 'current_public_bridge']}
    assert compared == expected
    legacy.append(dict(kind=kind, complete_core_measurement_equal=True, default_legacy_cases=len(actual['public_legacy_default_CSS_cases']), original_legacy_color_cases=len(actual['direct_original_legacy_color_cases']), older_tool_appendix_refs_unqualified=stale, source_guard_appendix_current_credit=False))
body = dict(schema_version=1, status='independent-raw-CSS-and-core-observations-pass', control_cases=56, positioned_token_whole_css_reconstructions=rows, other_control_css_cases_unchanged=46, remaining_whole_measurement_cases_exact=160, legacy=legacy, original_expected_reports_unchanged=True, current_full_producer_or_tool_appendix_credit=False, fresh_compiler_or_owner_executed=False, g11_claim='not-passed')
output.write_text(json.dumps(body, indent=2) + '\n')
print(json.dumps(dict(status=body['status'], direct_literal_reconstructions=len(rows), remaining_exact=160, stale_tool_appendix_refs_each=14)))
