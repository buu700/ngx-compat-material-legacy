# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Materialize the reviewed finite hunk notes and complete deletion ownership map."""
from pathlib import Path
import collections,datetime,gzip,hashlib,json,re
ROOT=Path.cwd();PREFIX='compatibility/rc/21x-legacy-removal-source-'
def digest(raw):return hashlib.sha256(raw).hexdigest()
def ref(path):
    raw=(ROOT/path).read_bytes();return {'path':path,'sha256':digest(raw),'bytes':len(raw)}
def save(name,value):
    with (ROOT/(PREFIX+name)).open('x') as out:out.write(json.dumps(value,indent=2)+'\n')
original=json.loads(gzip.decompress((ROOT/(PREFIX+'originals.json.gz')).read_bytes()))
boundary=json.loads((ROOT/(PREFIX+'boundary-reviewed.json')).read_bytes());members={m['path']:m for m in boundary['current_members']}
notes={
'.github/CODEOWNERS':[
'Removes legacy component ownership entries; upstream maintainer routing is outside the add-on contract and does not authorize a new ownership/support claim.',
'Removes legacy-core ownership entries; keep owned helpers and the existing Google/Ryan licensing policy.',
'Removes legacy baseline demo ownership; the upstream demo is not an owned product entrypoint.',
'Consolidates legacy/MDC demo ownership under ordinary current component demos; do not inherit upstream people or demo changes.',
'Removes legacy API guard ownership; retain authentic tagged API data and owned checks rather than upstream ownership automation.'],
'.ng-dev/commit-message.mts':['Removes legacy commit scopes (including duplicated checkbox scope and prebuilt theme scope); upstream contribution tooling is not retained product behavior.'],
'.ng-dev/google-sync-config.json':['Drops legacy-core from internal sync exclusions; internal Google synchronization is not the add-on build/release system.'],
'integration/yarn-pnp-compat/src/styles.scss':['Removes all-legacy-component-themes from the upstream PnP integration theme; keep the owned finite aggregate and packaged-consumer/mixed-generation tests.'],
'src/dev-app/BUILD.bazel':['Removes all legacy demo dependencies from Bazel; the upstream development app is not shipped by the add-on.'],
'src/dev-app/dev-app/dev-app-layout.html':['Removes the legacy baseline navigation link; preserve add-on test coverage without copying the upstream demo shell.'],
'src/dev-app/dev-app/dev-app-layout.ts':['Removes the legacy family navigation entries; this is upstream development-app navigation, not owned component API.'],
'src/dev-app/routes.ts':[
'Removes the legacy-baseline lazy route from the upstream development application; the add-on has its own historical test and artifact runner coverage.',
'Removes legacy-datepicker lazy route; upstream demo-only, not permission to remove current-peer datepicker companion support.',
'Removes legacy-input lazy route; owned legacy-input primary/testing remain.',
'Removes legacy-list lazy route; owned legacy-list primary/testing remain.',
'Removes legacy autocomplete/button/card/checkbox/chips/dialog lazy routes; retain their owned entrypoints and historical tests.',
'Removes legacy paginator/progress-spinner/radio routes; retain their owned entrypoints and historical tests.',
'Removes legacy table/tabs/tooltip routes; retain the owned definitions, DOM classes and harness entrypoints.',
'Removes legacy-progress-bar route; keep owned progress behavior and CSP/style requirements.',
'Removes legacy select/slider/slide-toggle/snack-bar routes; keep owned control/lifecycle contracts.'],
'src/dev-app/theme.scss':[
'Removes legacy aggregate themes and legacy typography hierarchy from the upstream demo; retain both finite historical facade exports and namespace bindings.',
'Removes legacy dark-theme colors; retain dark, overlay and mixed-generation color obligations.',
'Removes legacy private density aggregate demo coverage; retain the historical owned density implementation and its tests.'],
'src/dev-app/typography/typography-demo.html':['Removes the legacy typography toggle, mat-legacy-typography and mat-display classes; do not replace historical classes with MDC headline classes in consumer markup.'],
'src/dev-app/typography/typography-demo.ts':['Removes the demo isLegacy state after deleting its toggle; this demo-only cleanup does not remove historical typography support.'],
'src/material-experimental/column-resize/BUILD.bazel':[
'Switches production experimental column-resize dependency from legacy-table to current table; experimental components are outside the owned add-on.',
'Switches experimental column-resize test dependency to current table; no experimental/CDK fork or legacy token unification.'],
'src/material-experimental/column-resize/column-resize.spec.ts':[
'Switches the experimental suite import from MatLegacyTableModule to MatTableModule; this suite is not an owned legacy table replacement.',
'Renames resizable/header-cell test CSS to mat-mdc classes; preserve owned historical selectors.',
'Renames flex header/cell/resizable selectors to mat-mdc classes; preserve owned historical selectors.',
'Renames table/header-row/header-cell geometry query selectors to mat-mdc; do not alter legacy DOM or geometry checks.',
'Renames hover header/data-row selectors to mat-mdc; no adoption in the historical suite.',
'Changes TestBed table module to current Material; distinct owned legacy table definitions/tokens remain.',
'Comments out next-column origin capture after MDC migration; do not weaken owned geometry observations.',
'Comments out next-column displacement and total-width assertions because MDC differs by pixels; explicitly reject this assertion weakening for legacy qualification.',
'Comments out a second table-width assertion because MDC differs by pixels; retain meaningful historical geometry coverage.'],
'src/material-experimental/popover-edit/BUILD.bazel':['Switches experimental popover-edit test dependency to current table; unowned experimental boundary.'],
'src/material-experimental/popover-edit/popover-edit.spec.ts':[
'Switches the experimental table import to MatTableModule; not a legacy consumer migration instruction.',
'Switches TestBed table module to current table; owned legacy table remains separately tested.',
'Comments out horizontal alignment pixel assertions after MDC migration; do not broaden legacy golden tolerances or remove assertions.',
'Comments out another horizontal alignment assertion after MDC migration; reject this weakening for owned behavior checks.',
'Renames row lookup to mat-mdc-row; retain the legacy mat-row DOM contract.',
'Renames cell lookup to mat-mdc-cell; retain the legacy mat-cell DOM contract.'],
'src/material-experimental/selection/BUILD.bazel':['Switches experimental selection dependency to current table; no experimental selection fork is owned.'],
'src/material-experimental/selection/selection-column.ts':[
'Switches imported cell/column/header-cell/table classes from legacy table to current Material table; preserve distinct legacy identities in owned definitions.',
'Switches ViewChild definition classes and injected table token to current Material table; do not merge the owned legacy definition-owner protocol with ordinary table tokens.'],
'src/material-experimental/selection/selection-module.ts':[
'Switches experimental selection module import to MatTableModule; outside owned product scope.',
'Switches experimental NgModule imports to current table; preserve the legacy module and definitions.'],
'src/material/BUILD.bazel':[
'Removes legacy overview exclusion after deleting legacy entrypoints; upstream documentation build policy is not the add-on source inventory.',
'Removes legacy-core Sass build dependencies; preserve the owned legacy Sass closure rather than inheriting upstream Bazel targets.',
'Removes four legacy prebuilt CSS assets from the upstream package; owned manifest ships Sass sources and does not advertise those original CSS exports.'],
'src/material/_index.scss':[
'Removes private legacy density forward; retain its exact historical namespace/show binding in the finite owned facade.',
'Removes structural legacy-core forward; retain legacy-core and owned structural styles.',
'Removes legacy aggregate theme/color/typography and core/option/optgroup forwards; retain historical names and owned M2 semantics.',
'Removes legacy autocomplete/button theme forwards; preserve finite owned exports and module-source-only migration.',
'Removes legacy card/checkbox/chips/dialog theme forwards; preserve finite owned exports and historical geometry.',
'Removes remaining legacy form-field/input/list/menu/paginator/progress/radio/select/toggle/slider/snack/table/tabs/tooltip forwards; keep all corresponding historical bindings.'],
'src/material/config.bzl':[
'Removes the legacy primary entrypoints from upstream MATERIAL_ENTRYPOINTS; retain all 22 owned legacy primary entrypoint configurations.',
'Removes the legacy testing entrypoints from upstream MATERIAL_TESTING_ENTRYPOINTS; retain all 22 owned testing configurations and authentic API name inventory.'],
'src/material/core/theming/tests/BUILD.bazel':[
'Removes legacy-core CSS-variable theme dependency and edits the old/new-theme test comment; retain equivalent owned legacy coverage without upstream Bazel.',
'Removes legacy-core dependency from test-theming-api; the add-on still owns the historical aggregate theme behavior.'],
'src/material/core/theming/tests/test-css-variables-theme.scss':[
'Removes the legacy aggregate @use; do not remove it from the owned compatibility coverage.',
'Removes the CSS-variable legacy aggregate include; retain variable-valued palette/theme support and source/model checks.'],
'src/material/core/theming/tests/test-theming-api.scss':[
'Removes four legacy density/color/typography/theme module imports; retain independently owned historical modules.',
'Removes legacy aggregate theme calls for old/new light/dark/default-warn/color/density/typography shapes; preserve supported map and call semantics.',
'Removes legacy color/typography/density system calls and configuration unwrapping tests; do not mutate consumer maps or empty mixins to pass.',
'Removes legacy aggregate theme versus color-map equivalence checks; preserve historical map acceptance and meaningful checks.'],
'src/material/core/theming/tests/test-theming-bundle.scss':[
'Removes the legacy typography configuration variable; historical typography helpers remain exported and owned.',
'Removes legacy aggregate and legacy-core includes; retain their meaningful emitted styles in the owned facade.',
'Removes every legacy family theme/color/typography include from the bundle test; retain the finite historical family export surface and test obligations.'],
'src/material/core/theming/tests/theming-api.spec.ts':['Edits density test commentary to stop referring to legacy duplicate density; comment-only upstream cleanup does not waive owned duplicate-style semantics.'],
'src/material/package-base.json':['Removes four upstream legacy prebuilt CSS export entries and wildcard; no identical prebuilt CSS export is advertised by the owned manifest. Preserve owned Sass asset configuration.'],
'src/universal-app/BUILD.bazel':['Merges the MDC kitchen-sink into the ordinary upstream SSR demo and reorders platform-server dependency; use owned packed SSR gates, not upstream Bazel/demo code.'],
'src/universal-app/kitchen-sink-root.ts':[
'Removes MDC kitchen-sink import and template element while keeping one demo; not an owned SSR surface change.',
'Removes MDC kitchen-sink NgModule import; retain genuine legacy packed SSR behavior tests.'],
'src/universal-app/kitchen-sink/kitchen-sink.html':[
'Expands checkbox examples; this ordinary current-control SSR demo is not the legacy checkbox template.',
'Replaces legacy chip-list/basic chips with chip-set and chip-listbox/chip-option; reject required consumer HTML restructuring.',
'Reworks form-field labels, inputs, prefix/suffix and errors and removes floatLabel never; preserve owned legacy form-field structure and supported bindings.',
'Adds selection-list demo; no new feature is required in the frozen legacy surface.',
'Changes progress bindings/spinner variants; retain owned historical progress behavior rather than current demo expectations.',
'Replaces slider value/thumbLabel API with nested matSliderThumb inputs, expands toggles and changes tab selection; reject required legacy consumer markup/API migration.'],
'src/universal-app/kitchen-sink/kitchen-sink.ts':[
'Replaces every legacy module/service import with current Material imports; preserve separate owned legacy primary identities.',
'Replaces injected legacy dialog/snack services with current services; preserve distinct legacy providers and caller protocols.',
'Replaces NgModule legacy imports with current Material modules; genuine legacy SSR qualification must instantiate the add-on artifact.'],
'src/universal-app/main.ts':['Removes the second MDC kitchen-sink export after the demo merge; upstream demo-only.'],
'src/universal-app/theme.scss':['Removes the all-legacy-component-themes include from upstream SSR theme; retain the owned historical Sass aggregate.'],
'test/karma.conf.js':['Removes legacy indigo-pink CSS from upstream Karma assets; do not remove required legacy test styling or substitute current styles.'],
'tools/defaults.bzl':['Removes legacy indigo-pink CSS from upstream web-test assets; keep owned artifact-bound historical theme coverage without adopting obsolete Bazel infrastructure.'],
'tools/stylelint/theme-mixin-api.ts':['Removes legacy-path mat-legacy prefix normalization; do not rename historical Sass helpers, mixins or namespace bindings.']}
readme_notes={
'card':'Replaces obsolete MDC prototype/install/API-swap instructions with a documentation link; current card documentation is not authority to replace owned legacy card markup/styles.',
'checkbox':'Replaces MDC prototype instructions including warnings about larger padding, missing ripple API and required CSS/test changes; those differences support preserving the historical legacy contract.',
'dialog':'Removes MDC instructions explaining loss of outer padding and optional dialog-legacy-padding mixin; owned mat-dialog-container still supplies historical 24px padding and consumers need no extra CSS.',
'progress-spinner':'Removes MDC prototype instructions describing changed timing/easing and required CSS/test migration; retain meaningful historical native motion and styles.',
'slide-toggle':'Removes MDC prototype instructions describing ripple/label spacing changes and required CSS/test migration; preserve historical structure/geometry.',
'snack-bar':'Replaces MDC install/theme/API-swap documentation with a link; preserve owned legacy service, container and lifecycle contracts.',
'dable':'',
'table':'Replaces MDC install/theme/API-swap documentation with a link; do not infer geometry or distinct legacy definition-token equivalence from that prose.',
'tabs':'Removes MDC prototype instructions describing required tabPanel and Component-versus-Directive changes; preserve legacy tab markup and contracts.'}
readme_notes.pop('dable')
for family,note in readme_notes.items():notes['src/material/'+family+'/README.md']=[note]
modified=[]
for section in original['sections']:
    if section['status']!='M':continue
    path=section['path'];assert path in notes,path;assert len(notes[path])==len(section['hunks']),(path,len(notes[path]),len(section['hunks']))
    modified.append({'path':path,'before_blob':section['before_blob'],'after_blob':section['after_blob'],'patch_sha256':section['patch_sha256'],'hunks':[{'index':h['index'],'header':h['header'],'sha256':h['sha256'],'source_decision':'do-not-adopt-upstream-removal-or-MDC-migration','review':note}for h,note in zip(section['hunks'],notes[path])]})
assert set(notes)=={s['path']for s in original['sections']if s['status']=='M'}
base='projects/ngx-material-legacy/'
groups={
'owned-typescript':'Retain the current owned runtime/harness/internal source. Its presence is not full signature or behavior acceptance; the upstream whole-tree deletion would remove the add-on contract.',
'owned-public-api':'Retain primary/testing barrels and package configurations. The independent tagged-golden name inventory covers all 44 entrypoints, with only the existing finite engine-recipe removals.',
'owned-historical-spec':'Retain all 57 original spec-path counterparts; exact full membership and current candidate hashes match the historical runner inventory. No execution pass is inferred.',
'owned-sass':'Retain the current owned Sass source and historical bindings. Root facade comparison proves all 29 legacy forward descriptors; source presence alone is not CSS or map semantic acceptance.',
'owned-template':'Retain current owned legacy HTML templates. Do not substitute MDC restructuring or remove the owned template tree.',
'owned-documentation':'Retain the current owned legacy documentation; do not interpret whole-tree deletion as a documentation migration requirement.',
'owned-reference-image':'The tab pagination image remains present as documentation/reference data. It is not executable or browser qualification.',
'owned-density-relocation':'The original private density compatibility body is byte-identical at styles/core/density/private/_compatibility.scss; preserve the finite local replacement, not a current private upstream import.',
'previous-engine-recipe-removal':'The three absent historical engine recipe files are covered by the existing engine-free product policy, finite family exceptions and tagged alias proof. Native lifecycle/style gates remain required; do not broaden exceptions.',
'upstream-build-only':'All 45 removed Material Bazel files belong to upstream build topology. The add-on uses its owned ng-packagr/Chainman tooling; obsolete Bazel need not be restored to preserve behavior.',
'upstream-core-readme':'The one-line upstream core README is not shipped at that old path; the add-on has its own root README and provenance. No runtime/API contract is removed.',
'upstream-development-demo':'These complete 208 deleted dev-app files are upstream demonstration/application code, not shipped legacy API entries. Keep owned historical/consumer/browser coverage; no demo/CDK/ordinary component fork.',
'upstream-SSR-demo':'The two deleted kitchen-sink-mdc files are the second upstream demo merged by this patch. Keep genuine add-on packed SSR qualification separately.',
'upstream-generated-API-golden':'The 44 deleted generated reports are upstream build outputs. Untouched tagged versions are authenticated in the immutable originals capsule and used for the current name comparison; never regenerate expectations from the candidate.'}
deleted=[]
for section in original['sections']:
    if section['status']!='D':continue
    path=section['path'];targets=[]
    if path.startswith('src/dev-app/'):group='upstream-development-demo'
    elif path.startswith('src/universal-app/'):group='upstream-SSR-demo'
    elif path.startswith('tools/public_api_guard/'):group='upstream-generated-API-golden'
    else:
        assert path.startswith('src/material/'),path
        rel=path.removeprefix('src/material/')
        if path.endswith('BUILD.bazel'):group='upstream-build-only'
        elif rel=='legacy-core/README.md':group='upstream-core-readme';targets=[base+'README.md',base+'SOURCE-PROVENANCE.md']
        elif rel=='legacy-core/density/private/_compatibility.scss':group='owned-density-relocation';targets=[base+'styles/core/density/private/_compatibility.scss']
        elif rel in ['legacy-dialog/dialog-animations.ts','legacy-select/select-animations.ts','legacy-tooltip/tooltip-animations.ts']:
            group='previous-engine-recipe-removal';family=rel.split('/')[0];targets=[base+family+'/public-api.ts','compatibility/compatibility-exceptions.json','compatibility/handoff/codex-closeout/reference/animation-contract.csv']
        else:
            if path.endswith('public-api.ts'):group='owned-public-api'
            elif '.spec.'in path:group='owned-historical-spec'
            elif path.endswith('.scss'):group='owned-sass'
            else:group={'.ts':'owned-typescript','.html':'owned-template','.md':'owned-documentation','.png':'owned-reference-image'}[Path(path).suffix]
            candidates=([base+'styles/'+rel,base+rel]if path.endswith('.scss')else[base+rel]);targets=[next(p for p in candidates if p in members)]
    for target in targets:assert target in members,target
    deleted.append({'path':path,'before_blob':section['before_blob'],'before_sha256':section['before']['sha256'],'patch_sha256':section['patch_sha256'],'hunks':[{'index':h['index'],'sha256':h['sha256']}for h in section['hunks']],'group':group,'current_targets':[members[t]for t in targets]})
counts=dict(sorted(collections.Counter(row['group']for row in deleted).items()))
assert len(deleted)==702;assert len(modified)==44;assert sum(len(row['hunks'])for row in modified)==97
assert counts['upstream-build-only']==45;assert counts['upstream-development-demo']==208;assert counts['upstream-SSR-demo']==2;assert counts['upstream-generated-API-golden']==44;assert counts['owned-historical-spec']==57;assert counts['owned-public-api']==44
consumer=Path.home()/'cyph';observations=[]
for path in ['shared/css/theme.scss','shared/css/cyph.base.scss']:
    raw=(consumer/path).read_bytes();text=raw.decode();observations.append({'path':path,'sha256':digest(raw),'bytes':len(raw),'all_legacy_aggregate_calls':len(re.findall(r'\ball-legacy-component-themes\s*\(',text)),'mat_namespace_use':bool(re.search(r'@use\s+[\'"]@(?:angular/material|ngx-compat/material-legacy)[\'"]\s+as\s+mat',text)),'historical_dialog_selector_references':len(re.findall(r'\.mat-dialog-(?:container|content|actions|title)\b',text))})
cyph={'schema_version':1,'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Read-only selected Cyph Sass source sanity; not a consumer build or comprehensive import scan','consumer_root':'~/cyph','read_only_source_observations':observations,'consumer_files_modified':0,'consumer_build_or_sass_compilation_executed':False,'no_required_consumer_CSS_SCSS_or_HTML_changes_introduced':True,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
save('consumer-source-sanity.json',cyph)
report={'schema_version':1,'line':'21.x','sha':original['original_commit']['sha'],'subject':'fix(material): remove legacy components (#27622)','review_scope':'Complete original commit and branch-native source exclusion judgment; separate canonical admission remains required','source_parent':'702735190bf67da9871284ef779f7427367bd874','source_inputs':[ref(PREFIX+'originals.json.gz'),ref(PREFIX+'boundary-reviewed.json'),ref(PREFIX+'consumer-source-sanity.json')],'original_commit':{k:original['original_commit'][k]for k in ['sha','tree','parents','sha256']},'proposed_final_disposition':'not-applicable','proposed_read_note_disposition':'owned-retained','proposed_reason':'The complete original patch removes 702 files and modifies 44 files in 97 nondeletion hunks. Its legacy-surface deletion, Sass/test coverage removal and MDC demo migration are incompatible with this add-on retaining Material-16 legacy contracts. The actual21.x tree retains44 primary/testing configurations, all57 original spec-path counterparts and all29 tagged legacy Sass forward bindings. All458 tagged API export names are accounted for at name level:449 remain and9 are the unchanged engine-recipe removals authenticated through original aliases and existing policy. Upstream-only Bazel, demos, generated reports and documentation cleanup require no product adoption. This is a source-only exclusion judgment, not complete API/runtime/native/floor/audit acceptance.','nondeletion_file_reviews':modified,'deletion_group_counts':counts,'deletion_group_reviews':groups,'complete_deleted_path_membership':deleted,'owned_boundary_limitations':['Static export-name accounting is not signature, inherited-member, provider-identity, construction or runtime qualification.','The57 current candidate hash bindings and exact path membership do not prove tests executed.','Historical facade descriptors and exact density helper relocation do not prove all Sass/CSS values, maps or geometry.','Original upstream prebuilt CSS exports are absent from the owned advertised manifest; do not claim that the add-on ships all original compiled themes.','The existing finite engine recipe exceptions are unchanged. Native motion lifecycle/style qualification remains required.','Selected Cyph files were read only; no consumer build, broad scan or compilation was run.','No younger peer API or dependency was introduced; installed minimum-peer execution remains a separate gate.','Main closed-row evidence was a lead only; this decision derives from the complete original patch and actual21.x owned sources.'],'complete_original_files_reviewed':746,'nondeletion_hunks_individually_reviewed':97,'deleted_files_grouped_with_complete_membership':702,'original_text_hunks_accounted_for':797,'binary_deletion_accounted_for':True,'empty_text_deletion_accounted_for':True,'canonical_decisions_changed':0,'source_admissions_changed':0,'product_changes':0,'peer_changes':0,'golden_or_exception_changes':0,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
save('review.json',report)
print(json.dumps({'modified_files':len(modified),'individual_modification_hunks':97,'deletion_counts':counts,'proposed_disposition':report['proposed_final_disposition'],'canonical_changed':False}))
