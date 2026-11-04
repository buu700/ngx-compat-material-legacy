import datetime
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
PREFIX = 'compatibility/rc/parallel-spinner-snack-public-bridge-independent-'


def ref(root, path):
    raw = (root / path).read_bytes()
    return {'path': path, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}


before_path = 'compatibility/rc/parallel-spinner-snack-public-bridge-before-state.json'
before = json.loads((ROOT / before_path).read_text())
calls = [
    "    @include mat.progress-spinner-overrides($mdc-circular-progress-color-tokens);\n",
    "      @include mat.progress-spinner-overrides((active-indicator-color: $color));\n",
    "    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-color-tokens($config));\n",
    "    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-typography-tokens($config));\n",
]
lines = []
for line, state in before['branches'].items():
    root = pathlib.Path(state['root'])
    modules = []
    for item in state['before_modules']:
        path = item['path']
        raw = (root / path).read_bytes()
        original = subprocess.run(
            ['nice', '-n', '19', 'git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
             'show', 'HEAD:' + path], cwd=root, check=True, capture_output=True).stdout
        assert original == item['source'].encode()
        assert hashlib.sha256(original).hexdigest() == item['sha256']
        assert len(original) == item['bytes']
        inverse = raw.decode().replace("@use '@angular/material' as mat;\n", '')
        for call in calls:
            inverse = inverse.replace(call, '')
        assert inverse.encode() == original
        modules.append({'current': ref(root, path), 'authenticated_HEAD_preimage': {
            'sha256': item['sha256'], 'bytes': item['bytes']},
            'exact_inverse_of_only_new_public_import_and_override_calls': True})
    for item in state['protected_inputs']:
        assert ref(root, item['path']) == item
    api_paths = ['node_modules/@angular/material/package.json',
                 'node_modules/@angular/material/_index.scss']
    api_paths += ['node_modules/@angular/material/' + family + '/_' + family + '-theme.scss'
                  for family in ['progress-spinner', 'snack-bar']]
    lines.append({'line': line, 'root': str(root), 'modules': modules,
                  'protected_inputs_checked_unchanged': len(state['protected_inputs']),
                  'installed_material_version': json.loads((root / api_paths[0]).read_text())['version'],
                  'actual_public_API_inputs': [ref(root, path) for path in api_paths]})

contracts = [
    'AGENTS.md', 'docs/01-contract.md', 'docs/03-sass-contract.md',
    'research/sass-symbols.json', 'research/aggregate-composition.json',
    'compatibility/handoff/codex-closeout/PLAN.md',
    'compatibility/handoff/codex-closeout/reference/PRODUCT-CONTRACT.md',
    'projects/ngx-material-legacy/_index.scss',
    'projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss',
    'projects/ngx-material-legacy/styles/core/theming/_all-theme.scss',
    'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss',
    'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_circular-progress.scss',
    'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_snack-bar.scss',
    'compatibility/rc/slider-thumb-destroy-worksheet.json',
    'compatibility/rc/21x-c04-slider-m3-repairs-individual-review.json',
]
evidence = [
    before_path,
    'compatibility/rc/parallel-spinner-snack-public-bridge-worksheet.json',
    'compatibility/rc/parallel-spinner-snack-public-bridge-probe.mjs',
    'compatibility/rc/parallel-spinner-snack-public-bridge-report.json',
    'compatibility/rc/parallel-spinner-snack-public-bridge-21.json',
    'compatibility/rc/parallel-spinner-snack-public-bridge-main.json',
    'compatibility/rc/parallel-spinner-snack-public-bridge-cyph-source-sanity.json',
]
report = json.loads((ROOT / evidence[3]).read_text())
for key in ['worksheet', 'probe', 'before_state', 'cyph_sanity']:
    assert ref(ROOT, report[key]['path']) == report[key]
aggregate = json.loads((ROOT / 'research/aggregate-composition.json').read_text())
assert len(aggregate['ordinary_companions']) == 13
assert not set(['progress-spinner', 'snack-bar', 'slider']) & set(aggregate['ordinary_companions'])
result = {
    'schema_version': 1,
    'task': 'parallel-spinner-snack-public-bridge-independent',
    'status': 'source-scope-reviewed-no-blocking-contract-conflict',
    'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'worksheet': ref(ROOT, PREFIX + 'worksheet-v1.json'),
    'independent_verification': {
        'executed': ['Read-only contract/classification/API/diff inspection',
                     'Git HEAD preimage authentication and exact finite inverse for both changed modules on both lines',
                     '227 protected inputs rehashed unchanged per line',
                     'Existing focused report metadata references rehashed'],
        'compiler_or_runtime_execution_by_this_reviewer': False,
        'existing_focused_compiler_report_reviewed': True,
        'build_install_browser_native_fullowner_matrix_or_publication': False,
    },
    'conclusion': [
        'The two source edits implement existing historical ordinary component Sass exports. research/sass-symbols classifies all four ordinary progress-spinner and snack-bar mixins as explicit-current-component-bridge, independently of aggregate membership. docs03 explicitly requires such historical ordinary mixins to translate owned M2 values through stable current public overrides.',
        'The thirteen ordinary companions describe all-legacy aggregate membership. Progress-spinner/snack-bar/slider ordinary mixins are not among those thirteen; their absence does not cancel their separate historical public Sass export contracts. These edits neither add those families to all-legacy nor change all-owned.',
        'Exact source inversion leaves both complete HEAD preimages: only a stable public Material root import and override calls are added. Existing owned M2 token maps supply all values, historical selectors and declarations remain, argument names/calls and input maps remain, and related legacy/aggregate/vendor inputs are unchanged. There is no modern component/API/DOM fork or current deprecated M2 call-through.',
        'The earlier slider modern visual-thumb runtime exclusion is compatible with this Sass conclusion: modern thumb/input classes remain outside the owned runtime roster. Its separate do-not-adopt decisions reject post16 M3 structure/base/ripple changes, not the classified historical ordinary slider Sass export contract. Any broad inference that absence from the thirteen exempts ordinary slider Sass bridging would contradict docs03/research and is not supported by that runtime rationale.',
        'No blocking source-scope conflict is established for the current two-file repair. Complete current-component rendering and coexistence evidence remain separate acceptance work; the existing focused Sass report does not certify them.',
    ],
    'existing_focused_evidence_assessment': {
        'reported_compiler_calls_total': 4,
        'reported_negative_controls_total': 36,
        'reported_new_current_token_names': 7,
        'historical_comparison': 'The probe compares separately compiled before-source ordered rules/declarations after projecting only the seven explicitly introduced bridge token names; it also pairs every new token with the original owned token at the exact same selector and value. This is an explicit ordinary-bridge output change, not an owned-legacy golden relaxation.',
        'reported_evidence_not_independently_reexecuted': True,
    },
    'remaining_acceptance_boundaries': [
        'Actual current component DOM/computed-style coverage at the advertised peer floors, including spinner primary/accent/warn and snack supporting text/action typography.',
        'Nested/body-attached snack overlay scope and lazy overlays; both M2/M3 include orders and owned-only mode must retain intended current-component isolation.',
        'Packed/full Sass API/cascade gates and any canonical admission remain parent-owned and unclaimed here.',
    ],
    'lines': lines,
    'contract_inputs': [ref(ROOT, path) for path in contracts],
    'reviewed_agent_evidence': [ref(ROOT, path) for path in evidence],
    'product_or_shared_edits_by_this_reviewer': False,
    'ledger_security_roster_registry_or_plan_closed': False,
}
(ROOT / (PREFIX + 'findings-v1.json')).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': ref(ROOT, PREFIX + 'findings-v1.json'),
                  'line_count': len(lines), 'protected_per_line': [x['protected_inputs_checked_unchanged'] for x in lines]}))
