"""Independent finite CSS composition; no compiler or artifact admission."""
from pathlib import Path
import hashlib
import json
import re
import sys

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / 'scripts'))
from sass_spinner_snack_aggregate_admission import insert_spinner_snack_into_aggregate_model

results = []
rejections = 0
for line, suffix in [('21.x', '21'), ('main', 'main')]:
    path = root / f'compatibility/rc/parent-spinner-snack-aggregate-integration-{suffix}-v1.json'
    report = json.loads(path.read_bytes())
    assert report['line'] == line and len(report['rows']) == 9
    for row in report['rows']:
        case = row['case_id']
        for kind in ['historical', 'current']:
            measured = row[kind]
            assert hashlib.sha256(measured['css'].encode()).hexdigest() == measured['css_sha256']
            assert len(measured['css'].encode()) == measured['css_bytes']
        old, actual = row['historical']['css'], row['current']['css']
        expected = insert_spinner_snack_into_aggregate_model(case_id=case, css=old)
        assert expected == actual and hashlib.sha256(expected.encode()).hexdigest() == row['modeled_sha256']
        scope = '.sass-api-probe' if case.startswith('mixin-css/') else '.sass-argument-probe'
        pattern = re.escape(scope + ' .mat-mdc-snack-bar-container') + r' \{\n[^{}]*\n\}'
        snack = re.findall(pattern, old)
        assert snack
        bad_old = [actual, old + '\n' + snack[0], old.replace(snack[0], '', 1),
                   old.replace('.mat-mdc-snack-bar-container', '.mat-mdc-unknown-container'),
                   old.replace(snack[0], snack[0].replace(' {\n', ' {\n  unknown: true;\n'), 1)]
        for value in bad_old:
            assert insert_spinner_snack_into_aggregate_model(case_id=case, css=value) is None
            rejections += 1
        for unknown in ['mixin-css/all-legacy-component-themes', 'mixin-css/all-component-densities',
                        'mixin-css/all-owned-component-themes', 'mixin-css/not-an-aggregate']:
            assert insert_spinner_snack_into_aggregate_model(case_id=unknown, css=old) is None
            rejections += 1
        changed = [actual + '\n', actual.replace('--mat-snack-bar-supporting-text-', '--mat-snack-bar-incorrect-', 1)]
        assert all(value != expected for value in changed)
        results.append(dict(line=line, case_id=case, independent_expected_sha256=hashlib.sha256(expected.encode()).hexdigest(),
                            css_bytes=len(expected.encode()), strict_original_fragment_rejections=9,
                            complete_candidate_mutants_differed=2))

output = root / 'compatibility/rc/parent-spinner-snack-aggregate-integration-python-controls-v1.json'
body = dict(schema_version=1, status='independent-finite-source-delta-models-pass', cases=len(results),
            rejected_unknown_or_malformed_model_inputs=rejections, results=results,
            existing_case_invocations_reused=True, compiler_executed_by_this_probe=False,
            pure_composition_requires_independent_old_model_authentication=True,
            existing_gate_or_packed_assertion_integrated=False, g11_claim='not-passed')
output.write_text(json.dumps(body, indent=2) + '\n')
print(json.dumps(dict(status=body['status'], cases=len(results), rejections=rejections)))
