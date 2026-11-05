"""Pure Python expected-composition parity; no context constructor or compiler."""
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]).absolute()
sys.path.insert(0, str(root / 'scripts'))
from sass_spinner_snack_aggregate_admission import insert_spinner_snack_into_aggregate_model
from sass_ordinary_aggregate_admission import insert_ordinary_checkbox_button_into_aggregate_model
from current_sass_card_aggregate import insert_card_into_aggregate_model

line = '21.x' if json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
suffix = '21' if line == '21.x' else 'main'
receipt = json.loads((root / ('compatibility/rc/parent-spinner-snack-aggregate-integration-' + suffix + '-v1.json')).read_bytes())
js = json.loads((root / ('compatibility/rc/current-sass-card-five-independent-controls-' + ('21x' if line == '21.x' else line) + '.json')).read_bytes())
assert len(receipt['rows']) == len(js['aggregate_rows']) == 9
rows = []
for old, peer in zip(receipt['rows'], js['aggregate_rows']):
    case = old['case_id']
    assert case == peer['case_id']
    spinner = insert_spinner_snack_into_aggregate_model(case_id=case, css=old['historical']['css'])
    assert spinner == old['current']['css']
    ordinary = insert_ordinary_checkbox_button_into_aggregate_model(case_id=case, css=spinner)
    assert type(ordinary) is str
    expected = insert_card_into_aggregate_model(case_id=case, css=ordinary)
    assert type(expected) is str
    assert hashlib.sha256(expected.encode()).hexdigest() == peer['expected_sha256']
    assert len(expected.encode()) == peer['expected_bytes']
    assert (expected == ordinary) == ('typographies' in case)
    assert insert_card_into_aggregate_model(case_id=case, css=ordinary + '\n.sass-argument-probe .mat-mdc-card{color:red}') is None if case.startswith('mixin-argument/') else insert_card_into_aggregate_model(case_id=case, css=ordinary + '\n.sass-api-probe .mat-mdc-card{color:red}') is None
    rows.append(dict(case_id=case, JS_Python_whole_CSS_equal=True, extra_owned_rule_rejected=True))
result = dict(schema_version=1, line=line, result='pass', positive_complete_CSS_rows=9, malformed_extra_owned_rule_rejections=9, rows=rows, compiler_calls=0, source_tool_or_C04_constructors_executed=0)
with Path(sys.argv[2]).open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps({key: result[key] for key in ('line', 'result', 'positive_complete_CSS_rows', 'malformed_extra_owned_rule_rejections', 'compiler_calls')}))
