#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read-only finite integration map; no shared/current source mutations."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROOTS = {'21.x': ROOT, 'main': Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
PREFIX = 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-'
NAMES = ['progress-spinner-color', 'progress-spinner-theme', 'snack-bar-color', 'snack-bar-theme', 'snack-bar-typography']
AGGREGATES = ['all-component-colors', 'all-component-themes', 'all-component-typographies']
MODULES = ['projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss', 'projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss']
sha = lambda b: hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()
def ref(root, path):
    b = (root / path).read_bytes()
    return dict(path=path, sha256=sha(b), bytes=len(b))
def load(root, path):
    b = (root/path).read_bytes()
    return json.loads(gzip.decompress(b) if path.endswith('.gz') else b)
def locations(root, path, needles):
    if not (root/path).is_file():
        return dict(path=path,present=False,sites=[],meaning='No corresponding current verifier at this pathname on this branch; do not borrow21.xsource-owner qualification.')
    text = (root/path).read_text()
    return dict(**ref(root, path), sites=[dict(line=i, text=line.strip()) for i,line in enumerate(text.splitlines(),1) if any(n in line for n in needles)])
def write(path, data):
    with (ROOT/path).open('x') as f: json.dump(data, f, indent=2); f.write('\n')

oracle = load(ROOT, 'compatibility/rc/oracles/material-16.2.14-sass-api.json')
catalog = load(ROOT, 'fixtures/sass/mixin-argument-contracts.json')
snapshot = load(ROOT, 'compatibility/rc/parallel-spinner-snack-public-bridge-before-state.json')
symbols = load(ROOT, 'research/sass-symbols.json')
specs = {
 'scripts/measure-sass-inspection-scope.mjs': ['const boundaryPaths=', "'styles/datepicker/", 'boundaries.map', 'peerMixins=', 'return {schema_version'],
 'scripts/upstream-sass-inspection-admission.mjs': ['function inspect(', 'current_compiler_scope', 'owned_scss_population', "changed loaded Sass input", 'measureSassInspectionScope({root:rootId})'],
 'scripts/upstream-theming-inspection-source-review.mjs': ['const SCOPE=', 'const originalFacts=', 'scope.owned_scss_population', 'assert.deepEqual(boundaries', 'program.loaded_sources'],
 'scripts/upstream-inspection-compatibility-source-review.mjs': ['const shared=reviewThemingInspectionSource'],
 'scripts/measure-unthemable-token-contracts.mjs': ['stripPublicProgressBridge=', 'modern16 source changed', 'modern_theme_exact_tagged_bytes_after_MDC_import_relocation'],
 'scripts/measure-legacy-theme-retention.mjs': ['assert.equal(modern,tagged', 'modern_theme_exact_after_MDC_relocation'],
 'scripts/upstream-modern-control-base-admission.cjs': ['function inspectControlSource', 'review.owned_context', 'scope.input_members', 'scope.loaded_sources', 'measureLegacyThemeRetention'],
 'scripts/upstream-control-m3-theme-source-review.mjs': ['export function measureControlThemeContracts', 'assert.ok(peer?progressColor', 'exact_tagged_cases:', 'const shared=reviewInspectionCompatibilitySource', "for(const f of ['snack-bar'", "historical modern theme changed"],
 'scripts/upstream-remaining-unthemable-source-review.mjs': ['OWNED_INTEGRITY=', 'priorOwned.current_source_bindings', 'const shared=reviewInspectionCompatibilitySource'],
 'scripts/sass-api-inventory.mjs': ['const companionTypes=', 'export function compareInventory', 'got.sha256 !== invocation.css_sha256', 'export function classifyPending'],
 'scripts/sass-seal.mjs': ['export function runSassApiCss', 'Object.hasOwn(DEFAULT_', 'export function apiAssertionBody', 'for (const key of'],
 'scripts/sass-mixin-arguments.mjs': ['export function runMixinArgumentContracts', 'COMPANION_ADDITION_CASES,probe.case_id', 'mixinArgumentResultsMatch(expected,value)', 'comparison:current_companion'],
 'scripts/sass_mixin_argument_admission.py': ['def mixin_argument_assertion_ok', "elif original!=actual", 'COMPANION_ADDITION_CASES:'],
 'scripts/rc-verify.py': ['def _sass_seal_assertion_ok', "if body.get('case_id') in DEFAULT_AGGREGATE_CASES", "if 'current_infrastructure' in body or 'current_companion' in body"],
 'scripts/sass-default-aggregate-contract.mjs': ['export function defaultAggregateExpectedCss', 'const css=profile.dimension', 'return Object.hasOwn(RIPPLE_COLOR_BINDING_CASES'],
 'scripts/sass_default_aggregate_admission.py': ['def default_aggregate_expected_css', "if e['profile']", 'return insert_ripple'],
 'scripts/sass-aggregate-color-theme-contract.mjs': ['export function aggregateColorThemeExpectedCss', 'return insertRippleColor'],
 'scripts/sass_aggregate_color_theme_admission.py': ['def aggregate_color_theme_expected_css', 'return insert_ripple'],
 'scripts/sass-aggregate-typography-contract.mjs': ['export function aggregateTypographyExpectedCss', "+suffix;"],
 'scripts/sass_aggregate_typography_admission.py': ['def aggregate_typography_expected_css', 'suffix'],
 'scripts/sass-ordered-css.mjs': ['export const ORDERED_CSS_FIXTURE_IDS', 'export function orderedCssResults'],
 'scripts/check-companion-bridges.mjs': ['const names = [', "'badge', 'bottom-sheet'", 'Object.keys(allowed).length !== 13'],
 'tests/sass_inspection_scope_probe.mjs': ['public_override_mixins.length,16', 'actual.boundaries.length,4', 'public_override_mixins:16'],
 'tests/test_sass_inspection_scope.py': ["len(report['positive']), 5", "report['public_override_mixins'], 16", "scope.owned_scss_population"],
 'tests/control_m3_theme_source_review_probe.mjs': ['report.control_measurement.exact_tagged_cases,52', 'cssMutant(', 'existing_progress_alias_cases,4'],
}
sites = {line: [locations(root,path,needles) for path,needles in specs.items()] for line,root in ROOTS.items()}

scope_records = [
 'compatibility/rc/upstream-sass-inspection-current-scope.json.gz',
 'compatibility/rc/21x-c04-theming-inspection-source-review.json',
 'compatibility/rc/21x-c04-inspection-compatibility-source-review.json',
 'compatibility/rc/21x-c04-selector-density-source-review.json',
 'compatibility/rc/21x-c04-button-tokenization-source-review.json',
 'compatibility/rc/21x-c04-button-token-repairs-source-review.json',
 'compatibility/rc/21x-c04-surface-m3-theme-source-review.json',
 'compatibility/rc/21x-c04-slider-m3-repairs-source-review.json',
 'compatibility/rc/21x-c04-control-m3-theme-source-review.json',
 'compatibility/rc/21x-c04-foundation-m3-theme-source-review.json.gz',
 'compatibility/rc/21x-c04-core-tokenization-source-review.json.gz',
 'compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz',
 'compatibility/rc/21x-c04-modern-control-base-individual-review.json',
 'compatibility/rc/21x-c04-modern-control-base-measurement-21x.json',
 'compatibility/rc/21x-c04-unthemable-token-placement-21-scope.json',
]
def old_refs(data, old, pointer=''):
    rows=[]
    if isinstance(data,dict):
        if data.get('sha256') in old:
            rows.append(dict(json_pointer=pointer, path=data.get('path'), sha256=data['sha256'], bytes=data.get('bytes')))
        for k,v in data.items(): rows += old_refs(v,old,pointer+'/'+str(k).replace('~','~0').replace('/','~1'))
    elif isinstance(data,list):
        for i,v in enumerate(data): rows += old_refs(v,old,pointer+'/'+str(i))
    return rows
records={}
for line,root in ROOTS.items():
    old={m['sha256'] for m in snapshot['branches'][line]['before_modules']}
    rows=[]
    for p in scope_records:
        if (root/p).is_file():
            hits=old_refs(load(root,p),old)
            if hits:rows.append(dict(**ref(root,p), old_module_refs=hits, action='Keep archived bytes and pins unchanged; a separate authenticated current successor qualifies only the two module refs.'))
    records[line]=rows

direct=[]
for name in NAMES:
    e=oracle['members']['mixins'][name]
    row=dict(case_id='mixin-css/'+name, assertion_file='mixin-css__'+name+'.json', original_sha256=e['invocation']['css_sha256'], original_bytes=e['invocation']['css_bytes'], signatures_unchanged=True)
    row['new_observed_by_line']={}
    for line,tag in [('21.x','21'),('main','main')]:
        measured=load(ROOT,PREFIX+'cases-'+tag+'.json');r=next(r for r in measured['rows'] if r['case_id']==row['case_id'])
        row['new_observed_by_line'][line]=dict(before_sha256=r['historical']['css_sha256'],after_sha256=r['current']['css_sha256'],after_bytes=r['current']['css_bytes'],added_declarations=r['added_declarations'],finite_model_pass=r['exact_finite_bridge_model_pass'])
    direct.append(row)
args=[dict(case_id=p['case_id'],assertion_file=p['case_id'].replace('/','__')+'.json',mixin=p['mixin'],variant=p['variant'],call=p['call']) for p in catalog['cases'] if p['mixin'] in NAMES]
aggregates=[dict(case_id='mixin-css/'+n,assertion_file='mixin-css__'+n+'.json',original_sha256=oracle['members']['mixins'][n]['invocation']['css_sha256'],membership_and_order_unchanged=True,indirect_emission_effect='spinner color and snack color'+(' + snack typography' if n.endswith('themes') else '') if not n.endswith('typographies') else 'snack typography') for n in AGGREGATES]
aggregate_args=[dict(case_id=p['case_id'],assertion_file=p['case_id'].replace('/','__')+'.json',call=p['call']) for p in catalog['cases'] if p['mixin'] in AGGREGATES]
manifest=load(ROOT,'fixtures/sass/manifest.json')
fixtures=[]
for row in manifest['cases']:
    source=(ROOT/'fixtures/sass'/row['file']).read_text()
    if any(n in source for n in ['progress-spinner','snack-bar','all-component','all-legacy-component']):
        fixtures.append(dict(id=row['id'],file='fixtures/sass/'+row['file'],sha256=sha(source),comparison=row['comparison'],ordinary_spinner_snack_call=False,calls=[s.strip() for s in source.splitlines() if '@include' in s]))
ordered=load(ROOT,'compatibility/rc/sass-current-source-reconciliation-ordered.json.gz')
baseline = dict(
 direct_default_before_is_exact_untouched_oracle=True,
 custom_argument_before_basis='Authenticated exact before modules plus unchanged independently owned token/model sources; this diagnostic did not rerun untouched installed16argument reference.',
 new_differences='Five default + ten direct argument CSS cases. Three ordinary aggregate defaults + six ordinary aggregate argument cases are reachable indirect changes; not freshly compiled here.',
 current_ordered_roster_impacted_cases=[],
 archived_ordered_reconciliation=dict(**ref(ROOT,'compatibility/rc/sass-current-source-reconciliation-ordered.json.gz'),line=ordered['line'],results=[{k:r.get(k) for k in ['case_id','result','status','raw_status','comparison','baseline_sha256','candidate_sha256']} for r in ordered['results']]),
 archived_packed_report=dict(**ref(ROOT,'compatibility/rc/reports/sass-seal.json'),warning='Historic packed subject, not the current repair. Its588/63 or585/66 counts and sevenblocked-fixture prose are not current failure observations.'),
 raw_reference_differences='Existing infrastructure/companion changes stay visible under their own finite contracts. Legacy select/snack/button historical source restorations in later focused reconciliation must not be blamed on this repair.'
)

token_additions=[
 ['progress-spinner','--mdc-circular-progress-active-indicator-color','--mat-progress-spinner-active-indicator-color','Immediately after old declaration in each original base/accent/warn combined selector.'],
 *[['snack-bar','--mdc-snackbar-'+n,'--mat-snack-bar-'+n,'Original .mat-mdc-snack-bar-container: append color pair after the old color pair, or typography quartet after the old typography quartet. Preserve existing button-color in place.'] for n in ['container-color','supporting-text-color','supporting-text-font','supporting-text-line-height','supporting-text-size','supporting-text-weight']]
]
plan=[
 dict(order=1,owner='bounded two-module implementer',change='NEW finite source subject/probe/packet only, independent of shared readers/registry',checks='Authenticate exact prior source from committed before review; read current physical two modules; exact import/call additions; source after deletion of finite additions equals old source; late rehash; minimum public API and7token semantic values.'),
 dict(order=2,owner='C02 Sass integration owner',change='Add a separate finite two-family contract and mirrored JS/Python validation; preserve651/498rosters and immutable oracles',checks='Route5default and10argument cases explicitly. Bind original/candidate/compiler/minimum/source/artifact identities; exact whole CSS after finite insertions, meaningful negative mutants, unknown/wrongline/stale refs fail.'),
 dict(order=3,owner='same C02 owner',change='Compose the same finite helper for3ordinary aggregate default cases and6ordinary aggregate argument cases',checks='Add only ordinary all-component color/theme/typography tokens to existing exact expected model. Do not touch all-legacy/owned-only/private density membership,13companion catalog, or ordered fixture models.'),
 dict(order=4,owner='shared source owner after base agent is complete',change='Integrate finite current two-module successor into direct C04 source owners and their source report comparators',checks='Keep all409baseline refs/report bytes and exact historical assertions. Qualify metadata refs only; current raw reads stay physical/current. Source subject must distinguish baseline model vs current module and use current semantic receipts.'),
 dict(order=5,owner='C04 canonical owner',change='Requalify affected source subjects in existing dependency order and bind new checker/tool digests through separate guarded tooling transitions',checks='Sass inspection -> theming inspection -> inspection compatibility -> selector density/button and M3 child owners. Fresh reports are new artifacts, not rewritten archived reports. Modern-control retention and unthemable sources need independent current projection. No canonical admission count invented.'),
 dict(order=6,owner='parent',change='Focused validation first; actual full packed/floor/rendered qualification later',checks='Newsource guard/probe; pairedJS/Python default+argument+aggregate contract controls; existing source-owner tests in graph order; later artifact-bound651/498and31orderedcases plus C04owner. No full run executed in this mapping.')
]
tests=[
 'tests/test_sass_api_inventory.py','tests/test_sass_mixin_arguments.py','tests/test_sass_seal.py',
 'tests/test_sass_default_aggregate_contract.py','tests/test_sass_aggregate_color_theme_contract.py','tests/test_sass_aggregate_typography_contract.py',
 'tests/test_sass_inspection_scope.py','tests/sass_inspection_scope_probe.mjs','tests/test_sass_inspection_admission.py',
 'tests/test_theming_inspection_source_review.py','tests/test_inspection_compatibility_source_review.py','tests/test_selector_density_source_review.py',
 'tests/test_control_m3_theme_source_review.py','tests/control_m3_theme_source_review_probe.mjs','tests/test_modern_control_base_source.py','tests/modern_control_base_source_probe.mjs',
 'tests/test_unthemable_token_placement.py','tests/test_theme_token_root_source.py','tests/theme_token_root_source_probe.mjs',
]
test_refs=[ref(ROOT,p) for p in tests if (ROOT/p).is_file()]
write(PREFIX+'map.json',dict(schema_version=1,role='Read-only minimal integration proposal; no shared verdict or source admission',branches={line:dict(root=str(root),modules=[dict(**ref(root,m['path']),before_sha256=m['sha256'],before_bytes=m['bytes']) for m in snapshot['branches'][line]['before_modules']],current_peer_manifests=[ref(root,'node_modules/@angular/'+n+'/package.json') for n in ['material','cdk']],public_override_sources=[ref(root,'node_modules/@angular/material/'+p) for p in ['_index.scss','progress-spinner/_progress-spinner-theme.scss','snack-bar/_snack-bar-theme.scss']]) for line,root in ROOTS.items()},direct_default_cases=direct,direct_argument_cases=args,indirect_ordinary_aggregate_default_cases=aggregates,indirect_ordinary_aggregate_argument_cases=aggregate_args,unchanged_cases=dict(default=['mixin-css/progress-spinner-density','mixin-css/progress-spinner-typography','mixin-css/snack-bar-density'],all_legacy_spinner_snack_exports=True,signatures_namespace_defaults_maps=True,aggregate_membership_and_order=True,all_legacy_and_owned_aggregates=True,thirteen_companion_checker_and_catalog=True,ordered_css_roster=True),finite_token_additions=token_additions,verifier_sites=sites,archived_refs_preserved=records,ordered_reachability=fixtures,baseline_vs_new=baseline,decision_path=dict(existing_family='companion-bridge-appended',historical_case_membership_in_existing_pending_decision=False,authority='Pending never passes. Add a separately reviewed finite current two-family contract, with exact five member/default + ten argument scope; aggregate composition follows only after member approval.',never='Do not append arbitrary peer theme CSS, strip all--mat-* properties, relocate selectors, rewrite raw goldens, broaden compatibility exceptions, or treat old pending digest pairs as approval.'),integration_order=plan,relevant_existing_tests=test_refs,focused_probes=[ref(ROOT,PREFIX+'cases-'+t+'.json') for t in ['21','main']],compiler_execution=dict(actual=True,cases_per_line=15,compile_calls_total=60,full_matrix_build_browser_owner=False),canonical_admission_changes=0,g11_claim='not-passed'))
print(json.dumps(dict(result='mapped',direct_defaults=len(direct),direct_arguments=len(args),aggregate_defaults=len(aggregates),aggregate_arguments=len(aggregate_args),ordered_css_cases_affected=0,compiler_calls=60,shared_files_edited=0)))
